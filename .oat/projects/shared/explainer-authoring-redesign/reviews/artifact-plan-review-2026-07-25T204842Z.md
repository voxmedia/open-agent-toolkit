---
oat_generated: true
oat_generated_at: 2026-07-25T20:48:42Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T20:48:42Z
**Scope:** Fifth-gate implementation-readiness and upstream-alignment review
**Files reviewed:** 6 project/review artifacts and 18 targeted runtime, test,
adapter, smoke, and release sources
**Commits:** Not applicable (artifact review of the working-tree post-image)

## Summary

The rewrite closes six of the eight prior findings and substantially closes the
2.0.0 boundary: D1 origin propagation, exact shell-script comparison, the
diagram grammar, B3 wording, the p05 cross-reference, and the compatibility
file allocation all match the cited repository evidence. The plan is still not
implementation-ready because rejected runs have no specified, record-safe way
to re-render and re-run QA after an edit, and `content-approval/v2` is activated
before the current pipeline can supply its required artifact metadata.

**Verdict: BLOCK**

Findings: 0 critical, 2 important, 1 medium, 1 minor

## Findings

### Critical

None

### Important

- **Reopen render and QA safely after a rejected draft is edited**
  (`.oat/projects/shared/explainer-authoring-redesign/plan.md:650`)
  - Issue: p06-t01 now accepts a persisted `rejected` approval only when render
    and QA are already complete, while the preserved correction loop edits the
    source after that rejection and verifies that the corrected source reaches
    the rendered artifact
    (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:179-238`).
    The build-record API makes `passed`/`warned` stages terminal and rejects a
    transition back to `running`
    (`.agents/skills/explainer-kit/scripts/lib/records.mjs:18-23`,
    `:84-101`). p06-t01 scopes only `run.mjs` and the integration test. A
    literal implementation must therefore either publish the pre-edit render,
    fail when `executeStage` tries to run again, or bypass the stage record and
    leave stale safety/QA evidence. The end-to-end assertion catches stale
    output, but it does not make the stage transition safe.
  - Fix: Define the rejected-resume path explicitly: after accepting the
    resumable record, reopen and re-run render plus QA against the edited
    sources before processing approval. Add a narrowly guarded record-level
    reopen/reset API and its tests (or an equivalent auditable attempt model)
    to p06-t01's file scope. Verify both a safe correction and an unsafe/QA
    failing correction; the latter must update the build record and keep
    publish/durability at zero. A direct unedited pending-to-approve resume may
    hydrate the already validated render.
  - Requirement: D4; preserve reject → edit → approve → same-run resume without
    weakening safety evidence.

- **Do not activate approval v2 before complete artifact metadata exists**
  (`.oat/projects/shared/explainer-authoring-redesign/plan.md:299`)
  - Issue: p01-t05 requires every new pending/rejected record to contain a
    complete artifact entry, including `origin`, `authoring`, `contentPath`,
    and `authorResultPath`, but it modifies only `content-approval.mjs` and its
    unit test. Until p06-t02, the runner passes only
    `state.authorResultPaths` into approval
    (`.agents/skills/explainer-kit/scripts/run.mjs:112-117`), and interactive
    runs synthesize content without creating any author result
    (`:85-95`). Thus p01-t05 cannot satisfy its production contract as scoped,
    and p06-t01's intervening full-core-suite commit runs in that inconsistent
    state. The legacy rule has the same hole: current v1 pending/rejected
    records contain no author-result path
    (`.agents/skills/explainer-kit/scripts/lib/content-approval.mjs:42-67`),
    yet the proposed normalized floor entry makes `authorResultPath` required.
  - Fix: Make activation atomic with the producer. Either move first v2 writes,
    the complete-set assertions, and the content-approval module/tests into
    p06-t02, or define and test a coherent transitional record that the
    pre-author-stage runner can actually supply. Separately specify the legacy
    normalization (for example, `authorResultPath` optional only on normalized
    v1 records with content-file hydration) rather than inventing a path to a
    file that does not exist. Require the full core suite at whichever task
    first emits v2.
  - Requirement: D8; durable variable-set hydration and readable in-flight v1
    approvals.

### Medium

- **Align D4's upstream predicate with the corrected plan**
  (`.oat/projects/shared/explainer-authoring-redesign/design.md:319`)
  - Issue: p06-t01 correctly says unresolved means `pending` or `rejected`, but
    D4 still says the predicate keys on “approval pending.” This leaves the
    binding design and implementation task in direct conflict. The task's
    explicit regression test makes the intended implementation recoverable,
    so this drift alone is not a block.
  - Fix: Change D4 to the same unresolved-state predicate and add the
    rejected-edit revalidation behavior from the Important finding above.

### Minor

- **Remove stale p08-t02 version-bump annotations**
  (`.oat/projects/shared/explainer-authoring-redesign/plan.md:348`)
  - Issue: p02-t01 still says the adapter bump is deferred to p08-t02, and
    p08-t01 says the core bump lands there (`plan.md:902`). The authoritative
    p06-t04 and p08-t02 steps correctly place both core and adapter bumps in
    p06-t04 and forbid a second bump, so these annotations are low-risk wording
    drift.
  - Suggestion: Point both annotations to p06-t04.

## Prior-Finding Remediation Verification

| Prior finding                   | Result                          | Repository-backed assessment                                                                                                                                                                                           |
| ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reject-resume predicate         | Partial                         | p06-t01 now names `pending` and `rejected` and requires the existing correction loop, but D4 remains pending-only and the plan does not account for terminal render/QA stages after the edit.                          |
| Variable artifact-set hydration | Partial                         | D8, the complete persisted shape, p06-t02 hydration, and owning files are present. Activation precedes the data producer, and legacy v1 records cannot supply the required path.                                       |
| 2.0.0 boundary atomicity        | Closed with minor wording drift | p06-t04 owns core 2.0.0, the adapter bump/minimum/prose/test, smoke pins, sync, and v1 retirement. p08-t02 explicitly excludes a second core/adapter bump. Current source confirms the cited version pins and minimum. |
| D1 origin propagation           | Closed                          | Current renderer descriptors and links are exact-key objects at the cited locations; design and p03-t02 now carry `origin` through both path and link generation and require both assertions.                          |
| Shell script multiset           | Closed                          | `deck-shell.html` has distinct scripts at lines 13 and 223. D3/p04-t01 require same hashes, count, order, and exact bytes, with deletion/duplication/reordering/substitution coverage.                                 |
| Diagram grammar                 | Closed                          | D7 and p03-t03 define the same minimum grammar and degradation boundary with concrete supported/degradation fixtures.                                                                                                  |
| B3 wording                      | Closed                          | B3 now limits stability to rendered URLs and recipe/artifact identity and expressly permits the `engineer-tour` source/content extension change.                                                                       |
| p05 cross-reference             | Closed                          | p05-t01 now assigns run-stage wiring to p06-t02.                                                                                                                                                                       |

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`,
`implementation.md`, `state.md`, the immediately prior plan review, and
targeted current runtime, record, approval, renderer, schema, adapter, smoke,
and release sources. `spec.md` is not present and is optional in this quick
workflow.

### Plan Readiness

| Check                              | Status  | Notes                                                                                                                                      |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical structure and stable IDs | passed  | Required frontmatter/sections, Reviews, 20 monotonic task IDs, Implementation Complete, and References are present.                        |
| Upstream discovery/design coverage | partial | All redesign components are tasked; D4 and D8 have the blocking execution-boundary gaps above.                                             |
| Task atomicity / green commits     | blocked | p01-t05 cannot emit its required production shape as scoped; p06-t01 cannot safely re-run terminal render/QA stages after a rejected edit. |
| Verification commands              | passed  | Every task declares runnable verification, but the two blocked tasks need expanded scopes/checks.                                          |
| Parallelism claims                 | passed  | p02/p03/p04 write sets remain disjoint and later integration work is sequential.                                                           |
| Release/version closure            | passed  | p06-t04 is now the atomic compatibility boundary; p08-t02 performs only remaining bumps, final sync, and release checks.                   |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan/design:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md" ".oat/projects/shared/explainer-authoring-redesign/design.md"
rg -n "approval pending|version bump .*p08-t02|authorResultPath" .oat/projects/shared/explainer-authoring-redesign/{design,plan}.md
node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs
```

## Recommended Next Step

Run `oat-project-review-receive` to make the D4 revalidation transition and D8
activation/legacy representation explicit, then rerun the plan gate.
