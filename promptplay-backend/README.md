# PromptPlay Backend

FastAPI backend with LLM-powered semantic matching for sports game requests.

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Add your Groq API key to the `.env` file:
```
GROQ_API_KEY=your_actual_key_here
```

## Running

```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Health check
- `GET /requests` - Get all game requests
- `POST /create-request` - Create a new game request from natural language
  ```json
  {"prompt": "I want to play tennis for 2 people at the meadows on Wednesday 4pm"}
  ```
- `POST /find-match` - Find matching game requests
  ```json
  {"prompt": "Anyone for tennis tomorrow afternoon?"}
  ```
- `DELETE /requests/{request_id}` - Delete a specific request
- `DELETE /requests` - Clear all requests

## Testing with curl

Create a request:
```bash
curl -X POST http://localhost:8000/create-request \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I want to play tennis for 2 people at the meadows on Wednesday 4pm"}'
```

Find matches:
```bash
curl -X POST http://localhost:8000/find-match \
  -H "Content-Type: application/json" \
  -d '{"prompt": "tennis at meadows tomorrow afternoon?"}'
```
