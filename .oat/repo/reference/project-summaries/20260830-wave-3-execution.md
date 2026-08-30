---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: true
oat_summary_last_task: p01-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-3-execution

## Overview

Wave 3 ("Hermetic CLI assets") of the 2026-08-19 execution program, executed
as a thin wrapper OAT project over the immutable external plan
`2026-08-19-hermetic-cli-assets-root.md`. One solo lane (`p01`) on the
integration checkout `wave-3-execution`, from main `39cea801` (code baseline
`33149b26`, public packages 0.2.34). Quick mode: discovery + wrapper plan;
the external plan is the requirements.

## What Was Implemented

- **Validated `OAT_ASSETS_DIR` override:** `resolveAssetsRoot(env = process.env)`
  selects `resolve(override)` only for a non-empty trimmed value (relative
  values resolve against the process working directory) and then runs the
  unchanged `stat` + `validateAssetsBundle` checks, so missing, malformed, or
  version-mismatched overrides fail closed with the existing actionable errors
  and never fall back; unset or blank values keep the packaged root
  (`packages/cli/src/fs/assets.ts`).
- **Unit coverage through the injected seam:** override wins; `{}`/empty/
  whitespace fall back; four fail-closed classes; relative override; the
  production default binding hard-asserted via `vi.stubEnv` (no
  `process.env` assignment). The ambient-override hermeticity class is closed
  once at `packages/cli/vitest.config.ts` (`test.env`), with the two literal
  test call sites made explicit as defense in depth.
- **Hermetic package-coverage smoke consumer:**
  `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` bundles once
  per file into a `mkdtemp` root outside `packages/cli/assets`, sets
  `OAT_ASSETS_DIR` before importing built consumers, proves the built `dist`
  resolves the temp root (≠ shared root; negative control with the shared
  assets moved aside), and restores the environment and removes the temp root
  on every path — with a second `after` hook asserting it (both reviewer
  mutants die).
- **`bundle-assets.sh` rationale comment corrected** (default consumers still
  read the shared directory, which is what staging protects).
- **Lockstep bump 0.2.34 → 0.2.35** across the five public packages;
  `packages/cli/assets/public-package-versions.json` regenerated; lockfile
  unchanged (workspace links).
- **Tests:** `assets.test.ts` 14 cases (+9), `gate/index.test.ts` call site
  explicit, smoke consumer 3 cases plus a cleanup-assertion hook; CLI suite
  273 files / 3695 tests green with and without an ambient `OAT_ASSETS_DIR`.

Reviews: plan artifact gate passed on round 1 (`cursor-gpt-5-6-sol-xhigh`,
run `59ebe179`, zero findings); p01 code review two rounds (0C/0I/2M/4m →
append-only fix `6dc9cdd1` → 0/0/0/0); two Codex cross-model rounds (P2
hermeticity regression fixed pre-commit; then clean); root final verification
10/10 at `cf53e818`; final review round 1 at `9a2e659b` 0C/2I/4M/7m — all
wrapper bookkeeping or conformant notes, resolved at receive.

Exit gate: generation 1 passed on `cursor-gpt-5-6-sol-xhigh` (run `c89b7975`,
run as configured, 0/0/0/0) at `b1c60abc`; final review round 2 (narrowed) was
clean.

## Key Decisions

1. **Close the ambient-env class at the runner seam:** round-1 M2 named one
   call site; the sweep showed the real class was production code correctly
   following the new override through seven command paths (52 failures under a
   metadata-only ambient bundle, none under a complete one). One `test.env`
   line in `vitest.config.ts` closed it; the explicit call-site fixes stay as
   defense in depth. Verified non-masking by two reviewers. (`DR-260827-close-ambient-environment-sensitivity`)
2. **Keep the plan-mandated existing error messages on the override path**
   (remedy wording that says "run `pnpm build`" is misdirected for an operator
   override) — recorded as a backlog candidate rather than widening the change. (`DR-260827-keep-plan-mandated-error-messages`)
3. **Pre-planned lockstep bump inside the lane** (W1/W2 rule), with the
   post-commit `release:check-versions` re-run adopted as a standing rule
   because the gate is committed-state-only. (`DR-260827-re-run-release-check-versions`)

## Design Deltas

N/A (quick mode; no `design.md`). Extra work accepted by review:
`packages/cli/vitest.config.ts` `test.env` seam and the explicit
`gate/index.test.ts` call site — test-hermeticity consequences of the change.

## Notable Challenges

- Reviewer-designed probes found what ten green gates could not: a silent
  `it.skipIf` skip that removed the only default-binding coverage, an unswept
  ambient-env class, and correct-but-unasserted restore/cleanup (two surviving
  mutants). All fixed in one append-only round.
- The plan's focused-test Verify command does not filter under vitest;
  `release:check-versions` is committed-state-only; two bookkeeping scripts
  mis-anchored on first run and were caught by their assertions.

## Integration Notes

- `OAT_ASSETS_DIR` is now a public runtime knob on the published CLI: it
  decides which bundled skills/agents/templates the CLI reads and writes into a
  user's repository. Validation is unchanged and fail-closed; documentation
  lands at the `document` step.
- `.oat/sync/manifest.json` `oatVersion` sits at 0.2.34 while packages are
  0.2.35 (pre-existing repo-wide pattern; tracked by
  `BL-260826-warn-on-silent-oatversion`).

**Explainer outcome:** project-recap **built-durable** — `explainers/wave-3-execution-recap` (run `run-6c05d663-d933-4480-8740-96709c53deeb`, `project-recap@2`, one hub artifact, real Chromium evidence at 320/768/1440, visual review pass on attempt 1; artifact commit `4a052aca`, attestation `40c69c28`).

## Follow-up Items

- `document` step: `OAT_ASSETS_DIR` entry in
  `apps/oat-docs/docs/cli-utilities/configuration.md` (p01 round-1 m2); PJM
  current state.
- Backlog candidates (file at wave close): structural check so metadata-only /
  partial override bundles fail closed (final m4); override-aware remedy wording
  in the fail-closed errors (final m5).

## Associated Issues

- `BL-260817-let-resolveassetsroot-honor` — closed by this wave.

## Workflow Observations

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-3-execution/reviews/artifact-plan-review-2026-08-26T231805Z.md

### 2026-08-27 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-3-execution/reviews/final-review-2026-08-27T011826Z.md

### 2026-08-27 · structural · oat-project-complete · seal

Lifecycle sealed for wave-3-execution: PR #219 open; exit gate generation 1 passed (cursor-gpt-5-6-sol-xhigh, run c89b7975); project recap built-durable; completion tail deferred to program close.
