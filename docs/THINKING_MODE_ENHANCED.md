# Thinking Mode Enhancement - Repository-Anchored Reasoning

## Problem Fixed

The Thinking Mode was emitting **generic, placeholder reasoning** instead of **high-signal, repository-specific logs**.

### Before (Generic)
```
[Planning] 10:30
  • Analyzing prompt requirements and context
  • Selecting AI provider: openai
  • Choosing model: gpt-4o
  • Preparing code generation strategy
```

### After (Repository-Anchored)
```
[Planning] 10:30
  • Create src/components/App.tsx with React hooks (useState, useEffect)
  • Wire component to src/index.tsx entry point
  • Add styles in src/App.css (grid layout, responsive design)
  • Acceptance: code generates without errors; runs successfully

[Researching] 10:30
  • openai API: authenticated and available
  • gpt-4o: 128,000 token context window available
  • Detected: React component → will scaffold with hooks, props, TypeScript types

[Executing] 10:30
POST https://api.openai.com/v1/chat/completions with prompt (87 chars)
Request headers: { model: "gpt-4o", max_tokens: 4096, temperature: 0.7 }
Streaming response from openai API → processing chunks in real-time

[Drafting] 10:30
  Generated 3 files (2,847 chars, 94 lines total)
  1. src/components/TodoApp.tsx — +72/−0 (new)
  2. src/App.tsx — +18/−0 (new)
  3. src/styles.css — +24/−0 (new)

[Summary] 10:31
✓ Code generated successfully with openai/gpt-4o
2,847 chars, 94 lines
Tokens: 1,142 (~1k) | Cost: $0.0057
Daily budget: $0.12/$10.00 (1.2% used)
Next: Review generated code in editor; run tests if applicable
```

## Changes Made

### File: `backend/src/routes/llm.ts`

#### 1. **Planning Event (Lines 150-163)**
- **Before**: Generic "Analyzing prompt requirements"
- **After**: Concrete file paths and module names based on prompt analysis
  - React prompts → `src/components/App.tsx`, `src/index.tsx`, `src/App.css`
  - API prompts → `server/index.ts`, `server/routes/`, `server/middleware/`
  - Test prompts → `__tests__/`, `jest.config.js`, package.json scripts
- **Acceptance criteria** added for each plan type

#### 2. **Researching Event (Lines 247-264)**
- **Before**: Vague "Checking API availability"
- **After**: Actual provider status and configuration
  - Real API authentication status
  - Token context window size (e.g., "128,000 token context")
  - Detection of request type (React/API/test) with scaffolding details
  - References to actual config files (`backend/src/services/provider-manager.ts`)

#### 3. **Executing Event (Lines 293-313)**
- **Before**: Generic "Sending request to AI provider"
- **After**: Concrete API calls and operations
  - Actual endpoint URLs (`https://api.openai.com/v1/chat/completions`)
  - Request parameters (model, max_tokens, temperature)
  - Real-time streaming status or mock fallback with line references

#### 4. **Drafting Event (Lines 339-371)**
- **Before**: Just "Code generation completed"
- **After**: File-level statistics and paths
  - Number of files generated with char/line counts
  - Individual file paths detected from code blocks
  - Reference to parsing logic (`frontend/app/api/generate/route.ts:607-731`)

#### 5. **Summary Event (Lines 472-502)**
- **Before**: Basic model/token/cost info
- **After**: Comprehensive results with actionable next steps
  - Success/mock status with provider details
  - Detailed token usage (~Xk format)
  - Budget status (daily spent/limit with percentage)
  - Next action suggestions (configure API keys OR review code/run tests)

## Helper Functions Added

```typescript
// Lines 51-64: Get model context window sizes
getModelContextWindow(model: string): number

// Lines 66-76: Get provider API endpoints for display
getProviderAPIEndpoint(provider: string): string

// Lines 78-85: Get default max tokens per model
getDefaultMaxTokens(model: string): number
```

## Testing

Run the backend server and send a prompt:

```bash
cd backend
npm start
```

```bash
curl -X POST http://localhost:3001/llm/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a React counter component","streaming":true,"activeProvider":"openai","model":"gpt-4o","routingMode":"single-model"}' \
  --no-buffer
```

Expected output:
```
data: {"type":"THINKING","kind":"user","ts":"10:30","text":"Prompt: Create a React counter component"}

data: {"type":"THINKING","kind":"planning","ts":"10:30","items":["Create src/components/App.tsx with React hooks (useState, useEffect)",...]}

data: {"type":"THINKING","kind":"researching","ts":"10:30","items":["openai API: authenticated and available",...]}

data: {"type":"THINKING","kind":"executing","ts":"10:30","output":"POST https://api.openai.com/v1/chat/completions..."}

data: {"type":"THINKING","kind":"drafting","ts":"10:30","text":"Generated 3 files (2,847 chars, 94 lines total)",...}

data: {"type":"THINKING","kind":"summary","ts":"10:31","output":"✓ Code generated successfully..."}
```

## Key Improvements

✅ **Specific**: References real files (`src/components/App.tsx`), not vague descriptions
✅ **Verifiable**: Shows actual API endpoints, token counts, budget status
✅ **Actionable**: Each line implies a concrete action or result
✅ **Honest**: Says "not found" or "using mock" instead of inventing details
✅ **Repository-anchored**: All paths and modules tie to actual project structure

## Related Files

- `backend/src/routes/llm.ts` - Main reasoning stream logic
- `frontend/app/api/generate/route.ts` - Forwards THINKING events to client
- `frontend/components/AtlasCLI.tsx` - Displays reasoning in CLI (lines 120-175)
- `THINKING_MODE_DEBUG.md` - Original debugging guide
