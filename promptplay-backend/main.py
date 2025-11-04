from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
import uuid
import os
from dotenv import load_dotenv
from groq import Groq
import json

# Import database and auth modules
from database import get_db, init_db, User, GameRequest as DBGameRequest, JoinRequest as DBJoinRequest
from auth import create_access_token, decode_access_token, get_password_hash, verify_password

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="PromptPlay API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()


# Pydantic Models for API
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: Optional[str] = None
    is_guest: bool = False


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_guest: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class GameRequest(BaseModel):
    id: str
    host_id: int
    host_username: str
    original_prompt: str
    sport: str
    location: str
    datetime_utc: datetime
    players_needed: int
    players_joined: int = 0
    status: str = "open"
    created_at: datetime

    class Config:
        from_attributes = True


class PromptRequest(BaseModel):
    prompt: str


class JoinRequestCreate(BaseModel):
    game_id: str
    description: Optional[str] = None


class JoinRequestResponse(BaseModel):
    id: int
    game_id: str
    user_id: int
    username: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class JoinRequestUpdate(BaseModel):
    status: str  # accepted or rejected


class MatchResult(BaseModel):
    game_request: GameRequest
    is_match: bool
    compatibility_score: int
    reason: str


class ValidationError(BaseModel):
    error: str
    missing_fields: List[str]
    suggestions: str


# Helper function to get current user from token
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Get the current authenticated user from the authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


# Optional auth - returns None if not authenticated
def get_current_user_optional(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Get the current user if authenticated, otherwise return None."""
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None


# Helper function to call LLM
def call_llm(system_message: str, user_message: str, temperature: float = 0.7) -> str:
    """Call Groq LLM and return the response."""
    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",  # Using a good model for reasoning
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=temperature,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")


# Helper function to validate extracted data
def validate_game_request(data: dict) -> tuple[bool, list[str], str]:
    """Validate that all required fields are present and valid."""
    missing_fields = []
    suggestions = []
    
    # Check sport
    if not data.get("sport") or data.get("sport") == "unknown" or data.get("sport") == "null":
        missing_fields.append("sport")
        suggestions.append("Please specify what sport you want to play (e.g., tennis, football, basketball)")
    
    # Check location
    if not data.get("location") or data.get("location") == "unknown" or data.get("location") == "null":
        missing_fields.append("location")
        suggestions.append("Please specify where you want to play (e.g., The Meadows, Holyrood Park)")
    
    # Check datetime
    if not data.get("datetime_utc") or data.get("datetime_utc") == "unknown" or data.get("datetime_utc") == "null":
        missing_fields.append("datetime")
        suggestions.append("Please specify when you want to play (e.g., tomorrow 4pm, this Wednesday afternoon)")
    
    # Check players_needed
    if not data.get("players_needed") or data.get("players_needed") == 0:
        missing_fields.append("players_needed")
        suggestions.append("Please specify how many players you need (e.g., need 2 more players, for 3 people)")
    
    is_valid = len(missing_fields) == 0
    suggestion_text = " " + " ".join(suggestions) if suggestions else ""
    
    return is_valid, missing_fields, suggestion_text


# API Endpoints

# ========== Authentication Endpoints ==========

@app.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user or create a guest account."""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists (if provided)
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    hashed_password = None
    if not user_data.is_guest and user_data.password:
        hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_guest=user_data.is_guest
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"user_id": new_user.id, "username": new_user.username})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with username and password."""
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if user.is_guest:
        raise HTTPException(status_code=401, detail="Guest users cannot login with password")
    
    if not user.hashed_password or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create access token
    access_token = create_access_token(data={"user_id": user.id, "username": user.username})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@app.post("/auth/guest", response_model=TokenResponse)
async def login_as_guest(db: Session = Depends(get_db)):
    """Quick login as a guest with auto-generated username."""
    # Generate unique guest username
    import random
    guest_number = random.randint(1000, 9999)
    username = f"Guest{guest_number}"
    
    # Ensure uniqueness
    while db.query(User).filter(User.username == username).first():
        guest_number = random.randint(1000, 9999)
        username = f"Guest{guest_number}"
    
    # Create guest user
    new_user = User(
        username=username,
        is_guest=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"user_id": new_user.id, "username": new_user.username})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


# ========== Game Request Endpoints ==========

@app.get("/")
async def root(db: Session = Depends(get_db)):
    total_requests = db.query(DBGameRequest).count()
    total_users = db.query(User).count()
    return {
        "message": "PromptPlay API is running",
        "total_requests": total_requests,
        "total_users": total_users
    }


@app.get("/requests", response_model=List[GameRequest])
async def get_all_requests(db: Session = Depends(get_db)):
    """Get all game requests."""
    db_requests = db.query(DBGameRequest).order_by(DBGameRequest.created_at.desc()).all()
    
    # Convert to response model with additional fields
    requests = []
    for req in db_requests:
        join_count = db.query(DBJoinRequest).filter(
            DBJoinRequest.game_id == req.id,
            DBJoinRequest.status == "accepted"
        ).count()
        
        requests.append(GameRequest(
            id=req.id,
            host_id=req.host_id,
            host_username=req.host.username,
            original_prompt=req.original_prompt,
            sport=req.sport,
            location=req.location,
            datetime_utc=req.datetime_utc,
            players_needed=req.players_needed,
            players_joined=join_count,
            status=req.status,
            created_at=req.created_at
        ))
    
    return requests


@app.post("/create-request", response_model=GameRequest)
async def create_request(
    prompt_req: PromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    LLM Use Case 1: Extract structured data from natural language prompt.
    Requires authentication.
    """
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    system_message = f"""You are an assistant that converts natural language requests into structured JSON.
Extract the following information from the user's prompt:
- sport (e.g., "tennis", "football", "basketball")
- location (e.g., "The Meadows, Edinburgh", "Holyrood Park")
- datetime_utc (convert relative terms like "tomorrow", "this Wednesday 4pm" to ISO format datetime. Today is {current_date})
- players_needed (if they say "for 2 people", they need 1 more player. If they say "need 3 players", then players_needed is 3)

Respond ONLY with valid JSON in this exact format:
{{
    "sport": "string",
    "location": "string", 
    "datetime_utc": "ISO datetime string",
    "players_needed": number
}}

Do not include any explanation or markdown formatting."""

    # Call LLM to extract structured data
    llm_response = call_llm(system_message, prompt_req.prompt, temperature=0.3)
    
    try:
        # Parse LLM response
        extracted_data = json.loads(llm_response)
        
        # Validate the extracted data
        is_valid, missing_fields, suggestions = validate_game_request(extracted_data)
        
        if not is_valid:
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "Missing required information",
                    "missing_fields": missing_fields,
                    "suggestions": suggestions,
                    "your_prompt": prompt_req.prompt
                }
            )
        
        # Create database game request
        db_game_request = DBGameRequest(
            id=str(uuid.uuid4()),
            host_id=current_user.id,
            original_prompt=prompt_req.prompt,
            sport=extracted_data["sport"],
            location=extracted_data["location"],
            datetime_utc=datetime.fromisoformat(extracted_data["datetime_utc"].replace("Z", "+00:00")),
            players_needed=extracted_data["players_needed"],
            status="open"
        )
        
        db.add(db_game_request)
        db.commit()
        db.refresh(db_game_request)
        
        # Return response model
        return GameRequest(
            id=db_game_request.id,
            host_id=db_game_request.host_id,
            host_username=current_user.username,
            original_prompt=db_game_request.original_prompt,
            sport=db_game_request.sport,
            location=db_game_request.location,
            datetime_utc=db_game_request.datetime_utc,
            players_needed=db_game_request.players_needed,
            players_joined=0,
            status=db_game_request.status,
            created_at=db_game_request.created_at
        )
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response: {llm_response}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating request: {str(e)}")


@app.post("/find-match", response_model=List[MatchResult])
async def find_match(prompt_req: PromptRequest, db: Session = Depends(get_db)):
    """
    LLM Use Case 2: Semantically match a prompt against all open game requests.
    """
    # Get all open requests from database
    db_open_requests = db.query(DBGameRequest).filter(DBGameRequest.status == "open").all()
    
    if not db_open_requests:
        return []
    
    matches = []
    
    for db_game_req in db_open_requests:
        # Count accepted players
        join_count = db.query(DBJoinRequest).filter(
            DBJoinRequest.game_id == db_game_req.id,
            DBJoinRequest.status == "accepted"
        ).count()
        
        # Convert to response model
        game_req = GameRequest(
            id=db_game_req.id,
            host_id=db_game_req.host_id,
            host_username=db_game_req.host.username,
            original_prompt=db_game_req.original_prompt,
            sport=db_game_req.sport,
            location=db_game_req.location,
            datetime_utc=db_game_req.datetime_utc,
            players_needed=db_game_req.players_needed,
            players_joined=join_count,
            status=db_game_req.status,
            created_at=db_game_req.created_at
        )
        system_message = """You are a matching assistant that determines if two game requests are compatible.
Consider factors like:
- Same or compatible sport
- Similar location (nearby areas are OK)
- Compatible timing (similar dates/times, allow some flexibility)
- Overall intent and context

Respond ONLY with valid JSON in this exact format:
{
    "is_match": true or false,
    "compatibility_score": number from 0-100,
    "reason": "brief explanation"
}

Do not include any explanation or markdown formatting."""

        user_message = f"""New request: "{prompt_req.prompt}"

Existing post: "{game_req.original_prompt}"
Sport: {game_req.sport}
Location: {game_req.location}
Time: {game_req.datetime_utc}
Players needed: {game_req.players_needed}

Are these a good match?"""

        # Call LLM for semantic matching
        llm_response = call_llm(system_message, user_message, temperature=0.5)
        
        try:
            match_data = json.loads(llm_response)
            
            if match_data.get("is_match", False):
                matches.append(MatchResult(
                    game_request=game_req,
                    is_match=match_data["is_match"],
                    compatibility_score=match_data["compatibility_score"],
                    reason=match_data["reason"]
                ))
        except json.JSONDecodeError:
            # Skip this match if LLM response is malformed
            continue
    
    # Sort by compatibility score (highest first)
    matches.sort(key=lambda x: x.compatibility_score, reverse=True)
    
    return matches


# ========== Join Request Endpoints ==========

@app.post("/games/{game_id}/join", response_model=JoinRequestResponse)
async def join_game(
    game_id: str,
    join_data: JoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request to join a game."""
    # Check if game exists
    game = db.query(DBGameRequest).filter(DBGameRequest.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status != "open":
        raise HTTPException(status_code=400, detail="Game is not open for joining")
    
    if game.host_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot join your own game")
    
    # Check if already requested
    existing_request = db.query(DBJoinRequest).filter(
        DBJoinRequest.game_id == game_id,
        DBJoinRequest.user_id == current_user.id
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="You have already requested to join this game")
    
    # Create join request
    join_request = DBJoinRequest(
        game_id=game_id,
        user_id=current_user.id,
        description=join_data.description,
        status="pending"
    )
    
    db.add(join_request)
    db.commit()
    db.refresh(join_request)
    
    return JoinRequestResponse(
        id=join_request.id,
        game_id=join_request.game_id,
        user_id=join_request.user_id,
        username=current_user.username,
        description=join_request.description,
        status=join_request.status,
        created_at=join_request.created_at
    )


@app.get("/games/{game_id}/join-requests", response_model=List[JoinRequestResponse])
async def get_join_requests(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all join requests for a game (only host can see)."""
    game = db.query(DBGameRequest).filter(DBGameRequest.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can view join requests")
    
    join_requests = db.query(DBJoinRequest).filter(DBJoinRequest.game_id == game_id).all()
    
    return [
        JoinRequestResponse(
            id=jr.id,
            game_id=jr.game_id,
            user_id=jr.user_id,
            username=jr.user.username,
            description=jr.description,
            status=jr.status,
            created_at=jr.created_at
        )
        for jr in join_requests
    ]


@app.put("/join-requests/{request_id}", response_model=JoinRequestResponse)
async def update_join_request(
    request_id: int,
    update_data: JoinRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept or reject a join request (only host can do this)."""
    join_request = db.query(DBJoinRequest).filter(DBJoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")
    
    game = db.query(DBGameRequest).filter(DBGameRequest.id == join_request.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can accept/reject join requests")
    
    if update_data.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'rejected'")
    
    join_request.status = update_data.status
    db.commit()
    db.refresh(join_request)
    
    # Check if game is full
    if update_data.status == "accepted":
        accepted_count = db.query(DBJoinRequest).filter(
            DBJoinRequest.game_id == game.id,
            DBJoinRequest.status == "accepted"
        ).count()
        
        if accepted_count >= game.players_needed:
            game.status = "full"
            db.commit()
    
    return JoinRequestResponse(
        id=join_request.id,
        game_id=join_request.game_id,
        user_id=join_request.user_id,
        username=join_request.user.username,
        description=join_request.description,
        status=join_request.status,
        created_at=join_request.created_at
    )


# ========== My Games Endpoints ==========

@app.get("/my-games/hosted", response_model=List[GameRequest])
async def get_my_hosted_games(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all games hosted by the current user."""
    hosted_games = db.query(DBGameRequest).filter(
        DBGameRequest.host_id == current_user.id
    ).order_by(DBGameRequest.created_at.desc()).all()
    
    result = []
    for game in hosted_games:
        join_count = db.query(DBJoinRequest).filter(
            DBJoinRequest.game_id == game.id,
            DBJoinRequest.status == "accepted"
        ).count()
        
        result.append(GameRequest(
            id=game.id,
            host_id=game.host_id,
            host_username=current_user.username,
            original_prompt=game.original_prompt,
            sport=game.sport,
            location=game.location,
            datetime_utc=game.datetime_utc,
            players_needed=game.players_needed,
            players_joined=join_count,
            status=game.status,
            created_at=game.created_at
        ))
    
    return result


@app.get("/my-games/joined", response_model=List[GameRequest])
async def get_my_joined_games(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all games the current user has joined (accepted)."""
    accepted_joins = db.query(DBJoinRequest).filter(
        DBJoinRequest.user_id == current_user.id,
        DBJoinRequest.status == "accepted"
    ).all()
    
    result = []
    for join_req in accepted_joins:
        game = join_req.game
        join_count = db.query(DBJoinRequest).filter(
            DBJoinRequest.game_id == game.id,
            DBJoinRequest.status == "accepted"
        ).count()
        
        result.append(GameRequest(
            id=game.id,
            host_id=game.host_id,
            host_username=game.host.username,
            original_prompt=game.original_prompt,
            sport=game.sport,
            location=game.location,
            datetime_utc=game.datetime_utc,
            players_needed=game.players_needed,
            players_joined=join_count,
            status=game.status,
            created_at=game.created_at
        ))
    
    return result


@app.delete("/requests/{request_id}")
async def delete_request(request_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a specific game request (only host can delete)."""
    game = db.query(DBGameRequest).filter(DBGameRequest.id == request_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if game.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can delete this game")
    
    db.delete(game)
    db.commit()
    return {"message": "Request deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
