# PromptPlay - AI-Powered Sports Matchmaking Platform

**PromptPlay** is an innovative sports matchmaking application that uses Large Language Models (LLMs) to connect players through natural language. Instead of rigid form-based filtering, users simply describe what they want to play in their own words, and the AI handles the rest.

![](home.png)

## Key Innovation

Traditional sports matchmaking apps require users to fill out multiple fields (sport type, location, time, skill level, etc.). PromptPlay revolutionizes this by:

- **Natural Language Understanding**: Just type "I want to play tennis for 2 people at the meadows on Wednesday 4pm""
- **Semantic Matching**: AI understands intent, not just exact keywords
- **Smart Extraction**: Converts casual text into structured game requests
- **Compatibility Scoring**: Finds the best matches based on context, not just filters

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

## Testing the Application

### Demo Scenario 1: LLM-Powered Game Creation

1. **Register/Login**: Create an account or use guest login
2. **Post a game** (User 1):
   - Go to "Home" tab
   - Type: "I want to play tennis for 2 people at the meadows on Wednesday 4pm"
   - Click "Post New Game"
   - Watch the LLM extract structured data (sport, location, time, players)
   - See your post in "My Games" -> "Hosted" view

### Demo Scenario 2: Semantic Matching

3. **Find matches** (User 2 - open in new tab):
   - Login as a different user (or guest)
   - Type: "anyone for tennis tomorrow afternoon at meadows?"
   - Click "Find a Game"
   - See the semantic match with compatibility score (e.g., 85%)
   - Read the AI-generated reason for the match

### Demo Scenario 3: Join Request Flow

4. **Request to join**: Click "Request to Join" on a matched game
5. **Host receives notification**: User 1's "My Games" tab shows a red badge
6. **View requests**: User 1 clicks on the game card with pending requests
7. **Accept/Reject**: User 1 reviews and accepts/rejects the join request
8. **Confirmation**: User 2 sees the game in "Joined Games"

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user or guest
- `POST /auth/login` - Login with credentials
- `POST /auth/guest` - Quick guest login
- `GET /auth/me` - Get current user info

### Game Requests

- `GET /` - Health check
- `GET /requests` - View all posted requests
- `POST /create-request` - Create new game request (LLM extraction)
- `POST /find-match` - Find matching games (LLM semantic matching)
- `DELETE /requests/{id}` - Delete specific request

### Join Requests

- `POST /games/{game_id}/join` - Request to join a game
- `GET /games/{game_id}/join-requests` - View join requests (host only)
- `PUT /join-requests/{request_id}` - Accept/reject join request

### My Games

- `GET /my-games/hosted` - Get games I'm hosting
- `GET /my-games/joined` - Get games I've joined

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
