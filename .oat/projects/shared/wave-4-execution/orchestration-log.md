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

### 2026-08-27 · structural · oat-project-implement · p01 fix round landed

`w4-p01-fix-001` (resumed implementer handle) → append-only `d9ce0c33`; all
six code/wording dispositions implemented (M2 was root bookkeeping at
`dd5f1da9`); DoD 10/10, post-commit `release:check-versions` and
`check:skill-bumps` 0; Codex three rounds under the new stopping rule (one
fix, one clean, one dismissed re-litigation of a root disposition); narrowed
round 2 `w4-p01-review-002` dispatched.

### 2026-08-27 · general · worked-well · key prose guards on documented phrases, not hedging words

The contract test's `/only|unless/` exclusion exempted `read-only` — the
skill's own default sandbox — so the most natural initial-run example could
carry the bypass unnoticed (round-1 M1). Keying the exception on the documented
phrase (`not a Git repo`) and deriving the command set from command-ish
content made the guard robust; line-based derivation stays wrapping-sensitive
(a span-based scan of backticked fragments would be immune).
**Skill signal (gap):** prose contract tests should scan fragments, not lines,
and probe records should carry the insertion anchor, not just the inserted
text (the g2/g4 reproduction depended on it).

### 2026-08-27 · structural · oat-project-implement · p01 round 2 received

`w4-p01-review-002` → 0C/0I/3M/2m: the round-1 M1 fix regressed fenced-example
coverage (a guard derivation keyed on a backtick before `codex`), the M3
rewrite made the below-floor case blocking, and the root's run-1 script had
missed the Progress Overview / Implementation Log scaffold (they sit outside
the section it replaced). Second fix round `w4-p01-fix-002` dispatched;
narrowed round 3 will be the third and last cycle for scope p01.
**Skill signal (gap):** a scaffold-replacement script must enumerate every
template block (Progress Overview, Implementation Log, Test Results, Final
Summary), not only the phase section — W3's final review found the same class.

### 2026-08-27 · structural · oat-project-implement · p01 fix round 2 landed

`w4-p01-fix-002` → append-only `39121c35`; all four code dispositions
implemented, probe matrix fully in the required state (n1/n2 now fail, r1/r2
now pass, `gpt-5.5` caught, 8/8); Codex stopped after two clean rounds;
narrowed round 3 `w4-p01-review-003` dispatched (cycle 3 of 3).

### 2026-08-27 · general · worked-well · normalize prose to logical lines before guarding

Two successive guard fixes each traded one blind spot for another because
they filtered physical lines of wrapped markdown. Unwrapping soft-wrapped
lines first (then a named prose allowlist) removed the whole class — r1/r2
flipped from false failures to passes while every mutation probe still fails.
**Skill signal (strengthens):** prose contract tests in `.agents/skills/**/tests/`
should normalize to logical lines and pin wording dispositions with their own
assertion (M3 regressed by paraphrase with every gate green until an assertion
existed).

### 2026-08-27 · structural · oat-project-implement · p01 round 3 received (cycle cap)

`w4-p01-review-003` → 0C/0I/1M/1m (+ ledger D1–D4): the round-2 prose
allowlist exempts on keyword alone (a prohibition-sounding sentence can carry
a bypass example), the new below-floor assertion is phrase-locked, and the
cross-directory assertion never used logical lines. Cycle cap reached; root
disposition: bounded reviewer-specified fix, root-run probe matrix as the
verification record, independent verification delegated to the final review
and the exit gate — no self-authorized fourth cycle.
**Skill signal (gap):** three consecutive guard widenings each opened a
narrower hole; a prose guard needs a structural rule ("an exempted line must
not itself run the command") rather than keyword lists.

### 2026-08-27 · structural · oat-project-implement · p01 passed (cycle cap, root-verified)

`w4-p01-fix-003` → append-only `44fb2327` (test file only); the root re-ran
the implementer's reproducible 22-probe runner at HEAD → ALL PROBES MATCHED
(verification record in `implementation.md`); phase p01 `passed`; Run 1
complete. Codex flagged one below-Medium follow-up (phrase-literal
`confirm before launching` check) → final-review ledger.
**Skill signal (strengthens):** a probe runner that fails loudly when no tests
ran (`NO-TESTS-RAN`) — the implementer's first "before" run was a silent
false-green from an unglobbed filename.

### 2026-08-27 · structural · oat-project-implement · final review round 1

`w4-final-review-001` (Opus, fresh) at `41da6443` → 0C/1I/4M/1m: no
shipped-behavior defect (DoD 10/10, live help, provider reference,
weaker-anywhere, 22-probe matrix all clean); the Important was a root
bookkeeping corruption (a replacement callback's source written into the
Implementation Log by `6075a705`, deleting the round-2 line); two Mediums are
contract-guard breadth (three live spellings — bare `codex`, `codex e`,
flag-only rows with an allowlist phrase — evade the structural rule; a
paraphrased blocking requirement evades the below-floor assertion — the
`\bconfirm` patch stays rejected). Root fixed the bookkeeping; implementer
fix round `w4-final-fix-001` dispatched; narrowed round 2 follows.
**Skill signal (gap):** the root's `once` helper accepted a function as a
replacement and wrote its source; helpers must reject non-string replacements
and every bookkeeping commit needs a post-write grep for `=>`/`$1` residue.

### 2026-08-27 · structural · oat-project-implement · final review rounds 1–3 (cycle cap)

Final scope: round 1 (0C/1I/4M/1m — a root bookkeeping corruption from a
non-string replacement callback, ledger head mismatch, stale prose, two guard
evasions), round 2 (0C/0I/2M/1m — row-scoped carve-out, negation mask), round
3 (0C/0I/3M/0m — bare option-bullet bypass, broadened exception row, anaphoric
blocking clause). Every code change after `39121c35` hardened the contract
test only. At the cap the root applied M1 (a plan-named class, one-line fix,
reviewer-verified) as a bounded root-verified fix and ledgered M2/M3 with a
backlog item; the configured exit gate is the independent verification.
**Skill signal (gap):** a prose-contract guard can absorb unbounded reviewer
creativity; the wrapper should budget guard-hardening rounds explicitly and
route breadth beyond the plan-named classes to backlog from round 2 onward.

### 2026-08-27 · structural · oat-project-implement · final review passed (cycle cap)

`w4-final-fix-003` → append-only `601c950b` (test file only); root re-ran
the 36-probe runner → ALL PROBES MATCHED; `final` row `passed`; M2/M3
ledgered with a backlog item; exit gate generation 1 next.

---

## End-of-run synthesis (2026-08-27)

**Outcome.** Wave 4 shipped its single lane in full: `codex-skill` now
classifies work by OAT task class and takes model and effort from the provider
reference (named as the source of truth; dated examples never override it),
the repository-check bypass is conditional and authorization-gated, every
command example validates against the live Codex CLI (`codex-cli 0.149.1`;
the dead `--full-auto` replaced under the operator's non-narrowing STOP #2
reconciliation), a seven-case prose contract test guards the stale pair and the
blanket bypass, and the lane carried the `codex-skill` 1.2.0 → 1.3.0 bump with
lockstep 0.2.35 → 0.2.36. One implementer commit and five append-only
fix commits (every one after `39121c35` hardening the contract test only),
three phase-review cycles and three final-scope cycles — both scopes at the
cap — and sixteen Codex cross-model rounds.

**What worked.** The cycle-cap disposition held twice without a
self-authorized extra cycle: reviewer-specified patches applied as bounded
fixes, root-run probe runners (22 → 34 → 36 probes with isolation controls) as
the verification record, and the configured exit gate as the independent check;
the last two guard residuals were ledgered with a backlog item rather than
chased. The program-level "reread live provider guidance" requirement
caught a dead flag the plan's authoring evidence missed, and the operator's
option-1 reconciliation kept the lane within its plan. The plan gate's one
medium — mapping mutation probes into the wrapper checklist — paid off:
reviewer probes found two guard blind spots (`read-only` matching a bare
`only` exclusion; Quick Reference rows outside the checked set) and an
unsupported capability claim. Codex review caught a sandbox-weakening
`--full-auto` mapping before commit (a STOP #3 risk).

**Friction.** `pnpm run check:skill-bumps` is committed-state-only like
`release:check-versions`; the live-CLI reread recorded flags per binary, not
per subcommand (`exec resume` lacks `-s`, `-C`, `--approve-for-me`); Codex
review ran seven rounds before a stopping rule was applied, and later
re-litigated a root disposition; prose guards keyed on hedging words collide
with flag vocabulary.

**Rules adopted for the program close and any future wave.** (1) Post-commit
re-runs cover both committed-state-only gates. (2) Live-syntax rereads record
the flag set per subcommand. (3) Cross-model review stops at two consecutive
clean rounds or below-Medium findings, and treats root dispositions as
settled. (4) Prose contract tests scan backticked fragments and key exceptions
on documented phrases; probe records carry insertion anchors. (5) Flag swaps
are re-evaluated per example row when the replacement carries sandbox
semantics.
