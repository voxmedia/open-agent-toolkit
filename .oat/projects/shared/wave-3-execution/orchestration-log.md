---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-08-26
---

# Orchestration Log: wave-3-execution

Running log of orchestration and subagent observations for this project (see
the Wave 1 log for the full logging contract). Append-only; structural entries
are one-liners referencing artifacts by path; tag skill-relevant entries with
**Skill signal (strengthens/contradicts/gap):**. Run `pnpm exec oxfmt --write`
on this file after writing.

---

## Entries

### 2026-08-26 · structural · oat-wave-execute · drift refresh

Recon (Sonnet 5, read-only) vs BASE_SHA=33149b26: 1 PASS / 0 MINOR-DRIFT /
0 STOP; rule-1 addendum items 1–3 recorded in `plan.md` § Drift Refresh Record.

### 2026-08-26 · structural · oat-wave-execute · preflight

BASE_SHA=39cea8017b73b602f247cb50a372d1fb9cae34f1 (origin/main after W2 close;
code baseline 33149b26); `pnpm run worktree:init` exit=0 (before scaffold —
W2 rule; manifest restamp committed `0da7e477`), `pnpm build` exit=0,
`pnpm type-check` exit=0; `oat project new wave-3-execution --mode quick
--no-commit`; scaffold committed `b9a181f5`; `validate-plan` valid.

### 2026-08-26 · structural · oat-gate-review · plan gate round 1

Run `59ebe179-9d03-421e-8235-4eaad1375816` (`cursor-gpt-5-6-sol-xhigh`,
detached launch, receipt watched) → `passed`: 0C/0I/0M/0m on the first
round (W2 needed three). Artifact archived at
`reviews/archived/artifact-plan-review-2026-08-26T231805Z.md`.
**Skill signal (strengthens):** carrying the previous wave's gate-passed
wrapper text forward (with the rule-1 addendum re-derived from fresh recon)
removes the wrapper-precision findings that cost W2 two rounds.

### 2026-08-26 · structural · oat-project-implement · p01 implemented and reviewed (round 1)

`w3-p01-impl-001` (Opus) returned DONE at `4019f98c` (one commit, DoD
10/10, Codex cross-model review two rounds — P2 hermeticity regression fixed);
`w3-p01-review-001` (Opus, fresh, six mandated probes) → 0C/0I/2M/4m; fix
round `w3-p01-fix-001` dispatched on the resumed implementer handle.

### 2026-08-26 · general · friction · plan Verify command does not filter

The source plan's step-2 Verify `pnpm --filter … test -- src/fs/assets.test.ts`
runs the whole CLI vitest suite (the path after `--` is ignored); the gate is
still sound but gives no signal that the intended file ran.
`vitest run <path>` is the working form. **Skill signal (gap):** plan authors
should verify focused-test invocations against the repo's runner.

### 2026-08-26 · general · friction · release:check-versions is committed-state-only

Pre-commit the gate reports "no public package changes — version bump check
passed" (a no-op indistinguishable from success); only the post-commit re-run
gates the bump. Rule for W4: run `git fetch origin && pnpm
release:check-versions` again immediately after the task commit and record
that exit code.

### 2026-08-26 · general · worked-well · negative control proves isolation

The implementer's negative control (smoke file passes with
`packages/cli/assets` moved aside) is the only evidence that actually proves
the consumer reads the isolated bundle — the temp bundle is byte-identical to
the shared one. Rule for containment lanes: require a negative control in the
brief. The reviewer's mutation probes then showed the restore/cleanup path was
correct but unasserted (two surviving mutants) — a second file-level `after`
closes it (round-1 m4).

### 2026-08-26 · general · friction · cross-model fix applied at one site only

Codex named the hermeticity regression at `assets.test.ts`; the implementer
fixed that site and did not sweep the other default-binding call site the
change exposed (`gate/index.test.ts:479`, six failures under an ambient
override — round-1 M2). Rule: a cross-model finding that names a class gets a
repo-wide sweep, not a point fix.

### 2026-08-27 · structural · oat-project-implement · p01 fix round landed

`w3-p01-fix-001` (resumed implementer handle) → append-only `6dc9cdd1`;
all six round-1 dispositions implemented (m2 routed to the document step);
DoD 10/10, post-commit `release:check-versions` 0, Codex clean; narrowed
round 2 `w3-p01-review-002` dispatched.

### 2026-08-27 · general · worked-well · close an env-sensitivity class at the runner seam

Round-1 M2 named one ambient call site; the implementer's sweep found the real
class was production code correctly following the new override through seven
command paths (52 failures under a metadata-only ambient bundle, none under a
complete one). One line in `packages/cli/vitest.config.ts` (`test.env`)
closed the class; the two explicit call-site fixes stay as defense in depth.
**Skill signal (strengthens):** when a change makes production read a new
environment variable, the proportionate hermeticity fix is usually one entry
in the test-runner env, not N call-site edits — and a finding about ambient
sensitivity should state which fixture shape it used.

### 2026-08-27 · structural · oat-project-implement · p01 passed (round 2)

`w3-p01-review-002` (narrowed) → 0C/0I/0M/0m; all six dispositions verified
with reviewer-run evidence; `vitest.config.ts` seam change judged in scope
and non-masking. Phase p01 `passed` at `6dc9cdd1`; Run 1 complete.

### 2026-08-27 · structural · oat-project-implement · final review round 1

`w3-final-review-001` (Opus, fresh) at `9a2e659b` → 0C/2I/4M/7m, all
wrapper-bookkeeping or conformant forward-looking notes (no code defect; DoD
10/10 re-run; six built-CLI probe groups clean). Resolved at receive; two
backlog candidates recorded (partial-bundle structural check; override-aware
error remedy). Note: the `project-log.md` plan-gate entry cites the
pre-archive artifact path — append-only, left as is.

---

## End-of-run synthesis (2026-08-27)

**Outcome.** Wave 3 shipped its single lane in full: `resolveAssetsRoot` honors
a non-empty `OAT_ASSETS_DIR` with the unchanged fail-closed validation, the
package-coverage smoke consumer reads a private per-file bundle and asserts its
own restore/cleanup, and the lockstep bump 0.2.34 → 0.2.35 landed inside the
lane. One implementer commit, one append-only fix commit, two phase-review
rounds (0C/0I/2M/4m → 0/0/0/0), two Codex cross-model rounds, root DoD 10/10.

**What worked.** Carrying W2's gate-passed wrapper text forward with a freshly
re-derived rule-1 addendum passed the plan gate on round 1. The reviewer-designed
probe set (weaker-anywhere, blank/relative semantics, delete/reorder mutations,
built-CLI proof, process-global hygiene) found real gaps — a silent
`it.skipIf` skip, an unswept ambient-env class, unasserted cleanup — that all
ten repo gates and the implementer's own tests had passed over. The
implementer's negative control (shared assets moved aside) is the only evidence
that proves isolation. Detached gate launches with receipt watchers held.

**Friction.** The plan's focused-test Verify command does not filter under
vitest; `release:check-versions` is committed-state-only and needs a post-commit
re-run; round-1 M2 under-scoped a class by an order of magnitude (fixture shape
decides the failure count) and the proportionate fix was one line at the
test-runner env seam. Two bookkeeping scripts mis-anchored on first run (a
removed section, a not-yet-advanced status line); each was caught by the
assertion and re-applied.

**Rules adopted for W4.** (1) Focused-test Verify lines are checked against the
repo's runner before dispatch. (2) `git fetch origin && pnpm
release:check-versions` runs again immediately after every task commit and the
exit code is recorded. (3) A cross-model or reviewer finding that names a class
gets a repo-wide sweep and states the fixture shape it used. (4) Containment
lanes require a negative control in the implementer brief and mutation checks
on restore/cleanup paths in the reviewer brief. (5) Bookkeeping scripts are
applied once per commit with a dry-run assertion pass before the write.
