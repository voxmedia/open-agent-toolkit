---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-08-27
---

# Orchestration Log: wave-4-execution

Running log of orchestration and subagent observations for this project (see
the Wave 1 log for the full logging contract). Append-only; structural entries
are one-liners referencing artifacts by path; tag skill-relevant entries with
**Skill signal (strengthens/contradicts/gap):**. Run `pnpm exec oxfmt --write`
on this file after writing.

---

## Entries

### 2026-08-27 · structural · oat-wave-execute · drift refresh

Recon (Sonnet 5, read-only) vs `39cea801`, re-checked by the root vs the wave
baseline: 1 PASS / 0 MINOR-DRIFT; the plan's STOP #2 tripped at plan time
(live `codex exec --help` has no `--full-auto`; the skill uses it at `:19`,
`:33`, `:34`, `:47`), reported to the operator, reconciled non-narrowingly
(operator option 1, 2026-08-27) and recorded in `plan.md` § Drift Refresh
Record; rule-1 addendum items 1–3 recorded there. Premise correction:
`codex-skill` is repo-only (not in the bundle allowlist).
**Skill signal (strengthens):** the program-level "reread live provider
guidance" requirement caught a dead flag the plan's authoring evidence missed.

### 2026-08-27 · structural · oat-wave-execute · preflight

BASE_SHA=3c135e212dfb1d386650089e7d9f95263565ee82 (origin/main after W3 close);
`pnpm run worktree:init` exit=0 (manifest restamp `f9db417c`), `pnpm build`
exit=0, `pnpm type-check` exit=0; root drift re-check vs BASE clean;
`oat project new wave-4-execution --mode quick --no-commit`; scaffold
committed `8e903a0c`; `validate-plan` valid.

### 2026-08-27 · structural · oat-gate-review · plan gate round 1

Run `0d369be4-5beb-451c-8c8e-4f3d7afcf3fd` (`cursor-gpt-5-6-sol-xhigh`,
detached, receipt watched) → `passed`: 0C/0I/1M/0m. M1: discovery's
mutation-probe requirement was not mapped into the wrapper's phase-review
checklist → rule 8 extended (two bounded reviewer-run mutation probes; class
findings trigger a repo-wide sweep). Resolved in-artifact; archived at
`reviews/archived/artifact-plan-review-2026-08-27T020212Z.md`.

### 2026-08-27 · structural · oat-project-implement · p01 implemented

`w4-p01-impl-001` (Opus) returned DONE at `b97408f2` (one commit, DoD 10/10,
post-commit `release:check-versions` and `check:skill-bumps` re-runs 0; Codex
cross-model review seven rounds, 9 findings fixed); `w4-p01-review-001`
(Opus, fresh) dispatched against `b97408f2`.

### 2026-08-27 · general · friction · two committed-state-only gates, not one

`pnpm run check:skill-bumps` reported "0 canonical skills changed … nothing
to validate" for the whole uncommitted phase and only became a real check
after the commit — the same class as `release:check-versions` (W3 rule).
Rule: the post-commit re-run covers both gates.

### 2026-08-27 · general · friction · live-CLI reread must diff flags per subcommand

The drift record captured `--skip-git-repo-check` on `exec` and
`exec resume` but not that `-s`, `-C`, and `--approve-for-me` are absent
from `exec resume`; the implementer found it and normalized the resume
examples accordingly. **Skill signal (gap):** a live-syntax reread should
record the flag set per subcommand, not per binary.

### 2026-08-27 · general · worked-well · mechanical flag swaps are not behavior-neutral

Mapping `--full-auto` → a bypass flag on the `danger-full-access` row would
have weakened sandbox posture (plan STOP #3); Codex review round 2 caught it
before commit. A like-for-like swap must be re-evaluated per row when the
replacement carries its own sandbox semantics.

### 2026-08-27 · general · friction · cross-model review needs a stopping rule

Rounds 1–2 caught real defects; rounds 3–6 were narrowing fidelity refinements
of the same paragraph; seven rounds exceeded the lane's budget. Rule: stop at
two consecutive clean rounds or when findings drop below Medium.
