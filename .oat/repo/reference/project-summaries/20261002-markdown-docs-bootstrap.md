---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_generated: true
oat_summary_last_task: p04-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Markdown Docs Bootstrap

## Overview

Plain Markdown is now an explicit documentation bootstrap option for repositories that need useful documentation without a site application. This quick project implements the Markdown portion of `BL-260911-make-docs-bootstrap-a-front`, including safe adoption of populated directories and the applicable OAT context, navigation, metadata, and authoring contracts. All fourteen planned and review-fix tasks and their dispositions are complete. Configured written-summary, documentation and PR steps are complete; final user approval and the configured closeout snapshot are complete.

## What Was Implemented

- `oat docs init --framework markdown` records `documentation.tooling: markdown`, a dedicated literal content root (default `docs`), and its authored `index.md`. Fresh setup creates context/index and contributing pages with meaningful metadata, real Contents links, and managed repository-root Documentation guidance. It creates no docs application, dependencies, package patches, or site commands.
- Explicit `--adopt` adds missing baseline pages while preserving existing content, indexes, config fields, and local instructions. Missing root indexes map actual sibling pages and child indexes with encoded filename segments. Malformed or incomplete existing content remains available for analyze/apply repair. Repeated adoption converges to no-change; `--yes` alone does not authorize populated-directory adoption.
- Command-local `--dry-run` previews files, config, and read-only managed-guidance classification without mutation. Manual-required or blocked guidance remains a partial result with exit 1; actual partial writes are reported without claiming transactionality.
- Markdown content roots remain literal even with nested `docs` directories, and instruction sync/validate exclude the whole content tree. Manifest generation requires explicit external output and protects the full configured content root and authored index, including narrowed scans and symlink aliases. Fumadocs/MkDocs behavior remains supported.
- Five canonical skills, their relevant resources, two bundled Markdown templates, pack distribution, and twelve documentation pages were updated. The five public packages and generated version inventory are lockstep `0.3.13`, above integrated main `0.3.12`.
- Public metadata handling defaults blank Markdown inputs to meaningful repository values. The final renderer fix inserts values once and literally, preserving dollar sequences and token-shaped user input.

## Key Decisions

- **Explicit Markdown roots:** Reuse the existing `documentation` config contract with `tooling: markdown`, a dedicated content directory, and its authored entrypoint. This avoids an application requirement and prevents a nested `docs` subsection from replacing the configured root; existing framework and undeclared-tooling heuristics remain applicable.
- **Additive Markdown adoption:** Require explicit adoption of populated trees, write only missing baseline files, and preserve existing bytes and local guidance. Incomplete authored context becomes analyze/apply work, so adoption establishes configuration and guidance without claiming complete conformity or silently repairing content.
- **Authored Markdown indexes:** Keep human/agent context and populated Contents maps in authored `index.md` files; generated inventories remain optional external artifacts. Protect the full configured content tree and entrypoint regardless of a narrowed scan, and keep the configured index authored. Asset-only directories retain their exemption.
- **Markdown file verification:** Retain applicable context, Contents, metadata, relative-link, contributor, and ownership checks, using file/link verification without install or site-build steps. Agent guidance belongs in the managed repository-root section; preserve existing docs-local instructions without scaffolding a docs-root `AGENTS.md`.
- **Bootstrap detection boundary:** Keep Markdown evidence selection in docs bootstrap, with declared tooling authoritative and framework evidence preceding plain-tree candidates. General `oat init` detection/config remains unchanged; a repository README alone does not establish an adoptable docs surface.

These decisions are grounded in the confirmed discovery (`discovery.md`), design (`design.md`), and accepted implementation outcomes (`implementation.md`).

## Design Deltas

No production scope deviation was accepted. Review added bounded filename encoding and blank metadata normalization under the existing navigation and meaningful-metadata contracts. The passing exit-gate sweep then corrected literal template insertion in `fbeebbdde26ffb3b4b885118d24f3eda2e1a4359`. Two stale help snapshots and two skill-version expectations were repaired under the planned acceptance-defect clause; none of these changes introduced a new workflow or docs engine.

## Notable Challenges

- Content-root and manifest-output safety needed agreement across init, config, instruction consumers, generation, and skills. Independent pre-fix overwrite/post-fix refusal controls and valid external/framework controls establish the preservation boundary.
- URI delimiters in real filenames and JavaScript replacement syntax in real user values escaped ordinary-input coverage. Independent destination resolution and YAML/Contents oracles reproduced the old bad accepted results, confirmed the fixes, and retained valid accepted controls.
- Tracking needed its own corrections: the committed-page checker was made non-vacuous (twelve pages, 105 targets), twenty historical review rows were consolidated without losing cells, and a root checkpoint's joined YAML keys were separated and the complete frontmatter validated before further dispatch. Original failures and raw review counts remain in the evidence.

- Remote Bugbot review added two bounded adoption corrections (focused suite 200 tests): usable in-repository child index aliases map normally; unusable optional child indexes remain preserved with repair advice, and instruction-only directories no longer trigger missing-index advice. Required root-baseline and unsafe-target checks remain strict.

## Tradeoffs Made

Adoption preserves malformed authored content rather than rewriting it; repair remains an explicit analyze/apply action. Guidance preview is advisory because a later write can encounter different filesystem state. Framework conversion, dependency drift, approval policy, and other-repository work remain separate from this Markdown slice.

## Latest Integration

Main #338 was merged at `5a38d447c0843e6abc47468808924693fbf7930d`. Nineteen conflict resolutions preserve both Markdown ownership/adoption behavior and Fumadocs strict navigation/template resolution. All eight repository gates plus lint/format passed after disk-space recovery, with exact receipts and cache distinctions retained. The independent native final review returned zero findings and 575 actual focused tests. The renewed Opus gate passed with 0C/0H/0M/2L; the misplaced ledger row and transient reference prose were corrected. Final user approval and the existing closeout sequence are complete; recap skip remains intact.

## Earlier Integration Evidence

- Main #334 (`98d1d524624e17f55ccfce33d18b3d5535dc91ca`) was integrated through a normal merge. All seven conflict resolutions preserve lockstep 0.3.11 packages, the canonical generated four-package inventory, and main's genuine 0.3.10 sync producer stamp. Both automatic merges preserve their Markdown and dispatch contracts. All 21 retained Markdown command/template/skill paths matched the pre-integration source bytes before the subsequent two remote review fixes. See integration controls (`reviews/final-integration-controls.md`).
- All eight CI gates passed in order after both remote corrections and the unreadable-directory sweep, with actual exits retained. Latest actual execution: CLI 7,970 tests across 398 files, root smoke 163, skills 660, scripts 1, and 73 docs pages. Unchanged control-plane 151/docs-config 10/docs-transforms 31 tests replayed cache; the preceding main-integration run executed all four workspace test tasks (8,159 total), retained as inherited consumer evidence. Check/types were mixed actual/cache; later build/docs gates replayed valid cache. See remote correction controls (`reviews/final-remote-controls.md`) and unreadable-directory controls (`reviews/final-unreadable-controls.md`).
- Integrated focused verification passed 1,132 tests across 28 files; bundle parity passed 66 byte comparisons and four isolated user/project docs-pack install/update controls. Seven blank metadata and six literal-value CLI controls passed. Earlier causal old/fixed evidence remains pinned in metadata controls (`reviews/final-metadata-controls.md`) and literal-rendering controls (`reviews/final-dollar-controls.md`).
- Independent main-integration review passed 1,309 focused tests with zero findings. The remote-fix final review independently executed 165 tests and 24 real CLI controls, also with zero findings; its two new public regressions demonstrably fail against their pre-fix production owners and pass fixed. A further passing-gate sweep preserves unreadable optional directories with accurate repair advice; its real-permission regression and valid safety controls pass. The final source review passed 166 tests and 14 real CLI controls with zero findings. The refreshed Opus 5.5 High exit gate passed; its final three Low findings were dispositioned (one advice-consistency suggestion rejected with bounded-scope rationale; two artifact/prose corrections applied) in implementation history (`implementation.md`). Prior whole-project coverage is explicitly inherited where narrowed; original review counts and prevention failures remain preserved.
- Native exact-role selectors were rejected before child start; accepted canonical-role approximations retained configured model/effort and original request linkage. Configured invocation is distinct from independent runtime identity, which was not reported. No post-commit recovery attempt was consumed.

## Follow-up Items

- [BL-260911-make-docs-bootstrap-a-front](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md) remains **open** for its broader approval classes, package/version drift, and other-repository acceptance. This project supplies only the Markdown portion and has no unresolved Medium/Low review debt.
- Configured closeout steps are complete and [PR #335](https://github.com/voxmedia/open-agent-toolkit/pull/335) is open; final p04 approval is recorded and the lifecycle is ready for configured archival. Release assets are validated; no publication, normal user-scope installation, GitHub PR merge, or deployment is claimed.

## Retrospective Follow-ups

All three proposals strengthened existing backlog records; no upstream item or immediate apply item was proposed. Destination receipts remain in the archived retrospective.

### RP-01: Add structural preservation cases to the lifecycle authority work

[Lifecycle authority](../../../repo/pjm/backlog/items/BL-260927-derive-current-lifecycle-state.md) gains this run's joined YAML, fragmented review rows and stale-state cases. Transition helpers must validate complete frontmatter, keep rows contiguous, preserve unknown/history cells and completed sequence state, and leave prior state unchanged when edits fail.

### RP-02: Add terminal-receipt and passing-sweep cases to exact gate binding

[Exact gate binding](../../../repo/pjm/backlog/items/BL-260820-bind-each-gate-review.md) gains retained terminal acceptance proof after live-marker cleanup, fail-closed prerequisite/receive mutation, and passing-sweep controls. Preserve event identity, reviewed heads and raw counts; a passing sweep consumes no failed remediation attempt, while later source changes retire routing freshness.

### RP-03: Add a late documentation case to closeout freshness tracking

[Closeout freshness](../../../repo/pjm/backlog/items/BL-260820-track-pr-closeout-evidence.md) gains the accepted gate followed by public-docs commit `420bceded`. Resume must classify changed outputs, renew stale evidence before approval and preserve the completed sequence. Public docs cannot inherit the bookkeeping exemption; this evidence does not establish that current resume incorrectly approves stale work.

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

### 2026-10-01 · structural · oat-project-implement · final-hill

markdown-bootstrap-awaiting-hill-20261001: park for configured final p04 HiLL approval; all 11 tasks, final review, retained gate and summary/document/pr steps passed; PR #335 open; recap skipped interactive; approval pending.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T185353Z.md run=74cf045f-60fb-4931-a434-8cc9eaa5df19

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:3 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T193637Z.md run=39b33a8d-8a63-41e5-af34-145a5d525935

### 2026-10-01 · structural · oat-project-implement · final

markdown-bootstrap-main-remote-final-awaiting-hill-20261001: Main #334 integrated; all 14 tasks, both Bugbot corrections, optional-directory permission preservation and all eight local gates pass. Current independent final review has zero findings; retained gate 39b33a8d-8a63-41e5-af34-145a5d525935 passed with 0C/0H/0M/3L, one scoped rejection and two documentation corrections settled. Gate receive is allowed/fresh; existing summary/document/pr outputs are refreshed without resetting their completed sequence. Await final p04 HiLL approval; see implementation.md and reviews/final-unreadable-controls.md.

### 2026-10-02 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/markdown-docs-bootstrap/references/project-retro.md evidence_used=archived-review-markdown,committed-controls,decisions-and-backlog,docs-validation-receipts,gate-receipts,git-history,lifecycle-artifacts,original-root-session,project-log evidence_unavailable=oat-execution-learnings promotions=3 upstream=0 apply=skipped filing=deferred

### 2026-10-02 · structural · oat-project-implement · final

Main #338 integrated at 5a38d447 with nineteen conflicts resolved; all eight gates plus lint/format pass after ENOSPC recovery. Independent native Sol high final review returned 0C/0H/0M/0L and 575 actual focused tests. Public packages 0.3.13 exceed main 0.3.12; docs skill bumps pass. Renew retained gate before requested completion; existing sequence and recap skip retained.

### 2026-10-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-02T030210Z.md run=ef3220d1-1ba8-4d1a-9f96-82bdacd8ea5c

### 2026-10-02 · structural · oat-project-complete · retirement-sweep

Retirement sweep: no absorbed projects or backlog IDs recorded. Markdown slice is complete; the broader docs-bootstrap backlog stays open for approval classes, package drift, pntr automation and external acceptance. Three retro evidence links now target the durable summary; their exact-path receipts are updated.

## Post-completion PR review fix (2026-10-02)

[Bugbot comment 4162610788](https://github.com/voxmedia/open-agent-toolkit/pull/335#discussion_r4162610788), reviewed at `7ba2dda0c672e0830e81980b23d62d011266b9dc`, identifies a valid Medium issue: a failed exclusive baseline write leaves an empty/truncated file which adoption subsequently preserves. The user approved this bounded follow-up on PR #335 after lifecycle completion.

Failed baseline output is now removed only when the configured target remains valid and the path still identifies the regular file this attempt created. Successfully written/closed files and pre-existing authored content survive. A replacement inode is preserved. Failed cleanup reports a separate incomplete-file list and explicit inspection/repair advice; the original write error remains the cause and configuration/guidance stay unattempted.

Five real-filesystem storage regressions failed against the old code and pass fixed, including first/second baseline failure, successful retry, authored-content preservation, cleanup failure and replacement ownership. The human reporting regression failed before the fix; both human/JSON controls pass fixed. Neutralizing the inode guard makes the replacement control fail with ENOENT; restoring it passes. The output-consumer tests protect a separate risk: correct storage receipts could still be omitted from human recovery guidance.

Independent bounded review returned 0C/0H/0M/0L and executed 25 focused tests. All eight repository gates passed in order. The CLI workspace test task actually executed 8,027 tests across 403 files; other consumer tests/builds include cache replays, and root suites executed. [Exact exits, cache summaries and causal evidence](20261002-markdown-docs-bootstrap-follow-up-verification.json) are retained. Package 0.3.13 and existing skill bumps continue to pass the PR-scoped release gates. This follow-up leaves the original sealed archive and lifecycle record intact.
