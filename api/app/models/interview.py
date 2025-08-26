from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import Base

# SQLAlchemy Models
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_type = Column(String(100), nullable=False, default="visa_assistant")
    status = Column(String(50), nullable=False, default="active")  # "active", "completed", "paused"
    session_state = Column(JSON, nullable=True)  # Store LangGraph state
    final_outcome = Column(Text, nullable=True)  # Final decision
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    messages = relationship("InterviewMessage", back_populates="session", cascade="all, delete-orphan")

class InterviewMessage(Base):
    __tablename__ = "interview_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    message_type = Column(String(50), nullable=False)  # "question", "response", "system"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("InterviewSession", back_populates="messages")

# Pydantic Models for API
class InterviewMessageBase(BaseModel):
    message_type: str
    content: str

class InterviewMessageCreate(InterviewMessageBase):
    pass

class InterviewMessageResponse(InterviewMessageBase):
    id: int
    session_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class InterviewSessionBase(BaseModel):
    agent_type: str = "visa_assistant"
    status: str = "active"

class InterviewSessionCreate(InterviewSessionBase):
    pass

class InterviewSessionResponse(InterviewSessionBase):
    id: int
    user_id: int
    final_outcome: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    messages: List[InterviewMessageResponse] = []
    
    class Config:
        from_attributes = True

class InterviewSessionUpdate(BaseModel):
    status: Optional[str] = None
    session_state: Optional[Dict[str, Any]] = None
    final_outcome: Optional[str] = None

# WebSocket message types
class WSMessageRequest(BaseModel):
    type: str  # "user_response", "start_interview"
    content: str

class WSMessageResponse(BaseModel):
    type: str  # "question", "final_decision", "error"
    content: str
    session_id: Optional[int] = None