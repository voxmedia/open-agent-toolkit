---
oat_generated: true
oat_generated_at: 2026-08-06T18:00:42Z
oat_review_scope: plan-revision
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_review_base_sha: ce946700fe5236b378d635794006a1b06575ea64
oat_review_head_sha: c33edabc017369a629ca7a3a63757cbad3d9dab9
oat_review_range: ce946700fe5236b378d635794006a1b06575ea64..c33edabc017369a629ca7a3a63757cbad3d9dab9
oat_review_verdict: blocked
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
oat_dispatch_policy: high
oat_dispatch_ceiling: gpt-5.6-sol-high
oat_dispatch_target: oat-reviewer-gpt-5-6-sol-high
---

# Artifact Review: plan-revision

**Reviewed:** 2026-08-06T18:00:42Z
**Scope:** Delta-focused review of the revised quick-mode design and 17-task
plan against discovery, the Cyclone handoff, completed p01, implementation
tracking, project state, and live core/adapter contracts
**Revision base:** `ce946700fe5236b378d635794006a1b06575ea64`
**Reviewed HEAD:** `c33edabc017369a629ca7a3a63757cbad3d9dab9`
**Commits:** `ce946700fe5236b378d635794006a1b06575ea64..c33edabc017369a629ca7a3a63757cbad3d9dab9`
**Files reviewed:** 5 revised project artifacts, the production handoff, and
focused live contract/producer/consumer evidence
**Verdict:** Blocked

## Summary

The revision makes the intended simplification explicit and preserves the
core/adapter, credential, human-gate, exact-byte, additive-publish, protected
access, and bounded-correction goals. The 17-task count, p02 resume pointer,
five sequential phases, and p05 HiLL checkpoint agree across the plan, state,
and implementation ledger.

Execution is still blocked by five artifact gaps: discovery continues to make
the superseded renderer/golden mechanisms normative, lifecycle tasks use an
outcome that does not exist in the live contract, versioned producers are not
paired with all required consumers and compatibility seams, the `sourceIds`
task does not require root-cause reproduction of the observed callback
failure, and the remaining tasks do not provide runnable verification
commands.

Findings: 0 critical, 5 important, 1 medium, 1 minor

## Findings

### Critical

None.

### Important

- **Discovery still makes superseded renderer and golden mechanisms
  normative**
  (`.oat/projects/shared/explainer-improvements-v2/discovery.md:127`)
  - Issue: The revision says the handoff's acceptance criteria remain
    normative, then repeats renderer-owned structured layouts, deterministic
    typography/layout behavior, semantic rendering, responsive golden
    fixtures, and the full original test matrix as success criteria
    (`discovery.md:161-179`). Its active risk and next-step sections still
    assume a structured-content migration and new negative/golden work
    (`discovery.md:233-239`, `250-253`). Those statements directly conflict
    with the approved override at `discovery.md:76-92` and the revised design's
    deliberate non-goals.
  - Fix: Make the 2026-08-06 operator revision the explicit authority for
    mechanism choice; rewrite Success Criteria, Risks, and Next Steps so they
    retain the underlying adaptive-selection, typography, composition,
    diagram-semantics, and critic-quality outcomes while replacing the deleted
    renderer/heuristic/golden prescriptions with the approved prose-led
    approach and unchanged-suite follow-up.

- **The lifecycle plan uses a nonexistent terminal outcome**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:343`)
  - Issue: Both design and plan define `built-clean` as a terminal value
    (`design.md:75-85`), but the live manifest/build-record contract has
    `built-durable`, `built-not-durable`, `built-needs-review`, `failed`, and
    `incomplete`—not `built-clean`
    (`.agents/skills/explainer-kit/schemas/build-record.schema.json:26-33`,
    `.agents/skills/explainer-kit/schemas/manifest.schema.json:76-80`). The
    plan also omits the existing nonblocking `built-not-durable` terminal
    path. Implementing p04-t02 literally therefore requires an unplanned
    contract migration or rejects an existing terminal completion outcome.
  - Fix: Keep the existing outcome vocabulary. Define exactly which existing
    outcomes the shared approval guard accepts—normally `built-durable`,
    `built-not-durable`, `built-needs-review`, and `failed`—and reject
    `incomplete`/missing records. Align design and p04-t02/p04-t03; do not add a
    new outcome schema solely to rename clean runs.

- **Versioned producers are not scoped with their live consumers and
  compatibility boundaries**
  (`.oat/projects/shared/explainer-improvements-v2/design.md:160`)
  - Issue: The design requires new producers and shipped consumers to move
    atomically, but three planned migrations are incomplete:
    1. p02-t01 emits `author-request/v3` inside a core-only phase boundary
       (`plan.md:125`, `144-146`), while the live adapter completion callback
       hard-asserts v2
       (`.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs:748-750`).
    2. p03-t01 makes the adapter emit `publish-request/v2`
       (`plan.md:217-221`), but the live `run-request/v1` schema embeds only
       `publish-request/v1`
       (`.agents/skills/explainer-kit/schemas/run-request.schema.json:40-50`).
       The adapter compatibility-floor update is deferred to p03-t02
       (`plan.md:252-255`) even though the dependency begins in p03-t01, and
       the p03 phase boundary excludes the release/smoke consumers that
       p03-t02 says it will migrate (`plan.md:197-198`, `238-240`).
    3. p05-t01 promises atomic `project-recap@2` emission
       (`plan.md:409-413`) but scopes recipe/registry and guidance, not the live
       adapter producer that currently pins every recipe to version 1
       (`.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs:191-194`).
  - Fix: Add the smallest concrete producer/consumer seams to their activation
    tasks: migrate the adapter callback fixture with author v3; make
    `run-request/v1` accept publish-request v1/v2 and advance the core version,
    adapter minimum floor, documentation, and compatibility tests when the
    adapter first emits v2; include release/smoke receipt readers within p03's
    boundary; and switch/test the adapter's project-recap recipe selection in
    p05-t01. Preserve v1/v2 replay. No new abstraction or schema beyond the
    already-planned versions is needed.

- **The `sourceIds` regression task assumes malformed output without locating
  the observed producer/consumer fault**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:311`)
  - Issue: p04-t01 replaces investigation with missing/scalar/null validation
    and says to normalize valid arrays (`plan.md:313-319`). The live set-plan
    callback request is constructed without a top-level `sourceIds`
    (`.agents/skills/explainer-kit/scripts/lib/set-plan.mjs:13-21`); current
    adapter callback fixtures derive IDs from `factBase.sources`
    (`.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs:1542-1555`).
    The production error can therefore arise inside a callback before returned
    set-plan schema validation runs. Merely rejecting malformed callback
    output does not prove the reported failure is fixed.
  - Fix: Restore an explicit investigation/reproduction step using the exact
    failing callback/request shape. Identify whether the producer must supply
    `sourceIds` or the callback must consume `factBase.sources`, pin that
    boundary in an adapter-to-core regression test, then retain the planned
    malformed returned-plan rejection cases.

- **Remaining tasks contain verification descriptions, not runnable commands**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:148`)
  - Issue: p02-t01 through p05-t02 say “Run focused … tests” without naming a
    command or test path (`plan.md:148-150`, `182-185`, `223-226`, `257-260`,
    `286-289`, `321-324`, `351-353`, `383-386`, `422-425`, `454-458`). This
    fails the plan's own restart-safe/atomic-task goal: a resumed implementer
    cannot reproduce the intended task gate, and phase review cannot tell
    whether all changed suites ran.
  - Fix: Replace each prose placeholder with the exact existing `node --test`,
    package-filter, docs, lint, and format commands appropriate to that task.
    Keep the final completion-gate list unchanged.

### Medium

- **The p04 write boundary excludes required publisher and archive
  implementation seams**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:301`)
  - Issue: p04's declared boundary covers core request records, adapter
    finalization, and two completion routes, while p04-t03 requires categorical
    denial at every publisher entry point plus archive verification
    (`plan.md:363-386`). The live behavior spans the core publish entry point,
    connector, package coverage/durability, adapter finalizer, and CLI archive
    verifier. A strict phase implementer cannot satisfy the task inside the
    stated boundary.
  - Fix: Expand the p04 boundary to name publisher entry points/connectors,
    package-coverage/durability records, adapter finalization, and CLI archive
    verification, without adding new subsystems.

### Minor

- **Quick-mode lifecycle metadata still points to obsolete workflow
  artifacts**
  (`.oat/projects/shared/explainer-improvements-v2/discovery.md:3`)
  - Issue: Discovery remains `oat_ready_for: oat-project-quick-start` although
    implementation is in progress, and implementation references a nonexistent
    quick-mode `spec.md` (`implementation.md:423-428`). State correctly says
    there is no spec.
  - Suggestion: Clear the stale discovery readiness pointer and replace the
    implementation reference with Discovery plus the handoff.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, revised `design.md`, revised
`plan.md`, `implementation.md`, `state.md`,
`references/handoff-cyclone-case-study.md`, completed p01 review history, and
focused live core/adapter schema, producer, consumer, lifecycle, publication,
release, and smoke evidence.

### Coverage

| Requirement area                     | Status    | Notes                                                                                                                                                                                                                                   |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supersession honesty                 | partial   | Design/plan are explicit, but discovery still declares deleted mechanisms normative.                                                                                                                                                    |
| Canonical links                      | planned   | v3 link table and fail-closed post-render validation are covered; adapter callback migration must join activation.                                                                                                                      |
| Exact/protected/additive publication | planned   | End-state behavior, human gate, exact bytes, protected checks, full receipts, and additive connector coverage remain intact; version boundaries need atomic scoping.                                                                    |
| Core/adapter and credential boundary | preserved | p01 evidence and revised design keep topology/config/credentials in the adapter and provider-neutral behavior in core.                                                                                                                  |
| Lifecycle and bounded correction     | partial   | End-state goals are retained, but terminal outcome vocabulary and p04 file boundary need alignment.                                                                                                                                     |
| `sourceIds` regression               | partial   | Malformed values are planned, but the observed callback failure is not root-caused or pinned end to end.                                                                                                                                |
| Prose-led visual quality             | planned   | Hub floor, justified expansion, typography, composition, slide patterns, diagram semantics, and critic dimensions are explicitly retained in prose; removed renderer/heuristic/golden machinery is not otherwise silently reintroduced. |
| Counts, ordering, and HiLL metadata  | aligned   | 17 tasks, 5 sequential phases, 6/17 complete, p02-t01 resume, and p05 HiLL agree across artifacts.                                                                                                                                      |

### Extra Work

None. The revised plan appropriately avoids renderer engines, visual scoring
scripts, new structured-authoring schemas, and expanded golden fixtures.

## Dispatch Audit

`Dispatch: scope=plan-revision action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`

## Verification Commands

Run after applying the smallest artifact corrections:

```bash
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/discovery.md .oat/projects/shared/explainer-improvements-v2/design.md .oat/projects/shared/explainer-improvements-v2/plan.md .oat/projects/shared/explainer-improvements-v2/implementation.md .oat/projects/shared/explainer-improvements-v2/state.md
rg -n "renderer-owned structured|responsive golden|built-clean|Run focused" .oat/projects/shared/explainer-improvements-v2/{discovery,design,plan}.md
rg -c "^### Task p[0-9]{2}-t[0-9]{2}:" .oat/projects/shared/explainer-improvements-v2/plan.md
git diff --check
```

## Recommended Next Step

Receive this review, apply only the five blocking corrections, record the
Medium/Minor items without opening another broad loop, and resume at p02-t01.
