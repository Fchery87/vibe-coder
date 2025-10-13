# Frontend UI Modernization Roadmap

## Phase 1 – Layout Foundations
- Extract a `WorkspaceShell` layout from `frontend/app/page.tsx` to separate primary editor, assistant timeline, and utility rail.
- Refactor `ToolDrawer` into a persistent vertical rail with icon-only default state, hover previews, and consistent badge visibility.
- Centralize theme tokens (dark/light palettes, typography, spacing) in a shared provider so Monaco and global UI share gradients, depth, and shadows.
- Remove conditional rendering of the legacy `FileTree` once the `Explorer` flag is enabled; keep the legacy component behind a feature flag only.

## Phase 2 – Interaction Enhancements
- Introduce a floating “command dock” prompt area with recent commands and templates, replacing the fixed header prompt block.
- Modularize the assistant transcript into card-based stackable panels and allow repositioning/responsiveness across breakpoints.
- Extract tool tab content from inline `useMemo` definitions to isolated components so state persists across tab switches.
- Add split-view presets (code ⇄ preview ⇄ diff) with draggable pane resizing to improve multi-surface workflows.

## Phase 3 – Intelligent Surfaces
- Implement an activity timeline lane that logs agent runs, PR events, and checkpoints for replay/branching.
- Create a task queue drawer inspired by Copilot Workspace Plans to stage and track multi-step agent workflows.
- Enhance empty states with animated or illustrated onboarding moments and repo health gauges to differentiate the experience.
- Make editor footer metrics context-aware (language, encoding, diff stats) and compress them into modern status pills.
