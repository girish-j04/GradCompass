from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import json
import traceback

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
    
    # Create new interview session
    interview_session = InterviewSession(
        user_id=current_user.id,
        agent_type=session_data.agent_type,
        status="active"
    )
    
    db.add(interview_session)
    await db.commit()
    await db.refresh(interview_session)
    
    # Save welcome message
    welcome_message = (
        "Welcome to your visa interview preparation session! "
        "I'll be conducting a mock F1 visa interview based on your profile. "
        "Please respond naturally and honestly to my questions. "
        "Are you ready to begin?"
    )
    
    await save_message(db, interview_session.id, "system", welcome_message)
    
    return InterviewSessionResponse.from_orm(interview_session)

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
    
    try:
        await manager.connect(websocket, session_id)
        
        # Get database session
        async with async_session_maker() as db:
            # Verify session exists and get user info
            result = await db.execute(
                select(InterviewSession)
                .where(InterviewSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            
            if not session:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": "Interview session not found"
                }))
                await websocket.close()
                return
            
            # Get user profile
            profile = await get_user_profile_with_experiences(session.user_id, db)
            if not profile:
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "content": "User profile not found"
                }))
                await websocket.close()
                return
            
            # Initialize interview service
            interview_service = VisaInterviewService()
            current_state = session.session_state
            
            # Send welcome message if new session
            if not current_state:
                await manager.send_message(session_id, {
                    "type": "system",
                    "content": "Welcome! I'm ready to conduct your visa interview. Type 'begin' to start."
                })
            
            while True:
                try:
                    # Receive message from client
                    data = await websocket.receive_text()
                    message_data = json.loads(data)
                    
                    if message_data.get("type") == "start_interview":
                        # Start the interview
                        result = await interview_service.start_interview(
                            profile, 
                            profile.work_experiences or []
                        )
                        
                        # Save initial state
                        session.session_state = result["state"]
                        await db.commit()
                        
                        # Save and send first question
                        await save_message(db, session_id, "question", result["question"])
                        await manager.send_message(session_id, {
                            "type": "question",
                            "content": result["question"]
                        })
                    
                    elif message_data.get("type") == "user_response":
                        user_response = message_data.get("content", "").strip()
                        
                        if not user_response:
                            continue
                        
                        # Save user response
                        await save_message(db, session_id, "response", user_response)
                        
                        # Process response with interview service
                        if current_state:
                            result = await interview_service.process_response(
                                user_response, 
                                current_state
                            )
                            
                            # Update session state
                            session.session_state = result["state"]
                            
                            if result["done"]:
                                # Interview completed
                                session.status = "completed"
                                session.final_outcome = result["content"]
                                await db.commit()
                                
                                await save_message(db, session_id, "final_decision", result["content"])
                                await manager.send_message(session_id, {
                                    "type": "final_decision",
                                    "content": result["content"]
                                })
                            else:
                                # Send next question
                                await db.commit()
                                await save_message(db, session_id, "question", result["content"])
                                await manager.send_message(session_id, {
                                    "type": "question", 
                                    "content": result["content"]
                                })
                            
                            current_state = result["state"]
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    print(f"Error in WebSocket: {e}")
                    print(traceback.format_exc())
                    await manager.send_message(session_id, {
                        "type": "error",
                        "content": f"An error occurred: {str(e)}"
                    })
                    break
    
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        print(traceback.format_exc())
    
    finally:
        manager.disconnect(session_id)