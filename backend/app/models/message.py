import enum
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, func, Enum
from app.db.base import Base


class SenderType(enum.Enum):
    user = "user"
    bot = "bot"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    sender = Column(Enum(SenderType, name="sender_enum"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
