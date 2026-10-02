---
oat_retro_project: markdown-docs-bootstrap
oat_retro_generated: '2026-10-02T00:03:54Z'
oat_retro_evidence_sources:
  - source: archived-review-markdown
    status: used
  - source: committed-controls
    status: used
  - source: decisions-and-backlog
    status: used
  - source: docs-validation-receipts
    status: used
  - source: gate-receipts
    status: used
  - source: git-history
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: original-root-session
    status: used
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: Markdown Docs Bootstrap

## Executive Summary

The project made plain Markdown an explicit bootstrap option while preserving OAT's authored context, Contents, metadata and ownership contracts. The difficult work was preservation and trustworthy lifecycle evidence, rather than adding a selector. Independent reviews caught filesystem and literal-text defects that ordinary successful CLI runs missed. Repeated bookkeeping repairs show where deterministic lifecycle transitions would reduce both risk and review cost.

At generation, fourteen implementation tasks and the subsequent approved two-page documentation update were committed. Final p04 approval had not been granted. This retrospective proposes evidence additions to three existing backlog items; it does not introduce another implementation phase or authorize filing.

## Evidence and Review Method

Read the append-only [project log](../project-log.md) first, then lifecycle artifacts, selected archived reviews, runnable controls and gate receipts. The log has fifteen structural entries and no judgment entries before this retro: incident detail comes mainly from [implementation history](../implementation.md), not from an invented project-log narrative. Project-local `oat-execution-learnings.md` was unavailable.

Original root session `01a0f2d6-97e2-7ed1-8450-a3ee7bc7fef5` supplied a bounded window of operator choices: quick workflow, lightweight design, retained gates, explicit recap skip, main integration and the later documentation approval. Local response-item records were read directly; no current reconnaissance transcript was treated as original execution evidence. Two read-only lanes helped extract incidents and deduplicate follow-ups; root checked their load-bearing anchors.

All incident causes below are **confirmed** by committed records or matching receipts. Review invocation/model controls are recorded configuration evidence, not independent runtime-identity proof. Existing tests and probe receipts were assessed rather than newly reproduced for the retro. The later docs run's nine explicit command/fetch receipts were also read: all eight required gates passed, with actual/cache distinctions retained. Remote CI, publication and external-repository acceptance were not assessed here.

Retro artifact checks passed: formatting, Markdown lint, complete frontmatter/register validation, relative file links and the exact project-log receipt. During repository verification, fresh `origin/main` was `fa1af130a9523318ba806f90b5166e11b23f1e43` (#336). Six of the eight gates passed, including package release validation; `pnpm run check:skill-bumps` exited 1 because changed `oat-docs-analyze` is 1.6.0 on both branches, and `pnpm release:check-versions` exited 1 because all five public packages are 0.3.11 on both branches. Earlier successful version checks covered the prior integration base. This is confirmed new integration/version work for implementation resume, not a retrospective content failure. The retro run did not merge main or alter skills/packages; cached workspace results are not described as new execution.

## Outcome Snapshot

| Area               | Evidence at generation                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivered scope    | Markdown config, literal roots, additive adoption, authored-index protection, read-only preview and consumer/skill/docs alignment; fourteen tasks completed.                                          |
| Release assets     | Five public packages prepared at 0.3.11; two Markdown templates distributed; 66 bundle byte comparisons and four isolated install/update controls recorded.                                           |
| Verification       | Latest source acceptance records 7,970 actual CLI tests and 200 focused tests; final source reviewer independently ran 166 tests and fourteen real CLI controls.                                      |
| Final gate history | Run `39b33a8d-8a63-41e5-af34-145a5d525935` passed with 0 Critical, 0 High, 0 Medium and 3 Low; one scoped suggestion rejected, two prose/artifact corrections addressed.                              |
| Subsequent change  | Docs commit `420bceded` adds the optional-discovery explanation; state commit `6ba1aabe4` records completed docs sync. Those shipped docs changed the gate fingerprint after its accepted checkpoint. |
| Lifecycle boundary | At generation, PR #335 was tracked open, final p04 approval was pending, recap intent was skipped, and gate freshness needed renewal. No project completion or merge was inferred.                    |

## Current State

- **Promotions:** none; no RP apply-items.
- **Filing:** complete; RP-01, RP-02 and RP-03 strengthened their existing repository backlog destinations, with verified commit receipts and unpushed visibility.
- **Unsettled items:** none. Next action: none for retro filing; destination changes are durable locally.

## What Went Well

- Lightweight design established authored-index ownership and explicit adoption before code changes. Existing framework behavior received accepted controls, instead of being assumed compatible.
- Public old/fixed regressions tested actual YAML, Contents destinations, preserved bytes and real permissions. They established both rejection of bad states and continued acceptance of valid inputs. See [literal-value controls](../reviews/final-dollar-controls.md) and [permission controls](../reviews/final-unreadable-controls.md).
- Root kept receive judgment, provenance and approval separate from delegated execution. Pre-start native-role rejection was proven before a fresh pinned fallback; unknown runtime identity was not presented as independently observed.
- Main integration preserved the incoming dispatch changes, lockstep versions and genuine sync producer stamp. [Integration controls](../reviews/final-integration-controls.md) describe seven resolved conflicts; a later empty combined diff was explicitly rejected as proof of no resolutions.

## Challenges and Struggles

### Literal input succeeded while producing incorrect documentation

Filename URI delimiters first exposed broken adopted links; later a passing gate found JavaScript replacement-string dollar syntax altering user text and metadata despite CLI success. Fixes encoded filename segments and used one-pass callback insertion, with independent destination and YAML/Contents oracles proving old failure and fixed preservation. Ordinary-input success alone had not covered the external text boundary. Anchors: p02-t03; renderer commit `fbeebbdde26ffb3b4b885118d24f3eda2e1a4359`; [literal-value causal proof](../reviews/final-dollar-controls.md#causal-oldfixed-regression).

### Optional discovery initially inherited required-entrypoint failure behavior

Remote review reproduced adoption aborts for optional child-index aliases and false missing-index advice for instruction-only trees. After those fixes, a passing gate exposed recursive permission failures aborting readable siblings. The response separated strict required root validation from tolerant optional discovery, preserving unusable or unknown content with advice. A real EACCES regression failed old source and passed fixed without skipping; required-root refusal stayed intact. Anchors: p04-t04 through p04-t06; `b541b04`, `e74c061`, `f273617`; [permission acceptance](../reviews/final-unreadable-controls.md#p04-t06-source-acceptance).

### Tracking repairs themselves needed evidence checks

A retained page checker used an unqualified working-tree diff and could pass with zero pages after commit. Its first attempted exact-text repair missed a formatter-expanded code block, yet commit `8ecf2c1` recorded completion prematurely. Root then edited the actual block structurally, extracted it after formatting and proved twelve pages/105 destinations. Separately, fragmented review rows were consolidated without losing cells, and a writer that joined gate YAML to the recap key was repaired before dispatch. These are confirmed writer/checker defects; the evidence does not attribute every status drift to hooks. Anchors: implementation headings **p03 root evidence correction completion** and **Retired implementation gate generation after sweep correction**; review-table repair `ec5414d`.

### Terminal gate markers were transient, and a failed check did not stop the command group

The CLI removed its live run marker on completion. A root post-result check expected that path and failed, but its shell group continued to persist receive intent. No receive ran before reconciliation. Root used captured acceptance metadata, the full envelope and artifact correlation, then made subsequent mutation groups fail on the first error. No replacement gate was launched. The incident demonstrates why terminal proof must outlive liveness markers and prerequisite failures must prevent state transitions. Anchor: implementation **Root receipt-check correction**, run `74cf045f-60fb-4931-a434-8cc9eaa5df19`.

### Documentation coverage changed after the final accepted gate

The implementation had documented twelve public pages, but the later explicit document run identified missing explanations for optional discovery. An approved two-page addition was committed and passed all eight local gates. Because public docs are shipped assets, this changed the effective delta after the gate's accepted freshness checkpoint. The earlier passing receipt remains valid history, not current-head authorization. Anchors: `420bceded`, `6ba1aabe4`; state gate freshness head `4e6ec9a0e6910ca82cb9e22a339b37476547f0c8`; original operator documentation approval.

## Decision Register

The accepted decisions already have durable records; no replacement record is proposed.

- [Explicit Markdown roots](../../../../repo/reference/decisions/DR-261001-explicit-markdown-roots.md): declared Markdown roots stay literal.
- [Additive adoption](../../../../repo/reference/decisions/DR-261001-additive-markdown-adoption.md): add missing baseline files and preserve authored content.
- [Authored indexes](../../../../repo/reference/decisions/DR-261001-authored-markdown-indexes.md): generated inventories remain external and cannot replace context.
- [File verification](../../../../repo/reference/decisions/DR-261001-markdown-file-verification.md): retain quality contracts without requiring a site build.
- [Detection boundary](../../../../repo/reference/decisions/DR-261001-bootstrap-detection-boundary.md): bootstrap selection does not change general init detection.

## Rejected or Superseded Alternatives

`--yes` as implicit adoption, rewriting malformed authored content, app scaffolding for Markdown and in-tree generated manifests were rejected during design. In the final passing-gate sweep, an adjacent top-level permission-message consistency suggestion was rejected as outside the bounded nested-enumeration contract: adoption already preserved the subtree and reported an unusable candidate path. This was a reasoned scoped disposition, not deferred preservation debt.

## Where We Changed Course

- Bundle registration and build-before-bundle-test gaps in plan review led to explicit distribution owners and installed-template controls before readiness.
- Independent reviews added bounded text and optional-filesystem corrections rather than widening the project into framework conversion or approval-policy work.
- The operator's main-merge request triggered composition verification, followed by remote feedback receive and current-source acceptance.
- The later documentation request added a small public explanation after closeout outputs had been completed; freshness was evaluated separately from stored step completion.

## Domain Learnings

Authored context, generated inventories and instruction files have different ownership. A plain directory is not automatically an OAT-conformant documentation surface. Bootstrap may establish configuration while preserving content that still needs approved repair.

Filesystem discovery also has distinct boundaries: required entrypoints must be usable, while optional discovery may preserve an unusable child and continue. Report uninspected content as unknown. Independent readers are especially useful where successful writes can still corrupt literal values or link destinations.

## Gotchas for Humans

- Treat cache replay, actual suite execution and inherited review coverage as different evidence. Confirm exits directly and assert nonzero scanned coverage.
- Complete requested public-doc refinements before treating a final gate as current. Adding shipped docs after a passing review requires freshness evaluation.

## Gotchas for Autonomous Agents

- Prove a rejected launch started no child before using an approved fallback; preserve original request linkage and configured controls.
- Parse and validate complete frontmatter/table structures after formatting. A completion note is not evidence that the intended edit landed.
- Preserve terminal acceptance receipts before relying on ephemeral marker paths. Stop mutation groups when a prerequisite check fails.

## Repo Improvements (Promotion Register)

### RP-01: Add structural preservation cases to the lifecycle authority work

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260927-derive-current-lifecycle-state.md
- **Destination-receipt:** 322cf60baab648a313760a1ec416f899ed13e2d7
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Strengthened the approved existing backlog item; verified later exact-path receipt updates its archive-safe evidence link. Original strengthening: 8bf407e4cbfd548fd11f4a6ded2ad5ad1f4f63de. Local only at writeback.

Extend existing [BL-260927-derive-current-lifecycle-state](../../../../repo/pjm/backlog/items/BL-260927-derive-current-lifecycle-state.md), rather than opening a duplicate. This run adds concrete examples of joined YAML, fragmented review tables and stale task/status views. Its structured transition helper should validate complete frontmatter, keep review rows contiguous, preserve unknown columns and historical cells, and retain immutable completed sequence state before recording a transition. A failed edit or validation must leave the prior state and completion record unchanged.

### RP-02: Add terminal-receipt and passing-sweep cases to exact gate binding

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260820-bind-each-gate-review.md
- **Destination-receipt:** 322cf60baab648a313760a1ec416f899ed13e2d7
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Strengthened the approved existing backlog item; verified later exact-path receipt updates its archive-safe evidence link. Original strengthening: 8bf407e4cbfd548fd11f4a6ded2ad5ad1f4f63de. Local only at writeback.

Extend existing [BL-260820-bind-each-gate-review](../../../../repo/pjm/backlog/items/BL-260820-bind-each-gate-review.md). Add this run's exact scope/type/artifact/event correlation, terminal marker cleanup and failed-prerequisite receive-intent incident as controls. Terminal receive should consume retained acceptance proof without relying on a live marker, while mismatched or incomplete proof must refuse mutation. An `ok` threshold with address-now findings must preserve raw counts and consume no failed remediation attempt; a later source change retires routing freshness without rewriting the received event's identity or reviewed head.

### RP-03: Add a late documentation case to closeout freshness tracking

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-260820-track-pr-closeout-evidence.md
- **Destination-receipt:** 322cf60baab648a313760a1ec416f899ed13e2d7
- **Remote-visibility:** unpushed
- **Sanitized:** no
- **Disposition-note:** Strengthened the approved existing backlog item; verified later exact-path receipt updates its archive-safe evidence link. Original strengthening: 8bf407e4cbfd548fd11f4a6ded2ad5ad1f4f63de. Local only at writeback.

Extend existing [BL-260820-track-pr-closeout-evidence](../../../../repo/pjm/backlog/items/BL-260820-track-pr-closeout-evidence.md). Use the accepted gate followed by `420bceded` as a real late-docs control. A resume must classify changed completed-step outputs, identify which exact receipts became stale, refresh the affected evidence before approval, and preserve the completed summary/document/PR sequence rather than resetting or reordering it. Public bundled docs must not inherit the exemption for project/reference bookkeeping. This proposal strengthens an existing freshness contract; it does not establish that the current resume implementation incorrectly approves stale work.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

This checkout is OAT itself. The three tooling proposals belong to its existing repository backlog; duplicating them in a separate upstream lane would create two owners for the same work.

## Remaining Boundaries and Follow-Ups

At generation, this run had not filed or applied the proposals. The broader [docs-bootstrap backlog item](../../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md) was intentionally open for package drift, approval classes, pntr automation and external acceptance. Final gate renewal and explicit p04 approval were still needed; the documentation approval did not grant lifecycle approval. Verification additionally established that integration of main #336 and fresh skill/public-package versions are needed before branch closeout. Publication and PR merge were outside this retro's authorization.

## Reflections

The reusable result is a set of preservation boundaries with repeatable evidence. Repeated avoidable work came from maintaining current lifecycle truth in several Markdown views and temporary scripts. Promote the concrete incidents into existing reliability work, preserve causal public tests and honest provenance, and use the project log to capture judgments when they occur rather than leaving a later retro to recover them from a long execution ledger.
