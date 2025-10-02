# Tasks — Vibe Coder Builder

This document breaks down actionable tasks to build the Vibe Coder Builder project. Tasks are grouped by phase for clarity.

---

## Phase 0: Foundations (Week 1–2)

- [x] Initialize Next.js frontend with TypeScript
- [x] Add Monaco editor integration
- [x] Implement file tree UI with basic CRUD (create/edit/delete)
- [x] Scaffold orchestrator backend (Node/TypeScript)
- [x] Integrate first LLM provider (GPT-4o as GPT-5 Codex) via API
- [x] Implement basic Plan → Build flow (prompt → code → file)
- [x] Add placeholder sandbox preview panel

---

## Phase 1: Orchestration & Sandbox (Week 3–5)

- [x] Create model registry (JSON/YAML config for providers)
- [x] Add routing modes (manual, heuristic, cost-aware)
- [x] Implement prompt graph executor (Plan → Scaffold → Build → Validate)
- [x] Track token usage and costs per request
- [x] Add budget ceilings and warnings
- [x] Build AI sandbox (Node runner or Docker container)
- [x] Implement logs + error overlays in preview panel

---

## Phase 2: Features & Export (Week 6–8)

- [x] Add Git-backed history with semantic commits
- [x] Create design system foundation (Tailwind, tokens, components)
- [x] Implement checkpoints and rollback
- [x] Integrate Expo CLI for project export
- [x] Enable device preview (QR code via Metro bundler)
- [x] Add multi-model orchestration (Claude for planning, GPT-5 for code, Gemini for UI)
- [x] Generate lint and unit test passes for critical flows
- [x] Add secondary model review step (diff validation)
- [x] Implement Single-Model Mode for orchestrator
- [x] Add project settings with Active Provider selection
- [x] Implement Single-Model Mode logic in routing service
- [x] Add API key validation for selected provider
- [x] Add allowFailover configuration option
- [x] Update telemetry logging for single-model mode
- [x] Update model selector UI with lock indicator
- [x] Update models.yaml schema for single-model support
- [x] Update documentation for Single-Model Mode
- [x] Implement lazy loading for active provider adapter
- [x] Block calls to unselected providers when Single-Model Mode is enabled
- [x] Document Single-Model Mode and failover in README

---

## Single-Model Mode Documentation

### Overview
Single-Model Mode allows projects to use only one AI provider for all operations, providing consistency, cost predictability, and simplified configuration. When enabled, only the selected provider's models are used, and other providers remain disabled.

### Configuration

#### 1. Enable Single-Model Mode
- Set routing mode to "single-model" in the UI
- Select an active provider (OpenAI, Anthropic, Google, xAI, or Supernova)
- Configure failover policy (optional)

#### 2. Active Provider Selection
Available providers:
- **OpenAI**: GPT-4o, GPT-4 (most capable for code generation)
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus (excellent for planning and analysis)
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash (fast and cost-effective)
- **xAI**: Grok models (good for reasoning tasks)
- **Supernova**: Fast and cost-effective options

#### 3. Failover Configuration
- **allowFailover** (default: false)
  - `false`: Never switch providers, return error if active provider unavailable
  - `true`: Allow step-level failover if active provider models are unavailable

### API Key Requirements
Before using Single-Model Mode:
1. Configure API keys for the selected provider in your environment
2. Ensure the provider has available models within budget limits
3. Test provider connectivity using the `/test-provider` endpoint

### Usage Examples

#### Frontend Configuration
```typescript
// Enable single-model mode
setRoutingMode('single-model');
setActiveProvider('anthropic');
setAllowFailover(false);
```

#### API Request
```json
{
  "prompt": "Create a React component...",
  "routingMode": "single-model",
  "activeProvider": "anthropic",
  "allowFailover": false
}
```

### Benefits

#### 1. Consistency
- Same model behavior across all operations
- Predictable output quality and style
- Consistent token usage patterns

#### 2. Cost Control
- Single provider billing
- Easier budget management
- No cross-provider cost surprises

#### 3. Simplified Configuration
- No complex routing rules
- Single point of API key management
- Reduced configuration complexity

### Limitations

#### 1. No Specialization
- Cannot use Claude for planning + GPT for coding
- Single model handles all task types
- May not be optimal for complex workflows

#### 2. Provider Lock-in
- Tied to single provider availability
- No automatic fallback to alternatives
- Requires provider API key configuration

### Best Practices

#### 1. Provider Selection
- **OpenAI GPT-4o**: Best for general code generation
- **Anthropic Claude**: Best for planning and analysis
- **Google Gemini**: Best for fast, cost-effective tasks
- Choose based on your primary use case

#### 2. Failover Policy
- Set `allowFailover: false` for strict single-provider requirements
- Set `allowFailover: true` for reliability with some flexibility
- Monitor usage patterns to ensure provider stability

#### 3. Monitoring
- Track single-provider usage and costs
- Monitor model availability and performance
- Set up alerts for provider issues

### Troubleshooting

#### Common Issues
1. **"Provider does not have valid API keys"**
   - Check environment variables for the selected provider
   - Verify API key format and validity

2. **"No models available for provider"**
   - Check if provider models are within budget limits
   - Verify provider status and availability

3. **"Single-model mode requires activeProvider"**
   - Ensure activeProvider is selected in the UI
   - Check that the provider name matches available options

### Migration from Multi-Model Mode

#### Steps to Enable
1. Select "Single-Model" from routing mode dropdown
2. Choose your preferred provider
3. Configure failover policy
4. Test with a simple prompt
5. Monitor usage and adjust as needed

#### Rollback
- Switch back to "Orchestrated" mode anytime
- All multi-model functionality remains available
- No data loss or configuration conflicts

---
## Phase 3: Enhancements (Stretch Goals)

- [x] Implement Single-Model Mode for orchestrator
- [x] Add Flutter export option
- [x] Build mobile companion app for previews
- [x] Implement temporary shareable preview links (App Clip–like)
- [x] Add local fallback model support (Ollama integration)
- [x] Advanced cost optimization (batching, retries, smarter routing)

---

## Ongoing Tasks

- [ ] Regularly review sandbox safety (block network by default, resource caps)
- [ ] Monitor and adjust model costs vs. budget
- [ ] Update provider adapters as new models are released
- [ ] Maintain developer documentation (README, usage examples)
