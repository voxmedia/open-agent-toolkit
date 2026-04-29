---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: p03
oat_review_type: code
oat_project: .oat/projects/shared/aws-profile
---

# Code Review: p03 — Wire `archive.awsProfile` + `archive.awsRegion` into `oat config`

**Reviewed:** 2026-04-28
**Scope:** Phase 3 / task p03-t01 — config command surface
**Files reviewed:** 2 (`packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/config/index.test.ts`)
**Commits:** `8ea5bcef..f3570b53` (1 commit: `feat(p03-t01): wire archive.awsProfile + awsRegion into oat config`)

## Verdict

**PASS**

## Summary

The implementation wires `archive.awsProfile` and `archive.awsRegion` into the full `oat config` surface (`ConfigKey` union, `KEY_ORDER`, `CONFIG_CATALOG`, and `setConfigValue`) following the existing archive-key conventions exactly. The set-handler refactor folds both new keys into a shared branch via a `key.slice('archive.'.length)` cast and round-trips cleanly with the p01 `trimNonEmptyString` normalizer (empty input -> `delete archive[subKey]` -> absent on next read -> normalizer drops it). All four pre-existing archive-key handlers (`s3Uri`, `s3SyncOnComplete`, `summaryExportPath`, `wrapUpExportPath`) are untouched. p02/p04 territory (`archive-utils.ts`, `commands/project/archive/index.ts`) is not touched. Lint, type-check, and the full `commands/config/index.test.ts` suite (66 tests, including 11 new) pass.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Catalog ordering vs. KEY_ORDER ordering** (`packages/cli/src/commands/config/index.ts:108-116`, `packages/cli/src/commands/config/index.ts:285-308`)
  - Issue: In `KEY_ORDER`, the new keys are appended after `archive.wrapUpExportPath` (positions 7–8). In `CONFIG_CATALOG`, they are placed after `archive.wrapUpExportPath` as well — internally consistent. However the `ConfigKey` union (line 32-33) lists them alphabetically before `archive.s3SyncOnComplete`. This is a purely cosmetic divergence between three places listing the same set of keys; the union is alphabetic, the others are semantic-grouping. Existing keys already disagree on ordering between the union and `KEY_ORDER` (e.g. `archive.s3SyncOnComplete` vs `archive.s3Uri`), so this matches the established pattern.
  - Suggestion: No action needed — flagged only for awareness.

- **Empty-input behavior diverges from `archive.s3Uri` at the writer** (`packages/cli/src/commands/config/index.ts:879-895`)
  - Issue: `archive.s3Uri` on empty input writes an empty string (`''`) into the JSON; the new keys `delete` the property. From the user's perspective both round-trip to "unset" because the p01 normalizer drops the empty string on read, but the on-disk JSON shape differs between the two branches. This is the chosen behavior per discovery's "Empty-string vs unset" open question and matches the test for "removes archive.awsProfile when set to empty string" (`index.test.ts:1156-1175`).
  - Suggestion: No action needed for this PR. If desired in a future cleanup, `archive.s3Uri` could be aligned to the same delete-on-empty pattern, but that is out of scope for p03.

- **`as keyof typeof archive` cast in result-value computation** (`packages/cli/src/commands/config/index.ts:902-907`)
  - Issue: The result-value branch uses `archive[key.replace('archive.', '') as keyof typeof archive] as string`. For the empty-input case where the key was just `delete`d, this resolves to `undefined` and falls through to `?? null`, which is correct. The cast is pre-existing; the new keys ride along safely because they are typed `string` on `OatArchiveConfig`.
  - Suggestion: No action needed.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (quick-mode workflow; no spec.md / design.md by design).

### Requirements Coverage (per plan p03-t01 Step-2 acceptance)

| Requirement                                                                                         | Status      | Notes                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add `'archive.awsProfile' \| 'archive.awsRegion'` to `ConfigKey` union                              | implemented | `index.ts:32-33`                                                                                                                                 |
| Add both keys to `KEY_ORDER` whitelist                                                              | implemented | `index.ts:115-116`                                                                                                                               |
| Add `CONFIG_CATALOG` entries with `description` + `owningCommand`                                   | implemented | `index.ts:285-308`; both entries include `group`, `file`, `scope`, `type`, `defaultValue: 'unset'`, `mutability`, `description`                  |
| `set` handler: trim, empty -> delete, non-empty -> assign                                           | implemented | `index.ts:887-895`                                                                                                                               |
| Existing `s3Uri` / `s3SyncOnComplete` / `summaryExportPath` / `wrapUpExportPath` handlers untouched | implemented | `index.ts:879-886` unchanged versus prior commit                                                                                                 |
| `oat config describe archive.awsProfile` works (pretty + JSON)                                      | implemented | Tests `index.test.ts:1196-1230` (pretty), `index.test.ts:1212-1230` (JSON)                                                                       |
| `oat config describe archive.awsRegion` works                                                       | implemented | Test `index.test.ts:1232-1245`                                                                                                                   |
| Both keys appear in `oat config list` whitelisted-keys output                                       | implemented | Test `index.test.ts:1247-1267`                                                                                                                   |
| Both keys readable via `oat config get`                                                             | implemented | Tests `index.test.ts:1269-1300` (extra coverage beyond plan, useful)                                                                             |
| Round-trip clean with p01 `trimNonEmptyString` normalizer                                           | verified    | `oat-config.ts:193-199, 302-309` confirms: deleted key -> absent in JSON -> normalizer returns undefined -> `OatArchiveConfig` field stays unset |

### Out-of-Scope Files

Verified the diff touched only the two target files:

```
packages/cli/src/commands/config/index.test.ts
packages/cli/src/commands/config/index.ts
```

No accidental changes to `archive-utils.ts` (p02), `commands/project/archive/index.ts` (p04), `oat-config.ts` (p01), or `resolve.ts` (p01). Constraint satisfied.

### Extra Work (not in declared requirements)

- Two extra tests (`gets archive.awsProfile from shared config via get` / `gets archive.awsRegion from shared config via get`, `index.test.ts:1287-1320`) beyond the plan's Step-1 list. These are useful coverage of the read path through the resolved config; not scope creep, just defensive coverage.
- Added a "trims surrounding whitespace from archive.awsProfile" test (`index.test.ts:1140-1153`). The plan listed empty-string handling but not whitespace-only; the test reinforces the normalizer contract at the set-handler boundary. Beneficial.

## Verification Commands

```bash
# Confirm the diff scope
git diff --stat 8ea5bcef..f3570b53
# Expected: only packages/cli/src/commands/config/index.{ts,test.ts}

# Run config command tests
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts
# Expected: 66 tests passed (including the 11 new "archive.awsProfile + archive.awsRegion" cases)

# Lint + type-check the package
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
# Expected: 0 errors, 0 warnings

# Manual smoke (optional)
node packages/cli/dist/index.js config describe archive.awsProfile
node packages/cli/dist/index.js config describe archive.awsRegion --json
```

All commands above executed during this review and returned the expected results:

- Diff stat: 2 files, +231 lines, 0 deletions — only the two intended files.
- Vitest: `Test Files 1 passed (1) | Tests 66 passed (66)` in 71 ms.
- Lint: `Found 0 warnings and 0 errors` across 373 files.
- Type-check: clean.

## Recommended Next Step

Run the `oat-project-review-receive` skill to record the pass disposition and unblock p04 sequencing. No fix tasks are required.
