"""Integration tests for API endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Create test database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_promptplay.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def test_db():
    """Create test database and tables."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return auth headers."""
    # Register a test user
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123",
            "is_guest": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    token = data["access_token"]
    
    return {"Authorization": f"Bearer {token}"}


class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test GET / returns health status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "PromptPlay API is running"


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_register_new_user(self, client):
        """Test registering a new user."""
        response = client.post(
            "/auth/register",
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "password123",
                "is_guest": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "newuser"
        assert data["user"]["is_guest"] is False
    
    def test_register_guest_user(self, client):
        """Test registering a guest user."""
        response = client.post(
            "/auth/register",
            json={
                "username": "guest123",
                "is_guest": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["is_guest"] is True
        assert data["user"]["username"] == "guest123"
    
    def test_register_duplicate_username(self, client):
        """Test registering with duplicate username fails."""
        # Register first user
        client.post(
            "/auth/register",
            json={"username": "duplicate", "password": "pass123"}
        )
        
        # Try to register again
        response = client.post(
            "/auth/register",
            json={"username": "duplicate", "password": "pass456"}
        )
        
        assert response.status_code == 400
        assert "username already exists" in response.json()["detail"].lower()
    
    def test_login_success(self, client):
        """Test successful login."""
        # Register user
        client.post(
            "/auth/register",
            json={"username": "loginuser", "password": "loginpass"}
        )
        
        # Login
        response = client.post(
            "/auth/login",
            json={"username": "loginuser", "password": "loginpass"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "loginuser"
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password fails."""
        # Register user
        client.post(
            "/auth/register",
            json={"username": "user", "password": "correct"}
        )
        
        # Try to login with wrong password
        response = client.post(
            "/auth/login",
            json={"username": "user", "password": "wrong"}
        )
        
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user fails."""
        response = client.post(
            "/auth/login",
            json={"username": "nobody", "password": "pass"}
        )
        
        assert response.status_code == 401
    
    def test_guest_login(self, client):
        """Test guest login endpoint."""
        response = client.post("/auth/guest")
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_guest"] is True
        assert data["user"]["username"].startswith("Guest")
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user info."""
        response = client.get("/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without token fails."""
        response = client.get("/auth/me")
        
        assert response.status_code == 401


class TestGameRequestEndpoints:
    """Test game request endpoints."""
    
    def test_get_all_requests(self, client, auth_headers):
        """Test getting all game requests."""
        response = client.get("/requests", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_requests_unauthorized(self, client):
        """Test getting requests without auth returns empty list (public endpoint)."""
        response = client.get("/requests")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestJoinRequestFlow:
    """Test join request workflow."""
    
    def test_join_request_requires_auth(self, client):
        """Test that join request requires authentication."""
        response = client.post("/games/game123/join", json={"description": "test"})
        
        assert response.status_code == 401


class TestMyGamesEndpoints:
    """Test my games endpoints."""
    
    def test_get_hosted_games(self, client, auth_headers):
        """Test getting user's hosted games."""
        response = client.get("/my-games/hosted", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_joined_games(self, client, auth_headers):
        """Test getting user's joined games."""
        response = client.get("/my-games/joined", headers=auth_headers)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_my_games_requires_auth(self, client):
        """Test that my games endpoints require auth."""
        response = client.get("/my-games/hosted")
        assert response.status_code == 401
        
        response = client.get("/my-games/joined")
        assert response.status_code == 401


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_invalid_token_format(self, client):
        """Test that invalid token format is rejected."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    def test_missing_required_fields(self, client):
        """Test that missing required fields return proper errors."""
        # Try to register without username
        response = client.post("/auth/register", json={"password": "test"})
        
        assert response.status_code == 422  # Validation error
