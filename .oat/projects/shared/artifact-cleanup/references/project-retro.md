---
oat_retro_project: artifact-cleanup
oat_retro_generated: 2026-10-13T01:52:00Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: gate-receipts
    status: used
  - source: complexity-review-report
    status: used
  - source: dispatch-run-notes
    status: used
  - source: pr-review-threads
    status: used
  - source: ci-run-logs
    status: used
  - source: session-transcript
    status: used
  - source: subagent-transcripts
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: artifact-cleanup

## Executive Summary

The delivery shipped what it promised: readable lifecycle artifacts for newly
archived projects, a validated journal format, learnings in the project log,
and archive retries that cannot create twins. It ended at 155 commits, 150
files and lockstep 0.3.22 on PR #365, with every review and a third exit-gate
generation clean.

The run cost far more review than the scope needed. After the PR opened, an
external reviewer found eight real defects that four phase reviews, three
final rounds and a passing exit gate had missed, and the fixes then pulled the
exit gate into four rounds of hardening a scenario no requirement named:
two archive runs of one project at the same moment. The maintainer stopped it
by deleting the machinery. The lesson for next time is to test every review
finding against the contract when it is received, not only after a budget is
exhausted.

## Evidence and Review Method

Read directly by the root: `project-log.md`, `plan.md`, `implementation.md`,
`state.md`, `discovery.md`, `design.md`, the 25 archived review artifacts
(local only; reviews are never archived), the exit-gate receipts under
`.oat/repo/analysis/dispatch/`, the complexity report
`reviews/archived/complexity-final-2026-10-12T155559Z.md`, the run notes in
`.oat/repo/analysis/artifact-cleanup-run-1-dispatches.md`, the PR #365 review
threads, CI run logs, and this session's transcript. The session was
compacted once; events before the compaction come from its written summary.

Unavailable: `oat-execution-learnings.md` (no producer writes it any more, by
this project's design) and the subagent transcripts, whose returned reports
were read but not their tool-level detail. The project log holds structural
entries only; no judgment or learning entry was ever appended (see UP-02).

Labels below: **confirmed** means durable evidence supports it;
**hypothesis** names what would confirm it.

## Outcome Snapshot

| Area                   | Outcome                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Scope                  | Four phases, 60 tasks (39 planned, 21 from reviews), all completed                                                                  |
| Release                | Lockstep 0.3.22, 21 skill bumps, 10 decision records `DR-261012-*`                                                                  |
| Lifecycle reviews      | p01–p04 passed; final rounds 1–8 passed (round 8 on Sol after a Fable session limit)                                                |
| External review        | Warp: 8 Important, all confirmed and fixed; Cursor Bugbot: 2 Medium (one a duplicate, one a deliberate config choice)               |
| Exit gate              | Generation 1 passed on attempt 2; generation 2 exhausted; generation 3 passed clean                                                 |
| Operator interventions | Hold approval for the fix round; `simplify` disposition (delete the ownership protocol); two waivers (test timeout, docs-only edit) |
| Follow-ups             | Nine `BL-261012-*` items open, one filed and closed in-run                                                                          |
| State at generation    | Implementation complete, PR #365 open and green, completion not yet run                                                             |

## Current State

- **Promotions:** `complete`. RP-01 and RP-02 are applied in
  `13a851b73fa91b7f73d1d5ba2f59249f69ee3826` (AGENTS.md).
- **Filing:** `complete`. UP-01 and UP-03 are filed as local backlog
  items `BL-261013-classify-review-findings` and
  `BL-261013-documentation-sync-after` (receipt `2285880108074557780e3882bbc2fcb616150f39`, unpushed); UP-02 is
  rejected because BL-260713 already shipped its proposal.
- **Unsettled items:** None.

## What Went Well

- **The first exit-gate finding was a real data-loss bug.** Generation 1's
  attempt 1 (`reviews/archived/final-review-2026-10-12T055711Z.md`) showed a
  retry could adopt a damaged archive and delete the intact source. The
  lifecycle reviewers had not seen it. The fix (p04-t08) rehashes before
  adoption. Confirmed.
- **Verification before disposition.** Every external finding was reproduced
  by a root-dispatched lane with the branch build before anything was fixed.
  All eight Warp findings held up, which made the triage comment on the PR
  credible and kept the fix round bounded.
- **Neutralize-and-restore controls caught weak tests.** Round 4 found the W4
  test could not fail on its own clause (M1, fixed as p04-t22), and round 6
  found that a p04-t26 test rewrite had silently dropped a protection main
  already had (fixed as p04-t27). Both came from reviewers running the
  control, not reading the test.
- **The complexity review earned its dispatch.** It reframed four rounds of
  findings as one family, graded the evidence (barrier injection into the
  compiled module, no observed incident, every caller sequential), and gave
  the operator a decision in plain terms. The resulting deletion removed 377
  lines and dissolved the open High instead of fixing it.
- **The waiver mechanism did its job twice.** A test-only timeout and a
  docs-only edit after the gate were each covered by a named operator waiver
  without re-running a ten-minute cross-family review.

## Challenges and Struggles

### The exit gate hardened a scenario nobody asked for

After the external fixes, gate generation 2 attempt 1 reported that two
overlapping archive runs of one project could overwrite each other. The root
received it as a fix task (p04-t23, an exclusive owner-token claim). The
implementer then flagged the same gap for first archives (p04-t26), round 6
found that fix had narrowed an older protection (p04-t27), and attempt 2
reported a race in the takeover of a pending allocation (p04-t28). Each round
closed one interleaving and exposed the next.

Impact: two gate attempts, three review rounds and about 570 lines of product
and test code spent on a guarantee no contract source names. The protocol also
made the overlap case worse than main: main produced a duplicate archive,
while the new cleanup path could delete the one the other run had just
finished. Response: the complexity review at gate exhaustion classified the
whole family as new hardening; the maintainer answered that OAT should never
protect simultaneous archive runs and directed deletion (p04-t29, dd1231a7f).
Result: gate generation 3 passed clean. Confirmed.

The miss was at receive. The first concurrency finding was taken as an
accepted requirement without asking whether discovery, design or any decision
record required concurrent safety. None did (UP-01).

### Eight defects survived every lifecycle review

Warp's review of the opened PR found eight Important defects, most of them
composition failures between a producer and its consumer: the identity
manifest hashed `pr/` while the S3 upload and hydration excluded it (W1); the
writer emitted `-gN` names the parser read as slugs (W3); a successor path
ignored the scope rule the first archive followed (W4); plan progress read raw
lines while validation read fenced-masked records (W5). Each component's own
tests passed.

Impact: a 17-task fix round, four more review rounds and two gate
generations. Response: verification lanes, then fixes p04-t13..p04-t20.
Result: all eight verified closed. One fix then produced its own consumer
regression: dropping `pr/` from archives broke `oat-project-complete`, which
read the PR body from the archived `pr/` folder (round 4 H1, fixed as
p04-t21). Confirmed.

Hypothesis on why the lifecycle reviews missed them: the phase and narrowed
final rounds were briefed on a phase's own diff, and the composition defects
sit between phases (p01's digest, p03's archive identity, a skill that was
never in a phase diff). A review brief that names every consumer of a changed
set definition would confirm or refute this.

### The root broke CI with a one-line skill edit

The root fixed a round 5 Low by rewording a sentence in
`oat-project-complete`. A contract test pinned the old sentence, and CI failed
on the next push. The root had run the journal probe but not the contract
suites that quote skill prose. Fixed by re-pinning (76c931e7a). Confirmed
(RP-02).

### A contract test timed out in CI three times

`review-skill-contracts.test.ts` "validates absent review-ledger paths in
every project scope" scaffolds three projects through the built CLI. It takes
about 5 seconds locally and passed 30 seconds under CI load on three heads.
The branch was ruled out by timing `oat project new` on both builds (3.6
seconds each). Fixed with a per-test 120-second limit (cb61b448d) under a
waiver. Confirmed.

### A reviewer hit an account session limit

Final round 8's Fable reviewer failed at launch with an HTTP 429. The
maintainer chose to run the round on Sol high rather than wait an hour. Sol
reviewed read-only, so the root ran the executable checks; the delta lost its
second model family because the exit gate also runs on Sol. Confirmed.

## Decision Register

| Decision                                            | Rationale                                                               | Record                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Hold final approval for the external fix round      | Completing against a head reviewers rejected would misstate the journal | Implementation journal, Reviews and Gates                                             |
| `pr/` joins `reviews/` in one retention set         | Keeps the intentional S3 exclusion; one list defines the archive        | `reviews/archived/external-pr-review-2026-10-12T065140Z.md`                           |
| Disabled-log prose follows the CLI, not the reverse | `DR-260718-automatic-create-on-first` keeps an existing log writable    | D14 alignment note in `design.md`; `DR-261012-learnings-in-the-project-log` qualified |
| OAT does not protect simultaneous archive runs      | No contract source requires it; every caller is sequential              | Implementation journal disposition line; `project-artifacts.md`                       |
| Keep `--new-generation`                             | Shipped and reviewed; removal costs about a phase                       | Complexity report R2                                                                  |

The "no concurrent archive protection" decision is load-bearing and lives only
in the journal and one docs paragraph; a decision record would make it
findable. It is not proposed here because the docs paragraph already states
it where a user would look.

## Rejected or Superseded Alternatives

- **One per-project archive lock** (the complexity review's recommendation)
  was superseded by deleting the protocol outright, at the maintainer's call.
- **Uploading `pr/` to S3** instead of excluding it locally was rejected to
  keep the earlier S3 footprint policy.
- **Changing `append.ts` so a disabled flag wins** was rejected because it
  would strand recorded history, which DR-260718 exists to prevent.
- **Deleting the flaky test** was offered by the maintainer and superseded by
  a longer timeout, which keeps the guard.

## Where We Changed Course

- **External review requested changes** → final approval held, fix round run
  first → eight defects fixed before the checkpoint.
- **Gate generation 2 exhausted** → complexity review → protocol deleted under
  `simplify` → generation 3 passed.
- **Fable session limit** → round 8 on Sol high → passed with the root
  supplying executable evidence.
- **CI flake recurred** → timeout plus waiver instead of reruns.

## Domain Learnings

- **A hash over a set is only as good as the agreement on the set.** When a
  change adds an identity or manifest over "the retained files", find every
  other place that defines that set (copy filters, upload excludes, hydration
  excludes, the skills that read the archive) and derive them from one list.
- **A naming contract has a writer and a reader; test them together.** The
  scope-qualified generation names passed the writer's tests and the parser's
  tests separately and failed when composed.
- **Ownership checked per write does not converge.** Each added check moved
  the race to the next write site. If a concurrency guarantee is wanted, hold
  one lock for the whole operation; if it is not wanted, say so in the docs
  and delete the partial machinery, because a partial guarantee can be worse
  than none.
- **Cleanup must only touch what this run created.** The dangerous path in the
  deleted protocol was cleanup keyed on on-disk identity. In-memory "this call
  created it" flags plus a still-pending re-check are enough for a sequential
  tool.

## Gotchas for Humans

- **A post-gate commit stales the gate, even docs.** Any commit outside
  `.oat/projects` and `.oat/repo` after the exit gate passes changes the
  effective delta. For test-only or docs-only edits, give a named waiver
  instead of re-running the gate.
- **GitHub keeps a bot's "changes requested" after every thread is
  addressed.** Dismiss it or wait for the bot to submit a new review.
- **Concurrency questions deserve the "where would this come from" test.**
  Asking it at the first finding would have saved the whole generation-2 loop.

## Gotchas for Autonomous Agents

- **At receive, classify every finding against the contract** as accepted
  requirement, regression or new hardening. Do not convert new hardening into
  a fix task without asking the operator; it compounds.
- **After editing any `.agents/skills/**` prose, run the contract suites**
(`src/commands/init/tools/shared`and`src/validation` in the CLI package),
  not only the probe you meant to satisfy.
- **When a fix removes a file or folder from a retained set, grep its
  consumers** in skills and docs, not only in code.
- **Record judgment learnings as they happen.** This project's log has none,
  although its own deliverable is learnings in the log.

## Repo Improvements (Promotion Register)

### RP-01: Classify review findings against the contract before fixing them

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** `13a851b73fa91b7f73d1d5ba2f59249f69ee3826`
- **Disposition-note:** —

Add one paragraph under Agent Workflow → Execution Continuation: before
converting a review or gate finding into a fix task, check that discovery,
design, spec or a decision record requires the guarantee it demands; a finding
that introduces a new requirement (the concurrency family here) goes to the
operator first. Evidence: the gate generation 2 loop, p04-t23 through p04-t28,
four rounds and about 570 lines later deleted.

### RP-02: Run the contract suites after editing skill prose

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** `13a851b73fa91b7f73d1d5ba2f59249f69ee3826`
- **Disposition-note:** —

Extend the Definition of Done note that already says to run `pnpm lint` and
`pnpm format` when a change touches `.agents/skills`: also run the CLI's
`src/commands/init/tools/shared` and `src/validation` vitest suites, because
contract tests pin skill sentences verbatim. Evidence: the root's one-line
wording fix in `oat-project-complete` failed CI on 20fc9c76d until re-pinned
(76c931e7a).

## OAT Upstream Feedback (Upstream Register)

### UP-01: Classify findings at every receive, not only at budget exhaustion

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-261013-classify-review-findings.md`
- **Destination-receipt:** `2285880108074557780e3882bbc2fcb616150f39`
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Filed as new; related to BL-260818-distinguish-operator-directed, which covers only the post-exhaustion decision point.

`oat-project-review-receive` and the implement gate receive convert findings
into fix tasks directly. The complexity-review fallback is the first place a
finding is classified as accepted requirement, regression or new hardening,
and it only runs after a loop exhausts its budget. A run spent two gate
attempts and three review rounds hardening a guarantee no contract source
named before that classification happened. Suggested direction: have receive
record a one-word classification per finding, and route `new-hardening` to the
operator before creating a task.

### UP-02: Prompt the orchestrator to record judgment learnings at decision points

- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Already shipped as BL-260713-root-agent-judgment-logging (2026-10-02): oat-project-implement tells the root agent to log judgment entries at the next bookkeeping boundary. The zero-entry log in this run was a root execution miss, not a missing prompt, so the proposal's premise does not hold.

`oat-project-implement` appends structural entries at each phase and gate
boundary, but nothing prompts a judgment or learning entry. A 60-task project
with an external review round, a complexity-review disposition, two waivers and
a reviewer substitution ended with zero judgment entries, so summary and retro
had no learnings to read. Suggested direction: at operator decisions,
complexity-review dispositions and gate exhaustion, the implement skill asks
the root to append one categorized learning through `oat project log append`.

### UP-03: Documentation sync after closeout stales the exit gate

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-261013-documentation-sync-after.md`
- **Destination-receipt:** `2285880108074557780e3882bbc2fcb616150f39`
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Filed as new; related to BL-260820-track-pr-closeout-evidence and BL-260903-project-document-should-prompt, whose mechanisms differ.

Running `oat-project-document` after the closeout snapshot is complete writes
docs outside the effective-delta exclusion set, so the passed exit gate no
longer covers HEAD. Closeout-check still reports complete and completion does
not re-check freshness, so the drift is silent unless the operator notices.
Suggested direction: either treat documentation-sync output as a closeout-only
descendant when a corroborating transition owns it, or have
`oat-project-document` detect a passed gate and offer the operator waiver.

## Remaining Boundaries and Follow-Ups

- `oat-project-complete` (summary roll-up and archive) had not run at
  generation; the maintainer intends to run it before merge.
- Warp's original "changes requested" stood at generation despite every thread
  being marked addressed; dismissing it is the maintainer's.
- Open follow-ups from this run include `BL-261012-wrap-up-pr-cross-reference`,
  `BL-261012-regenerate-the-archive-aware` and
  `BL-261012-archive-metadata-reads-map`.

## Reflections

The trustworthy part of this result came from independent reproduction, not
from review volume: the eight external findings, the damaged-archive High and
the two test-quality catches were each proven with a probe before anyone
fixed them. The untrustworthy stretch came from the opposite habit, treating
a reviewer's demand as a requirement because a reviewer made it.

Next time, ask of each finding where its requirement comes from, give review
briefs the consumers of every changed definition rather than one phase's
diff, and write the learnings into the log while they are fresh. The operator
fixed the most expensive mistake in this run with one question; the workflow
should ask it earlier.
