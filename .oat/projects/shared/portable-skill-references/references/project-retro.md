---
oat_retro_project: portable-skill-references
oat_retro_generated: 2026-08-28T21:22:35Z
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
  - source: session-transcript
    status: used
  - source: github-pr
    status: used
oat_retro_promotions: none
oat_retro_filing: none
oat_generated: true
oat_template: false
---

# Project Retrospective: portable-skill-references

## Executive Summary

The project removed the known user-scope portability failures from the five
packaged skills and brainstorm handoff in scope, added mixed-scope dependency
resolution and recovery guidance, and strengthened the shipped regression
ratchet. The implementation and documentation passed the full repository gate
sequence, independent review passed at the Important threshold, and PR #226 was
open with green remote checks at generation time.

The run was effective but review-heavy. The most valuable correction was not a
single path rewrite: Bugbot exposed that a portable resolver must preserve
launch safeguards and resolve each sibling dependency independently. Future
portability work should start from that full behavioral contract and should
separate substantive review from terminal artifact alignment.

## Evidence and Review Method

The retrospective used the append-only `project-log.md`; `discovery.md`,
`plan.md`, `implementation.md`, `state.md`, and `summary.md`; archived phase,
final, exit-gate, and remote-review artifacts; both persisted exit-gate JSON
receipts; the active Codex session identified by `session-observer` as
`01a04041-ab6c-7180-82c8-502c587796ce`; and live PR #226 metadata. No
`oat-execution-learnings.md` existed.

Committed artifacts and review receipts were authoritative for technical
outcomes. The transcript was used only to confirm operator choices, including
the artifact-only review exception and completion/archive intent. The two test
cleanup timeouts are confirmed events, but their underlying mechanism remains
inconclusive: a no-edit rerun passing does not establish a cause.

## Outcome Snapshot

| Area            | Generation-time outcome                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivered scope | Loaded-scope, user-scope, then project-scope sibling resolution; fail-closed recovery; independent mixed-scope dependency binding; recursive authored-Markdown ratchet |
| Release         | Six skill versions and five public packages advanced in lockstep to `0.2.39`                                                                                           |
| Verification    | Repository gates 01-11 passed; documentation gates passed again after docs synchronization                                                                             |
| Review          | Phase and lifecycle reviews passed; independent Fable gate reported 0 Critical, 0 Important, 2 Medium, 1 Minor                                                         |
| Publication     | PR #226 open; CI, release dry run, and Bugbot green before the final local lifecycle commits were pushed                                                               |
| Boundary        | Cross-skill `references/*.md` reads and residual agent/utility surfaces remain for a post-merge portability follow-up                                                  |

## Current State

- **Promotions:** None; no apply items were identified.
- **Filing:** None; the accepted follow-up boundary is already recorded in the project lifecycle artifacts for post-merge capture.
- **Unsettled items:** None in this retro register.

## What Went Well

- The project reused one installed-scope resolver contract rather than creating
  skill-specific variants. Focused tests pinned fallback order, independent
  sibling roots, missing-pack recovery, and launch disclosure behavior.
- The recursive ratchet converted a prose convention into a shipped contract.
  It detects syntax variants, reports exact file/target evidence, and narrows
  the materialized-docs exclusion instead of hiding authored reference trees.
- Recovery remained bounded and evidence-based. Phase p01 used one reserved
  recovery attempt to reconcile generated validation pins; the test timeout
  reruns were no-edit reruns, not silent fixes.
- The `origin/main` conflict was resolved as a semantic union. Revision p-rev1
  preserved the upstream `triage-oat-issues` addition and the branch's release
  manifest, then repeated all gates and passed root-owned review.
- External review materially improved the result. Bugbot's recovery-command,
  launch-safeguard, and mixed-scope findings became explicit tasks rather than
  informal patches.

## Challenges and Struggles

The initial implementation underestimated the behavioral surface around the
path strings. Final review found gaps in relative-path/order assertions and
stale lifecycle evidence, so the original two phases expanded to a bounded
Phase 3. After the PR conflicted with current main, Revision p-rev1 added a
semantic merge plus another review cycle. Bugbot then showed that the portable
rewrite had weakened launch notices and frozen several dependencies to one
resolved root; `prev1-t04` through `prev1-t06` restored recovery, disclosure,
and independent binding.

Closeout then accumulated artifact-alignment reviews: terminal totals, summary
freshness, and one review-provenance cell each triggered additional bookkeeping.
The user explicitly classified artifact-only corrections as not requiring a
new standard review cycle, after which the configured independent exit gate
provided the final substantive boundary. This avoided further review churn
without weakening the Important-threshold gate.

Two full-test runs ended during cleanup with SIGTERM-related timeouts. Both
passed on permitted no-edit reruns and subsequent independent gate runs were
green. The events are therefore treated as non-blocking infrastructure flakes;
their precise cause is inconclusive.

## Decision Register

- **Loaded-scope-first resolution:** derive from the loaded `SKILL.md`, then
  probe user and project scope. This preserves both installed scopes and avoids
  assuming the repository checkout is present.
- **Independent dependency roots:** resolve each required sibling separately.
  A single shared root is invalid when `workflows` and `utility` packs are
  installed at different scopes.
- **Operational Markdown is executable:** scan shipped authored references, not
  only `SKILL.md`; retain historical exceptions only as exact, explained
  baselines.
- **Artifact-only closeout does not imply substantive re-review:** after the
  user clarified the boundary, terminal bookkeeping was refreshed without
  another standard review, while the configured independent gate still ran.

## Rejected or Superseded Alternatives

- Repository-relative `.agents/skills/...` reads were rejected because they
  work only inside a source checkout.
- One frozen skills root was superseded by independent sibling resolution
  after mixed-scope installs were shown to be valid.
- Broad exclusion of `references/docs/` by name was rejected in favor of an
  exact skill-root materialized subtree exclusion.
- Choosing either side of the sync-manifest merge was rejected; the correct
  result was the semantic union.

## Where We Changed Course

- Final review reproduced ratchet gaps and lifecycle drift, so the two-phase
  plan gained Phase 3; the re-review passed.
- PR conflict with main triggered Revision p-rev1; semantic integration kept
  both upstream and branch functionality.
- Bugbot exposed recovery, launch, and mixed-scope regressions; those findings
  became `prev1-t04` through `prev1-t06` and passed behavior re-review.
- Repeated terminal artifact findings triggered the user-defined artifact-only
  policy; closeout proceeded to the independent exit gate instead of another
  standard cycle.

## New Architecture Patterns and Approaches

The reusable resolver is a per-dependency contract: loaded sibling root first,
then user and project candidates, existence validation, an actionable
pack-and-scope recovery command, and a fail-closed stop. The per-dependency part
is essential; callers must not infer that all installed packs share one root.

The ratchet pattern treats bundled instructional Markdown as product behavior.
It scans the actual packaged surface, tests path-spelling variants separately,
and uses exact historical baselines so new executable regressions fail loudly.

## Domain Learnings

- Packaging portability is a transitive property. Fixing the first sibling
  read is insufficient when the loaded skill or agent immediately performs a
  second repository-relative read.
- A path migration can preserve file access while regressing orchestration
  semantics. Recovery instructions, resolver notices, runtime target
  disclosure, and per-dependency binding belong in the same contract tests.
- Generated lifecycle evidence can drift even when code is correct. Review
  policy should distinguish evidence repair from behavior-changing edits.

## Gotchas for Humans

- When adding a sibling-skill read, do not paste a repository-relative path;
  reuse the loaded/user/project resolver and include the exact pack recovery
  command.
- Verify mixed-scope installs by resolving every dependency independently.
- After touching canonical skills, bump each changed skill once per PR, refresh
  provider views, and advance all five public packages when bundled assets
  change.
- A green no-edit rerun confirms the current tree, not the root cause of the
  earlier timeout.

## Gotchas for Autonomous Agents

- Never treat the bundled recommendation as the selected runtime target;
  preserve structured launch and effective-target notices through rewrites.
- Do not use a successful later gate as proof of why an earlier gate failed.
- Keep review artifacts authoritative for findings and use transcripts only to
  corroborate operator intent when tool-result bodies may be absent.
- Terminal artifact-only changes must follow the explicit project policy; they
  do not silently authorize a fresh substantive review loop.

## Repo Improvements (Promotion Register)

No repo improvements identified beyond the already-documented post-merge
portability boundary. Creating a second proposal here would duplicate the
deferred findings recorded under `implementation.md` and `discovery.md`.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

The final Fable gate identified two accepted Medium follow-ups: widen the
ratchet beyond sibling `SKILL.md` targets to cross-skill `references/*.md`, and
port the remaining user-default agent and utility surfaces that still contain
bare sibling reads. The related Minor is to explain or remove the phase
implementer exemption when that work lands. These are explicitly deferred to a
post-merge portability follow-up; they are not represented as completed here.

## Reflections

The run is trustworthy because the final behavior was exercised at the bundled
surface, the semantic main integration repeated the full gate sequence, remote
feedback was converted into traceable tasks, and an independent reviewer found
no blocking issues. The main process lesson is that portable references are a
behavioral system rather than a string-replacement task. Future work should
begin with transitive installed-scope resolution and should reserve standard
re-review for changes that can alter behavior, security, or verification
claims.
