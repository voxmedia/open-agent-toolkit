---
oat_generated: true
oat_generated_at: 2026-07-28T05:45:20Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
oat_review_request_id: explainer-improvements-p02-review-20260728T053500Z
oat_implementation_request_id: explainer-improvements-p02-20260728T041600Z
oat_phase_base: b54863f19d5db6df47b1538e791adadaf76f0306
oat_reviewed_head: 86fc4b6acc737a995783210699cee055e7860a45
oat_review_range: b54863f19d5db6df47b1538e791adadaf76f0306..86fc4b6acc737a995783210699cee055e7860a45
oat_tracking_baseline: a732eac3ddf410709643344809f33e281ed0bbc2
oat_tasks: [p02-t01, p02-t02, p02-t03, p02-t04, p02-t05, p02-t06, p02-t07]
oat_reviewer_target: oat-reviewer-gpt-5-6-sol-high
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
oat_dispatch_policy: high
oat_dispatch_ceiling: gpt-5.6-sol-high
oat_dispatch_stamp: 'Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high'
---

# Code Review: Phase p02

**Reviewed:** 2026-07-28T05:45:20Z
**Phase:** p02 — Set-level visual authoring runtime
**Review request:** `explainer-improvements-p02-review-20260728T053500Z`
**Implementation request:** `explainer-improvements-p02-20260728T041600Z`
**Tasks:** `p02-t01`, `p02-t02`, `p02-t03`, `p02-t04`, `p02-t05`,
`p02-t06`, `p02-t07`
**Base:** `b54863f19d5db6df47b1538e791adadaf76f0306`
**Reviewed head:** `86fc4b6acc737a995783210699cee055e7860a45`
**Authoritative range:** `b54863f19d5db6df47b1538e791adadaf76f0306..86fc4b6acc737a995783210699cee055e7860a45`
**Current committed tracking baseline:** `a732eac3ddf410709643344809f33e281ed0bbc2`
**Reviewer target:** `oat-reviewer-gpt-5-6-sol-high`
**Dispatch axes:** `model_axis=selected:gpt-5.6-sol-high`;
`effort_axis=not-applicable`
**Dispatch policy/ceiling:** `high` / `gpt-5.6-sol-high`
**Dispatch stamp:** `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`
**Files in authoritative diff:** 30
**Commits:** 8
**Reconnaissance:** not-attempted

## Verdict

**BLOCKED.** The phase establishes the adaptive visual minimum, provider-neutral
planner seam, bundled author/reviewer references, and version alignment, but
five contract and runtime gaps leave the set incomplete or mutable in paths
that current tests do not exercise.

Findings: 0 critical, 5 important, 0 medium, 0 minor

**Blocking threshold:** Critical or Important.
**Blocking fixes required:** Yes — resolve I1 through I5 before Phase p02 can
pass.

## Evidence Sources

The project uses import workflow mode. Review evidence used:

- `AGENTS.md`
- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- `.oat/projects/shared/explainer-improvements/plan.md`
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- `.oat/projects/shared/explainer-improvements/reviews/20260728-p01-code-review.md`
  as prior context only
- The complete authoritative Git range, all eight commits, and all 30 changed
  files
- Current bundled skill references, briefs, schemas, recipes, core runtime,
  adapter runtime, retained-record logic, tests, and `NOTICES.md`

`spec.md`, `design.md`, and `discovery.md` are absent, which is allowed for this
import-mode project.

## Findings

### Critical

None.

### Important

- **I1 — Set-plan validation permits silent source-coverage loss**
  (`.agents/skills/explainer-kit/scripts/lib/set-plan.mjs:107`)
  - Issue: `validateAgainstInputs` proves only that each declared plan source is
    available. It does not require the plan's `sourceIds` to equal all
    reconciled non-critic source IDs, nor require every declared source to be
    assigned to at least one portfolio entry. A targeted probe passed a fact
    base with `plan` and `implementation` sources through a valid plan that
    declared and used only `plan`.
  - Impact: The planner can silently omit approved lifecycle evidence while
    satisfying the schema and runtime checks. The retained “source coverage”
    record therefore does not enforce the p02-t02 contract.
  - Fix: Compare the plan source set exactly with the reconciled non-critic
    source set and require portfolio coverage for each source. Add negative
    tests for omitted plan-level and unassigned artifact-level sources.
  - Requirement: p02-t02 source coverage and p02-t03 fail-closed planning.

- **I2 — Visual-review contracts accept a partial adaptive set**
  (`.agents/skills/explainer-kit/scripts/lib/contracts.mjs:494`)
  - Issue: Request validation rejects unknown and duplicate rendered artifact
    IDs but never rejects missing planned IDs. Result validation has no
    cross-record checks, so `artifactIds` can name only a subset and findings
    can be detached from the reviewed request. A targeted probe validated a
    three-artifact plan with only the hub in both the review request and a
    passing result.
  - Impact: A later critic can produce a schema-valid `pass` without rendered
    evidence for architecture or deck. That defeats whole-set review and makes
    the exact adaptive portfolio unenforceable at the contract boundary.
  - Fix: Require request `renderedArtifacts` IDs to equal the plan portfolio.
    Validate results against the request so `artifactIds` equal the reviewed
    set, every finding references that set, and `pass` cannot coexist with
    correction findings. Add omission, extra, duplicate, and detached-result
    tests.
  - Requirement: p02-t02 exact adaptive portfolio, rendered review evidence,
    artifact IDs, and valid dispositions.

- **I3 — Retained set-plan records are not part of the immutable package and
  resume trusts them without revalidation**
  (`.agents/skills/explainer-kit/scripts/run.mjs:1283`)
  - Issue: `immutableHashesFor` omits all five `state.setPlanPaths`, and manifest
    cross-record validation likewise excludes them. On resume,
    `hydrateResumableState` reads only `source/set-plan/result.json` and does
    not validate it, compare its ledger/portfolio/drafts projections, or bind
    approval artifacts and retained author identities back to that plan
    (`.agents/skills/explainer-kit/scripts/run.mjs:454`). The write helper's
    “already exists” check protects only a second in-process write; it does not
    detect post-pause mutation.
  - Impact: The shared ledger, portfolio, drafts, author identity mapping, or
    set context can change between initial authoring and approval resume
    without a hash mismatch. Durable evidence also omits the records needed to
    reproduce the author requests, so the claimed immutable rebuild package is
    incomplete.
  - Fix: Add every set-plan record to immutable hash coverage and manifest
    completeness validation. On resume, validate all five records, require
    their projections and hashes to agree, and rebind every approval/content/
    author record to the validated portfolio using confined paths. Add tamper
    tests for plan, ledger, portfolio, drafts, artifact identity, and retained
    paths, plus an assertion that the planner and authors remain uninvoked on a
    valid resume.
  - Requirement: p02-t03 immutable versioned records and rebuildability.

- **I4 — Artifact authors do not receive the bundled visual-authoring rules**
  (`.agents/skills/explainer-kit/scripts/run.mjs:986`)
  - Issue: `authorArtifact` inlines the artifact brief and shell but never loads
    or includes `references/visual-authoring.md`. The author-request schema has
    no guidance field, and adapter tests assert only brief and shell presence.
    The adapter's required callback reference also still tells floor authors
    to propose expansion
    (`.agents/skills/oat-explainer-kit/references/author-callback.md:33`), while
    the new core rejects every author proposal after set planning
    (`.agents/skills/explainer-kit/scripts/run.mjs:877`).
  - Impact: A provider-neutral callback receives neither the representation,
    hierarchy, responsive-navigation, table, diagram, and deck baseline added
    by p02-t01 nor accurate current expansion instructions. Unattended quality
    therefore depends on out-of-band prompt construction despite the claimed
    self-contained adapter binding.
  - Fix: Make relevant bundled authoring guidance an explicit closed
    author-request field, or define and test an equivalent adapter-owned
    preload contract. Update `author-callback.md` for planner-owned portfolios,
    immutable set context, planned artifact identity, and the prohibition on
    author-driven expansion.
  - Requirement: p02-t01 self-contained authoring and p02-t05 relevant bundled
    guidance per author.

- **I5 — Project recap has no explicit deterministic Markdown fallback**
  (`.agents/skills/explainer-kit/recipes/project-recap.json:14`)
  - Issue: All three required recap artifacts are fixed to `authoring: html`.
    Runtime dispatch selects exactly the declared authoring path and fails when
    the artistic author cannot satisfy it; no project-recap profile, request
    mode, or bounded failure branch selects the deterministic Markdown
    renderer. Repository search found only the golden HTML path for this
    recipe, not an explicit fallback.
  - Impact: The flagship correctly uses the artistic composer, but the other
    half of p02-t04 is absent. Operators cannot deliberately choose the simpler
    deterministic fallback, and a failure can be misrepresented as retained
    fallback behavior that does not exist.
  - Fix: Add a clearly opt-in, bounded project-recap fallback policy that
    selects the Markdown path without silently downgrading unattended golden
    runs. Test explicit selection, default artistic selection, and prohibition
    of automatic downgrade.
  - Requirement: p02-t04 deterministic Markdown as explicit fallback, not the
    golden path.

### Medium

None.

### Minor

None.

## Task Alignment

| Task      | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p02-t01` | partial     | Both bundled references are portable, meaningfully separate author and critic responsibilities, cover representation, hierarchy, diagrams, decks, tables, and responsive navigation, and require no home-directory plugin. Existing visual-explainer notice provenance covers the adapted visual and QA patterns. I4 blocks runtime delivery of those rules to callbacks. |
| `p02-t02` | partial     | Schemas are closed and provider-neutral; ledger conflicts, unknown sources, unjustified optionals, detached author entries, and disposition enums are checked. I1 and I2 leave source coverage and exact whole-set review unenforced.                                                                                                                                     |
| `p02-t03` | partial     | The planner runs once after reconciled facts and before authors, required drafts and invalid sources/conflicts fail before composition, and authors receive value-identical set context. I3 leaves retained set records mutable and incomplete in durability evidence.                                                                                                    |
| `p02-t04` | partial     | Unattended recap requires exactly hub, architecture, and deck; bounded optionals use allowed profiles and source-backed justifications; the hub uses artistic HTML. I5 is the missing explicit Markdown fallback.                                                                                                                                                         |
| `p02-t05` | partial     | Provider and module resolution remain adapter-owned, adaptive capability fails before core invocation, and exactly one planner seam is accepted. I4 leaves medium guidance out of author requests and the callback reference stale.                                                                                                                                       |
| `p02-t06` | implemented | The eight stale adaptive fixtures now cover all three required HTML artifacts while retaining approval, resume, QA, provenance, error-specific, path, identity, and hash assertions. The focused union passes 125/125.                                                                                                                                                    |
| `p02-t07` | implemented | Current family expectations are exactly `explainer-kit@2.0.2` and `oat-explainer-kit@1.0.3`; deliberate rejection of `2.0.1` adaptive capability and older incompatible cores remains covered.                                                                                                                                                                            |

## Scope and Commit Hygiene

- Task commits are ordered one per task with canonical subjects. The
  root-owned `ac953a8a` commit is bounded to plan, implementation, and state and
  justifiably introduces p02-t06 and p02-t07 after deterministic verification
  failures.
- Canonical skill versions were bumped once each in this PR scope:
  `explainer-kit` to `2.0.2` and `oat-explainer-kit` to `1.0.3`.
- Changed JavaScript modules use same-directory imports; no forbidden parent-
  relative or catch-all import was introduced.
- Bundled-skill changes remain covered by the existing lockstep public-package
  bump in this PR, and supplied release validation passed all five packages.
- No Phase p03 browser-critic execution, correction loop, or publication gate
  leaked into this range. The p02 visual-review schemas are the planned
  contract foundation only.

## Commands and Results

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Result                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `git diff --check b54863f19d5db6df47b1538e791adadaf76f0306..86fc4b6acc737a995783210699cee055e7860a45`                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed with no output.                                                                                                               |
| `git log --reverse --format='%H %s' b54863f19d5db6df47b1538e791adadaf76f0306..86fc4b6acc737a995783210699cee055e7860a45`                                                                                                                                                                                                                                                                                                                                                                                                                 | Eight ordered commits: p02-t01 through p02-t05, bounded root tracking, p02-t06, and p02-t07.                                         |
| `node --test .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs` | Passed 125/125.                                                                                                                      |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed 113/113.                                                                                                                      |
| Targeted contract-completeness probe using `validateContract` and `planExplainerSet`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Demonstrated that a partial review request, a partial passing review result, and a plan omitting one reconciled source all validate. |

Root-supplied broad evidence was corroborated with the current tracking
artifacts: `pnpm check`, lint, format, type-check, build, full tests, focused
tests, and `pnpm release:validate` passed with a clean worktree before this
review artifact was created.

## Recommended Next Step

Run `oat-project-review-receive` to convert I1 through I5 into bounded Phase p02
blocking fix tasks. Keep the fixes in the owning contract/runtime/adapter scope,
rerun the focused 125-test union plus targeted negative tests for each finding,
and do not begin Phase p03 until the blocking review is received and resolved.
