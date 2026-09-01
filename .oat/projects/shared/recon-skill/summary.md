---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-31
oat_generated: true
oat_template: false
oat_template_name: summary
oat_summary_last_task: prev2-t03
oat_summary_revision_count: 2
oat_summary_includes_revisions:
  - p-rev1
  - p-rev2
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
  lifecycle, integration, and adversarial test coverage. All 16 planned and
  revision tasks completed, the final independent review passed with no findings,
  and the configured cross-family implementation exit gate passed.

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

## Notable Challenges

The first final review found that packet integrity covered only a reduced
approval envelope. After replacing it with the canonical projection, a second
review found missing terminal-receipt causality, catalog freshness, and normative
array-value checks. Revision p-rev2 added those checks at the existing packet
boundary; direct adversarial probes then rejected all tested structural,
freshness, receipt-chain, and canonical-array mutations while valid runs still
published.

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
