---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260818-extend-guarded-prose-contract.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260818-extend-guarded-prose-contract
oat_issue_url: null
created: '2026-08-31T00:01:21Z'
---

# Guard docs-app mirrors of contract-tested skill prose

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** Preserve the useful docs explanation and apply
> the same semantic guard to its mirror. Do not convert this focused gap into a
> general documentation deduplication project.

## Outcome

A guarded semantic contract in an explainer-kit reference cannot drift in its
docs-app mirror unnoticed. The current publication-receipt rule is asserted
against both copies through one reusable contract, and a negative fixture
proves the docs copy is genuinely covered.

## Source and live evidence

- Source backlog item:
  [BL-260818-extend-guarded-prose-contract — Extend guarded-prose tests to docs-app mirrors](../../pjm/backlog/items/BL-260818-extend-guarded-prose-contract.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/explainer-kit/tests/contracts.test.mjs:767-776` reads only
    `references/extension-contract.md` for the complete receipt-v2 / immutable
    v1-replay contract.
  - `.agents/skills/explainer-kit/references/extension-contract.md:65-79`
    contains the corrected canonical guidance.
  - `apps/oat-docs/docs/workflows/skills/explainer-kit.md:432-445` contains a
    useful prose mirror of the same publication boundary.
  - [PR #196](https://github.com/voxmedia/open-agent-toolkit/pull/196) landed
    the corrected publication/verification contract, but the test still cannot
    detect a regression isolated to the docs mirror.
  - The focused command
    `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs` passed
    49 tests on the planning baseline, demonstrating current green state but
    not mirror coverage.

## Dependencies

| Type                  | Dependency                                                                                  | Required state                                                                            | Current state                    |
| --------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| Soft evidence         | PR #196 publication contract                                                                | Preserve receipt-v2 completeness and immutable v1 replay semantics.                       | Merged and present on baseline.  |
| Related, not blocking | [BL-260714-executable-backstops](../../pjm/backlog/items/BL-260714-executable-backstops.md) | Coordinate wording if both execute together; neither implementation depends on the other. | Separately planned in this wave. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                         | Required update                                                        |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections. | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted. |
| `review-plan-workflow` (draft PR #190) merges                                        | No               | None.                                                   | None.                                                                  |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/references/extension-contract.md apps/oat-docs/docs/workflows/skills/explainer-kit.md apps/oat-docs/index.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

If the docs passage was replaced by a canonical cross-link or the contract no
longer has a mirror, refresh the inventory and do not recreate duplication.

## Repository conventions

- Do not hand-edit `apps/oat-docs/index.md`; regenerate it only when docs nav or
  indexed content requires it.
- Run `pnpm lint && pnpm format` because `.agents/skills` test code is touched.
- A test under `.agents/skills` and any docs-app change are bundled assets, so
  bump all five public packages together and update `pnpm-lock.yaml`.
- No canonical `SKILL.md` edit is planned; do not bump the explainer-kit skill
  version unless implementation changes that file.
- Run the focused Node test independently, then the complete Definition of Done.
- Do not push or open a PR unless instructed.

## Scope

### In scope

- `.agents/skills/explainer-kit/tests/contracts.test.mjs` — reusable guarded
  publication-prose assertion and mirror matrix.
- Current explainer-kit reference/docs mirror mapping.
- The docs mirror only if a minimal wording or explicit source cross-link is
  necessary to make ownership clear.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Rewriting the explainer-kit publication contract.
- Removing useful user-facing docs merely to reduce test work.
- A repository-wide mirror detector for all skills and docs.
- Broad guarded-prose authoring policy, owned by
  `BL-260714-executable-backstops`.

## Current state

The source and docs mirror are both currently correct, but only the source is
loaded by the contract test. A one-copy regression therefore stays green.
Keep the current duplicated explanation because it is useful at the docs
reading point; make the duplication explicit and test both copies with the same
semantic assertion.

## Implementation steps

### 1. Inventory the focused guarded passage and its mirror

Within `contracts.test.mjs`, record the canonical reference path and current
docs-app mirror path as a small named matrix. Confirm both passages express:

- current `publish-receipt/v2` consumption;
- complete manifest evidence (the docs mirror at `explainer-kit.md:434-441`
  names receipt completeness and manifest artifacts but not catalog evidence;
  either narrow the shared matrix to that common set or scope an explicit docs
  edit that adds the catalog requirement and names the canonical owner);
- immutable/read-only `publish-receipt/v1` replay; and
- rejection of the obsolete “complete `PublishReceiptV1`” claim.

Do not infer mirrors from phrase similarity across the whole repository.

**Verify:** the matrix contains both current paths and no unrelated docs page.

### 2. Extract one semantic assertion and apply it to both copies

Refactor the existing test into a helper that accepts prose plus a source
label. Apply it independently to the reference and docs mirror. Preserve the
existing semantic patterns and improve failure labels so a regression names
the drifting copy.

If the docs passage needs an ownership marker, add only a concise source link;
do not duplicate test syntax or internal paths in user-facing prose.

**Verify:** temporarily place the forbidden v1-completeness phrase in only the
docs fixture/copy and observe the focused test fail with the docs label.

### 3. Add a permanent negative contract case

Add a synthetic negative string or helper-level fixture containing the
forbidden phrase while retaining all positive tokens. Assert the helper rejects
it. This prevents a vacuous mirror loop that merely reads both files.

Restore tracked prose after any manual red/green mutation.

**Verify:** the negative case fails if the forbidden-phrase assertion is
removed, and the complete focused suite passes when restored.

### 4. Apply release bookkeeping and complete gates

Bump the five public packages together, update `pnpm-lock.yaml`, and run the
repository Definition of Done in order. Regenerate the docs index only if the
docs change actually affects its generated inputs.

## Test plan

- `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`.
- A docs-only negative mutation preserving positive receipt tokens.
- A helper-level permanent negative case to prove non-vacuity.
- `pnpm lint`, `pnpm format`, docs checks/build, and complete release gates.

## Done criteria

- [ ] One semantic helper guards both the reference and docs mirror.
- [ ] Failures identify which copy drifted.
- [ ] A docs-only forbidden phrase makes the focused suite fail.
- [ ] Receipt-v2 completeness and immutable v1 replay remain unchanged.
- [ ] No unnecessary skill-version bump or docs-index hand edit occurs.
- [ ] Five public package versions and all gates are correct.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the source and docs passages no longer express the same contract;
- a broader mirror inventory is required to define correctness;
- preserving the docs copy would create conflicting normative owners;
- the negative case can pass after the guard is removed;
- a named verification gate fails twice after one bounded correction; or
- implementation requires changing explainer publication behavior.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, PR #196, the
canonical reference, docs mirror, and focused contract test when main advances
materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, either passage or
its ownership changes, another PR adds mirror coverage, or the current gap
cannot be reproduced. Refresh or supersede stale mappings before execution.

## Review focus

- Confirm the same helper evaluates both copies independently.
- Inspect the negative case for vacuity.
- Preserve publication semantics and useful docs context.
- Reject repository-wide mirror inference or unrelated prose cleanup.
