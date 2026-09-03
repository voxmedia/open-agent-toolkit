---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-03
oat_generated: true
oat_template: false
oat_template_name: summary
oat_summary_last_task: prev9-t03
oat_summary_revision_count: 9
oat_summary_includes_revisions:
  - p-rev1
  - p-rev2
  - p-rev3
  - p-rev4
  - p-rev5
  - p-rev6
  - p-rev7
  - p-rev8
  - p-rev9
---

# Summary: recon-skill

## Overview

This project added a general-purpose `recon` skill that compiles bounded source
reconnaissance into an evidence packet for a later consumer. Its purpose is to
move mechanical evidence gathering, concurrence, verification, and adversarial
challenge onto explicitly approved lower-cost workers while keeping the final
judgment with the consuming agent.

## What Was Implemented

- A provider-neutral `recon` controller with quick, standard, and thorough
  profiles, exact user approval of the homogeneous model and effort selection,
  and approval-bound dispatch preparation and execution.
- A bounded `recon-worker` contract for evidence gathering, independent
  verification, adversarial challenge, coverage review, and redundant checking
  without granting workers final synthesis authority.
- A directory-only evidence packet with a manifest, source inventory, canonical
  claim ledger, compact synthesis, gaps, review artifacts, and optional raw
  dossiers behind a context firewall.
- One deterministic validation, publication, rendering, and reconciliation
  pipeline that can honestly publish complete or partial results while rejecting
  invalid provenance, approval, receipt, topology, and assurance claims.
- Research-pack distribution with same-scope utility-pack dependencies, durable
  dependency leases, reconciliation across install/update/remove lifecycles, and
  user-scope provider materialization for the worker definition.
- Documentation, generated assets, release metadata, and focused contract,
  lifecycle, integration, and adversarial test coverage. All 36 planned and
  revision tasks completed across revisions p-rev1 through p-rev9, and the
  configured cross-family implementation exit gate passed. Lockstep public
  packages bumped to `0.2.53`.

## Key Decisions

- **Directory-first evidence packet contract.** Recon always hands off a packet
  directory rather than an inline answer. The claim ledger and synthesis are the
  normal consumer surface; raw dossiers remain available for targeted follow-up
  but outside the expensive consumer's context by default.
- **Approval-bound homogeneous dispatch.** The skill remains provider-neutral and
  requires explicit user approval of one exact model and effort selection before
  launching a run. Every worker in that run uses the approved selection, making
  concurrence and cost expectations auditable without baking in a dated model.
- **Canonical validated-run boundary.** Packet publication reuses the dispatch
  system's complete canonical approval projection and accepts evidence only
  through one `ValidatedRun` boundary. This avoids a parallel approval schema or
  multiple validators while binding terminal receipts to the accepted child and
  a fresh catalog recheck.
- **Research pack owns recon distribution.** `recon` belongs to the research pack,
  with a same-scope dependency on the utility pack and materializable worker
  definitions. Automatic project-discovery and broader analysis integrations are
  separate follow-up work rather than hidden coupling in the standalone skill.

## Design Deltas

- Packet assurance was simplified in p-rev1 from incremental validator patches
  to one canonical graph consumed by validation, publication, and rendering.
- Pack implementation used the repository's migration runtime seam, scanner
  export seam, generated project-provider outputs, and Cursor native-read skill
  behavior instead of adding parallel mechanisms.
- Release completion accepted the generated version asset, two required autonomy
  inventory rows, and no lockfile change for workspace self-version bumps.
- Two test fixtures were mechanically migrated to the complete canonical role
  selector when the reduced approval projection was removed.
- Post-rebase provider projection now fails closed unless a manifest-declared
  user-materializable agent has `current` inventory matching the bundled
  definition; no new materialization layer was introduced.
- Revisions 4–9 closed remote PR and gate review findings: publication races
  now fail closed with atomic rename and canonical continuity checks, rejected
  claims transition honestly to `unsupported`, and synthesis referential
  integrity is strictly validated.

## Notable Challenges

Packet integrity and publication races required repeated hardening across
multiple review and gate rounds. What initially began as separate validation
checks evolved through revisions p-rev1 and p-rev2 into one immutable
`ValidatedRun` boundary with full receipt-chain causality. Revisions 5 through 7
closed publication races around split-generation views and post-promotion
canonical continuity. Finally, revisions 8 and 9 closed valid-but-unpublishable
state leaks, honest `unsupported` rejected claim transitions, and synthesis
referential integrity checks. All CI definition of done gates passed at the final
head.

## Tradeoffs Made

- Workers within a run are intentionally homogeneous. This favors cheap
  concurrence and an easily auditable approval envelope over heterogeneous model
  diversity; independence comes from blind or separately scoped passes.
- The initial release provides an explicit standalone skill and packet handoff.
  Automatic invocation and consumer-specific integrations were deferred until
  the packet contract has real usage evidence.
- Raw dossiers are preserved for auditability but are not part of the default
  consumer context, trading immediate completeness for predictable token use and
  a cleaner evidence boundary.

## Integration Notes

Consumers should point at the packet directory and read the manifest, synthesis,
claim ledger, gaps, and review artifacts first. They should open `raw/` only for a
specific disputed or unsupported claim. A packet's requested profile is not
proof of achieved assurance; consumers must use its validated publication state,
completed passes, provenance, and unresolved gaps.

## Revision History

- **p-rev1 — Simplify packet validation.** Replaced accumulating validation
  patches with a single canonical validation graph and kept the v1 profiles and
  persisted packet contract unchanged.
- **p-rev2 — Bind the complete approved dispatch projection.** Replaced the
  reduced approval envelope, then added terminal receipt causality, freshness,
  and canonical array validation identified by final independent reviews.
- **p-rev3 — Fail closed on drifted materializable agents.** Required `current`
  inventory before native role projection, preserved missing/absent behavior,
  and added actionable update guidance plus scanner and sync regressions.
- **p-rev4–p-rev7 — Publication race safety & continuity.** Bound incorporated
  evidence, enforced atomic promotion with canonical-byte continuity checks, and
  withdrew consumer entry points upon publication failure.
- **p-rev8–p-rev9 — Exit gate findings closure.** Withdrew valid-but-unpublishable
  generations, transitioned rejected claims honestly to `unsupported`, validated
  synthesis referential integrity, and bound `ValidatedRun` to publishability.

## Follow-up Items

- `BL-260830-integrate-recon-with-oat`: add opt-in recon handoffs to project
  discovery and quick start without redefining the standalone packet contract.
- `BL-260830-integrate-recon-across`: define packet handoffs across analyze,
  deep-research, skeptic, synthesize, and review-oriented workflows after the
  standalone contract has proven stable.

## Workflow Observations

### 2026-08-31 · structural · oat gate review · plan

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:2,minor:1 exit=0 status=ok artifact=.oat/projects/shared/recon-skill/reviews/artifact-plan-review-2026-08-31T011757Z.md

### 2026-08-31 · structural · oat gate review · plan

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/recon-skill/reviews/artifact-plan-review-2026-08-31T012704Z.md

### 2026-08-31 · structural · oat-project-implement · p01

Phase p01 passed after 1 fix loop; final review artifact: reviews/archived/p01-code-rereview-2026-08-31T045845Z.md.

### 2026-08-31 · structural · oat-project-implement · p02

Phase p02 blocked after exhausting 2 review-fix iterations; final artifact: reviews/archived/p02-code-final-rereview-2026-08-31T065541Z.md (4 Critical, 1 Important). Explicit correction authorization is required to continue.

### 2026-08-31 · structural · oat-project-implement · p02

Phase p02 remains blocked after operator-authorized review-fix iteration 3/3; fresh review artifact reviews/archived/p02-code-rereview-r4-2026-08-31T123548Z.md reports 3 Critical and 2 Important findings.

### 2026-08-31 · structural · oat-project-implement · p-rev1

Terminal review passed at 841a7164a with 0 findings after 3 review-fix iterations; reviews/archived/p-rev1-code-terminal-rereview-2026-08-31T170315Z.md closes p-rev1 and the complete p02 blocking history.

### 2026-08-31 · structural · oat-project-implement · p03

Terminal review passed at cb3d94ac2 with 0 findings after 3 review-fix iterations; reviews/archived/p03-review-2026-08-31T204054Z.md closes all seven prior p03 Critical/Important findings.

### 2026-08-31 · structural · oat-project-implement · p04

Terminal review passed at e2b8b4077 with 0 findings and no fix iterations; reviews/archived/p04-review-2026-08-31T213712Z.md closes both p04 tasks and advances the project to final implementation closeout.

### 2026-08-31 · structural · oat-project-implement · p-rev2

Terminal final review passed at 3cc1cd2e3 with 0 findings after 2 bounded review-fix iterations; reviews/archived/final-review-2026-08-31T232924Z.md closes p-rev2 and authorizes the configured implementation exit gate.

### 2026-08-31 · structural · oat gate review · final

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/recon-skill/reviews/final-code-review-2026-08-31T234514Z.md

### 2026-09-01 · structural · oat gate review · final

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/recon-skill/reviews/final-review-2026-09-01T040114Z.md

### 2026-09-01 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/recon-skill/references/project-retro.md evidence_used=archived-review-markdown,backlog-records,decision-records,gate-receipts,github-pr-status,lifecycle-artifacts,pr-artifact,project-log,session-transcript evidence_unavailable=oat-execution-learnings promotions=1 upstream=2 apply=performed filing=performed

### 2026-09-02 · structural · oat-project-implement · p-rev7

Phase p-rev7 passed: task dbfeeede518556ed5678839bc18ab1342e381593; root-owned review reviews/archived/p-rev7-review-2026-09-02T212045Z.md passed with 0 Critical/Important/Medium/Minor; fix loops=0; final-scope review override required.

### 2026-09-02 · structural · oat-project-implement · final

STOP: all 30 tasks are complete and p-rev7 passed. The final-scope review-cycle cap is exhausted; require an explicit override before one fresh mandatory final lifecycle review. If that review passes, continue to the configured cross-family exit gate; if it blocks, stop without automatic remediation or re-review.

### 2026-09-02 · structural · oat-project-implement · final

Final lifecycle review passed at fd5d5c85c10590fb293855ec27d8cac32c67d6b3 with 0 Critical/Important/Medium/Minor findings; artifact reviews/archived/final-review-2026-09-02T214500Z.md; single-use override consumed; configured cross-family exit gate is next.

### 2026-09-02 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/recon-skill/reviews/final-review-2026-09-02T221657Z.md

### 2026-09-02 · structural · oat-project-review-receive · final

Received configured gate run 814287bf-abce-4264-8e51-11226227b9c8: 0 Critical, 1 Important, 1 Medium, 1 Minor; created Revision 8 tasks prev8-t01 through prev8-t03 with no deferrals; source archived at reviews/archived/final-review-2026-09-02T221657Z.md.

### 2026-09-03 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-09-03 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:1,minor:2 exit=1 status=blocked artifact=.oat/projects/shared/recon-skill/reviews/final-review-2026-09-03T154100Z.md

### 2026-09-03 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=important findings=critical:0,important:0,medium:1,minor:3 exit=0 status=ok artifact=.oat/projects/shared/recon-skill/reviews/final-review-2026-09-03T173922Z.md
