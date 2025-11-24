# PromptPlay - Docker Setup

This guide explains how to run PromptPlay using Docker.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed (usually comes with Docker Desktop)
- Groq API key

## Quick Start

### 1. Set up environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:

```
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your-secret-key-change-this-in-production
```

### 2. Build and run with Docker Compose

```bash
# Build and start both services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 3. Access the application

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 4. Stop the application

```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (clears database)
docker-compose down -v
```

## Docker Commands

### View logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Rebuild after code changes

```bash
docker-compose up --build
```

### Run individual services

```bash
# Backend only
docker-compose up backend

# Frontend only
docker-compose up frontend
```

