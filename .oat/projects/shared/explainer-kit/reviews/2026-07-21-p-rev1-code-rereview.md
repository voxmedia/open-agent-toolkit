---
oat_generated: true
oat_generated_at: 2026-07-21T03:14:37Z
oat_review_scope: p-rev1-rereview
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-kit
---

# Code Re-review: p-rev1

**Reviewed:** 2026-07-21T03:14:37Z
**Scope:** Revision 1 after the required C1/C2/I1 fix loop
**Files reviewed:** 64
**Commits:** 16
**Range:** `9204742be899b9f133a9e99be56215798083f2a4..283600e82e071eb2471657e37182dd97abbf5185`

## Summary

C1 and the original I1 are resolved, and the substantive C2 propagation work
now passes the real adapter CLI, actual-core, packaged-layout, and persistence
checks. C2 is not fully resolved because an unattended call with neither
`author` nor `authorModulePath` is allowed past the adapter boundary and fails
only after the core has initialized a run. The implementation also leaves the
project design materially stale relative to the Revision 1 author and curated
style contracts.

Findings: 0 critical, 1 important, 1 medium, 1 minor

**Verdict: fail.** Revision 1 does not meet the required zero Critical,
Important, and Medium threshold.

## Prior-Finding Dispositions

| Prior finding                            | Disposition        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 — Public curated-style config         | Resolved           | `explainers.defaults.style` is present in the CLI key union, ordering, catalog, scope checks, enum validation, layered resolver, and docs. Direct `get`/`describe` probes returned `clean-neutral` from `default`; 290 focused CLI config tests passed; the adapter's real CLI-backed style integration passed. Legacy palette/profile values remain accepted, default to `null`/unset, and are described and warned as deprecated. |
| C2 — OAT adapter author seam             | Partially resolved | Direct `author` and JSON-safe `authorModulePath` are first-class, conflicting seams and invalid modules reject, official `--context` propagation and actual-core execution pass, callbacks/module paths stay out of `run-request.json`, and packaged smoke no longer injects `coreOptions.author`. M1 remains: zero seams are not rejected at the adapter boundary for unattended mode.                                             |
| I1 — Whole-artifact source-copy dilution | Resolved           | `createAuthoredContent` passes each section independently to `checkSourceDumping` and compares only against reconciled fact-base claim texts. Unit and actual-core integration tests reject one copied section despite unrelated prose and accept concise factual prose.                                                                                                                                                            |

## Findings

### Critical

None.

### Important

- **I2 — Revision 1 left the authoritative design artifact materially stale**
  (`.oat/projects/shared/explainer-kit/design.md:550`)
  - Issue: the design's config surface still exposes only palette/profile with
    built-ins `neutral`/`clean` (`design.md:550-561`), its theme selection and
    provenance models omit `style` (`design.md:708-715`,
    `design.md:781-787`), and its contract-kind list omits the new author
    request/result contracts (`design.md:283-290`). Those statements conflict
    with the shipped curated-style front door and mandatory structured author
    seam. The revision discovery and plan describe the new behavior, but
    `plan.md` continues to cite `design.md` as the project design, so future
    implementation and review work receives contradictory architecture.
  - Fix: align the design's component responsibilities, contract-kind list,
    author request/result interfaces, theme selection/provenance models,
    config table/precedence, and requirement-to-test mapping with Revision 1.
    Preserve palette/profile as explicitly deprecated compatibility fields.

### Medium

- **M1 — The adapter enforces at most one author seam, not exactly one for unattended runs**
  (`.agents/skills/oat-explainer-kit/scripts/run.mjs:166`)
  - Issue: when both `author` and `authorModulePath` are absent,
    `resolveLifecycleAuthor` returns `null` (`run.mjs:166-168`) and
    `runOatExplainer` invokes the core without an author (`run.mjs:118-129`).
    The integration test confirms that this initializes the actual core and
    returns its failed `E_AUTHOR_REQUIRED` result
    (`.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs:395-415`).
    This contradicts the completed task's requirement to resolve exactly one
    seam at the adapter boundary (`plan.md:1975-1986`) and the lifecycle
    contract that every unattended adapter run provides exactly one
    (`references/lifecycle-contract.md:74-85`). The test titled "rejects
    missing" covers a nonexistent module path, not an omitted seam
    (`run.integration.test.mjs:351-393`).
  - Fix: make author cardinality validation mode-aware: reject zero or two
    seams before invoking the core for `unattended`, while allowing zero for
    `interactive`. Add an omitted-seam adapter rejection test and keep the
    core's independent no-author failure test in the core integration suite.

### Minor

- **m1 — The prior review artifact contains trailing whitespace**
  (`.oat/projects/shared/explainer-kit/reviews/2026-07-21-p-rev1-code-review.md:12`)
  - Issue: the range-wide `git diff --check` reports trailing whitespace at
    lines 12, 14, and 16 of the prior review artifact. No code or runtime file
    is affected.
  - Suggestion: remove the Markdown hard-break spaces when the review artifact
    is next touched.

## Requirements/Design Alignment

**Evidence sources used:** `AGENTS.md`, `.agents/agents/oat-reviewer.md`,
`spec.md`, `design.md`, `plan.md`, `implementation.md`,
`references/revision-1-discovery.md`,
`references/revision-1-w6-acceptance.md`, and
`reviews/2026-07-21-p-rev1-code-review.md`; plus the authoritative range's
implementation, schemas, tests, public docs, provider views, release metadata,
and smoke fixtures.

### Revision 1 Coverage

| Revision requirement                                | Status      | Notes                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete immutable recap package and archive safety | Implemented | Byte hashes cover request, approval, fact-base JSON/Markdown, author results, content, resolved theme, and built artifacts. Canonical object hashes remain distinct. Archive omission/tamper/traversal/symlink tests pass.               |
| Mandatory authored unattended content               | Partial     | Core and valid adapter paths are implemented and fail closed; M1 leaves the declared exactly-one adapter-boundary precondition incomplete.                                                                                               |
| Per-section raw-source-copy QA                      | Implemented | One dumped section is rejected without dilution; concise factual prose passes.                                                                                                                                                           |
| Four curated styles and compatibility               | Implemented | Style inventory, precedence, real CLI config, legacy compatibility, visual/deck QA, and warnings pass.                                                                                                                                   |
| Codex TOML indentation normalization                | Implemented | Semantic equality, multiline preservation, left alignment, and idempotency tests pass.                                                                                                                                                   |
| Release/package and provider-view parity            | Implemented | Both canonical skill versions were bumped; all five public packages are `0.2.10`; Claude provider views are canonical symlinks; sync metadata is current; public package and visual release validation passes.                           |
| Acceptance evidence integrity                       | Implemented | The acceptance candidate commit `aa74980f` is the exact code parent of bookkeeping-only HEAD `283600e8`; recorded package/version/style/immutable-path identities align with the reviewed implementation and independent release checks. |

### Extra Work

None identified outside the declared Revision 1, required fix loop, and bounded
release/bookkeeping scope.

## Independent Verification

Passed:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/config/index.test.ts \
  src/config/oat-config.test.ts \
  src/config/resolve.test.ts

node --test \
  .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs \
  tools/smoke/explainer-kit/packaged-layout.test.mjs

node --test \
  .agents/skills/explainer-kit/tests/qa.test.mjs \
  .agents/skills/explainer-kit/tests/run.integration.test.mjs

node --test \
  .agents/skills/explainer-kit/tests/contracts.test.mjs \
  .agents/skills/explainer-kit/tests/theme.test.mjs \
  .agents/skills/explainer-kit/tests/templates.test.mjs \
  .agents/skills/explainer-kit/tests/render.test.mjs \
  .agents/skills/explainer-kit/tests/visual-matrix.test.mjs

pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/archive/archive-utils.test.ts \
  src/providers/codex/codec/config-merge.test.ts \
  src/providers/codex/codec/sync-extension.test.ts

pnpm run cli -- config get explainers.defaults.style --json
pnpm run cli -- config describe explainers.defaults.style --json
pnpm run cli -- config describe explainers.defaults.palette --json

pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm release:validate
```

The focused suites passed 477 tests. The full repository gate passed 3,284 CLI
tests, 113 other package tests, and 129 smoke tests. Release validation passed
all five public packages and all 65 visual measurements.

Expected non-pass:

```bash
git diff --check \
  9204742be899b9f133a9e99be56215798083f2a4..283600e8
```

This reports only m1's three trailing-whitespace lines in the prior review
artifact.

## Recommended Next Step

Run the required fix loop for I2 and M1, remove m1 opportunistically, then
repeat the narrowed re-review. Do not mark `p-rev1` passed until the Critical,
Important, and Medium counts are all zero.
