from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./promptplay.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)  # Null for guest users
    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    posted_games = relationship("GameRequest", back_populates="host", foreign_keys="GameRequest.host_id")
    join_requests = relationship("JoinRequest", back_populates="user")


class GameRequest(Base):
    __tablename__ = "game_requests"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_prompt = Column(Text, nullable=False)
    sport = Column(String, nullable=False)
    location = Column(String, nullable=False)
    datetime_utc = Column(DateTime, nullable=False)
    players_needed = Column(Integer, nullable=False)
    status = Column(String, default="open")  # open, full, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    host = relationship("User", back_populates="posted_games", foreign_keys=[host_id])
    join_requests = relationship("JoinRequest", back_populates="game")


class JoinRequest(Base):
    __tablename__ = "join_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String, ForeignKey("game_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)  # User's optional description
    status = Column(String, default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    game = relationship("GameRequest", back_populates="join_requests")
    user = relationship("User", back_populates="join_requests")


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
