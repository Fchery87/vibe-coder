# Planning Document — Vibe Coder Builder

## Project Overview
Vibe Coder Builder is a personal-use web app for AI-assisted app generation. It integrates multiple LLM code models (GPT-5 Codex, Claude Code, Gemini, xAI, etc.), supports a live AI sandbox for safe previews, and enables export to frameworks like Expo (React Native) or Flutter. The focus is on experimentation, fast feedback, and secure execution rather than public SaaS deployment.

---

## Objectives
1. Enable natural language → app code flow (Plan → Build → Preview → Export).
2. Support multi-model orchestration (choose or route tasks per model).
3. Provide a secure AI sandbox with hot reload for testing generated apps.
4. Maintain cost control via token usage tracking and budget ceilings.
5. Ensure reproducibility through Git-backed project history and checkpoints.

---

## Key Features
- **Planning**: Generate high-level app plans and scaffolds before coding.
- **Code Assist**: Use GPT-5 Codex, Claude, Gemini, or xAI for code generation, refactoring, or tests.
- **AI Sandbox**: Safe, containerized environment with logs, hot reload, and error overlays.
- **Export**: Generate Expo or Flutter projects for local builds and device previews.
- **Cost Management**: Track token usage per step, with soft/hard limits.
- **History**: Git-backed diffs, semantic commits, and checkpoints for rollback.

---

## Technical Architecture
- **Frontend**: Next.js + Monaco editor + diff viewer + logs/telemetry dashboard.
- **Backend Orchestrator**:
  - Model registry (per provider)
  - Router (manual, heuristic, cost-aware)
  - Prompt graph executor (Plan → Build → Validate)
  - Token/cost telemetry + budget enforcement
- **Sandbox**:
  - Node-based runner (Docker container or VM)
  - Limited CPU/memory, no external network by default
  - Expo Metro integration for device preview
- **Storage**:
  - Git repo for projects
  - SQLite/Postgres for metadata (runs, costs, checkpoints)
- **Secrets**: Local vault for provider keys (encrypted).

---

## Development Phases

### Phase 0: Foundations (Week 1–2)
- Next.js shell app with file tree + Monaco editor
- One LLM provider wired (e.g., GPT-5 Codex)
- Basic Plan → Build flow with preview placeholder

### Phase 1: Orchestration & Sandbox (Week 3–5)
- Implement orchestrator with multi-provider registry
- Add cost telemetry + budget enforcement
- Build AI sandbox with web preview and logs

### Phase 2: Features & Export (Week 6–8)
- Add checkpoint system (Git commits)
- Implement Expo export flow
- Multi-model routing (manual + heuristic modes)
- Add lint/test generation pass

### Phase 3: Enhancements (Stretch Goals)
- Add Flutter export option
- Mobile companion preview app (LAN/QR)
- Advanced shareable preview links
- Local fallback models (Ollama)

---

## Risks & Mitigations
- **Security risks**: Sandbox execution must be tightly isolated; block untrusted network calls.
- **Cost overruns**: Strict budget ceilings and telemetry.
- **Model availability**: Abstract providers to allow switching/fallbacks.
- **Preview fidelity**: Use Expo Metro for device parity.

---

## Success Metrics
- Time to first preview < 2 minutes
- 90% of generated projects compile on first try
- <2 fix cycles average to get working preview
- Cost per feature within personal budget
- Ability to export and run app on device with <10 manual fixes

---

## Next Steps
1. Scaffold the orchestrator backend (registry + routing).
2. Stand up sandbox with safe execution defaults.
3. Implement minimal UI: prompt → code → preview.
4. Layer in cost tracking and Git-based history.
