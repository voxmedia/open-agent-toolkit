---
oat_generated: true
oat_generated_at: 2026-07-17T19:13:24Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-kit
---

# Artifact Review: plan

**Reviewed:** 2026-07-17T19:13:24Z
**Scope:** `plan.md` against the spec-driven upstream specification and design
**Files reviewed:** 3 (`plan.md`, `spec.md`, `design.md`)

## Summary

The five-phase plan is substantially complete, sequential, release-policy aware, and aligned with the archive, publishing, lifecycle, packaging, and RC-stage acceptance boundaries. Before implementation starts, it needs four P0 traceability/seam clarifications plus correction of its contradictory review status; three design scenarios also need explicit task-level verification.

Findings: 0 critical, 4 important, 3 medium, 1 minor

## Findings

### Critical

None

### Important

- **The plan marks its artifact review passed despite recording that the gate produced no review** (`plan.md:46`)
  - Issue: The same plan records the timed-out gate as an active blocker (`plan.md:5-6`) but checks “Plan artifact review passed” and records the plan review row as `passed` with no artifact (`plan.md:1601`). This makes readiness state and review provenance internally contradictory.
  - Fix: Keep the checklist and Reviews row pending until this review is received. When accepted, record the actual review artifact path/status and clear the blocker through the normal review-receive/planning workflow.

- **The strict schema task omits the versioned durability-evidence request contract** (`plan.md:104`)
  - Issue: Task p01-t02 creates schemas for run request, fact base, theme, manifest, build record, publish request, and publish receipt, but not `DurabilityEvidenceRequestV1`. The design defines that external versioned request at `design.md:717-731`, and FR5 depends on caller-submitted evidence being validated before the core attests durability.
  - Fix: Add a `durability-evidence.schema.json` deliverable to p01-t02, include its schema ID/closed-shape cases in `schemas.test.mjs`, and include that contract kind in p01-t06 runtime/cross-record validation.
  - Requirement: FR5

- **The rendering task drops `renderStrategy` at the core renderer seam** (`plan.md:534`)
  - Issue: The plan correctly says `renderStrategy` belongs in the normalized request/build record and not in resolved-theme identity (`plan.md:451-452`), but p02-t06 defines `renderArtifact({ recipeArtifact, content, theme, publicBaseUrl })` without a separate strategy input. The upstream design also says the build record persists the choice (`design.md:418-422`) while its displayed `BuildRecordV1` shape omits the field (`design.md:891-915`), leaving implementers without one consistent contract.
  - Fix: Add `renderStrategy` as an explicit renderer input and require p01-t02/p02-t04 tests to prove it is persisted in the request/build record while remaining absent from `ResolvedThemeV1` and its `bundleHash`. Align the displayed design model at the same time.
  - Requirement: FR4

- **The plan ingests critic results but never explicitly executes the required adversarial pass** (`plan.md:366`)
  - Issue: FR2 requires federated/raw-source runs to run an adversarial contradiction pass. P02-t02 only plans “critic-result ingestion,” and p02-t09 composes a generic fact-base stage without requiring or testing that the critic actually runs; classification fixtures alone can pass while the production orchestration silently skips the pass.
  - Fix: Assign provider-neutral critic execution to p02-t02 or p02-t09, document how its result enters the fact-base processor, and add an integration assertion that federated runs execute the pass while supplied fact bases receive only the specified lightweight consistency/freshness check.
  - Requirement: FR2

### Medium

- **Local-project archive exclusion lacks an explicit completion/export test** (`plan.md:959`)
  - Issue: P03-t01 tests shared/local active roots, but p03-t07 and p03-t08 do not explicitly verify that local-scope projects never invoke recap export/archive and remain `built-not-durable` without publish evidence. This is a concrete FR8/design boundary, not merely implied by the shared archive command.
  - Fix: Add a local-project case to p03-t08’s completion integration test (or p03-t07’s archive boundary tests) asserting no tracked recap export, no archive argument, and the correct untracked durability posture.
  - Requirement: FR8

- **The QA task omits the design’s cross-set cohesion checks** (`plan.md:564`)
  - Issue: P02-t07 covers structure, accessibility, browser behavior, and leaks, but not the required cross-set terminology, number, and status cohesion checks from `design.md:439-441`. Without a task or test, independently generated artifacts can disagree while all listed QA passes.
  - Fix: Add cohesion validation and positive/negative fixtures to p02-t07, with explicit assertions for inconsistent terminology, numeric claims, and statuses across an artifact set.

- **The bounded unknown-size discovery rule is not assigned to a task** (`plan.md:631`)
  - Issue: The design limits unknown-size discovery to two consecutive no-new-findings rounds plus a recipe maximum (`design.md:447-448`, `design.md:1127-1128`), but neither recipe configuration nor core orchestration tasks mention or verify those limits. The omission risks unbounded agent/browser work and makes the design’s resource control non-actionable.
  - Fix: Add recipe-level discovery limits in p02-t03, enforce them in p02-t09, and test both the two-round stop condition and hard maximum.

### Minor

- **Several commit steps stage directories broader than their declared task files** (`plan.md:139`)
  - Issue: Commands such as `git add .agents/skills/explainer-kit` can include unrelated or later-task work, weakening the plan’s otherwise atomic task/commit boundaries.
  - Suggestion: Stage the exact files declared by each task (or an equally narrow pathspec), especially where many sequential tasks modify the same skill directory.

## Spec/Design Alignment

**Evidence sources used:** `plan.md` (artifact under review), `spec.md` and `design.md` (required upstream artifacts). `discovery.md` and the unstarted `implementation.md` scaffold were consulted only as context.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                                                                                             |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | covered | P01-t02/p01-t06 and p02-t01/p02-t09/p02-t10 establish strict explicit inputs, config-free runs, and recovery; p04-t06 verifies packaged execution.                                                |
| FR2         | partial | P02-t02/p02-t09 cover supplied/federated processing and contradiction data, but do not explicitly execute/test the adversarial critic pass.                                                       |
| FR3         | covered | P02-t03 defines both canonical recipes, six recap sections, parameterized roles, and the optional engineer tour; p02-t09 composes execution.                                                      |
| FR4         | partial | P02-t04/p02-t05/p02-t06/p04-t02 cover themes and visual QA, but p02-t06 omits the separate `renderStrategy` input and the upstream build-record shape is ambiguous.                               |
| FR5         | partial | P02-t01/p02-t08/p03-t05/p03-t07/p03-t09 cover records, two-commit evidence, export, and re-attestation, but the versioned durability-evidence schema is absent.                                   |
| FR6         | covered | P04-t01 and p05-t03 cover corresponding roots, unique sentinel, additive/idempotent upload, verification, receipt, and live acceptance.                                                           |
| FR7         | covered | P01-t03 and p03-t01 cover all ten typed keys, scopes, defaults, source precedence, CLI awareness, and adapter cross-field validation.                                                             |
| FR8         | partial | Canonical roots, exact tracked recap export, staging/atomic rename, destination rejection, failed packages, and explainer exclusion are covered; local-project non-export lacks an explicit test. |
| FR9         | covered | P01-t04 and p03-t03/p03-t04/p03-t06/p03-t08 cover state, precedence, ask-once behavior, autonomous policy, and lifecycle call sites.                                                              |
| FR10        | covered | P03-t04/p03-t06/p03-t08 cover mandatory autonomous attempts, tri-state/non-blocking outcomes, preserved completion, and human-gated publishing.                                                   |
| FR11        | covered | P01-t01/p01-t05 and p04-t05/p04-t06 cover pack placement, compatibility failures, guidance, bundled assets, and installed-layout execution.                                                       |
| FR12        | covered | P04-t03 creates the compatibility fixture/runbook; p05-t02 records the operator-owned private-wrapper E2E against the frozen RC.                                                                  |
| FR13        | covered | P02-t05/p02-t07/p04-t02/p04-t04 cover neutral production assets, external examples, leak fixtures, render QA, and attribution.                                                                    |
| FR14        | covered | P04-t07/p04-t08/p04-t09 create RC/evidence tooling; Phase 5 performs both external gates only against one frozen RC and blocks promotion on failure.                                              |
| NFR1        | covered | Config-blind core, installed-root asset resolution, provider-neutral processing, and packaged empty-environment tests are assigned.                                                               |
| NFR2        | covered | Contract/path/redaction validation, escaped templates, argv-safe subprocesses, credential-chain use, leak checks, and credential-free acceptance records are assigned.                            |
| NFR3        | covered | Theme contrast, self-contained templates, structural checks, browser overflow/clipping, reduced motion, keyboard behavior, and visual matrix tests are assigned.                                  |
| NFR4        | covered | Atomic records, canonical hashes, durability evidence, rebuildability spot checks, and the 0.4.1 operational-wisdom trace are assigned.                                                           |
| NFR5        | covered | Stage outcomes, retained intermediates, non-durable classification, non-blocking recap failure, summary visibility, and recovery guidance are assigned.                                           |
| NFR6        | covered | P04-t05 carries one PR-scoped bump per changed skill, all five lockstep package bumps, full workspace checks, and `pnpm release:validate` before RC creation.                                     |

### Extra Work (not in requirements)

- None. The optional engineer-tour recipe is expressly allowed by FR3, and the retained-RC builder/runner/validator tasks are bounded support required to make FR14’s unchanged-packaged-candidate gates reproducible.

## Verification Commands

Run these after updating the planning artifacts:

```bash
pnpm exec oxfmt --check .oat/projects/shared/explainer-kit/plan.md .oat/projects/shared/explainer-kit/spec.md .oat/projects/shared/explainer-kit/design.md
rg -n "durability-evidence|renderStrategy|adversarial|local.*export|cohesion|no-new-findings|artifact \\| passed" .oat/projects/shared/explainer-kit/{plan,spec,design}.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan/artifact-alignment tasks before implementation begins.

## Dispatch

Dispatch: role=reviewer provider=cursor model=gpt-5.6-sol-high effort=not-applicable provenance=launcher-selected/config-declared ceiling=high capped=false selection=matrix-pinned runtimeIdentity=not-reported
