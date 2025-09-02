from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import json
import traceback
import asyncio

from app.models.user import User
from app.models.profile import UserProfile, WorkExperience
from app.models.interview import InterviewSession, InterviewMessage
from app.models.interview import (
    InterviewSession, InterviewMessage,
    InterviewSessionCreate, InterviewSessionResponse,
    InterviewMessageResponse, WSMessageRequest, WSMessageResponse
)
from app.utils.auth import get_current_user
from app.utils.profile import check_agent_profile_requirements
from app.services.interview_service import VisaInterviewService
from app.database import get_database, async_session_maker

router = APIRouter(prefix="/interview", tags=["interview"])

# --- Helper Functions ---

async def get_user_profile_with_experiences(user_id: int, db: AsyncSession):
    """Get user profile with work experiences"""
    result = await db.execute(
        select(UserProfile)
        .options(selectinload(UserProfile.work_experiences))
        .where(UserProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()

async def save_message(db: AsyncSession, session_id: int, message_type: str, content: str):
    """Save a message to the database"""
    message = InterviewMessage(
        session_id=session_id,
        message_type=message_type,
        content=content
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message

async def verify_session_with_retry(db: AsyncSession, session_id: int, max_retries: int = 3, delay: float = 0.5):
    """Verify session exists with retry logic for newly created sessions"""
    
    for attempt in range(max_retries):
        print(f"🔍 Attempt {attempt + 1}/{max_retries} to find session {session_id}")
        
        # Try to find the session
        session_result = await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        if session:
            print(f"✅ Session {session_id} found on attempt {attempt + 1}")
            return session
            
        if attempt < max_retries - 1:  # Don't sleep on last attempt
            print(f"⏳ Session {session_id} not found, waiting {delay}s before retry...")
            await asyncio.sleep(delay)
            delay *= 1.5  # Exponential backoff
    
    print(f"❌ Session {session_id} not found after {max_retries} attempts")
    return None

# --- REST Endpoints ---

@router.post("/start", response_model=InterviewSessionResponse)
async def start_interview_session(
    session_data: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Start a new interview session"""
    
    # Check if user has required profile information
    profile = await get_user_profile_with_experiences(current_user.id, db)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile before starting an interview"
        )
    
    # Check agent requirements
    requirements_check = check_agent_profile_requirements(
        profile, 
        profile.work_experiences or [], 
        session_data.agent_type
    )
    
    if not requirements_check['requirements_met']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile requirements not met: {', '.join(requirements_check['missing_requirements'])}"
        )
    
    try:
        # Create new interview session
        interview_session = InterviewSession(
            user_id=current_user.id,
            agent_type=session_data.agent_type,
            status="active"
        )
        
        db.add(interview_session)
        await db.commit()  # First commit to ensure session is created
        await db.refresh(interview_session)
        
        print(f"✅ Interview session {interview_session.id} created and committed")
        
        # Save welcome message
        welcome_message = (
            "Welcome to your visa interview preparation session! "
            "I'll be conducting a mock F1 visa interview based on your profile. "
            "Please respond naturally and honestly to my questions. "
            "Are you ready to begin?"
        )
        
        welcome_msg = await save_message(db, interview_session.id, "system", welcome_message)
        
        # Ensure all changes are committed before returning
        await db.commit()
        print(f"✅ Welcome message saved and committed for session {interview_session.id}")
        
        # Fetch the session with messages eagerly loaded
        result = await db.execute(
            select(InterviewSession)
            .options(selectinload(InterviewSession.messages))
            .where(InterviewSession.id == interview_session.id)
        )
        session_with_messages = result.scalar_one()
        
        # Add a small delay to ensure database consistency across connections
        await asyncio.sleep(0.1)
        
        print(f"✅ Returning completed session {interview_session.id}")
        return InterviewSessionResponse.from_orm(session_with_messages)
        
    except Exception as e:
        await db.rollback()
        print(f"❌ Error creating interview session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create interview session: {str(e)}"
        )

@router.get("/sessions", response_model=List[InterviewSessionResponse])
async def get_user_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get all interview sessions for the current user"""
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [InterviewSessionResponse.from_orm(session) for session in sessions]

@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database)
):
    """Get a specific interview session"""
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(InterviewSession.id == session_id)
        .where(InterviewSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    return InterviewSessionResponse.from_orm(session)

# --- WebSocket Endpoint ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}  # session_id -> websocket
    
    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: int):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_message(self, session_id: int, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))

manager = ConnectionManager()

@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: int):
    """WebSocket endpoint for real-time interview"""
    
    await websocket.accept()
    print(f"✅ WebSocket connection accepted for session {session_id}")
    
    # Initialize variables
    db = None
    session = None
    profile = None
    interview_service = None
    current_state = None
    
    try:
        # Create database session
        db = async_session_maker()
        print(f"📊 Database session created for session {session_id}")
        
        # Verify session exists with retry logic
        session = await verify_session_with_retry(db, session_id)
        
        if not session:
            error_msg = f"❌ Interview session {session_id} not found after retries"
            print(error_msg)
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": "Interview session not found"
            }))
            await websocket.close(code=4004, reason="Session not found")
            return
        
        print(f"✅ Session {session_id} found for user {session.user_id}")
        
        # Get user profile with work experiences
        profile_result = await db.execute(
            select(UserProfile)
            .options(selectinload(UserProfile.work_experiences))
            .where(UserProfile.user_id == session.user_id)
        )
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            error_msg = f"❌ Profile not found for user {session.user_id}"
            print(error_msg)
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": "User profile not found"
            }))
            await websocket.close(code=4004, reason="Profile not found")
            return
        
        print(f"✅ Profile found for user {session.user_id}")
        
        # Initialize interview service
        interview_service = VisaInterviewService()
        current_state = session.session_state
        print(f"🎯 Interview service initialized. Has existing state: {current_state is not None}")
        
        # Send welcome message
        welcome_message = {
            "type": "system",
            "content": "🎤 Welcome to your visa interview session! I'm ready to conduct your mock interview. Send 'start_interview' when you're ready to begin."
        }
        
        await websocket.send_text(json.dumps(welcome_message))
        print(f"📤 Welcome message sent to session {session_id}")
        
        # Message handling loop
        message_count = 0
        while True:
            try:
                print(f"⏳ Waiting for message from client (session {session_id})...")
                
                # Set a reasonable timeout for receiving messages
                try:
                    message_text = await asyncio.wait_for(
                        websocket.receive_text(), 
                        timeout=300  # 5 minutes timeout
                    )
                    message_count += 1
                    print(f"📥 Message #{message_count} received from session {session_id}: {message_text[:100]}...")
                except asyncio.TimeoutError:
                    print(f"⏰ Timeout waiting for message from session {session_id}")
                    await websocket.send_text(json.dumps({
                        "type": "system",
                        "content": "Session timeout due to inactivity. Please refresh to start a new session."
                    }))
                    break
                
                # Parse the message
                try:
                    message_data = json.loads(message_text)
                    message_type = message_data.get('type')
                    content = message_data.get('content', '')
                    
                    print(f"🎯 Processing message type: {message_type}")
                    
                except json.JSONDecodeError as e:
                    print(f"❌ Invalid JSON from session {session_id}: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": "Invalid message format. Please send valid JSON."
                    }))
                    continue
                
                # Handle different message types
                if message_type == 'start_interview':
                    print(f"🚀 Starting interview for session {session_id}")
                    
                    try:
                        # Get or generate initial question
                        if current_state:
                            response = await interview_service.continue_interview(
                                profile, current_state, ""
                            )
                        else:
                            response = await interview_service.start_interview(profile)
                        
                        # Save the question
                        await save_message(db, session.id, "question", response.content)
                        
                        # Update session state
                        session.session_state = response.state
                        await db.commit()
                        
                        # Send the question
                        await websocket.send_text(json.dumps({
                            "type": "question",
                            "content": response.content
                        }))
                        
                        print(f"✅ Interview started for session {session_id}")
                        
                    except Exception as e:
                        error_msg = f"❌ Error starting interview: {str(e)}"
                        print(error_msg)
                        print(f"🔍 Traceback: {traceback.format_exc()}")
                        
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "content": f"Failed to start interview: {str(e)}"
                        }))
                
                elif message_type == 'user_response':
                    print(f"💬 Processing user response for session {session_id}")
                    
                    if not content.strip():
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "content": "Please provide a response."
                        }))
                        continue
                    
                    try:
                        # Save user response
                        await save_message(db, session.id, "response", content)
                        
                        # Get interview service response
                        response = await interview_service.continue_interview(
                            profile, session.session_state or {}, content
                        )
                        
                        # Update session state
                        session.session_state = response.state
                        await db.commit()
                        
                        # Send appropriate response based on interview completion
                        if response.is_complete:
                            # Save final decision
                            await save_message(db, session.id, "final_decision", response.content)
                            
                            # Update session status
                            session.status = "completed"
                            session.final_outcome = response.content
                            await db.commit()
                            
                            await websocket.send_text(json.dumps({
                                "type": "final_decision",
                                "content": response.content
                            }))
                            
                            print(f"🏁 Interview completed for session {session_id}")
                        else:
                            # Save next question
                            await save_message(db, session.id, "question", response.content)
                            
                            await websocket.send_text(json.dumps({
                                "type": "question",
                                "content": response.content
                            }))
                            
                            print(f"❓ Next question sent for session {session_id}")
                        
                    except Exception as e:
                        error_msg = f"❌ Error processing response: {str(e)}"
                        print(error_msg)
                        print(f"🔍 Traceback: {traceback.format_exc()}")
                        
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "content": f"Error processing response: {str(e)}"
                        }))
                
                elif message_type == 'ping':
                    # Handle ping/pong for connection keepalive
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "content": "Connection active"
                    }))
                    print(f"🏓 Ping/pong handled for session {session_id}")
                    
                else:
                    print(f"⚠️ Unknown message type '{message_type}' from session {session_id}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": f"Unknown message type: {message_type}. " +
                                  "Supported types: start_interview, user_response, ping"
                    }))
            
            except WebSocketDisconnect:
                print(f"👋 WebSocket {session_id} disconnected normally by client")
                break
                
            except Exception as e:
                error_msg = f"❌ Unexpected error in message loop for session {session_id}: {str(e)}"
                print(error_msg)
                print(f"🔍 Traceback: {traceback.format_exc()}")
                
                try:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "content": f"An unexpected error occurred: {str(e)}"
                    }))
                except:
                    print(f"❌ Failed to send error message to client for session {session_id}")
                
                break
    
    except Exception as e:
        error_msg = f"❌ WebSocket setup error for session {session_id}: {str(e)}"
        print(error_msg)
        print(f"🔍 Traceback: {traceback.format_exc()}")
        
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"Connection setup failed: {str(e)}"
            }))
        except:
            print(f"❌ Failed to send setup error message for session {session_id}")
    
    finally:
        print(f"🧹 Cleaning up WebSocket connection for session {session_id}")
        
        # Close database session if it was created
        if db:
            try:
                await db.close()
                print(f"📊 Database session closed for session {session_id}")
            except Exception as e:
                print(f"❌ Error closing database session: {e}")
        
        # Close WebSocket connection if still open
        try:
            if not websocket.client_state.DISCONNECTED:
                await websocket.close()
                print(f"🔌 WebSocket closed for session {session_id}")
        except Exception as e:
            print(f"❌ Error closing WebSocket: {e}")
        
        print(f"✅ WebSocket cleanup completed for session {session_id}")