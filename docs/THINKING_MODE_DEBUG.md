# Thinking Mode Debugging Guide

## How to Test Thinking Mode

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the web interface**:
   - Navigate to `http://localhost:3000`
   - Switch to the Atlas CLI tab (if not already there)

4. **Send a test prompt**:
   - Type any prompt, e.g., "Create a simple React counter component"
   - Press Enter

## What You Should See

### In Backend Console:
```
[THINKING EVENT] { type: 'THINKING', kind: 'user', ts: '10:30', text: 'Prompt: Create a simple React...' }
[THINKING EVENT] { type: 'THINKING', kind: 'planning', ts: '10:30', items: [...] }
[THINKING EVENT] { type: 'THINKING', kind: 'researching', ts: '10:30', items: [...] }
[THINKING EVENT] { type: 'THINKING', kind: 'executing', ts: '10:30', text: 'Generating code...' }
[THINKING EVENT] { type: 'THINKING', kind: 'drafting', ts: '10:30', text: 'Code generation completed' }
[THINKING EVENT] { type: 'THINKING', kind: 'summary', ts: '10:30', text: 'Code generation completed successfully' }
```

### In Browser Console:
```
[Frontend Proxy] Forwarding THINKING event: { type: 'THINKING', kind: 'user', ... }
[Frontend Proxy] Forwarding THINKING event: { type: 'THINKING', kind: 'planning', ... }
Thinking event: planning { type: 'THINKING', kind: 'planning', ... }
[AtlasCLI] Received thinking event from StreamingEditor: { kind: 'planning', ... }
```

### In Atlas CLI Output:
```
[User] 10:30
  Prompt: Create a simple React counter component

[Planning] 10:30
  • Analyzing prompt requirements and context
  • Selecting AI provider: openai
  • Choosing model: gpt-4o
  • Preparing code generation strategy

[Researching] 10:30
  • Checking API availability and authentication
  • Validating model configuration
  • Preparing request payload
  • Setting up response stream

[Executing] 10:30
  Generating code with openai gpt-4o
  • Sending request to AI provider
  • Processing AI response
  • Formatting generated code

[Drafting] 10:30
  Code generation completed
  Generated 1234 characters

[Summary] 10:30
  Code generation completed successfully
  Model: gpt-4o | Tokens: 456 | Cost: $0.0012
```

## Troubleshooting

### Problem: No thinking events in Atlas CLI

**Check 1: Are events being sent from backend?**
- Look for `[THINKING EVENT]` logs in backend console
- If NO: Backend is not streaming. Check if `streaming: true` is being passed in request

**Check 2: Are events received by frontend proxy?**
- Look for `[Frontend Proxy] Forwarding THINKING event` in browser console
- If NO: Backend might not be sending SSE properly or frontend is not receiving

**Check 3: Are events detected by StreamingEditor?**
- Look for `Thinking event:` logs in browser console
- If NO: StreamingEditor is not parsing the events correctly

**Check 4: Is the global handler registered?**
- Type `typeof window.handleThinkingEvent` in browser console
- Should return `"function"`
- If NO: AtlasCLI component may not have mounted or registered the handler

**Check 5: Is emitToCLI being called?**
- Look for `[AtlasCLI] Received thinking event from StreamingEditor:` in browser console
- If YES but no display: Check if `setCommands` is updating state correctly

### Problem: Backend returns JSON instead of SSE

**Solution**: Make sure the request includes `streaming: true`:
```typescript
// In frontend/app/api/generate/route.ts
body: JSON.stringify({
  prompt,
  model,
  activeProvider: provider,
  routingMode: routingMode || 'single-model',
  streaming: true  // ← This must be present
})
```

### Problem: Events logged but not displayed in CLI

**Possible causes**:
1. ANSI color codes not rendering (expected in browser)
2. Commands not being added to state
3. Scroll position not updating

**Debug**: Add this to browser console:
```javascript
// Check if commands are being added
window.addEventListener('storage', () => {
  console.log('Commands updated');
});
```

## Quick Test Endpoint

You can test the backend directly:

```bash
curl -X POST http://localhost:3001/llm/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","streaming":true,"activeProvider":"openai","model":"gpt-4o","routingMode":"single-model"}' \
  --no-buffer
```

Expected output:
```
data: {"type":"THINKING","kind":"user",...}

data: {"type":"THINKING","kind":"planning",...}

data: {"type":"THINKING","kind":"researching",...}

...
```

## File Changes Summary

1. **Backend** (`backend/src/routes/llm.ts`):
   - Added `emitThinkingEvent()` helper
   - Modified `/generate` to support SSE streaming
   - Emits 5 types of THINKING events during generation

2. **Frontend API Proxy** (`frontend/app/api/generate/route.ts`):
   - Detects SSE responses from backend
   - Forwards THINKING events to client
   - Buffers code for file generation

3. **Streaming Editor** (`frontend/components/StreamingEditor.tsx`):
   - Added THINKING event handler
   - Calls `window.handleThinkingEvent()` for each event

4. **Atlas CLI** (`frontend/components/AtlasCLI.tsx`):
   - Moved `emitToCLI()` to component level
   - Registered global `window.handleThinkingEvent()`
   - Displays thinking events in CLI output
