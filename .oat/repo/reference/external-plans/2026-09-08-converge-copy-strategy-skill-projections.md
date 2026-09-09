---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260908-make-copy-strategy-skill.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-make-copy-strategy-skill
oat_issue_url: null
created: '2026-09-08T21:20:00Z'
---

# Converge copy-strategy skill projections so a synced copy reads in sync

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The one ordering
> constraint is soft: `BL-260908-align-the-provider-view-json` edits the same
> `skill-view-diagnostic.ts` and `manifest-and-drift.md`, and it has no plan in
> wave 7 (`external_plans: []`), so nothing here waits on it. No wave-7 sibling
> plan writes any file this plan writes.

## Outcome

After `oat sync --scope project` materializes a copy-strategy skill directory,
`oat status` reports it `in_sync` and exits 0, and every later
`oat sync --dry-run` plans nothing for it instead of another `update_copy`.
The engine's OAT-managed banner and `.oat-generated` sentinel stop being read as
content drift: both the sync planner and the drift detector compare a managed
directory copy through the same banner-and-sentinel-aware hash the retirement
classifier already uses, so the value they compare against is exactly the
canonical directory hash the manifest already records. No manifest format
changes and no re-sync is required — manifests written by earlier CLI versions
converge on the first read. The `oat tools info` diagnostic loses its
`unrepairableCopy` apology branch and offers a repair that actually repairs, and
`manifest-and-drift.md` loses its "Known limitation: copy-strategy skill views"
section because the limitation is gone.

## Source and live evidence

- Source backlog item:
  [BL-260908-make-copy-strategy-skill — Make copy-strategy skill projections converge after sync instead of reading as drifted](../../pjm/backlog/items/BL-260908-make-copy-strategy-skill.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`, rebased onto `origin/main`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip (PR #273 merged), which is also the merge-base with `HEAD`.
  Between `c9f2e147a` (the draft's baseline) and this `HEAD`, no file this plan
  reads or writes changed (`git diff --stat` over the in-scope set is empty).
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty apart from
  the wave-7 plan files under `.oat/repo/reference/external-plans/` and their
  source backlog items.
- Verified evidence (all reproduced at this `HEAD`, on the built CLI at
  `packages/cli/dist/index.js`, version `0.2.66`, in a `mktemp -d` scratch
  repository with `.oat/sync/config.json` `defaultStrategy: "copy"` and one
  canonical skill `.agents/skills/demo-skill`):
  - **The loop is real.** `oat sync --scope project` applied
    `create_copy demo-skill`, then `oat status --scope project --json` reported
    `{"status":"drifted","reason":"modified"}` with `summary.drifted: 1` and
    exit code 1, and `oat sync --scope project --dry-run` planned
    `update_copy claude/demo-skill (copied content differs from canonical
content)`. Running the real (non-dry-run) sync again applies `update_copy`
    and the very next `--dry-run` plans `update_copy` again. The loop does not
    terminate.
  - **The exact numbers.** In that scratch repo the canonical directory hash and
    the manifest `contentHash` were both
    `0c59d7bb1ec0362147283705c5f9695bd48f1870d485ad6d04d30552dc939fc2`; the raw
    provider directory hash was
    `4fbd9b56dc95ceb8f130194cfe7effe9bb053e0935d7f66ee007ec09d631b566`. The
    provider tree held exactly two files: `SKILL.md` (banner-prefixed) and
    `.oat-generated`. (The digests depend on the fixture content; the equality
    and inequality are what matter.)
  - **Where the manifest hash comes from.**
    `packages/cli/src/engine/execute-plan.ts:318-326` — the directory branch of
    `create_copy`/`update_copy` runs `copyDirectoryImpl`, then `applyCopyMarker`
    (`:211-232`, which writes the sentinel and inserts the banner), and only
    then calls `toManifestEntry(planEntry, 'copy')` (`:173-198`), whose
    `contentHash` for a directory is
    `computeContentHash(resolve(entry.canonical.canonicalPath), false)` — the
    **canonical** tree, without banner or sentinel.
  - **Where the detector reads it back.** `packages/cli/src/drift/detector.ts:106`
    computes `computeContentHash(providerPath, entry.isFile)` — the **provider**
    tree, _with_ banner and sentinel — so the equality at `:107` can never hold
    for a directory copy. The transformed-hash fallback at `:115-124` is gated
    on `copyTransform && entry.isFile`, so a directory projection never reaches
    it and falls through to `drifted:modified` at `:126-129`. (The backlog item
    cites `:106-128`; the branch actually ends at `:129`.)
  - **Where the planner re-plans it.**
    `packages/cli/src/engine/compute-plan.ts:543-565` (`classifyOperation`,
    copy branch) compares `canonicalHash` against
    `computeContentHash(providerPath, canonicalEntry.isFile)` — the same raw
    provider tree — and returns `update_copy` whenever they differ. This is the
    surface the backlog item does not name, and it is what makes `--dry-run`
    loop forever.
  - **The fix already exists in the repository.**
    `packages/cli/src/engine/compute-plan.ts:288-370`,
    `computeManagedDirectoryCopyHash(providerPath, canonicalPath, contentType)`,
    is a private helper used only by `classifyObsoleteMappingRetirement`
    (`:453-467`). It requires the sentinel to equal
    `` `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->\n` `` exactly, excludes
    the sentinel from the file list, strips exactly that marker line from
    `SKILL.md`/`AGENT.md`, and otherwise hashes byte-for-byte with the same
    algorithm as `computeDirectoryHash` (`packages/cli/src/manifest/hash.ts:66-107`:
    sorted `relative` path, `\0`, content, `\0`, sha256). That algorithm,
    reimplemented against the scratch repo's provider tree, produced
    `0c59d7bb…` — **byte-identical to the canonical hash and to the manifest
    `contentHash`**. Reusing it is therefore a convergence, not a new hash
    format.
  - **The sentinel match is an exact string on an absolute path.**
    `applyCopyMarker` passes `entry.canonical.canonicalPath` — the absolute path
    the scanner built with `join(contentDir, name)`
    (`packages/cli/src/engine/scanner.ts:300`) — to `writeDirectorySentinel`
    and `insertMarker` (`packages/cli/src/engine/markers.ts:7-9,16-36`), so the
    sentinel in the scratch repo reads
    `<!-- OAT-managed: do not edit directly. Source: /private/var/…/.agents/skills/demo-skill -->`.
    The manifest stores that path relative to `inferScopeRoot(...)`
    (`execute-plan.ts:148-171`), and the two readers rebuild the absolute form
    with `resolve(scopeRoot, entry.canonicalPath)` (`detector.ts:32`;
    `compute-plan.ts:377` in the retirement classifier). The helper therefore
    returns a digest only when the reader's `scopeRoot` is the same string the
    scanner used at sync time; otherwise it returns `null` and the reader keeps
    its raw comparison (drifted, never a false `in_sync`). The existing
    retirement test at `compute-plan.test.ts:373-414` relies on exactly this
    equality and passes, so it is established behavior, not a new assumption.
  - **Only directories are affected.** A file copy either goes through
    `renderedContent` (hashed with `computeStringHash`, `execute-plan.ts:180-181`)
    or through `copySingleFile` verbatim (`:313-317`); `applyCopyMarker` runs
    only in the directory `else` branch at `:318-324`. So a `copy` **file** view
    already converges and needs no change.
  - **The diagnostic apologises at runtime.**
    `packages/cli/src/drift/skill-view-diagnostic.ts:522-538` defines
    `unrepairableCopy`; `:544-548` substitutes a detail naming
    `BL-260908-make-copy-strategy-skill`; `:573-576` suppresses the
    `oat sync --scope <scope>` suggestion. `packages/cli/src/commands/tools/info/skill-views.ts:515`
    is what would otherwise print `    Repair: …`.
  - **The tests that pin the defect.**
    `packages/cli/src/drift/skill-view-diagnostic.test.ts:620-662` ("offers no
    repair for a drifted copy whose version still matches canonical") and
    `packages/cli/src/commands/tools/info/skill-view-convergence.integration.test.ts:225-277`
    ("reads a projected copy view version past the OAT-managed banner", which
    asserts `viewClass: 'modified'`, `driftState.reason: 'modified'`,
    `suggestion: null`, and `stdout` without `Repair:`). The integration file's
    module comment at `:38-43` states the limitation as pre-existing engine
    behavior. Both files pass at this `HEAD` (run 2026-09-08 together with
    `detector.test.ts`, `compute-plan.test.ts`: 105 tests green), which is why
    every convergence assertion in the Test plan is red on this tree.
  - **Fixture-fidelity finding.** The unit test at
    `skill-view-diagnostic.test.ts:620-662` builds its fixture with
    `isFile: true` (`:630`), but the condition it models occurs **only** for
    directory copies. That fixture encodes a state the engine never produces.
    It is deleted by this plan rather than corrected.
  - **The doc that states the limitation.**
    `apps/oat-docs/docs/provider-sync/manifest-and-drift.md:98` (the `modified`
    bullet's "A `copy` view also reaches this class through the known limitation
    below" clause) and `:176-190` (the whole "### Known limitation: copy-strategy
    skill views" section).
  - **No other consumer is affected.** `detectDrift` has four call sites:
    `commands/status/index.ts:1067` (passes a `copyTransform`),
    `commands/providers/list/list.ts:308` and
    `commands/providers/inspect/inspect.ts:228` (pass one when the mapping has
    a transform), and `commands/tools/info/index.ts:88` (passes none; reached
    through `skill-views.ts:397`). Because the banner and sentinel are
    engine-owned rather than adapter-owned, the new directory branch must
    **not** be gated on `copyTransform`, or `oat tools info` would keep
    diverging from `oat status`.
  - `packages/cli/assets/**` is a build output, ignored by
    `.gitignore:25` (`packages/cli/assets/*`); only `apps/oat-docs/docs/**` is
    edited by hand.

## Dependencies

| Type             | Dependency                                                                                                  | Required state                                                                                                                                                       | Current state                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Soft adjacency   | [BL-260908-align-the-provider-view-json](../../pjm/backlog/items/BL-260908-align-the-provider-view-json.md) | Never edited in the same lane; it also rewrites `skill-view-diagnostic.ts` and `manifest-and-drift.md`.                                                              | Open, priority `low`, `external_plans: []` — **not scheduled in wave 7**. No coordination needed.               |
| Soft adjacency   | [Fix the sync apply failure summary](./2026-09-08-fix-sync-apply-failure-summary.md)                        | Reads `engine/compute-plan.ts` and `engine/execute-plan.ts` as evidence but writes only `commands/sync/apply.ts` and `commands/sync/index.test.ts`; no shared write. | READY in wave 7. May run in the same group; re-run `src/engine` tests after integration either way.             |
| Satisfied        | PR #273 (remote project management)                                                                         | Merged before this lane starts.                                                                                                                                      | Merged 2026-09-08 (`7d70ac307`); touches none of this plan's files.                                             |
| Soft integration | Draft PR #190 (ReviewPlan Stage A), PR #125 (brainstorm companion)                                          | Re-run the focused suites if either merges before this lane integrates.                                                                                              | Open; neither touches any file this plan writes (#190's only docs overlap with the wave is `configuration.md`). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                                                                                                                                                                                               | Required update                                                                                                                                   |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 (remote project management) merged     | None     | None — **merged; verified** at `7d70ac307`: its diff against `c9f2e147a` touches `apps/oat-docs/docs/cli-utilities/configuration.md` and `packages/cli/scripts/bundle-inputs.mjs` only, neither written here. | Done. Every anchor above was re-read on the post-merge tree.                                                                                      |
| Draft PR #190 (ReviewPlan Stage A) merges      | None     | None (its docs overlap is `cli-utilities/configuration.md`).                                                                                                                                                  | Re-run the drift check; no plan change expected.                                                                                                  |
| PR #125 (brainstorm companion) merges          | None     | None.                                                                                                                                                                                                         | No action.                                                                                                                                        |
| `BL-260908-align-the-provider-view-json` lands | Minor    | `packages/cli/src/drift/skill-view-diagnostic.ts`, `packages/cli/src/drift/skill-view-diagnostic.test.ts`, `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`                                           | Re-anchor `:522-538`, `:544-548`, `:573-576`, and the doc line numbers before editing; the `unrepairableCopy` deletion is unchanged in substance. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- packages/cli/src/drift/detector.ts packages/cli/src/drift/detector.test.ts packages/cli/src/drift/skill-view-diagnostic.ts packages/cli/src/drift/skill-view-diagnostic.test.ts packages/cli/src/engine/compute-plan.ts packages/cli/src/engine/compute-plan.test.ts packages/cli/src/engine/execute-plan.ts packages/cli/src/engine/index.ts packages/cli/src/engine/managed-copy-hash.ts packages/cli/src/engine/managed-copy-hash.test.ts packages/cli/src/engine/markers.ts packages/cli/src/engine/scanner.ts packages/cli/src/manifest/hash.ts packages/cli/src/commands/tools/info/skill-view-convergence.integration.test.ts packages/cli/src/commands/tools/info/skill-views.ts packages/cli/src/commands/tools/info/index.ts apps/oat-docs/docs/provider-sync/manifest-and-drift.md
```

Expected on an unchanged base: no output. If `detector.ts`, `compute-plan.ts`,
`execute-plan.ts`, `markers.ts`, or `hash.ts` changed, re-derive the hashes in
"Verified evidence" before editing; a material mismatch is a STOP condition.

Also re-run the live loop reproduction in Step 0 before writing any code. The
plan's whole justification is that the loop exists on the execution base.

## Repository conventions

- Build (needed before any smoke/release suite, and to refresh
  `packages/cli/dist`): `pnpm build` → `Tasks: … successful`. A `>>> FULL TURBO`
  replay is fine here only if `packages/cli/src` is unchanged since the last
  real build; after editing `src/`, confirm `dist/` is newer than your edits.
- Typecheck: `pnpm type-check` → exit 0.
- Focused tests, run from `packages/cli`:
  `pnpm exec vitest run src/drift src/engine src/commands/tools/info` → all pass.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format` (this plan touches `apps/oat-docs/docs`, which `pnpm format`
  covers through its `oxfmt --check 'apps/oat-docs/docs/**/*.md'` leg, and
  `pnpm check` covers through `markdownlint-cli2` in the docs app's `check`
  script, `pnpm --filter oat-docs check`). Markdownlint config for the docs app
  is `apps/oat-docs/.markdownlint.jsonc` (`MD013` off, so long narrative lines
  are fine; a fenced block still needs a language and heading levels must not
  skip).
- Implementation pattern: the file-copy transformed-hash fallback already in
  `drift/detector.ts:111-124` is the shape to mirror for directories; the
  managed-copy comparison already in
  `engine/compute-plan.ts:453-467` is the shape to mirror in
  `classifyOperation`.
- Import policy (`packages/cli/AGENTS.md:26`): same-directory `./…` imports
  only; anything outside the current directory uses a configured TypeScript
  alias (`@engine/…`, `@manifest/…`, `@drift/…` — `packages/cli/tsconfig.json:9-15`).
  No `../…`, no `src/…`, no `@/*`.
- Skill versioning: no `.agents/skills/**` file is edited by this plan, so no
  `metadata.version` bump applies (at this `HEAD` all 83 bundled skills carry
  `metadata.version` and none carries a top-level `version:`). If the executor
  finds itself editing a skill, that is out of scope.
- `DR-260906-standing-claims-in-skills-name`: a standing claim must name the
  code that owns it and ship an executable backstop in the same change. The
  doc sentences this plan writes into `manifest-and-drift.md` are standing
  claims about runtime behavior — each one is backed by a named test in the
  Test plan, not by prose alone.
- Never run `oxfmt` on a `state.md`.
- **Lane mode (the default for this plan under wave 7).** This plan runs as a
  lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. The lane runs focused tests plus `pnpm check`,
  `pnpm type-check`, a forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. The lane does
  **not** edit any lockstep release file and does **not** run
  `pnpm release:check-versions` or `pnpm release:validate`: the wave fan-in owns
  the single lockstep bump for the integrated wave and the release gates. Only a
  standalone execution bumps the five public packages itself, above freshly
  fetched `origin/main`, and runs the full definition-of-done sequence.
- Turborepo replays cached results. A green `pnpm check` or `pnpm test` that
  prints `cache hit, replaying logs` or `>>> FULL TURBO` executed nothing. For
  evidence-grade verification run `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root. `pnpm test --force` does **not** force a re-run.
- Capture each gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`). Never derive success from a
  pipeline ending in `tail` or a pager.

## Scope

### In scope

- `packages/cli/src/engine/managed-copy-hash.ts` (new) — the extracted
  banner-and-sentinel-aware directory hash, moved verbatim from
  `compute-plan.ts:288-370` with no behavior change.
- `packages/cli/src/engine/managed-copy-hash.test.ts` (new) — unit coverage for
  the extracted helper.
- `packages/cli/src/engine/compute-plan.ts` — import the extracted helper
  (deleting the private copy) and use it in `classifyOperation`'s copy branch
  for directory entries.
- `packages/cli/src/engine/index.ts` — re-export the helper only if a consumer
  outside `engine/` cannot reach it through the `@engine/managed-copy-hash`
  alias path (it can; the re-export is expected to be unnecessary).
- `packages/cli/src/drift/detector.ts` — add the directory branch of the
  transformed-hash fallback, ungated on `copyTransform`.
- `packages/cli/src/drift/skill-view-diagnostic.ts` — delete the
  `unrepairableCopy` const, its detail branch, and its suppression of
  `suggestion`.
- Tests: `packages/cli/src/drift/detector.test.ts`,
  `packages/cli/src/engine/compute-plan.test.ts`,
  `packages/cli/src/drift/skill-view-diagnostic.test.ts`,
  `packages/cli/src/commands/tools/info/skill-view-convergence.integration.test.ts`.
- `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` — the `modified`
  bullet at `:98` and the "Known limitation" section at `:176-190`.

### Out of scope

- `packages/cli/src/engine/execute-plan.ts` and
  `packages/cli/src/engine/markers.ts` — the writer is **not** changed. The
  manifest hash it records is already the canonical directory hash, which is
  exactly the value the fixed readers compare against; changing the writer would
  invalidate every existing manifest instead of converging it. The absolute
  path it writes into the sentinel is likewise unchanged (see STOP conditions).
- `packages/cli/src/manifest/hash.ts` — `computeDirectoryHash` is the shared
  baseline both sides agree on and must not move.
- File copies and rule transforms — already convergent (evidence above).
- `collection` and `symlink` strategies — untouched branches of both readers.
- The four items in
  `BL-260908-align-the-provider-view-json` (`--json` `providerPath`,
  `versionEvidence: not-read`, `projectedVersionNote` attribution, the
  redaction sentence) — a separate item, not in wave 7.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan in lane mode; the wave fan-in makes exactly one lockstep
  bump for the integrated wave.
- `packages/cli/assets/docs/**` — a build output, git-ignored, regenerated by
  `bundle-assets.sh`. Never hand-edited.

## Current state

`detectDrift` (`drift/detector.ts`) and `classifyOperation`
(`engine/compute-plan.ts`) are two independent readers of the same fact: does
the provider copy still match what the manifest recorded? Both answer it by
hashing the provider path raw. For a **directory** copy the engine deliberately
adds two files the canonical tree does not have — an `.oat-generated` sentinel
and a banner line prepended to `SKILL.md`/`AGENT.md` — so the raw provider hash
is permanently unequal to the canonical hash the manifest records. That is the
whole defect: not a stale hash, but two readers asking a question about a tree
the writer intentionally decorated.

`computeManagedDirectoryCopyHash` (`compute-plan.ts:288-370`) already answers
the right question. It refuses to answer at all (returns `null`) unless the
sentinel is byte-exact for this canonical path, every entry under the provider
directory is a plain file or directory, and the marker file starts with exactly
the expected banner. When it does answer, it hashes with the identical
algorithm as `computeDirectoryHash` over the identical logical content. So its
result equals the canonical hash **iff** the copy is a faithful managed copy —
verified numerically in the scratch repo above. A tampered copy still returns a
different digest, and a copy missing its sentinel or banner returns `null` and
falls back to the existing raw comparison. Its `canonicalPath` argument must be
the same absolute string the writer put in the sentinel; both readers already
have that string (`detector.ts:32`, and `canonicalEntry.canonicalPath` in
`classifyOperation`, which is what `applyCopyMarker` received).

`diagnoseSkillViews` (`drift/skill-view-diagnostic.ts`) currently compensates
for all of this at the presentation layer: when the detector says `modified` and
the projected version equals canonical, it rewrites the detail into an apology
that names the backlog item and suppresses the repair suggestion. Once the
readers converge, that branch is reachable only for a copy that is _genuinely_
modified while its version happens to match — precisely the case where
`oat sync` **would** repair it — so leaving the branch in place would suppress a
correct repair. The mirror branch, `staleCopy` (`:510-521`, an `in_sync` hash
with a version behind canonical), describes a different and still-real
condition and stays.

## Implementation steps

### 0. Reproduce the loop on the execution base

Do not write code first. In a `mktemp -d` scratch directory (never `rm -rf` a
variable path; let the OS reclaim the temp dir), `git init`, create
`.agents/skills/demo-skill/SKILL.md` with `metadata.version: 1.0.0`
frontmatter, create `.claude/`, and write `.oat/sync/config.json` with
`{"version":1,"defaultStrategy":"copy","providers":{"claude":{"enabled":true,"strategy":"copy"}},"knownStrays":[]}`.
Build the CLI first (`pnpm build`) so `packages/cli/dist/index.js` matches the
execution base, then run, from the scratch directory:
`node <repo>/packages/cli/dist/index.js sync --scope project`, then
`… status --scope project --json`, then `… sync --scope project --dry-run`.

**Verify:** `status --json` reports the single report as
`{"status":"drifted","reason":"modified"}` with exit code 1, and the dry run
prints `- update_copy claude/demo-skill`. If either is already correct on the
execution base, STOP: the defect this plan targets no longer exists and the
plan must be revalidated before any edit.

### 1. Extract the managed directory-copy hash into its own module

Create `packages/cli/src/engine/managed-copy-hash.ts` exporting
`computeManagedDirectoryCopyHash(providerPath: string, canonicalPath: string,
contentType: ManifestEntry['contentType']): Promise<string | null>`, moved
verbatim from `compute-plan.ts:288-370`. Keep its contract exactly: `null`
means "this is not a verifiable managed copy", never "it matches". Import
`OAT_DIRECTORY_SENTINEL` and `OAT_MARKER_PREFIX` from `./markers`. In
`compute-plan.ts`, delete the private function and import the new module with
`./managed-copy-hash`; leave `classifyObsoleteMappingRetirement:453-467`
otherwise untouched. `drift/detector.ts` imports it as
`@engine/managed-copy-hash` (the same alias shape as its existing
`@engine/collection-sync` import at `detector.ts:4`); add a re-export to
`engine/index.ts` only if that alias import fails to type-check.

Document, in the module's header comment, the standing claim this module now
owns: _the digest it returns for a faithful managed directory copy is equal to
`computeDirectoryHash` of the canonical directory, and it returns `null` rather
than a digest whenever the sentinel does not name exactly this canonical path_ —
and name `managed-copy-hash.test.ts` as its executable backstop.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts`
→ all existing cases pass unchanged, including
`compute-plan.test.ts:373` ("removes a verified clean generated directory copy
for an obsolete mapping", whose expected reason at `:411` is "obsolete mapping
has verified clean managed copy").

### 2. Pin the extracted helper's equivalence to the canonical hash

Add `packages/cli/src/engine/managed-copy-hash.test.ts` with the cases in the
Test plan. The load-bearing one asserts equality with
`computeDirectoryHash(canonicalDir)` for a faithful managed copy — the property
every later step depends on. Build the managed copy the way the engine does:
write the sentinel and the banner with `writeDirectorySentinel` and
`insertMarker` from `./markers`, passing the same absolute canonical path the
test later passes to the helper.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/managed-copy-hash.test.ts`
→ all cases pass.

### 3. Converge the sync planner

In `classifyOperation` (`compute-plan.ts:535-565`), after computing
`canonicalHash` and the raw `providerHash`, when the raw hashes differ **and**
`strategy === 'copy'` **and** `!canonicalEntry.isFile`, compute
`computeManagedDirectoryCopyHash(providerPath, canonicalEntry.canonicalPath, canonicalEntry.type)`
— pass `canonicalEntry.canonicalPath` exactly as it is, because that is the
string `applyCopyMarker` wrote into the sentinel — and return
`{ operation: 'skip', reason: 'already in sync' }` when it equals
`canonicalHash`. A `null` result, or any other digest, keeps the existing
`update_copy` return. Do not reorder the existing early returns and do not touch
the symlink branch.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine`
→ pass, including the new planner cases from the Test plan.

### 4. Converge the drift detector

In `detectDrift` (`drift/detector.ts`), after the raw-hash equality check at
`:107` and **before** the file-only `copyTransform` fallback at `:115`, add a
directory branch: when `!entry.isFile` and `entry.contentHash !== null`, compute
`computeManagedDirectoryCopyHash(providerPath, canonicalPath, entry.contentType)`
— `canonicalPath` is the `resolve(scopeRoot, entry.canonicalPath)` already
computed at `:32`, the same derivation the retirement classifier uses at
`compute-plan.ts:377` — and return `in_sync` when it equals
`entry.contentHash`. The branch must not be gated on `copyTransform` —
`commands/tools/info/index.ts:88` passes none, and gating it there would leave
`oat tools info` disagreeing with `oat status`. Leave the file fallback and the
final `drifted:modified` return as they are.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift/detector.test.ts`
→ pass, including the existing `:186` case ("returns drifted:modified when copy
hash differs", whose fixture has no sentinel and must stay red-for-the-right-reason
→ still drifted).

### 5. Delete the diagnostic's apology branch

In `drift/skill-view-diagnostic.ts`, delete the `unrepairableCopy` constant
(`:522-538`, including its comment block), its arm of the
`staleCopy ? … : unrepairableCopy ? … : classification` ternary (`:544-548`),
and the `&& !unrepairableCopy` guard on `suggestion` (`:573-576`), leaving
`REPAIRABLE.includes(viewClass)`. Keep `staleCopy` and every other branch
untouched.

**Verify:** `grep -rn "BL-260908-make-copy-strategy-skill" packages/cli/src apps/oat-docs/docs`
→ no matches.

### 6. Replace the tests that pinned the defect

Delete `skill-view-diagnostic.test.ts:620-662` ("offers no repair for a drifted
copy whose version still matches canonical") — its fixture models a
directory-only condition with `isFile: true` and the behavior it pins is gone.
Replace it with the repairable-copy case from the Test plan. Rewrite
`skill-view-convergence.integration.test.ts:225-277` into the convergence case:
same setup, but asserting `viewClass: 'in-sync'`,
`driftState: { status: 'in_sync' }`, `versionComparable: true`,
`viewVersion === canonicalVersion === '1.4.2'`, and `suggestion: null` (an
`in-sync` view is not in `REPAIRABLE`, so no repair line is expected for a
_converged_ copy — this is a different reason from the deleted suppression, and
the test comment must say so). Correct the file's module comment at `:38-43`,
which currently states the limitation as pre-existing behavior.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift src/commands/tools/info`
→ pass.

### 7. Prove convergence end to end through the real CLI

Extend `skill-view-convergence.integration.test.ts` with the case named in the
Test plan: `createProjectRoot('copy')` → `runCli(root, home, ['sync','--scope','project'])`
→ assert the copied `SKILL.md` still starts with `<!-- OAT-managed` and
`.claude/skills/<SKILL>/.oat-generated` exists (the writer is unchanged) →
`runCli(root, home, ['status','--scope','project','--json'])` reports the entry
`in_sync` with `summary.drifted === 0` and `exitCode === 0` →
`runCli(root, home, ['sync','--scope','project','--dry-run'])` prints no
`update_copy` for it. This is the acceptance criterion, executable. The harness
passes `--cwd root` for every invocation (`runCli`, `:76-108`), so the scope
root string is identical across sync and status, which is what the sentinel
match requires.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/info/skill-view-convergence.integration.test.ts`
→ pass, and re-run the Step 0 scratch reproduction against a freshly built
`packages/cli/dist/index.js`: `status --json` now reports `in_sync` with exit 0
and the dry run plans nothing.

### 8. Make the documentation true again

In `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`: drop the "A `copy`
view also reaches this class through the known limitation below, where the
difference may be nothing but the generated banner" clause from the `modified`
bullet at `:98`; delete the whole "### Known limitation: copy-strategy skill
views" section at `:176-190`. Add one sentence where the copy semantics are
described (the `in-sync` bullet at `:99`, or the drift paragraph at `:144-148`)
stating that a managed directory copy is compared with its banner and
`.oat-generated` sentinel excluded, so a freshly synced copy reads `in_sync` —
and name the test that owns that claim, per
`DR-260906-standing-claims-in-skills-name`. Do not hand-edit
`apps/oat-docs/index.md` or `packages/cli/assets/docs/**`.

**Verify:** `pnpm --filter oat-docs check` → oxfmt and markdownlint both pass;
`grep -n "Known limitation: copy-strategy" apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
→ no matches.

### 9. Run the lane gates

**Verify (lane mode):** in this order, each with its exit code captured
explicitly —
`pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
`pnpm oat:validate-skills`. All exit 0. Do not edit lockstep release files and
do not run `pnpm release:check-versions` or `pnpm release:validate`; the wave
fan-in owns those. **Standalone mode only:** additionally bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.

## Test plan

Every case below is new or changed. Each names the pre-fix red state that must
be observed before the fix is applied.

- **`packages/cli/src/engine/managed-copy-hash.test.ts` (new).** Structural
  pattern: `packages/cli/src/drift/detector.test.ts:1-42` (temp-root seeding and
  `afterEach` cleanup) and the managed-copy fixture at
  `packages/cli/src/engine/compute-plan.test.ts:373-392`.
  - `equals computeDirectoryHash of the canonical directory for a faithful
managed copy` — seed a canonical skill directory, copy it, add the sentinel
    and the banner with `writeDirectorySentinel`/`insertMarker`, and assert
    `computeManagedDirectoryCopyHash(...) === await computeDirectoryHash(canonicalDir)`.
    This is the load-bearing property. Red control: change the banner text by one
    character and re-run — the helper must return `null`, so the assertion fails.
  - `returns null when the sentinel is absent, names a different canonical
path, or has trailing content` (three cases). The "different canonical path"
    case is the sentinel-path-sensitivity guard: a sentinel written for another
    absolute path must not buy a digest.
  - `returns null when the marker file does not start with the expected banner`.
  - `returns null when the provider tree contains a symlink or other non-regular
entry`.
  - `returns a different digest when any copied file body differs` — the
    weaker-anywhere control at the helper level: a tampered copy must never
    produce the canonical digest.
- **`packages/cli/src/engine/compute-plan.test.ts` (changed).**
  - `plans skip for a faithful managed directory copy` — the planner case that
    is red before Step 3 (it returns `update_copy`) and green after.
  - `still plans update_copy for a managed directory copy whose body was
edited` — the weaker-anywhere control for the planner.
  - `still plans update_copy for a directory copy with no sentinel` (the
    pre-`applyCopyMarker` legacy shape).
  - `compute-plan.test.ts:373` (`removes a verified clean generated directory
copy for an obsolete mapping`) must pass unchanged — proof the extraction in
    Step 1 changed nothing.
- **`packages/cli/src/drift/detector.test.ts` (changed).**
  - `returns in_sync for a managed directory copy whose manifest hash is the
canonical hash` — red before Step 4 (`drifted:modified`), green after.
    Assert with **no** `copyTransform` argument, so the case also covers the
    `tools info` call site.
  - `returns drifted:modified when a managed directory copy body was edited` —
    the weaker-anywhere control for the detector.
  - `returns drifted:modified when the sentinel names a different canonical
path` — a hand-forged sentinel must not buy an `in_sync` verdict.
  - The existing `:168` and `:186` cases must pass unchanged.
- **`packages/cli/src/drift/skill-view-diagnostic.test.ts` (changed).** Delete
  `:620-662`; add `offers the scope repair for a copy the detector reports as
modified`, asserting `viewClass: 'modified'` with
  `suggestion: 'oat sync --scope project'` and a detail that no longer mentions
  the backlog item. Use `isFile: false` in the fixture. Red before Step 5
  (`suggestion` is `null`), green after.
- **`packages/cli/src/commands/tools/info/skill-view-convergence.integration.test.ts`
  (changed).** Rewrite `:225-277` as described in Step 6, and add the end-to-end
  convergence case from Step 7. The convergence case is the plan's acceptance
  criterion and is red on the execution base in three independent ways
  (`viewClass`, `status --json`, `--dry-run` output).
- **Negative control, run once and reported.** After the fix is green, revert
  Step 4's detector branch alone (leave everything else in place), confirm the
  detector case and the end-to-end convergence case both fail, restore, and
  report that. Repeat for Step 3's planner branch alone against the `--dry-run`
  assertion. Two clauses, two controls: a test that cannot fail is not evidence.
- **Focused command:** from `packages/cli`,
  `pnpm exec vitest run src/drift src/engine src/commands/tools/info` → all
  pass.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root → all pass, with no `FULL TURBO` replay in the
  output.

## Done criteria

- [ ] In a scratch repository with a copy-strategy provider, `oat sync --scope project`
      → `oat status --scope project --json` reports the skill `in_sync` with
      `summary.drifted === 0` and exit code 0.
- [ ] The following `oat sync --scope project --dry-run` prints no `update_copy`
      for that skill.
- [ ] The copied `SKILL.md` still starts with `<!-- OAT-managed` and
      `.oat-generated` still exists beside it — the writer is unchanged and the
      manifest format is unchanged (a manifest written before this change
      converges without a re-sync).
- [ ] `grep -rn "BL-260908-make-copy-strategy-skill" packages/cli/src apps/oat-docs/docs`
      returns nothing, and `oat tools info <skill>` prints a `Repair:` line for a
      genuinely modified copy.
- [ ] `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` has no "Known
      limitation: copy-strategy skill views" section and its `modified` bullet
      no longer excuses copies; every new claim names its owning test.
- [ ] Both weaker-anywhere controls are recorded: a body-edited managed copy and
      a forged sentinel are each still reported `drifted` and still planned
      `update_copy`.
- [ ] Both negative controls (detector branch reverted; planner branch reverted)
      were run and each made its named test fail.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`,
      `pnpm format`, and `pnpm oat:validate-skills` all pass with captured exit
      codes, and no lockstep release file is edited.
- [ ] `git status --short` contains no unexplained or out-of-scope files (in
      particular nothing under `packages/cli/assets/` or `packages/cli/dist/`).

## STOP conditions

Stop and report instead of improvising when:

- Step 0's reproduction does not reproduce — the defect is gone or has changed
  shape, and the plan's premise must be revalidated before any edit;
- `computeManagedDirectoryCopyHash` does **not** equal
  `computeDirectoryHash(canonicalDir)` for a faithful managed copy in Step 2 —
  the plan's central claim is false and the fix must be redesigned (do not
  "fix" it by changing the writer's manifest hash, which would invalidate every
  existing manifest);
- Step 7's end-to-end case stays `drifted` while Step 2 and Step 4's unit cases
  pass — that is the sentinel-path shape: the scope root string `oat status`
  resolves differs from the one the scanner used at sync time (for example a
  realpath'd `/private/var/…` against `/var/…`). Report it with both strings.
  Do not widen the helper to a fuzzy path match or change what the writer puts
  in the sentinel; that is a design decision outside this plan;
- converging the readers would require changing what
  `execute-plan.ts:173-198` records in `contentHash`, or any other manifest
  field — that is a migration, not this plan;
- any input the detector or the planner previously rejected becomes accepted
  beyond a faithful managed directory copy (this is the weaker-anywhere rule: a
  validator, guard, or reader that newly accepts a previously rejected input is
  a Critical finding, and a tampered body, a forged or absent sentinel, a
  missing banner, or a non-regular provider entry must all still be rejected);
- an in-scope file's cited line anchors have moved so far that the described
  branch cannot be located with confidence;
- a named verification gate fails twice after one bounded correction;
- the work would require editing `.agents/skills/**`, a lockstep release file,
  or `packages/cli/assets/**`.

## Revalidation Before Execution

**Refresh applied 2026-09-09 (wave-7 p15, post-STOP amendment; amends the helper-extraction step, the Test plan, and the Done criteria — the Outcome, Scope, weaker-anywhere rule, and every other STOP stand):** the lane implemented all nine steps and its cross-model round reproduced, on the built CLI and at the `detectDrift` unit, the STOP "any input the detector or the planner previously rejected becomes accepted": `computeManagedDirectoryCopyHash`, moved verbatim as the plan prescribed, skips the sentinel by pathname before the `isFile()` check and reads it with a symlink-following `readFile`, and never `lstat`s the provider root — so a provider view whose `.oat-generated` sentinel is a symlink to a file holding the marker, or whose root is a symlink to a faithful decorated tree, was `drifted:modified` before this plan and becomes `in_sync` / `skip` after it. This is a pre-existing weakness of the inherited helper that the plan's own reuse promotes into the detector and the planner. **Decision (non-narrowing — WHAT must be true is the weaker-anywhere rule the plan already states; the "verbatim, no behavior change" clause was a mechanism instruction that cannot hold together with it):** harden the shared helper rather than gate the two call sites — `lstat` the provider root and require a real directory (a symlinked root returns `null`); validate the sentinel `Dirent` as a regular file before the pathname skip and read it without following symlinks (a symlinked or otherwise non-regular sentinel returns `null`). `classifyObsoleteMappingRetirement` inherits the stricter helper and therefore classifies those two shapes as `detach` instead of `remove` — the safe direction for a destructive path, accepted deliberately and pinned. **Correction applied 2026-09-09 (from the p15 root review):** measured at base and head, the retirement classifier already returned `detach` for a symlinked root (`compute-plan.ts:340-343` computes `expectedTypeMatches` from `lstat` before the helper runs), so the stricter verdict is new only for the symlinked-sentinel shape; and the two shapes were accepted for two different reasons — the sentinel because it was skipped by pathname and read through a symlink-following `readFile`, the root because it was never type-checked before `readdir`. The retirement + symlinked-root case therefore pins a composite guarantee rather than going red under the un-hardened helper (seven of the eight new cases do). **Test plan additions:** for each shape (symlinked sentinel; symlinked provider root) a helper case asserting `null`, a detector case asserting `drifted`, a planner case asserting `update_copy`, and a retirement-classifier case asserting `detach` (with the pre-existing faithful-copy `remove` case unchanged); each new case red under the un-hardened helper. **Done criteria (amended):** the four shapes above plus the plan's tampered-body, forged-sentinel, missing-banner, and non-regular-entry controls all stay rejected; the retirement classifier's faithful-copy verdict is unchanged. **Review focus (addition):** confirm the helper's rejection set is a strict superset of the base's on every consumer (detector, planner, retirement) — no new acceptance anywhere.

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 or PR #125 lands;
- `BL-260908-align-the-provider-view-json` gains a plan or lands, changing
  `skill-view-diagnostic.ts` or `manifest-and-drift.md`;
- the wave-7 lane for `2026-09-08-fix-sync-apply-failure-summary.md` integrates
  before this lane (re-run `src/engine` and `src/commands/sync` tests; no
  shared write is expected);
- any cited line anchor in `detector.ts`, `compute-plan.ts`, `execute-plan.ts`,
  `markers.ts`, `skill-view-diagnostic.ts`, or `manifest-and-drift.md` moves;
- the Step 0 reproduction cannot be reproduced.

Apply the `## Landing-event impact` table when one of its events has occurred.
Executed inside a wave, this plan refreshes its drift check against the exact
execution `HEAD` after predecessor lanes integrate, not only from the authored
SHA to `origin/main`.

## Review focus

- **The weaker-anywhere surface.** Two readers newly accept inputs they used to
  reject. Confirm the acceptance is exactly "faithful managed directory copy"
  and nothing wider: check the `null` contract of
  `computeManagedDirectoryCopyHash` is preserved through the extraction, that
  the detector branch is reached only for `!entry.isFile` copy entries with a
  non-null `contentHash`, and that the planner branch is reached only for
  `strategy === 'copy'` directory entries.
- **The sentinel path argument.** The helper only answers when the sentinel
  names exactly the `canonicalPath` it is given. Confirm the planner passes
  `canonicalEntry.canonicalPath` unmodified (the writer's input) and the
  detector passes `resolve(scopeRoot, entry.canonicalPath)` (the retirement
  classifier's derivation), and that a mismatch degrades to the raw comparison
  rather than to a false `in_sync`.
- **The ungated detector branch.** Verify it is _not_ conditioned on
  `copyTransform`; a gated branch would leave `oat tools info`
  (`commands/tools/info/index.ts:88`, which passes none) disagreeing with
  `oat status`.
- **Cost.** The directory path may now hash the provider tree twice. Confirm
  the second hash runs only when the first comparison already failed.
- **Test fidelity.** The deleted unit case used `isFile: true` for a
  directory-only condition. Confirm no replacement fixture repeats that: the
  convergence evidence should come from the real-CLI integration test, not from
  a hand-built state the engine never produces.
- **Follow-ups intentionally deferred.** The four items in
  `BL-260908-align-the-provider-view-json` (JSON `providerPath` for
  non-projected rows, a `not-read` `versionEvidence` state, canonical-conflict
  attribution in `projectedVersionNote`, and the redaction sentence) are not in
  wave 7 and are untouched here. Whether the sentinel should record a
  scope-relative rather than absolute canonical path (which would make the
  match robust to symlinked or realpath'd scope roots) is a writer-side design
  question, also deferred.
