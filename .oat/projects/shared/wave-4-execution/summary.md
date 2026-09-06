---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: true
oat_summary_last_task: p03-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-4-execution

## Overview

Wave 4 ("delivered-project follow-ups") of the 2026-08-31 execution program:
three external plans that each follow a merged project (the consolidated gate
project, the scope-and-adoption diagnostics project, and the truthfulness
project), run as a thin wrapper project so the fixes could execute in parallel
worktrees with root-owned reviews, one lockstep release bump, and full
integration gates after every fan-in. The motivating gaps were a configured
lifecycle gate that no single project could opt out of without editing shared
configuration, commands other than `oat sync` that silently rewrote which OAT
version produced the sync manifest, and a dispatch resolver that computed
every field of the audit stamp but left orchestrators to assemble it by hand.

## What Was Implemented

- **Per-project gate overrides (p01).** A strict `oat_skill_gate_overrides`
  map in project `state.md` (keys restricted to `oat_gateable` skills, literal
  `disabled`); `oat gate resolve --project [path-or-name]` returns
  `configured`, `configured_disabled_by_project`, or `not_configured` while the
  legacy no-project output stays byte-identical; a shared gate-posture setup
  contract in `oat-project-plan-writing` used by quick-start, plan, and
  import-plan (non-interactive runs never write a map); a `project_disabled`
  closeout disposition whose fingerprint covers the override so re-enabling the
  gate stales the stored transition; `oat-project-next` routes it;
  `oat-project-progress` shows active overrides; the workflow-gates,
  configuration, and gate-authoring docs describe the boundary. After the
  final review, the discover, design, plan, quick-start, and import-plan gate
  steps all resolve with project context and fail closed on a null or
  malformed result. Ten skills bumped once each.
- **Non-sync manifest restamp advisories (p02).** One pure
  `detectManifestVersionRestamp` helper; `oat init`, `oat remove skill`, and
  interactive `oat status` adoption emit a scoped advisory before
  `saveManifest` in human mode, and init and remove-skill carry
  `manifestVersionRestamps` in JSON; sync's `versionSkew` reuses the shared
  shape; a restamp-only sync apply reports the refresh and no longer prints
  `No changes required.` anywhere in its body. The wave's own fan-in sync
  printed the new advisory on the repository manifest.
- **Dispatch stamp with resolver JSON (p03).** `oat project dispatch-ceiling
resolve … --json` emits `dispatchStamp` beside `dispatchReport` (present iff
  the report is, byte-equal to `formatDispatchStamp`, including report-bearing
  blocked resolutions; absent on non-report and error envelopes); the
  review-provide, review-provide-remote, and implement dispatch guidance now
  require reading the returned field and forbid hand-assembly or an
  out-of-tree shim, pinned by a bounded-window contract helper with negative
  fixtures.
- **Release.** Lockstep 0.2.58 → 0.2.59 in one fan-in bump with the
  `.oat/sync/manifest.json` restamp in the same commit; a new decision record
  supersedes the "a configured gate cannot be disabled" consequence of the
  2026-07-18 exit-gate decision.

## Key Decisions

- **Project-scoped gate overrides and fail-closed gate resolution.** A project
  may disable a configured gate-aware skill's gate only through its own
  `state.md`; overrides are accepted only for `oat_gateable` skills; only
  `not_configured` is an explicit no-gate allowance, and a null, missing, or
  malformed resolution fails closed. Recorded as
  `DR-260906-project-scoped-gate-overrides`.
- **Manifest restamp advisories precede the save and never block.** Every
  non-sync command that saves the manifest reports producer-versus-invoking
  version by plain string identity before `saveManifest` replaces it, in human
  output or a JSON array, and `saveManifest` keeps its final restamp; commands
  that never save (JSON status) carry no restamp evidence.
- **The resolver is the only stamp producer.** `dispatchStamp` exists exactly
  when `dispatchReport` exists and is derived by the one existing formatter;
  orchestrators copy it and never assemble their own.

## Design Deltas

- p01 edited `apps/oat-docs/docs/contributing/skills.md` outside its plan's
  named docs scope because the closeout rule made that page's gate-authoring
  step a self-contradiction inside the diff, and bumped
  `oat-project-autonomous` through a recovery that mapped the new prompt sites
  in the autonomy inventory. The plan's Dependencies table gains cross-wave
  rows at the wave-close refresh.
- p02's restamp-only condition additionally requires zero failed operations,
  because a rejected collection counts as failed but never as planned.
- p03 did not re-bump `oat-project-implement` (p01 owns the wave's bump) and
  documents the stamp prefix without its trailing space in prose (MD038).
- The final review widened the fail-closed gate rule to the discover and
  design skills (kept non-gateable per the plan's out-of-scope clause) and
  the three plan-producing skills, and superseded part of DR-260718.

## Notable Challenges

- **Assertions that could not see the defect.** The restamp-only sync body
  still printed `No changes required.` from the shared plan formatter; the
  pinned test used array-element equality and the suite's injected formatter
  fake never emitted the sentence, so it passed both Codex rounds. The root
  reviewer found it by running the built CLI, and the fix had to add a
  real-formatter harness option before the strengthened assertion meant
  anything.
- **A stale transition that looked fresh.** Codex found pre-commit that a
  stored `project_disabled` closeout could be reused after the gate was
  re-enabled because the implementation fingerprint excludes `state.md`; the
  closeout and router now re-resolve with project context and compare a
  fingerprint recomputed from the current resolution.
- **Prose contracts beyond the diff.** The final review found the retired
  "null means no gate" rule still taught by two skills and one docs page
  outside every lane's write surface, plus the decision record that predated
  overrides; all were aligned in the wave rather than deferred, because the
  W3 exit gate had blocked on exactly that class.
- **Pin inventories by name undercount.** Two lanes found more version pins
  than briefed (one was a regex-form pin); lanes now grep the version literal.

## Tradeoffs Made

- Discover and design gates cannot be disabled per project: their gate steps
  now resolve with project context and fail closed, but override keys stay
  restricted to `oat_gateable` skills, as the plan scoped.
- The stamp contract helper's lexical guards are a tripwire, not a proof;
  the exit gate's remaining Medium (bold-step boundaries, a direct normal-path
  shim sentence) is filed rather than fixed after the passed gate.
- `PROJECT_STATE_FRONTMATTER_FIELDS` still has no production consumer;
  preserve-on-write is pinned by an executable writer test instead.

## Follow-up Items

- `BL-260906-fix-sync-apply-branch` — `No changes required.` on a rejected collection with zero planned operations (pre-existing).
- `BL-260906-persist-status-native-skill` — status native-skill adoption never sets `manifestChanged`.
- `BL-260906-give-project-state-frontmatter` — wire or delete the unused project-state allowlist.
- `BL-260906-scope-the-restamp-only-sync` — per-scope restamp-only suppression under `--scope all`.
- `BL-260906-make-the-dispatch-stamp` — harden the stamp contract helper (exit-gate M1).
- Wave-close plan corrections: the gate-override plan's Dependencies table
  (cross-wave rows for `contributing/skills.md` and `state-utils.test.ts`);
  W5 group 4 and W6 group 2 lanes re-anchor.
- Skill signals for `oat-wave-execute` are recorded in the wrapper's
  `orchestration-log.md` synthesis.

## Associated Issues

- `BL-260712-per-project-override`, `BL-260826-warn-on-silent-oatversion`,
  `BL-260826-emit-the-dispatch-stamp-from` — archived by this wave.

## Workflow Observations

### 2026-09-06 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-4-execution/reviews/artifact-plan-review-2026-09-06T162416Z.md

### 2026-09-06 · structural · oat-project-review-provide · reviews/final-review-2026-09-06T203008Z.md

Final gate review completed with delegated reconnaissance; 0 critical, 0 important, 1 medium, 1 minor.

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/wave-4-execution/reviews/final-review-2026-09-06T203008Z.md
