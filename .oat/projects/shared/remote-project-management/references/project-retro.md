---
oat_retro_project: remote-project-management
oat_retro_generated: '2026-09-07T13:20:30Z'
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: recap-run-evidence
    status: used
  - source: current-session
    status: used
  - source: issue-backlog-history
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: historical-session-transcript
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: Remote Project Management

## Executive Summary

The project delivered a provider-neutral remote project-management control plane
for GitHub Issues, Linear, and Jira Cloud and completed all 90 planned tasks.
Repeated independent reviews materially improved privacy, approval, recovery,
production composition, and verification behavior. The lifecycle tail then exposed
a separate OAT problem: the requested visual project recap failed before authoring
or rendering, while closeout treated that failure as a warning and continued. The
most important follow-up is to replace the default project-recap path with a direct,
agent-authored visual flow that works on a normally configured host.

## Evidence and Review Method

The review used the append-only `project-log.md`, `state.md`, `implementation.md`,
`plan.md`, `summary.md`, final review records, and the retained recap build and
terminal evidence. It also used the current operator conversation and inspected
existing GitHub issue and repository backlog coverage. No separate
`oat-execution-learnings.md` exists, and the historical transcript previously
copied to `/tmp` was unavailable during this retro.

The recap's stage failure and missing output are confirmed. The temporary
structured-output schema is a plausible cause, but the retained evidence contains
only generic `E_CONTENT`; the exact provider error is therefore a hypothesis, not a
confirmed root cause.

## Outcome Snapshot

| Area           | Result                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Product scope  | Local-first remote PJM for GitHub Issues, Linear, and Jira Cloud                                          |
| Implementation | 90/90 tasks completed; PR #273 open                                                                       |
| Verification   | 708/708 focused remote/E2E tests; forced 6,545/6,545 workspace tests; CI-equivalent gates passed          |
| Final review   | Zero findings at `527ce8bc0b5eb7a420cc62a740dbf3d4f8ff893c`; configured exit gate received and resolved   |
| Visual recap   | Requested once; fact base passed, content failed, no HTML, render, screenshot, durability, or publication |
| Lifecycle      | Implementation complete; archive and merge remain separate work                                           |

## Current State

- **Promotions:** None; no repository edits are proposed for direct application.
- **Filing:** Complete; RP-01 was filed to the repository backlog and UP-01 strengthened GitHub issue #230.
- **Unsettled items:** None.

## What Went Well

- The project preserved exhausted review histories instead of rewriting them.
  Explicit operator extensions and corrective revisions provided fresh, bounded
  authority while retaining the evidence that triggered each change.
- Two unsafe early directions were reversed: credential-value parsing became
  bounded whole-field suppression, and static provider transport/catalog machinery
  became live host discovery with provider-neutral intent and observation records.
- Phase 7 demonstrated useful skepticism toward green tests. Production composition
  inspection found a missing service routing bridge; the agent stopped before edits,
  obtained bounded recovery authorization, and then verified the real path.
- Final assurance included guard-neutralization negative controls, a forced zero-cache
  workspace test run, public status reconciliation, and independent review.

## Challenges and Struggles

Independent reviews repeatedly found subtle authority, restart-safety, anomaly,
duplicate-recovery, and production-composition defects after focused suites had
passed. The project consequently crossed several review caps and required explicit
operator extensions plus three corrective revisions. This was expensive, but the
bounded governance prevented silent scope expansion and ultimately produced a
stronger implementation.

The implementation-tail recap was the final material failure. The operator selected
`generate`; request validation and fact reconciliation passed, then the content
stage failed in under a second with generic `E_CONTENT`. No set plan, authored HTML,
render, screenshot, visual review, durability record, or published artifact was
produced. The runtime discarded the actionable provider error, while the lifecycle
contract classified `failed` as a terminal warning and allowed closeout. The result
was technically recorded but did not satisfy the user's reasonable expectation that
“Generate” would produce a visual recap or stop with an explicit recovery choice.

## Decision Register

- **Remote authority:** local OAT state remains authoritative; each remote binding is
  an optional collaboration surface with explicit authority and freshness limits.
- **Privacy boundary:** inbound sensitive signals suppress the complete affected
  allowlisted field; outbound writes consume only normalized projections through one
  universal privacy gate bound to preview and approval.
- **Execution boundary:** the live host discovers connectors or configured CLI help;
  OAT core and skills retain semantic intent rather than provider tool names,
  catalogs, schemas, or dialects.
- **Review recovery:** exhausted review budgets are historical evidence. New work
  after exhaustion requires a separately authorized correction or revision.
- **Recap direction:** advanced Explainer Kit workflows may remain available, but the
  default project recap should use a direct agent-authored path rather than require
  an adaptive set planner and five injected provider seams.

## Rejected or Superseded Alternatives

- Credential-shaped value parsing was superseded because it implied a general-DLP
  capability and encouraged repository-wide secret discovery outside the approved
  boundary.
- Captured provider catalogs and hard-coded CLI dialects were superseded because they
  coupled OAT correctness to stale host-specific transport details.
- Treating isolated module and test success as production-routing proof was
  superseded after Phase 7 demonstrated that the real service composition could
  still bypass the implemented runner.
- Adding still more recap seam configuration is not the preferred response to the
  current incident. It preserves the same integration burden that made generation
  fragile.

## Where We Changed Course

- Security review replaced credential parsing with whole-field suppression, closing
  the overclaim without broadening the scan boundary.
- Transport review moved connector and CLI execution into live host discovery,
  preserving provider neutrality.
- Phase 7 production inspection triggered a bounded recovery that connected the real
  service route rather than expanding isolated tests alone.
- The failed lifecycle recap and operator feedback changed the recommended follow-up
  from “configure more seams” to “provide a simpler default recap path.”

## New Architecture Patterns and Approaches

- Persist intent before external effects, give every attempt a stable identity, and
  verify success through authoritative read-back.
- Resolve write authority through strict policy intersection and bind exact inputs to
  preview and approval evidence.
- Preserve review and recovery history append-only; introduce explicit corrective
  revisions instead of silently extending exhausted budgets.

## Domain Learnings

- Passing tests demonstrate fixture behavior, not production composition. Public
  entry points and real service routing need direct probes.
- A derivative communication artifact should not inherit transaction-grade
  orchestration unless each layer protects a demonstrated risk. Complexity that
  prevents the artifact from existing defeats its purpose.
- A terminal failure record is not a substitute for the deliverable a user selected.
  Lifecycle completion must distinguish “failure recorded” from “requested output
  produced.”

## Gotchas for Humans

- Interpret `90/90` as implementation completion, not archive or merge completion.
- When a review or recovery cap is exhausted, authorize the exact bounded extension
  or corrective revision; do not erase the prior terminal result.
- When selecting `Generate recap`, require either a usable visual path or an explicit
  retry/skip decision. A generic terminal warning is insufficient feedback.

## Gotchas for Autonomous Agents

- Do not infer production wiring from isolated module or mocked integration tests.
- Preserve exact authorization scope across review and recovery boundaries.
- Report recap generation by concrete artifact existence and visual verification,
  not merely by terminal-state acceptance.
- Retain sanitized underlying errors. Do not elevate a generic stage error into a
  specific schema diagnosis without direct evidence.

## Repo Improvements (Promotion Register)

### RP-01: Replace the default project recap with a direct agent-authored visual flow

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** `.oat/repo/pjm/backlog/items/BL-260907-replace-the-default-project.md`
- **Destination-receipt:** `274b775fb3fb100f2c74af0c12a9c0b4849df2c6`
- **Remote-visibility:** unpushed
- **Sanitized:** yes
- **Disposition-note:** Created as high-priority feature `BL-260907-replace-the-default-project` with confirmed `M` estimate in `a58e03c5d4bc802c389139f57b3a744c7deaf952`. The current destination receipt adds the Wave 5 integration note and excludes this retro; remote visibility remains unpushed.

Create a repository backlog item for a bounded replacement of the
implementation-tail project recap. Keep the general Explainer Kit available for
advanced recipes, but remove the default recap's dependency on adaptive portfolio
planning, `planSet`, injected author/critic/browser/visual-critic module paths,
multi-artifact expansion, and publish/durability state machinery.

The replacement should:

- collect an allowlisted fact bundle from approved project artifacts;
- ask the active host agent to author one standalone, navigable HTML recap;
- open that HTML through an available browser surface and capture responsive visual
  evidence at representative widths;
- return a small result containing outcome, artifact path, screenshots, and a
  preserved sanitized error when generation fails;
- treat `generate` as satisfied only by a usable visual artifact, otherwise requiring
  an explicit retry or skip decision; and
- cover a fresh-host success path plus negative controls proving provider and browser
  failures remain visible and actionable.

Suggested metadata: priority `high`, scope `project`, labels `explainer`, `lifecycle`,
`simplification`, and scope estimate `M` pending operator confirmation. Relate the
item to GitHub issue #230 and explicitly reconcile or supersede
`BL-260902-make-autonomous-project-recap` and
`BL-260904-add-recap-seam-config-keys` before implementation.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Simplify the implementation-tail project recap instead of adding more seams

- **Status:** filed
- **Destination:** https://github.com/voxmedia/open-agent-toolkit/issues/230
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** yes
- **Disposition-note:** Strengthened existing issue #230 with current failed-run evidence and the operator-approved direct agent-authored direction; comment https://github.com/voxmedia/open-agent-toolkit/issues/230#issuecomment-5571553808.

The current run adds concrete evidence to GitHub issue #230: even on a configured
host where fact reconciliation succeeded, the improvised provider bridge failed
before authoring and the generic stage wrapper discarded the cause. The downstream
lifecycle then accepted `failed` as warning-only, so the operator received neither a
visual recap nor an immediate recovery decision.

Strengthen #230 toward its existing “make it agent-runnable end to end” option. The
default project recap should be one agent-authored HTML artifact with browser-based
visual verification and actionable failure reporting. Advanced Explainer Kit recipes
may retain stronger schemas and durability contracts, but they should no longer be
mandatory dependencies for the ordinary project lifecycle recap.

## Remaining Boundaries and Follow-Ups

- PR #273 remains open; archive and merge are not implied by implementation
  completion or this retrospective.
- RP-01 is committed locally but not yet reachable from the branch upstream; pushing
  remains a separate operator-authorized action.
- UP-01 strengthened GitHub issue #230 instead of creating a duplicate issue.
- The failed recap run is retained locally and untracked; this retro does not repair or
  delete it.

## Reflections

The implementation became trustworthy because review findings were treated as
evidence and authorization boundaries survived repeated recovery pressure. The recap
failure shows the opposite failure mode: assurance machinery accumulated until the
communication artifact became harder to produce than to understand. Future recap
work should optimize first for a dependable artifact the operator can open, then add
only the minimum grounding and visual checks needed to keep it honest.
