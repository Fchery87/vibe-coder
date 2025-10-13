# Sidebar Tools Implementation Roadmap

## Overview

This document outlines the phased implementation of Cosine/Atlas-style sidebar tools for Vibe Coder. Each tool will be **feature-flagged**, **gracefully degrade**, and integrate seamlessly with existing Phase 1 & Phase 2 features without breaking current functionality.

**Architecture**:
- GitHub OAuth for identity + GitHub App installation tokens for repo access
- Optional Jira/Linear for Tickets
- WebSocket/SSE for live logs and events
- Atlas/Cosine-style dark theme with Lucide icons
- All tools behind feature flags with read-only empty states on failure

---

## Safety Principles

### Non-Breaking Integration Rules
1. ✅ **Feature Flags**: One flag per tool (e.g., `enableExplorer`, `enableSourceControl`, `enablePR`)
2. ✅ **Error Boundaries**: Every drawer panel catches errors and shows muted message (no crashes)
3. ✅ **Graceful Degradation**: If config/permissions missing → show "Connect" CTA, not errors
4. ✅ **Permissions**: GitHub App installation tokens only; minimum scopes
5. ✅ **Rate Limits**: Cache tree/diff responses; back off on search/compare API
6. ✅ **Webhooks**: Verify signature; push updates via event bus; app works without webhooks (manual refresh)
7. ✅ **No Regressions**: Never block editor, CLI, or existing Phase 1/2 features

### Integration with Existing Features
- **Phase 1**: Works alongside Multi-File Tabs, Command Palette, Diff Viewer, Notification Center
- **Phase 2**: Complements Virtual File Tree, Skeleton States, Micro-interactions
- **Current File Tree**: Will be enhanced/replaced by Explorer tool (gradual migration)
- **Current Editor**: Enhanced with Source Control panel, PR integration
- **Current Notifications**: Will receive events from Workflows, PRs, Tickets

---

## Phase Breakdown

### Phase 0: Foundation & Feature Flags (Week 1)

**Goal**: Set up infrastructure without changing UI

#### 0.1 Feature Flag System
**Files to Create**:
- `frontend/lib/feature-flags.ts` - Feature flag provider
- `frontend/hooks/useFeatureFlag.ts` - Hook for checking flags
- `frontend/components/FeatureFlagProvider.tsx` - Context provider

**Implementation**:
```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  enableExplorer: false,
  enableSourceControl: false,
  enablePR: false,
  enableSearch: false,
  enablePreview: false,
  enableTickets: false,
  enableWorkflows: false,
} as const;

// Stored in localStorage, overridable in Settings
```

**Acceptance**:
- [ ] Feature flags toggle in localStorage
- [ ] `useFeatureFlag('enableExplorer')` hook works
- [ ] No UI changes yet

#### 0.2 GitHub App Infrastructure
**Files to Create**:
- `frontend/lib/github-app.ts` - GitHub App client utilities
- `frontend/app/api/github/installation/route.ts` - Installation token management
- `.env.example` update with new vars

**Environment Variables**:
```bash
# GitHub App (add to .env.example)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# Optional: Jira/Linear
JIRA_SITE_URL=
JIRA_API_TOKEN=
LINEAR_API_KEY=
```

**Acceptance**:
- [ ] GitHub App installation token retrieval works
- [ ] Octokit client initialized with installation token
- [ ] No existing features broken

#### 0.3 ToolDrawer Component Shell
**Files to Create**:
- `frontend/components/ToolDrawer.tsx` - Collapsible sidebar drawer
- `frontend/components/ToolDrawerPanel.tsx` - Individual tool panel wrapper with error boundary

**Design**:
- Dark theme matching existing `globals.css`
- Lucide icons only (no emojis)
- Collapsible sections with smooth animations (using Phase 2 micro-interactions)
- Empty state component for each tool

**Acceptance**:
- [ ] ToolDrawer renders but shows empty state
- [ ] No visual regressions in existing sidebar/file tree
- [ ] Error boundary catches and displays errors gracefully

---

### Phase 1: Explorer Tool (Week 2)

**Goal**: Replace/enhance existing FileTree with GitHub-powered Explorer

#### 1.1 Backend - File Tree API
**Files to Create**:
- `frontend/app/api/github/files/route.ts` - GET tree endpoint

**Endpoint**:
```typescript
GET /api/github/files?owner={owner}&repo={repo}&branch={branch}
Response: { tree: FileNode[], sha: string }
```

**Implementation**:
- Uses `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`
- Caches response for 5 minutes
- Returns error boundary data if fails

**Acceptance**:
- [ ] API returns recursive tree structure
- [ ] Caching works (5min TTL)
- [ ] Errors return 200 with `{ error: true, message: '...' }` (no 500s)

#### 1.2 Frontend - Explorer Panel
**Files to Create/Modify**:
- `frontend/components/tools/Explorer.tsx` - New Explorer tool
- `frontend/app/page.tsx` - Integrate Explorer (feature-flagged)

**Features**:
- Tree view with folders/files (reuse VirtualFileTree logic from Phase 2)
- Search/filter by path (client-side)
- Click to open file in tab (integrates with Phase 1 Multi-File Tabs)
- Badge shows file count
- Uses `FileTreeSkeleton` while loading (Phase 2)

**Integration**:
```typescript
// In page.tsx
{featureFlags.enableExplorer ? (
  <Explorer
    owner={selectedRepo?.owner}
    repo={selectedRepo?.name}
    branch={currentBranch}
    onFileSelect={openTab} // Reuse from Phase 1
  />
) : (
  <FileTree {...existingProps} /> // Fallback to current FileTree
)}
```

**Acceptance**:
- [ ] Explorer shows GitHub files when flag enabled
- [ ] Falls back to existing FileTree when disabled
- [ ] Clicking file opens in tab (Phase 1 integration)
- [ ] Search filters files instantly
- [ ] No breaking changes to existing file selection

#### 1.3 Create File/Folder (Optional)
**Files to Create**:
- `frontend/app/api/github/contents/route.ts` - PUT/DELETE contents

**Features**:
- Right-click context menu: "New File", "New Folder"
- Creates via Contents API when branch is writable
- Shows error if read-only repo

**Acceptance**:
- [ ] Can create file/folder on writable branch
- [ ] Disabled on read-only repos (shows tooltip)
- [ ] Tree refreshes after creation

---

### Phase 2: Source Control Tool (Week 3)

**Goal**: Git operations in the sidebar (stage, commit, branch)

#### 2.1 Backend - Git Operations
**Files to Create**:
- `frontend/app/api/github/branch/route.ts` - GET/POST branches
- `frontend/app/api/github/commit/route.ts` - PUT commit (Contents API)
- `frontend/lib/git-diff.ts` - Compute changed files from tabs

**Endpoints**:
```typescript
GET /api/github/branch?owner=...&repo=... // List branches
POST /api/github/branch { baseBranch, newBranch } // Create branch

PUT /api/github/commit {
  owner, repo, branch, path, content, message, sha
}
```

**Implementation**:
- Compare active tab content with GitHub source to detect changes
- Compute add/delete counts per file
- Create commits via Contents API

**Acceptance**:
- [ ] Can list branches
- [ ] Can create feature branch from base
- [ ] Can commit file changes with message
- [ ] Errors handled gracefully

#### 2.2 Frontend - Source Control Panel
**Files to Create**:
- `frontend/components/tools/SourceControl.tsx` - Source control UI
- `frontend/hooks/useGitStatus.ts` - Track changed files

**Features**:
- Changed files list with +/- counts
- Status filters (modified, added, deleted)
- Commit message builder (with conventional commits helper)
- Branch switcher/creator
- Integrates with Phase 1 Tabs (detects dirty state)

**UI Elements**:
- File list shows which tabs have changes
- Stage/unstage actions (client-side only, commits all on submit)
- Commit button triggers notification (Phase 1 Notification Center)

**Acceptance**:
- [ ] Shows changed files from open tabs
- [ ] Can write commit message
- [ ] Can create branch and commit
- [ ] If read-only repo, shows "Review only" mode
- [ ] Commit success triggers notification

---

### Phase 3: Pull Request Tool (Week 4)

**Goal**: Create and manage PRs from the app

#### 3.1 Backend - PR Operations
**Files to Create**:
- `frontend/app/api/github/pr/route.ts` - POST create PR, GET list PRs
- `frontend/app/api/github/pr/[number]/route.ts` - GET single PR details
- `frontend/app/api/github/checks/route.ts` - GET PR checks/status

**Endpoints**:
```typescript
POST /api/github/pr {
  owner, repo, head, base, title, body
} // Create PR

GET /api/github/prs?owner=...&repo=...&state=open // List PRs

GET /api/github/pr/[number]?owner=...&repo=... // PR details + checks
```

**Implementation**:
- Create PR from current branch
- Fetch PR checks and status (for Workflows integration)
- Return `head_sha` for anchored review comments

**Acceptance**:
- [ ] Can create PR with title/body
- [ ] Lists open PRs
- [ ] Shows PR status checks
- [ ] Returns head_sha correctly

#### 3.2 Frontend - PR Panel & Review Comments
**Files to Create**:
- `frontend/components/tools/PullRequest.tsx` - PR management UI
- `frontend/components/ReviewComment.tsx` - Anchored inline comments
- `frontend/app/api/github/pr/[number]/comments/route.ts` - Review comments API

**Features**:
- PR list with status badges
- Create PR button (uses Source Control branch)
- PR details view (description, checks, comments)
- Inline review comments in DiffViewer (Phase 1 enhancement)
- Comment on specific line with `commit_id=head_sha, path, line, side=RIGHT`

**Integration with Phase 1**:
- Enhance DiffViewer to show review comments
- Comments trigger notifications
- PR status shows in header bar

**Acceptance**:
- [ ] Can create PR from current branch
- [ ] PR list shows in drawer
- [ ] Can add review comment on specific line
- [ ] Comments appear in DiffViewer (Phase 1)
- [ ] PR checks/status visible
- [ ] If branch not created, shows "Create branch first" guidance

---

### Phase 4: Search Tool (Week 5)

**Goal**: Code search across repo

#### 4.1 Backend - Search API
**Files to Create**:
- `frontend/app/api/github/search/route.ts` - GitHub Code Search proxy

**Endpoint**:
```typescript
GET /api/github/search?q=...&repo=owner/repo&type=code
```

**Implementation**:
- Uses `GET /search/code?q=... repo:owner/repo`
- Rate limit handling (max 10 req/min for code search)
- Caches results for 2 minutes
- Fallback to filename search if permissions missing

**Acceptance**:
- [ ] Search returns code results
- [ ] Respects rate limits (shows warning)
- [ ] Falls back to filename search on permission error
- [ ] Cache reduces API calls

#### 4.2 Frontend - Search Panel
**Files to Create**:
- `frontend/components/tools/Search.tsx` - Search UI

**Features**:
- Query input with filters (filename, path, extension)
- Results list with preview snippet
- Click result → opens in tab (Phase 1) or focuses in Diff (Phase 1)
- Optional: client-side ripgrep WASM for demo mode

**Integration**:
- Uses Command Palette search pattern (Phase 1)
- Opens files via Multi-File Tabs (Phase 1)
- Shows skeleton while searching (Phase 2)

**Acceptance**:
- [ ] Search query works across repo
- [ ] Filters work (filename, extension)
- [ ] Results open in tabs
- [ ] If insufficient permissions, shows filename-only search
- [ ] No errors when API unavailable

---

### Phase 5: Preview Tool (Week 6)

**Goal**: Live sandbox preview in sidebar/center panel

#### 5.1 Backend - Preview Integration
**Files to Modify**:
- Use existing `NEXT_PUBLIC_WS_URL` and sandbox endpoints
- No new backend needed (already exists)

#### 5.2 Frontend - Preview Panel
**Files to Create**:
- `frontend/components/tools/Preview.tsx` - Device frame with iframe
- `frontend/components/PreviewControls.tsx` - Reload, share, device selector

**Features**:
- Center panel tabs: **Source | Preview | Logs** (new tab layout)
- Device frame with address bar
- Reload button
- Share button (generates preview URL)
- Logs/Errors/Perf tabs (uses existing sandbox WebSocket)

**Integration**:
- Reuses existing PreviewPanel logic
- Adds device frames (mobile, tablet, desktop)
- Streams logs via existing WebSocket/SSE

**Acceptance**:
- [ ] Preview iframe loads sandbox URL
- [ ] Reload button works
- [ ] Device frame switches (mobile/tablet/desktop)
- [ ] Logs stream in real-time
- [ ] If sandbox offline, shows empty state guidance
- [ ] Doesn't block other panels

---

### Phase 6: Tickets Tool (Week 7)

**Goal**: Jira/Linear integration for task management

#### 6.1 Backend - Jira/Linear API
**Files to Create**:
- `frontend/app/api/jira/issue/route.ts` - Create/list issues
- `frontend/app/api/jira/comment/route.ts` - Add/view comments
- `frontend/lib/jira-client.ts` - Jira REST client
- `frontend/lib/linear-client.ts` - Linear GraphQL client (optional)

**Endpoints**:
```typescript
POST /api/jira/issue { summary, description, projectKey }
GET /api/jira/issue/[key] // Issue details
POST /api/jira/comment { issueKey, body }

// Store PR <-> Issue mapping
POST /api/jira/link { prNumber, issueKey }
```

**Implementation**:
- Jira: `/rest/api/3/issue`, `/comment`; JQL search
- Linear: GraphQL API (if preferred)
- Map PR number to issue key in metadata

**Acceptance**:
- [ ] Can create Jira issue
- [ ] Can view/add comments
- [ ] Issue linked to PR (shows in PR panel)
- [ ] Errors show "Connect Jira" CTA

#### 6.2 Frontend - Tickets Panel
**Files to Create**:
- `frontend/components/tools/Tickets.tsx` - Tickets UI
- `frontend/components/TicketCard.tsx` - Issue display card

**Features**:
- Project/issue picker (autocomplete)
- Create ticket form (links to current PR)
- Comments thread
- Status transitions (To Do → In Progress → Done)
- Assignee selector

**Integration**:
- Links from PR panel to ticket
- Ticket updates trigger notifications (Phase 1)
- Settings panel has Jira connection config

**Acceptance**:
- [ ] Can create ticket linked to PR
- [ ] Can view/add comments
- [ ] Status changes reflect immediately
- [ ] If Jira not connected, shows setup CTA
- [ ] No impact on other tools

---

### Phase 7: Workflows Tool (Week 8)

**Goal**: Trigger and monitor GitHub Actions workflows

#### 7.1 Backend - GitHub Actions API
**Files to Create**:
- `frontend/app/api/github/workflows/route.ts` - List workflows
- `frontend/app/api/github/workflows/[id]/dispatch/route.ts` - Trigger workflow
- `frontend/app/api/github/runs/route.ts` - List workflow runs

**Endpoints**:
```typescript
GET /api/github/workflows?owner=...&repo=... // List workflows
POST /api/github/workflows/[id]/dispatch { ref, inputs } // Trigger
GET /api/github/runs?owner=...&repo=...&workflow_id=... // Run history
```

**Implementation**:
- Uses `GET /repos/{owner}/{repo}/actions/workflows`
- Dispatch: `POST /repos/{owner}/{repo}/actions/workflows/{id}/dispatches`
- Maps run outcomes to PR checks

**Acceptance**:
- [ ] Lists available workflows
- [ ] Can trigger workflow with inputs
- [ ] Shows run status (queued, in_progress, completed)
- [ ] Fetches logs for failed runs
- [ ] If Actions disabled, shows info state

#### 7.2 Frontend - Workflows Panel
**Files to Create**:
- `frontend/components/tools/Workflows.tsx` - Workflows UI
- `frontend/components/WorkflowRunCard.tsx` - Run status display

**Features**:
- Workflow list with trigger buttons
- Input form for workflow dispatch
- Run history table (status, duration, conclusion)
- Live status updates (via webhooks or polling)
- Links to PR checks

**Integration**:
- PR panel shows workflow status
- Workflow completion triggers notification (Phase 1)
- Autonomous Log entries for agent tasks

**Acceptance**:
- [ ] Can trigger test/build/deploy workflows
- [ ] Run status updates in real-time
- [ ] Failed runs show error logs
- [ ] Workflow outcomes appear in PR checks
- [ ] No triggers if Actions not enabled

---

### Phase 8: Settings & Webhooks (Week 9)

**Goal**: Central configuration and real-time updates

#### 8.1 Settings Panel Enhancement
**Files to Modify**:
- `frontend/components/SettingsModal.tsx` - Add new sections

**New Settings Sections**:
1. **GitHub Integration**
   - Repository selector
   - Branch selector
   - Installation status
   - Webhook status

2. **Service Connections**
   - Jira site URL and auth (server-side only)
   - Linear API key (server-side only)

3. **Feature Flags**
   - Toggle each tool (Explorer, Source Control, PR, etc.)
   - Instantly shows/hides tools

4. **UI Preferences**
   - Auto-refresh interval (for manual mode when webhooks unavailable)
   - Notification preferences

**Acceptance**:
- [ ] All settings organized by category
- [ ] Feature flags toggle tools immediately
- [ ] No sensitive data in localStorage
- [ ] Server-side secrets in env only

#### 8.2 Webhook Receiver
**Files to Create**:
- `frontend/app/api/github/webhook/route.ts` - POST webhook endpoint
- `frontend/lib/webhook-events.ts` - Event bus for client updates

**Implementation**:
```typescript
POST /api/github/webhook
- Verify signature (GITHUB_WEBHOOK_SECRET)
- Parse event type (push, pull_request, check_run, etc.)
- Broadcast to connected clients via WebSocket/SSE
```

**Events to Handle**:
- `push` → Refresh Explorer tree
- `pull_request` → Update PR panel
- `check_run` → Update Workflows status
- `issues` → Update Tickets (if GitHub Issues used)

**Client Event Bus**:
```typescript
// lib/webhook-events.ts
export const webhookEventBus = new EventEmitter();

webhookEventBus.on('github:push', ({ branch }) => {
  if (branch === currentBranch) refreshExplorer();
});

webhookEventBus.on('github:pull_request', ({ number, action }) => {
  refreshPRPanel();
  addNotification(`PR #${number} ${action}`);
});
```

**Acceptance**:
- [ ] Webhook signature verified
- [ ] Events broadcast to clients
- [ ] PR updates appear instantly
- [ ] If webhooks not configured, manual refresh still works
- [ ] No crashes if webhook fails

#### 8.3 Manual Refresh Fallback
**Files to Create**:
- `frontend/hooks/useAutoRefresh.ts` - Polling hook when webhooks unavailable

**Implementation**:
```typescript
// Polls API every N seconds if webhooks disabled
useAutoRefresh({
  enabled: !webhooksConnected,
  interval: settings.refreshInterval || 30000,
  onRefresh: () => {
    refreshExplorer();
    refreshPRs();
    // ... other tools
  }
});
```

**Acceptance**:
- [ ] Auto-refresh works when webhooks unavailable
- [ ] Interval configurable in Settings
- [ ] Stops polling when webhooks connected

---

### Phase 9: Polish & Testing (Week 10)

**Goal**: Final integration, testing, and documentation

#### 9.1 Integration Testing
**Test Cases**:
1. **Explorer → Tabs**: Open file → creates tab (Phase 1)
2. **Source Control → PR**: Commit → Create PR → Shows in PR panel
3. **Search → Tabs**: Search result → Opens in tab
4. **PR → Diff**: PR comment → Shows in DiffViewer (Phase 1)
5. **Workflows → Notifications**: Workflow completes → Notification appears (Phase 1)
6. **Tickets → PR**: Create ticket → Links to PR

#### 9.2 Error Scenario Testing
**Scenarios**:
1. GitHub App not installed → Shows "Install App" CTA
2. Insufficient permissions → Read-only mode
3. Jira not connected → "Connect Jira" CTA in Tickets
4. Actions disabled → Workflows shows info state
5. Rate limit hit → Shows warning, uses cache
6. Webhook fails → Falls back to polling
7. Feature flag disabled → Tool hidden entirely

#### 9.3 Performance Testing
**Metrics**:
- [ ] Explorer tree loads in <500ms for 1000+ files
- [ ] Search returns results in <1s
- [ ] PR creation takes <2s
- [ ] Webhook events appear in <200ms
- [ ] No memory leaks after 100+ operations
- [ ] All animations 60fps (Phase 2 micro-interactions)

#### 9.4 Documentation
**Files to Create/Update**:
- `SIDEBAR_SETUP.md` - Setup guide for GitHub App, Jira, webhooks
- `SIDEBAR_USAGE.md` - User guide for each tool
- `.env.example` - All new environment variables
- `README.md` - Update with sidebar features

**Acceptance**:
- [ ] Setup guide complete with screenshots
- [ ] Each tool documented with examples
- [ ] Environment variables explained
- [ ] Troubleshooting section

---

## Implementation Checklist

### Phase 0: Foundation ✅
- [ ] Feature flag system
- [ ] GitHub App infrastructure
- [ ] ToolDrawer shell component
- [ ] Error boundaries

### Phase 1: Explorer ✅
- [ ] File tree API
- [ ] Explorer panel UI
- [ ] Search/filter
- [ ] Create file/folder (optional)

### Phase 2: Source Control ✅
- [ ] Branch operations API
- [ ] Commit API
- [ ] Source Control panel
- [ ] Changed files tracking

### Phase 3: Pull Requests ✅
- [ ] PR creation API
- [ ] PR list/details API
- [ ] Review comments
- [ ] PR panel UI

### Phase 4: Search ✅
- [ ] Code search API
- [ ] Search panel UI
- [ ] Filters and results
- [ ] Fallback to filename search

### Phase 5: Preview ✅
- [ ] Preview panel UI
- [ ] Device frames
- [ ] Logs integration
- [ ] Share functionality

### Phase 6: Tickets ✅
- [ ] Jira/Linear API
- [ ] Tickets panel UI
- [ ] PR linking
- [ ] Comments thread

### Phase 7: Workflows ✅
- [ ] GitHub Actions API
- [ ] Workflows panel UI
- [ ] Run history
- [ ] Trigger dispatch

### Phase 8: Settings & Webhooks ✅
- [ ] Settings panel updates
- [ ] Webhook receiver
- [ ] Event bus
- [ ] Auto-refresh fallback

### Phase 9: Polish ✅
- [ ] Integration testing
- [ ] Error scenario testing
- [ ] Performance testing
- [ ] Documentation

---

## Success Criteria

### Functionality
- ✅ All 7 tools functional behind feature flags
- ✅ GitHub App installation works end-to-end
- ✅ PR creation with review comments
- ✅ Webhooks update UI in real-time
- ✅ Manual refresh fallback works

### Safety
- ✅ No regressions in Phase 1/2 features
- ✅ All tools degrade gracefully on error
- ✅ Feature flags hide tools instantly
- ✅ Empty states for missing config/permissions
- ✅ Error boundaries catch all failures

### Performance
- ✅ Explorer <500ms for 1000+ files
- ✅ Search <1s response time
- ✅ Webhook events <200ms latency
- ✅ 60fps animations
- ✅ No memory leaks

### Integration
- ✅ Works with Multi-File Tabs (Phase 1)
- ✅ Works with Command Palette (Phase 1)
- ✅ Works with Diff Viewer (Phase 1)
- ✅ Works with Notifications (Phase 1)
- ✅ Works with Virtual Scrolling (Phase 2)
- ✅ Works with Skeletons (Phase 2)
- ✅ Works with Micro-interactions (Phase 2)

---

## LLM Implementation Brief (Copy-Paste)

```
Integrate Cosine-style sidebar tools into my existing Next.js Vibe Coder app without breaking current functionality. Do not rebuild; augment in place. All tools must be feature-flagged and degrade gracefully (show read-only empty states if config/permissions are missing).

Current app has:
- Phase 1: Multi-File Tabs, Command Palette (Ctrl+K), Diff Viewer, Notification Center
- Phase 2: Virtual File Tree, Skeleton Loading States, Micro-interactions

Tools to implement (each with routes, UI, and safety):

1. Explorer
   - UI: ToolDrawer "Files" panel; searchable tree; click to open
   - Route: GET /api/github/files?branch=… returns recursive tree via installation token
   - Acceptance: tree loads; filtering works; clicking opens in existing tab system

2. PR
   - UI: ToolDrawer "PR" panel + editor header PR button; list PRs, create, show status
   - Routes: POST /api/github/pr (create), GET /api/github/prs (list), GET checks for head_sha
   - Acceptance: can open PR; head_sha returned and used for anchored review comments in existing DiffViewer

3. Source Control
   - UI: ToolDrawer "Source Control"; changed files list; commit message; branch controls
   - Routes: POST /api/github/branch (create branch); PUT /api/github/commit (create/update contents)
   - Acceptance: can create feature branch and commit changes; integrates with existing tab dirty states

4. Search
   - UI: ToolDrawer "Search"; query + filters; results open file/diff
   - Route: GET /api/github/search?q=… repo=…; fallback to filename search client-side if not permitted
   - Acceptance: results populate; open in existing tab system

5. Preview
   - UI: Center tabs (Source | Preview | Logs); device frame with address bar; reload; share
   - Integration: Use existing sandbox; live logs via WebSocket/SSE
   - Acceptance: iframe shows URL; reload works; logs stream

6. Tickets
   - UI: ToolDrawer "Tickets"; list/create; link to PR; comments
   - Routes: POST /api/jira/issue; GET/POST /api/jira/comment; store mapping of PR <-> issue
   - Acceptance: can create issue, view/add comments; notifications via existing system

7. Workflows
   - UI: ToolDrawer "Workflows"; trigger buttons + run table; status badges
   - Routes: GET workflows, GET runs, POST dispatch. Map runs to PR checks
   - Acceptance: trigger a workflow; status updates appear; notifications via existing system

8. Settings
   - UI: ToolDrawer "Settings"; provider/model dropdowns; service connections; feature flags per tool
   - Persistence: localStorage for UI prefs; server-side env for secrets
   - Acceptance: toggling flags immediately shows/hides tools; no runtime errors

General constraints:
- Use GitHub OAuth for identity; GitHub App installation tokens for repo operations
- Implement webhook receiver and signature verification; stream updates via WebSocket/SSE when available; otherwise manual refresh
- Keep styling consistent (Lucide icons, dark theme from existing globals.css); avoid emojis; use chips, badges, and subtle transitions from Phase 2
- Document new env vars in .env.example; include README updates

Safety and non-breaking behavior:
- If any route fails (401/403/404), show a muted empty state with a "Connect" CTA—do not throw
- If feature flags are off, hide tools entirely
- If permissions are missing (e.g., private repo not installed), show "Install App" prompt
- Never block the editor, CLI, or existing Phase 1/2 features; tools are optional panels
- All error boundaries in place

Acceptance checklist:
- All tools render with no errors when disabled or misconfigured
- Enabling GitHub and selecting a repo unlocks Explorer, Source Control, PR, Search
- Anchored review comments use commit_id=head_sha, path, line, side=RIGHT in existing DiffViewer
- Webhooks update PR state and comments; if webhooks are absent, the app still functions (manual refresh)
- No regressions in existing streaming/editor/CLI/tab/notification behaviors
```

---

## Notes

**Existing Features to Preserve**:
- ✅ Multi-File Tabs (TabBar.tsx, useTabs.ts)
- ✅ Command Palette (CommandPalette.tsx with cmdk)
- ✅ Diff Viewer (DiffViewer.tsx with react-diff-view)
- ✅ Notification Center (NotificationCenter.tsx, useNotifications.ts)
- ✅ Virtual File Tree (VirtualFileTree.tsx)
- ✅ Skeleton States (Skeleton.tsx)
- ✅ Micro-interactions (globals.css animations)

**Migration Strategy**:
- Explorer will **gradually replace** FileTree.tsx (feature flag controls which shows)
- Preview will **enhance** existing PreviewPanel.tsx (adds device frames)
- All new tools use existing notification system, tab system, diff viewer
- No breaking changes to page.tsx structure

**Timeline**: 10 weeks for complete implementation
**Risk Level**: Low (feature flags + error boundaries + graceful degradation)
**Team Size**: 1-2 developers
