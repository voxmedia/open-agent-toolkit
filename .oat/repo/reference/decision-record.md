# OAT Decision Record (Internal / Dogfood)

Track notable decisions made while evolving OAT in this repo, so future sessions have quick, reliable context.

## Decision Index

| ID | Date | Status | Title |
|----|------|--------|-------|
| ADR-001 | 2026-01-30 | accepted | Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration |
| ADR-002 | 2026-01-31 | accepted | Standardize user-facing progress indicators in OAT skills |
| ADR-003 | 2026-01-31 | accepted | Add `create-oat-skill` to keep OAT skill conventions consistent |
| ADR-004 | 2026-01-31 | accepted | Defer active-project name-only migration until CLI owns project commands |
| ADR-005 | 2026-02-14 | accepted | Use skill-first invocation language; treat `/oat:*` as optional host alias |
| ADR-006 | 2026-02-16 | accepted | Add quick/import workflow lanes with canonical plan normalization and mode-aware routing |
| ADR-007 | 2026-02-16 | accepted | Split project-scoped review from ad-hoc review and default non-project artifacts to local-only storage |
| ADR-008 | 2026-02-16 | accepted | Use explicit provider config with config-aware sync remediation for worktree-safe interop |
| ADR-009 | 2026-02-16 | accepted | Centralize full/quick/import plan semantics in `oat-project-plan-writing` |
| ADR-010 | 2026-02-17 | accepted | Introduce `.oat/config.json` for new non-sync settings and phase broader consolidation |

## Decisions

### ADR-001: Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration

- **Date:** 2026-01-30
- **Status:** accepted
- **Drivers:** Avoid breaking existing skills that assume `.oat/active-project` contains a full path; keep dogfood v1 stable while we iterate on projects-root and multi-project workflows.
- **Related:**
  - `.oat/repo/reference/deferred-phases.md`
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
- **Drivers:** Avoid convention drift across new `oat-*` skills; keep skill authoring consistent without duplicating the entire `create-skill` guidance.
- **Related:**
  - `.agents/skills/create-skill/SKILL.md`
  - `.agents/skills/create-oat-skill/SKILL.md`

#### Decision

Add a `create-oat-skill` skill as a specialization of `create-skill`:
- `create-oat-skill` explicitly references baseline guidance from `create-skill`.
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
  - `.oat/repo/reference/deferred-phases.md`
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
  - `.oat/repo/reference/backlog.md`

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
  - `.agents/skills/oat-project-promote-full/SKILL.md`
  - `.oat/templates/state.md`
  - `.oat/templates/plan.md`

#### Context

OAT's full lifecycle (`discover -> spec -> design -> plan -> implement`) provides strong structure but is heavy for quick changes and externally-authored plans. We need a lightweight path that still keeps `plan.md`/`implementation.md`/`state.md` as the system of record.

#### Options Considered

1. Keep full lifecycle only (no quick/import support)
2. Add quick/import entry lanes that normalize into canonical OAT `plan.md`
3. Keep imported provider plans as non-canonical artifacts and teach all downstream skills new formats

#### Decision

Adopt option 2:
- Add `oat-project-quick-start` for quick lane projects.
- Add `oat-project-import-plan` for external markdown plan ingestion.
- Preserve imported source at `references/imported-plan.md`; canonical execution artifact remains `plan.md`.
- Add `oat-project-promote-full` for in-place promotion to full lifecycle.
- Introduce metadata:
  - `state.md`: `oat_workflow_mode` (`full|quick|import`), `oat_workflow_origin` (`native|imported`)
  - `plan.md`: `oat_plan_source` (`full|quick|imported`) plus import traceability fields.
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

### ADR-009: Centralize full/quick/import plan semantics in `oat-project-plan-writing`

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

Full-mode planning, quick-mode planning, and imported-plan normalization all touched `plan.md` with overlapping but non-identical rules. This increased drift risk and made mode-aware routing hard to keep consistent.

#### Options Considered

1. Keep per-skill duplicated plan-writing instructions
2. Introduce a canonical shared plan-writing skill and reference it from dependent skills
3. Move plan writing to ad-hoc scripts without a documented contract

#### Decision

Adopt option 2:
- Add `oat-project-plan-writing` as the canonical plan contract for `full|quick|import` modes.
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
  - `.oat/repo/reference/backlog.md`
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
