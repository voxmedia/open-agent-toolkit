---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-07
---

# Orchestration Log: wave-5-execution

Running log of orchestration and subagent observations for this project. Two
audiences: (1) evaluating this wave's execution specifically, and (2) collecting
general feedback on OAT orchestration/tooling and on the `oat-wave-execute` skill
itself — bugs, friction, and things that worked well.

**Logging contract (for the orchestrator and any lifecycle skill touching this
project):** append an entry whenever something breaks, surprises, requires a
workaround, or works notably well. Structural entries (dispatch stamps, gate
results, STOP/park events, bootstrap statuses, disposition maps) are appended as
one-liners referencing artifacts by path; judgment entries are agent-authored.
Never delete entries; strike through with a correction note if one turns out
wrong. Version-stamp tool-related observations. Keep entries short and factual.
Run `pnpm format:fix` on this file after writing. Tag entries that bear on the
wave-skill's design with a **Skill signal (strengthens/contradicts/gap):** line —
those drive the upstream implementation.

**Entry format:**

    ### YYYY-MM-DD · [project | general] · [bug | friction | worked-well | feedback] · <area>
    What happened (1-3 sentences). Impact/workaround. Follow-up (backlog / upstream / none).

**Structural entry format (skill-appended):**

    ### YYYY-MM-DD · structural · <skill> · <scope>
    One-line mirror of the skill's structured output. Reference artifacts by path.

---

## Entries

### 2026-09-07 · structural · oat-wave-execute · preflight

`wave-5-execution` created from `origin/main`
`0f47bf7004166d420758d1bcd77d253007174332` (the Lite workflow PR #264 merge commit, lockstep 0.2.62;
W4 merged as PR #271 `81b784c3d`, wave-close PR #272 `f83463e64`). The
operator asked on 2026-09-06 for the remaining waves to start automatically once
PR #264 merged (a 15-minute merge watch fired at 2026-09-07T04:00:59Z).
`pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm type-check` exit 0.
Draft PR #190 still open at `63161897d`. Remote name will be
`origin/wave-5-execution-2026-09`.

---

### 2026-09-07 · structural · oat gate review · plan

Plan gate attempt 1 (run `b26aff5c`) blocked 0C/1I/1M/1m: the wrapper's
recon-found current-contract changes (p03 pin set, p10 Lite mode) were labelled
non-authoritative while the immutable source plans lack them. Attempt 2 (run
`e4f1049a`) repeated the findings because the orchestrator's repair script
aborted on an anchor that oxfmt had re-wrapped before writing anything —
recorded as `superseded`. Repair: a `## Wave-Boundary Refresh Addenda
(authoritative)` section under the program's pre-dispatch refresh clause.
**Skill signal (gap):** the wave skill needs an explicit mechanism for applying
pre-dispatch refreshes to immutable plans; the W3/W4 "descriptive observation"
framing is rejected by the gate once a refresh changes a task's contract.
**Skill signal (strengthens):** repair scripts must assert every anchor before
writing and must never be followed by an automatic gate re-run in the same
command.

---

### 2026-09-07 · structural · oat gate review · plan (attempts 3–5)

Attempt 3 (`80c5b964`) blocked: the addenda claimed equal authority while the
Architecture still said "entire and only". Attempt 4 (`e8b7c6c5`) blocked: the
governing `oat-wave-execute` brief rule says the external plan is the entire
contract, so a plan-plus-addendum model cannot be briefed without changing the
skill. Resolution: apply the refreshes to the eight source plans themselves as
dated `Refresh applied 2026-09-07 (wave-5 boundary)` entries in their
`## Revalidation Before Execution` sections — the program's own pre-dispatch
mechanism (used 2026-09-03 and 2026-09-04) — and return the wrapper to the
single-contract model. Attempt 5 (`3c8b9eb2`) passed with zero findings.
**Skill signal (contradicts):** the W3/W4 convention "plans are immutable
inputs; corrections at wave close" is wrong for refreshes that change a task's
contract; the wave skill should say: apply pre-dispatch refreshes to the plan
files as dated Revalidation entries, and reserve wave-close corrections for
execution records. Five plan-gate runs is at the program's diminishing-returns
cap; the last two findings were about the mechanism, not the wave's scope.

---

### 2026-09-07 · structural · oat-wave-execute · p09 STOP → park

p09 parked with no commit: the plan's resume premise (the status probe sees the seal and skips the append) is false against the real CLI — reproduced, not inferred (two seals appended on replay). Wrapper rule 4 applied; p10 and p11 proceed on the current tip. **Skill signal (strengthens):** the STOP→park rule worked as designed — the lane stopped before widening a guard that would have created a real regression, preserved its work as a patch, and filed the refresh item. **Skill signal (gap):** the plan-readiness contract (p07) checks dependency tables, not load-bearing behavioral premises; a "premise probe" step at wave-boundary recon (execute the plan's stated current-state claims against the built CLI) would have caught this before dispatch.

---

### 2026-09-07 · process · oat-wave-execute · p11 review brief inverted the seal ordering

The orchestrator's p11 review brief (ruling 2) said the retirement sweep runs
"after the roll-up/seal and before the Step 8 archive block"; the plan requires
the inverse (inside Step 3.7, before the roll-up and seal — the post-seal
placement is the defect being fixed). The implementation followed the plan; the
reviewer flagged the brief, ran the inverted placement as a red proof (it fails
the shipped ordering test), and no code changed. **Skill signal (gap):** a
review brief's phase-specific rulings must be derived from the plan's own step
text, not summarized from memory of the wrapper; when a ruling states an
ordering, quote the plan sentence it comes from so a reviewer can check the
brief against the contract.

---

### 2026-09-07 · synthesis · oat-wave-execute · end of run (wave 5)

Eleven lanes in five groups; ten merged, one parked (p09, STOP on a reproduced
false premise). One lockstep bump (0.2.62 → 0.2.63) with the manifest restamp
in the same commit; six fan-ins, each with the eight-gate sequence and
uncached test runs (6011 CLI tests at the tip). Review economics: six lanes
needed one fix round with a round-2 verification (p02, p03, p06, p07, p08,
p10); four passed with an address-now sweep (p01, p04, p05, p11); no Critical
reached a root reviewer; the in-lane Codex rounds caught two real defects
before commit (p04's over-broad index-lock detector; p08's `resolveLifecycleCritic`
model) and the root reviewers' live probes caught a red root `pnpm test`
(p08's smoke-tier pin) and a vacuous project glob (p11). Ten backlog items
archived; thirteen follow-ups filed across the wave (two at the p09 park, one at the p10 fix round, ten at closeout). **Skill signals for `oat-wave-execute`:**
(1) pre-dispatch refreshes belong in the source plans as dated Revalidation
entries (the gate rejected wrapper-side addenda three times); (2) a lane that
bumps a skill must sweep old version literals repo-wide in plain and
regex-escaped forms and run `pnpm test:smoke`; (3) gates run sequentially in
one worktree; (4) SHAs in reports are pasted from `git rev-parse`; (5) a
reviewer's "do not weaken — file and pin" ruling governs the fix round; (6) a
wave-boundary "premise probe" (execute each plan's current-state claims against
the built CLI) would have parked p09 before dispatch; (7) review-brief rulings
quote the plan sentence they derive from.

---
