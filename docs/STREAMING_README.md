# Real-Time Streaming Code Generation - Setup Guide

**🎉 Streaming is now the DEFAULT mode!** All code generation happens in real-time.

## Quick Start

### 1. Start the Backend Server

**IMPORTANT**: The backend server must be running for streaming to work!

```bash
cd backend
npm install  # First time only
npm start    # Starts backend on http://localhost:3001
```

### 2. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install  # First time only
npm run dev  # Starts frontend on http://localhost:3000
```

### 3. Configure Your AI Provider

Make sure you have API keys configured in `backend/.env.local` (or root `.env.local`):

```bash
# Choose at least one provider with valid credits
OPENAI_API_KEY=your-openai-key-here          # Needs billing configured
ANTHROPIC_API_KEY=your-anthropic-key-here    # Needs valid API key
GOOGLE_API_KEY=your-google-key-here          # ✅ Working!
XAI_API_KEY=your-xai-key-here                # Needs credits
```

**Recommended for testing**: Use Google API (Gemini) as it has free tier and is currently working!

### 4. Generate Code (Streaming is Default!)

**Streaming mode is now enabled by default!** Just type your prompt:

```bash
Create a React todo app
Build a ping pong game
Design a weather dashboard
atlas generate "Create a card game in python"
```

All prompts now use real-time streaming automatically - no need for special commands!

### 5. Watch Real-Time Generation
- **Code appears line-by-line** in the editor as it's generated
- **Multiple files get separate tabs** (e.g., `index.html`, `styles.css`, `script.js`)
- **Click any tab** to review content during or after streaming
- **Files persist** after completion for review and editing

## Code Formatting

The streaming generator produces **properly formatted code** with:

### HTML Formatting
- ✅ One element per line with proper indentation
- ✅ Separate blocks for `<head>` and `<body>`
- ✅ Long attributes broken across lines
- ✅ Proper closing tags on their own lines

### CSS Formatting
- ✅ One selector per block
- ✅ Properties on separate lines
- ✅ Curly braces on their own lines
- ✅ Consistent 2-space indentation

### JavaScript/TypeScript Formatting
- ✅ Semicolons and single quotes
- ✅ Trailing commas where valid
- ✅ Imports at top of files
- ✅ Functions separated by blank lines
- ✅ 2-space indentation

### Python Formatting (PEP 8)
- ✅ 4-space indentation
- ✅ Blank lines between top-level functions
- ✅ Proper line length management

## How It Works

When you use streaming mode:

1. **Frontend** sends your prompt + provider/model to `/api/generate`
2. **API Route** calls your backend at `http://localhost:3001/api/llm/generate`
3. **Backend** calls the real AI API (OpenAI, Anthropic, etc.)
4. **AI generates code** based on your prompt
5. **Prettier formats** the code properly
6. **Code is parsed** into multiple files (if applicable)
7. **Files are streamed** line-by-line to the editor

### Example Prompts

```bash
atlas stream "Create a React todo app with add/delete/toggle"
stream "Build a ping pong game with HTML canvas"
atlas stream "Create a Python web scraper"
stream "Design a login form with validation"
atlas stream "Build a Twitter-like feed component"
```

## Troubleshooting

### Error: "Backend server not running"

This means the backend isn't running. Fix:

```bash
cd backend
npm start
```

Verify it's running by visiting: http://localhost:3001/api/llm/providers

### Error: "Provider not configured"

You need to add API keys to `backend/.env.local`:

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your API keys

3. Restart the backend server

### If Nothing Happens
1. **Check backend** - Ensure backend server is running on port 3001
2. **Check streaming mode** - Ensure "⚡ Streaming Mode" is enabled in editor
3. **Check console** - Look for error messages in browser console
4. **Check provider** - Select a provider (OpenAI, Anthropic, etc.) in the UI

### If Files Don't Persist
- Files should remain visible after streaming completion
- Use "New Stream" button to clear and start fresh
- Use "Exit Stream" button to return to regular editor mode

## Technical Details

- **SSE Protocol**: Uses Server-Sent Events for real-time streaming
- **Event Types**: `FILE_OPEN`, `APPEND`, `FILE_CLOSE`, `COMPLETE`, `ERROR`
- **Formatting**: Pre-formatted code with proper indentation and line breaks
- **Language Detection**: Automatic language detection from file extensions
- **Error Handling**: Graceful error handling with user notifications