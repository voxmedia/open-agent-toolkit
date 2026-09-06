---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260827-override-aware-remedy-text.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260827-override-aware-remedy-text
oat_issue_url: null
created: '2026-08-30T23:40:20Z'
---

# Make asset-bundle errors aware of explicit overrides

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!CAUTION]
> **Execution status: BLOCKED. Do not import or execute this plan** until
> [Reject structurally incomplete CLI asset bundles](./2026-08-30-validate-assets-bundle-structure.md)
> is merged into the execution baseline, or has completed earlier in the same
> explicitly ordered tracked project with its focused tests green. Revalidate
> all asset failure branches after that condition is satisfied.

## Outcome

Every fail-closed asset-root error gives a remedy appropriate to its source.
Packaged-root failures retain rebuild/reinstall guidance; failures under an
explicit `OAT_ASSETS_DIR` tell the operator to inspect that override and point
it at a complete bundle for the running CLI, without implying a package rebuild
will repair the supplied path.

## Source and live evidence

- Source backlog item:
  [BL-260827-override-aware-remedy-text — Override-aware remedy text in assets-root fail-closed errors](../../pjm/backlog/items/BL-260827-override-aware-remedy-text.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/fs/assets.ts:88-90` already distinguishes a non-empty
    explicit override from the packaged default.
  - `packages/cli/src/fs/assets.ts:35-66` appends reinstall/rebuild remedies for
    missing, invalid, and version-mismatched metadata regardless of source.
  - `packages/cli/src/fs/assets.ts:92-105` reports missing override roots with
    `pnpm build` guidance and reports a wrong-type root without a source-aware
    remedy.
  - `packages/cli/src/fs/assets.test.ts:90-137` proves fail-closed override
    behavior but does not assert source-appropriate guidance.
  - [DR-260827-keep-plan-mandated-error](../decisions/DR-260827-keep-plan-mandated-error.md)
    deliberately preserved the prior messages and filed this follow-up rather
    than widening the predecessor implementation.

## Dependencies

| Type        | Dependency                                                                                                                                                                                                                                       | Required state                                                                                                                                       | Current state                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Hard        | [BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only OAT_ASSETS_DIR bundles](../../pjm/backlog/items/BL-260827-fail-closed-on-partial-or.md) and its [external plan](./2026-08-30-validate-assets-bundle-structure.md) | Structural validation is merged to the execution baseline, or completed earlier in the same ordered tracked project with focused assets tests green. | Plan written; not implemented on the planned baseline. |
| Hard policy | [DR-260827-keep-plan-mandated-error](../decisions/DR-260827-keep-plan-mandated-error.md)                                                                                                                                                         | Preserve packaged-root guidance while changing the explicitly deferred override branch.                                                              | Accepted.                                              |

The first hard dependency is unsatisfied, so execution remains blocked.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                         | Required update                                                        |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections. | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted. |
| `review-plan-workflow` (draft PR #190) merges                                        | No               | None.                                                   | None.                                                                  |

## Drift check

After satisfying the hard dependency and before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/fs/assets.ts packages/cli/src/fs/assets.test.ts packages/cli/scripts/bundle-assets.sh packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

Confirm the structural error introduced by the predecessor is included in the
source-aware remedy design. Missing that branch is a STOP condition.

## Repository conventions

- Build: `pnpm build` → workspace build and bundled assets succeed.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → every
  packaged/override failure pair passes.
- Lint/format check: `pnpm check` → repository checks pass.
- Implementation pattern: preserve `CliError` exit code 2 and never fall back
  from an invalid explicit override to packaged assets.
- Git/PR convention: shipped CLI behavior is release-shaped; the lockstep bump
  is owned by the wave fan-in in lane mode (see Scope), or batched into the
  predecessor's one release bump in standalone mode; do not push or open a PR
  unless instructed.

## Scope

### In scope

- `packages/cli/src/fs/assets.ts` — carry packaged/override source into all root
  and bundle validation errors through one shared remedy formatter.
- `packages/cli/src/fs/assets.test.ts` — paired assertions for missing root,
  wrong-type root, missing/invalid metadata, version mismatch, and missing
  required directory.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Weakening any directory, metadata, schema, structure, or version check.
- Falling back to packaged assets after an explicit override fails.
- Changing asset-root precedence or relative-path resolution.
- Adding file inventory/checksum validation.
- Rewording unrelated CLI diagnostics.

## Current state

`resolveAssetsRoot` computes the override discriminator, but discards it after
choosing `assetsRoot`. `validateAssetsBundle` therefore cannot tailor its
remedy, and the outer missing-root branch always recommends `pnpm build`.
Direct validator calls also need a backward-compatible packaged/default source
so existing callers and tests retain their current behavior.

The implementation should have one source-aware remedy function, not repeated
inline conditionals. Override guidance must identify `OAT_ASSETS_DIR` and the
required complete/version-matching bundle. Packaged guidance should retain the
existing rebuild/reinstall direction as closely as possible.

## Implementation steps

### 1. Carry asset-root source through validation

Add a small internal source type (`packaged` or `override`) and one remedy
formatter. Derive the source once from the trimmed environment value in
`resolveAssetsRoot`. Pass it into bundle validation through a backward-compatible
optional argument whose default is `packaged` for direct callers.

Use the formatter for root missing, root wrong-type, metadata missing, metadata
invalid, version mismatch, and the predecessor's structural failure. Keep each
diagnostic's factual prefix and exit code stable; vary only the actionable
remedy suffix.

**Verify:** `pnpm --filter @open-agent-toolkit/cli type-check` → existing
zero/one/two-argument call sites remain valid.

### 2. Define the two remedy contracts

For packaged roots, retain the current semantic guidance to rebuild or
reinstall the CLI. For explicit roots, use one deterministic sentence such as:
`Check OAT_ASSETS_DIR and point it to a complete asset bundle built for this CLI version.`

Do not mention `pnpm build` or package reinstall as the override remedy. Do not
hide the offending path or expected/actual version details.

**Verify:** source-level tests assert the packaged and override suffixes differ
while their factual error family and exit code remain the same.

### 3. Test every paired failure family

Extend `assets.test.ts` with a table covering both sources for:

- missing root;
- root is a file;
- metadata missing;
- metadata invalid shape/JSON;
- version mismatch; and
- required top-level directory missing or wrong type.

Assert explicit errors mention `OAT_ASSETS_DIR` and exclude the packaged remedy;
assert default/direct-validator errors retain rebuild/reinstall guidance.
Preserve complete-bundle success tests.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → all
paired rows execute and pass.

### 4. Run the mode's gates

**Lane mode (default under the execution program):** run the focused tests
above, then `pnpm check`, `pnpm type-check`, and `pnpm run check:skill-bumps`
with captured exit codes. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in owns
the lockstep bump and the full definition-of-done sequence. **Standalone mode
only:** bump the five public packages above freshly fetched `origin/main` and
run the eight AGENTS.md gates in order.
When this plan is batched directly after the structural plan in one
standalone PR, preserve exactly one final lockstep bump for the combined diff.

**Verify:** each named command with its own captured exit code → all exit 0;
and from `packages/cli`, `pnpm exec vitest run src/fs/assets.test.ts` → the
focused assets suite executes (no `cache hit, replaying logs`).

## Test plan

- Use the existing injected environment seam; never mutate ambient process
  state where a direct object suffices.
- Pair all six packaged/override failure families.
- Verify exact discriminator/remedy semantics and stable factual prefixes.
- Retain success, blank-override fallback, and relative-override tests.
- Run focused assets tests, full tests, build, release validation, and docs build.

## Done criteria

- [ ] Explicit-root failures tell the operator to check `OAT_ASSETS_DIR`.
- [ ] Explicit-root failures do not recommend a package rebuild as the remedy.
- [ ] Packaged-root failures retain rebuild/reinstall guidance.
- [ ] All fail-closed families, including structural validation, are covered.
- [ ] Paths, expected/actual versions, and exit code 2 remain observable.
- [ ] No validation or fallback rule weakened.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the structural-validation dependency is not satisfied and revalidated;
- import or execution is attempted while `oat_execution_status` is `BLOCKED`;
- a new asset failure branch cannot determine packaged versus override source;
- changing the remedy would weaken validation or introduce fallback;
- implementation requires a public schema/API change rather than an internal
  optional context; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidation is mandatory when the hard dependency lands. Compare this plan
with current `origin/main`, both backlog items, both external plans, the linked
decision, every failure branch in `assets.ts`, and focused tests. Revalidate
again when substantial time passes, main advances materially, cited contracts
or intent change, another PR implements part of the outcome, or a load-bearing
claim cannot be reproduced.

Update or supersede this plan and change its execution status only after the
exact hard-dependency state is verified.

## Review focus

- Check all failure branches use one source discriminator and formatter.
- Verify override guidance is actionable without suggesting fallback.
- Confirm the predecessor's new structural branch is included.
- Confirm a combined PR carries only one final release bump.
