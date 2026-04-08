# OAT Dashboard — Design Spec

## Overview

A project-aware control plane and web dashboard for managing OAT workflows across repos, worktrees, and agent sessions. Dispatches skills to agent CLIs (Claude Code, Codex) running in Zellij terminal panes, with smart defaults and context-aware recommendations.

### Core differentiator

Existing tools (Superset, Broomy, Agentastic, emdash) are agent-session-centric — they help you run agents in parallel. The OAT dashboard is **workflow-phase-centric** — it understands the OAT project lifecycle (discovery → [spec] → design → plan → implement), knows where you are, tells you what's next, and dispatches the right skill with the right arguments. It also works over SSH (web dashboard + Zellij), unlike all surveyed alternatives.

### Reference projects surveyed

- **Broomy** (Electron) — terminal activity detection via output timing, persisted vs runtime state partitioning
- **Superset** (Electron) — worktree-per-task model, dispatch UX patterns (isolation dropdown, branch picker, collapsible advanced options)
- **Agentastic** (native macOS/Swift) — Ghostty embedding, kanban worktree organization
- **emdash** (Electron) — worktree pool pre-creation, skills/MCP system, service-oriented IPC architecture, SSH support

## Architecture

Three layers with clear separation:

```
┌────────────────────────────────────────────┐
│  UI Layer                                  │
│  ├── Web Dashboard (React + Tailwind)      │
│  └── Zellij Plugin (Rust/WASM, future)     │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Dashboard Server                          │
│  (Node.js, HTTP + WebSocket)               │
│  Wraps control plane, serves web UI,       │
│  pushes live updates via WebSocket         │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Control Plane (@oat/control-plane)        │
│  Pure TypeScript library                   │
│  ├── Project state reader                  │
│  ├── Skill registry + recommender          │
│  ├── Session manager (detect + dispatch)   │
│  └── Worktree manager                      │
└────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Agent Runtimes                            │
│  Claude CLI, Codex CLI running in          │
│  Zellij panes (Ghostty or any terminal)    │
└────────────────────────────────────────────┘
```

### Monorepo structure

```
packages/control-plane/        # @oat/control-plane — pure TypeScript library
├── src/
│   ├── projects/
│   │   ├── scanner.ts         # Discover projects across repos + worktrees
│   │   ├── parser.ts          # Parse state.md, plan.md, implementation.md
│   │   ├── lifecycle.ts       # Determine phase, progress, pending actions
│   │   └── watcher.ts         # File watchers, emit update events
│   ├── skills/
│   │   ├── registry.ts        # Discover + parse skills from .agents/skills/
│   │   └── recommender.ts     # Context-aware "what to do next" logic
│   ├── sessions/
│   │   ├── detector.ts        # Process scanning for running agents
│   │   ├── launcher.ts        # Spawn agent CLIs with -p flag
│   │   ├── zellij.ts          # Zellij CLI API integration
│   │   └── worktree.ts        # Git worktree create/list/cleanup
│   └── index.ts               # Public API

packages/dashboard-server/     # Lightweight HTTP + WebSocket server
├── src/
│   ├── api.ts                 # REST endpoints
│   ├── ws.ts                  # WebSocket push for live updates
│   └── index.ts               # Server entry, static file serving

apps/dashboard-ui/             # React web UI
├── src/
│   ├── views/
│   │   ├── ProjectList.tsx    # Left sidebar — all projects across repos
│   │   ├── ProjectDetail.tsx  # Center — phase, progress, inbox, artifacts
│   │   ├── SessionPanel.tsx   # Right sidebar — active sessions
│   │   └── DispatchModal.tsx  # Dispatch flow (send to existing / launch new)
│   └── main.tsx
```

## Control Plane (`@oat/control-plane`)

Pure TypeScript library with no UI or server dependencies. Exposes typed functions that any consumer (server, CLI, extension) can call.

### Project discovery and state

**Discovery** — scans filesystem to find all OAT projects:

1. Takes a list of repo root paths (from `~/.oat/dashboard.json`)
2. For each repo, runs `git worktree list` to find all worktrees
3. Scans each checkout/worktree for `.oat/projects/` directories
4. Returns a unified list of all discovered projects with their repo and worktree context
5. Deduplicates: same project across worktrees appears as one entry with multiple locations

**State parsing** — reads OAT markdown artifacts into structured data:

```typescript
interface ProjectState {
  id: string; // "repo:scope:name" — unique across repos
  name: string;
  scope: string; // "shared" | custom
  repo: string; // repo root path
  locations: ProjectLocation[]; // main checkout + worktrees
  phase: Phase; // matches oat_phase frontmatter
  phaseStatus: PhaseStatus; // matches oat_phase_status frontmatter
  workflowMode: WorkflowMode; // determines which phases exist
  progress: { completed: number; total: number; currentTask?: string };
  pendingActions: PendingAction[]; // things waiting on human input
  artifacts: Map<ArtifactType, ArtifactInfo>; // which files exist + last modified
  blockers: string[]; // from oat_blockers frontmatter
  timestamps: {
    created: string; // oat_project_created (ISO 8601)
    completed?: string; // oat_project_completed (ISO 8601)
    stateUpdated: string; // oat_project_state_updated (ISO 8601)
  };
}

interface ProjectLocation {
  path: string; // absolute path to project dir
  worktree?: string; // worktree path if not main checkout
  branch: string; // current branch
}

// Matches oat_phase values exactly
type Phase = 'discovery' | 'spec' | 'design' | 'plan' | 'implement';

// Matches oat_phase_status values exactly
type PhaseStatus = 'in_progress' | 'complete';

// Matches oat_workflow_mode values exactly
type WorkflowMode = 'spec-driven' | 'quick' | 'import';

// Derived display state — computed from phase + phaseStatus + artifact presence
type DisplayState =
  | { kind: 'in-phase'; phase: Phase } // phase is in_progress
  | { kind: 'reviewing'; phase: Phase } // review artifact exists for current phase, awaiting response
  | { kind: 'complete' }; // oat_project_completed is set

type ArtifactType =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'reviews';

// Full snapshot sent on WebSocket connect/reconnect
interface FullState {
  projects: ProjectState[];
  sessions: AgentSession[];
}

interface PendingAction {
  type:
    | 'review-pending'
    | 'blocked-task'
    | 'hill-checkpoint'
    | 'approval-needed';
  description: string;
  artifact?: string; // file path if applicable
}

interface ArtifactInfo {
  exists: boolean;
  path: string;
  lastModified?: Date;
  active?: boolean; // currently being worked on
}
```

Note: `Phase` represents the raw OAT phase value from `state.md` frontmatter. "Reviewing" and "complete" are not phases — they are derived from `phaseStatus`, review artifact presence, and `oat_project_completed`. The UI computes `DisplayState` for rendering.

**Pending action detection** — scans for signals requiring human input:

- Review artifacts in `reviews/` with no corresponding "received" response
- `implementation.md` showing a task with blocker status
- `state.md` indicating a HiLL checkpoint was reached
- Plan exists but implementation hasn't started
- Design review requested but not addressed

**File watching** — monitors OAT artifacts for changes and emits events:

- Uses chokidar or `fs.watch` on `.oat/projects/` directories
- Emits typed events: `project-updated`, `project-created`, `project-removed`
- Consumers (dashboard server) subscribe and push updates to connected clients

### Skill registry and recommender

**Registry** — reads `.agents/skills/` and parses frontmatter:

```typescript
interface SkillInfo {
  name: string;
  description: string;
  version?: string;
  userInvocable: boolean;
  argumentHint?: string; // e.g. '<project-name> [--force]'
  category: 'lifecycle' | 'review' | 'utility'; // inferred from name prefix (oat-project-* = lifecycle, oat-*review* = review, else utility)
}
```

**Recommender** — given a project state, returns ordered skill suggestions with pre-filled arguments:

```typescript
interface SkillRecommendation {
  skill: SkillInfo;
  reason: string; // why this is recommended now
  suggestedArgs?: string; // pre-filled based on project state
  priority: 'primary' | 'secondary';
}
```

Recommendation logic (uses `oat_phase` + `oat_phase_status` + `oat_workflow_mode`):

| `oat_phase` | `oat_phase_status` | `oat_workflow_mode` | Primary recommendation       | Suggested args    |
| ----------- | ------------------ | ------------------- | ---------------------------- | ----------------- |
| `discovery` | `in_progress`      | any                 | — (in progress, no action)   | —                 |
| `discovery` | `complete`         | `spec-driven`       | `oat-project-spec`           | —                 |
| `discovery` | `complete`         | `quick` / `import`  | `oat-project-design`         | —                 |
| `spec`      | `in_progress`      | `spec-driven`       | —                            | —                 |
| `spec`      | `complete`         | `spec-driven`       | `oat-project-review-provide` | `artifact spec`   |
| `design`    | `in_progress`      | any                 | —                            | —                 |
| `design`    | `complete`         | any                 | `oat-project-review-provide` | `artifact design` |
| `plan`      | `in_progress`      | any                 | —                            | —                 |
| `plan`      | `complete`         | any                 | `oat-project-implement`      | —                 |
| `implement` | `in_progress`      | any                 | `oat-project-implement`      | —                 |
| `implement` | `complete`         | any                 | `oat-project-review-provide` | `code final`      |

Additional recommendations (appended as secondary):

- If review artifacts exist in `reviews/` with no received response → `oat-project-review-receive`
- If `oat_blockers` is non-empty → show blocker info, no skill recommendation
- If a HiLL checkpoint from `oat_hill_checkpoints` has been reached (present in `oat_hill_completed`) → flag for human review

Arguments are always shown as editable fields — the recommendation is a default, not a constraint.

**Known limitation:** When a phase's review has been received and passed but `oat_phase` hasn't advanced yet (brief window), the recommender may re-suggest the review skill. Acceptable for v1 — the user naturally advances to the next phase. Future improvement: check for archived review artifacts to detect this state.

### Session manager

**Detection** — finds running agent sessions:

- Primary: uses Zellij CLI API to list panes and their processes (most reliable)
- Fallback: scans running processes for `claude`, `codex` binaries via `ps`
- Matches to repo/worktree by inspecting process cwd (macOS: `lsof -p PID | grep cwd`; Linux: `/proc/PID/cwd` symlink)
- If Zellij is available, uses `zellij action` CLI to:
  - List panes and their running processes
  - Associate sessions with specific Zellij pane IDs
  - Read pane output for activity state (working/idle heuristic)

```typescript
interface AgentSession {
  runtime: 'claude' | 'codex';
  pid: number;
  repo: string;
  worktree?: string;
  zellijPane?: { id: number; tab: string };
  status: 'working' | 'idle' | 'unknown';
  duration: number; // seconds since session started
}
```

**Dispatch — send to existing session:**

- Uses `zellij action write-chars` to type a command into a specific pane
- Command format: `/<skill-name> <args>\n`

**Dispatch — launch new session:**

Pipeline executed as a chained shell command:

1. `git worktree add <path> -b <branch> <base>` (if worktree isolation selected)
2. `cd <path>`
3. Run setup script (e.g. `pnpm run worktree:init`) if configured
4. `claude -p "/<skill-name> <args>"` or `codex "<prompt>"` — agent starts with the skill already invoked via initial prompt flag

The entire pipeline is a single `&&`-chained command run in a new Zellij pane via `zellij run`. No "wait for agent to be ready" detection needed.

**Error handling for dispatch:**

- Worktree creation fails (branch exists, dirty state): surface git error in dashboard, don't proceed
- Setup script fails (non-zero exit): show output in dashboard, offer retry or skip
- Zellij not running: show error with instructions ("start Zellij first" or offer to launch it)
- `write-chars` to a pane that has exited: detect via pane listing first, show "session no longer active"
- Agent CLI not found: check PATH before dispatch, surface "claude/codex not installed" with install link

```typescript
interface DispatchOptions {
  skill?: { name: string; args?: string }; // skill to invoke (optional — can launch empty session)
  runtime: 'claude' | 'codex';
  repo: string;
  isolation: 'current-branch' | 'new-worktree';
  worktreeOptions?: {
    baseBranch: string;
    branchName: string; // auto-generated default, editable
  };
  setupScript?: string; // from repo config, toggleable
}
```

### Worktree manager

Thin wrapper around git worktree operations:

- `listWorktrees(repo)` — returns all worktrees with branch info
- `createWorktree(repo, baseBranch, branchName)` — creates and returns path
- `removeWorktree(repo, path)` — prune merged worktrees

## Dashboard Server (`@oat/dashboard-server`)

Lightweight Node.js server. Started via `oat dashboard` CLI command.

### HTTP API

```
GET  /api/projects                    # All discovered projects with state
GET  /api/projects/:id                # Single project detail (id = repo:scope:name)
GET  /api/projects/:id/artifacts      # Artifact metadata
GET  /api/skills                      # All skills
GET  /api/skills/recommendations/:project  # Context-aware recommendations for a project
GET  /api/sessions                    # Active agent sessions
POST /api/sessions/dispatch           # Launch new session or send to existing
GET  /api/worktrees/:repo             # List worktrees for a repo
POST /api/open-file                   # Open file in system editor (open/xdg-open)
GET  /api/config                      # Dashboard config
PUT  /api/config                      # Update dashboard config
```

### WebSocket

Push events to connected dashboard clients:

```typescript
type DashboardEvent =
  | { type: 'connection-established'; state: FullState } // sent on connect/reconnect
  | { type: 'project-updated'; project: ProjectState }
  | { type: 'project-discovered'; project: ProjectState }
  | { type: 'session-started'; session: AgentSession }
  | { type: 'session-ended'; session: AgentSession }
  | { type: 'session-activity'; session: AgentSession };
```

File watchers on OAT project directories trigger `project-updated` events. Session detection polls on a configurable interval (default 5s).

**Reconnection:** On WebSocket disconnect, the client reconnects with exponential backoff. On reconnect, the server sends a `connection-established` event with the full current state — the client replaces its local state entirely rather than trying to reconcile missed events.

### Static serving

Serves the built dashboard UI from `apps/dashboard-ui/dist/`. Single `oat dashboard` command starts both the API and serves the frontend.

## Web UI (`apps/dashboard-ui`)

React + Tailwind application. Three-panel layout.

### Left sidebar — Project List

- All discovered projects across all repos and worktrees
- Each entry shows: project name, current phase, progress indicator (e.g. "3/7"), pending action badge
- Grouped by repo
- Selected project highlighted, drives center panel
- If a project exists in multiple worktrees, shows the worktree context inline

### Center panel — Project Detail

- **Header**: project name, repo, path, phase badge
- **Progress bar**: visual indicator of phase progress (X of Y tasks)
- **Pending Actions (inbox)**: amber-highlighted items waiting on human input, with "Open" button to view the relevant artifact
- **Recommended Next**: skill cards with pre-filled arguments, primary recommendation highlighted. Each card shows skill name, description, and suggested args as editable text. Clicking a card opens the dispatch modal with that skill pre-selected.
- **Artifacts**: grid of project artifacts (discovery.md, design.md, plan.md, implementation.md, reviews/) showing existence and last modified date. Click triggers `POST /api/open-file` which shells out to `open` (macOS) / `xdg-open` (Linux) to open in the system default editor.

### Right sidebar — Sessions

- Active agent sessions with status indicators (green dot = working, gray = idle)
- Each session shows: runtime (Claude/Codex), repo/worktree, duration, Zellij pane reference
- "New Session" button opens dispatch modal

### Dispatch Modal

Two modes, toggled by target:

**Send to existing session:**

- Session selector dropdown (only shows running sessions, with status)
- Recommended skill chips (quick-pick based on project state)
- Free-form prompt input as fallback
- "Send to Session" button

**Launch new session:**

- Skill/Prompt tabs — skill picker with argument field, or free-form prompt
- Agent selector dropdown (Claude Code / Codex CLI)
- Isolation mode dropdown (Current branch / New worktree)
- Collapsible "Advanced options":
  - Base branch picker (searchable, shows available branches)
  - Branch name (auto-generated from project + skill, editable)
  - Setup script toggle (reads from repo config, shows the command)
- "Create Session" button
- Pipeline preview at bottom: shows the steps that will execute (worktree → setup → agent -p "command")

Skill arguments are shown as an editable field below the skill picker, pre-filled with the recommender's suggestion based on project state. The user can always override.

## Zellij Plugin (future, not v1)

Minimal TUI companion for terminal-only workflows (SSH to Mac Mini, EC2 devbox).

**Shows:**

- Current project name + phase + progress (single status line)
- Pending action count
- Active session count with status dots

**Does:**

- Keybinding to cycle projects
- Keybinding for compact fuzzy skill picker → sends command to active pane

**Tech:** Rust/WASM per Zellij plugin API. Reads OAT files directly from filesystem — independent of dashboard server.

## Configuration

### Global — `~/.oat/dashboard.json`

```json
{
  "repos": ["~/Code/open-agent-toolkit", "~/Code/api-service"],
  "port": 7400,
  "defaults": {
    "runtime": "claude",
    "isolation": "worktree",
    "baseBranch": "main"
  }
}
```

`repos` is a list of root directories to scan — the dashboard discovers projects and worktrees within them automatically. Tilde (`~`) is expanded to `$HOME` at read time.

**Creation and fallback behavior:**

- `oat dashboard` works without this file — defaults to scanning CWD only
- First run prompts: "No dashboard config found. Scan current directory only, or configure repos?" with option to create the file
- `oat dashboard init` creates the file interactively, scanning for `.oat/` directories under common paths

### Per-repo — field in `.oat/config.json` (committed, shared)

```json
{
  "dashboard": {
    "setupScript": "pnpm run worktree:init",
    "branchPrefix": "oat/"
  }
}
```

Lives in `.oat/config.json` (not `.oat/config.local.json`) because setup scripts and branch prefixes are typically team-shared conventions. This is additive to the existing config schema — existing fields are unchanged.

### No separate database

All project state is read from OAT's existing markdown artifacts on disk. Session state is runtime-only (process detection + Zellij API). No SQLite, no state duplication. The filesystem and running processes are the source of truth.

## Tech Stack

| Component         | Technology               | Rationale                                     |
| ----------------- | ------------------------ | --------------------------------------------- |
| Control plane     | TypeScript, pure library | Shares types/tooling with OAT monorepo        |
| Dashboard server  | Node.js + Hono           | Lightweight HTTP + WebSocket, minimal deps    |
| Web UI            | React + Tailwind         | Fast to build, familiar ecosystem             |
| Zellij plugin     | Rust + WASM              | Required by Zellij plugin API                 |
| File watching     | chokidar                 | Monitor OAT artifact changes for live updates |
| Zellij IPC        | `zellij action` CLI      | No custom IPC — use existing Zellij commands  |
| Process detection | `ps` + cwd inspection    | Detect running claude/codex processes         |
| Build             | Turborepo (existing)     | Consistent with monorepo build system         |

## v1 Scope

### In scope

- Control plane: project discovery (repos + worktrees), state parsing, skill registry + recommender, session detection, dispatch (existing + new), worktree management
- Dashboard server: HTTP API, WebSocket live updates, static UI serving
- Web UI: project list, project detail (phase/progress/inbox/artifacts), session panel, dispatch modal with smart defaults and skill arguments
- Zellij integration: dispatch into panes via CLI, detect existing sessions in panes
- `oat dashboard` CLI command

### Out of scope (future)

- Zellij TUI plugin (status bar companion)
- Git/branch context panel in dashboard
- Activity timeline / recent events feed
- Tauri desktop wrapper
- VS Code extension
- emdash / Superset integration adapters
- Mobile client
- Multi-user / team features
- Authentication / access control (single-user, localhost assumed; SSH tunnel for remote access)
