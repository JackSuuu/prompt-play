# Project Plan: PromptPlay (CW3 PoC)

This plan is designed to be completed within the 20-24 hour estimate [cite: 229] and to score well on the CW3 rubric's criteria for "Innovation," "Execution," and "Completeness" (as a PoC) [cite: 230].

**Tech Stack:**

* **Frontend:** React
* **Backend:** FastAPI (Python)
* **LLM API:** (e.g., OpenAI, Gemini, or a Hugging Face model)
* **Database:** **None.** For a 20-24h PoC, we'll use a simple in-memory Python list on the FastAPI server. This is *crucial* for not getting "overcomplex."

-----

## Phase 1: The Backend (FastAPI) - The "Engine"

This is the most important part. Get this working first using a tool like Postman before you even *touch* React.

LLM key will be in a .env file which I will be use groq API which is compatible with OpenAI API. Example: 

```
GROQ_API_KEY=your_api_key_here

# How to use
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
      {
        "role": "user",
        "content": ""
      }
    ],
    temperature=1,
    max_completion_tokens=8192,
    top_p=1,
    reasoning_effort="medium",
    stream=True,
    stop=None
)

for chunk in completion:
    print(chunk.choices[0].delta.content or "", end="")
```

1.  **Setup:**

      * Create a new FastAPI project.
      * Create an in-memory "database": `DB = []` at the top of your `main.py` file. This list will store all the "open" game requests.

2.  **Define Your Data Model (Pydantic):**

      * You need a Pydantic model for your structured post. This is what the LLM will generate.

    <!-- end list -->

    ```python
    class GameRequest(BaseModel):
        id: str
        original_prompt: str
        sport: str
        location: str # e.g., "The Meadows, Edinburgh"
        datetime_utc: datetime
        players_needed: int
        status: str # e.g., "open", "matched"
    ```

3.  **Implement LLM Use Case 1: `POST /create-request`**

      * This endpoint receives a simple JSON: `{"prompt": "I want to play tennis for 2 people..."}`
      * **LLM Call 1 (Extraction):**
          * You will send this prompt to the LLM with a system message like:
            > "You are an assistant. Convert the user's text into a structured JSON object using this exact schema: `[paste your Pydantic schema here]`. Today's date is [current date]. Infer `datetime_utc` from relative terms like 'this Wednesday 4pm'. 'For 2 people' means `players_needed` is 1."
      * The LLM returns the JSON.
      * Your endpoint adds a `id` (using `uuid.uuid4()`) and the `original_prompt` to it, saves it to the in-memory `DB` list, and returns it to the user.

4.  **Implement LLM Use Case 2: `POST /find-match`**

      * This endpoint *also* receives: `{"prompt": "Anyone for tennis tomorrow arvo?"}`
      * It loops through every `GameRequest` in your `DB` that has `status == 'open'`.
      * **LLM Call 2 (Semantic Matching):**
          * For each open request, you make a *second* LLM call:
            > "You are a matching assistant. Here is a new request: 'Anyone for tennis tomorrow arvo?' Here is an existing open post: 'I want to play tennis for 2 people at meadows on this Wednesday 4pm'.
            > Are these a good match? Respond ONLY with a JSON object:
            > `{'is_match': true/false, 'compatibility_score': 0-100, 'reason': '...'}`"
      * Your endpoint collects all matches where `is_match == true`, sorts them by `compatibility_score`, and returns the list of matches.

-----

## Phase 2: The Frontend (React) - The "Shop Window"

Keep this *extremely* simple. This is just a user interface for your powerful backend, use shadcnui as framework to build it.

1.  **Setup:**

      * Use `create-react-app` or Vite to start a new React project.

2.  **Build the Minimal UI (in `App.js`):**

      * **One Text Input:** A single text area for the user to type their prompt.
      * **Two Buttons:**
          * `<button onClick={handlePostRequest}>Post New Game</button>`
          * `<button onClick={handleFindMatch}>Find a Game</button>`
      * **Two Display Areas:**
          * A "Your Posted Request" section (shows the request you just made).
          * A "Found Matches" section (shows the list of matches returned from the backend).

3.  **Hook up the API:**

      * Use `fetch` or `axios` to connect your buttons.
      * `handlePostRequest`: Calls `POST /create-request` with the text prompt. Updates the "Your Posted Request" state with the result.
      * `handleFindMatch`: Calls `POST /find-match` with the text prompt. Updates the "Found Matches" state with the list of results.

-----

## Phase 3: The Deliverables (CW3 & CW4)

This is how you get the marks.

1.  **`cw3_explanation.pdf` (The "Why" - max 1,000 words):**

      * **Innovation/Benefit:** [cite: 230] Don't just say "it's a sports app." Say: "PlayMatch's innovation is its *semantic matching engine*. Traditional apps use rigid filters (Sport, Time, Location). This is slow and unnatural. PlayMatch uses LLMs to understand user *intent* from natural language, allowing for faster, more human-friendly matching."
      * **Execution/Implementation:** [cite: 230] Describe your two LLM use cases clearly.
        1.  **NL-to-JSON (Extraction):** "An LLM chain converts unstructured user prompts into structured `GameRequest` objects."
        2.  **Semantic-to-Semantic (Matching):** "A second LLM chain acts as a compatibility judge, semantically comparing a new user's prompt against all open requests to find matches that *feel* right, even if the wording is different."
      * **Completeness:** [cite: 230] "This is a Proof of Concept (PoC) focused on the core matching logic. It demonstrates the *feasibility and benefit* of the LLM-powered engine. User accounts, chat, and a persistent database are outside the 20-24h scope but would be the next steps."

2.  **CW4 Video Script (The "Demo" - 5-7 mins):**

      * **(0:00-0:30):** Intro. (Show face, ID, and do the hand gestures as required\!) [cite: 229].
      * **(0:30-1:00):** The Problem. "This is PlayMatch. Finding sports partners is tedious. You have to fill out forms with exact times and locations. People don't talk like that."
      * **(1:00-2:30):** **Demo Part 1 (Posting):**
          * Show your simple React app.
          * "I'm User 1. I'll type: 'I want to play tennis for 2 people at the meadows on this Wednesday 4pm'."
          * Click "Post New Game".
          * Show the "Posted\!" UI. "My backend LLM has converted this into a structured post."
      * **(2:30-4:30):** **Demo Part 2 (Matching):**
          * "Now, I'm User 2. I'm not going to be so specific. I'll just type: 'tennis at meadows tomorrow afternoon?'"
          * Click "Find a Game".
          * **The "Wow" Moment:** Show the match appearing. "Even though I said 'tomorrow afternoon' and User 1 said 'Wednesday 4pm', the LLM knows these are compatible and creates the match."
      * **(4:30-5:00):** Conclusion. "This PoC proves that an LLM-first approach can create a more intuitive and human way to connect people. Thank you."