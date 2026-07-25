---
oat_generated: true
oat_generated_at: 2026-07-25T20:22:42Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-authoring-redesign
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T20:22:42Z
**Scope:** Fourth-gate implementation-readiness and upstream-alignment review
**Files reviewed:** 5 project/review artifacts, all 4 recipes, and targeted runtime, test, adapter, smoke, and release sources
**Commits:** Not applicable (artifact review of the working-tree post-image)

## Summary

The fourth rewrite closes most prior findings: D1-D6 are now recorded upstream,
briefs precede v2 recipes, the migration-critical recipe readers are covered,
the parallel write sets are disjoint, and the omitted diagram/result/sync/caller
test surfaces are now assigned. The plan is still not implementation-ready:
the relocated gate's literal pending-only resume rule breaks rejected-run
correction, variable expansion state is not defined across an interactive
pause, and the 2.0.0 compatibility/version closure leaves both an inconsistent
intermediate commit and guaranteed smoke-test failures.

**Verdict: BLOCK**

Findings: 0 critical, 3 important, 3 medium, 2 minor

## Findings

### Critical

None

### Important

- **Preserve rejected-run correction when changing the D4 resume predicate** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:615`)
  - Issue: D4 and p06-t01 say the resumability predicate should key on
    approval being `pending`. The existing workflow deliberately resumes both
    pending and rejected records: a rejection is persisted, the operator edits
    the content, and a later approval resumes the same run
    (`.agents/skills/explainer-kit/tests/run.integration.test.mjs:179-223`).
    `loadResumableRun` evaluates persisted state before the new approval
    decision is processed. If implemented literally, a persisted `rejected`
    record is not resumable, contradicting p06-t01's full-suite-green claim and
    removing the correction loop.
  - Fix: Define the predicate as an unresolved approval state (`pending` or
    `rejected`) plus completed render/QA stages, not `pending` alone. Require
    p06-t01's relocated-gate test to cover reject, edit, approve, and same-run
    resume in addition to direct pending-to-approve resume.

- **Define resumable persistence for the variable v2 artifact set** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:650`)
  - Issue: p06-t02 makes the author callback mandatory in both modes and can
    create accepted expansion artifacts before an interactive pause, but it
    does not define how that variable artifact set is rehydrated. Today an
    interactive pending/rejected approval record stores no
    `authorResultPaths`
    (`.agents/skills/explainer-kit/scripts/lib/content-approval.mjs:42-49`),
    while resume hydration obtains paths only from that record and iterates
    only recipe artifacts
    (`.agents/skills/explainer-kit/scripts/run.mjs:261-294`). p01-t05 does not
    add interactive artifact-set persistence, and p06-t02 omits
    `content-approval.mjs` and its tests. A paused expanded run can therefore
    lose expansion identities, HTML/Markdown source paths, author provenance,
    or hub links on resume.
  - Fix: Choose and document a durable source of truth for the accepted set
    (for example, persist all author-result paths and accepted profile
    resolutions in content-approval/v2, or reconstruct them deterministically
    from an explicitly retained record). Add the owning module/tests to
    p06-t02 and verify an interactive run with both Markdown and HTML
    expansions can pause, reject/edit, resume, and produce the same artifact
    IDs, paths, links, hashes, and complete `authorResultPaths` without
    reinvoking the author.

- **Make the 2.0.0 compatibility boundary and final smoke suite atomic** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:764`)
  - Issue: p06-t04 raises the adapter minimum to 2.0.0, but the canonical core
    remains version 1.0.2 until p08-t02, so the source adapter rejects the
    source core between those commits. The p06 file inventory also omits the
    adapter test that Step 4 says will add 1.x rejection coverage and leaves
    shipped adapter guidance claiming a 1.0.0 minimum
    (`.agents/skills/oat-explainer-kit/SKILL.md:36`,
    `:57`). At final closure, p08-t02 changes core/adapter skill versions but
    does not update smoke tests that assert the old values
    (`tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:194-195`;
    `tools/smoke/explainer-kit/packaged-layout.test.mjs:60`, `:87`).
    Because root `pnpm test` always runs `pnpm test:smoke`
    (`package.json:32-33`), p08-t02's declared verification is guaranteed to
    fail.
  - Fix: Move the core 2.0.0 frontmatter transition into the same task as the
    adapter minimum, and include the adapter SKILL text plus explicit
    compatibility test. Assign both smoke tests to the task that changes their
    asserted versions (or replace brittle literals with versions read from the
    candidate), then keep the final sync after all canonical edits.

### Medium

- **Specify how D1 origin reaches both path and link generation** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:422`)
  - Issue: Keying paths on floor versus expansion origin is sound, but neither
    the design data model nor the task defines the internal field/API that
    carries that origin. Current renderer descriptors are exact-key objects
    (`.agents/skills/explainer-kit/scripts/lib/render.mjs:339-355`), and
    `artifactLinks` accepts exactly `id`, `type`, and `label`
    (`:389-405`). An expansion render can receive origin metadata while its
    generated hub link still falls back to the floor path unless the same
    metadata is propagated through both calls to `artifactPath`.
  - Fix: Name the internal contract (for example,
    `origin: "floor" | "expansion"` or a separate required path-context
    argument), define its default for transitional v1 descriptors, and carry
    it into generated links. Keep p03-t02 and p07-t01 assertions for both
    rendered paths and relative/public hub links.

- **Pin the exact shell-script multiset, not only allowlist membership** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:491`)
  - Issue: D3 is a defensible trust boundary, but “every script is
    byte-identical to one allowlisted block” does not by itself reject a
    deleted script, a duplicate of an allowed block, or replacement of one
    allowed block by another. This matters immediately because
    `deck-shell.html` has two distinct core scripts
    (`.agents/skills/explainer-kit/templates/deck-shell.html:13`, `:223`).
    The planned tests cover insertion and mutation but not the stated
    replacement invariant.
  - Fix: Compare an ordered list or counted multiset of script hashes against
    the declared shell, and add missing, duplicated, reordered/replaced, and
    byte-normalization cases. Continue to reject event handlers and external
    active content independently.

- **Define the supported fenced-diagram grammar** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:459`)
  - Issue: Discovery left the diagram vocabulary for design, but design only
    says “mermaid-class” and the plan says “flowchart/graph vocabulary” while
    also requiring a native, dependency-free implementation. There is no
    concrete boundary between syntax that must render and syntax that may
    degrade to a warning, so p03-t03's acceptance result depends on
    implementer choice.
  - Fix: Specify the minimum supported fence grammar and semantics (directions,
    node IDs/labels, edges, and escaping) and name fixtures at that boundary.
    Richer unsupported Mermaid syntax may continue to degrade to the planned
    warning/code block.

### Minor

- **Narrow B3's no-path-churn claim to published paths and identity** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:66`)
  - Issue: The four current recipes confirm the stated floor IDs, types, and
    templates exactly, and D1 preserves every published floor URL. However,
    p06-t02 intentionally stores artistic content as `.html`
    (`plan.md:656`), so `engineer-tour` changes its internal
    `source/content/...` path—and therefore the manifest `contentPath`—from
    today's `.md`. The implementation is defensible; the blanket “No floor
    path ... changes” wording is not.
  - Suggestion: State that rendered URLs, recipe identity, and artifact
    ID/type identity do not churn, while internal source paths may change with
    the v2 authoring format.

- **Correct the guideline-checker integration cross-reference** (`.oat/projects/shared/explainer-authoring-redesign/plan.md:557`)
  - Issue: p05-t01 says run-stage wiring is p06-t03, but QA severity and
    author-stage integration are assigned to p06-t02; p06-t03 is marking
    surfacing.
  - Suggestion: Change the cross-reference to p06-t02 so task ownership is
    unambiguous.

## Prior-Finding Remediation Verification

| Requested structural change                                | Result                                | Evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Briefs precede recipes; `[p02,p03,p04]` remains disjoint   | Closed                                | Eight briefs are p01-t03, recipes are p01-t04, and the three parallel lanes have no shared written file (`plan.md:212-291`, `:888-899`).                                                                                                                                                                                                                                               |
| Complete p01-t02 reader migration                          | Closed for migration-critical readers | Search confirms five runner `recipe.artifacts` sites, two direct recipe-test sites, five render-test sites, and the `requiredNarrative` consumers. The additional matches in `recipes.mjs` are in the same task/file and are already called out by line 132; the run-integration/contracts matches consume the transitional author-request/v1 shape rather than the recipe file shape. |
| B3 exact floors and no identity churn                      | Substantively closed                  | All four current recipes match the floor table exactly. Published paths and recipe/artifact identity remain stable; the internal `engineer-tour` content-path wording needs the Minor clarification above.                                                                                                                                                                             |
| Phase 6 split into four green commits                      | Not closed                            | File allocation is much improved, but rejected resume, variable-set hydration, and the 2.0.0 boundary still violate the green-commit claim.                                                                                                                                                                                                                                            |
| p03-t03 wires diagrams through narrative render            | Closed                                | `render.mjs` and `narrative-render.test.mjs` are both listed, with full-render verification (`plan.md:450-479`).                                                                                                                                                                                                                                                                       |
| Final provider sync after canonical edits                  | Closed                                | p08-t02 reruns sync after p08-t01 and version edits (`plan.md:862-871`). Final smoke fixtures remain a separate blocker.                                                                                                                                                                                                                                                               |
| Caller-contract assertions cover both instruction surfaces | Closed                                | p02-t01 lists the existing completion integration test and requires author, critic, and unattended assertions for both callers (`plan.md:352-362`).                                                                                                                                                                                                                                    |

## D1-D6 Alignment

| Decision                           | Engineering assessment                                                              | Plan reflection                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| D1 role-based expansion paths      | Sound; preserves public URLs while making expansions structurally unique            | Reflected in p03-t02 and p07-t01, with the Medium origin-propagation contract gap above |
| D2 `requiredNarrative` on floor    | Sound; retains machine identity/coverage while moving editorial intent to briefs    | Reflected in p01-t01, p01-t02 accessors, and every p01-t04 floor                        |
| D3 hash-pinned shell scripts       | Sound in principle for complete authored documents                                  | Reflected in p04-t01, but exact-set semantics/tests need the Medium fix above           |
| D4 approval after local render/QA  | Sound; “no external publish/durability before approval” is the meaningful invariant | Reflected in p06-t01, but resume-state semantics remain blocking                        |
| D5 mandatory finite caps           | Sound for unattended boundedness                                                    | Reflected with concrete per-profile and per-recipe values in p01-t04                    |
| D6 GFM alerts and fenced timelines | Sound and implementable                                                             | Reflected in parser and renderer fixtures in p03-t01/p03-t02                            |

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`,
`implementation.md`, the immediately prior plan review, all four current recipe
files, and targeted current runtime/schema/test/adapter/smoke/release sources.
`spec.md` is not present and is optional in this quick workflow.

### Requirements Coverage

| Requirement / decision                       | Status  | Notes                                                                                        |
| -------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Two first-class authoring paths              | planned | Narrative and artistic workstreams plus integration are assigned                             |
| Prose briefs carry quality                   | covered | Eight briefs precede every v2 `briefRef`                                                     |
| Policy-owned bounded expansion               | partial | Profiles/caps are defined; resumable set persistence and origin propagation remain           |
| Guidelines/render QA as warnings             | covered | Severity split and both-mode gate visibility are assigned; one stale cross-reference remains |
| Interactive approval and unattended marking  | partial | Ordering/marking are assigned; rejected and expanded resume semantics remain                 |
| Manifest/v1 remains frozen                   | covered | No new manifest type/marking field is planned                                                |
| Recipe schema v2 with identity version `"1"` | covered | Loader staging and retirement surfaces are separated correctly                               |
| Same-release v1 retirement                   | covered | Core, adapter, wave, smoke, and RC schema consumers are assigned                             |
| Every task commit remains green              | missing | p06-t01 and the p06/p08 compatibility/version boundary are not green as written              |
| Final release closure                        | partial | Final sync is fixed, but the final `pnpm test` has stale exact-version smoke assertions      |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the plan:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/explainer-authoring-redesign/plan.md" ".oat/projects/shared/explainer-authoring-redesign/design.md"
rg -n "recipe\.artifacts|\.artifacts\[|requiredNarrative" .agents/skills/explainer-kit --glob '!**/assets/**'
rg -n "MINIMUM_CORE_VERSION|minimum core version|1\.0\.2|1\.0\.1" .agents/skills/oat-explainer-kit tools/smoke/explainer-kit
node --test .agents/skills/explainer-kit/tests/ .agents/skills/oat-explainer-kit/tests/
pnpm test:smoke
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the three Important findings into
plan/design corrections, address the Medium interface boundaries, and rerun the
plan gate.
