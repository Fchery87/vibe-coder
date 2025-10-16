# Frontend Thinking Mode Fixes

## Problems Fixed

### 1. **Duplicate Planning Events**
**Issue**: Frontend AtlasCLI was emitting its own generic planning events that overrode the backend's repository-specific reasoning.

**Root Cause**: Three locations in `AtlasCLI.tsx` were creating duplicate "Planning" events:
- Line 257-271: Auto-emitted when `isGenerating` became true
- Line 344-356: Emitted in `executeCommand` before parsing
- Line 280-291: Emitted summary after generation completed

**Fix**: Removed all three duplicate event emitters. Backend now owns all THINKING events via streaming API.

**Files Changed**:
- `frontend/components/AtlasCLI.tsx:256-262` - Removed planning event when isGenerating
- `frontend/components/AtlasCLI.tsx:344-346` - Removed planning event in executeCommand
- `frontend/components/AtlasCLI.tsx:279-282` - Removed summary event after completion

---

### 2. **Thinking Mode Auto-Disabled**
**Issue**: Thinking mode was being forcibly disabled when the user sent a prompt without the `--think` flag.

**Root Cause**: Line 406 in `parseAndExecuteCommand`:
```typescript
if (hasThinkFlag) {
  setIsThinkMode(true);
} else {
  setIsThinkMode(false);  // ← Auto-disables thinking mode!
}
```

Also, line 289-291 auto-disabled thinking mode 2 seconds after code generation completed.

**Fix**:
1. Removed the `else` clause that auto-disabled thinking mode
2. Removed the setTimeout that disabled it after generation
3. Now thinking mode stays ON/OFF based solely on user's toggle button

**Files Changed**:
- `frontend/components/AtlasCLI.tsx:387-392` - Keep thinking mode state, don't auto-disable
- `frontend/components/AtlasCLI.tsx:277-282` - Removed auto-disable after generation

---

### 3. **ANSI Color Codes in Browser**
**Issue**: ANSI escape codes like `\x1b[35m` were being sent to browser CLI output, making text unreadable.

**Root Cause**: `emitToCLI` function was using terminal ANSI codes for color:
```typescript
const color = colors[kind] || '\x1b[37m';
const reset = '\x1b[0m';
formattedOutput += `${color}[${kindLabel}]${reset} ${timestamp}\n`;
```

**Fix**: Removed ANSI codes, using clean plain text formatting for browser display.

**Files Changed**:
- `frontend/components/AtlasCLI.tsx:131-150` - Removed ANSI codes, use plain text formatting

---

## Changes Summary

### `frontend/components/AtlasCLI.tsx`

#### Line 121-165: `emitToCLI` function
**Before**:
```typescript
const color = colors[kind] || '\x1b[37m';
const reset = '\x1b[0m';
formattedOutput += `${color}[${kindLabel}]${reset} ${timestamp}\n`;
```

**After**:
```typescript
let formattedOutput = `[${kindLabel}] ${timestamp}\n`;
// Clean, readable output with proper multi-line formatting
```

#### Line 256-262: isGenerating useEffect
**Before**:
```typescript
if (isGenerating) {
  setIsThinkMode(true);  // Force enable
  emitToCLI({ kind: 'planning', ... });  // Duplicate event
  addCommand(...);
}
```

**After**:
```typescript
if (isGenerating) {
  // Backend emits all events via streaming - no duplicates
  addCommand('atlas generate "..."', '🤖 Atlas is generating code...', 'info');
}
```

#### Line 277-282: generatedCode useEffect
**Before**:
```typescript
if (generatedCode && !isGenerating) {
  if (isThinkMode) {
    emitToCLI({ kind: 'summary', ... });  // Duplicate
    setTimeout(() => setIsThinkMode(false), 2000);  // Auto-disable
  }
  addCommand(...);
}
```

**After**:
```typescript
if (generatedCode && !isGenerating) {
  // Backend emits summary - no duplicates or auto-disable
  addCommand('atlas generate "..."', `✅ Code generated...`, 'success');
}
```

#### Line 344-346: executeCommand
**Before**:
```typescript
setIsExecuting(true);
if (isThinkMode) {
  emitToCLI({ kind: 'planning', items: ['Parsing command...'] });  // Duplicate
}
await parseAndExecuteCommand(cmd);
```

**After**:
```typescript
setIsExecuting(true);
// Backend emits planning events - no duplicates
await parseAndExecuteCommand(cmd);
```

#### Line 387-392: parseAndExecuteCommand
**Before**:
```typescript
if (hasThinkFlag) {
  setIsThinkMode(true);
} else {
  setIsThinkMode(false);  // Auto-disable!
}
```

**After**:
```typescript
if (hasThinkFlag) {
  setIsThinkMode(true);
}
// Don't auto-disable - let user control via toggle button
```

---

## Testing

1. **Start backend and frontend**:
```bash
cd backend && npm start
cd frontend && npm run dev
```

2. **Enable Thinking Mode** via toggle button (🧠)

3. **Send a prompt**: `"lets build a simple 2d game similar to frogger"`

4. **Expected behavior**:
   - ✅ Thinking mode stays ON during and after generation
   - ✅ Backend emits repository-specific events (file paths, API endpoints, etc.)
   - ✅ No duplicate "Planning" events from frontend
   - ✅ Clean, readable output (no ANSI codes)
   - ✅ All 5 event types shown: Planning, Researching, Executing, Drafting, Summary

5. **Expected output example**:
```
[Planning] 10:30
  • Create src/game/FroggerGame.tsx with game loop (requestAnimationFrame)
  • Add sprites in src/assets/ (frog.png, car.png, log.png)
  • Wire game to src/App.tsx entry point
  • Acceptance: code generates without errors; runs successfully

[Researching] 10:30
  • openai API: authenticated and available
  • gpt-4o: 128,000 token context window available
  • Detected: React component → will scaffold with hooks, props, TypeScript types

[Executing] 10:30
  POST https://api.openai.com/v1/chat/completions with prompt (43 chars)
  Request headers: { model: "gpt-4o", max_tokens: 4096, temperature: 0.7 }
  Streaming response from openai API → processing chunks in real-time

[Drafting] 10:30
  Generated 5 files (4,521 chars, 187 lines total)
  1. src/game/FroggerGame.tsx — detected from code block
  2. src/game/types.ts — detected from code block
  ...

[Summary] 10:31
✓ Code generated successfully with openai/gpt-4o
4,521 chars, 187 lines
Tokens: 1,847 (~2k) | Cost: $0.0092
Daily budget: $0.15/$10.00 (1.5% used)
Next: Review generated code in editor; run tests if applicable
```

---

## Related Files

- `backend/src/routes/llm.ts` - Emits all THINKING events with repository-specific content
- `frontend/app/api/generate/route.ts` - Forwards THINKING events from backend to client
- `frontend/components/StreamingEditor.tsx` - Receives events and calls `window.handleThinkingEvent()`
- `frontend/components/AtlasCLI.tsx` - Displays events (no longer creates duplicates)

---

## Key Improvements

✅ **No more duplicates**: Backend owns all thinking events
✅ **Thinking mode persists**: User controls via toggle, no auto-disable
✅ **Clean formatting**: No ANSI codes, proper multi-line output
✅ **Repository-anchored**: Shows actual file paths, API endpoints, costs, budget
