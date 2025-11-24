"""Unit tests for authentication functions."""
import pytest
from datetime import timedelta, timezone, datetime
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    SECRET_KEY,
    ALGORITHM
)


class TestPasswordHashing:
    """Test password hashing and verification."""
    
    def test_password_hash_and_verify(self):
        """Test that password hashing and verification work correctly."""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        # Hash should not equal plain password
        assert hashed != password
        # Verification should succeed
        assert verify_password(password, hashed) is True
    
    def test_wrong_password_fails_verification(self):
        """Test that wrong password fails verification."""
        password = "correct_password"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_same_password_produces_different_hashes(self):
        """Test that hashing same password produces different hashes (salt)."""
        password = "same_password"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and decoding."""
    
    def test_create_and_decode_token(self):
        """Test creating and decoding a valid JWT token."""
        data = {"sub": "testuser", "user_id": 1}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "testuser"
        assert decoded["user_id"] == 1
        assert "exp" in decoded
    
    def test_token_with_custom_expiry(self):
        """Test creating token with custom expiration time."""
        data = {"sub": "testuser"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta)
        
        decoded = decode_access_token(token)
        assert decoded is not None
        
        # Check expiration is approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        time_diff = (exp_time - now).total_seconds()
        
        # Should be close to 30 minutes (1800 seconds), allow 5 second margin
        assert 1795 <= time_diff <= 1805
    
    def test_decode_invalid_token(self):
        """Test that decoding invalid token returns None."""
        invalid_token = "invalid.jwt.token"
        decoded = decode_access_token(invalid_token)
        
        assert decoded is None
    
    def test_decode_expired_token(self):
        """Test that decoding expired token returns None."""
        data = {"sub": "testuser"}
        # Create token that expires immediately
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(data, expires_delta)
        
        decoded = decode_access_token(token)
        assert decoded is None
    
    def test_token_contains_all_data(self):
        """Test that token preserves all provided data."""
        data = {
            "sub": "testuser",
            "user_id": 123,
            "is_guest": False,
            "custom_field": "custom_value"
        }
        token = create_access_token(data)
        decoded = decode_access_token(token)
        
        assert decoded["sub"] == "testuser"
        assert decoded["user_id"] == 123
        assert decoded["is_guest"] is False
        assert decoded["custom_field"] == "custom_value"


class TestAuthEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_empty_password_hash(self):
        """Test hashing empty password."""
        password = ""
        hashed = get_password_hash(password)
        
        assert hashed != ""
        assert verify_password(password, hashed) is True
    
    def test_very_long_password(self):
        """Test hashing very long password."""
        password = "a" * 1000
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_special_characters_in_password(self):
        """Test hashing password with special characters."""
        password = "p@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/~`"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_unicode_in_password(self):
        """Test hashing password with unicode characters."""
        password = "пароль密码🔒"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
