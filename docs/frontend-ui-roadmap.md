# Frontend UI Modernization Roadmap

## Completed (Phase 1 Milestones)
- Refactored the ToolDrawer into a shadcn-powered vertical rail with hover previews, toggle groups, and tooltips.
- Centralized design tokens and migrated high-visibility primitives (settings, repo picker, buttons) to the shadcn component stack.
- Replaced legacy toasts, context menus, and the command palette with Sonner/shadcn counterparts for consistent interaction patterns.
- Updated Notification Center, FileTree, Theme toggle, and Command surfaces to share the new token bridge.
- Consolidated duplicate component trees into `frontend/components` and removed the legacy `app/components` copies; backend/documentation paths now point to the shared library.
- Extracted a `WorkspaceShell` layout from `frontend/app/page.tsx` so the primary editor, assistant timeline, and utility rail are isolated modules.

## Phase 1 - Layout Foundations
- Remove bespoke utility classes (e.g. `.btn`, panel gradients) now superseded by shadcn to reduce CSS surface area.
- Eliminate the legacy `FileTree` gating once the `Explorer` flag is stable; keep the fallback behind an opt-in flag only.
- Break the `Home` page into feature slices (header, timeline, workspace shell) so streaming logic and state management are easier to maintain.

## Phase 2 - Interaction Enhancements
- Introduce a floating command dock prompt with recent requests and templates, replacing the static header entry.
- Modularize the assistant transcript into card-based surfaces that can be reordered or collapsed across breakpoints; move inline tab definitions into dedicated components.
- Route command palette results through real data sources (tabs, repo tree) instead of static `projectFiles` mocks.
- Add split-view presets (code | preview | diff) with draggable pane resizing to support multi-surface workflows.

## Phase 3 - Intelligent Surfaces
- Implement an activity timeline that captures agent runs, PR events, and checkpoints for replay/branching.
- Create a task queue drawer (inspired by Copilot Workspace Plans) to stage and track multi-step agent workflows.
- Enhance empty states with guided onboarding moments and repo health gauges to highlight product value.
- Make editor footer metrics context-aware (language, encoding, diff stats) and present them as modern status pills.
