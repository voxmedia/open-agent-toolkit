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

### 2026-09-09 · structural · oat-wave-execute · group 4 fan-in

Three lanes merged in plan order (`13705dcdc`, `bb082e505`, `0f1711d88`;
three lane commits patch-id-identical after rebase), lockstep retained at
0.2.67, eleven gates exit 0 with `Cached: 0` (cli 7209), config integrity
clean. Two frictions: (1) commitlint rejected the p10 merge commit because the
fan-in script put the plan's 105-char title on one body line — the merge was
completed with a folded body and the script now folds titles; (2) the gate
run had been launched in the same shell line as the merge and started on the
staged-but-uncommitted tree — killed before any gate completed, re-run on the
committed tip. **Skill signal (gap):** the merge choreography rule ("compound
the guard and the merge in one invocation") should also say "never chain the
integration gates behind the merge in the same invocation; start them only
after `git status` is clean and `MERGE_HEAD` is gone." One root-filed
follow-up (`BL-260909-repair-the-bare-fences-that`) and three dated plan
corrections this group.

### 2026-09-09 · structural · oat-wave-execute · p15 STOP → refresh → resume

p15 stopped before committing: the helper it extracted "verbatim" carries a
pre-existing symlink hole (sentinel skipped by pathname, root never
`lstat`ed) that the plan's reuse promoted into the detector and the planner —
a substituted provider view reads `in_sync`. The plan's mechanism clause
("no behavior change") and its weaker-anywhere rule could not both hold; the
rule wins. Dated refresh: harden the shared helper, accept the stricter
`detach` verdict on the retirement path, pin every shape on every consumer.
**Skill signal (strengthens):** the third lane this wave whose cross-model
round found a defect in code the plan told it to reuse unchanged — "moved
verbatim" is not a safety property when the moved code gains callers.

### 2026-09-09 · structural · oat-wave-execute · group 5 fan-in

Three lanes merged in plan order (`de8c5b391`, `5d6b0461d`, `5171bf3cf`;
three lane commits patch-id-identical after rebase), one root address-now
(`da248f346`), lockstep retained at 0.2.67, eleven gates exit 0 with
`Cached: 0` (cli 7253; the widened bump gate validated nine bumps on the
integrated tip), config integrity clean. p15 was this group's STOP → refresh
→ resume (a helper moved "verbatim" carried a symlink hole into two new
callers); p13 needed the review to adjudicate a plan-licensed narrowing of a
CI gate against the categorical weaker-anywhere rule. **Skill signal
(strengthens):** giving the reviewer an explicit adjudication ruling, with
the evidence it must produce, converted a judgment call into a documented,
pinned decision instead of an argument.

### 2026-09-09 · structural · oat-wave-execute · p16 STOP → park

p16 parked without a commit: the plan prescribes a git `execFile` seam inside
the dispatch recorder, and the recorder graph's own guard test forbids any
process launch there. Unlike p02/p05/p15, no dated refresh could close this
one — every alternative hits the guard, evades it, drops a required field, or
is excluded by the plan and issue #265, and amending a documented
no-provider-launch contract is an architecture decision, not a mechanical
correction. The lane found the conflict cleanly, ran a three-way control, and
preserved Steps 2–3 plus a real pre-fix journal fixture, now committed under
the wrapper's `parked/wave-7-p16/` (the wave-5 p09 lesson applied). **Skill
signal (gap):** plan authoring that adds a capability to a module must grep
that module's own test file for architectural guards; the same-model review
pass read "touches git nowhere" as incidental state, not as an enforced
invariant. **Skill signal (strengthens):** "STOP → park, siblings continue"
held with zero collateral — p17 and p18 are unaffected.

### 2026-09-09 · structural · oat-wave-execute · p17 STOP → refresh → resume

p17 stopped before committing: the plan's own decoding and blanking
prescriptions produced four widenings outside its enumerated set, found by
the lane's differential run of the real old and new code. The requirement
(base acceptance plus exactly two widenings) is unchanged; the mechanism was
wrong. Dated refresh: fence machine first, declarations only at an original
column 0, no label decoding, a single unreserved-only destination decode
with residual `%` rejecting, a closed HTML-block opener list, the floor
raised. **Skill signal (strengthens):** the lane's "differential run of the
real code with identical injected probes" is the right shape of evidence for
a scanner change and should be a standing requirement in briefs of this
class. **Skill signal (gap):** `codex exec` wedged three times here (MCP
session expiry) — the cross-model gate needs a documented fallback and a
retry rule rather than an ad-hoc substitution.

### 2026-09-09 · structural · oat-wave-execute · group 6 fan-in

Two lanes merged in plan order (`7d2509f1b`, `f789c9261`; four lane commits
patch-id-identical after rebase), one root address-now (`6ee5cd45c`),
lockstep retained at 0.2.67, eleven gates exit 0 with `Cached: 0` (cli
7257; the bump gate validated ten bumps on the integrated tip; root
`pnpm test` now ends with `test:scripts`), config integrity clean. p16 was
parked on a plan STOP (the recorder graph's no-process guard forbids the
plan's git seam — a redesign, not a refresh; partial work kept under the
wrapper). p17 needed two enumerations after its refresh: the resumed lane's
differential surfaced class (c), and the root reviewer's 50,625-document
combinatorial sweep surfaced class (d); the fix round then carried
hidden-ness out of band and bounded character references. **Skill signal
(strengthens):** a reviewer-built combinatorial sweep over the input grammar
found a widening that a 79-row hand-built differential could not; scanner
changes should require both. **Skill signal (gap):** the lane's Codex run
wedged twice while the reviewer's completed in ~230 s from the root
checkout — the cross-model gate's fallback should be "re-run from the root
at review", which is what happened here by instruction, not by rule.

### 2026-09-09 · structural · oat-wave-execute · p19 fan-in (ungrouped)

One lane merged alone (`12f50d7c2`; patch-id identical), one root address-now
(`2360559c8`), lockstep retained at 0.2.67, eleven gates exit 0 with
`Cached: 0` (cli 7259; the bump gate validated eleven bumps), config integrity
clean. The review re-verified every corrected fact against the code and the
refetched provider page, and corrected two root rulings (a pin that never
existed; a wrapper Ordering row that contradicted the source plan's own
soft-ordering rule). **Skill signal (strengthens):** briefs that state a
version-pin premise should carry the root's own grep result rather than a
belief — the lane and the reviewer both had to re-derive it. **Skill signal
(gap):** the wrapper plan restated a source-plan rule and got it backwards;
the wrapper should link the rule, never paraphrase it.

### 2026-09-09 · structural · oat-wave-execute · p20 fan-in (the hill; last lane)

The hill phase merged alone (`f6ccdab52`; patch-id identical), no address-now,
lockstep retained at 0.2.67, eleven gates exit 0 with `Cached: 0` (cli 7260;
the bump gate validated twelve bumps), config integrity clean. The review
upheld the lane's rejection of a cross-model Minor on its stated rationale
and confirmed the lane's observation that the bump gate enumerates paths from
committed diffs while reading values from the tree. All twenty lanes are now
merged or parked; the wrapper proceeds to closeout in the skill's order —
synthesis and summary, archival, root final review, exit gate, PR.
**Skill signal (strengthens):** asking the reviewer to adjudicate a rejected
cross-model finding explicitly (rather than letting the lane's rejection
stand by default) produced a measured, cited ruling in both directions this
wave. **Skill signal (gap):** a plan that asserts a gate count moves before
the commit exists is a plan written without running the gate at authoring
time — the authoring skill should require running every quoted gate command
once on the inspected head.
