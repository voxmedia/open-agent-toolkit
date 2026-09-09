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

### 2026-09-08 · structural · oat-wave-execute · plan gate attempt 2 → group 1 dispatch

Plan gate attempt 2 (run `c023731b`) passed 0C/0I/1M; the Medium (write
inventory built from `### In scope` alone, missing Test-plan and step test
files and the `oat-project-summary` bump) was addressed in the receive: the
inventory now unions In scope, Test plan, Implementation-step test files, and
pin implications; within-group intersections stay empty. Group 1 (p01, p02,
p03) bootstrapped at `985717d53` (three `status=success`, view-parity ok) and
dispatched on opus. **Skill signal (strengthens):** the program's rule that
intersections come from steps, test plans, generated files, and pins — not
Scope lists — is the right bar; a Scope-only sweep passed my own audit and
Codex's composition check but not the gate.

### 2026-09-08 · structural · oat-wave-execute · p02 STOP → refresh → resume

p02 stopped before committing: the plan's Step 2 premise ("the strict
effective read was used for one boolean") was true of the result and false of
the call — the read was also the whole-config barrier in front of every unset
write, and removing it accepted two inputs the weaker-anywhere list does not
name (reproduced pre/post on the built CLI by the lane's Codex round and the
lane). The STOP's remedy lies inside the plan's own file scope, so a dated
refresh (targeted strict barrier: read the untargeted surfaces strictly, plus
the targeted shared surface on the `pjm.remote` raw-write branch; cases 7–8;
control corrections) was applied to the plan and the lane resumed on its
staged work — the wave-6 p03 pattern. **Skill signal (strengthens):**
"reproduce, report, never improvise" again produced a precise design change.
**Skill signal (gap):** a plan that deletes a call must audit the call's side
effects, not only its result's consumers; the same-model review pass read
"used for exactly one thing" and did not ask what else the call did.

### 2026-09-09 · structural · oat-wave-execute · group 1 fan-in

Three lanes merged in plan order (`ea2f5a675`, `7b9793b8f`, `f175ca2da`;
five lane commits patch-id-identical after rebase), lockstep 0.2.66 → 0.2.67
(`f0eb1c02e`, manifest restamped in the same commit), eleven gates exit 0 with
`Cached: 0` (cli 7105 tests), config integrity clean. Every lane needed a
plan-level intervention: p01 a false control claim (dated correction), p02 a
STOP on a side effect of a deleted call (dated refresh, lane resumed), p03 a
deviation plus six silent-acceptance holes found by the reviewer's `oxfmt`
oracle battery (dated refresh, fix round, 69-shape round-2 battery clean).
**Skill signal (strengthens):** reviewers with their own adversarial probes
found what two Codex rounds each missed (p03: a 54-shape battery vs. a
self-consistency invariant; p02: a 432-pair mechanical weaker-anywhere sweep).
**Skill signal (gap):** three lanes hit the same `/tmp/<phase>-*` collision
with wave-6 artifacts; the common brief now mandates `mktemp -d` scratch and an
mtime check — the skill's brief template should carry that rule.

### 2026-09-09 · structural · oat-wave-execute · p05 STOP → refresh → resume

p05 stopped at its Step 5 sweep: the plan's expected classification was
derived from the files it inspected while the command it prescribes is
`src`-wide, so four member-access sites surfaced unclassified — one created
downstream by the plan's own Step 2 fix (`mergeEffectiveDispatchMatrix`
re-swallows the preserved key) and three user-supplied-id lookups where
`--target __proto__` / `--provider __proto__` crash or print
`unsupported (undefined)`. Decision written as a dated refresh: fix A (it is
the Outcome), guard B–D through the same helper (strictly stricter error
paths; controls pin that real ids are unchanged). **Skill signal (gap):** a
plan that prescribes a repo-wide enumeration as its completeness proof must
run that exact command at authoring time; an inspected-files classification
passed the same-model review and failed on the first live sweep.

### 2026-09-09 · structural · oat-wave-execute · group 2 fan-in

Three lanes merged in plan order (`a9bfb0a3c`, `7bbafded2`, `28618fbba`; six
lane commits patch-id-identical after rebase), one root address-now
(`572a4dd87`), lockstep retained at 0.2.67, eleven gates exit 0 with
`Cached: 0` (cli 7163), config integrity clean. p05 was the consequential lane:
its Step-5 sweep STOP became a dated refresh, and its cross-model round then
found a global prototype-pollution path the plan, the refresh, and the root
had all missed — closed with a base → intermediate → head control the reviewer
reproduced on the built CLI. **Skill signal (strengthens):** the standing
cross-model rule for security-class diffs earned its keep. **Skill signal
(gap):** a fix that makes a hidden key visible relocates the hazard; plans
of that shape need a "blast radius of the fix" step, and sweeps must grep by
shape as well as by variable name.

### 2026-09-09 · structural · oat-wave-execute · group 3 fan-in

Three lanes merged in plan order (`7c5a6aa01`, `17d271b23`, `95ad10827`; five
lane commits patch-id-identical after rebase), one root address-now
(`001ecfa7e`), lockstep retained at 0.2.67, eleven gates exit 0 with
`Cached: 0` (cli 7187), config integrity clean. The quietest group so far:
one plan correction (a cited test case that never existed), one retracted
lane diagnosis (the reviewer instrumented what the lane had only reasoned
about), and two Minors small enough for root address-nows. **Skill signal
(strengthens):** requiring "found and fixed" claims to come with counts is
paying off — p09's false diagnosis would otherwise have entered the retro as
a lesson.
