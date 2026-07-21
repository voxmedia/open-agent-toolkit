---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-21
oat_generated: true
oat_summary_last_task: prev1-t10
oat_summary_revision_count: 1
oat_summary_includes_revisions: [p-rev1]
---

# Summary: explainer-kit

## Overview

The project turned a proven but personal explainer workflow into a public skill
family: a destination-neutral core and a thin OAT lifecycle adapter. It
preserved private-wrapper extensibility while making inputs, outputs,
durability, rendering, publishing, configuration, and lifecycle behavior
explicit and testable.

## What Was Implemented

- Shipped `explainer-kit` in the utility pack with versioned run, fact-base,
  author, theme, artifact-manifest, build-record, durability, publish-request,
  and publish-receipt contracts.
- Added supplied and federated fact-base processing, adversarial critic support,
  structured unattended authoring, section-sensitive source-copy QA, bounded
  discovery, content approval, rendering, visual QA, and privacy/leak checks.
- Added `project-explainer`, `project-recap`, `engineer-tour`, and
  `program-recap` recipes with retained, archive-safe artifact packages.
- Added four curated styles—Clean/Neutral, Business/Corporate, Navy/Ocean, and
  Dark/Edgy—with horizontal deck navigation, distinct local accents,
  responsive/reduced-motion behavior, and a deprecated compatibility path for
  legacy palette/profile inputs.
- Added `oat-explainer-kit` with typed OAT configuration, project source
  binding, lifecycle policy, output routing, installed-core compatibility,
  provider-neutral critic and author module seams, and exact unattended author
  cardinality enforcement.
- Added additive S3/CDN publishing with sentinel verification, public-byte
  checks, deletion confirmation, and retained receipts.
- Added complete immutable package hashing and archive export verification,
  preserving canonical object hashes separately from serialized file-byte
  hashes.
- Normalized generated Codex TOML indentation without changing parsed values,
  multiline strings, or idempotency.
- Advanced the five public packages in lockstep to `0.2.10`; final canonical
  skills are `explainer-kit@1.0.2` and `oat-explainer-kit@1.0.1`.

## Key Decisions

- **Core/adapter/private boundary:** The public core is config- and
  destination-blind; the OAT adapter resolves project/config concerns; private
  wrappers orchestrate personal pre/post lanes without a public plugin system.
- **Explicit author seam:** Unattended runs require one structured,
  provider-neutral author callback or module. Executable callbacks are never
  persisted; validated non-secret provenance is retained.
- **Curated style front door:** A named curated style is the default public
  selection. Palette/profile remain accepted only for backward compatibility.
- **Two hash semantics:** Canonical hashes identify normalized objects;
  `immutableHashes` verify exact retained bytes. Archive validation enforces
  complete coverage without conflating the two.
- **Non-blocking lifecycle, strict release:** Runtime recap failures do not
  block project completion, but promotion requires packaged external-wrapper
  and live publish acceptance.
- **Additive publishing:** Publishing never deletes unrelated destination
  objects; only the run-unique verification sentinel is removed.

## Design Deltas

- The first live unattended W6 recap showed that mechanical fact-base assembly
  could pass structural gates while producing poor narrative. Revision 1 added
  mandatory structured authors, retained provenance, and per-section
  source-copy detection.
- The original palette/profile matrix produced inconsistent default quality.
  Revision 1 replaced it with four accepted curated styles while preserving
  legacy inputs.
- Initial archive validation incorrectly compared canonical object hashes with
  pretty-printed file hashes. The final design preserves both identities and
  verifies each at the appropriate boundary.
- Final review found the public style key and adapter author path were not
  exercised end to end. The fixes added real CLI-backed and packaged adapter
  coverage and aligned the authoritative design.

## Notable Challenges

- Release-candidate verification crossed machines whose TypeScript declaration
  emission order differed semantically but not behaviorally; acceptance
  therefore consumed the exact retained tarballs and hashes.
- Live S3 acceptance initially lacked sentinel deletion permission. The
  unchanged candidate passed after the operator corrected IAM.
- Headless Chromium keyboard focus was machine-sensitive. The visual gate now
  primes focus, retries deck movement, and uses a semantic tabbability fallback
  without weakening accessibility requirements.
- Final review uncovered integration gaps hidden by green unit and smoke tests.
  Two bounded review loops added real CLI/adapter paths, section-local QA,
  design alignment, and pre-core author-cardinality checks.

## Tradeoffs Made

- HTML output is verified structurally and visually but is not required to be
  byte-deterministic.
- Natural-language art direction remains transient; the resolved replayable
  theme and privacy-safe provenance are retained instead.
- Source-copy QA compares authored sections with reconciled fact-base text, not
  raw private source documents.
- Agent-authored artifacts default to non-rebuildable unless replay evidence
  proves otherwise.

## Integration Notes

- JSON-only core callers use `--author-module`; OAT adapter contexts use
  `authorModulePath`. Unattended adapter calls must provide exactly one direct
  or module author seam.
- `explainers.defaults.style` is the supported config front door. Legacy
  `palette` and `visualProfile` values are nullable and deprecated.
- Durable archive consumers must verify every `immutableHashes` entry against
  file bytes; canonical fact-base/theme hashes are separate object identities.
- Publishing remains explicit and disabled by default for private wrappers.

## Revision History

### Revision 1

The post-merge revision fixed complete recap-package durability and unattended
content quality, replaced the default theme matrix with four curated styles,
and normalized generated Codex configuration. A real packaged Stoa W6 recap
then passed authored-content, immutable-hash, archive-export, visual, package,
and unchanged-source checks; two review loops closed all remaining integration
and design findings.

## Workflow Observations

### 2026-07-20 · structural · oat-project-implement · p-rev1

Phase implementer completed prev1-t01 through prev1-t03 and stopped before acceptance; see implementation.md Run 2 for the W6 archive and author-module boundary.

### 2026-07-21 · structural · oat-project-implement · prev1-t04

Generated Codex config formatting passed in commit 0895a8c0; Revision 1 now waits only on the W6 acceptance inputs recorded in implementation.md.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 to include packages/cli/src/validation/skills.test.ts after the mandated skill-version bump exposed its literal version pin; this is the load-bearing regression assertion for the planned bump.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 after the real W6 package exposed two acceptance-contract gaps: smoke harnesses must supply the required unattended author, and archive validation must keep canonical fact-base/theme hashes distinct from immutable file-byte hashes while still enforcing complete path coverage.

### 2026-07-21 · structural · oat-project-implement · 5f7206bd

Revision 1 implementation completed 43/43 tasks; packaged W6 acceptance and archive export passed. Fresh-context final review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-review.md

Fresh-context p-rev1 review received: 2 Critical and 1 Important finding. Converted into prev1-t06 through prev1-t08 for public style config, adapter author propagation, and section-local source-copy QA.

### 2026-07-21 · structural · oat-project-review-receive · aa74980f

Completed all three p-rev1 review fixes in commits 3d9ce8b4, 2c8c0fa5, and aa74980f. Full serial repository/release gates and rebuilt packaged W6 acceptance passed; fresh-context re-review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-rereview.md

First p-rev1 re-review received: prior C1 and I1 resolved; C2 propagation works but omitted unattended author is not rejected at the adapter boundary. Added prev1-t09 for stale design/minor formatting and prev1-t10 for exact author cardinality.

### 2026-07-21 · structural · oat-project-review-receive · 3bf11f25

Completed narrowed re-review fixes prev1-t09 and prev1-t10 in commits 5a753029 and 3bf11f25. Design alignment, author-cardinality TDD, and full serial repository/release gates passed; narrowed re-review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-rereview-2.md

Narrowed p-rev1 re-review passed with zero findings; all Revision 1 review findings are resolved and the follow-up PR is ready.
