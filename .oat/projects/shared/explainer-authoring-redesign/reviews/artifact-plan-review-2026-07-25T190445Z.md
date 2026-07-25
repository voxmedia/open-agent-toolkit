---
oat_generated: true
oat_generated_at: 2026-07-25T19:04:45Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
oat_gate_headless: true
oat_gate_run_id: d6f1c700-4175-4607-80df-e43e25c517df
oat_gate_target: cursor-gpt-5-6-sol-max
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-max
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T19:04:45Z
**Scope:** Implementation plan readiness and upstream alignment for the quick-mode project
**Files reviewed:** 5 project artifacts plus targeted repository evidence
**Commits:** Not applicable (artifact review)

## Review Scope

**Primary artifact:** `.oat/projects/shared/explainer-authoring-redesign/plan.md`
**Upstream artifacts:** `discovery.md`, `design.md`
**Supporting evidence:** `state.md`, `implementation.md`, current explainer-kit contracts, runtime, templates, callers, and tests
**Workflow mode:** quick
**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. Its omission is permitted; no explicit ceiling rows were evaluated.
**Gate route:** inline (runtime=cursor, cliRoot=`/Users/thomas.stang/Code/vox/open-agent-toolkit`)

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

## Summary

The revised plan closes the prior review's stated gaps, but five remaining contract and sequencing problems still make it unsafe to implement as written. The blocking findings concern expansion routing and persistence, the trusted-shell script boundary, approval/QA state ordering, manifest marking, and an incomplete atomic v1-to-v2 migration.

Findings: 0 critical, 5 important, 3 medium, 0 minor

## Findings

### Critical

None

### Important

- **Make expansion types, authoring routes, and output paths recipe-owned and persistable** (`plan.md:54-59`)
  - Issue: `proposedArtifacts[]` lets the author choose both `type` and `authoring`, while proposal validation is defined only against `expansion.allowedTypes` and limits (`plan.md:87-102`). That contradicts the upstream decision that the artifact type/recipe selects the rendering path. The bundled recipe rewrite also introduces a `page` type (`plan.md:123-130`), but the current recipe and renderer vocabulary is `hub|diagram|explainer|deck` (`.agents/skills/explainer-kit/scripts/lib/recipes.mjs:30`, `.agents/skills/explainer-kit/scripts/lib/render.mjs:7-18`), and the unchanged manifest schema does not admit `page` (`.agents/skills/explainer-kit/schemas/manifest.schema.json:170-196`). Multiple `hub` artifacts are not an implicit substitute because they currently resolve to the same `site/initiatives/{slug}/index.html` path (`.agents/skills/explainer-kit/scripts/lib/render.mjs:256-263`).
  - Fix: Define one canonical artifact-type vocabulary and a recipe-owned mapping from each allowed expansion type to authoring mode, shell/template, brief, and collision-safe output path. Derive routing from that mapping rather than trusting proposal `authoring`; validate proposal IDs against floor IDs and each other; add contract and end-to-end cases for an accepted additional page.
  - Requirement: Discovery decisions 1 and 9; Design components 2, 3, 4, and 7.

- **Separate trusted shell behavior from untrusted agent-authored HTML** (`plan.md:326-362`)
  - Issue: p04-t01 hard-fails every `<script>` element, while p04-t02 sends the curated shell to the author and expects the response HTML to remain a complete artifact document. Every current artistic shell contains trusted scripts; for example, `deck-shell.html` has bootstrap and navigation scripts (`.agents/skills/explainer-kit/templates/deck-shell.html:13-15`, `.agents/skills/explainer-kit/templates/deck-shell.html:223-264`), and `engineer-tour.html` has its interaction script (`.agents/skills/explainer-kit/templates/engineer-tour.html:225-259`). An unchanged shell-based response therefore fails the proposed validator, while permitting arbitrary scripts would violate the safety requirement.
  - Fix: Specify the trust boundary explicitly: either accept only author-controlled extension regions and assemble them into a core-owned shell, or allow only byte-identical/hash-pinned trusted shell scripts while rejecting additions and mutations. Add passing fixtures for every bundled shell plus failing fixtures for inserted or modified scripts and event handlers.
  - Requirement: Discovery decisions 3 and 4; agent-HTML safety constraint.

- **Define the approval/QA state machine so warnings can reach the interactive gate without becoming failures** (`plan.md:378-464`)
  - Issue: p05 defines floor and render-QA findings as post-render warnings, and p06 promises that interactive users pause with drafts plus accumulated warnings. The current pipeline resolves content approval before theme, render, and QA (`.agents/skills/explainer-kit/scripts/run.mjs:112-119`, `.agents/skills/explainer-kit/scripts/run.mjs:122-191`), and the QA stage converts any issue into `E_QA`; source-dump editorial feedback is also a hard failure today (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:409-453`). The plan lists `run.mjs` in p06 but never defines the required stage reordering, warning propagation, pending/resume behavior, or an integration test for it.
  - Fix: Add an explicit pipeline transition contract and tests for unattended, interactive-pending, and interactive-resume paths. State when authored content is rendered, when safety hard-fails, when editorial/layout findings are appended to build-record and manifest warnings, what the approval response exposes, and how a resumed v1 approval record avoids repeating or skipping stages.
  - Requirement: Discovery decisions 2, 5, 7, and 8; Design components 5, 6, and 8.

- **Give `auto-drafted` a valid manifest representation** (`plan.md:473-490`)
  - Issue: p06-t02 says the marking is surfaced through the run result and manifest context, but its file list omits both `run.mjs` (where `manifestFor` is assembled) and `manifest.schema.json`. The current manifest is closed to unknown properties and has no approval/marking field (`.agents/skills/explainer-kit/schemas/manifest.schema.json:5-20`, `.agents/skills/explainer-kit/schemas/manifest.schema.json:65-95`); `manifestFor` likewise emits no marking (`.agents/skills/explainer-kit/scripts/run.mjs:536-567`). Changing only `records.mjs` cannot make a marked manifest valid or make catalogs filterable by marking.
  - Fix: Resolve the design ambiguity and name the exact representation. If the manifest carries the value directly, add the schema, assembly, contract, adapter, and compatibility tests (with an explicit versioning decision). If it references the approval record instead, define that stable reference and prove downstream consumers can read and filter it; align `design.md` and the plan wording accordingly.
  - Requirement: Discovery decision 8; Design component 8.

- **Make the v1-to-v2 cutover pass at each commit and reject incompatible installed cores** (`plan.md:433-527`)
  - Issue: p06-t01 switches `run.mjs` to v2, deletes v1 schemas, and requires the full core suite plus an accepted-expansion fixture, but it neither lists nor stages the core `tests/run.integration.test.mjs`, which currently constructs and asserts v1 requests/results (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:68-89`, `.agents/skills/explainer-kit/tests/run.integration.test.mjs:360-406`). Deferring that migration to p06-t03 means p06-t01 cannot satisfy its own verification. The adapter also still declares a minimum installed core of `1.0.0` (`.agents/skills/oat-explainer-kit/scripts/run.mjs:15-45`), and no task explicitly raises that floor when the adapter starts requiring v2, so it may accept an incompatible v1 core.
  - Fix: Move the core integration migration and accepted-expansion fixture into p06-t01's exact file/staging scope. In p06-t02 (or the same atomic cutover), raise the adapter compatibility floor to `2.0.0`, update its user guidance and integration fixtures, and test rejection of a 1.x core. Keep p06-t03 for remaining external/canonical consumers after the core commit is independently green.
  - Requirement: Design author-contract migration and same-release consumer cutover.

### Medium

- **Specify and assert finite expansion limits for every bundled recipe** (`plan.md:80-102`)
  - Issue: The contract makes `maxArtifacts` and `maxPerType` optional, and p01-t03 names allowed types without selecting or asserting any numeric limits. An unattended author can therefore produce an unbounded proposal set even though the design requires “sane limits.”
  - Fix: Choose finite per-recipe total and per-type caps, define whether floor artifacts count toward them, and assert boundary, over-limit, and mixed-type cases in `recipes.test.mjs`.

- **Verify the automated completion caller, not only the adapter and core record helper** (`plan.md:210-227`)
  - Issue: The plan promises that completion-chain recaps are always unattended and receive a constructed author callback, but p02 changes only adapter guidance and p06-t02 verifies only the core `records.test.mjs`. The actual final-closeout contract invokes the adapter and explicitly requires a critic but does not yet require an author or pin run mode (`.agents/skills/oat-project-implement/references/completion-and-closeout.md:744-753`).
  - Fix: Include the owning completion contract (and its contract test) or document why the adapter alone is authoritative, then add an adapter/caller integration assertion that completion cannot select interactive mode and supplies the v2 author seam.

- **Define how callouts and timelines enter the Markdown AST** (`plan.md:238-280`)
  - Issue: p03-t01 defines CommonMark/GFM plus fenced diagrams, while p03-t02 requires callout and timeline nodes. No syntax-to-AST rule or fixture tells the implementer whether these are extensions, blockquote/list conventions, or derived presentation.
  - Fix: Specify the supported source syntax and AST mapping for both block types, or remove them from the required block vocabulary and align `design.md`; add parser and renderer fixtures for the chosen contract.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, plus targeted current contract/runtime/template/caller/test evidence.

### Requirements Coverage

| Requirement / decision                     | Status  | Notes                                                                                     |
| ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| Two first-class authoring paths            | partial | Both paths are phased, but trusted shell scripts conflict with the artistic validator.    |
| Prose briefs carry quality                 | covered | p02 creates recipe briefs and adapter author-construction guidance.                       |
| Floor plus content-driven expansion        | partial | The proposal protocol exists, but routing, page persistence, and finite limits do not.    |
| Guidelines become manifest warnings        | partial | Warning producers are planned, but pipeline propagation and approval ordering are absent. |
| Render QA in every mode                    | partial | Probe work is planned; its non-blocking run-state integration is underspecified.          |
| Auto-drafted versus human-approved marking | partial | Approval v2 is planned, but the manifest cannot represent the marking.                    |
| Same-release v1 clean break                | partial | The core cutover commit cannot pass its listed tests, and the adapter accepts v1 cores.   |
| Automated completion is unattended         | partial | Guidance is planned, but the owning caller and integration verification are not scoped.   |
| Rich deterministic Markdown rendering      | partial | Core GFM blocks are covered; callout and timeline source semantics remain undefined.      |
| Repository release guardrails              | covered | The final task now owns skill/package versioning and release validation.                  |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md"
pnpm run cli -- project status --project-path ".oat/projects/shared/explainer-authoring-redesign" --json
```

Then rerun the gate-originated artifact plan review.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the five blocking Important findings and three Medium findings into plan-fix work, then rerun the plan gate.
