---
oat_retro_project: gate-execution-contract-hardening
oat_retro_generated: 2026-08-31T02:23:13Z
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
  - source: git-history
    status: used
  - source: decision-records
    status: used
  - source: session-transcript
    status: used
  - source: child-run-transcripts
    status: unavailable
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: Gate Execution Contract Hardening

## Executive Summary

The project successfully consolidated two discovery-only efforts into one
configuration-to-runtime gate contract and completed with 13 tasks, a clean
independent review, a clean replacement exit gate, and green PR checks. The
strongest result was not merely the code: the run exercised the contract under
parallel implementation, iterative parser review, a moving main branch, stale
closeout evidence, and cross-runtime gate execution.

The main improvement opportunity is evidence completeness around project
retirement. Deleting directories and moving backlog records was insufficient;
active prose still carried the superseded ownership model and required two
additional decision reviews. The run also surfaced two workflow-level lessons:
process diagnostics must avoid exposing command-line secrets, and a retro
requested after lifecycle completion cannot append its mandated receipt after
the project log has been sealed.

## Evidence and Review Method

The synthesis used the append-only `project-log.md`; completed lifecycle
artifacts (`discovery.md`, `design.md`, `plan.md`, `implementation.md`,
`state.md`, and `summary.md`); all archived plan, phase, and final review
Markdown; both configured exit-gate receipt generations; branch Git history;
and decision records `DR-260831-conservative-direct-command`,
`DR-260831-cause-specific-fail-closed`, and
`DR-260831-synchronous-configured-command`.

The original Codex root session `01a054a9-833a-7963-9d67-86d55e5c63f1`
was used for operator choices, corrections, and orchestration incidents. Child
transcripts were deliberately excluded as derivative evidence. No
`oat-execution-learnings.md` existed. Four transcript compactions mean hidden
intermediate reasoning is unavailable; durable artifacts outrank transcript
reconstruction for code and test outcomes. The exact security-sensitive value
from the process-diagnostic incident was intentionally neither inspected nor
reproduced.

Claims below are confirmed unless explicitly qualified. Review paths, decision
IDs, project-log headings, and commit IDs provide stable anchors.

## Outcome Snapshot

| Area          | Generation-time evidence                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Lifecycle     | Complete at `2026-08-31T01:54:13.973Z`; 13/13 tasks                                                        |
| Configuration | Canonical global `--json` is enforced before recognized gate-command writes                                |
| Runtime       | `artifact_missing` is distinct from correlation mismatch; both fail closed                                 |
| Integration   | Exact stored command proved structured success, missing artifact, and wrong-run outcomes                   |
| Consolidation | Both predecessor directories are absent; both backlog items are closed and archived                        |
| Verification  | Final decision review and replacement exit gate each reported zero findings                                |
| GitHub        | PR #246 was open, mergeable, clean, and green at generation time                                           |
| Boundaries    | Receipt/event redesign, ReviewPlan, bookkeeping-only re-review, and general integrity stayed outside scope |

## Current State

- **Promotions:** Proposed — RP-01 is eligible for an interactive repository
  guidance update.
- **Filing:** Proposed — UP-01 and UP-02 have no destination yet.
- **Unsettled items:** RP-01 awaits apply consent; UP-01 and UP-02 await an
  explicit filing decision and destination.

## What Went Well

- The p01/p02 split used genuinely disjoint ownership. Plan-order fan-in and
  the `oat-project-implement · p01-p02` project-log event preserved a clean
  integration boundary while allowing parallel work.
- Review retries were substantive. p01 used two bounded iterations to close
  `--cwd`, shell-shape, and empty-token gaps before
  `code-p01-review-2026-08-30T225810Z.md` reached zero findings.
- The implementation proved its public seam instead of testing helpers alone.
  `DR-260831-synchronous-configured-command` and commit `5dfaa596` bind the
  exact stored command to headless execution and structured outcomes.
- Closeout freshness failed safely. Merge commit `3e40f1ab` changed the
  effective delta, invalidated the earlier gate generation, and forced fresh
  verification, review, and a replacement gate rather than reusing stale
  approval evidence.
- Cause-specific failure remained narrow. `DR-260831-cause-specific-fail-closed`
  introduced an actionable missing-artifact terminal without absorbing receipt
  redesign or retry authority.

## Challenges and Struggles

### Parser edge cases required executable counterexamples

The first validator implementation handled the intended prefix but missed
supported `--cwd` forms, unsafe shell shapes, and empty quoted tokens. Two
bounded p01 reviews converted those gaps into exact tests. Later, the first
configured exit-gate review deferred a single-quoted-backslash observation on
the claim that direct-prefix classification was unaffected. The reconciliation
review constructed counterexamples such as a quoted malformed `gate` token and
disproved that claim. Commit `ecefc1d0` moved single-quoted handling before
generic escapes, and the final two reviews were clean.

### Main moved after closeout evidence had passed

PR #246 became conflicting after the first review and gate cycle. Completing
anyway would have left a green lifecycle attached to an unmergeable branch.
The operator chose reconciliation first. The merge preserved main's PJM
migration and the branch's archived outcomes, but the changed fingerprint
correctly made the previous exit gate stale. Fresh review found three issues,
including contradictory ownership prose; the first ownership patch fixed only
the primary passages, so `final-review-2026-08-31T012845Z.md` found four more.
Commit `c56ba699` completed the semantic sweep, after which both the decision
review and replacement gate reported zero findings.

### Verification commands shared mutable bundle state

Running `pnpm test` and `pnpm build` concurrently caused both lanes to rebundle
the same CLI asset directory, and the test lane failed on an asset-directory
rename while build passed. This was an orchestration failure, not a product
test failure. The commands were rerun sequentially with their own exit codes;
check, type-check, test, build, lint, and format then passed.

### A process diagnostic surfaced a credential

A broad process inspection emitted a Cursor worker credential in tool output.
The impact was potential secret exposure unrelated to the product change. The
incident was disclosed immediately, the operator was advised to rotate the
credential and restart the worker/application, and the sensitive value was
excluded from all retrospective evidence. The project result was unaffected,
but future diagnostic guidance should prevent this class of disclosure.

## Decision Register

| Decision                                    | Rationale and consequence                                                                               | Durable anchor                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Reject recognized invalid gate commands     | Actionable failure was safer than persisting a known malformed structured-output contract               | Operator approval at session event `22:05:30Z`; `DR-260831-conservative-direct-command` |
| Distinguish missing artifact from mismatch  | Absence and observed wrong correlation require different recovery diagnoses                             | `DR-260831-cause-specific-fail-closed`                                                  |
| Require synchronous exact-command proof     | Helper tests did not prove the stored configuration-to-envelope path                                    | `DR-260831-synchronous-configured-command`                                              |
| Resolve PR conflicts before completion      | A clean lifecycle could not authorize an unmergeable branch or stale reviewed delta                     | Operator choice at session event `00:47:27Z`; merge `3e40f1ab`                          |
| Use High dispatch; disable extra phase gate | Preserve strong implementation/review routing without adding a redundant cross-runtime phase checkpoint | Operator choice at session event `22:16:08Z`                                            |

## Rejected or Superseded Alternatives

- Warning while saving a recognized invalid command was rejected because it
  would preserve the durable defect and defer failure to headless execution.
- A general shell parser was rejected in favor of a conservative direct-command
  boundary; wrappers and pipelines remain not applicable.
- Treating clean no-artifact completion as a correlation mismatch was
  superseded by a cause-specific terminal and recovery message.
- The two predecessor quick projects were superseded by one combined owner;
  their directories were deleted rather than left as competing scaffolds.
- Reusing the first exit gate after merging main was rejected because its
  effective-delta fingerprint no longer matched the reviewed implementation.

## Where We Changed Course

| Trigger                                   | Changed direction                                                    | Outcome                                                         |
| ----------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Configuration-boundary choice             | Moved from warning/save ambiguity to blocking canonical validation   | Invalid recognized commands now fail before persistence         |
| Executable single-quote counterexample    | Reversed the first gate's Minor deferral                             | POSIX-literal backslashes are covered by tests and final review |
| PR became conflicting                     | Paused final approval and merged current main                        | PR returned to a clean, mergeable state with fresh evidence     |
| First ownership fix missed later passages | Expanded from primary-path repair to whole-discovery semantic search | No active prose can recreate the superseded split               |
| Concurrent verification race              | Stopped parallel evidence lanes for bundle-mutating commands         | Sequential rerun produced trustworthy command exits             |

## New Architecture Patterns and Approaches

- **Pure classification before mutation:** `configured-command.ts` owns a
  side-effect-free contract; `gate set` consumes it before any configuration
  layer write.
- **Cause-specific terminal writers:** missing artifact and observed mismatch
  are separate public outcomes with shared fail-closed eligibility semantics.
- **Configuration-driven subprocess proof:** the integration test stores and
  resolves the command, selects the source CLI through `PATH`, and varies only
  the deterministic fake runtime outcome.
- **Immutable reviewed basis plus rolling freshness:** the replacement gate
  persisted the reviewed head, effective-delta fingerprint, launch intent,
  accepted run marker, result, and receive receipt across distinct durable
  transitions.

## Domain Learnings

- Shell validation must compare tokenization with real shell argv behavior;
  visually plausible strings are not sufficient evidence.
- An artifact that does not exist and an artifact that exists but belongs to a
  different run are different operational classes even when both fail closed.
- Project retirement is semantic. Filesystem deletion and backlog archival do
  not retire contradictory active prose.
- Review freshness is a property of the effective delta, not of a previously
  green branch name or PR number.

## Gotchas for Humans

- Put the global flag before the command: `oat --json gate review ...`.
- Do not run repository gates that invoke CLI asset bundling concurrently;
  capture each command's own exit code sequentially.
- After merging a moving base, expect prior final-review and gate evidence to
  become stale even when conflict resolution is mostly bookkeeping.
- If a diagnostic output may contain process arguments or environment-derived
  values, inspect only the necessary fields and redact before sharing.

## Gotchas for Autonomous Agents

- Never dump complete process command lines or environments when a PID,
  executable, cwd, descriptor count, or selected argument is sufficient.
- When retiring a project, search by project slug, backlog ID, and ownership
  language across active planning surfaces; a directory-absence check is not
  enough.
- Once a gate run marker proves acceptance, await that exact run. Do not launch
  a replacement merely because the child is slow or quiet.
- Do not parallelize commands that share mutable generated assets. A later
  success must use a clean sequential rerun and an explicit terminal exit.
- Treat a reviewer deferral as a hypothesis when a small executable
  counterexample can decide the claim.

## Repo Improvements (Promotion Register)

### RP-01: Add secret-safe process-inspection guidance

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** `AGENTS.md`
- **Applied-ref:** —
- **Disposition-note:** —

Add a short diagnostic safety rule requiring agents to inspect only necessary
process fields and to avoid printing full command lines or environments that
may contain credentials. The original session's safe disclosure at
`00:27:24Z` confirms the failure class without retaining the exposed value.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Make consolidated-project retirement checks semantic

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

Quick-start consolidation and completion guidance should verify more than
deleted directories and moved backlog files. A bounded sweep by absorbed
project slugs, backlog IDs, and future-oriented ownership language should
either prove that active planning surfaces name the combined owner or create a
fix task. Reviews `final-review-2026-08-31T010800Z.md` and
`final-review-2026-08-31T012845Z.md` show that two manual passes were required
to eliminate duplicate-ownership guidance.

### UP-02: Define a retro receipt path after project-log sealing

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** —

`oat-project-complete` requires the completion seal to be the final project-log
entry, while a later explicit `oat-project-retro` run requires appending a
structural receipt when the log exists. Define a compatible post-completion
receipt contract—such as a dedicated addendum ledger or project-ref receipt—so
an explicitly requested retro can remain durable without violating the seal.

## Remaining Boundaries and Follow-Ups

- RP-01 requires interactive apply consent before `AGENTS.md` changes.
- UP-01 and UP-02 require an explicit filing decision and destination; no
  tracker write is authorized by retro generation alone.
- PR #246 was open and unmerged at generation time. Merge remains a separate
  human-controlled action.
- The credential rotation/restart advised during the session is an operator
  action outside the project lifecycle; this artifact does not claim it was
  completed.

## Run Receipt

The pre-action apply snapshot contained RP-01; no apply action was entered, so
one initially eligible item remains and the action outcome is `deferred`. The
filing snapshot contained UP-01 and UP-02; no filing action was entered, so two
initially eligible items remain and the action outcome is `deferred`.

The project log was already sealed by `oat-project-complete`, whose seal is the
final permitted log entry. No post-seal append was attempted. The equivalent
immutable receipt is preserved here and by the synced project-ref commit:

```text
retro artifact=.oat/projects/synced/gate-execution-contract-hardening/references/project-retro.md evidence_used=archived-review-markdown,decision-records,gate-receipts,git-history,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=child-run-transcripts,oat-execution-learnings promotions=1 upstream=2 apply=deferred filing=deferred
```

## Reflections

The result is trustworthy because the project did not treat green tests,
reviews, or gates as timeless. Each change in the effective implementation
basis forced the relevant evidence to be regenerated, and cause-specific
diagnoses remained tied to receive eligibility rather than generic exit codes.

The run also showed where structural correctness is insufficient. A project
can be deleted yet still exist in active prose; a parser can appear bounded yet
still disagree with the shell; a green command can carry misleading cached
logs; and a completed lifecycle can make a later retro receipt impossible.
Future work should prefer semantic sweeps, executable counterexamples, narrow
diagnostics, and explicit durability transitions over inference from names or
ambient state.
