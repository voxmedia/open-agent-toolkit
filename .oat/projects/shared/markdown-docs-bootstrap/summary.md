---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: true
oat_summary_last_task: p04-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Markdown Docs Bootstrap

## Overview

Plain Markdown is now an explicit documentation bootstrap option for repositories that need useful documentation without a site application. This quick project implements the Markdown portion of `BL-260911-make-docs-bootstrap-a-front`, including safe adoption of populated directories and the applicable OAT context, navigation, metadata, and authoring contracts. All eleven planned tasks and review dispositions are complete. Configured written-summary, documentation and PR steps are complete; final p04 HiLL approval remains pending.

## What Was Implemented

- `oat docs init --framework markdown` records `documentation.tooling: markdown`, a dedicated literal content root (default `docs`), and its authored `index.md`. Fresh setup creates context/index and contributing pages with meaningful metadata, real Contents links, and managed repository-root Documentation guidance. It creates no docs application, dependencies, package patches, or site commands.
- Explicit `--adopt` adds missing baseline pages while preserving existing content, indexes, config fields, and local instructions. Missing root indexes map actual sibling pages and child indexes with encoded filename segments. Malformed or incomplete existing content remains available for analyze/apply repair. Repeated adoption converges to no-change; `--yes` alone does not authorize populated-directory adoption.
- Command-local `--dry-run` previews files, config, and read-only managed-guidance classification without mutation. Manual-required or blocked guidance remains a partial result with exit 1; actual partial writes are reported without claiming transactionality.
- Markdown content roots remain literal even with nested `docs` directories, and instruction sync/validate exclude the whole content tree. Manifest generation requires explicit external output and protects the full configured content root and authored index, including narrowed scans and symlink aliases. Fumadocs/MkDocs behavior remains supported.
- Five canonical skills, their relevant resources, two bundled Markdown templates, pack distribution, and twelve documentation pages were updated. The five public packages and generated version inventory are lockstep `0.3.11`, above the verified integration base at `0.3.10`.
- Public metadata handling defaults blank Markdown inputs to meaningful repository values. The final renderer fix inserts values once and literally, preserving dollar sequences and token-shaped user input.

## Key Decisions

- **Explicit Markdown roots:** Reuse the existing `documentation` config contract with `tooling: markdown`, a dedicated content directory, and its authored entrypoint. This avoids an application requirement and prevents a nested `docs` subsection from replacing the configured root; existing framework and undeclared-tooling heuristics remain applicable.
- **Additive Markdown adoption:** Require explicit adoption of populated trees, write only missing baseline files, and preserve existing bytes and local guidance. Incomplete authored context becomes analyze/apply work, so adoption establishes configuration and guidance without claiming complete conformity or silently repairing content.
- **Authored Markdown indexes:** Keep human/agent context and populated Contents maps in authored `index.md` files; generated inventories remain optional external artifacts. Protect the full configured content tree and entrypoint regardless of a narrowed scan, and keep the configured index authored. Asset-only directories retain their exemption.
- **Markdown file verification:** Retain applicable context, Contents, metadata, relative-link, contributor, and ownership checks, using file/link verification without install or site-build steps. Agent guidance belongs in the managed repository-root section; preserve existing docs-local instructions without scaffolding a docs-root `AGENTS.md`.
- **Bootstrap detection boundary:** Keep Markdown evidence selection in docs bootstrap, with declared tooling authoritative and framework evidence preceding plain-tree candidates. General `oat init` detection/config remains unchanged; a repository README alone does not establish an adoptable docs surface.

These decisions are grounded in the confirmed [discovery](discovery.md), [design](design.md), and accepted [implementation outcomes](implementation.md).

## Design Deltas

No production scope deviation was accepted. Review added bounded filename encoding and blank metadata normalization under the existing navigation and meaningful-metadata contracts. The passing exit-gate sweep then corrected literal template insertion in `fbeebbdde26ffb3b4b885118d24f3eda2e1a4359`. Two stale help snapshots and two skill-version expectations were repaired under the planned acceptance-defect clause; none of these changes introduced a new workflow or docs engine.

## Notable Challenges

- Content-root and manifest-output safety needed agreement across init, config, instruction consumers, generation, and skills. Independent pre-fix overwrite/post-fix refusal controls and valid external/framework controls establish the preservation boundary.
- URI delimiters in real filenames and JavaScript replacement syntax in real user values escaped ordinary-input coverage. Independent destination resolution and YAML/Contents oracles reproduced the old bad accepted results, confirmed the fixes, and retained valid accepted controls.
- Tracking needed its own corrections: the committed-page checker was made non-vacuous (twelve pages, 105 targets), twenty historical review rows were consolidated without losing cells, and a root checkpoint's joined YAML keys were separated and the complete frontmatter validated before further dispatch. Original failures and raw review counts remain in the evidence.

## Tradeoffs Made

Adoption preserves malformed authored content rather than rewriting it; repair remains an explicit analyze/apply action. Guidance preview is advisory because a later write can encounter different filesystem state. Framework conversion, dependency drift, approval policy, and other-repository work remain separate from this Markdown slice.

## Integration Notes

- Latest corrected-source verification passed all eight CI gates in order, including fresh-main version checks and release validation for all five packages. Actual execution included 7,945 CLI tests across 398 files, smoke 163, skills 660, scripts 1, and 73 docs pages; focused verification passed 197/197. Later build/docs gates replayed valid cache and are recorded as replay, not fresh execution. See [literal-rendering controls](reviews/final-dollar-controls.md).
- Earlier isolated-home forced workspace verification executed ten uncached tasks and 8,135 tests. It remains historical evidence for unchanged consumers; it was not repeated as a full forced run after the final fixes. Bundle parity (46 checks), isolated user/project install/update, 24 integrated CLI controls, and six retained probes passed. See [bundle controls](reviews/p04-bundle-controls.md) and [reproduction controls](reviews/p04-reproduction-controls.md).
- Independent final lifecycle re-review passed with zero findings and reproduced the literal-rendering correction. The refreshed cross-runtime implementation exit gate passed with one Low stale-prose finding, which was dispositioned and corrected. Prior whole-project coverage is explicitly inherited for narrowed reviews; original finding counts remain preserved in [implementation history](implementation.md).
- Native exact-role selectors were rejected before child start; accepted canonical-role approximations retained configured model/effort and original request linkage. Configured invocation is evidence distinct from independent runtime identity, which was not reported. No post-commit recovery attempt was consumed.

## Follow-up Items

- [BL-260911-make-docs-bootstrap-a-front](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md) remains **open** for its broader approval classes, package/version drift, and other-repository acceptance. This project supplies only the Markdown portion and has no unresolved Medium/Low review debt.
- Configured closeout steps are complete and [PR #335](https://github.com/voxmedia/open-agent-toolkit/pull/335) is open; final p04 HiLL approval is pending. Release assets are validated; no publication, normal user-scope installation, merge, or deployment is claimed.

## Explainer Outcome

- **project-recap:** skipped — user explicitly chose to skip the visual recap; persisted intent is `decision: skip`, `source: interactive`.

## Workflow Observations

### 2026-10-01 · structural · oat gate review · plan

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/artifact-plan-review-2026-10-01T060016Z.md run=db5ebb2c-f554-4275-aa5c-165f92ff8c4b

### 2026-10-01 · structural · oat gate review · plan

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/artifact-plan-review-2026-10-01T112231Z.md run=645bbca3-db69-4867-812e-22f31388aa11

### 2026-10-01 · structural · oat-project-implement · p01

p01 verdict pass; fix iterations 0; review reviews/p01-review-2026-10-01T120229Z.md; L1 tracking wording corrected; 2/9 tasks complete.

### 2026-10-01 · structural · oat-project-implement · p02

p02 verdict pass; one review-fix iteration (M1 p02-t03); clean full-phase review reviews/p02-review-2026-10-01T132908Z.md; recovery 0/10; continue p03.

### 2026-10-01 · structural · oat-project-implement · p03

p03 verdict pass; 0C/0H/0M/2L; both Low tracking/evidence findings fixed in root Step7b; review reviews/p03-review-2026-10-01T140627Z.md; source fix iterations0/recovery0; continuep04.

### 2026-10-01 · structural · oat-project-implement · p04

p04 passed: two task commits, zero independent review findings, all dispositions settled, no phase gate selected; fix iterations 0, recovery 0/10. Continue final review and retained exit gate before final HiLL.

### 2026-10-01 · structural · oat-project-implement · p04

Final metadata fix accepted by independent narrowed final review: zero findings, prior full coverage inherited, all eleven tasks/dispositions settled; final fix iteration1, recovery0/10. Retained exit gate and configured closeout before HiLL.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T160046Z.md run=a8646353-1fff-430a-aee3-e8b32dd2966e

### 2026-10-01 · structural · oat-project-implement · final

Literal-rendering passing-gate sweep complete; refreshed final lifecycle review passed 0C/0H/0M/0L with independent 197-test and causal CLI proof. Eleven tasks complete, recovery 0; fresh exit gate and configured closeout pending.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T163602Z.md run=e49bf748-36dc-44ff-9fa6-1e7105fc21b3

### 2026-10-01 · structural · oat-project-implement · final

Refreshed independent implementation exit gate passed; 0C/0H/0M/1L, sole stale plan-prose Low addressed. All findings settled; proceeding to configured summary/document/pr sequence, final HiLL pending.
