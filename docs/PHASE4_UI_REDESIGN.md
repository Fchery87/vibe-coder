## Phase 4: UI Redesign & Advanced Features (Stretch Goals)

### UI Redesign Improvements
- [ ] Apply modern dark theme with gradients, glassmorphism, and floating panels
- [ ] Add smooth transitions for sidebar, tabs, and preview changes
- [ ] Improve typography (Inter/Satoshi for UI, JetBrains Mono for code)
- [ ] Enhance code editor with vibrant syntax colors and Monaco diff editor
- [ ] Update preview panel with custom chrome (URL bar, Run/Reload buttons)
- [ ] Add AI Chat redesign with bubbles, model icons, collapsible diffs
- [ ] Implement command palette (⌘K / Ctrl+K) for quick actions
- [ ] Add toast notifications for build/export status
- [ ] Introduce skeleton loading states instead of plain spinners

### New Components & Features Inspired by Vibecode
- [ ] **Inline Diff/Code Modifications**
  - Integrate Monaco diff editor
  - Show file change summary (+/- counts)
  - Display AI-generated patches inline in chat

- [ ] **Terminal + Status Feedback**
  - Live build log panel with step descriptions
  - Show token usage, cost, elapsed time, and confidence score
  - Color-coded statuses (success, error, info)

- [ ] **Preview Environment with Run Controls**
  - Iframe sandbox with custom chrome (Run, Reload, Share)
  - Display live preview URL with shareable link support

- [ ] **Contextual Code Actions**
  - Allow `@filename` mentions in prompts to target files
  - Right-click menu in file tree for AI actions (Refactor, Add Tests, Explain)

- [ ] **Run Metadata**
  - Show per-run tokens, cost, duration, and model confidence in status bar

- [ ] **Rich Diff Feedback in Chat**
  - Inline rendering of file diffs in AI chat responses
  - Collapsible “show code changes” toggles

- [ ] **Immersive Preview**
  - Enhance preview for interactivity (Expo RN web, Phaser/Three.js if game project)
  - Background grid or framing for better immersion

- [ ] **Model Feedback Loop**
  - Step-by-step run state display (Plan → Scaffold → Build → Validate)
  - Progress indicators with streamed logs

### Differentiators Beyond Vibecode
- [ ] **Multi-model Panel**
  - Side-by-side outputs from Claude, GPT, Gemini for comparison
  - Select preferred output to apply

- [ ] **Checkpoint Timeline**
  - Horizontal timeline to navigate through build snapshots (Plan → Build → Refactor → Preview)

- [ ] **Credits Tracker**
  - Floating widget showing tokens/cost budget and remaining credits

- [ ] **Adaptive Theme**
  - Dark/light mode toggle styled for modern devtools
