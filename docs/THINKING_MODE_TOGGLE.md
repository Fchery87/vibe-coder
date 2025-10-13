# Thinking Mode Toggle Feature

## Overview
Added a toggle button and commands to enable/disable the verbose thinking mode in Atlas CLI.

## Features Implemented

### 1. Toggle Button in Header
- **Location**: Top-right of Atlas CLI header
- **Visual States**:
  - **ON**: Purple background, 🧠 brain emoji, "Thinking Mode ON"
  - **OFF**: Gray background, 💭 thought bubble emoji, "Thinking Mode OFF"
- **Functionality**: Click to instantly toggle thinking mode
- **Persistence**: Preference saved to `localStorage` and persists across sessions

### 2. CLI Commands
You can now toggle thinking mode with text commands:
- `think` - Toggle thinking mode
- `thinking` - Toggle thinking mode
- `atlas think` - Toggle thinking mode
- `atlas thinking` - Toggle thinking mode
- `atlas thinking-mode` - Toggle thinking mode

### 3. Default Behavior
- **Thinking mode is ON by default** - Shows detailed reasoning logs
- **Preference is saved** - Your choice persists when you reload the page
- **Console logging** - When OFF, events are logged to console but not displayed

## How It Works

### When Thinking Mode is ON (🧠):
```
[User] 10:30
  Prompt: Create a React counter component

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

### When Thinking Mode is OFF (💭):
```
🚀 Generating code with real-time streaming...
✅ Code generated successfully (1234 characters)
```

**Note**: Thinking events are still sent from backend and logged to browser console, but not displayed in CLI output.

## Usage Examples

### Using the Button
1. Look at the top-right corner of Atlas CLI
2. Click the "🧠 Thinking Mode ON/OFF" button
3. See confirmation message in CLI

### Using Commands
```bash
# Toggle thinking mode
$ think
✅ Thinking mode enabled - You will see detailed reasoning logs during code generation

# Toggle again
$ thinking
🔕 Thinking mode disabled - Only showing final results

# Also works with atlas prefix
$ atlas thinking-mode
✅ Thinking mode enabled - You will see detailed reasoning logs during code generation
```

## Technical Implementation

### State Management
```typescript
const [isThinkMode, setIsThinkMode] = useState(() => {
  // Load from localStorage, default to true
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('atlasThinkingMode');
    return saved ? JSON.parse(saved) : true;
  }
  return true;
});
```

### Toggle Function
```typescript
const toggleThinkingMode = () => {
  const newMode = !isThinkMode;
  setIsThinkMode(newMode);
  localStorage.setItem('atlasThinkingMode', JSON.stringify(newMode));

  addCommand(
    'atlas thinking-mode',
    newMode
      ? '✅ Thinking mode enabled - You will see detailed reasoning logs'
      : '🔕 Thinking mode disabled - Only showing final results',
    'info'
  );
};
```

### Conditional Rendering
```typescript
const emitToCLI = ({ kind, ts, items, text, output }: ThinkEvent) => {
  // Skip if thinking mode is disabled
  if (!isThinkMode) {
    console.log(`[Thinking Mode OFF] Skipping ${kind} event`);
    return;
  }

  // ... rest of the formatting logic
};
```

## Benefits

### For Power Users:
- **See everything**: Understand AI decision-making process
- **Debug issues**: Track which provider/model is used
- **Monitor costs**: See token usage and costs in real-time
- **Learn patterns**: Understand how the AI approaches different tasks

### For Regular Users:
- **Less clutter**: Clean, simple output
- **Faster scanning**: Just see the results
- **Focus on code**: No distraction from reasoning logs

## Files Modified

1. **`frontend/app/components/AtlasCLI.tsx`**:
   - Added `toggleThinkingMode()` function
   - Modified `isThinkMode` state to use localStorage
   - Updated `emitToCLI()` to check thinking mode before rendering
   - Added toggle button to header
   - Added CLI commands: `think`, `thinking`, `atlas thinking-mode`
   - Updated help text and commands list

## Testing

### Test Toggle Button:
1. Open Atlas CLI in browser
2. Look for "🧠 Thinking Mode ON" button in header
3. Click it → Should change to "💭 Thinking Mode OFF"
4. Click again → Should change back to "🧠 Thinking Mode ON"
5. Reload page → Preference should persist

### Test CLI Commands:
```bash
$ think
✅ Thinking mode enabled

$ thinking
🔕 Thinking mode disabled

$ atlas thinking-mode
✅ Thinking mode enabled
```

### Test with Code Generation:
1. Enable thinking mode
2. Generate code: "Create a simple counter"
3. Watch for detailed reasoning logs
4. Disable thinking mode
5. Generate code again: "Create a todo list"
6. Should only see "Generating..." and "Complete" messages

## Future Enhancements

Potential improvements:
- **Verbosity levels**: Minimal, Normal, Detailed, Verbose
- **Event filtering**: Show only specific event types (e.g., only Errors)
- **Export logs**: Download thinking logs as JSON/TXT
- **Collapsible events**: Click to expand/collapse each thinking block
- **Keyboard shortcut**: `Ctrl+T` to toggle thinking mode
- **Stats view**: Summary of all thinking events with timing info
