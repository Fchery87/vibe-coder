# Streaming Code Generation - Local Testing Guide

## How to Test Streaming Locally

### 1. Enable Streaming Mode
- In the Vibe Coder interface, click the **"⚡ Streaming Mode"** toggle in the editor header (next to Editor/Sandbox tabs)

### 2. Start Streaming
- In Atlas CLI, use one of these commands:
  ```bash
  atlas stream "Create a React todo app"
  stream "Build a ping pong game"
  atlas stream "Design a weather dashboard"
  stream "Create a simple card game in python"
  ```

### 3. Watch Real-Time Generation
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

## Mock Generators Available

### React Applications
```
atlas stream "Create a React todo app"
```
Generates: `TodoApp.jsx`, `App.jsx`, `index.jsx`

### Games
```
stream "Build a ping pong game"
```
Generates: `index.html`, `styles.css`, `script.js`

### Python Applications
```
atlas stream "Create a simple card game in python"
```
Generates: `card_game.py`

## Troubleshooting

### If Nothing Happens
1. **Check streaming mode** - Ensure "⚡ Streaming Mode" is enabled in editor
2. **Check console** - Look for error messages in browser console
3. **Verify endpoint** - Ensure `/api/generate` endpoint is accessible

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