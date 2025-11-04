# PromptPlay Frontend

React frontend with Tailwind CSS and shadcn/ui components for the PromptPlay application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Prerequisites

Make sure the backend is running at `http://localhost:8000` before using the frontend.

## Groq API

Groq API console

[https://console.groq.com/settings/organization/usage?tab=activity&dateRange=%7B%22from%22:%222025-10-06%22,%22to%22:%222025-11-04%22%7D](https://console.groq.com/settings/organization/usage?tab=activity&dateRange=%7B%22from%22:%222025-10-06%22,%22to%22:%222025-11-04%22%7D)

## Features

- **Post New Game**: Create a game request using natural language
- **Find a Game**: Search for matching games using natural language
- **Semantic Matching**: See AI-powered compatibility scores and reasons
- **Beautiful UI**: Modern interface built with Tailwind CSS and shadcn/ui

## Usage

### Posting a Game

Type something like:
- "I want to play tennis for 2 people at the meadows on Wednesday 4pm"
- "Looking for basketball players at the gym tomorrow morning"

Click "Post New Game" and the AI will extract the structured information.

### Finding a Match

Type something like:
- "tennis at meadows tomorrow afternoon?"
- "Anyone for basketball in the morning?"

Click "Find a Game" and see all compatible matches with scores and reasons.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.
