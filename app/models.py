from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")  # 'user' or 'admin'

class Guide(Base):
    __tablename__ = "guides"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    status = Column(String, default="draft")  # 'draft' or 'published'
    image_url = Column(String, nullable=True)
    priority = Column(Integer, default=0)
    help_options = Column(Text, nullable=True)  # JSON string of custom help options
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship to steps
    steps = relationship("GuideStep", back_populates="guide", cascade="all, delete-orphan", order_by="GuideStep.step_number")

class GuideStep(Base):
    __tablename__ = "guide_steps"

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("guides.id"), nullable=False)
    step_number = Column(Integer, default=1)
    title = Column(String)
    description = Column(Text)
    image_url = Column(String, nullable=True)

    guide = relationship("Guide", back_populates="steps")

class StepProblem(Base):
    __tablename__ = "step_problems"

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("guides.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    guide = relationship("Guide")

class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FraudScenario(Base):
    __tablename__ = "fraud_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario = Column(Text, nullable=False)
    correct_action = Column(String, nullable=False) # 'hangup' or 'believe'
    explanation = Column(Text, nullable=False)
    difficulty = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
