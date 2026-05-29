# OAT Decision Record (Internal / Dogfood)

Track notable decisions made while evolving OAT in this repo, so future sessions have quick, reliable context.

## Decision Index

| ID      | Date       | Status   | Title                                                                                                  |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------ |
| ADR-001 | 2026-01-30 | accepted | Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration                        |
| ADR-002 | 2026-01-31 | accepted | Standardize user-facing progress indicators in OAT skills                                              |
| ADR-003 | 2026-01-31 | accepted | Add `create-oat-skill` to keep OAT skill conventions consistent                                        |
| ADR-004 | 2026-01-31 | accepted | Defer active-project name-only migration until CLI owns project commands                               |
| ADR-005 | 2026-02-14 | accepted | Use skill-first invocation language; treat `/oat:*` as optional host alias                             |
| ADR-006 | 2026-02-16 | accepted | Add quick/import workflow lanes with canonical plan normalization and mode-aware routing               |
| ADR-007 | 2026-02-16 | accepted | Split project-scoped review from ad-hoc review and default non-project artifacts to local-only storage |
| ADR-008 | 2026-02-16 | accepted | Use explicit provider config with config-aware sync remediation for worktree-safe interop              |
| ADR-009 | 2026-02-16 | accepted | Centralize spec-driven/quick/import plan semantics in `oat-project-plan-writing`                       |
| ADR-010 | 2026-02-17 | accepted | Introduce `.oat/config.json` for new non-sync settings and phase broader consolidation                 |
| ADR-011 | 2026-02-17 | accepted | Make worktree-root resolution deterministic and default `worktrees.root` to repo-local `.worktrees`    |
| ADR-012 | 2026-02-22 | accepted | Adopt config-local lifecycle state for active/paused project context                                   |
| ADR-013 | 2026-02-22 | accepted | Standardize `oat project open/pause` lifecycle semantics                                               |
| ADR-014 | 2026-03-07 | accepted | New CLI commands use `--dry-run` convention; defer CLI-wide flip                                       |
| ADR-015 | 2026-04-09 | accepted | Introduce `@open-agent-toolkit/control-plane` as the read-only OAT state layer                         |
| ADR-016 | 2026-04-10 | accepted | Add `workflow.*` preference keys with 3-layer resolution and per-repo-vs-personal surface guidance     |
| ADR-017 | 2026-05-02 | accepted | Generalize pack default-scope via `PACK_METADATA` rather than hardcoding `brainstorm`-specific paths   |
| ADR-018 | 2026-05-25 | accepted | Make OAT dispatch ceiling authoritative and treat Codex provider default as informational              |
| ADR-019 | 2026-05-29 | accepted | Reshape dispatch ceiling as a provider-neutral intent (presets + adapter registry); refines ADR-018    |

## Decisions

### ADR-001: Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration

- **Date:** 2026-01-30
- **Status:** accepted
- **Drivers:** Avoid breaking existing skills that assume `.oat/active-project` contains a full path; keep dogfood v1 stable while we iterate on projects-root and multi-project workflows.
- **Related:**
  - `.oat/repo/reference/roadmap.md`
  - `.oat/projects-root`

#### Context

We considered migrating `.oat/active-project` from storing a full project path to storing only a project name (resolved at runtime via `{PROJECTS_ROOT}/{name}`).

However, existing `oat-*` skills currently read `.oat/active-project` as a path. Flipping the write format in one place would silently break other skills and create hard-to-debug “wrong project” behavior.

#### Options Considered

1. **Write name-only now** and update only the new tooling to support it
2. **Keep writing path** for dogfood v1, allow new tooling to read both formats, and treat name-only migration as a coordinated follow-up

#### Decision

For dogfood v1:

- **Canonical write format:** `.oat/active-project` stores a **full path** to the active project directory.
- **Read behavior (new tooling):** May accept either:
  - Legacy full path (canonical for v1)
  - Name-only (future), resolved via `.oat/projects-root` / `OAT_PROJECTS_ROOT`
- **Migration:** Name-only becomes a separate coordinated update that must update every skill’s “resolve active project” logic before flipping writes.

#### Consequences

- Positive:
  - Prevents breaking existing skills during dogfooding.
  - Enables incremental adoption of projects-root and future pointer formats.
- Negative / trade-offs:
  - If `{PROJECTS_ROOT}` changes, existing path pointers may become invalid until user re-selects/clears the active project.
  - Name-only pointer benefits (root-stable pointer) are delayed until the coordinated migration ships.

#### Follow-ups

- When ready, implement a coordinated name-only migration:
  - Centralize “resolve active project” logic (or update all skills consistently)
  - Flip `.oat/active-project` writes to name-only only after the read side is fully updated
  - Document the migration and compatibility window

---

### ADR-002: Standardize user-facing progress indicators in OAT skills

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Reduce “silent work” confusion during dogfooding; make long-running skills feel alive; align with GSD-style UX without adding noise.
- **Related:**
  - `.oat/repo/archive/workflow-user-feedback.md`
  - `.oat/repo/reference/current-state.md`

#### Decision

OAT skills should provide lightweight, consistent progress feedback:

- A prominent **separator banner** at the start of the skill: `OAT ▸ {LABEL}`
- A small number of **step indicators** (2–5) for multi-step work (finalize/commit paths)
- For **long-running operations** (tests, builds, large diffs, subagents), print a brief “starting…” line and a matching “done” line (duration optional)

#### Consequences

- Positive:
  - Users can tell the workflow is progressing after they confirm.
  - Improves trust without forcing verbose per-command logging.
- Trade-offs:
  - This is guidance only; enforcement requires linting/validation later if we want stronger guarantees.

---

### ADR-003: Add `create-oat-skill` to keep OAT skill conventions consistent

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid convention drift across new `oat-*` skills; keep skill authoring consistent without duplicating the entire `create-agnostic-skill` guidance.
- **Related:**
  - `.agents/skills/create-skill/SKILL.md`
  - `.agents/skills/create-oat-skill/SKILL.md`

#### Decision

Add a `create-oat-skill` skill as a specialization of `create-agnostic-skill`:

- `create-oat-skill` explicitly references baseline guidance from `create-agnostic-skill`.
- It adds OAT-specific requirements via a template (banner separators, progress indicators, `{PROJECTS_ROOT}` + `.oat/active-project` resolution, and safe bash patterns).

#### Consequences

- Positive:
  - Faster, more consistent creation of new OAT skills.
  - Less copy/paste of conventions into every new skill.
- Trade-offs:
  - Two “skill creation” skills exist; users need simple routing guidance (e.g., “if it’s an `oat-*` skill, use `create-oat-skill`”).

---

### ADR-004: Defer active-project name-only migration until CLI owns project commands

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid cross-skill coordination risk while we start the CLI; keep dogfood stable; let the CLI become the canonical interface for project creation/selection.
- **Related:**
  - `.oat/repo/reference/roadmap.md`
  - `.oat/repo/reference/current-state.md`
  - `oat state refresh` CLI command (reads both formats)

#### Decision

For dogfood v1 (until CLI project commands exist):

- **Write format remains path-based:** `.oat/active-project` stores a full path.
- **Read behavior stays flexible for new tooling:** where safe, tooling may accept either:
  - full path (current canonical)
  - name-only (future), resolved via `{PROJECTS_ROOT}/{name}`
- **Migration is deferred:** we will not flip `.oat/active-project` to name-only writes until the CLI provides:
  - `oat project new/open` (or equivalent)
  - a coordinated rollout that updates all skills’ “resolve active project” logic first.

#### Consequences

- Positive:
  - Reduces risk of “wrong project” behavior while we iterate quickly.
  - Keeps the pointer migration aligned with the CLI architecture.
- Trade-offs:
  - Path pointers can break if `{PROJECTS_ROOT}` moves; users may need to re-open the project.

---

### ADR-005: Use skill-first invocation language; treat `/oat:*` as optional host alias

- **Date:** 2026-02-14
- **Status:** accepted
- **Drivers:** Reduce cross-client confusion and workflow drift. Slash-style invocations (`/oat:*`) are not guaranteed across hosts, while skill names (`oat-*`) are the canonical workflow contract.
- **Related:**
  - `.oat/templates/plan.md`
  - `.oat/repo/reference/roadmap.md`
  - `.oat/repo/reference/backlog/index.md`

#### Context

OAT documentation and skill guidance frequently used slash command text as if universally available. In practice, slash commands depend on host/client wiring (for example, Codex may require prompt wrappers). This creates inconsistent operator expectations and avoidable friction.

#### Options Considered

1. Keep slash-first wording and document exceptions per host
2. Use skill-first wording everywhere, with slash command as optional alias where supported
3. Require wrapper generation for every host/client to preserve slash-first wording

#### Decision

Adopt option 2:

- **Canonical invocation contract:** skill names (for example, `oat-project-implement`).
- **Slash commands:** treated as optional host-specific aliases, documented only as "where slash prompts are supported."
- **Optional enhancement (not required):** support generation of thin Codex prompt wrappers (`.codex/prompts`) for users who explicitly opt in during skill sync.

#### Consequences

- Positive:
  - One clear invocation model across clients.
  - Lower risk of instructions failing in environments without slash-command wiring.
  - Cleaner separation between workflow semantics (skills) and host UX affordances (slash aliases).
- Negative / trade-offs:
  - Requires a docs/template/skill copy update sweep.
  - Short-term mixed wording may exist until migration is complete.

#### Follow-ups

- Update OAT templates, skills, and internal references to skill-first wording.
- Add a lightweight validation check to catch regressions to slash-only wording.
- Evaluate optional Codex wrapper generation after wording normalization lands.

---

### ADR-006: Add quick/import workflow lanes with canonical plan normalization and mode-aware routing

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Support lower-touch execution for plan-first workflows from providers (Codex/Cursor/Claude) while preserving OAT state and review/PR tooling.
- **Related:**
  - `.agents/skills/oat-project-quick-start/SKILL.md`
  - `.agents/skills/oat-project-import-plan/SKILL.md`
  - `.agents/skills/oat-project-promote-spec-driven/SKILL.md`
  - `.oat/templates/state.md`
  - `.oat/templates/plan.md`

#### Context

OAT's spec-driven lifecycle (`discover -> spec -> design -> plan -> implement`) provides strong structure but is heavy for quick changes and externally-authored plans. We need a lightweight path that still keeps `plan.md`/`implementation.md`/`state.md` as the system of record.

#### Options Considered

1. Keep spec-driven lifecycle only (no quick/import support)
2. Add quick/import entry lanes that normalize into canonical OAT `plan.md`
3. Keep imported provider plans as non-canonical artifacts and teach all downstream skills new formats

#### Decision

Adopt option 2:

- Add `oat-project-quick-start` for quick lane projects.
- Add `oat-project-import-plan` for external markdown plan ingestion.
- Preserve imported source at `references/imported-plan.md`; canonical execution artifact remains `plan.md`.
- Add `oat-project-promote-spec-driven` for in-place promotion to spec-driven lifecycle.
- Keep quick mode discovery-first: synthesize/backfill `discovery.md` from session context and only create a separate `design.md` when the available technical detail justifies it.
- Introduce metadata:
  - `state.md`: `oat_workflow_mode` (`spec-driven|quick|import`), `oat_workflow_origin` (`native|imported`)
  - `plan.md`: `oat_plan_source` (`spec-driven|quick|imported`) plus import traceability fields.
- Make `oat-project-progress`, review, PR, and dashboard recommendations mode-aware.

#### Consequences

- Positive:
  - Lower setup friction for quick and imported workflows.
  - Reuses existing implementation/review/PR machinery.
  - Maintains a single canonical plan format for downstream skills.
- Trade-offs:
  - Mode-aware branching increases contract complexity across skills.
  - Quick/import projects may have reduced assurance when `spec.md`/`design.md` are absent.

#### Follow-ups

- Validate mode-aware behavior with dogfood projects.
- Consider thin CLI wrappers for quick/import project bootstrap after contracts stabilize.
- Keep optional provider-specific parsing enhancements deferred until demand warrants deeper normalization.

---

### ADR-007: Split project-scoped review from ad-hoc review and default non-project artifacts to local-only storage

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Avoid forcing project lifecycle assumptions on ad-hoc review requests; reduce accidental source-control churn for local-only review artifacts.
- **Related:**
  - `.agents/skills/oat-project-review-provide/SKILL.md`
  - `.agents/skills/oat-review-provide/SKILL.md`
  - `.agents/skills/oat-review-provide/scripts/resolve-review-output.sh`
  - `docs/oat/workflow/reviews.md`

#### Context

`oat-project-review-provide` assumes active project state (`.oat/active-project` + project `state.md`) and writes artifacts into project-local `reviews/`. This is correct for lifecycle-managed work, but fails for users who want review of arbitrary commit ranges, staged/unstaged diffs, or pre-existing files outside a project flow.

#### Options Considered

1. Keep a single project-scoped review skill and attempt to infer fallback behavior when state is missing
2. Split into project-scoped and ad-hoc review skills, with explicit routing and storage policy
3. Force users to initialize/open a project before any review can run

#### Decision

Adopt option 2:

- Keep `oat-project-review-provide` project-scoped and require valid project state.
- Add `oat-review-provide` for ad-hoc/non-project review scopes.
- For ad-hoc artifacts, default storage to local-only `.oat/projects/local/orphan-reviews/`.
- If `.oat/repo/reviews/` already exists and is not gitignored, treat that as explicit tracked-storage intent.
- Allow explicit override to tracked/custom destination or inline-only output.

#### Consequences

- Positive:
  - Clearer contracts: project lifecycle review vs ad-hoc review are no longer conflated.
  - Lower risk of unintentionally committing transient review artifacts.
  - Better support for real-world review requests (branch range, staged/unstaged, explicit files).
- Trade-offs:
  - Additional skill to document and maintain.
  - Review guidance must explicitly route users when project state is missing.

#### Follow-ups

- Add ad-hoc receive/intake flows (`oat-review-receive`, PR-comment ingestion) when ready.
- Keep project review and ad-hoc review templates aligned on severity model and output shape.

---

### ADR-008: Use explicit provider config with config-aware sync remediation for worktree-safe interop

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Directory-detection-only provider activation caused inconsistent sync behavior across fresh worktrees and made provider intent implicit/fragile.
- **Related:**
  - `packages/cli/src/commands/init/index.ts`
  - `packages/cli/src/commands/sync/index.ts`
  - `packages/cli/src/commands/providers/set/index.ts`
  - `docs/oat/cli/provider-interop/config.md`

#### Context

When provider directories did not yet exist in a new worktree, sync behavior depended on ambient filesystem state rather than explicit user intent. This made setup brittle and caused avoidable mismatch warnings and manual remediation churn.

#### Options Considered

1. Keep provider activation purely detection-based
2. Add explicit provider config (`.oat/sync/config.json`) and teach init/sync to reconcile mismatches
3. Force users to manually edit config files and re-run sync

#### Decision

Adopt option 2:

- Persist project provider intent in `.oat/sync/config.json` (`providers.<name>.enabled`).
- Prompt for supported providers during `oat init --scope project` (interactive path).
- Add `oat providers set --scope project` for explicit enable/disable management.
- Make `oat sync --scope project` config-aware and provide deterministic mismatch remediation:
  - interactive selection in TTY mode
  - warning + exact remediation command in non-interactive mode.
- Standardize worktree bootstrap on `pnpm run worktree:init`.

#### Consequences

- Positive:
  - Provider activation is explicit and reproducible across worktrees.
  - Fresh worktrees can bootstrap sync cleanly even when provider roots are absent.
  - Less ambiguity between detected vs intended providers.
- Negative / trade-offs:
  - Additional configuration surface to maintain/document.
  - Requires clear guidance for interactive vs non-interactive remediation behavior.

#### Follow-ups

- Add lifecycle-completeness command(s) for uninstall/remove flows.
- Expand provider capability matrix and troubleshooting docs.

---

### ADR-009: Centralize spec-driven/quick/import plan semantics in `oat-project-plan-writing`

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Plan-writing logic diverged across skills and required repeated fixes when routing/review semantics changed.
- **Related:**
  - `.agents/skills/oat-project-plan-writing/SKILL.md`
  - `.agents/skills/oat-project-plan/SKILL.md`
  - `.agents/skills/oat-project-quick-start/SKILL.md`
  - `.agents/skills/oat-project-import-plan/SKILL.md`
  - `.agents/skills/oat-project-review-receive/SKILL.md`

#### Context

Spec-driven planning, quick-mode planning, and imported-plan normalization all touched `plan.md` with overlapping but non-identical rules. This increased drift risk and made mode-aware routing hard to keep consistent.

#### Options Considered

1. Keep per-skill duplicated plan-writing instructions
2. Introduce a canonical shared plan-writing skill and reference it from dependent skills
3. Move plan writing to ad-hoc scripts without a documented contract

#### Decision

Adopt option 2:

- Add `oat-project-plan-writing` as the canonical plan contract for `spec-driven|quick|import` modes.
- Update dependent skills to route through/shared-reference this contract.
- Standardize plan status transitions and mode-aware guardrails (including resume behavior and stop-and-route semantics).

#### Consequences

- Positive:
  - Single source of truth for plan semantics.
  - Faster updates when mode contracts evolve.
  - Reduced inconsistency across planning/import/review flows.
- Negative / trade-offs:
  - Adds one more dependency skill to maintain.
  - Requires discipline so future skills do not reintroduce duplicated plan rules.

#### Follow-ups

- Keep `oat-project-plan-writing` coverage in skill validation checks.
- Continue aligning downstream skills when plan metadata contracts evolve.

---

### ADR-010: Introduce `.oat/config.json` for new non-sync settings and phase broader consolidation

- **Date:** 2026-02-17
- **Status:** accepted
- **Drivers:** Avoid configuration-file sprawl in `.oat/` while preserving backward compatibility for active workflow skills.
- **Related:**
  - `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
  - `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/`
  - `.oat/repo/reference/backlog/index.md`
  - `.oat/sync/config.json`

#### Context

While defining the worktree skill, we needed a persisted root setting for worktree location. Adding another single-purpose pointer file (for example, `.oat/worktrees-root`) would increase `.oat/` surface fragmentation alongside existing pointer files.

At the same time, existing skill contracts depend on current pointer/sync files, so an immediate full migration to one unified config surface would be higher risk than needed for the current scope.

#### Options Considered

1. Add another single-purpose text file (for example, `.oat/worktrees-root`)
2. Introduce `.oat/config.json` now for new non-sync settings and keep existing files stable
3. Immediately migrate all `.oat` pointers/config to a single consolidated config file

#### Decision

Adopt option 2:

- Introduce `.oat/config.json` as the canonical home for **new non-sync** repo-level settings.
- First key: `worktrees.root` (phase A).
- Do **not** add `.oat/worktrees-root`.
- Keep existing v1 files unchanged for now:
  - `.oat/active-project`
  - `.oat/active-idea`
  - `.oat/projects-root`
  - `.oat/sync/config.json`
- Track broader consolidation as phased follow-up backlog work (phase B/C), rather than forcing immediate migration.

#### Consequences

- Positive:
  - Prevents continued growth of one-off text files for new settings.
  - Creates a clear path to eventual consolidation without breaking current skills.
  - Keeps worktree feature scope contained while still improving config hygiene.
- Negative / trade-offs:
  - OAT config remains split across multiple files during transition.
  - Requires clear docs to avoid ambiguity about which file owns which setting.

#### Follow-ups

- Add/maintain phased backlog work for broader config consolidation.
- Define migration sequencing and compatibility reads before moving existing pointers into `.oat/config.json`.
- Revisit whether sync config should remain under `.oat/sync/config.json` or move in a future CLI-owned migration.

---

### ADR-011: Make worktree-root resolution deterministic and default `worktrees.root` to repo-local `.worktrees`

- **Date:** 2026-02-17
- **Status:** accepted
- **Drivers:** Remove ambiguity in worktree root selection and keep default worktree artifacts isolated to the repo by default.
- **Related:**
  - `.agents/skills/oat-worktree-bootstrap/SKILL.md`
  - `.oat/config.json`
  - `.oat/repo/reference/current-state.md`

#### Context

The initial worktree bootstrap contract allowed multiple candidate roots, but did not make "first match wins" ordering explicit. In mixed environments (for example, both repo-local and sibling worktree roots existing), this made behavior harder to predict and explain.

We also needed a stable default for `worktrees.root` after introducing `.oat/config.json` phase-A ownership.

#### Options Considered

1. Keep loosely-defined candidate scanning and rely on implementation detail ordering
2. Define strict ordered precedence and stop at first match; set repo-local default
3. Require explicit `--path` for all worktree operations

#### Decision

Adopt option 2:

- Define strict precedence for worktree root resolution in `oat-worktree-bootstrap`:
  1. `--path`
  2. `OAT_WORKTREES_ROOT`
  3. `.oat/config.json` -> `worktrees.root`
  4. first existing root in ordered candidates (`.worktrees`, `worktrees`, `../<repo>-worktrees`)
  5. fallback `../<repo>-worktrees`
- Treat precedence level 4 as ordered first-match behavior (no continued scanning after a match).
- Set repo default `worktrees.root` to `.worktrees`.

#### Consequences

- Positive:
  - Predictable root selection across environments.
  - Better local isolation by default (`.worktrees` under repo root).
  - Clearer docs and fewer bootstrap surprises.
- Negative / trade-offs:
  - Repo-local defaults require ignore hygiene for `.worktrees` in repositories that track strict clean status.
  - Teams with existing sibling-root conventions may need to override via config/env/flag.

#### Follow-ups

- Keep current-state/roadmap docs aligned with the precedence contract.
- Preserve non-breaking override paths (`--path`, env, config) for repos with different conventions.

---

### ADR-012: Adopt config-local lifecycle state for active/paused project context

- **Date:** 2026-02-22
- **Status:** accepted
- **Supersedes:** ADR-001, ADR-004
- **Drivers:** Remove pointer-file churn, support worktree-safe project context, and align lifecycle state with CLI-managed config interfaces.
- **Related:**
  - `.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md`
  - `.oat/config.json`
  - `.oat/config.local.json`
  - `packages/cli/src/config/oat-config.ts`

#### Context

Earlier ADRs intentionally kept `.oat/active-project` path-based while deferring migration until CLI project commands existed. With `oat config` and lifecycle commands now in place, continuing to treat pointer files as primary state would keep dual representations and increase drift risk, especially across worktrees.

#### Options Considered

1. Keep pointer files as canonical and read config as optional compatibility
2. Move lifecycle state to config files and retain temporary fallback reads
3. Move lifecycle state to config files and remove pointer fallbacks after migration

#### Decision

Adopt option 3:

- Canonical per-developer lifecycle state is now `.oat/config.local.json`:
  - `activeProject`
  - `lastPausedProject`
- Canonical shared projects root is `.oat/config.json`:
  - `projects.root`
- Paths are stored repo-relative to keep worktree propagation portable.
- Active-idea pointers remain file-based (`.oat/active-idea`) as an explicit follow-up scope.
- Legacy `.oat/active-project` and `.oat/projects-root` fallback behavior is removed from migrated command paths.

#### Consequences

- Positive:
  - One lifecycle source of truth for active/paused project context.
  - Better portability across worktrees with repo-relative local config values.
  - Cleaner command/skill interfaces via `oat config get/set/list`.
- Negative / trade-offs:
  - Legacy pointer files become inert and can confuse users if manually inspected.
  - Active-idea remains on separate storage semantics until a future migration.

#### Follow-ups

- Track active-idea migration (`.oat/active-idea` / `~/.oat/active-idea`) as separate scoped work.
- Keep docs and skills aligned on config-first lifecycle reads/writes.

---

### ADR-013: Standardize `oat project open/pause` lifecycle semantics

- **Date:** 2026-02-22
- **Status:** accepted
- **Drivers:** Provide a consistent operator model for activate/switch/pause/resume flows without introducing redundant commands.
- **Related:**
  - `packages/cli/src/commands/project/open/index.ts`
  - `packages/cli/src/commands/project/pause/index.ts`
  - `packages/cli/src/commands/state/generate.ts`
  - `.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md`

#### Context

Lifecycle interactions previously depended on direct pointer edits and ambiguous pause behavior. We needed deterministic semantics that work for both command consumers and dashboard guidance.

#### Options Considered

1. Separate commands for open/switch/resume with independent state handling
2. Single `open` command for activate/switch/resume plus `pause` for suspension with contextual pointer clearing
3. Keep pointer-level workflows and treat pause as UI-only metadata

#### Decision

Adopt option 2:

- `oat project open <name>` handles:
  - fresh activation
  - switching from another active project
  - resuming paused projects (clears paused frontmatter state)
- `oat project pause [name]` writes pause metadata to target project `state.md`.
- Pointer clearing occurs only when paused project matches current `activeProject`; when cleared, `lastPausedProject` is recorded for dashboard resume guidance.
- Resume guidance surfaces through dashboard/state generation using `lastPausedProject`.

#### Consequences

- Positive:
  - Simple lifecycle mental model: open to activate/resume, pause to suspend.
  - Deterministic behavior for named-project pause vs active-project pause.
  - Dashboard can guide next action even with no active project.
- Negative / trade-offs:
  - Pause metadata now influences both state frontmatter and local config fields.
  - Users expecting dedicated `resume`/`switch` verbs must adapt to `open` behavior.

#### Follow-ups

- Keep help text and skill wrappers aligned with open/pause semantics.
- Preserve regression coverage for pause/open + dashboard next-step behavior.

### ADR-014: New CLI commands use `--dry-run` convention; defer CLI-wide flip

- **Date:** 2026-03-07
- **Status:** accepted
- **Drivers:** Existing `--apply` convention (dry-run by default) is unintuitive — users expect commands to do what they ask. New `oat tools` commands adopted `--dry-run` (mutate by default) as the better UX pattern, but flipping all existing commands in the same PR would increase scope and risk.
- **Related:**
  - `.oat/projects/shared/oat-tools-command-group/discovery.md` (Question 3, Deferred Ideas)
  - `.oat/repo/reference/backlog/index.md`

#### Context

The OAT CLI has two mutability conventions in use:

- **Old:** dry-run by default, `--apply` to mutate (`oat sync`, `oat instructions sync`)
- **New:** mutate by default, `--dry-run` to preview (`oat tools update`, `oat tools remove`)

The `--dry-run` pattern is more intuitive and aligns with common CLI tooling (npm, brew, etc.). However, flipping existing commands mid-project would widen scope and risk breaking existing scripts/docs.

#### Options Considered

1. Keep `--apply` everywhere (consistent but unintuitive)
2. Flip all commands to `--dry-run` in the same PR (consistent but high scope)
3. Use `--dry-run` for new commands only, flip existing commands in a follow-up (incremental)

#### Decision

Adopt option 3:

- New `oat tools` commands use `--dry-run` (mutate by default).
- Existing commands keep `--apply` (dry-run by default) unchanged.
- A separate follow-up PR will flip the convention CLI-wide (purely mechanical).

#### Consequences

- Positive:
  - New commands ship with better UX immediately.
  - Existing commands remain stable — no unexpected behavior changes.
  - Follow-up flip is low-risk and can be done as a single mechanical PR.
- Negative / trade-offs:
  - Temporary inconsistency across CLI commands until the flip ships.
  - Users may be confused by different defaults for different command groups.

#### Follow-ups

- ~~Create and execute the CLI-wide `--apply` → `--dry-run` convention flip (backlog item tracked).~~ Done — `.oat/projects/shared/auto-apply-dry-run/`, PR #46.
- ~~Update all docs, skill references, and scripts that mention `--apply`.~~ Done — included in the same PR.

---

### ADR-015: Introduce `@open-agent-toolkit/control-plane` as the read-only OAT state layer

- **Date:** 2026-04-09
- **Status:** accepted
- **Drivers:** OAT skills and future UI surfaces need a typed, reusable read layer for project state instead of repeated markdown parsing and ad hoc CLI-only aggregation.
- **Related:**
  - `.oat/projects/shared/control-plane-state-parsing/discovery.md`
  - `.oat/projects/shared/control-plane-state-parsing/design.md`
  - `.oat/repo/reference/backlog/items/control-plane-list-projects-summary-fast-path.md`

#### Context

Before this project, project-aware workflows repeatedly reimplemented the same bootstrap logic: resolve the active project, read several markdown artifacts, parse frontmatter, infer progress, and then route to the next skill. That made downstream consumers expensive to build and easy to drift.

At the same time, we wanted new JSON inspection commands and eventual UI consumers without tying the parsing layer directly to Commander command code.

#### Options Considered

1. Add project-state parsing directly inside `packages/cli`
2. Introduce a separate package that owns state parsing and recommendation while the CLI remains a thin consumer

#### Decision

Adopt option 2:

- Add `packages/control-plane/` as a private workspace package exporting typed project-state readers and recommendation logic.
- Keep the control plane read-only: it parses artifacts and returns structured data, but does not own config mutation, CLI formatting, or workflow execution.
- Keep the CLI as the user-facing layer that resolves config and exposes the structured surfaces through `oat project status`, `oat project list`, and `oat config dump`.

#### Consequences

- Positive:
  - Creates one reusable read surface for CLI, future dashboards, and other tooling.
  - Reduces repeated artifact parsing logic across workflow entry points.
  - Makes recommendation logic easier to test outside the CLI.
- Trade-offs:
  - Adds another package boundary to maintain.
  - Summary-oriented optimizations such as a faster `listProjects()` path should be justified by measurement rather than assumed.

---

### ADR-016: Add `workflow.*` preference keys with 3-layer resolution and per-repo-vs-personal surface guidance

- **Date:** 2026-04-10
- **Status:** accepted
- **Drivers:** Reduce friction for power users who always make the same choices in repetitive workflow prompts. Eat the dogfood: validate that the `resolveEffectiveConfig()` infrastructure from ADR-015 composes cleanly with new per-key preferences. Close the cross-agent bookkeeping drift gap discovered during discovery.
- **Related:**
  - `.oat/projects/shared/workflow-friction/`
  - `packages/cli/src/config/oat-config.ts` (`OatWorkflowConfig` type)
  - `packages/cli/src/config/resolve.ts` (reused; `DEFAULT_WORKFLOW_CONFIG` added)
  - `packages/cli/src/commands/config/index.ts` (`getConfigValue()` refactor, `--shared`/`--local`/`--user` flags)
  - `apps/oat-docs/docs/cli-utilities/configuration.md` (Workflow preferences section + Choosing the right surface subsection)
  - `bl-af93` (follow-up: `oat config unset` command)

#### Context

Several workflow skills ask repetitive confirmation questions that power users almost always answer the same way: HiLL checkpoint behavior, archive on complete, open a PR on complete, post-implementation chaining sequence, final review execution model, and re-review scope narrowing. Each interactive prompt is cheap individually but accumulates into significant workflow friction, especially in long sessions or when chaining multiple projects.

Meanwhile, the control-plane project (ADR-015) introduced `resolveEffectiveConfig()` — a generic 3-layer resolution utility that already reads from `.oat/config.local.json`, `.oat/config.json`, and `~/.oat/config.json` with per-key source attribution. We had a clean place to plug new preference keys without building parallel resolution machinery.

Separately, during discovery we surfaced a drift gap: `oat-project-review-receive` and `oat-project-review-receive-remote` were modifying `plan.md`, `implementation.md`, and `state.md` but had no required commit step. When a subagent ran a receive skill in isolation, it left the original agent's checkout dirty on return — the primary cause of cross-agent state drift.

#### Options Considered

1. **One-off hardcoded keys per skill.** Each skill adds its own config read and its own key. Fast but fragmented; no shared schema; hard to document; no reuse of resolution infrastructure.
2. **Dedicated `workflow.*` namespace with generic resolution.** Add a typed `OatWorkflowConfig` to `OatConfig`/`OatLocalConfig`/`UserConfig`, register the keys in the existing CLI catalog, and plug into `resolveEffectiveConfig()`. Every key benefits from 3-layer precedence automatically. (Chosen.)
3. **Per-project overrides only (via `plan.md` frontmatter).** Considered but deferred; covers the same need only within a project scope and doesn't help cross-project power users who want a single durable default.

We chose option 2 because it composes cleanly with ADR-015, leverages existing CLI infrastructure, and scales to additional preferences without special-casing each one.

#### Decision

1. **Introduce `workflow.*` as a dedicated preference namespace** with six keys shipped in this project: `hillCheckpointDefault`, `archiveOnComplete`, `createPrOnComplete`, `postImplementSequence`, `reviewExecutionModel`, `autoNarrowReReviewScope`. Later dogfooding moved the checkpoint lifecycle review preference into the same namespace as `autoReviewAtHillCheckpoints`, with legacy fallback from top-level `autoReviewAtCheckpoints`.

2. **Refactor `getConfigValue()` to delegate to `resolveEffectiveConfig()`** for all keys, not just workflow keys. This deletes ~150 lines of duplicated per-key if-else resolution and gives every existing key the 3-layer precedence model. Source labels change from `config.json`/`config.local.json` to `shared`/`local`/`user` for consistency with `oat config dump`.

3. **Add `--shared`/`--local`/`--user` surface flags to `oat config set`** with per-key restrictions: structural keys remain shared-only; state keys remain local-only except `activeIdea` which also accepts user; workflow keys accept all three surfaces. Top-level `autoReviewAtCheckpoints` is retained only as a compatibility fallback for `workflow.autoReviewAtHillCheckpoints`.

4. **Establish a "correct surface" rule for workflow preferences:** if a preference's correctness depends on other per-repo settings (e.g., `postImplementSequence: docs-pr` depends on `documentation.requireForProjectCompletion`), the preference belongs at shared scope. Pure personal preferences (e.g., `hillCheckpointDefault` for interruption tolerance) belong at user scope. Document this explicitly in the configuration guide so other users don't hit the cross-repo foot-gun.

5. **Fix the cross-agent drift root cause** by adding required bookkeeping commit steps to `oat-project-review-receive` (new Step 7.6) and `oat-project-review-receive-remote` (new Step 6.5). These commits are CRITICAL / DO NOT SKIP, scoped to the project's tracking files and `reviews/` directory, and handle the Step 7.5 archive move so the worktree isn't left dirty. `oat-project-implement` gets matching CRITICAL callouts on all four of its existing bookkeeping commit points.

6. **Drop `workflow.createPrOnComplete` from the repo's own configuration** after a dogfood-driven discovery: the `oat_pr_status: open` short-circuit in `oat-project-complete` makes the key a no-op in the normal flow, and setting it at user level creates a cross-repo foot-gun. Keep the key in the schema (so users can opt into it for specific edge cases) but don't set it at the OAT repo level. Document the redundancy and the foot-gun in the "Choosing the right surface" subsection.

#### Consequences

- Positive:
  - Power users can set their preferences once and run a full project lifecycle without any interactive prompts.
  - The getConfigValue refactor removes significant duplicated code and aligns source labels with `oat config dump`.
  - Cross-agent bookkeeping drift is closed at the root cause, not worked around with a preference (`workflow.autoFixBookkeepingDrift` was dropped from the plan precisely because fixing the drift source made it redundant).
  - Establishes a reusable pattern: "skill reads preference, falls through to prompt if unset" is the template for any future workflow preference keys.
- Trade-offs:
  - Source label rename in `oat config get --json` / `oat config list` is a minor user-facing breaking change for scripts that parse the `source` field. Documented in the configuration guide's Source labels subsection and in the p01-t03 commit message.
  - Workflow preference correctness depends on per-repo settings in several cases, which creates a surface-selection trap. Mitigated by the "Choosing the right surface" documentation but still requires user judgment.
  - No `oat config unset` command yet — tracked as `bl-af93`. Until shipped, users who want to change their mind on a preference value must hand-edit JSON or set a new value (which doesn't work for enum unsetting).

---

### ADR-017: Generalize pack default-scope via `PACK_METADATA` rather than hardcoding `brainstorm`-specific paths

- **Date:** 2026-05-02
- **Status:** accepted
- **Drivers:** The `independent-brainstorming` design (bl-53f0) required the new `brainstorm` pack to default to **user scope** so the always-on trigger fires across directories. The existing installer defaulted user-eligible packs to project scope in non-interactive setups, which would have silently broken the universal-availability rationale. The design-review process surfaced this as Important finding `I1` and asked us to choose between special-casing `brainstorm` in installer paths or introducing pack metadata.
- **Related:**
  - `.oat/projects/shared/independent-brainstorming/`
  - `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (`PackMetadata`, `PACK_METADATA`, `resolvePackDefaultScope`)
  - `packages/cli/src/commands/init/tools/index.ts` (`buildUserScopeChoices`, `resolvePackScopes`)
  - `core` pack's existing always-user-scope special-case (candidate for follow-up consolidation)

#### Context

`brainstorm` needs default-user-scope so `oat init`-installed users get the always-on trigger automatically across every working directory. The current installer's user-eligible default (project scope unless overridden) would have shipped `brainstorm` default-on but project-scoped — silently breaking the universal-availability acceptance criterion.

Two ways to fix it:

1. Hardcode `'brainstorm'` checks in the installer's scope-resolution code paths.
2. Introduce a generalized pack-metadata mechanism (`PACK_METADATA[name]?.defaultScope`) that any future pack can opt into.

#### Options Considered

1. **Special-case `'brainstorm'` in installer paths.** Smallest diff (~5 line if-block in two locations). Hardcodes the pack name in scope-resolution code; future packs that want user-default would need their own special-case.
2. **Pack metadata via `PACK_METADATA[name]?.defaultScope`.** (Chosen.) Slightly larger diff, but the abstraction is reusable: any future user-default-scope pack just adds an entry. Better long-term shape; consistent with how `core` _should_ eventually be expressed (currently a hardcoded always-user-scope branch).

#### Decision

Adopt option 2. Introduce `PackMetadata` interface + `PACK_METADATA` map + `resolvePackDefaultScope` helper in `skill-manifest.ts`. Wire the installer to consult metadata in both the interactive picker (`buildUserScopeChoices`) and the non-interactive resolver (`resolvePackScopes`). Existing-install detection continues to short-circuit before metadata lookup so users with a prior project-scope install of any pack don't get unexpected migrations.

`PACK_METADATA` ships with one entry: `brainstorm: { defaultScope: 'user' }`. Absence in the map falls back to `'project'`, preserving existing behavior for `ideas` / `docs` / `utility` / `research`.

#### Consequences

- Positive:
  - `brainstorm` defaults to user scope automatically across both installer paths.
  - Future packs that need user-default scope add a single metadata entry — no code change in scope-resolution paths.
  - The mechanism is shaped to consolidate `core`'s always-user-scope special-case in a follow-up.
  - Existing-install precedence is preserved, so users don't get unexpected scope migrations on re-install.
- Trade-offs:
  - Slightly larger diff than the special-case approach.
  - Pack maintainers must remember to add a `PACK_METADATA` entry when introducing user-default-scope packs (mitigated by the empty-map fallback being safe; absence just means project default).

#### Follow-ups

- Consider migrating `core`'s always-user-scope special-case into `PACK_METADATA` as a separate cleanup project. Out of scope for bl-53f0.

---

### ADR-018: Make OAT dispatch ceiling authoritative and treat Codex provider default as informational

- **Date:** 2026-05-25
- **Status:** accepted
- **Drivers:** Dogfooding after PR #87 showed that Codex base/unpinned subagent roles do not reliably inherit the live parent/orchestrator reasoning effort. In an `xhigh` orchestrator session, an unpinned reviewer resolved to `high`, so the old "inherited means parent-session ceiling" contract was misleading and could make OAT claim a stronger effort than the provider actually used.
- **Related:**
  - `.oat/projects/shared/dispatch-ceiling/`
  - `packages/cli/src/config/oat-config.ts` (`workflow.dispatchCeiling`)
  - `packages/cli/src/commands/project/dispatch-ceiling/` (`oat project dispatch-ceiling resolve`)
  - `packages/cli/src/providers/codex/codec/sync-extension.ts` (generated Codex role variants)
  - `.agents/skills/oat-project-plan/SKILL.md`
  - `.agents/skills/oat-project-implement/SKILL.md`
  - `.agents/agents/oat-phase-implementer.md`
  - `.agents/agents/oat-reviewer.md`
  - `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
  - `apps/oat-docs/docs/cli-utilities/configuration.md`

#### Context

PR #87 improved Codex implementer dispatch by using effort-specific implementer variants instead of relying on per-call `reasoning_effort`. The remaining gap was the base/unpinned role contract: OAT expected roles like `oat-reviewer` and base `oat-phase-implementer` to inherit the live parent session effort, but real Codex dispatch resolved an unpinned reviewer to provider/configured default effort instead.

That behavior created two correctness risks:

1. OAT could silently dispatch above or below the user's intended ceiling.
2. OAT logs could claim `xhigh` or "inherited parent ceiling" when the provider actually resolved an unpinned role through its default.

The fix needed to preserve Claude's model-axis behavior, avoid Codex terminology leaking into Claude, and avoid mid-implementation prompts.

#### Options Considered

1. **Treat Codex provider default as the implicit OAT ceiling.** Rejected because provider default is not project/user-declared dispatch intent and may not match the live session ceiling.
2. **Keep base roles and only improve log wording.** Rejected for normal dispatch because it still leaves review quality gates dependent on provider defaults. Acceptable only as a fallback description.
3. **Introduce an OAT-owned provider-aware dispatch ceiling and deterministic pinned Codex variants.** Chosen. This gives OAT an explicit source of truth and makes normal Codex dispatch predictable.

#### Decision

1. **Add provider-aware dispatch ceiling config.** `workflow.dispatchCeiling.codex` accepts `low`, `medium`, `high`, or `xhigh`; `workflow.dispatchCeiling.claude` accepts `haiku`, `sonnet`, or `opus`. Project state can persist a local answer as:

   ```yaml
   oat_dispatch_ceiling:
     provider: codex
     value: high
     source: project-state
   ```

2. **Resolve ceiling before work starts.** Planning asks at the end when unresolved and interactive. Implementation preflight resolves before phase work and never asks mid-run. Unresolved non-interactive implementation blocks with actionable config/state instructions.

3. **Expose compiled resolver behavior.** `oat project dispatch-ceiling resolve --provider <provider>` resolves effective config first and project state second. With `--preflight --json`, unresolved output can remain machine-readable for an interactive-capable orchestrator. Explicit `--non-interactive` or `OAT_NON_INTERACTIVE=1` produces the blocking path.

4. **Keep Codex provider default informational.** The resolver reports `providerDefaultEffort` when known, but provider default is not treated as the OAT ceiling. Base/unpinned Codex role logs must say `provider-default`, not inherited parent ceiling.

5. **Make normal Codex dispatch deterministic.** Sync generates `oat-phase-implementer-{low,medium,high,xhigh}` and `oat-reviewer-{low,medium,high,xhigh}`. Implementation/fix work selects `min(preferred, resolved_ceiling)`. Review dispatch uses the reviewer variant matching the resolved ceiling.

6. **Preserve Claude semantics.** Claude ceiling is model-based and capped through the model axis. Claude has no separate per-dispatch effort axis, so `effort_axis=not-applicable`.

#### Consequences

- Positive:
  - OAT no longer claims Codex parent-effort inheritance for unpinned roles.
  - Users can set an explicit dispatch ceiling at repo/user/local config or project state.
  - Codex implementer and reviewer dispatch can be deterministic through pinned variants, including `xhigh` only when the resolved OAT ceiling allows it.
  - Non-interactive runs fail before work starts instead of silently choosing a default.
  - Provider default effort remains visible where it matters, without becoming an implicit ceiling.
- Trade-offs:
  - Workflow skills still own some dispatch orchestration, so the compiled resolver is necessary but not the entire runtime policy.
  - Projects now need a resolved dispatch ceiling before non-interactive implementation can proceed.
  - The generated Codex role surface is larger because every deterministic effort variant is explicit.

#### Follow-ups

- Continue moving prompt-only dispatch contracts into compiled CLI surfaces where doing so reduces orchestrator duplication.
- Watch dogfood for whether reviewer variant discovery in Codex spawn metadata catches up with generated role availability; base reviewer remains only a provider-default fallback.

---

### ADR-019: Reshape dispatch ceiling as a provider-neutral intent (presets + adapter registry); refines ADR-018

- **Date:** 2026-05-29
- **Status:** accepted
- **Drivers:** Dogfooding ADR-018's surface showed the ceiling prompt was provider-prescriptive — it mixed provider selection with ceiling selection and made users feel the feature only worked under Codex or Claude. The two-provider config shape also couldn't express "this is an OAT intent that applies wherever the provider exposes a mechanism." Separately, empirical testing established that Claude's Task `model` parameter is a real, bidirectional enforcement point (downgrade, lateral, and upgrade above the orchestrator all work; precedence is Task `model` > agent frontmatter `model` > orchestrator inheritance), so Claude can be enforced too — not merely advisory.
- **Related:**
  - `.oat/projects/shared/dispatch-ceiling-ux/` (discovery, design, plan, implementation)
  - ADR-018 (refined here)
  - `packages/cli/src/config/dispatch-ceiling-preset.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`

#### Context

ADR-018 made the ceiling authoritative but kept it Codex-centric in framing and shape (`workflow.dispatchCeiling.codex`/`.claude`). Users perceived the feature as Codex/Claude-only, and there was no low-friction way to express intent without reasoning about per-provider values. The reshape needed to stay deterministic for providers that can enforce, while reading as provider-neutral and degrading gracefully for providers that cannot.

#### Options Considered

1. **Copy-only rewrite** (reword the prompt, keep the flat per-provider keys). Rejected — does not give the "I don't want to reason about per-provider values" shortcut and leaves the schema two-provider-shaped.
2. **Presets + concrete per-provider compilation behind a provider adapter registry.** Chosen.

#### Decision

1. **Provider-neutral intent with presets.** Users choose a preset (`balanced`/`maximum`/`cost-conscious`), set per-provider values directly (advanced), or pick "no ceiling". Presets compile **at write time** to concrete per-provider values via a fixed table (balanced → codex `high`/claude `sonnet`; maximum → `xhigh`/`opus`; cost-conscious → `medium`/`sonnet`; never haiku reviewers by default). Runtime dispatch reads only the concrete `providers.*` values, never the preset label.
2. **Clean break, no migration.** Config keys are `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.codex`/`.claude`; the flat `workflow.dispatchCeiling.codex`/`.claude` keys are removed. `preset` is persisted only when a preset was chosen; advanced/manual stores only `providers` + `source`.
3. **Provider adapter registry.** Each adapter declares `supportsCeiling`, `validValues`, `mechanism` (`pinned-variant` | `model-arg` | `none`), and `compileToDispatchArgs(value, role, ctx)`. Codex → pinned variants (sync-time files); Claude → per-call Task `model` (no variant files); unknown providers → advisory.
4. **Mode computed at dispatch, never persisted.** The resolver joins stored intent × adapter capability and returns per-provider `{value, mode, mechanism, dispatchArgs}` where `mode` ∈ enforced/advisory/unsupported is computed fresh each run. Capability is a property of provider × runtime, so persisting it would go stale.
5. **Verify-on-upgrade.** Only an above-orchestrator request risks a silent plan/entitlement fallback, so the adapter verifies the actual model only on the upgrade path; cap-down/lateral need no verification. Never log `enforced` unless the requested control was honored.

#### Consequences

- Positive:
  - The ceiling reads as an OAT intent; copy no longer implies Codex/Claude-only; "no ceiling" is first-class.
  - Both Codex and Claude are enforceable (different mechanisms); a future Cursor/other adapter plugs in without schema changes.
  - Presets keep setting low-friction without letting a fuzzy label drive dispatch.
- Trade-offs:
  - A new adapter abstraction + preset table to maintain.
  - Clean break breaks existing flat-key config (accepted; no migration).

#### Follow-ups

- Implement a third-provider ceiling adapter (e.g. Cursor) using the registry extension point.
- Optional: allow `haiku` as an advanced Claude reviewer target (not a default).

---

## ADR Template

### ADR-XXX: {Title}

- **Date:** YYYY-MM-DD
- **Status:** proposed \| accepted \| superseded
- **Drivers:** {why this decision matters}
- **Related:** {links to commits, PRs, docs, feedback}

#### Context

{What problem are we solving? What constraints matter?}

#### Options Considered

1. {Option A}
2. {Option B}

#### Decision

{What we decided. Be explicit.}

#### Consequences

- Positive:
- Negative / trade-offs:

#### Follow-ups

- {Concrete next steps}
