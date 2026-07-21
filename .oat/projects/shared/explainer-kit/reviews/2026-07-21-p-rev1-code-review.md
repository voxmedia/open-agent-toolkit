---
oat_generated: true
oat_generated_at: 2026-07-21T02:05:46Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/orca/workspaces/open-agent-toolkit/explainer-kit/.oat/projects/shared/explainer-kit
---

# Code Review: p-rev1

**Reviewed:** 2026-07-21T02:05:46Z  
**Scope:** Revision 1 implementation and bounded root evidence,
`9204742be899b9f133a9e99be56215798083f2a4..fde97026`  
**Primary task commits:** `4f456a91`, `8708f4d3`, `d8dec777`, `0895a8c0`,
`5f7206bd`  
**Files in authoritative diff:** 58

## Summary

Revision 1 correctly strengthens immutable byte coverage, preserves canonical
object-hash semantics, ships and validates the four curated styles, normalizes
Codex TOML without changing multiline values, and advances the public release
set to `0.2.10`. It does not pass final review because the public OAT config CLI
cannot resolve the new `style` key, the OAT adapter cannot carry the newly
mandatory author seam, and source-copy QA can miss a verbatim section.

Findings: 2 critical, 1 important, 0 medium, 0 minor.

**Verdict: fail.** The project threshold requires zero Critical, Important, and
Medium findings. Run a fix loop for C1, C2, and I1, then repeat the full
Revision 1 review and release evidence.

## Findings

### Critical

- **C1 — The public config CLI rejects the style key required by the adapter**
  (`packages/cli/src/commands/config/index.ts:103`)
  - Issue: `resolveExplainerConfig` unconditionally asks `oat config get
explainers.defaults.style --json`, but `ConfigKey`, `KEY_ORDER`, and the
    config catalog omit that key (`index.ts:88-146`, `index.ts:204-226`).
    Running `pnpm run cli -- config get explainers.defaults.style --json` at
    the reviewed HEAD returns `Unknown config key:
explainers.defaults.style`. A normal adapter invocation therefore fails
    during config resolution before it can build a request, and operators
    cannot configure the curated style through the documented public surface.
    The same catalog still describes `palette=neutral` and
    `visualProfile=clean` as defaults (`index.ts:517-539`) even though
    `resolve.ts:58-62` now defaults them to `null` and defaults `style` to
    `clean-neutral`.
  - Fix: add `explainers.defaults.style` to the public config key type, ordering,
    catalog, get/set scope handling, validation, and tests. Update the legacy
    palette/profile catalog entries to their actual null/deprecated behavior.
    Add an integration test that lets the adapter use its real CLI-backed
    `getConfig` rather than injecting a test double.
  - Requirement: `prev1-t03`; named curated style as the default public front
    door with legacy compatibility.

- **C2 — The OAT adapter cannot supply the mandatory unattended author**
  (`.agents/skills/oat-explainer-kit/scripts/run.mjs:18`)
  - Issue: the core now correctly fails every unattended run without
    `options.author`, but `runOatExplainer` accepts only `critic`,
    `criticModulePath`, and an in-process `coreOptions` escape hatch
    (`run.mjs:18-38`, `run.mjs:111-121`). Its official JSON CLI merely forwards
    parsed context (`run.mjs:250-258`), so a JSON `authorModulePath` is ignored
    and JSON cannot encode `coreOptions.author`. The independent adapter
    integration test now fails 1/10 at
    `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs:287`:
    expected `built-not-durable`, received `failed`. A direct author-module
    probe returned `E_AUTHOR_REQUIRED`. The packaged smoke remains green only
    because its fixture builds a separate runner that imports the author and
    injects `coreOptions.author`
    (`tools/smoke/explainer-kit/fixtures/package-root.mjs:220-242`), bypassing
    the adapter's JSON boundary.
  - Fix: make `author` and `authorModulePath` first-class adapter inputs, enforce
    exactly one author seam, validate/import the module at the adapter
    boundary, and pass it to `core.runExplainer`. Document the seam in the
    adapter skill and replace the smoke workaround with coverage of the
    official adapter CLI. Update the existing actual-core adapter integration
    test to supply an author module and add no-author/invalid/conflicting-author
    cases.
  - Requirement: `prev1-t02`; unattended author propagation through in-process
    and JSON/CLI adapter paths.

### Important

- **I1 — Whole-artifact overlap scoring misses a verbatim dumped section**
  (`.agents/skills/explainer-kit/scripts/lib/qa.mjs:26`)
  - Issue: `checkSourceDumping` divides matched shingles by every shingle in the
    concatenated authored artifact (`qa.mjs:33-46`), and `run.mjs:624-632`
    concatenates all section prose before calling it. One copied section is
    therefore diluted by unrelated prose in the other sections. A probe with
    one verbatim source section and five original sections returned
    `{"valid":true,"issues":[]}`. The integration fixture only copies the same
    source prose into every section
    (`run.integration.test.mjs:397-418`), so it does not exercise the W6-shaped
    regression where one section contains a raw artifact dump. The comparison
    corpus is also limited to reconciled claim text, not an explicit raw-source
    corpus, which leaves supplied or summarized fact bases unable to enforce
    the stated raw-artifact check.
  - Fix: score every authored section independently against the retained raw
    source corpus (and optionally retain an aggregate check), reporting the
    offending section/source. Add boundary tests with one dumped section among
    multiple legitimate sections and define how raw source text is retained or
    supplied without exposing secrets.
  - Requirement: `prev1-t02` Step 3 and Revision 1 success criterion “Content QA
    rejects obvious source dumping.”

### Medium

None.

### Minor

None.

## Requirements and Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, `references/revision-1-discovery.md`,
`references/w6-recap-defects-handoff-2026-07-20.md`,
`references/default-theme-feedback.md`,
`references/revision-1-w6-acceptance.md`, the four retained theme previews,
the authoritative git diff, implementation code, schemas, tests, smoke
harnesses, provider sync inventory, and release validation.

| Revision requirement                          | Status                            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete immutable package and archive safety | Implemented                       | Manifest coverage includes request, fact base, approval, author records, content, theme, and built artifacts; strict validation and post-copy byte verification passed. Canonical `factBaseHash`/theme identity remain canonical-object hashes, while `immutableHashes` and artifact hashes remain serialized-byte hashes. Traversal, symlink escape, legacy-manifest, mutation, and delete-after-verification tests passed. |
| Mandatory authored unattended content         | Missing at adapter boundary       | Core contracts, exact ordering, provenance retention, core CLI module loading, fail-closed behavior, and interactive compatibility pass; C2 blocks OAT lifecycle use.                                                                                                                                                                                                                                                        |
| Raw-source-copy QA                            | Partial                           | Gross whole-artifact dumping is rejected, but I1 misses a single dumped section.                                                                                                                                                                                                                                                                                                                                             |
| Four curated styles and compatibility         | Partial                           | Four distinct bundles, precedence, resolved provenance, navigation, responsive/reduced-motion checks, and legacy core compatibility pass; C1 blocks the public OAT style config surface.                                                                                                                                                                                                                                     |
| Codex TOML indentation                        | Implemented                       | Full CLI tests cover left alignment, parsed semantic equality, multiline preservation, and idempotency.                                                                                                                                                                                                                                                                                                                      |
| Release/package evidence                      | Implemented with gate blind spots | All five packages validate at `0.2.10`; canonical skills are `explainer-kit@1.0.2` and `oat-explainer-kit@1.0.1`; provider links/sync and packaged smoke pass. C1/C2 are not exercised by those green gates.                                                                                                                                                                                                                 |

### Extra Work

None identified outside the declared Revision 1 and bounded release/bookkeeping
scope.

## Independent Verification

Passed:

```bash
node --test .agents/skills/explainer-kit/tests/schemas.test.mjs \
  .agents/skills/explainer-kit/tests/contracts.test.mjs \
  .agents/skills/explainer-kit/tests/content-approval.test.mjs \
  .agents/skills/explainer-kit/tests/qa.test.mjs \
  .agents/skills/explainer-kit/tests/theme.test.mjs \
  .agents/skills/explainer-kit/tests/templates.test.mjs \
  .agents/skills/explainer-kit/tests/render.test.mjs \
  .agents/skills/explainer-kit/tests/visual-matrix.test.mjs \
  .agents/skills/explainer-kit/tests/run.integration.test.mjs \
  .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs
pnpm --filter @open-agent-toolkit/cli test -- \
  archive-utils.test.ts config-merge.test.ts sync-extension.test.ts \
  oat-config.test.ts resolve.test.ts
node --test tools/smoke/explainer-kit/packaged-layout.test.mjs \
  tools/smoke/explainer-kit/wrapper-compatibility.test.mjs
pnpm format
pnpm lint
pnpm type-check
pnpm release:validate
```

Observed results: 97/97 focused core/config tests passed; the CLI suite passed
3,277/3,277 tests; packaged smoke passed 6/6; static gates passed; all five
`0.2.10` tarballs and 65 visual measurements passed.

Failed or exposed incorrect behavior:

```bash
node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
pnpm run cli -- config get explainers.defaults.style --json
```

The adapter integration suite failed 1/10 because the actual core returned
`failed`; the config command rejected the style key. A source-copy boundary
probe also returned valid for one dumped section among five original sections.

## Required Fix Loop

1. Expose `explainers.defaults.style` through the real config CLI and test the
   adapter without an injected config resolver.
2. Propagate a provider-neutral author callback/module through the official OAT
   adapter API and JSON CLI; remove the smoke-only bypass.
3. Make source-copy QA section-sensitive and test the single-section W6
   regression.
4. Re-run the failed adapter/config checks, focused Revision 1 tests,
   `pnpm test`, `pnpm release:validate`, packaged candidate smoke, and the
   retained W6 first-consumer acceptance before re-review.
