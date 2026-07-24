---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-24
---

# Project Log: config-bug

This append-only log serves two audiences: the project team learning from this project's execution, and maintainers improving the general OAT workflow and tooling.

## Logging contract

Append when something breaks, surprises you, requires a workaround, or works notably well enough to preserve as do-not-regress evidence. Record evidence, not a running narrative. Prior entries are never edited or struck through; append corrections as a new judgment entry that references the original entry and explains the correction. Add a version note to tool-related observations. Create entries only with `oat project log append`; run `oat project log append --help` for the complete entry contract. Reference supporting artifacts by path instead of inlining them. Never record secret values such as tokens, keys, signed URLs, or credentials because this log rolls up into tracked surfaces; reference secrets by name or source, never by value.

Judgment entries default to 1–3 sentences covering what happened, the impact or workaround, and any follow-up. High-value entries may instead use this structured body:

```text
Observation: What happened and the supporting evidence.
Impact: Why it mattered or what workaround was required.
Recommendation: What should change or be preserved.
```

Shared tracked surfaces must be written only from the root checkout, never from parallel worktrees.

## Entry format

Judgment entries:

```text
### 2026-07-24 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-24 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-24 · structural · oat-project-implement · p02

Accepted phase implementer dispatch 5c793b40-a342-4e43-96fb-a8adad3e213d for config-bug-p02 at eea4313d.

### 2026-07-24 · structural · oat-project-implement · p01

Accepted phase implementer dispatch 4b0cca9a-0090-470f-99f6-bc295de05820 for config-bug-p01 at eea4313d.

### 2026-07-24 · structural · oat-project-implement · p02-review

Accepted root-owned reviewer dispatch b301a857-5c16-4d68-90dc-48105c27761f for eea4313d..cc7e2f39.

### 2026-07-24 · structural · oat-project-implement · p02-outcome

Phase p02 verdict passed; fix-loop count 0; review artifact reviews/2026-07-24-p02-code-review.md.

### 2026-07-24 · structural · oat-project-implement · p01-fix1

Resumed original p01 implementer for bounded verification repair; original request config-bug-p01-20260724T1152Z.

### 2026-07-24 · structural · oat-project-implement · p01-review

Accepted root-owned reviewer dispatch bb6fa687-3a3f-4340-a551-08d0b947bfef for eea4313d..22ae71c5 after one bounded verification repair.

### 2026-07-24 · structural · oat-project-implement · p01-review1

Review found one Important direct-brainstorm config-persistence defect; bounded fix loop 1 added from reviews/2026-07-24-p01-code-review.md.

### 2026-07-24 · structural · oat-project-implement · p01-review1-fix

Resumed original p01 implementer for the single Important direct-brainstorm persistence finding; review fix loop 1.

### 2026-07-24 · structural · oat-project-implement · p01-review1-fix-outcome

Review fix loop 1 completed in fc1a974c; focused and full verification passed; re-review required.

### 2026-07-24 · general · friction · Concurrent asset generation during verification

Running repository formatting concurrently with the full CLI suite caused a transient scaffold-test failure while the asset bundler rewrote assets/templates/state.md. Isolating the full-suite rerun after asset generation completed produced a clean pass; verification lanes that mutate bundled assets should not overlap readers. (observed on OAT 0.2.14)

### 2026-07-24 · structural · oat-project-implement · p01-review2

Accepted fresh p01 re-review dispatch 37f28848-1a4e-49f7-a101-80f07b3b046b for eea4313d..fc1a974c after fix loop 1.

### 2026-07-24 · structural · oat-project-implement · p01-review2-outcome

Fresh p01 re-review found one Important regression-coverage gap: parent command tests stub the brainstorm child handler and would not detect restored child-level config persistence. Review fix loop 2 required.

### 2026-07-24 · structural · oat-project-implement · p01-review2-fix-plan

Planned bounded p01 review fix loop 2 within existing p01-t01 files: execute real brainstorm action in parent/wrapper regressions via a side-effect-safe seam and prove restored child persistence fails tests.

### 2026-07-24 · structural · oat-project-implement · p01-review2-fix-dispatch

Resumed original p01 implementer 4b0cca9a-0090-470f-99f6-bc295de05820 for bounded review fix loop 2: real-action brainstorm command regression coverage.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
