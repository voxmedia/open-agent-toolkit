---
skill: deep-research
schema: architectural
topic: 'OAT Control Plane & Dashboard — Current State and Options (April 3, 2026)'
model: opus-4-6
generated_at: 2026-04-03
---

# OAT Control Plane & Dashboard — Current State

This document consolidates everything from the April 3 brainstorming session and the March 15 prior art into a single picture of where we are and what the options are. It's intended to be the authoritative reference for future sessions.

## What We're Building

A **control plane** (pure TypeScript library) that understands OAT project state and can power any UI surface — terminal TUI, web dashboard, Zellij plugin, VS Code extension, or a Tauri/Electron desktop app. The control plane is the foundation; UI choices are layered on top.

The product vision that emerged from brainstorming is: **terminal-native superset.sh with OAT workflow intelligence** — a workspace manager that shows repos, worktrees, and agent sessions, with OAT project state as an additive layer when `.oat/` exists. But the control plane itself is UI-agnostic.

## Prior Art

### March 15 Design (internal)

Two artifacts exist from a previous session:

- **`2026-03-15-oat-dashboard-design.md`** — Full design spec: three-layer architecture (`@oat/control-plane` → `@oat/dashboard-server` → `apps/dashboard-ui`), typed interfaces, skill recommender logic, session detection, dispatch, config schema
- **`2026-03-15-oat-dashboard.md`** — TDD implementation plan: 26 tasks across 5 chunks, covering control plane, server, web UI, and CLI integration

The design is **structurally sound but needs updates** for 39 commits of OAT evolution since March 15. See `2026-04-03-march15-design-audit.md` for the full delta analysis. Key changes: new `pr_open` phase status, PR tracking fields, 6-step post-implementation router, 9 new lifecycle skills, boundary tier detection, and config schema additions.

### External Landscape (9 tools surveyed)

Full analysis in `oat-workflow-panel-opus-4-6.md`. Key references:

| Tool                                                                | Type                              | Key Lesson                                                                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [superset.sh](https://superset.sh)                                  | Electron desktop app              | UX target — workspace sidebar, diff viewer, agent monitoring. But vendor-locked, Electron overhead, no OAT awareness.                                                          |
| [agentastic.dev](https://agentastic.dev)                            | Native macOS (Swift + libghostty) | Embeds Ghostty as rendering engine. Kanban for worktrees. Closed source, macOS-only.                                                                                           |
| [agtx](https://github.com/fynnfluegge/agtx)                         | Rust TUI                          | Closest architectural prior art — kanban board, TOML plugin system, MCP server, per-phase agent assignment. Could work with OAT via a plugin but lacks native state awareness. |
| [claude-squad](https://github.com/smtg-ai/claude-squad)             | Go TUI                            | Multi-agent dashboard with preview/diff tabs. tmux-based, daemon mode.                                                                                                         |
| [ntm](https://github.com/Dicklesworthstone/ntm)                     | Go control plane                  | Pipelines with dependencies, safety policies, REST/WebSocket API. Most "control plane"-like of the external tools.                                                             |
| [tmux-agent-status](https://github.com/samleeney/tmux-agent-status) | Bash tmux plugin                  | Validates filesystem-as-message-bus pattern. Hook-driven agent status.                                                                                                         |
| [opensessions](https://github.com/ataraxy-labs/opensessions)        | TypeScript sidebar                | HTTP-driven metadata push. Lightest tool — just a monitoring sidebar.                                                                                                          |
| [dmux](https://github.com/standardagents/dmux)                      | TypeScript                        | Worktree isolation, 11+ agent support, built-in file browser.                                                                                                                  |
| [cmux](https://github.com/craigsc/cmux)                             | Bash                              | Simplest — just worktree + branch + Claude launch.                                                                                                                             |

**Common patterns:** Git worktrees for isolation, filesystem-based state, tmux as universal multiplexer, hook-driven notifications, TUI dashboards.

**Why build our own:** None of these tools understand OAT's state machine — phases, HiLL checkpoints, skill routing, boundary tier detection, spec-driven vs quick modes. They can orchestrate agents but can't tell you _what to do next_ based on where your project is.

---

## Architecture: Three Layers

This is unchanged from March 15 and confirmed by the April 3 brainstorming:

```
┌────────────────────────────────────────────┐
│  UI Layer (one or more of these)           │
│  ├── Ink TUI (sidebar in Zellij/tmux)      │
│  ├── Web Dashboard (React + Tailwind)      │
│  ├── Zellij WASM Plugin (future)           │
│  └── Tauri/Electron desktop app (future)   │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Dashboard Server (optional, for web UI)   │
│  (Node.js, HTTP + WebSocket via Hono)      │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Control Plane (@open-agent-toolkit/       │
│                  control-plane)             │
│  Pure TypeScript library                   │
│  ├── Project discovery + state parsing     │
│  ├── Skill registry + recommender          │
│  ├── Session detection + dispatch          │
│  ├── Worktree management                   │
│  └── File watching + event emission        │
└────────────────────────────────────────────┘
```

The control plane has **no UI or server dependencies**. Any consumer (CLI, TUI, web app, extension) imports it and calls typed functions. The dashboard server is only needed if serving a web UI.

---

## Control Plane: What It Does

### Project Discovery

- Takes a list of repo root paths (from config file)
- For each repo, runs `git worktree list` to find all worktrees
- Scans each checkout/worktree for `.oat/projects/` directories
- Returns unified list of all discovered projects with repo/worktree context
- Deduplicates: same project across worktrees appears as one entry with multiple locations

### State Parsing

Reads OAT markdown artifacts into structured data:

```typescript
interface ProjectState {
  id: string; // "repo:scope:name"
  name: string;
  scope: string;
  repo: string;
  locations: ProjectLocation[];
  phase: Phase;
  phaseStatus: PhaseStatus; // NOW includes 'pr_open'
  workflowMode: WorkflowMode;
  executionMode: ExecutionMode;
  progress: { completed: number; total: number; currentTask?: string };
  pendingActions: PendingAction[];
  artifacts: Map<ArtifactType, ArtifactInfo>; // NOW includes 'summary'
  blockers: string[];
  prStatus: string | null; // NEW: null | open | merged | closed
  prUrl: string | null; // NEW: PR URL
  hillCheckpoints: string[];
  hillCompleted: string[];
  timestamps: {
    created: string;
    completed?: string;
    stateUpdated: string;
  };
}

type Phase = 'discovery' | 'spec' | 'design' | 'plan' | 'implement';
type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';
type WorkflowMode = 'spec-driven' | 'quick' | 'import';
type ExecutionMode = 'single-thread' | 'subagent-driven';
type ArtifactType =
  | 'discovery'
  | 'spec'
  | 'design'
  | 'plan'
  | 'implementation'
  | 'reviews'
  | 'summary';
```

### Skill Recommender

Given a project state, returns ordered skill suggestions with pre-filled arguments. This is the core "what should I do next?" logic. It implements:

1. **Early phase routing** (discovery → plan): well-defined table based on phase + status + workflow mode
2. **Post-implementation router**: 6-step state machine checking revision tasks, unprocessed reviews, code review status, summary generation, PR creation, and PR completion
3. **Boundary tier detection**: reads artifact frontmatter to classify readiness (Tier 1/1b/2/3)
4. **HiLL gate checking**: flags phases requiring human approval before advancing

### Session Detection

- Uses Zellij CLI API to list panes and their processes
- Fallback: scans running processes for `claude`, `codex` binaries
- Matches to repo/worktree by inspecting process cwd

### Dispatch

Two modes:

- **Send to existing session**: `zellij action write-chars` to type `/<skill-name>` into a pane
- **Launch new session**: `zellij run -- claude --prompt "..."` with worktree setup pipeline

### File Watching

- chokidar on `.oat/projects/` directories
- Emits typed events: `project-updated`, `project-created`, `project-removed`
- Consumers subscribe and react (re-render UI, push WebSocket events)

---

## UI Options

### Option A: Web Dashboard (March 15 design)

**What:** React + Tailwind web app served by a Hono HTTP + WebSocket server.

**Layout:** Three-panel — project list (left), project detail with skill recommender (center), active sessions (right). Dispatch modal for sending skills to new or existing sessions.

**Pros:**

- Richer UI (dispatch modal with editable arguments, artifact viewer, drag-and-drop)
- Works over SSH (browser connects to `localhost:7400` — key differentiator vs all surveyed alternatives)
- Familiar React/Tailwind DX
- Full design spec and TDD implementation plan already exist

**Cons:**

- Requires a running server process
- More dev effort (server + frontend packages)
- Not embedded in terminal workflow — requires switching to a browser

**Status:** Fully designed and planned (March 15). Needs type updates per audit.

### Option B: Ink TUI (April 3 brainstorming)

**What:** React-for-CLI app using [Ink](https://github.com/vadimdemedes/ink), running as a standalone process in a Zellij/tmux pane.

**Layout:** Three modes responsive to available width:

1. **Compact sidebar** (~20-30%) — workspace list with one-line status per project, action keybind hints, agent activity indicators
2. **Expanded panel** — project detail with phase progress, action menu, tool launchers
3. **Full-screen kanban** — multi-project board view (toggle into it, not the primary interface)

**Pros:**

- Stays in terminal flow — no browser context switch
- Faster to build for MVP (no server, no separate frontend build)
- Same React mental model as web dashboard
- Production-proven (Claude Code, Gemini CLI, Wrangler all use Ink)
- Drops into monorepo with zero friction (TypeScript, same build system)

**Cons:**

- No mouse support — keyboard-only navigation
- Simpler widget primitives than a web UI
- Can't do rich dispatch modal with editable fields as easily
- Single-pane rendering (splits handled by Zellij/tmux, not Ink)

**Status:** Brainstormed and shaped through 5 rounds of discovery. No implementation plan yet.

### Option C: Both (long-term play)

Control plane serves both. TUI for day-to-day sidebar, web dashboard for full orchestration view. This is the natural end state but doubles frontend work initially.

### Option D: Tauri / Rust + React Desktop App (future)

Full desktop app with native performance. Could embed terminal (like agentastic embeds libghostty). Maximum capability but maximum effort. Worth considering after validating the concept with simpler options.

**Current recommendation:** Start with the control plane (Phase 1), then build Option B (Ink TUI) as the fastest path to a working MVP. This validates whether the control plane abstraction is useful and whether the workflow panel concept saves time. If it proves valuable, build Option A (web dashboard) or Option D (desktop app) for richer experiences.

---

## Discovery Decisions (April 3 Brainstorming)

Five rounds of Q&A shaped the product vision. All answers are captured here for future sessions.

### Product Model

- **Workspace manager first, OAT tracker second** — the primary interface is a workspace/worktree navigator (like superset.sh), not a project phase viewer. OAT state is an additive layer when `.oat/` exists.
- **Kanban is NOT the primary view** — it's a full-screen mode you toggle into for the big picture. The day-to-day interface is the sidebar.
- **Both sidebar and full-screen** — sidebar (20-30% width) as default for ambient awareness, expand to full-screen with a keybinding.

### Workspace Model

```
┌─ Workspace Navigator (always visible) ──┬─ Main Content Area ──────────────┐
│                                          │                                  │
│  ▼ repo-1 (main)                        │  [Agent session / editor / etc]  │
│    ├─ worktree: feat-auth  ▸ working    │                                  │
│    ├─ worktree: fix-api    ● done       │                                  │
│    └─ worktree: docs       ○ idle       │                                  │
│                                          │                                  │
│  ▼ repo-2 (main)                        │                                  │
│    └─ worktree: v2-migrate ▸ working    │                                  │
│                                          │                                  │
│  ▶ repo-3 (collapsed)                   │                                  │
│                                          │                                  │
├─ OAT Layer (toggle) ────────────────────┤                                  │
│  Project: auth-refactor                  │                                  │
│  Phase: Plan → Implement                │                                  │
│  Tasks: ████████░░ 4/6                  │                                  │
│  [i] Implement  [r] Review  [l] Log     │                                  │
│  HiLL: ✓ discovery ✓ spec ✓ design     │                                  │
└──────────────────────────────────────────┴──────────────────────────────────┘
```

### Scale & Concurrency

- 2-5 repos at a time, 1-5 OAT projects per repo
- Sometimes focused on one repo with multiple projects, other times spread across repos
- Panel tracks **one project at a time**, switches as user cycles through workspaces

### Repo Registration

- **Explicit add, not auto-discover** — run `oat panel add /path/to/repo`, stored in config file
- No filesystem scanning magic — simple, predictable, user-controlled

### Multiplexer Strategy

- **Zellij-first**, tmux via adapter
- Auto-detect via `$ZELLIJ`/`$TMUX` env vars
- Ship a default `oat-panel.kdl` layout file for Zellij
- Adapter interface is ~50 lines per multiplexer — just pane spawning commands

```typescript
interface MuxAdapter {
  splitPane(
    command: string,
    opts?: { name?: string; cwd?: string; floating?: boolean },
  ): void;
  listPanes(): PaneInfo[];
  detectMultiplexer(): 'zellij' | 'tmux' | 'none';
}
```

### Action Triggers

- **Contextual action menu, not single button** — show all valid transitions based on state
- After plan completes: `[i] Implement  [r] Review  [p] Pause`
- **Notifications always on** — badge/alert when next step is ready
- No separate orchestrator — OAT's execution continuation already handles autonomous implementation

### Agent Tracking

- **Aggregate progress only for subagent mode** — show "3/7 tasks done", don't expose individual subagent worktrees
- Agent status per worktree (working/done/idle) via Claude Code hooks

### HiLL Checkpoint Flow

- Ideal: **inline file viewer** — show the artifact (spec, design, plan) directly using yazi or delta diff view
- User wants to _read_ before approving, without leaving the panel context

### Session Resume

- **Context-aware** — panel knows where the agent stopped (e.g., task p2-t3), queues the next action with context pre-loaded

### Review Flow

- **Auto-trigger review-receive** — when review feedback lands in `reviews/`, panel automatically spawns `oat-project-review-receive`
- Should have a config toggle for manual control

### Quick Actions (all wanted)

1. **Tool launcher** — open lazygit/yazi/editor scoped to selected worktree
2. **New workspace wizard** — create worktree + branch + agent session in one flow
3. **Smart "Next Step"** — run `oat-project-next` to auto-detect and launch the right phase
4. **Workspace cleanup** — merge branch, clean up worktree, archive OAT project

### Diff/Preview

- Integrate with existing tools: **yazi** (file browser), **lazygit** (git TUI), **delta** (diff viewer)
- Panel should **launch** these tools in panes rather than reimplementing diff viewing

### Project End-of-Lifecycle

- **Manual archive** — completed projects persist showing state details, PR link, etc.
- User explicitly archives when ready. No auto-cleanup.

### Sidebar Information Density

Everything at a glance per project line:

- Project name + current phase + phase status
- Next action keybind hints
- Agent activity (working/waiting/done)
- Blocker alerts (slightly lower priority but still shown)

### Superset/Agentastic Competitive Analysis

**Why NOT superset.sh or agentastic.dev:**

1. Vendor lock-in — tied to their decisions on features and direction
2. Electron/native overhead — heavy runtime for a terminal-adjacent tool
3. No OAT awareness — no concept of project phases, HiLL checkpoints, skill routing
4. Closed ecosystem — can't fork and customize deeply

**What to borrow from their designs:**

- Workspace sidebar as always-on navigation (repos → worktrees → agent status)
- Toggle-able changes/diff panel
- Keyboard-driven workflow (numbered shortcuts for workspace switching)
- Workspace presets/config for setup/teardown scripts
- One-click tool launching (editor, terminal, etc.)

**What we add that they can't:**

- OAT workflow state awareness (phases, tasks, checkpoints, skill routing)
- Contextual action menus based on project state machine
- Auto-triggered review-receive flow
- Context-aware session resume
- Terminal-native (runs in Zellij/tmux, no Electron)
- User-owned and extensible

---

## Phasing Plan

### Phase 1: Control Plane (`@open-agent-toolkit/control-plane`)

**Scope:** Pure TypeScript library, no UI. The March 15 plan's Chunks 1-2 (Tasks 1-13), updated per the audit.

**Modules:**

- Project discovery (scan repos + worktrees, find `.oat/projects/`)
- State parsing (`state.md` frontmatter → typed `ProjectState`, including new `pr_open`, `oat_pr_status`, `oat_pr_url`, `summary` artifact)
- Task progress (parse `plan.md`/`implementation.md` for completion counts)
- Skill recommender (early phase routing + 6-step post-implementation router + boundary tier detection)
- Session detection (find running claude/codex processes, match to worktrees)
- Dispatch (launch agent sessions in Zellij/tmux panes with skills pre-loaded)
- Worktree management (create/list/remove)
- File watching (chokidar on `.oat/projects/`, emit typed events)

**Deliverable:** `packages/control-plane/` that the CLI can already consume (e.g., `oat status` using richer state). Ships as `@open-agent-toolkit/control-plane`.

**What needs updating from March 15:** See `2026-04-03-march15-design-audit.md` for the full delta. Main items: add `pr_open` status, PR tracking fields, `summary` artifact type, rewrite post-implementation recommender, add boundary tier detection, update package namespace.

### Phase 2: Ink TUI MVP (Option B)

**Scope:** Thin vertical slice through all three product layers — basic workspace nav + basic OAT state + basic actions.

**MVP feature set:**

Layer 1 — Workspace Navigator (minimal):

- List registered repos (from config) and their worktrees (`git worktree list`)
- Agent status indicator per worktree (working/done/idle via Claude Code hooks)
- Select workspace to focus → switch context

Layer 2 — Agent Session Manager (minimal):

- Spawn new agent session in a new pane for selected workspace
- Launch lazygit/yazi scoped to selected worktree (tool launcher)

Layer 3 — OAT Workflow (minimal):

- Show current phase + phase status for active workspace (reads `state.md`)
- Aggregate task progress for implement phase
- "Next Step" action that runs `oat-project-next`
- File watcher on `state.md` for live updates

**Deliverable:** `packages/panel/` with `oat panel` CLI subcommand. New Ink/React package in the monorepo.

**Tech:** Ink (React for CLI), chokidar for file watching, multiplexer adapter for pane spawning.

**Purpose:** Validate the concept. Is this useful? Does it save time? Is the control plane abstraction working? Inform whether to invest in a richer UI (web dashboard, desktop app).

### Phase 2 Deferred Features (v2+)

- Full kanban board view (full-screen mode)
- Diff/preview pane
- HiLL checkpoint approval flow with inline file viewer
- Context-aware session resume
- Auto-triggered review-receive
- New workspace wizard
- Workspace cleanup/archival
- Git branch overview
- Activity log feed
- Notifications (audio/desktop)
- Multi-project dashboard with progress bars

### Phase 3: Richer UI (TBD)

Options after validating with the Ink TUI:

- **Web Dashboard** (Option A) — March 15 design, Hono server + React + Tailwind. Works over SSH.
- **Tauri Desktop App** (Option D) — Rust + React, native performance, could embed terminal.
- **Both** — control plane serves multiple UIs.

Decision deferred until Phase 2 validates the concept.

---

## Visual Design — Next Steps

Before implementing Phase 2 (Ink TUI), more visual design work is needed to think through the actual UI and UX. This will likely happen in a separate session. Key questions for that session:

- Exact layout for compact sidebar mode vs expanded mode vs full-screen kanban
- Keybinding scheme (vim-style? superset-style? custom?)
- Color palette and status indicator design
- How the OAT layer toggles in/out of the workspace view
- How the action menu presents multiple options
- How the tool launcher (lazygit/yazi) integration feels
- Responsive behavior as Zellij pane width changes
- What information density feels right in the sidebar

The more detail captured in mockups, the faster implementation will go.

---

## IPC Architecture

### State Flow

| Layer                   | Mechanism                                 | Purpose                           |
| ----------------------- | ----------------------------------------- | --------------------------------- |
| **State persistence**   | `state.md` frontmatter                    | Source of truth, survives crashes |
| **State observation**   | chokidar on `state.md`                    | Panel detects changes             |
| **Agent → Panel**       | Claude Code `Stop`/`PostToolUse` hooks    | Agent signals completion          |
| **Panel → Multiplexer** | `zellij run` / `tmux split-window`        | Spawn new agent panes             |
| **Panel → OAT**         | Direct CLI invocation (`oat project ...`) | Trigger state transitions         |

### Workflow Example: User Clicks "Implement"

1. Panel reads `state.md`, skill recommender determines `implement` is the primary recommendation
2. User selects "Implement" from action menu
3. Panel runs: `zellij run --name "implement" --cwd <worktree-dir> -- claude --prompt "Run /oat-project-implement for project <name>"`
4. Claude Code's `Stop` hook fires: `oat panel notify --event=agent-stopped`
5. Panel's file watcher detects `state.md` change, re-reads, updates UI

### Claude Code Hook Configuration

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "command": "oat panel notify --event=agent-stopped --session=$SESSION_ID"
      }
    ]
  }
}
```

---

## TUI Framework: Ink

The panel TUI uses [Ink](https://github.com/vadimdemedes/ink) — React for the terminal.

**Core capabilities:**

- React component model with JSX, hooks, state management
- Flexbox layout via `<Box>` (same as CSS but measured in terminal columns/rows)
- Styled text via `<Text>` (color, bold, dim, underline, inverse)
- Keyboard input via `useInput` hook (arrow keys, letters, enter, escape)
- Focus management via `useFocus`/`useFocusManager` for tab navigation
- Real-time updates: `useState` + `useEffect` with file watchers drive re-renders

**Available components:**

- Built-in: `<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>`
- ink-ui: `<SelectInput>`, `<TextInput>`, `<Spinner>`, `<Alert>`
- Community: `ink-progress-bar`, `ink-table`, `ink-tab`, `ink-link`

**Limitations:**

- No mouse support — keyboard only
- No WASM compilation — can't become a Zellij plugin
- No built-in scrolling — needs custom viewport component
- Single-pane rendering — splits handled by Zellij/tmux

**Who uses it:** Claude Code, Gemini CLI, GitHub Copilot CLI, Cloudflare Wrangler, Prisma CLI, Shopify CLI.

**Why it fits:** TypeScript-native, React mental model, production-proven, drops into the monorepo with zero friction. For a sidebar + action menu + status display, it has everything needed.

---

## Multiplexer Comparison

| Capability           | tmux                         | Zellij                              |
| -------------------- | ---------------------------- | ----------------------------------- |
| Plugin system        | None (shell scripts)         | Native WASM plugins                 |
| Layout definition    | Custom format, limited       | KDL files with plugin panes         |
| Pane spawning        | `split-window`, `new-window` | `zellij run`, `open_terminal()` API |
| IPC                  | `send-keys`, env vars        | Pipe system (CLI-to-plugin)         |
| Claude Code support  | Official (Agent Teams)       | No official support yet             |
| Ecosystem for agents | All 7 surveyed tools use it  | 1/7 experimental support            |
| UX                   | Steep learning curve         | Built-in keybinding hints           |

**Decision:** Zellij-first (developer's environment, better layout system, future plugin potential), tmux supported via adapter. Both are first-class from day one — the adapter abstraction is trivial.

---

## Configuration

### Global — `~/.oat/panel.json` (or extending `~/.oat/dashboard.json` from March 15 design)

```json
{
  "repos": ["~/Code/open-agent-toolkit", "~/Code/api-service"],
  "multiplexer": "auto",
  "tools": {
    "git": "lazygit",
    "files": "yazi",
    "diff": "delta",
    "editor": "$EDITOR"
  },
  "defaults": {
    "runtime": "claude",
    "isolation": "worktree",
    "baseBranch": "main"
  }
}
```

### Per-repo — `.oat/config.json` (committed, shared)

```json
{
  "dashboard": {
    "setupScript": "pnpm run worktree:init",
    "branchPrefix": "oat/"
  }
}
```

---

## Files in This Research Series

| File                                        | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `2026-03-15-oat-dashboard-design.md`        | March 15 full design spec (control plane + server + web UI)                   |
| `2026-03-15-oat-dashboard.md`               | March 15 TDD implementation plan (26 tasks, 5 chunks)                         |
| `2026-04-03-march15-design-audit.md`        | Delta analysis: what changed in OAT since March 15                            |
| `2026-04-03-control-plane-current-state.md` | **This file** — consolidated current state and options                        |
| `oat-workflow-panel-opus-4-6.md`            | April 3 deep research: landscape analysis, TUI frameworks, IPC, brainstorming |
