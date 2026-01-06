from __future__ import annotations
from enum import Enum
import json
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional, Dict, List, cast
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, func, Index, event, String
from sqlalchemy.orm import relationship, validates, Session as SASession
from sqlalchemy.dialects.postgresql import JSONB, ENUM as PGEnum
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, Field, validator, constr
import logging

from app.db.base import Base
from app.core.exceptions import ValidationError, DatabaseError

if TYPE_CHECKING:
    from app.models.session import Session

logger = logging.getLogger(__name__)


class SenderType(str, Enum):
    """Enum for message sender types."""
    USER = "user"
    BOT = "bot"
    SYSTEM = "system"
    ASSISTANT = "assistant"  # Alternative to BOT for OpenAI compatibility


class MessageType(str, Enum):
    """Enum for different types of messages."""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"
    MARKDOWN = "markdown"  # For formatted content
    ERROR = "error"       # For error messages
    STATUS = "status"     # For status updates


class MessageStatus(str, Enum):
    """Enum for message processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELIVERED = "delivered"
    READ = "read"


class MessageMetadata(BaseModel):
    """Pydantic model for message metadata validation."""
    tokens: Optional[int] = Field(None, ge=0, description="Token count for LLM messages")
    model: Optional[str] = Field(None, description="Model used for generation")
    latency: Optional[float] = Field(None, ge=0, description="Response latency in seconds")
    files: Optional[List[str]] = Field(None, description="List of attached file paths")
    error_code: Optional[str] = Field(None, description="Error code if message failed")
    custom_data: Optional[Dict[str, Any]] = Field(None, description="Custom metadata")
    
    class Config:
        extra = "allow"  # Allow extra fields for flexibility
        validate_assignment = True


class MessageContentValidator:
    """Utility class for content validation."""
    
    MAX_CONTENT_LENGTH = 100_000  # Increased for file paths and base64
    MAX_METADATA_SIZE = 10_000  # Characters
    
    @staticmethod
    def validate_text_content(content: str) -> str:
        """Validate text content."""
        content = content.strip()
        if not content:
            raise ValidationError("Message content cannot be empty")
        
        if len(content) > MessageContentValidator.MAX_CONTENT_LENGTH:
            raise ValidationError(
                f"Message content exceeds maximum length of "
                f"{MessageContentValidator.MAX_CONTENT_LENGTH} characters"
            )
        return content
    
    @staticmethod
    def validate_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[str]:
        """Validate and serialize metadata."""
        if not metadata:
            return None
        
        # Validate using Pydantic model
        try:
            validated_metadata = MessageMetadata(**metadata)
            serialized = validated_metadata.json(exclude_none=True)
            
            if len(serialized) > MessageContentValidator.MAX_METADATA_SIZE:
                raise ValidationError("Metadata size exceeds maximum limit")
                
            return serialized
        except Exception as e:
            logger.warning(f"Failed to validate metadata: {e}")
            raise ValidationError(f"Invalid metadata format: {str(e)}")


class Message(Base):
    """Database model for storing chat messages with enhanced features."""
    __tablename__ = "messages"
    __table_args__ = (
        # Composite indexes for common query patterns
        Index('ix_messages_session_created', 'session_id', 'created_at'),
        Index('ix_messages_session_sender_status', 'session_id', 'sender', 'status'),
        Index('ix_messages_parent_thread', 'parent_message_id', 'created_at'),
        Index('ix_messages_session_type', 'session_id', 'message_type'),
        # Partial indexes for better performance
        Index('ix_messages_active', 'session_id', 'created_at', 
              postgresql_where='deleted_at IS NULL'),
        {
            'comment': 'Stores chat messages with threading, status tracking, and soft delete support'
        }
    )
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, 
        ForeignKey("sessions.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True,
        comment="Foreign key to the chat session"
    )
    
    # Message identity
    external_id = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
        comment="External identifier for cross-system referencing"
    )
    
    # Content fields
    sender = Column(
        PGEnum(SenderType, name="sender_type", create_type=False),
        nullable=False,
        comment="Type of sender (user, bot, system, assistant)"
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
        comment="Message content (text, file path, base64, etc.)"
    )
    
    # Metadata and status
    metadata = Column(
        JSONB,  # Using JSONB for PostgreSQL for better querying
        nullable=True,
        default=None,
        comment="Structured metadata for additional message information"
    )
    
    status = Column(
        PGEnum(MessageStatus, name="message_status", create_type=False),
        nullable=False,
        default=MessageStatus.COMPLETED,
        comment="Processing status of the message"
    )
    
    # Relationships and threading
    parent_message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Reference to parent message for threading"
    )
    
    # Versioning and lifecycle
    version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Version number for optimistic concurrency control"
    )
    
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="Timestamp when message was soft-deleted"
    )
    
    # Timestamps
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
    
    sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when message was sent"
    )
    
    read_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when message was read"
    )
    
    # Relationships
    session = relationship(
        "Session", 
        back_populates="messages",
        lazy="select"
    )
    
    parent_message = relationship(
        "Message", 
        remote_side=[id],
        backref="replies",
        lazy="select",
        post_update=True
    )

    # Validation methods
    @validates("content")
    def validate_content(self, key: str, content: str) -> str:
        """Validate message content based on message type."""
        try:
            return MessageContentValidator.validate_text_content(content)
        except ValidationError as e:
            logger.error(f"Content validation failed: {e}")
            raise
    
    @validates("metadata")
    def validate_metadata_column(self, key: str, metadata: Any) -> Optional[Dict[str, Any]]:
        """Validate and convert metadata."""
        if metadata is None:
            return None
        
        try:
            # If it's already a dict, validate it
            if isinstance(metadata, dict):
                validated = MessageMetadata(**metadata)
                return validated.dict(exclude_none=True)
            
            # If it's a string, try to parse it as JSON
            if isinstance(metadata, str):
                parsed = json.loads(metadata)
                validated = MessageMetadata(**parsed)
                return validated.dict(exclude_none=True)
            
            raise ValidationError("Metadata must be a dict or JSON string")
        except Exception as e:
            logger.warning(f"Metadata validation failed: {e}")
            raise ValidationError(f"Invalid metadata: {str(e)}")
    
    @validates("sender")
    def validate_sender(self, key: str, sender: SenderType) -> SenderType:
        """Validate sender type."""
        if isinstance(sender, str):
            try:
                return SenderType(sender.lower())
            except ValueError:
                raise ValidationError(f"Invalid sender type: {sender}")
        elif isinstance(sender, SenderType):
            return sender
        else:
            raise ValidationError(f"Invalid sender type: {type(sender)}")
    
    # Factory methods
    @classmethod
    def create(
        cls,
        session_id: int,
        sender: SenderType,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        parent_message_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        external_id: Optional[str] = None,
        status: MessageStatus = MessageStatus.COMPLETED,
        **kwargs
    ) -> Message:
        """Factory method to create a message with validation."""
        validated_metadata = MessageContentValidator.validate_metadata(metadata)
        validated_content = MessageContentValidator.validate_text_content(content)
        
        return cls(
            session_id=session_id,
            sender=sender,
            content=validated_content,
            message_type=message_type,
            parent_message_id=parent_message_id,
            metadata=validated_metadata,
            external_id=external_id,
            status=status,
            **kwargs
        )
    
    @classmethod
    def create_user_message(
        cls,
        session_id: int,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        parent_message_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Message:
        """Factory method to create a user message."""
        return cls.create(
            session_id=session_id,
            sender=SenderType.USER,
            content=content,
            message_type=message_type,
            parent_message_id=parent_message_id,
            metadata=metadata,
            **kwargs
        )
    
    @classmethod
    def create_bot_message(
        cls,
        session_id: int,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        parent_message_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Message:
        """Factory method to create a bot/assistant message."""
        return cls.create(
            session_id=session_id,
            sender=SenderType.BOT,
            content=content,
            message_type=message_type,
            parent_message_id=parent_message_id,
            metadata=metadata,
            **kwargs
        )
    
    @classmethod
    def create_system_message(
        cls,
        session_id: int,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Message:
        """Factory method to create a system message."""
        return cls.create(
            session_id=session_id,
            sender=SenderType.SYSTEM,
            content=content,
            message_type=MessageType.SYSTEM,
            metadata=metadata,
            **kwargs
        )
    
    # Business logic methods
    def mark_as_read(self) -> None:
        """Mark message as read."""
        self.read_at = datetime.now(timezone=True)
        self.status = MessageStatus.READ
    
    def mark_as_delivered(self) -> None:
        """Mark message as delivered."""
        self.status = MessageStatus.DELIVERED
    
    def mark_as_failed(self, error_code: Optional[str] = None) -> None:
        """Mark message as failed."""
        self.status = MessageStatus.FAILED
        if error_code and self.metadata:
            self.metadata = {**(self.metadata or {}), "error_code": error_code}
    
    def soft_delete(self) -> None:
        """Soft delete the message."""
        self.deleted_at = datetime.now(timezone=True)
    
    def is_deleted(self) -> bool:
        """Check if message is soft-deleted."""
        return self.deleted_at is not None
    
    def get_metadata_model(self) -> Optional[MessageMetadata]:
        """Get metadata as Pydantic model."""
        if self.metadata:
            try:
                return MessageMetadata(**self.metadata)
            except Exception as e:
                logger.warning(f"Failed to parse metadata: {e}")
        return None
    
    # Property methods
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
    
    @property
    def is_assistant_message(self) -> bool:
        """Check if message is from assistant."""
        return self.sender == SenderType.ASSISTANT
    
    @property
    def has_parent(self) -> bool:
        """Check if message has a parent."""
        return self.parent_message_id is not None
    
    @property
    def thread_depth(self) -> int:
        """Calculate thread depth (0 for root messages)."""
        if not self.parent_message_id:
            return 0
        # This would be more efficient with a recursive query
        # For simplicity, we'll return 1 for direct children
        return 1
    
    # Serialization methods
    def to_dict(self, include_metadata: bool = True, include_session: bool = False) -> Dict[str, Any]:
        """Convert message to dictionary for serialization."""
        result = {
            "id": self.id,
            "external_id": self.external_id,
            "session_id": self.session_id,
            "sender": self.sender.value,
            "message_type": self.message_type.value,
            "content": self.content,
            "status": self.status.value,
            "parent_message_id": self.parent_message_id,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }
        
        if include_metadata and self.metadata:
            result["metadata"] = self.metadata
        
        if include_session and self.session:
            result["session"] = self.session.to_dict() if hasattr(self.session, 'to_dict') else None
        
        return result
    
    def to_api_response(self) -> Dict[str, Any]:
        """Format for API response."""
        data = self.to_dict(include_metadata=True, include_session=False)
        # Remove internal fields
        data.pop("deleted_at", None)
        data.pop("version", None)
        return data
    
    # Magic methods
    def __repr__(self) -> str:
        """String representation of the Message model."""
        return (
            f"<Message(id={self.id}, session_id={self.session_id}, "
            f"sender={self.sender.value}, type={self.message_type.value}, "
            f"status={self.status.value}, created_at={self.created_at})>"
        )
    
    def __str__(self) -> str:
        """User-friendly string representation."""
        sender_display = self.sender.value.capitalize()
        status_display = f" [{self.status.value}]" if self.status != MessageStatus.COMPLETED else ""
        content_preview = (
            self.content[:50] + "..." 
            if len(self.content) > 50 
            else self.content
        )
        return f"{sender_display}{status_display}: {content_preview}"
    
    def __eq__(self, other: Any) -> bool:
        """Equality check based on ID and version."""
        if not isinstance(other, Message):
            return False
        return self.id == other.id and self.version == other.version
    
    def __hash__(self) -> int:
        """Hash based on ID and version."""
        return hash((self.id, self.version))


# SQLAlchemy events
@event.listens_for(Message, 'before_insert')
@event.listens_for(Message, 'before_update')
def validate_message_before_save(mapper, connection, target):
    """Additional validation before saving."""
    if target.message_type == MessageType.TEXT and not target.content.strip():
        raise ValidationError("Text messages cannot be empty")
    
    # Ensure sent_at is set for bot messages with status DELIVERED
    if (target.sender in [SenderType.BOT, SenderType.ASSISTANT] and 
        target.status == MessageStatus.DELIVERED and 
        not target.sent_at):
        target.sent_at = datetime.now(timezone=True)


@event.listens_for(Message, 'load')
def receive_load(target, context):
    """Handle message load event."""
    logger.debug(f"Message {target.id} loaded from database")


# Utility functions
def get_message_thread(db: SASession, root_message_id: int) -> List[Message]:
    """Get entire message thread starting from root message."""
    # This is a simplified version - consider recursive CTE for production
    from sqlalchemy import or_
    
    thread_messages = db.query(Message).filter(
        or_(
            Message.id == root_message_id,
            Message.parent_message_id == root_message_id
        )
    ).order_by(Message.created_at).all()
    
    return thread_messages


def get_session_messages(
    db: SASession,
    session_id: int,
    limit: int = 100,
    offset: int = 0,
    include_deleted: bool = False
) -> List[Message]:
    """Get messages for a session with pagination."""
    query = db.query(Message).filter(Message.session_id == session_id)
    
    if not include_deleted:
        query = query.filter(Message.deleted_at.is_(None))
    
    return query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()