
from enum import Enum
from typing import Optional
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship, validates
from app.db.base import Base


class SenderType(Enum):
    """Enum for message sender types."""
    USER = "user"
    BOT = "bot"


class Message(Base):
    """Database model for storing chat messages."""
    __tablename__ = "messages"

    id: int = Column(Integer, primary_key=True, index=True)
    session_id: int = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender: SenderType = Column(Enum(SenderType, name="sender_type"), nullable=False)
    content: str = Column(Text, nullable=False)
    created_at: DateTime = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    session = relationship("Session", back_populates="messages")

    @validates("content")
    def validate_content(self, key: str, content: str) -> str:
        """Validate that content is not empty or only whitespace."""
        if not content or content.isspace():
            raise ValueError("Message content cannot be empty or only whitespace")
        return content

    def __repr__(self) -> str:
        """String representation of the Message model."""
        return f"<Message(id={self.id}, session_id={self.session_id}, sender={self.sender}, created_at={self.created_at})>"