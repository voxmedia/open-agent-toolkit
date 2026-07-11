# Recon: codex-subagent-max-depth (in-flight)

> Recon briefing produced 2026-07-11 during quick-start discovery for the
> `oat-project-fixture` project. Read-only recon worker (gpt-5.6-terra-medium)
> over the sibling worktree
> `/Users/tstang/orca/workspaces/open-agent-toolkit/codex-subagent-max-depth`.
> Git state verified separately by the root agent (see Verified Branch State).

## Objective

Enable OAT's native Codex topology: root (depth 0) → phase coordinator (1) →
exact task worker (2). Managed Codex config must enforce
`agents.max_depth >= 2` without reducing higher values or crossing user/project
config boundaries. See the project's `discovery.md`, `design.md`.

## Key Decisions & Requirements

- Native nested `spawn_agent` is the intended implementation path; nested
  `codex exec` is not. A workspace-write coordinator can spawn a depth-2 native
  worker when max depth is 2. (`discovery.md`,
  `references/subagent-orchestration-learnings.md`)
- The merge floor is `max(2, target max_depth, inherited user max_depth)` for
  project materialization; only the target scope is written. (`design.md`)
- Exact materialized Codex `agent_type` is authoritative configured-invocation
  evidence. Model/effort are launcher-selected and config-declared, not
  worker-observed. Missing telemetry/self-report must not cause CLI fallback.
  (`design.md`, `plan.md`)
- A pinned external child is permitted only after explicit pre-start native
  role-selection rejection. An accepted child that later returns `BLOCKED`,
  times out, or fails tests is a terminal task outcome, not fallback
  eligibility. (`design.md`, learnings reference)
- Managed role dispatch remains fail-closed; generic/base-role downgrade is
  forbidden for concrete managed targets. (`design.md`)
- Gate-review provenance is separate from regular implementation dispatch.
  Gate reviewers may use their configured gate target, while phase/task
  execution uses native provider subagents. (`plan.md`, learnings reference)
- Provider mechanisms differ: Codex uses materialized `agent_type`; Claude uses
  named subagents/model arguments; Cursor uses fixed profiles/model strings.
  Codex conclusions must not be copied to Cursor without launcher validation.

## Learnings Reference Highlights

From `references/subagent-orchestration-learnings.md` (in that project):

- **Confirmed:** Codex defaults to depth 1; shared config merge, sync, and
  direct materialization need a depth-2 floor.
- **Confirmed:** native nesting works under `workspace-write`; the observed
  failure was nested `codex exec`, not native spawning.
- **Confirmed:** narrowly adding writable roots for shared Git metadata and
  `.agents` enabled native workers to edit and commit without
  `danger-full-access`.
- **Confirmed:** worktree content and shared Git metadata are separate write
  surfaces.
- **Confirmed:** phase branch names must be flat (`project-p01`), avoiding Git
  ref-prefix collisions.
- **Confirmed:** package-local test cwd matters; running the CLI Vitest binary
  from repo root produced alias/collection failures.
- Operational constraints: serialize shared asset bundling and docs builds;
  concurrent runs race shared directories/locks.
- Potential, not implemented: a root-owned dispatch broker; generalized task
  write-surface preflight; host-generated runtime attestations; Cursor-specific
  exact-dispatch validation.
- Explicit non-resolutions: broadening coordinator access, removing role
  sandboxes, treating missing self-report as unavailability, fallback after
  accepted-child failure, and increasing max depth as a permissions fix.

## Status

- Quick workflow; discovery, lightweight design, plan, and plan re-review are
  complete (zero blocking findings in the archived plan re-review).
- Implementation is in progress but effectively blocked at `p01-t01`: 0/8 plan
  tasks recorded complete in `implementation.md`.
- `p01-t01` native worker reportedly implemented and passed 15/15 focused
  tests, but could not create shared Git `index.lock`; its diff remains in
  `.worktrees/codex-subagent-max-depth-p01`.
- `p02-t01` was blocked because `.agents` was read-only. Its worker was
  accepted, so the project correctly did not fall back to a CLI child.
- The learnings handoff says scoped writable roots subsequently solved both
  issues, but the root project artifacts have not been reconciled to reflect
  that recovery. **This is a material state discrepancy.**

## Verified Branch State (root agent, 2026-07-11)

- Branch `codex-subagent-max-depth`, 10 commits ahead of main — all
  scaffolding/planning/bookkeeping plus one gate-timeout fix
  (`fix(gate): allow longer review execution`). No feature implementation
  commits on the root branch.
- Feature code exists only as unintegrated diffs in child worktrees
  `.worktrees/codex-subagent-max-depth-p01` and `-p02`:
  - p01 worktree: shared merge-floor implementation (`inheritedMaxDepth`,
    `readCodexMaxDepth`, `Math.max(2, target, inherited)`) plus
    threshold/idempotence tests.
  - p02 worktree: `oat-project-implement/SKILL.md` with intended native-first
    wording (explicit rejection only, self-report non-authoritative); the root
    copy still has older dispatch language.
- **The learnings reference doc itself is untracked** (`?? references/`) — at
  risk of loss; should be committed in that worktree promptly.

## Merge Risks & Dependencies

- Not merge-ready: task bookkeeping says 0/8 complete; phase/final code
  reviews pending; provider regeneration, lockstep bump, and
  `pnpm release:validate` pending.
- Child-worktree work must be reconciled before retrying, or p01/p02 changes
  may be lost or duplicated.
- Direct overlap with `dispatch-schema-matrix-infrastructure`:
  `packages/cli/src/commands/project/dispatch-ceiling/index.ts` and tests,
  doctor/dispatch-report infrastructure, `oat-project-implement/SKILL.md`, and
  workflow docs. Integrate/rebase against that sibling first, and reconcile the
  implementation-skill dispatch language at contract level, not line-by-line.
- The sibling's temporary phase-direct workaround must not override this
  project's validated native depth-2 topology; scoped writable roots are the
  least-privilege remedy.

## Open Questions

- Define and enforce worker writable roots for worktree files, shared Git
  metadata, managed `.agents`, and potentially generated-output paths.
- ~~Reconcile whether the later scoped-writable-root success has been
  integrated into the project's actual execution state.~~ Resolved — see
  Update below.
- Runtime identity remains unverified independently; provenance is correctly
  limited to launcher-selected/config-declared identity.
- Cursor pinned-profile/model behavior remains provider-specific and
  unvalidated; do not infer it from Codex.

## Update — 2026-07-11 (post-recon, verified by root agent)

The "material state discrepancy" and unintegrated-diff findings above were
resolved the same day. From `implementation.md` (Run 2) and the branch log:

- **p01 and p02 recovered and merged.** Orchestration Run 2 re-ran both phases
  with scoped writable roots for shared Git metadata and `.agents`; both phase
  branches passed review (2/2 fix iterations each) and merged into the project
  branch. 13/15 tasks complete.
- **Native exact-role dispatch worked end to end** for primary phase tasks
  (coordinators pinned to `oat-phase-implementer-gpt-5-6-sol-high`,
  launcher-owned target/model/effort logs preserved).
- **The fallback contract fired correctly once:** a p01 review-fix coordinator
  received an explicit _pre-start_ `agent_type` rejection, and the root-owned
  exact pinned worker fallback completed `p01-t06` — the only sanctioned
  fallback trigger, observed working as designed.
- **Contract drift got fixed as review fixes:** p02-t03..t07 aligned the phase
  coordinator, project-review dispatch semantics, blocked-reviewer handling,
  and reviewer retry routes across skills (the drift the learnings doc
  warned about).
- The learnings reference is now committed (implementation log records it).
- **Remaining:** Phase 3 only — `p03-t01` (Codex provider surface docs/regen)
  has a commit on the branch (`docs(p03-t01): …`); current work is `p03-t02`
  (lockstep package bump + release validation). A HiLL checkpoint gated p03.

Merge posture: still behind `dispatch-schema-matrix-infrastructure` (now PR
#136). Once p03 completes, this branch needs the planned rebase/contract
reconciliation against the merged sibling — both branches modified
`oat-project-implement/SKILL.md` and dispatch-ceiling/doctor surfaces, and
this branch's native-first depth-2 contract should supersede the sibling's
temporary phase-direct workaround language.
