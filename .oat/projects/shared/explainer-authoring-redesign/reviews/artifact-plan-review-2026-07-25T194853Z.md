---
oat_generated: true
oat_generated_at: 2026-07-25T19:48:53Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T19:48:53Z
**Scope:** Third-gate implementation-readiness and upstream-alignment review
**Files reviewed:** 8 project/review artifacts plus targeted repository source, tests, schemas, callers, and release tooling
**Commits:** Not applicable (artifact review of the working-tree post-image)

## Summary

The rewrite genuinely fixes the policy ownership, recipe-version distinction,
manifest-v1 boundary, lifecycle-caller ownership, and QA-severity wording raised
by the latest review. It is still not implementation-ready: the asserted
recipe-consumer inventory is incomplete, several task boundaries cannot leave
the repository green, expansion output paths collide, the artistic-shell trust
boundary remains contradictory, and the interactive approval/QA state machine
is not defined.

**Verdict: BLOCK**

Findings: 0 critical, 8 important, 3 medium, 0 minor

## Findings

### Critical

None

### Important

- **Make the recipe-v2 staging executable through every Phase 1 commit** (`plan.md:163`)
  - Issue: p01-t02 says the format-consumer surface is five
    `recipe.artifacts` sites in `run.mjs` and two in `recipes.test.mjs`, but
    `tests/render.test.mjs` has five additional direct
    `loadRecipe(...).artifacts[0]` reads
    (`.agents/skills/explainer-kit/tests/render.test.mjs:41`,
    `:63`, `:80`, `:158`, `:200`). The v2 model also removes
    `requiredNarrative`, while the transitional runner still consumes it
    throughout authoring/content creation
    (`.agents/skills/explainer-kit/scripts/run.mjs:587-620`,
    `:693-709`). Finally, p01-t03 requires all `briefRef`s to resolve before
    p02-t01 creates any briefs; the current core has no `briefs/` files.
    p02-t01's six-file inventory also omits briefs for the named
    `walkthrough-deck` and `project-page` profiles despite promising one brief
    per profile (`plan.md:217-229`, `:283-304`). Therefore p01-t03 cannot pass
    its declared full-suite verification.
  - Fix: Convert every recipe-shape reader in p01-t02, define an explicit
    transitional accessor or retained field for narrative requirements, and
    create every referenced brief before the v2 recipe commit. If brief
    creation moves out of p02, update the phase dependency/parallel-group
    description accordingly.

- **Complete the v1-retirement inventory and enforce the v2 core boundary** (`plan.md:642`)
  - Issue: p06-t01 deletes author-v1 schemas and runs the full core suite, but
    `tests/schemas.test.mjs` remains scheduled for p06-t03 and currently asserts
    the v1 author schemas (`.agents/skills/explainer-kit/tests/schemas.test.mjs:21-22`);
    `tests/run.integration.test.mjs` constructs v1 author results and is absent
    from every p06 file list
    (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:68-89`).
    The p06-t03 zero-match check will also find omitted live fixtures:
    `tools/smoke/explainer-kit/fixtures/package-root.mjs:195` and four
    `explainer-kit.recipe/v1` entries across the release/RC tests
    (`tools/release/build-explainer-rc.test.mjs:309-317`,
    `tools/release/run-explainer-rc.test.mjs:406`,
    `tools/release/validate-explainer-acceptance.test.mjs:366`). Those RC
    entries are recipe **schema versions**, not `{id, version: "1"}` selector
    pins; `build-explainer-rc.mjs` copies that value into RC identity
    (`tools/release/build-explainer-rc.mjs:203-221`). In addition,
    `oat-wave-program/SKILL.md:140-149` will retain stale “authoring seam
    pending upstream” guidance because the literal-v1 search cannot discover
    it, and the adapter still accepts a 1.0.0 core
    (`.agents/skills/oat-explainer-kit/scripts/run.mjs:15-45`).
  - Fix: Move core schema and run-integration migration into the atomic p06-t01
    cutover; enumerate and stage both smoke files and all release/RC fixtures;
    update both wave skills' author guidance while preserving their recipe
    identity pins; raise the adapter minimum core version to 2.0.0 and add
    rejection coverage for a 1.x core.

- **Define collision-safe rendered paths for expansion sub-pages** (`plan.md:217`)
  - Issue: Reusing manifest type `explainer` is schema-valid, but it does not
    make multiple narrative sub-pages persistable. The current path function
    ignores artifact ID for `explainer`, so every accepted deep-dive or
    per-project page in one run resolves to
    `site/explainers/{slug}/index.html`
    (`.agents/skills/explainer-kit/scripts/lib/render.mjs:256-263`). Multiple
    unique proposal IDs therefore overwrite one another and then violate the
    manifest's duplicate-path cross-record check
    (`.agents/skills/explainer-kit/scripts/lib/contracts.mjs:538-545`).
  - Fix: Specify a stable ID-bearing path rule for expansion explainers, update
    relative/public link generation, and add accepted multi-page tests that
    assert distinct content paths, rendered paths, manifest identities, and hub
    links.
  - Requirement: Content-driven set scaling and frozen manifest-v1 boundary.

- **Resolve trusted shell scripts versus untrusted authored HTML** (`plan.md:444`)
  - Issue: p04-t01 hard-fails script elements while p04-t02 sends complete
    curated shells to the author and p06 accepts the returned complete HTML.
    Every relevant current shell already contains trusted scripts
    (`templates/deck-shell.html:13`, `:223`;
    `templates/diagram-shell.html:159`;
    `templates/engineer-tour.html:225`). An unchanged shell-based result would
    therefore fail the planned validator; allowing its scripts generically
    would violate the safety requirement. The prior trust-boundary finding was
    not resolved.
  - Fix: Choose a concrete assembly boundary: either accept only authored
    extension regions and inject them into a core-owned shell, or permit only
    byte-identical/hash-pinned core shell scripts while rejecting additions and
    mutations. Add a passing fixture for each bundled shell and failing
    insertion/mutation/event-handler cases.
  - Requirement: Artistic-path safety and shell-based authoring.

- **Specify an approval/QA state machine that can show warnings at the interactive gate** (`plan.md:577`)
  - Issue: The plan promises interactive drafts plus accumulated
    editorial/layout warnings, but the current core resolves approval before
    theme, render, and QA (`.agents/skills/explainer-kit/scripts/run.mjs:112-191`),
    and its resume detector requires theme still pending
    (`.agents/skills/explainer-kit/scripts/run.mjs:225-230`). Existing tests
    explicitly assert that no downstream work runs before approval
    (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:141-178`).
    The new QA-severity paragraph partitions failures but does not say which
    stages move, what pending/resume state looks like, or how post-render
    warnings reach the approval surface.
  - Fix: Define the exact interactive-pending, approve/resume, reject, and
    unattended transitions. State when safety validation, render QA, warning
    persistence, and approval occur; update resumability predicates and
    build-record expectations; add run-integration assertions for warnings at
    the pending gate and after resume.
  - Requirement: Guidelines/render-QA warnings in both modes and interactive
    review of accumulated findings.

- **Include the core result assembler in approval-marking surfacing** (`plan.md:609`)
  - Issue: p06-t02 assigns `auto-drafted`/`human-approved` surfacing to the run
    result but lists only `records.mjs` on the core side. The actual run result
    is assembled by `resultFor` in
    `.agents/skills/explainer-kit/scripts/run.mjs:823-845`, which currently
    returns approval status/path only. `records.mjs` cannot add the marking to
    that object, and p06-t02 neither lists nor stages the core runner.
  - Fix: Add the core `scripts/run.mjs` and its run-integration test to
    p06-t02 (or explicitly move result surfacing into p06-t01), assert both
    marking values in core and adapter results, and continue to assert that
    manifest/v1 has no marking property.
  - Requirement: Honest unattended marking without changing manifest/v1.

- **Wire the diagram renderer into the narrative renderer** (`plan.md:418`)
  - Issue: p03-t03 creates only `diagram.mjs` and `diagram.test.mjs`. The
    narrative renderer that must turn fenced diagram AST nodes into inline SVG
    is implemented one task earlier in `render.mjs`; p03-t03 neither modifies
    that file nor its narrative golden tests. Following the declared file list
    leaves the new module disconnected, so the end-to-end architecture-diagram
    criterion cannot pass.
  - Fix: Add `scripts/lib/render.mjs` and
    `tests/narrative-render.test.mjs` to p03-t03, or combine the diagram
    implementation with p03-t02. Verify supported fences render inline SVG and
    unsupported syntax degrades to the specified code-block warning.
  - Requirement: Build-time inline SVG and the recap architecture-diagram
    floor.

- **Refresh provider views after the final canonical skill edits** (`plan.md:669`)
  - Issue: p06-t03 runs `oat sync --scope all`, but p08-t01 subsequently edits
    `explainer-kit/SKILL.md` and p08-t02 changes five canonical skill
    frontmatters. No later task reruns sync or stages `.claude`, `.cursor`,
    `.codex`, and `.oat/sync/manifest.json`, so the final commit leaves
    provider-linked views stale even though release validation is described as
    covering the complete tree.
  - Fix: Move the final provider sync into p08-t02 after all canonical content
    and version edits, stage its generated views/manifest, and run release
    validation only after that synchronization.

### Medium

- **Require effective finite expansion caps in every bundled recipe** (`plan.md:80`)
  - Issue: `maxCount`, `maxArtifacts`, and `maxPerType` are all optional, and
    p01-t03 names profiles without assigning numeric caps. The validator can
    therefore “cover” per-profile/global limits while a bundled recipe declares
    none, allowing an unattended author to propose an unbounded set.
  - Fix: Require at least one effective finite cap for each profile, assign and
    assert concrete bundled-recipe values, define whether floor artifacts count
    toward global caps, and test exact-boundary and over-limit mixed-profile
    cases.

- **Define how callouts and timelines enter the Markdown AST** (`plan.md:363`)
  - Issue: p03-t01 defines CommonMark/GFM plus fenced diagrams, while p03-t02
    requires callout and timeline rendering. No source syntax or AST mapping
    tells the implementer whether these are extensions, derived blockquotes,
    list conventions, or something else. This prior Medium finding remains.
  - Fix: Specify the accepted source syntax and AST node mapping for both, then
    add parser and renderer fixtures; otherwise remove them from the required
    vocabulary and align `design.md`.

- **Make lifecycle-caller wiring behaviorally verifiable** (`plan.md:313`)
  - Issue: The remediation now names both real caller files and the final
    single-bump list, which is correct, but verification is only an `rg` for
    phrases. The repository already has a completion contract test that reads
    `oat-project-complete/SKILL.md`
    (`.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs:19-84`);
    it is not listed, and no assertion covers the implementation-tail closeout
    reference. A prose mention can therefore satisfy the task while omitting a
    concrete callback/module argument or unattended mode.
  - Fix: Add caller-contract assertions for both instruction surfaces,
    requiring the author and critic seams plus `mode: unattended`, and include
    those tests in p02-t02's file/staging/verification scope.

### Minor

None

## Remediation Verification

| Prior remediation                                                 | Result                                    | Evidence                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy-owned expansion profiles and proposal schema               | Substantively fixed                       | Profiles own type/authoring/brief/shell and proposals contain only `id`, `profileId`, and `rationale` (`plan.md:71-112`, `:125-146`). Path and finite-limit gaps remain.                                                                                        |
| Recipe schemaVersion v2 while recipe identity version stays `"1"` | Distinction verified; inventory not fixed | Loader schema constant and recipe identity are separate (`recipes.mjs:3`, `:165-173`), and adapter manifest matching uses identity version (`oat-explainer-kit/scripts/run.mjs:307-313`). Additional format readers/fixtures disprove the three-file inventory. |
| Manifest/v1 freeze, no `page`, no manifest marking                | Fixed                                     | Manifest is closed, permits `hub/diagram/explainer/deck/catalog`, and already requires string warnings (`manifest.schema.json:5-20`, `:92-95`, `:170-196`). The plan now uses `hub`/`explainer` and keeps marking outside it.                                   |
| Real lifecycle callers and both-mode author requirement           | Mostly fixed                              | p02-t02 lists both owning instruction files; p06 extends `E_AUTHOR_REQUIRED` to both modes; p08 lists both skill bumps. Behavioral caller tests and core result marking remain incomplete.                                                                      |
| QA severity split                                                 | Assigned but not fully integrated         | p06-t01 explicitly preserves safety/provenance errors and appends editorial/layout warning IDs (`plan.md:577-600`). Approval ordering and resume behavior remain undefined.                                                                                     |

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`,
`implementation.md`, `state.md`, all three prior plan-review artifacts, and
targeted current runtime/schema/test/caller/release evidence.

### Requirements Coverage

| Requirement / decision                     | Status  | Notes                                                                                                                                          |
| ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Two first-class authoring paths            | partial | Paths are planned, but diagram integration and trusted-shell safety are unresolved.                                                            |
| Prose briefs carry quality                 | partial | Brief protocol exists; creation order and file inventory cannot satisfy p01-t03.                                                               |
| Policy-owned content-driven expansion      | partial | Proposal authority is corrected; rendered-path collisions and optional caps remain.                                                            |
| Guidelines and render QA become warnings   | partial | Severity split is assigned; interactive ordering/resume semantics are absent.                                                                  |
| Auto-drafted versus human-approved marking | partial | Approval-record location is corrected; the listed files cannot surface it in the core result.                                                  |
| Manifest/v1 remains frozen                 | covered | No new type or marking field is planned; warnings use the existing string array.                                                               |
| Recipe schema/identity version distinction | covered | The conceptual distinction is correct and verified in current code.                                                                            |
| Same-release v1 retirement                 | partial | Core tests, RC/smoke fixtures, wave guidance, and adapter compatibility floor are incomplete.                                                  |
| Lifecycle callers own author construction  | partial | Owning files and skill bumps are named; behavioral verification is missing.                                                                    |
| Every task commit remains green            | missing | p01-t03 and p06-t01 are demonstrably red under their declared ordering/file scopes.                                                            |
| Parallel p02/p03/p04 write sets            | covered | The declared files are disjoint. However, p02-t01 briefs are a semantic prerequisite of p01-t03, so the current phase order is not executable. |
| Final release closure                      | partial | It is last and bumps the correct public packages/skills, but provider sync occurs before later canonical edits.                                |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md" ".oat/projects/shared/explainer-authoring-redesign/design.md"
rg -n "recipe\\.artifacts|requiredNarrative|explainer-kit\\.recipe/v1|author-request/v1|author-result/v1" .agents tools apps packages --glob '!packages/cli/assets/**'
pnpm run cli -- project status --project-path ".oat/projects/shared/explainer-authoring-redesign" --json
```

Then rerun the gate-originated artifact plan review.

## Recommended Next Step

Run `oat-project-review-receive` to convert the blocking findings into plan
remediation tasks, then rerun the plan gate.
