# Backend Tests

This directory contains unit and integration tests for the PromptPlay backend.

## Running Tests

### Install test dependencies

```bash
pip install -r requirements.txt
```

### Run all tests

```bash
# From backend directory
pytest

# With verbose output
pytest -v

# With coverage report
pytest --cov=src --cov-report=html
```

### Run specific test files

```bash
# Unit tests only
pytest tests/test_auth.py

# Integration tests only
pytest tests/test_api.py

# Specific test class
pytest tests/test_auth.py::TestPasswordHashing

# Specific test function
pytest tests/test_auth.py::TestPasswordHashing::test_password_hash_and_verify
```