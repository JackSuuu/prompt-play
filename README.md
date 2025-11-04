# PromptPlay - Quick Prototype Setup Guide

This is a quick prototype for the PromptPlay application with separate frontend and backend.

## Project Structure

```
cw3/
├── promptplay-backend/     # FastAPI backend with LLM
└── promptplay-frontend/    # React frontend with shadcn/ui
```

## Quick Start

### 1. Backend Setup (Terminal 1)

```bash
cd promptplay-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add your Groq API key to .env
# GROQ_API_KEY=your_key_here

# Run the backend
python main.py
```

Backend will be available at: `http://localhost:8000`

### 2. Frontend Setup (Terminal 2)

```bash
cd promptplay-frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## Key Features Implemented

### Backend (FastAPI + Groq LLM)
- ✅ **POST /create-request**: Converts natural language to structured game request
- ✅ **POST /find-match**: Semantic matching with compatibility scores
- ✅ In-memory database (no external DB needed for PoC)
- ✅ CORS enabled for frontend communication
- ✅ Full error handling

### Frontend (React + Tailwind + shadcn/ui)
- ✅ Beautiful, modern UI with Tailwind CSS
- ✅ Post new game requests
- ✅ Find matching games
- ✅ Display compatibility scores and reasons
- ✅ Responsive design
- ✅ Loading states and error handling

## Testing the Prototype

1. **Post a game** (User 1):
   - Type: "I want to play tennis for 2 people at the meadows on Wednesday 4pm"
   - Click "Post New Game"
   - See the structured extraction

2. **Find a match** (User 2):
   - Type: "tennis at meadows tomorrow afternoon?"
   - Click "Find a Game"
   - See the semantic match with compatibility score

## API Endpoints

- `GET /` - Health check
- `GET /requests` - View all posted requests
- `POST /create-request` - Create new game request
- `POST /find-match` - Find matching games
- `DELETE /requests/{id}` - Delete specific request
- `DELETE /requests` - Clear all requests

## Tech Stack

**Backend:**
- FastAPI (Python web framework)
- Groq (LLM API - OpenAI compatible)
- Pydantic (Data validation)
- Uvicorn (ASGI server)

**Frontend:**
- React 18
- Vite (Build tool)
- Tailwind CSS (Styling)
- shadcn/ui (Component library)
- Axios (HTTP client)
- Lucide React (Icons)

## Next Steps for Full Implementation

- [ ] Add user authentication
- [ ] Implement chat functionality
- [ ] Add persistent database (PostgreSQL)
- [ ] Deploy to cloud (backend + frontend)
- [ ] Add email/SMS notifications
- [ ] Implement real-time updates (WebSockets)
- [ ] Add profile pages
- [ ] Add game history

## Troubleshooting

**Backend won't start:**
- Make sure you've added your Groq API key to `.env`
- Check Python version (Python 3.8+)
- Ensure virtual environment is activated

**Frontend won't start:**
- Run `npm install` again
- Check Node version (Node 16+)
- Clear npm cache: `npm cache clean --force`

**No matches found:**
- Post a game request first
- Make sure backend is running
- Check browser console for errors

**CORS errors:**
- Ensure backend is running on port 8000
- Check that frontend is on 5173 or 3000
