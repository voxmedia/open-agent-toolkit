---
oat_retro_project: tool-pack-scope-provider-truthfulness
oat_retro_generated: '2026-09-03T05:30:00Z'
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: git-history
    status: used
  - source: session-transcript
    status: used
  - source: oat-execution-learnings
    status: unavailable
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: tool-pack-scope-provider-truthfulness

## Executive Summary

The project delivered its scope: one source-qualified evidence model shared by
the picker, installation, inventory, sync, diagnostics, and dispatch reporting,
across seven phases and 30 tasks. All eight Definition-of-Done gates pass at
`0.2.52` and PR #255 is open.

The durable lesson is not about the feature. Three separate defects shipped
green behind tests that could not fail, and the mechanism was the same each
time: a check that reported success without establishing the thing it claimed.
Two were found only by running the real system, and one only by a reviewer of a
different model class. A verification method changed the outcome more than any
amount of review volume did.

## Evidence and Review Method

Used: the project log (4 entries), all lifecycle artifacts, 39 archived review
artifacts, git history across 197 commits, and this run's session transcript
for Phases 6-7 and the gate rounds.

Unavailable: `oat-execution-learnings` — no such surface exists in this
repository.

Phases 1-5 are reconstructed from durable artifacts and review markdown rather
than from live observation; this agent joined at the Phase 6 review boundary
after a predecessor Codex session dropped. Claims about those phases are
artifact-grounded. Claims about Phases 6-7 and the gate rounds are
session-grounded and independently re-verified against code where load-bearing.

Confirmed causes are distinguished from hypotheses below. The counts in
`## Outcome Snapshot` were derived by enumerating files, not estimated — an
earlier draft of `summary.md` and the PR body asserted "sixteen review rounds"
and "twelve same-model rounds" without counting, and both were corrected before
this retro was written.

## Outcome Snapshot

| Dimension          | Result                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| Scope              | 7 phases, 30 tasks, complete                                               |
| Commits            | 197 against `origin/main`                                                  |
| Diff               | 179 files, +35,751 / −2,022                                                |
| Gates              | 8/8 green at `0.2.52`, zero cache replays                                  |
| Tests              | 5,423 passing                                                              |
| Phase code reviews | 35 artifacts (p01:1, p02:6, p03:6, p04:9, p05:5, p06:4, p07:4)             |
| Other reviews      | 3 artifact, 1 Opus final, 1 cross-model gate (3 fix rounds + confirmation) |
| Backlog            | 3 items closed, 1 left open deliberately, 4 residue items filed            |
| Lifecycle          | PR #255 open                                                               |

## Current State

Three RP items and two UP items are registered, and all five are settled.
RP-01 and RP-02 are `applied` to `AGENTS.md` at `de0f72ea9`. RP-03, UP-01 and
UP-02 are `filed` as repo backlog items at that same commit, pushed. Both
rollups are `complete`. No upstream GitHub destination is configured, so the two
upstream items were filed against the repo backlog rather than an OAT tracker.

## What Went Well

- **Live verification, once adopted, was decisive.** A real nested Codex
  dispatch (root → depth-1 → depth-2) exposed a parser that reported every
  session as `root` and worked on nothing, in roughly ten minutes, against 658
  passing tests.
- **The implementer corrected the orchestrator twice**, and both times it was
  right: it traced the genuinely unguarded size surface to
  `parsePersistedOatDispatchRecord` rather than the generic record this agent
  named, and it flagged the `jsonc-parser` `__proto__` cause as outside its
  scope instead of silently widening.
- **Neutralization discipline emerged mid-project and worked.** From the
  Phase 7 gate rounds onward, each guard was broken to confirm its test
  actually failed. This caught one test that "passed for the wrong reason."
- **Deferrals were recorded rather than hidden.** Four gaps ship with backlog
  items and stated reasoning, including two that reflect poorly on the branch.

## Challenges and Struggles

**Destructive journal publication (Phase 6, review rounds 1-2).** The first fix
for an apply-time directory-swap race reported "no out-of-scope write" and
"identity-guarded cleanup." Round 2 disproved both by direct probe: the update
path clobbered an out-of-scope victim file via `rename`, and
`revertMisplacedPublication` then deleted it through a byte-equality ownership
branch. The operator directed eliminating the destructive class rather than
accepting the risk, which made publication append-only and `link`-only. Cost:
three fix rounds. Result: verified non-destructive, with the victim surviving
byte- and inode-identical under the reproduced swap.

**A parser that worked on nothing (Phase 7).** `extractCodexRuntimeMetadata`
read `payload.parent_id` and `payload.role`; real Codex 0.152.1 emits
`parent_thread_id` and `agent_role`. Every session parsed as `root`, every role
as `null`. The fixtures had been authored from assumption rather than captured
from output, so the tests encoded the same wrong world model as the code. A
full independent review round had already passed over it without detecting
this, because it probed with those same fixtures. The same class recurred in
the Claude parser, whose primary entry type (`"subtype":"init"`) appears in 0
of 2,725 local transcripts.

**Requirements verified on one clause (final gate).** The Opus final review
marked NFR1 implemented, having verified its destructive-filesystem clause and
tested redaction only on error messages — the surface that had already been
fixed. Absolute paths were persisting verbatim into the committed journal
through `caller`, `scope`, and `objective`. A cross-model reviewer read the
requirement text fresh and tested a different clause.

**A fix that regressed worse than the defect (gate round 1).** Bounds ran
before redaction, so sanitizing could inflate a record past 64 KiB and publish
a revision that could not be read back — into an append-only journal that never
prunes. Confirmed cause: a transform was added after the validation intended to
constrain its output.

**Three rounds of detector tuning that converged on nothing.** The path
sanitizer alternated between false negatives and false positives — leaking
`cwd:/Users/...` while mangling `?next=/dashboard` and `/foo/bar/`. The
operator stopped the loop and narrowed the guarantee to what a delimiter
detector can enforce. Hypothesis, not confirmed: a context-aware tokenizer
would close it, but that was not built or tested here.

## Decision Register

| ID   | Decision                                                             | Rationale                                                                                   |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| D-01 | Accept the parent-swap residual risk for absent-`AGENTS.md` creation | Create-only; requires a privileged concurrent local swap; existing files stay zero-write    |
| D-02 | Eliminate the destructive publication class rather than accept it    | The update path could delete pre-existing out-of-scope user data                            |
| D-03 | Close `BL-260826`, `BL-260828`, `BL-260829`; leave `BL-260724` open  | Its headline criterion is not in the shipped product                                        |
| D-04 | Defer FR1/FR3 provider evidence to a backlog item                    | Plumbing across seven surfaces; project already long                                        |
| D-05 | Narrow NFR1 to identity-reject plus best-effort prose redaction      | Three rounds established a delimiter detector cannot separate a URL route from a disclosure |

## Rejected or Superseded Alternatives

- **Risk-accepting the destructive `rename`** (superseded by D-02). Rejected
  because the failure mode destroys existing data, materially worse than the
  create-only p05 residual it would have been folded under.
- **Deleting the correlation guard** when it became unreachable. The
  implementer restored it instead, correctly: it was a sound check made
  unreachable by a routing mistake, not a wrong check.
- **A fourth delimiter widening** for the path detector, rejected in favor of
  narrowing the guarantee.

## Where We Changed Course

- **Trigger:** the live depth-2 check failed. **Change:** provider parsers were
  rebuilt against captured real artifacts and fixtures re-derived from them.
  **Outcome:** full-corpus sweeps at 1,596 Codex rollouts and 2,740 Claude
  transcripts, zero refusals.
- **Trigger:** the operator's cross-model rule was noticed to be unhonored.
  **Change:** the final gate moved to Cursor `gpt-5.6-sol-xhigh`.
  **Outcome:** three P0 gaps found that every preceding same-model round had
  marked satisfied.
- **Trigger:** the path detector failed in both directions simultaneously.
  **Change:** the guarantee was narrowed to identity fields; `spec.md` NFR1 was
  amended. **Outcome:** the loop ended and the residual is documented and
  tested.

## New Architecture Patterns and Approaches

- **Neutral projection over source mirroring.** Provider observation emits a
  closed six-key fact set owned by the consuming module rather than mirroring
  provider shapes, so provider key names cannot collide with the sensitive-key
  classifier. A CI test runs every projected key through the classifier.
- **Append-only, create-only publication.** The journal publishes with `link`
  and never `rename`/`rm`/`unlink` against a destination, so a swapped pathname
  causes `EEXIST` rather than data loss.
- **Reject-versus-redact by field class.** Structured identity fields reject
  ambiguous values; free-form prose redacts best-effort. The asymmetry is the
  point: ambiguity is safe to reject in a field where only identifiers are
  legal.

## Domain Learnings

- **A passing suite proves the code matches the fixtures, not the world.** When
  fixtures are authored rather than captured, tests and code encode the same
  error and reinforce each other. Capture fixtures from real output for
  anything that parses an external format.
- **Same-model review compounds a shared blind spot.** Reviewers of the same
  model class as the implementer converged on the same reading of each
  requirement. Reading a multi-clause requirement fresh, and testing a clause
  nobody has touched, is worth more than another round.
- **A postcondition that runs on pre-transform data is not a postcondition.**
  Adding a transform after its validating check silently invalidates the check.
- **An accepted residual must be scoped precisely.** A create-only risk and a
  data-destroying one are not the same class, and folding the second under the
  first would have hidden it.

## Gotchas for Humans

- Do not read a green gate as evidence a provider-format feature works. Ask
  whether its fixtures were captured or invented.
- When approving a risk acceptance, check that the new failure mode is the same
  class as the one previously accepted.
- `oat-project-pr-final` archives active reviews in preflight. A review created
  after that step stays active, and a ledger row pointing at
  `reviews/archived/...` will not resolve.

## Gotchas for Autonomous Agents

- Before claiming a requirement is met, enumerate its clauses and verify each
  independently. Verifying one clause and marking the requirement satisfied is
  how NFR1 shipped unmet.
- Never assert a count you did not compute. Two published artifacts in this
  project carried review-round counts that were never counted.
- After fixing a defect, search for the same class elsewhere before reporting.
  The `sessionid` collision was fixed for Codex and not carried to Claude,
  which took a further round.
- When a test proves a P0 requirement, break the guard and confirm the test
  fails. Two defects here sat behind tests that could not fail.
- `grep | head` establishes presence, never absence. A truncated list was read
  as "undocumented" and produced a duplicate, contradictory docs entry.

## Repo Improvements (Promotion Register)

### RP-01: Require captured fixtures for external-format parsers

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** de0f72ea9e4cff5e91e9ad855665254d81daa683
- **Disposition-note:** —

A parser shipped with 658 passing tests and worked on zero real inputs, because
its fixtures encoded a rollout shape that does not exist. Add a rule that any
parser of an external format must derive its fixtures from captured real output,
with provenance recorded in the fixture file, and must be exercised against a
real artifact before its phase review is requested.

### RP-02: Require neutralization proof for P0 guards

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** applied
- **Target:** AGENTS.md
- **Applied-ref:** de0f72ea9e4cff5e91e9ad855665254d81daa683
- **Disposition-note:** —

Two defects sat behind tests that could not fail: an FR10 test that mocked the
very reader dropping the field, and NFR1 verified only on an already-fixed
surface. Add a rule that a test asserting a P0 requirement must be shown to fail
when its guard is neutralized, and that the neutralization result is reported
with the fix.

### RP-03: Verify the `status`/`doctor` path-redaction claim

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260903-verify-the-packs-inventory.md`
- **Destination-receipt:** de0f72ea9e4cff5e91e9ad855665254d81daa683
- **Remote-visibility:** pushed
- **Sanitized:** yes
- **Disposition-note:** —

`apps/oat-docs/docs/reference/troubleshooting.md:185` states "Reported project
and home paths remain redacted" for the `packs:inventory` diagnostic. That
surface was outside this project's scope and the claim was not verified. Every
comparable claim examined during the gate rounds proved to overstate the
implementation, so this one warrants checking rather than assuming.

## OAT Upstream Feedback (Upstream Register)

### UP-01: `pr-final` preflight archives reviews before later reviews exist

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260903-pr-final-archives-reviews.md`
- **Destination-receipt:** de0f72ea9e4cff5e91e9ad855665254d81daa683
- **Remote-visibility:** pushed
- **Sanitized:** yes
- **Disposition-note:** —

`oat-project-pr-final` Step 0.5 archives active review artifacts, then Step 2
checks the final review status. A final review generated after that preflight —
the normal case when the gate runs late — remains in `reviews/` while the
ledger row written for it may point at `reviews/archived/`. This produced a
non-resolving ledger path in this project, caught only by an external reviewer.
Suggest either re-running the archive step after the final review is recorded,
or validating that every ledger path resolves before the PR is created.

### UP-02: `project-document` finds real deltas on re-run late in a project

- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260903-project-document-should-prompt.md`
- **Destination-receipt:** de0f72ea9e4cff5e91e9ad855665254d81daa683
- **Remote-visibility:** pushed
- **Sanitized:** yes
- **Disposition-note:** —

`oat-project-document` was run once after Phase 7 implementation and again after
the gate rounds. The second run found two genuine caller-facing contract errors
the first could not have seen, including a reference telling callers to store
values the shipped code rejects. Suggest the skill recommend a re-run when
review-driven fixes change a shipped contract after the first documentation
sync, since a single mid-project run can encode a since-superseded contract.

## Remaining Boundaries and Follow-Ups

Four gaps ship recorded, not resolved:
`BL-260903-populate-provider-reachability` (FR1/FR3 provider evidence never
populated), the NFR1 prose-redaction residual (amended in `spec.md`),
`BL-260724` (collection alias creation, left open),
`BL-260903-close-claude-runtime-lineage` and
`BL-260903-preserve-proto-named-config`.

`BL-260724` and the `AGENTS.md` residue share one root cause: Node exposes no
`openat`/`renameat`/`linkat`-class guarded primitive. They should be scoped
together, not separately.

## Reflections

The project's own subject matter turned out to be its lesson. It exists because
OAT reported facts that were not true; it then produced, in its own execution,
three defects that reported success without establishing it, a fix that
regressed worse than the defect it closed, and two published artifacts carrying
counts nobody had counted.

What consistently worked was cheap: run the real thing, break the guard and
watch the test fail, and put a different reader in front of the requirement.
What consistently failed was expensive: more rounds of the same review, by the
same kind of reviewer, against the same fixtures.
