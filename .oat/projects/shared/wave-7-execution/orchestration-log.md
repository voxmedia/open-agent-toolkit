---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-08
---

# Orchestration Log: wave-7-execution

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
Run `pnpm exec oxfmt <file>` on this file after writing. Tag entries that bear
on the wave-skill's design with a **Skill signal (strengthens/contradicts/gap):**
line.

---

### 2026-09-08 · structural · oat-wave-execute · preflight

Branch `wave-7-execution` cut from `origin/main` `684bd3be32e65fc8db0646f336ab4335c317ba2c` (after the
wave-7 composition PR #284); install, build, type-check green. Drift checks
were run mechanically by the root for all twenty plans (20 PASS / 0 / 0): the
only commits since the plans' inspected head are the plans, index, program, and
two backlog items themselves. No recon subagent was dispatched.
**Skill signal (gap):** the skill's Step 2 assumes a recon dispatch per wave;
when the composing PR is the only movement since the plans were authored, the
drift set is provably empty from `git diff --stat` alone and a dispatch buys
nothing — a "zero-drift short circuit" clause would make that explicit.

### 2026-09-08 · structural · oat-wave-execute · composition under the ceiling

The program's eight-group Wave 7 map (7/5/2/2/1/1/1/1 lanes) was batched to the
operator's concurrency ceiling of 3 as six triples plus two ungrouped finale
lanes (`validate-plan` rejects singleton groups), keeping one
`validation/skills.test.ts` writer per group and every stated ordering; the
mechanical write-surface intersection (`writes.py`, twenty `### In scope`
sections) is empty inside every group. **Skill signal (strengthens):** the
"program composes, wrapper batches to the ceiling" split held without a
recomposition; the program artifact's Wave 7 section will record the executed
batching at wave-close.

### 2026-09-08 · structural · oat-wave-execute · plan gate attempt 1 → parked p09 recovery

Plan gate attempt 1 (run `f905852e`, codex-5-6-sol-xhigh) blocked: 1C/2I/1M.
The Critical was real and mine: I had pointed p04 at the branch `wave-5/p09`
without checking that it carries a p09 commit (it does not — the lane never
committed), while the wave-5 close had removed the parked worktree and the
scratchpad patch it relied on was lost to a session restart. Recovery: the
wave-5 implementer transcript still holds every Write/Edit and the two
post-edit Python patches; replaying them on the group-4 base `956773dc6`
reproduces the plan's recorded figures exactly (117/17, 218 lines, 165 and 249
lines) and a dangling blob (`c814b0605`) confirms `SKILL.md` byte-for-byte. The
bytes now live at `.oat/projects/shared/wave-7-execution/parked/wave-5-p09/`. Also fixed: the
archive set (two update-only items), the program ledger (W7 `in-progress` with
the approval evidence), and a false root-`AGENTS.md` write for p19 that my
In-scope regex had invented from a skill-internal reference.
**Skill signal (gap):** parking a lane at wave close must preserve its patch
inside the wrapper project directory (tracked), never in an orchestrator
scratchpad — a session restart destroys scratch; the wave-5 close recorded
"patch preserved in the orchestrator scratchpad" and that was the only copy.
**Skill signal (strengthens):** the plan gate's "immutable plan STOP replaced
by a workaround" check caught a substitution that would have sent p04 into a
STOP or, worse, a silent re-derivation.
