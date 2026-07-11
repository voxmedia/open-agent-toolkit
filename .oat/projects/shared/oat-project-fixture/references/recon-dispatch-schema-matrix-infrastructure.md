# Recon: dispatch-schema-matrix-infrastructure (in-flight)

> Recon briefing produced 2026-07-11 during quick-start discovery for the
> `oat-project-fixture` project. Read-only recon worker (gpt-5.6-terra-medium)
> over the sibling worktree
> `/Users/tstang/orca/workspaces/open-agent-toolkit/dispatch-schema-matrix-infrastructure`.
> Git state verified separately by the root agent (see Verified Branch State).

## Objective

Deliver shared dispatch infrastructure: one canonical matrix
normalizer/walker for legacy and `{ candidates }` shapes; pass-scoped Cursor
validation; and a versioned Dispatch Report V1 that preserves selection and
provenance boundaries. It explicitly must extend — not reimplement — the
candidate-selection/materialization and gate-corroboration contract already
shipped by PR #132. (`discovery.md`, `design.md`)

## Key Decisions & Requirements

- Named policies/tier names are provider-neutral ceilings, not an exact-model
  choice. Concrete provider candidates remain configuration-owned ladders;
  resolver selection remains the sole authority.
- Normalize scalars, direct structured targets, legacy fallback arrays/routes,
  candidate ladders, and sparse project-state overrides into one ladder
  algebra. Preserve `{ candidates: [...] }` atomically during layered
  configuration.
- A shared walker retains provider, tier, candidate index, fallback-route
  index, path, source layer, opaque string or structured target. Candidate
  index and fallback-route index are distinct.
- Codex `{model, effort}` targets are atomic; Cursor candidate strings are
  opaque. Do not infer capability or translate provider vocabularies.
- Dispatch Report V1 keeps policy, ceiling, requested candidate, exact
  selected target, configured defaults, gate invocation, and runtime identity
  as separate typed facts. `Dispatch:` is derived compatibility output, not the
  schema.
- Gate invocation provenance is immutable configured invocation metadata;
  observed/self-reported runtime identity cannot overwrite it. This is a
  gate/review concern, not implementation-worker dispatch.
- Cursor validation: exactly one Task probe per distinct opaque candidate per
  command pass; at most one `cursor-agent models` and one fallback
  `--list-models`. Catalog presence is diagnostic only and never makes a
  candidate `valid`.
- **The intended OAT topology remains native coordinator → native task
  workers. This project did not restore it:** because nested worker launches
  failed in the sandbox, the user authorized phase-direct implementation by
  one exact pinned phase subagent per phase. The durable remediation is
  tracked as `BL-260711-add-root-owned-dispatch-broker`.
- No requirement authorizes ordinary implementation through `codex exec`,
  `cursor-agent`, or `claude -p`; the only Cursor CLI invocations in this
  project are validation/evidence probes.

## Cursor Verification Analysis Highlights

From `references/codex-max-depth-cursor-verification-analysis-gpt-5.md`:

- Three-layer evidence model: (1) policy resolution, (2) launcher-owned
  configured invocation, (3) runtime-observed identity. Transfers to Cursor
  conceptually, not mechanically — `agents.max_depth` is Codex-only.
- For Cursor, an accepted structured Task event with the exact model argument
  is the configured-invocation/eligibility boundary. A child sentinel proves
  Task eligibility for that argument, not backend runtime model identity.
- The original text-mode 10-second probe pass proved nothing: five probes
  timed out, eight returned parent prose rather than launcher evidence.
- Recommended remedy: stream-JSON, 60–120 s timeouts, known-good positive
  control, deliberately invalid negative control, request/session/tool
  correlation, and separate Task acceptance from runtime identity.
- The structured second pass implemented this protocol, but both controls
  emitted no Task events, so all candidates were correctly classified
  inconclusive and skipped. All recommendation values remain `unvalidated`.
- No explicit merge-order recommendation, but max-depth remains unshipped, so
  this branch must not depend on it for its evidence model.

## Status

- Quick-mode project; no `spec.md` by design.
- All 34 planned implementation tasks marked complete across p01–p06.
- p01–p05 passed self-reviews; the earlier p01–p05 final review passed with
  only a minor plan wording note.
- **p06 is not merge-ready:** newest p06 re-review is `changes_requested` with
  one unresolved Medium finding — public capture schema/privacy validation is
  incomplete (`sentinelObserved` and similar nominally typed fields accept
  arbitrary strings that could carry prose or paths despite the public
  allowlist). Requires exact types/domains for every public event/probe field
  plus adversarial tests, then re-review, and the release verification rerun
  (the recorded full verification predates this finding).

## Verified Branch State (root agent, 2026-07-11)

- Branch `dispatch-schema-matrix-infrastructure`, 75 commits ahead of main.
- Working tree: only generated `.codex/config.toml` modified; no child
  worktrees.

## Branch Changes (from artifacts)

- Matrix core/config: `packages/cli/src/config/dispatch-matrix.ts`,
  `oat-config.ts`, `resolve.ts`, config/doctor/project dispatch-ceiling
  command code and tests.
- Cursor validation: `packages/cli/src/providers/identity/availability.ts`,
  new `dispatch-validation.ts`, config/doctor batch integration.
- Report/provenance: new `dispatch-report.ts`, `stamp.ts`, dispatch-ceiling
  resolver report flags, gate report adapter.
- Workflow skills: `oat-project-implement`, `oat-project-review-provide`,
  `oat-project-review-provide-remote` (+ regenerated CLI mirrors).
- Cursor evidence tooling:
  `tools/verification/{verify,capture}-cursor-subagent-evidence.mjs` + tests.
- Docs across dispatch ceiling, implementation execution, workflow gates,
  configuration, providers.
- Public packages advanced `0.1.48` → `0.1.49` → `0.1.50`; bundled asset maps
  and lockfile changed.
- Backlog: three infrastructure items archived; Cursor eligibility
  verification remains open; broker follow-up added.

## Merge Risks & Dependencies

- Blocking: the p06 privacy/schema finding (fix → re-review → rerun release
  validation).
- The branch embeds only a project-local deviation from nested native
  dispatch, not a systemic correction; merging it does not make nested
  dispatch work.
- Likely overlap with `codex-subagent-max-depth`: dispatch skills, dispatch
  provenance/report vocabulary, native-depth/broker behavior. Coordinate
  before either branch changes shared dispatch skills or broker semantics.
- Cursor evidence is inconclusive, not negative proof; verification backlog
  stays open.

## Open Questions

- ~~p06 finding must be fixed and independently re-reviewed before merge.~~
  Resolved — see Update below.
- Cursor runtime identity remains unreported; needs Cursor support or trusted
  child telemetry.
- No recommendation candidate is verified Task-eligible (controls never
  observed a Task event).
- Root-owned exact-dispatch broker / launcher-owned provenance work remains
  open in `BL-260711-add-root-owned-dispatch-broker`.

## Update — 2026-07-11 (post-recon, verified by root agent)

The blocking state described above was resolved the same day:

- `fix(p06-t12): enforce public evidence schema` (`272dbe65`) closed the
  Medium privacy/schema finding; the manual finding was recorded closed
  (`2f82fc04`).
- A fresh final gate review ran post-fix
  (`reviews/archived/final-review-2026-07-11T140307Z.md`): gate invocation on
  an independent runtime (`oat_gate_runtime: claude`, model fable, gate run id
  `1825244d-…`), **0 critical / 0 important / 0 medium / 0 minor**, explicit
  "ready to merge," with the p06 M1 closure independently verified against
  shipped code.
- Full workspace tests, lint, type-check, docs build, verification-tool tests,
  and five-package `0.1.50` release validation passed on the reviewed tree
  (post-fix, superseding the earlier stale-verification concern).
- Project summary generated; PJM references refreshed; Cursor verification
  follow-up backlog retained (controls inconclusive → zero candidate probes
  ran; all slugs remain explicitly `unvalidated`, fail-closed).
- `state.md` is `pr_open`; **PR #136** is open and `MERGEABLE`
  (https://github.com/voxmedia/open-agent-toolkit/pull/136).

Merge posture: no known blockers remain in this project's own lifecycle. The
phase-direct workaround and Cursor validation gaps are documented known
limitations with open backlog items, not merge blockers. Sequencing note
unchanged: merge this branch **before** `codex-subagent-max-depth`, which then
rebases and reconciles shared dispatch-skill contracts.
