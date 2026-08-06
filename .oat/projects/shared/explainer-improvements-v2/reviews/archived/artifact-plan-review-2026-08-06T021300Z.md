---
oat_generated: true
oat_generated_at: 2026-08-06T02:13:00Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 894e9daa-c2b3-4474-b6f2-b9701037a927
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T02:13:00Z
**Scope:** Current quick-mode implementation plan aligned against discovery,
the approved lightweight design, the normative Cyclone handoff, implementation
bookkeeping, and targeted repository surfaces needed to verify task feasibility
**Files reviewed:** 6 project artifacts plus targeted repository evidence
**Commits:** N/A (artifact review)
**Gate route:** inline (runtime `cursor`; branch-local CLI root validated)
**Gate invocation target:** `cursor-gpt-5-6-sol-xhigh`
**Managed-policy dispatch audit (non-authoritative for the gate target):**
Dispatch: scope=plan action=review role=reviewer producer=unknown
provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-reviewer-gpt-5-6-sol-high
**Dispatch profile advisory:** Applied. Explicit per-phase ceiling rows are
optional, and the plan's managed-policy inheritance is not a finding.

## Summary

The plan has broad requirements coverage and substantially improved contract
propagation, but two Important gaps still make it unsafe to implement: the
breaking project-recap recipe migration has no recipe-version compatibility
path, and the double-nesting guard does not reach direct core callers. Three
Medium consistency and bookkeeping gaps should also be corrected before the
plan is marked passed.

Findings: 0 critical, 2 important, 3 medium, 0 minor

## Findings

### Critical

None

### Important

- **The structured project-recap migration changes the version-1 recipe in
  place** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1082`)
  - Issue: p05-t06 changes the standard `project-recap` recipe from HTML
    authoring to structured authoring, and p06-t01 later changes its floor, but
    both tasks modify the sole `recipes/project-recap.json` entry without
    allocating a new recipe version or switching new adapter requests to that
    version. The current recipe registry keys files by exact
    `id@version`
    (`.agents/skills/explainer-kit/scripts/lib/recipes.mjs:70-83`), the shipped
    recipe is still `project-recap@1`
    (`.agents/skills/explainer-kit/recipes/project-recap.json:2-4`), and the
    adapter emits recipe version `1` for every new run
    (`.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs:180-184`).
    Preserving `author-request/v2`, `author-result/v2`, and `set-plan/v1`
    validators does not preserve retained-run replay when runtime startup first
    loads a semantically replaced `project-recap@1` recipe.
  - Fix: Preserve the existing `project-recap@1` recipe and introduce a new
    exact recipe version for the structured/hub-floor behavior. Add the recipe
    registry/file changes, switch new adapter project-recap requests to the new
    version at the structured-authoring transition, and include executable
    coverage proving both retained v1 replay and new-version emission through
    the runtime, adapter, smoke, and release consumers.

- **The double-nesting guard cannot protect direct core callers from its
  adapter-only file scope**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:211`)
  - Issue: p01-t04 promises coverage for caller-supplied roots but lists only
    `oat-explainer-kit` adapter files. Direct core calls enter
    `runExplainer`, whose `initializeRun` path passes `outputRoot` and `slug`
    directly to `createConfinedRunRoot`
    (`.agents/skills/explainer-kit/scripts/lib/records.mjs:54-59`); that
    function creates the output directory and appends the slug
    (`.agents/skills/explainer-kit/scripts/lib/fs-safe.mjs:36-46`) without
    traversing the adapter resolver. The planned adapter check therefore leaves
    the handoff's original direct-caller failure mode intact.
  - Fix: Put the generic final-segment-versus-slug guard at the core run-root
    boundary before directory creation, include the owning core file and direct
    core tests in p01-t04 (or move the task to a core-writing phase), and retain
    adapter tests proving project/repo/direct wrapper paths pass the same
    contract.

### Medium

- **`publicAccess` defaulting and omission require an unstated source-aware
  contract** (`.oat/projects/shared/explainer-improvements-v2/plan.md:127`)
  - Issue: p01-t02 requires a CLI effective default for
    `explainers.publish.publicAccess`, while p03-t06 requires absent config to
    emit no field so the core default applies. Effective config returns default
    values with `source: default`, and the adapter already retains source
    metadata, but neither task states that request construction must distinguish
    an explicit `public` declaration from the effective default. Implementing
    the stated value flow literally would emit `public` for absent config and
    fail p03-t06's contract.
  - Fix: State the source-aware rule explicitly: validate the effective default
    but add `publicAccess` to `resolvedConfig.publish` and the core request only
    when its source is non-default (including runtime overrides), or remove the
    CLI default and leave absence represented as null. Add tests for absent,
    explicit-public, protected, and runtime-override sources.

- **The “one segment-encoding helper” task omits the adapter derivation that
  introduces a second implementation**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:593`)
  - Issue: p01-t01 creates adapter-side destination derivation with its own slug
    encoding rules, but p03-t04's single-helper file list covers only core
    render, publish, catalog, and run files. The plan can therefore finish with
    adapter destination encoding and core artifact URL encoding implemented
    separately, contrary to the design's one-helper requirement and the
    handoff's divergent-encoding fix.
  - Fix: Include `derive-destination.mjs` and its tests in p03-t04 and migrate
    them to a genuinely shared helper/contract. If cross-skill runtime imports
    are intentionally disallowed, amend the design from “one helper” to one
    canonical algorithm and require executable parity/property tests across
    both implementations.

- **Two Reviews rows still point to artifacts that were moved to the archive**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:1435`)
  - Issue: The rows at lines 1435 and 1438 remain `received` and reference
    `reviews/artifact-plan-review-2026-08-06T012159Z.md` and
    `reviews/artifact-plan-review-2026-08-06T015212Z.md`, but both files now
    exist only under `reviews/archived/`; implementation bookkeeping also says
    the attempt-6 findings were resolved. The ledger therefore names
    nonexistent active artifacts and misrepresents completed review cycles.
  - Fix: Preserve both event rows but change their artifact paths to the
    archived locations, update their statuses to the actual completed
    disposition, and record the resolved finding counts consistently with the
    other archived review rows.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`,
`implementation.md`, `state.md`,
`references/handoff-cyclone-case-study.md`, and targeted repository files needed
to verify bounded task and compatibility claims.

### Requirements Coverage

| Requirement area                    | Status  | Notes                                                             |
| ----------------------------------- | ------- | ----------------------------------------------------------------- |
| Local and remote path derivation    | Partial | Direct core double-nesting remains outside the planned guard      |
| Publish configuration and encoding  | Partial | Default provenance and cross-skill encoding need explicit scope   |
| Canonical links and link validation | Covered | Versioned author requests and a hard post-render gate are mapped  |
| Publication integrity and receipts  | Covered | Byte verification, receipt versions, and consumers are mapped     |
| Lifecycle ordering and recovery     | Covered | Correction, flagged durability, failures, and closeout are mapped |
| Structured visual-quality migration | Partial | New behavior lacks recipe-level retained-run compatibility        |
| Test and release closure            | Covered | Focused suites, smoke consumers, versions, and release gates map  |

### Extra Work (not in declared requirements)

None

## Verification Commands

Use these after correcting the plan and implementing the amended task scopes:

```bash
node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
node --test .agents/skills/explainer-kit/tests/url-segments.test.mjs .agents/skills/oat-explainer-kit/tests/derive-destination.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs
pnpm lint
pnpm format
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important findings
into plan fixes and resolve the Medium contract and bookkeeping gaps before
implementation.
