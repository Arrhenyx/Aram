from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, func, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session


class SenderType(Enum):
    """Enum for message sender types."""
    USER = "user"
    BOT = "bot"
    SYSTEM = "system"  # Added for system messages


class MessageType(Enum):
    """Enum for different types of messages."""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


class Message(Base):
    """Database model for storing chat messages."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, 
        ForeignKey("sessions.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True,
        comment="Foreign key to the chat session"
    )
    sender = Column(
        PGEnum(SenderType, name="sender_type", create_type=False),
        nullable=False,
        comment="Type of sender (user, bot, system)"
    )
    message_type = Column(
        PGEnum(MessageType, name="message_type", create_type=False),
        nullable=False,
        default=MessageType.TEXT,
        comment="Type of message content"
    )
    content = Column(
        Text, 
        nullable=False,
        comment="Message content (text, file path, etc.)"
    )
    metadata = Column(
        Text,
        nullable=True,
        comment="JSON metadata for additional message information"
    )
    parent_message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Reference to parent message for threading"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="Timestamp when message was created"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp when message was last updated"
    )

    # Relationships
    session: "Session" = relationship(
        "Session", 
        back_populates="messages",
        lazy="select"  # Changed to prevent unwanted eager loading
    )
    parent_message = relationship(
        "Message", 
        remote_side=[id],
        backref="replies",
        lazy="select",
        post_update=True
    )

    # Composite index for common query patterns
    __table_args__ = (
        Index('ix_messages_session_created', 'session_id', 'created_at'),
        Index('ix_messages_session_sender', 'session_id', 'sender'),
        {
            'comment': 'Stores chat messages with threading support'
        }
    )

    @validates("content")
    def validate_content(self, key: str, content: str) -> str:
        """Validate that content is not empty or only whitespace."""
        content = content.strip()
        if not content:
            raise ValueError("Message content cannot be empty or only whitespace")
        
        # Optional: Add length validation
        max_length = 10000  # Adjust based on your requirements
        if len(content) > max_length:
            raise ValueError(f"Message content exceeds maximum length of {max_length} characters")
            
        return content

    @validates("sender")
    def validate_sender(self, key: str, sender: SenderType) -> SenderType:
        """Validate sender type."""
        if not isinstance(sender, SenderType):
            try:
                sender = SenderType(sender)
            except ValueError:
                raise ValueError(f"Invalid sender type: {sender}")
        return sender

    @classmethod
    def create_user_message(
        cls, 
        session_id: int, 
        content: str, 
        message_type: MessageType = MessageType.TEXT,
        parent_message_id: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> "Message":
        """Factory method to create a user message."""
        return cls(
            session_id=session_id,
            sender=SenderType.USER,
            content=content.strip(),
            message_type=message_type,
            parent_message_id=parent_message_id,
            metadata=str(metadata) if metadata else None
        )

    @classmethod
    def create_bot_message(
        cls, 
        session_id: int, 
        content: str, 
        message_type: MessageType = MessageType.TEXT,
        parent_message_id: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> "Message":
        """Factory method to create a bot message."""
        return cls(
            session_id=session_id,
            sender=SenderType.BOT,
            content=content.strip(),
            message_type=message_type,
            parent_message_id=parent_message_id,
            metadata=str(metadata) if metadata else None
        )

    @property
    def is_user_message(self) -> bool:
        """Check if message is from user."""
        return self.sender == SenderType.USER

    @property
    def is_bot_message(self) -> bool:
        """Check if message is from bot."""
        return self.sender == SenderType.BOT

    @property
    def is_system_message(self) -> bool:
        """Check if message is a system message."""
        return self.sender == SenderType.SYSTEM

    def to_dict(self) -> dict:
        """Convert message to dictionary for serialization."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "sender": self.sender.value,
            "message_type": self.message_type.value,
            "content": self.content,
            "metadata": self.metadata,
            "parent_message_id": self.parent_message_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self) -> str:
        """String representation of the Message model."""
        return (
            f"<Message(id={self.id}, session_id={self.session_id}, "
            f"sender={self.sender.value}, type={self.message_type.value}, "
            f"created_at={self.created_at})>"
        )

    def __str__(self) -> str:
        """User-friendly string representation."""
        sender_display = self.sender.value.capitalize()
        content_preview = (
            self.content[:50] + "..." 
            if len(self.content) > 50 
            else self.content
        )
        return f"{sender_display}: {content_preview}"."""
        return f"<Message(id={self.id}, session_id={self.session_id}, sender={self.sender}, created_at={self.created_at})>"
