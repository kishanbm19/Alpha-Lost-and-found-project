import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Date, DateTime, Boolean, Float, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import VECTOR
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), default="student", nullable=False)  # 'student' | 'admin'
    created_at = Column(DateTime(timezone=True), default=utcnow)

    items = relationship("Item", back_populates="reporter")
    claims = relationship("Claim", back_populates="claimant")


class Item(Base):
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    report_type = Column(String(10), index=True, nullable=False)  # 'lost' | 'found'
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), index=True, nullable=False)
    location = Column(String(100), index=True, nullable=False)
    event_date = Column(Date, nullable=False)
    image_url = Column(Text, nullable=True)
    hidden_details = Column(Text, nullable=True)  # Private clue for false-claim prevention
    status = Column(String(20), default="open", index=True)  # 'open' | 'under_review' | 'resolved'

    # Locked dimensions matching ML specification: CLIP (512) + MiniLM (384)
    image_embedding = Column(VECTOR(512), nullable=True)
    text_embedding = Column(VECTOR(384), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    reporter = relationship("User", back_populates="items")
    claims = relationship("Claim", back_populates="item")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    claimant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    proof_description = Column(Text, nullable=False)
    status = Column(String(20), default="pending", index=True)  # 'pending' | 'approved' | 'rejected'
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    item = relationship("Item", back_populates="claims")
    claimant = relationship("User", back_populates="claims")


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lost_item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    found_item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    image_score = Column(Float, nullable=True)
    text_score = Column(Float, nullable=False)
    combined_score = Column(Float, nullable=False)
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    lost_item = relationship("Item", foreign_keys=[lost_item_id])
    found_item = relationship("Item", foreign_keys=[found_item_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)
    type = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
