---
skill: deep-research
schema: architectural
topic: 'OAT Workflow Panel — TUI interface with interactive workflow triggers'
model: opus-4-6
generated_at: 2026-04-03
depth: standard
---

# OAT Workflow Panel: Feasibility Research

## Executive Summary

Building a TUI panel that displays OAT project state and provides interactive controls to trigger workflow steps is **highly feasible**. The recommended approach is a **TypeScript package using Ink (React for CLI)** running as a standalone process in a Zellij or tmux pane, integrated into the existing OAT monorepo as `packages/panel/`.

**Zellij is the primary multiplexer target**, with tmux supported via adapter. While every existing agent orchestrator builds on tmux, the panel itself is multiplexer-agnostic — it's an Ink TUI process running in a pane, identical in either environment. The only multiplexer-specific code is pane spawning, which is a thin abstraction (~50 lines per adapter). Zellij is primary because: (1) the developer is actively setting it up and will dogfood this path, (2) Zellij layouts (KDL files) let us ship a default `oat-panel.kdl` that auto-configures the sidebar — tmux has no equivalent, (3) Zellij's plugin system leaves the door open for a future native status bar widget, and (4) `zellij run` is a cleaner pane-spawning API than tmux's `split-window`. tmux support costs almost nothing to add and should be first-class from day one.

A landscape analysis of seven existing tools — [tmux-agent-status](https://github.com/samleeney/tmux-agent-status), [claude-squad](https://github.com/smtg-ai/claude-squad), [agtx](https://github.com/fynnfluegge/agtx), [cmux](https://github.com/craigsc/cmux), [opensessions](https://github.com/ataraxy-labs/opensessions), [ntm](https://github.com/Dicklesworthstone/ntm), and [dmux](https://github.com/standardagents/dmux) — reveals converging patterns: filesystem-as-message-bus for state, git worktrees for isolation, and tmux for session management. **agtx stands out** as the closest prior art: a Rust kanban TUI with per-phase agent assignment, TOML plugin system, and MCP-based orchestration. Its phase model (Backlog/Planning/Running/Review/Done) maps naturally to OAT's lifecycle, and its plugin system is generic enough that an OAT plugin could likely work today — but agtx doesn't provide OAT-specific features like HiLL checkpoint gates, skill routing, frontmatter-driven state, or the spec-driven/quick workflow modes. The panel should draw heavily from agtx's kanban UI model while adding native OAT state management.

**The kanban board is the core UI metaphor.** OAT's 5-phase lifecycle (discovery → spec → design → plan → implement) maps naturally to kanban columns, with tasks flowing left-to-right as work progresses. Each column shows phase status, active tasks, blockers, and available actions. HiLL checkpoints appear as gates between columns. This provides an at-a-glance view of where everything is across all active projects. OAT already has a richer state model (`state.md` frontmatter with phase tracking, HiLL checkpoints, blockers, and task progress) that maps naturally to this panel UI. The main gap is the absence of a real-time notification mechanism, which can be bridged with Claude Code hooks and file watching.

**Ghostty** (the user's terminal) has native splits and tabs but no plugin system or general-purpose IPC, so it cannot replace a multiplexer for programmatic pane management. The recommended stack is **Ghostty (terminal) + tmux or Zellij (multiplexer) + OAT panel (TUI in a pane)**.

## Methodology

Twelve research angles were explored in parallel across two waves:

**Wave 1 (6 angles):**

1. **Reference implementation** — Analyzed tmux-agent-status architecture via GitHub
2. **OAT project state model** — Explored `.oat/` structure, `state.md` schema, workflow skills, and CLI commands in the local codebase
3. **Zellij vs tmux** — Researched Zellij plugin API, pipe system, layout format, and community plugins
4. **TUI frameworks** — Compared Ink, ratatui, bubbletea, blessed, Textual, and crossterm
5. **IPC and workflow triggers** — Researched file-based IPC, Unix sockets, Zellij pipes, Claude Code hooks, and pane spawning
6. **Architectural feasibility** — Explored the OAT monorepo structure (Turborepo, pnpm workspaces, build system)

**Wave 2 (6 angles — landscape analysis):** 7. **claude-squad** — Go-based multi-agent tmux orchestrator with unified dashboard 8. **agtx** — Rust kanban TUI with per-phase agent assignment and MCP-based orchestration 9. **cmux** — Bash git-worktree isolator for parallel Claude sessions 10. **opensessions** — TypeScript tmux sidebar with agent status monitoring 11. **ntm** — Go control plane with pipelines, safety policies, and REST/WebSocket API 12. **dmux** — TypeScript worktree-based multi-agent manager with file browser 13. **Ghostty terminal** — Feature assessment for native integration potential

Sources included GitHub repositories, Zellij/tmux documentation, framework docs, and the local OAT codebase.

## Findings

### Decision Framework

**Decision drivers:**

- Integrate with OAT's existing TypeScript ESM monorepo without introducing heavy cross-language build complexity
- Display real-time OAT project state (phase, task progress, blockers, HiLL checkpoints)
- Provide interactive controls to trigger workflow steps (implement, review, next phase)
- Support spawning new terminal panes for agent sessions
- Work with Zellij (primary, developer's environment) and tmux (supported) via a multiplexer adapter

**Constraints:**

- Must not require users to learn a new programming language to contribute
- Must leverage OAT's existing state model (`state.md` frontmatter)
- Should be installable as part of the OAT CLI (`oat panel`)

**Quality attributes:**

- Maintainability (single-language preference)
- User experience (interactive, real-time updates)
- Integration depth (with both OAT state and terminal multiplexer)
- Installation simplicity

### Reference: tmux-agent-status Architecture

The [tmux-agent-status](https://github.com/samleeney/tmux-agent-status) project provides a validated architectural pattern:

- **Pure Bash** — TPM plugin with no compiled dependencies
- **Three-layer architecture**: (1) Agent hooks write status files to `~/.cache/tmux-agent-status/`, (2) a sidebar-collector daemon aggregates state, (3) display layers (sidebar pane, status line, fzf switcher) read aggregated state
- **Filesystem as message bus** — decouples agents from display; any process writing the right file format becomes trackable
- **Hook-driven input** — Claude Code hooks (`UserPromptSubmit`, `PreToolUse`, `Stop`, `Notification`) fire shell scripts that write status files
- **Status values**: `working`, `done`, `wait`, `parked` with precedence rules
- **Features**: per-pane and per-session status, fzf popup switcher, audio completion notifications, multi-agent deploy scripts

**Key takeaway**: The filesystem-as-IPC pattern is proven and simple. OAT can adopt this same pattern but with richer state (phases, tasks, checkpoints) and a more interactive panel.

### OAT Project State Model

OAT projects live in `.oat/projects/<scope>/<project>/` with a well-defined state model:

**Phase lifecycle** (stored in `state.md` frontmatter `oat_phase`):

```
discovery → spec → design → plan → implement
```

Quick mode skips spec/design: `discovery → plan → implement`

**Key state fields for panel display:**

| Field                  | Type   | Purpose                                                  |
| ---------------------- | ------ | -------------------------------------------------------- |
| `oat_phase`            | string | Current phase (discovery\|spec\|design\|plan\|implement) |
| `oat_phase_status`     | string | Phase state (in_progress\|complete\|pr_open)             |
| `oat_workflow_mode`    | string | Execution path (spec-driven\|quick\|import)              |
| `oat_execution_mode`   | string | Implementation variant (single-thread\|subagent-driven)  |
| `oat_current_task`     | string | Currently executing task ID (e.g., "pNN-tNN")            |
| `oat_blockers`         | array  | Active blocker descriptions                              |
| `oat_hill_checkpoints` | array  | Phases requiring human-in-the-loop approval              |
| `oat_hill_completed`   | array  | Completed checkpoint approvals                           |
| `oat_lifecycle`        | string | Project status (active\|paused)                          |

**Transition triggers** come from the `oat-project-next` skill, which reads state and routes to the appropriate phase skill. The panel would need to detect which transitions are available and surface them as actionable buttons.

**No built-in file watching** — OAT state transitions are explicit (skills read/write `state.md` directly) and pull-based (user runs `oat-project-next`). A panel must poll `state.md` or use external notifications (Claude Code hooks).

### Landscape Analysis: Existing Agent Orchestrators

Seven existing tools were analyzed. All are tmux-based. Key patterns and differentiation:

| Tool                                                                | Language   | Multiplexer                | Primary Pattern       | Key Differentiator                                                                   |
| ------------------------------------------------------------------- | ---------- | -------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| [tmux-agent-status](https://github.com/samleeney/tmux-agent-status) | Bash       | tmux                       | Status monitoring     | Filesystem-as-message-bus, hook-driven, sidebar + status bar                         |
| [claude-squad](https://github.com/smtg-ai/claude-squad)             | Go         | tmux                       | Multi-agent dashboard | Unified TUI with preview/diff tabs, git worktree isolation, daemon mode              |
| [agtx](https://github.com/fynnfluegge/agtx)                         | Rust       | tmux                       | Kanban orchestration  | Per-phase agent assignment, MCP server, plugin system (TOML), SQLite state           |
| [cmux](https://github.com/craigsc/cmux)                             | Bash       | None (worktrees only)      | Workspace isolation   | Simplest tool — just worktree + branch + Claude launch                               |
| [opensessions](https://github.com/ataraxy-labs/opensessions)        | TypeScript | tmux (Zellij experimental) | Sidebar companion     | HTTP-driven metadata push, Solid UI, multi-agent-type watching                       |
| [ntm](https://github.com/Dicklesworthstone/ntm)                     | Go         | tmux                       | Control plane         | Pipelines with dependencies, safety policies, approval workflows, REST/WebSocket API |
| [dmux](https://github.com/standardagents/dmux)                      | TypeScript | tmux                       | Worktree manager      | 11+ agent support, built-in file browser, lifecycle hooks                            |

**Converging patterns across the ecosystem:**

- **Git worktrees** for agent isolation (claude-squad, cmux, agtx, dmux)
- **tmux as the universal multiplexer** — every tool uses it; none have production Zellij support
- **Filesystem-based state** — status files, SQLite, or markdown frontmatter
- **Hook-driven notifications** — Claude Code hooks for status transitions
- **TUI dashboard** — most provide a unified view of all agent sessions

**agtx is the strongest prior art for OAT integration:**

- Its 5-column kanban (Backlog → Planning → Running → Review → Done) maps directly to OAT's 5-phase lifecycle (discovery → spec → design → plan → implement)
- Its TOML plugin system defines per-phase commands, prompts, and artifact gates — similar to OAT skills
- Its MCP server (`agtx serve`) exposes board state as JSON-RPC tools, enabling an orchestrator agent to drive the workflow
- Per-phase agent assignment (e.g., Gemini for research, Claude for implementation) aligns with OAT's execution modes
- Cyclic workflows (Review → Planning with phase counter) support OAT's review-receive pattern

**Key insight**: Rather than building from scratch, OAT could integrate with or draw heavily from agtx's architecture — particularly its kanban model, MCP-based orchestration, and plugin system — while adding OAT-specific state management (frontmatter, HiLL checkpoints, skill routing).

### Ghostty Terminal Assessment

Ghostty is the user's terminal emulator. Key findings for integration potential:

- **Built-in multiplexer**: Native splits and tabs with session restoration, but **no scriptable API** for programmatic pane management. The developers have explicitly declined arbitrary command execution from keybindings.
- **No plugin system**: No WASM, no extensions, no custom widgets.
- **Limited IPC**: Platform-native only (D-Bus on Linux, AppleScript on macOS). No general-purpose CLI for controlling splits/tabs programmatically. `ghostty +new-window` exists but is narrow.
- **Good terminal host**: GPU-accelerated, Kitty graphics protocol, shell integration — works well _hosting_ tmux/Zellij sessions but cannot _replace_ them for automation.

**Verdict**: Ghostty is a great terminal to run OAT inside, but the panel must rely on tmux or Zellij for programmatic pane management. Recommended stack: **Ghostty (terminal) + tmux/Zellij (multiplexer) + OAT panel (Ink TUI in a pane)**.

### Kanban Board as Core UI

The panel's primary view should be a **kanban board** showing OAT project state across lifecycle phases. This is inspired by agtx's approach but tailored to OAT's richer state model.

**Conceptual layout (single project view):**

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  Discovery  │    Spec     │   Design    │    Plan     │  Implement  │
│  ✓ complete │  ✓ complete │ → in_prog   │   pending   │   pending   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │ ▸ API layer │             │             │
│             │             │ ▸ Data model│             │             │
│             │             │             │             │             │
│             │             │  ⊘ HiLL     │             │             │
│             │             │  checkpoint │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
  Blockers: none                          Actions: [Approve Design ↵]
  Workflow: spec-driven                   [Open Review Pane] [Pause]
```

**Multi-project dashboard view:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  OAT Projects                                          ↻ 2s ago    │
├──────────────────────────────────────────────────────────────────────┤
│  auth-refactor      ██████████░░░░  Plan (3/7 tasks)    ▸ working  │
│  api-v2-migration   ████████████░░  Implement (5/6)     ▸ working  │
│  docs-overhaul      ██░░░░░░░░░░░░  Discovery           ● waiting  │
├──────────────────────────────────────────────────────────────────────┤
│  [n] New Project  [↵] Open  [i] Implement  [r] Review  [?] Help   │
└──────────────────────────────────────────────────────────────────────┘
```

**Key UI elements:**

- **Phase columns** with status indicators (✓ complete, → in progress, pending)
- **Task cards** within active phase showing current task ID and description
- **HiLL checkpoint gates** shown as barriers between phases requiring approval
- **Blocker alerts** surfaced prominently when `oat_blockers` is non-empty
- **Action buttons** contextually showing valid next steps based on current state
- **Progress bars** for implementation phase (tasks completed / total)
- **Agent status** indicators (working, waiting, done) fed by Claude Code hooks

**OAT phase → kanban column mapping:**

| OAT Phase | Kanban Column | agtx Equivalent         | Available Actions                              |
| --------- | ------------- | ----------------------- | ---------------------------------------------- |
| discovery | Discovery     | Backlog                 | "Start Discovery", "Skip to Plan" (quick mode) |
| spec      | Specification | Planning                | "Write Spec", "Approve Spec" (HiLL)            |
| design    | Design        | Planning                | "Create Design", "Approve Design" (HiLL)       |
| plan      | Plan          | Planning                | "Generate Plan", "Approve Plan" (HiLL)         |
| implement | Implement     | Running → Review → Done | "Implement", "Open Review Pane", "Pause"       |

### agtx Plugin Compatibility Analysis

agtx's TOML plugin system is generic enough to configure for any agent workflow. An OAT plugin would look approximately like:

```toml
[plugin]
name = "oat"
description = "OAT project lifecycle"

[phases.backlog]
display_name = "Discovery"

[phases.planning]
display_name = "Spec → Design → Plan"
command = "claude"
prompt_template = "Run /oat-project-next for project {task_name}"
artifacts = ["plan.md"]  # gate: file must exist to advance

[phases.running]
display_name = "Implement"
command = "claude"
prompt_template = "Run /oat-project-implement for project {task_name}"

[phases.review]
display_name = "Review"
command = "claude"
prompt_template = "Run /oat-project-review for project {task_name}"
```

**What agtx gives us today:**

- Kanban TUI with task lifecycle
- Per-task git worktree isolation
- tmux pane management per task
- MCP server for orchestrator-driven automation
- Multi-agent support (different agents per phase)

**What agtx doesn't give us (and why we still need our own panel):**

- **OAT state awareness** — agtx uses SQLite; OAT uses `state.md` frontmatter. No native parsing of `oat_phase`, `oat_hill_checkpoints`, etc.
- **HiLL checkpoint gates** — agtx has no concept of human-in-the-loop approval barriers between phases
- **Workflow mode switching** — no spec-driven vs quick vs import mode distinction
- **OAT skill routing** — agtx can run commands but doesn't understand `oat-project-next`'s routing logic (boundary tier detection, review safety checks)
- **Multi-phase compression** — agtx maps 1:1 between kanban columns and phases; OAT's spec/design/plan might compress to a single "Planning" column in quick mode
- **Multiplexer flexibility** — agtx is tmux-only; OAT panel targets Zellij-first
- **Monorepo integration** — agtx is a standalone Rust binary; OAT panel should share code with the CLI

**Verdict**: agtx could be used as a lightweight OAT orchestrator _today_ with a TOML plugin, but it would be a "dumb" wrapper — triggering commands without understanding OAT's state machine. The value of building our own panel is native state awareness: the panel _understands_ what phase you're in, what transitions are valid, which checkpoints need approval, and can present contextual actions accordingly.

### Options Analyzed

#### Option A: TypeScript Ink Package in Monorepo

- **Description**: New package at `packages/panel/` using [Ink](https://github.com/vadimdemedes/ink) (React for CLI). Runs as a standalone process in a Zellij/tmux pane via `oat panel` CLI subcommand. Watches `state.md` for changes, spawns panes via `zellij run` / `tmux split-window`.
- **Tradeoffs**:
  - **Pros**: Native TypeScript/ESM fit; zero additional toolchain; shared imports with CLI (config, manifest modules); React component model for UI; proven in production (Claude Code, Gemini CLI, Wrangler all use Ink); Turborepo auto-detects new package
  - **Cons**: No native Zellij plugin integration (runs in a pane, not as a plugin); Ink's widget ecosystem is narrower than ratatui's; cannot be compiled to WASM
- **Constraints it satisfies**: All — single language, monorepo integration, interactive UI, real-time updates via React state
- **Constraints it violates**: None
- **Fit assessment**: Excellent. Lowest integration complexity, fastest iteration, best maintainability
- **Precedent**: Ink is used by Claude Code's own TUI, Gemini CLI, GitHub Copilot CLI, Cloudflare Wrangler

**Conceptual panel UI (Ink/React):**

```tsx
function WorkflowPanel({ project }: { project: OatProject }) {
  const [state, setState] = useState(readState(project));

  // Watch state.md for changes
  useEffect(() => {
    const watcher = fs.watch(project.statePath, () => {
      setState(readState(project));
    });
    return () => watcher.close();
  }, [project]);

  return (
    <Box flexDirection='column'>
      <Text bold>📋 {project.name}</Text>
      <PhaseProgress phases={state.phases} current={state.oat_phase} />
      <TaskList tasks={state.tasks} current={state.oat_current_task} />
      <BlockerList blockers={state.oat_blockers} />
      <ActionButtons
        nextAction={getNextAction(state)}
        onTrigger={(action) => spawnPane(action)}
      />
    </Box>
  );
}
```

#### Option B: Rust Zellij WASM Plugin

- **Description**: Native Zellij plugin written in Rust using `zellij-tile` crate. Renders directly in a Zellij pane via the plugin API. Uses Zellij's pipe system for bidirectional communication.
- **Tradeoffs**:
  - **Pros**: Deepest Zellij integration; can spawn panes via `open_terminal()` API; receives pipe messages natively; WASM sandboxing; can use `HighlightClicked` for interactive regions
  - **Cons**: Requires Rust toolchain in CI/CD; cannot share code with TypeScript CLI; duplicates state parsing logic; Zellij-only (no tmux fallback); steeper learning curve; `wasmi` interpreter is slower than native
- **Constraints it satisfies**: Integration depth, interactive UI
- **Constraints it violates**: Single-language preference, maintainability, multiplexer portability
- **Fit assessment**: High integration quality but high cost. Justified only if Zellij-native behavior is a hard requirement
- **Precedent**: zjstatus (community status bar plugin), zellij-forgot (command reference plugin)

**Zellij plugin API example:**

```rust
impl ZellijPlugin for OatPanel {
    fn load(&mut self, config: BTreeMap<String, String>) {
        subscribe(&[EventType::Timer, EventType::Key, EventType::Mouse]);
        set_timeout(1.0); // poll state every second
    }

    fn update(&mut self, event: Event) -> bool {
        match event {
            Event::Timer(_) => { self.refresh_state(); true }
            Event::Key(Key::Char('i')) => {
                open_terminal_floating(
                    &PathBuf::from("."),
                    None, // default shell
                );
                false
            }
            _ => false
        }
    }

    fn render(&mut self, rows: usize, cols: usize) {
        // Write ANSI-styled text to stdout
        println!("Phase: {} [{}]", self.phase, self.status);
    }
}
```

#### Option C: Hybrid — TypeScript CLI + Thin Zellij Plugin

- **Description**: Core logic in TypeScript (Path A), plus a thin Rust Zellij plugin that acts as a status bar indicator. The plugin communicates with the TypeScript process via Zellij pipes or Unix socket.
- **Tradeoffs**:
  - **Pros**: Best of both worlds — rich Ink UI + native Zellij status bar; TypeScript handles heavy lifting
  - **Cons**: Two integration points to maintain; added build complexity; marginal UX improvement over Path A alone
- **Constraints it satisfies**: Most, with enhanced Zellij integration
- **Constraints it violates**: Adds Rust build dependency
- **Fit assessment**: Medium. Over-engineered for initial release; viable as a Phase 2 enhancement
- **Precedent**: No direct precedent for this hybrid pattern

### Tradeoff Matrix

| Dimension                 | A: Ink (TypeScript)      | B: Zellij WASM (Rust)       | C: Hybrid                  |
| ------------------------- | ------------------------ | --------------------------- | -------------------------- |
| **Monorepo fit**          | ★★★★★ Native             | ★★☆☆☆ Separate toolchain    | ★★★☆☆ Mixed                |
| **Development speed**     | ★★★★★ 2-3 weeks          | ★★☆☆☆ 4-6 weeks             | ★★★☆☆ 3-4 weeks            |
| **Zellij integration**    | ★★★☆☆ Via CLI commands   | ★★★★★ Native plugin API     | ★★★★☆ Plugin + CLI         |
| **tmux support**          | ★★★★☆ Via CLI commands   | ☆☆☆☆☆ None                  | ★★★★☆ Via TypeScript layer |
| **Interactive UI**        | ★★★★☆ Ink components     | ★★★☆☆ Custom ANSI rendering | ★★★★☆ Ink + plugin         |
| **Maintainability**       | ★★★★★ Single language    | ★★☆☆☆ Rust + TS             | ★★★☆☆ Two languages        |
| **Real-time updates**     | ★★★★☆ File watch + hooks | ★★★★★ Pipes + timers        | ★★★★★ Both channels        |
| **Code sharing with CLI** | ★★★★★ Direct imports     | ☆☆☆☆☆ None                  | ★★★★☆ TypeScript layer     |

### Zellij vs tmux Comparison

| Capability               | tmux                              | Zellij                                         |
| ------------------------ | --------------------------------- | ---------------------------------------------- |
| **Plugin system**        | None (shell scripts + hooks)      | Native WASM plugins via `zellij-tile`          |
| **Layout definition**    | Custom format, limited            | KDL files with plugin panes, floating panes    |
| **Pane spawning**        | `split-window`, `new-window`      | `zellij run`, `open_terminal()` API            |
| **IPC**                  | `send-keys`, environment vars     | Pipe system (CLI-to-plugin, plugin-to-plugin)  |
| **Interactive UI**       | Status bar only (text)            | Full pane rendering with mouse/key events      |
| **Plugin isolation**     | None                              | WASM sandboxing                                |
| **Session management**   | Mature, ubiquitous                | Session-manager plugin, resurrection           |
| **Claude Code support**  | Official (Agent Teams)            | No official support (community request #31901) |
| **Ecosystem for agents** | 7/7 tools use it                  | 1/7 experimental support (opensessions)        |
| **Scriptability**        | Battle-tested, decades of tooling | Good CLI, less proven for automation           |
| **UX/Discoverability**   | Steep learning curve              | Built-in keybinding hints per mode             |

**Verdict**: **Zellij-first, tmux-supported.** While every existing agent orchestrator builds on tmux, the panel itself is multiplexer-agnostic — it's an Ink process in a pane. The only multiplexer-specific code is pane spawning, abstracted behind a simple adapter. Zellij is primary because: (1) developer is actively using it and will dogfood this path, (2) KDL layout files let us ship a default `oat-panel.kdl` for automatic sidebar setup, (3) Zellij's plugin system keeps the door open for a future native status bar widget, (4) `zellij run` is a cleaner pane-spawning API. tmux support costs ~50 lines and should be first-class from day one.

```typescript
interface MuxAdapter {
  splitPane(
    command: string,
    opts?: { name?: string; cwd?: string; floating?: boolean },
  ): void;
  listPanes(): PaneInfo[];
  detectMultiplexer(): 'zellij' | 'tmux' | 'none';
}

// Auto-detect: check $ZELLIJ env var, then $TMUX, then fallback
// zellij: zellij run --name "name" -- command
// tmux: tmux split-window -h -t $session "command"
```

**Recommendation**: Target Zellij first (developer's environment, better layout system), support tmux via adapter, design the abstraction layer from day one so both are first-class.

### IPC Architecture

The recommended communication architecture layers multiple mechanisms:

| Layer                           | Mechanism                                 | Purpose                           |
| ------------------------------- | ----------------------------------------- | --------------------------------- |
| **State persistence**           | `state.md` frontmatter                    | Source of truth, survives crashes |
| **State observation**           | `fs.watch()` on `state.md`                | Panel detects changes             |
| **Agent → Panel notifications** | Claude Code `Stop`/`PostToolUse` hooks    | Agent signals completion          |
| **Panel → Multiplexer**         | `zellij run` / `tmux split-window`        | Spawn new agent panes             |
| **Panel → OAT**                 | Direct CLI invocation (`oat project ...`) | Trigger state transitions         |

**Workflow example — user clicks "Implement":**

1. Panel reads `state.md`, determines `implement` is the next valid phase
2. User selects "Implement" button in the panel
3. Panel runs: `zellij run --name "implement" --cwd <project-dir> -- claude --prompt "Run oat-project-implement for <project>"`
4. Claude Code's `Stop` hook fires: `oat panel notify --event=agent-stopped`
5. Panel's `fs.watch()` detects `state.md` change, re-reads and updates UI

**Claude Code hook configuration** (`.claude/settings.json`):

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

### TUI Framework Assessment

| Framework     | Language   | Monorepo Fit | Widget Richness | WASM/Zellij    | Maintenance  |
| ------------- | ---------- | ------------ | --------------- | -------------- | ------------ |
| **Ink**       | TypeScript | ★★★★★        | ★★★★☆           | No             | Very active  |
| **ratatui**   | Rust       | ★★☆☆☆        | ★★★★★           | Not directly\* | Very active  |
| **bubbletea** | Go         | ★★☆☆☆        | ★★★★☆           | No             | Very active  |
| **blessed**   | Node.js    | ★★★☆☆        | ★★★★☆           | No             | Unmaintained |
| **Textual**   | Python     | ★☆☆☆☆        | ★★★★★           | No             | Active       |

\*ratatui cannot be used inside Zellij WASM plugins — Zellij plugins use their own rendering API (`zellij-tile`), not a terminal backend. ratatui works only as a standalone process in a pane.

**Ink is the clear winner** for OAT: native TypeScript, React component model, production-proven, drops into the monorepo with zero friction.

### Risk Considerations

| Risk                                                  | Severity | Likelihood | Mitigation                                                                                                    |
| ----------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Ink widget gaps (no built-in progress bar, tree view) | Low      | Medium     | Use `ink-progress-bar`, `ink-select-input` community packages; custom components are straightforward in React |
| `fs.watch()` reliability across OS                    | Low      | Low        | Use `chokidar` for robust cross-platform file watching                                                        |
| Zellij not installed on user's system                 | Medium   | Medium     | Graceful degradation — panel works standalone, pane spawning requires Zellij/tmux                             |
| State file race conditions (concurrent agent writes)  | Low      | Low        | OAT state writes are serialized through CLI commands; panel is read-only                                      |
| Zellij API breaking changes                           | Low      | Low        | Panel communicates via `zellij` CLI (stable), not plugin API                                                  |

### Recommendation

- **Recommended option**: **Option A — TypeScript Ink Package**
- **Rationale**: Best monorepo fit, fastest development, single-language maintenance, proven framework (Ink), and sufficient integration depth via Zellij CLI commands. The marginal benefit of native Zellij plugin integration (Option B) does not justify the Rust toolchain overhead and code duplication.
- **Conditions**: Ink must remain maintained (high confidence — used by Claude Code, Gemini CLI). Zellij/tmux CLIs must remain stable for pane spawning (high confidence — part of their public APIs).
- **Fallback**: If deeper Zellij integration becomes necessary, pursue Option C (hybrid) as a Phase 2 enhancement — add a thin Rust status-bar plugin (using ratatui + zellij_widgets adapter) while keeping the core logic in TypeScript.
- **Next steps**:
  1. Scaffold `packages/panel/` with Ink, React, and TypeScript
  2. Implement `state.md` frontmatter parser and file watcher (chokidar)
  3. Build kanban board view — phase columns, task cards, HiLL checkpoint gates, progress bars
  4. Build multi-project dashboard view — project list with progress summaries
  5. Implement multiplexer adapter abstraction (Zellij primary, tmux secondary, auto-detect via `$ZELLIJ`/`$TMUX` env vars)
  6. Add `oat panel` CLI subcommand
  7. Implement pane spawning for workflow triggers (`zellij run` / `tmux split-window`)
  8. Configure Claude Code hooks for agent-to-panel notifications
  9. Create default Zellij layout (`layouts/oat-panel.kdl`) with sidebar + main pane
  10. Explore agtx's MCP server pattern for potential orchestrator-to-panel communication

## Brainstorming & Discovery

_This section captures open questions, feature ideas, and design explorations that are still being shaped. Separate from the research findings above._

### Feature Ideas Under Consideration

**Core kanban panel:**

- Kanban board showing OAT project phases as columns with task flow
- Multi-project dashboard with progress bars and agent status
- Contextual action buttons based on current state (Implement, Review, Approve, Pause)
- HiLL checkpoint gates as visual barriers requiring explicit approval
- Blocker alerts surfaced prominently

**Pane management:**

- Spawn new Claude sessions for specific workflow steps in adjacent panes
- Open independent code review in a separate pane
- Attach/detach from running agent sessions
- Auto-layout: `oat panel` configures Zellij layout with sidebar panel + main workspace

**Notifications & awareness:**

- Agent completion notifications (via Claude Code hooks)
- Review feedback alerts (watch `reviews/` directory)
- Idle agent detection (agent waiting for input)
- Optional audio/desktop notifications (like tmux-agent-status)

**Orchestration:**

- MCP server for programmatic board control (inspired by agtx)
- Multi-agent coordination across projects
- Per-phase agent assignment (e.g., different models for research vs implementation)

### Discovery Answers (Round 1)

**Scale & concurrency:**

- 2-5 different repositories at a time, 1-5 OAT projects per repo
- Sometimes focused on one repo with multiple projects, other times spread across repos with 1-2 each
- Implication: **multi-repo, multi-project dashboard is essential**. Single-project kanban is a drill-down view, not the default. Need a repo-aware project hierarchy.

**Automation & triggers:**

- One-click trigger is primary, but actions are **contextual and multi-option** — e.g., after plan completes, user might want to "Implement" OR "Open Review Pane" OR "Pause"
- Notifications always on — badge/alert when next step is ready
- Orchestrator not needed as a separate system — OAT's execution continuation already handles autonomous implementation when desired
- Implication: **action menu, not single button**. Show all valid transitions as selectable options. Notification layer runs independently.

**Views & features (prioritized):**

1. **Diff/preview pane** — see agent changes without switching panes (like claude-squad)
2. **Git branch overview** — branches, worktrees, merge status across projects
3. **Log/activity feed** — scrollable feed of agent actions, state transitions, notifications

**Layout:**

- **Both: sidebar + full-screen toggle**. Sidebar (20-30% width) as default for ambient awareness, expand to full-screen dashboard with a keybinding for detailed interaction.
- **Kanban is NOT the primary view** — it's a drill-down/full-screen view for when you want to see the big picture. The primary interface is a compact sidebar or tab showing project summaries, agent status, and action options. Kanban board is available as a full-screen mode (Ghostty tab or expanded pane).
- Implication: need three rendering modes — (1) **compact sidebar** (project list with status indicators and action shortcuts), (2) **expanded panel** (project detail with phase progress, logs, diff preview), (3) **full-screen kanban** (multi-project board view). Ink components should be responsive to available width.

### Discovery Answers (Round 2)

**Sidebar information density:**

- All of: project + phase + status, next action keybind hints, agent activity, and blockers
- Blockers slightly lower priority but still shown
- Implication: sidebar is **information-dense**, not minimal. Each project line should pack status, progress, agent state, and action hints. Think of it like a compact htop for OAT projects.

**Multi-repo model — THIS IS A KEY REFRAME:**

- The panel is fundamentally a **workspace manager** first, OAT project tracker second
- Left-side panel always shows **workspaces** (repos) and **worktrees** within each — like superset.sh, cmux, codex desktop app, conductor.build
- That workspace panel is the always-on primary navigation surface
- OAT project state is an **additive layer** on top of the workspace view — easy to show/hide
- Implication: **the core product is a workspace/worktree navigator with agent session management.** OAT integration is a feature, not the whole product. This changes the architecture — the base layer is repo/worktree awareness, and OAT state enriches it when `.oat/` exists.

**Diff/preview:**

- Integrate with existing tools: **yazi** (file browser), **lazygit** (git TUI)
- Or use diff viewer patterns from the landscape tools (claude-squad's inline diff)
- Implication: panel should **launch** these tools in panes rather than reimplementing diff viewing. Spawning a lazygit pane for a worktree is more powerful than a built-in diff widget.

**Agent tracking scope:**

- Panel tracks **one project at a time**, switches as user cycles through workspaces/projects
- Not a multi-project simultaneous monitoring dashboard
- Implication: simplifies the design significantly — no need for multiplexed state watching. The active workspace determines what OAT state is displayed. Switching workspace = switching OAT context.

### Revised Architecture Vision

Based on discovery, the product is better described as:

**`oat panel` = Workspace Manager + Agent Session Manager + OAT Workflow Layer**

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

**Layer 1 — Workspace Navigator** (core, always visible):

- List repos and their worktrees (git worktree list)
- Agent status per worktree (working/done/idle via hooks)
- Click/select to focus a workspace → switch multiplexer pane
- Create new worktree + branch + agent session
- Merge worktree back, clean up

**Layer 2 — Agent Session Manager** (core):

- Track which agents are running in which panes
- Spawn new agent sessions (claude, codex, etc.) in new panes
- Attach/detach from sessions
- Launch lazygit, yazi in worktree context

**Layer 3 — OAT Workflow Layer** (additive, toggleable):

- Only appears when selected workspace has `.oat/`
- Shows OAT project state for active workspace
- Phase progress, task tracking, HiLL checkpoints
- Action menu with valid next steps
- Full-screen kanban available as a view mode

### Discovery Answers (Round 3)

**HiLL checkpoint approval flow:**

- Ideal: **file viewer inline** — show the artifact (spec, design, plan) directly in the panel using something like yazi or delta diff view
- Not just a button — user wants to _read_ the artifact before approving, without leaving the panel context
- Implication: panel needs an embedded file viewer or tight integration with a pager/viewer tool. Could render markdown in the expanded panel view, or spawn delta/bat in a preview pane.

**Session resume:**

- **Context-aware resume** — panel knows where the agent stopped (e.g., "implement task p2-t3"), queues the next action, and offers to launch it with the right context pre-loaded
- Implication: panel tracks not just OAT phase but the specific `oat_current_task` value, and can construct a resume prompt. This means reading `state.md` for `oat_current_task` and generating the appropriate `claude --resume` or fresh `claude --prompt "continue oat-project-implement from p2-t3"` command.

**Review flow:**

- **Auto-trigger review-receive** — when review feedback lands in `reviews/`, panel automatically spawns `oat-project-review-receive` without waiting for user action
- Implication: file watcher on `reviews/` directory triggers automated agent spawn. This is the first _autonomous_ behavior — panel acts without user clicking anything. Should have a config toggle for users who prefer manual control.

**Quick actions (all selected):**

1. **Tool launcher** — open lazygit/yazi/editor scoped to selected workspace's worktree
2. **New workspace wizard** — create worktree + branch + agent session in one flow
3. **Smart "Next Step"** — run `oat-project-next` to auto-detect and launch the right phase
4. **Workspace cleanup** — merge worktree branch, clean up worktree, archive OAT project

**Superset.sh as design reference (and why not just use it):**

- [Superset.sh](https://superset.sh) is the closest UX reference — Electron + React desktop app for orchestrating parallel CLI agents across git worktrees
- Its layout matches what we want: workspaces sidebar (Cmd+B), changes/diff panel (Cmd+L), central terminal with splits/tabs, editor launcher (Cmd+O)
- Features: worktree-per-agent isolation, agent-agnostic (Claude/Codex/Gemini/etc.), built-in diff viewer, status monitoring, workspace presets via `.superset/config.json`
- Architecture: Electron + React + TailwindCSS + tRPC + Drizzle ORM, built with Vite/Turborepo/Bun

**Why NOT superset:**

1. **Vendor lock-in** — tied to their decisions on features, direction, and priorities. Can't extend it for OAT-specific workflows.
2. **Electron overhead** — heavy runtime for what's fundamentally a terminal-adjacent tool. User already has Ghostty + Zellij.
3. **No OAT awareness** — no concept of project phases, HiLL checkpoints, skill routing, spec-driven workflows. Would need to be bolted on externally.
4. **Closed ecosystem** — ELv2 license, can't fork and customize deeply.

**Agentastic.dev as additional reference:**

- Native macOS app (Swift) that embeds **libghostty** for GPU-accelerated terminal rendering — not a Ghostty plugin, a standalone app linking Ghostty's library
- Features: 30+ agent support, worktree-per-agent isolation, built-in diff viewer, code editor, browser panel, **kanban board** for organizing worktrees by label with drag-and-drop, fuzzy finder, multi-agent code review
- Layout: panel-based IDE with vertical tabs for worktrees, terminal panes, splits, integrated tooling
- Free but **closed source**, macOS-only — same vendor lock-in concern as superset
- Interesting technical approach: proving that libghostty can be embedded as a terminal rendering component, though this doesn't help us for a cross-platform TUI

**What to steal from superset + agentastic's designs:**

- Workspace sidebar as always-on navigation (repos → worktrees → agent status)
- Toggle-able changes/diff panel
- Keyboard-driven workflow (Cmd+1-9 for workspace switching, splits, etc.)
- Workspace presets/config for setup/teardown scripts
- One-click tool launching (editor, terminal, etc.)

**What we add that superset can't:**

- OAT workflow state awareness (phases, tasks, checkpoints)
- Contextual action menus based on project state machine
- Auto-triggered review-receive flow
- Context-aware session resume
- Terminal-native (runs in Zellij/tmux, no Electron)
- User-owned and extensible

### Discovery Answers (Round 4)

**Subagent visualization:**

- **Aggregate progress only** — show "3/7 tasks done" in the panel, don't expose individual subagent worktrees
- Subagent internals stay within OAT's execution engine; panel is a high-level dashboard, not a process manager
- Implication: panel reads `oat_current_task` and task completion counts from `implementation.md`, doesn't need to track subagent panes or worktrees

**MVP scope:**

- **Thin vertical slice** — basic workspace nav + basic OAT state + basic actions, ship fast and iterate
- Not a workspace-manager-first or OAT-first approach — do a thin cut through all three layers simultaneously
- Implication: MVP includes (1) workspace sidebar with repo/worktree listing, (2) OAT phase indicator for active workspace, (3) one or two action triggers (Next Step, tool launcher), (4) basic agent status from hooks. Iterate from there based on what feels most useful in practice.

### MVP Feature Set (Draft)

Based on all discovery rounds, the thin vertical slice MVP would include:

**Layer 1 — Workspace Navigator (minimal):**

- List repos (from config) and their worktrees (`git worktree list`)
- Agent status indicator per worktree (working/done/idle via Claude Code hooks)
- Select workspace to focus → switch context

**Layer 2 — Agent Session Manager (minimal):**

- Spawn new agent session in a new pane for selected workspace
- Launch lazygit/yazi scoped to selected worktree (tool launcher)

**Layer 3 — OAT Workflow (minimal):**

- Show current phase + phase status for active workspace (reads `state.md`)
- Aggregate task progress for implement phase
- "Next Step" action that runs `oat-project-next`
- File watcher on `state.md` for live updates

**Deferred to v2:**

- Full kanban board view
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

### Discovery Answers (Round 5)

**Repo registration model:**

- **Explicit add, not auto-discover** — you run something like `oat panel add /path/to/repo` and it appears in the panel. Repos don't show up until added.
- Stored in a config file (e.g., `~/.oat/panel.json`)
- Implication: panel needs an `add`/`remove` command and reads from a persistent config. No filesystem scanning magic. Simple, predictable, user-controlled.

**Subagent visualization:**

- **Task progress only** — same display whether single-thread or subagent-driven. Just show task completion counts.
- Panel doesn't need to know about subagent internals, worktrees, or pane assignments.

**Project end-of-lifecycle:**

- **Manual archive** — completed projects stay visible showing state details, PR link, etc. User explicitly archives when ready.
- No auto-cleanup. Completed state is informational, not a trigger for automation.
- Similar to how claude-squad, agtx, and superset handle it — done items persist until dismissed.

**MVP scope confirmation:**

- **Thin vertical slice of both layers** — basic workspace sidebar + basic OAT state, ship fast, iterate together.

### Open Questions (Resolved)

All discovery questions have been answered. The artifact is ready to inform a project plan.

_If new questions emerge during implementation, they'll be captured here._

<!-- Q13 --> **TBD**
<!-- Q14 --> **TBD**
<!-- Q15 --> **TBD**

---

## Sources & References

### Agent Orchestrator Landscape

1. [tmux-agent-status](https://github.com/samleeney/tmux-agent-status) — Bash tmux plugin; filesystem-as-message-bus pattern for agent status
2. [claude-squad](https://github.com/smtg-ai/claude-squad) — Go multi-agent dashboard with preview/diff tabs and git worktree isolation
3. [agtx](https://github.com/fynnfluegge/agtx) — Rust kanban TUI with per-phase agent assignment, MCP server, and TOML plugin system
4. [cmux](https://github.com/craigsc/cmux) — Bash git-worktree isolator for parallel Claude sessions
5. [opensessions](https://github.com/ataraxy-labs/opensessions) — TypeScript tmux sidebar with HTTP-driven agent status monitoring
6. [ntm](https://github.com/Dicklesworthstone/ntm) — Go control plane with pipelines, safety policies, and REST/WebSocket API
7. [dmux](https://github.com/standardagents/dmux) — TypeScript worktree-based multi-agent manager with built-in file browser

### Terminal & Multiplexer

8. [Zellij Plugin System](https://zellij.dev/documentation/plugins.html) — WASM plugin API, pipe system, layout format
9. [Zellij Pipe System](https://zellij.dev/documentation/plugin-pipes.html) — CLI-to-plugin and plugin-to-plugin messaging
10. [Zellij CLI Actions](https://zellij.dev/documentation/cli-actions) — Pane management commands
11. [zjstatus](https://github.com/dj95/zjstatus) — Community Zellij status bar plugin
12. [Ghostty](https://ghostty.org/docs/features) — Terminal emulator features and IPC limitations
13. [Ghostty Scripting Discussion](https://github.com/ghostty-org/ghostty/discussions/2353) — Developer stance on programmatic control
14. [Zellij support request for Claude Code](https://github.com/anthropics/claude-code/issues/31901)

### TUI Frameworks

15. [Ink](https://github.com/vadimdemedes/ink) — React for interactive command-line apps (TypeScript)
16. [ratatui](https://github.com/ratatui/ratatui) — Rust TUI framework
17. [zellij-tile crate](https://docs.rs/zellij-tile) — Rust SDK for Zellij plugins
18. [bubbletea](https://github.com/charmbracelet/bubbletea) — Go Elm-architecture TUI framework

### OAT Codebase

19. `packages/cli/src/commands/state/generate.ts` — State aggregation logic
20. `.agents/skills/oat-project-next/SKILL.md` — Workflow routing algorithm
21. `.oat/projects/shared/remote-project-management/state.md` — Example project state

### Integration

22. [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — Hook system for agent lifecycle events
23. [Node.js fs.watch](https://nodejs.org/api/fs.html#fswatchfilename-options-listener) — File watching API
