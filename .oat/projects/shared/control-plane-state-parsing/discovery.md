---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-08
oat_generated: false
---

# Discovery: control-plane-state-parsing

## Initial Request

Build a pure TypeScript control plane library (`packages/control-plane/`) that parses OAT project state from markdown artifacts into structured data, and expose that structured data via CLI commands that return JSON. This is the foundational "read" layer of the OAT control plane — enabling skills to get project state with a single CLI call instead of doing 5-8 file reads, and providing the JSON endpoints that future UI surfaces (Zellij plugin, browser dashboard, Superset extension) will consume.

## Solution Space

### Approach 1: Separate `packages/control-plane/` library (Recommended)

**Description:** Scaffold a new `@open-agent-toolkit/control-plane` package in the monorepo. Build state parsing, task progress extraction, review aggregation, and skill recommendation as a pure TypeScript library with typed exports. The CLI imports it and exposes the data via `oat project status --json` and related commands.

**When this is the right choice:** When you know you'll have multiple consumers (CLI, Ink TUI, web dashboard, extensions) and want a clean library boundary from the start. The design work for this library is already done (March 15 spec + April 3 audit).

**Tradeoffs:** Requires new package scaffolding, build config, workspace wiring. Slightly more upfront work than building directly in the CLI. But the design is already done and the monorepo scaffolding is routine.

### Approach 2: Build directly in `packages/cli/`

**Description:** Add the state parsing and aggregation code as modules within the existing CLI package. Extract to a separate package later when a second consumer exists.

**When this is the right choice:** When you want the fastest path to a working CLI command and are uncertain about whether the library boundary will actually be needed.

**Tradeoffs:** Faster to ship initially, but creates coupling between library logic and CLI-specific code. Extraction later requires refactoring.

### Chosen Direction

**Approach:** Separate `packages/control-plane/` library
**Rationale:** The design is already done across 5 research documents. The three-layer architecture (control plane → server → UI) has been validated through competitive analysis and 5 rounds of brainstorming. Starting with the clean library boundary avoids a future extraction. The CLI becomes a thin consumer.
**User validated:** Yes — confirmed in this session.

## Options Considered

### Option A: Full YAML parsing via `yaml` package

**Description:** Parse state.md frontmatter using the `yaml` npm package (v2.8.2, already a dependency) into a full structured object, rather than the current regex-based field-by-field extraction.

**Pros:**

- Handles nested YAML, arrays, quoted strings correctly
- Already used in the codebase for agent/rule canonical parsing
- Produces a typed object in one parse call

**Cons:**

- Slightly more overhead than regex for single-field lookups (negligible for this use case)

### Option B: Keep regex-based field extraction

**Description:** Continue using `getFrontmatterField()` regex pattern for state parsing.

**Pros:**

- Works for simple key-value fields
- Already exists in shared utilities

**Cons:**

- Fragile with complex YAML (arrays, nested objects, quoted strings)
- Requires separate handling for JSON-encoded fields like `oat_blockers`
- Can't produce a structured object in one pass

**Chosen:** A — Full YAML parsing

**Summary:** The control plane needs to parse full frontmatter blocks into typed objects (not individual fields). YAML parsing is the right tool, and the dependency already exists.

## Key Decisions

1. **Package location:** `packages/control-plane/` as `@open-agent-toolkit/control-plane` — consistent with the `@open-agent-toolkit` scope used by all publishable packages.
2. **Scope: read-only state layer only.** No file watching, no session detection, no dispatch, no worktree management. Those are Phase 2+ of the control plane (per the April 3 phasing plan). This project delivers the state parsing core + CLI commands.
3. **CLI commands:** Three new commands: `oat project status --json` (full project snapshot), `oat project list --json` (all projects with summary state), `oat config dump --json` (merged config from all sources).
4. **Skill recommender included:** The "what should I do next?" logic from `oat-project-next` will be ported into the control plane as a pure function, so the CLI can return the recommended next skill as part of the status JSON. This eliminates the most complex repeated logic across skills.
5. **Private package initially:** Ships as `private: true` in the monorepo. Can be made publishable later when external consumers exist.
6. **Upgrade from regex to YAML parsing:** Use `yaml` package for frontmatter parsing instead of regex-based `getFrontmatterField()`. The control plane needs structured objects, not individual field lookups.
7. **Reuse existing CLI config loading:** Import and reuse `readOatConfig()`, `readOatLocalConfig()`, etc. from CLI's config module rather than reimplementing. Share via internal workspace dependency.

## Constraints

- Must follow existing monorepo conventions: TypeScript ESM, `"type": "module"`, Turborepo build, pnpm workspaces, `workspace:*` for internal deps.
- CLI commands must support the existing `--json` flag convention for structured output.
- Frontmatter schema must match the current `state.md` template exactly — no schema changes in this project.
- The control plane must be a pure library with no CLI, UI, or server dependencies. It takes file paths and returns typed objects.
- Must handle the full post-implementation routing state machine (6-step router from `oat-project-next`) for accurate skill recommendations.
- Must handle all three workflow modes (spec-driven, quick, import) and their different phase sequences.

## Success Criteria

- `oat project status --json` returns a complete `ProjectState` JSON blob including: phase, phase status, workflow mode, execution mode, task progress (completed/total/current), review status, HiLL gate state, blockers, PR status, timestamps, artifact statuses, and recommended next skill.
- `oat project list --json` returns all projects under the configured projects root with summary state per project.
- `oat config dump --json` returns the fully resolved config merging shared, local, and env sources.
- Skills can replace their 30-line bootstrap boilerplate (resolve project, read state, validate prerequisites) with a single `oat project status --json` call.
- All existing `oat state refresh` functionality continues to work (it can optionally use the control plane internally).

## Out of Scope

- File watching / live state updates (Phase 2: Ink TUI)
- Session detection (finding running claude/codex processes)
- Dispatch (launching agent sessions in Zellij/tmux panes)
- Worktree management
- Dashboard server (HTTP + WebSocket)
- Web UI (React + Tailwind)
- Ink TUI
- Skill registry (parsing all skills from `.agents/skills/`) — the recommender uses hardcoded routing logic, not dynamic skill discovery
- Config mutations — this project is read-only

## Deferred Ideas

- **`oat project diff --json`** — Compare current state to a previous snapshot for change detection. Useful for webhooks / CI integration.
- **`oat project history --json`** — Timeline of state transitions from git history of state.md.
- **WebSocket push from file watcher** — Phase 2 of the control plane, needed for live UI.
- **Skill registry as data** — Parse all `.agents/skills/` into a queryable registry. Useful for the dashboard but not needed for CLI state commands.

## Prior Art / Research References

Extensive prior research exists in `.oat/repo/research/`:

1. `2026-03-15-oat-dashboard-design.md` — Full three-layer design spec with typed interfaces
2. `2026-03-15-oat-dashboard.md` — 26-task TDD implementation plan
3. `oat-workflow-panel-opus-4-6.md` — Competitive landscape (9 tools), Ink TUI eval, IPC architecture, brainstorming (5 rounds)
4. `2026-04-03-control-plane-current-state.md` — Consolidated current state and phasing plan
5. `2026-04-03-march15-design-audit.md` — Delta analysis: 39 commits since March 15, type updates needed

The `ProjectState` interface from the March 15 design (updated per the April 3 audit) is the canonical type definition for this project.

## Assumptions

- The `yaml` package (v2.8.2) handles all OAT frontmatter correctly, including the JSON-encoded array fields (`oat_blockers`, `oat_hill_checkpoints`, etc.).
- The CLI's existing config loading code (`oat-config.ts`) can be imported by the control plane package via workspace dependency without circular dependencies.
- The post-implementation routing logic in `oat-project-next` skill is stable enough to port as a pure function. If the skill routing changes, the control plane function must be updated in lockstep.

## Risks

- **Routing logic drift:** The skill recommender in the control plane duplicates logic from `oat-project-next`. If one is updated without the other, recommendations will diverge.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** The control plane becomes the single source of truth for routing. `oat-project-next` can be updated to call the control plane function instead of reimplementing. This is a follow-up refactor, not a blocker.

## Next Steps

Proceed to plan generation. The scope is well-defined with clear module boundaries from the prior design work. No architecture decisions remain — the types, structure, and phasing are established.
