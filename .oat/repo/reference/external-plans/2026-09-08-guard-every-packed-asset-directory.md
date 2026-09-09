---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260906-guard-packed-asset-directories.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-guard-packed-asset-directories
oat_issue_url: null
created: '2026-09-08T21:20:00Z'
---

# Guard a packed path under every required asset directory

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The only shared
> write surface with other work is
> `apps/oat-docs/docs/cli-utilities/configuration.md`: the wave-7 sibling
> [name-the-resolved-symlink-target](./2026-09-08-name-the-resolved-symlink-target.md)
> edits one sentence at `:95` and draft PR #190 also edits it; both are in a
> different section from this plan's `:255-282`, so that is an ordering
> nuisance, not a block. PR #273, which also edited it, has merged and was
> verified.

## Outcome

The CLI's public-package contract guards at least one packed path under each of
the seven directories `resolveAssetsRoot` requires at runtime, closing the gap
where a producer change that emptied `agents/`, `scripts/`, `docs/`, or
`config/` would publish a tarball whose every `oat` invocation exits 2 while
every local gate stayed green. `pnpm release:validate` fails when any of those
paths is absent from the packed tarball, a fast negative pack control proves it
by building a real bundle, emptying one guarded directory, packing, and
observing the failure, and
`apps/oat-docs/docs/cli-utilities/configuration.md` states the packed-path
guarantee alongside the runtime `OAT_ASSETS_DIR` contract it already documents.

## Source and live evidence

- Source backlog item:
  [BL-260906-guard-packed-asset-directories — Guard packed asset directories and document the OAT_ASSETS_DIR contract](../../pjm/backlog/archived/BL-260906-guard-packed-asset-directories.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`, rebased onto `origin/main`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip (PR #273 merged), which is also the merge-base with `HEAD`.
  Between `c9f2e147a` (the draft's baseline) and this `HEAD`, exactly two
  in-scope files changed, both by PR #273:
  `apps/oat-docs/docs/cli-utilities/configuration.md` (+19/−1, all above the
  `OAT_ASSETS_DIR` section, which moved from `:237-264` to `:255-282`) and
  `packages/cli/scripts/bundle-inputs.mjs` (+1: `oat-pjm-remote` added to the
  `skills` inventory; `agents`, `oatScripts`, and `docsRoot` untouched). Every
  anchor below is from the post-merge tree.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty apart from
  the wave-7 plan files under `.oat/repo/reference/external-plans/` and their
  source backlog items.
- Verified evidence:
  - `packages/cli/src/fs/assets.ts:81-89` — `REQUIRED_BUNDLE_DIRECTORIES` is
    exactly `['skills','agents','templates','scripts','docs','migration','config']`,
    in producer order. It is a module-private `const` (not exported);
    `packages/cli/src/fs/assets.test.ts:53` restates the same seven names in a
    local copy.
  - `packages/cli/src/fs/assets.ts:136-167` — `validateBundleStructure` `stat`s
    each one and throws `CliError(..., 2)` on the first that is missing or is not
    a directory; `:181-223` runs it from `validateAssetsBundle`, and `:244-276`
    runs _that_ from `resolveAssetsRoot` for both the packaged root and an
    `OAT_ASSETS_DIR` override. Every command that resolves assets therefore
    exits 2 on an incomplete bundle. (The item cites `:140-151` for the rejection;
    the missing-directory branch is `:147-151` and the not-a-directory branch is
    `:160-165`.)
  - `packages/cli/src/release/public-package-contract.ts:67-80` — the CLI
    contract's `requiredPaths` are `dist/index.js`, `assets`,
    `assets/bundle-metadata.json`, `assets/migration/pjm-restructure.md`, four
    `assets/templates/*.md`, two
    `assets/skills/explainer-kit/scripts/lib/*.mjs`, `assets/NOTICES.md`, and
    `README.md`. So `skills/`, `templates/`, `migration/` are covered by a
    concrete file, and `agents/`, `scripts/`, `docs/`, and `config/` are covered
    by **nothing**. (The item cites `:67-79`; the array closes at `:80`.)
  - `packages/cli/src/release/public-package-contract.ts:181-189` —
    `hasRequiredPackPath` accepts a required path when a packed path equals it
    _or_ starts with `"<required>/"`. The bare `assets` entry is therefore
    satisfied by any single packed file under `assets/`, which is why an emptied
    subdirectory passes today.
  - `packages/cli/scripts/bundle-assets.sh:42` creates all seven directories
    unconditionally in staging, and populates `docs/` only
    `if [ -d "${DOCS_SOURCE}" ]` (`:106-108`) — a conditional population whose
    failure mode is a directory that exists locally and vanishes from the
    tarball, because `npm pack` drops empty directories. Same shape for
    `agents/`, `templates/`, and `scripts/`, each driven by a
    `node bundle-inputs.mjs --list …` loop (`:110-118` for scripts, which
    hard-fails if a listed source is missing).
  - Stable, non-optional members exist in each unguarded directory, confirmed
    both in `packages/cli/scripts/bundle-inputs.mjs` and in the built bundle at
    `packages/cli/assets/` (rebuilt 2026-09-08 at this `HEAD`):
    `agents/` → `oat-reviewer.md` (`bundle-inputs.mjs:83-86`, the `agents`
    list); `scripts/` → `generate-oat-state.sh` (`:116-117`, the `oatScripts`
    list); `docs/` → `index.md` (`:149`, `docsRoot: 'apps/oat-docs/docs'`,
    whose `index.md` is an authored file, not the generated
    `apps/oat-docs/index.md`); `config/` → `dispatch-matrix-recommendation.json`
    (`bundle-assets.sh:124`, an unconditional `cp`).
  - `packages/cli/src/release/public-package-contract.test.ts:228-254` — the
    `findMissingPackedPaths` unit fixture (`packedPaths` at `:230-246`). It
    already lists `assets/docs/index.md` and does **not** list any
    `assets/agents/…`, `assets/scripts/…`, or `assets/config/…` path, so adding
    three of the four new contract entries turns this existing test red — a free
    red-then-green control at the unit level.
  - `packages/cli/src/release/public-package-contract.test.ts:256-298` — the
    real-pack test. It `mkdtemp`s a package directory, writes a minimal
    `package.json` with `files: ['dist','assets','README.md']`, runs
    `bash packages/cli/scripts/bundle-assets.sh` with `OAT_ASSETS_DIR` pointed at
    it, then `packPublicPackage(cliContract, packageDir)` and asserts
    `findMissingPackedPaths(...)` is `[]` (`:291`). This is the exact harness the
    negative pack control needs, and it already runs inside the ordinary vitest
    suite with a 20s timeout. `:300-333` is the sibling that proves packing
    does not mutate `packages/cli/dist` or `assets` (30s timeout).
  - `tools/release/validate-public-packages.ts:280-3xx` — `validatePackage`
    calls `findMissingPackedPaths` on the real tarball listing at `:309` and
    reports `missing packed paths: …` at `:339-341`; `:375` is
    `runReleaseValidation`, whose failures make `main` set
    `process.exitCode = 1` at `:424`; the success line is
    `release validation passed for N public packages` at `:407-409`. So a
    contract addition is enforced by `pnpm release:validate` with no further
    wiring.
  - `apps/oat-docs/docs/cli-utilities/configuration.md:255-282` — the
    `### Bundled assets root (OAT_ASSETS_DIR)` section. **The item's third
    acceptance criterion is already satisfied**: `:264-272` already names the
    seven directories, the exit code 2, the first-offending-path diagnosis, and
    `:273-276` already describes the source-aware remedies. Nothing there is
    stale. What is missing is the _packed_-path guarantee this plan adds, so the
    docs work is one added statement, not a rewrite.
  - `packages/cli/assets/**` is a build output ignored by `.gitignore:25`
    (`packages/cli/assets/*`). Four legacy files remain tracked
    (`config/dispatch-matrix-recommendation.json`, `migration/pjm-restructure.md`,
    `public-package-versions.json`, `templates/plan-lite.md`); none of them is
    touched here, and the bundle itself is never hand-edited.

## Dependencies

| Type             | Dependency                                                                           | Required state                                                                                                                                    | Current state                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Satisfied        | PR #273 (remote project management)                                                  | Merged before this lane starts; its `configuration.md` and `bundle-inputs.mjs` edits re-anchored.                                                 | Merged 2026-09-08 (`7d70ac307`); re-anchored above. The four guarded paths are unaffected by its inventory change. |
| Soft adjacency   | [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md) | Never in the same lane group: it writes one sentence at `configuration.md:95`; this plan writes inside `:255-282`. Re-anchor after it integrates. | READY in wave 7; different section, trivially mergeable.                                                           |
| Soft integration | Draft PR #190 (ReviewPlan Stage A)                                                   | Also edits `apps/oat-docs/docs/cli-utilities/configuration.md`; re-anchor the `OAT_ASSETS_DIR` section if it merges first.                        | Open draft. Does not touch the release contract files.                                                             |
| Soft adjacency   | The wave fan-in's `pnpm release:validate` run                                        | The lane proves the guard with a focused test; the fan-in runs the gate itself.                                                                   | Standing wave-7 convention.                                                                                        |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                | Affected | Files in common                                                                               | Required update                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 (remote project management) merged           | Minor    | `apps/oat-docs/docs/cli-utilities/configuration.md`, `packages/cli/scripts/bundle-inputs.mjs` | **Merged; verified** at `7d70ac307`: `configuration.md`'s `OAT_ASSETS_DIR` section re-anchored to `:255-282` (`:264-272`, `:273-276`); `bundle-inputs.mjs` gained only `oat-pjm-remote` under `skills`, so the four guarded paths still exist in a fresh bundle. Done. |
| Draft PR #190 (ReviewPlan Stage A) merges            | Minor    | `apps/oat-docs/docs/cli-utilities/configuration.md`                                           | Re-anchor `:255-282` before editing; no code change expected.                                                                                                                                                                                                          |
| Wave-7 lane `name-the-resolved-symlink-target` lands | Minor    | `apps/oat-docs/docs/cli-utilities/configuration.md`                                           | Re-anchor `:255-282` (its edit is at `:95`, so the section may shift by a line); no code change expected.                                                                                                                                                              |
| PR #125 (brainstorm companion) merges                | None     | None                                                                                          | No action.                                                                                                                                                                                                                                                             |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- packages/cli/src/release/public-package-contract.ts packages/cli/src/release/public-package-contract.test.ts packages/cli/src/fs/assets.ts packages/cli/src/fs/assets.test.ts packages/cli/scripts/bundle-assets.sh packages/cli/scripts/bundle-inputs.mjs tools/release/validate-public-packages.ts apps/oat-docs/docs/cli-utilities/configuration.md
```

Expected on an unchanged base: no output. If `bundle-inputs.mjs` or
`bundle-assets.sh` changed, re-run Step 1's existence probe before choosing the
guarded paths — a path this plan names may no longer be produced. If
`fs/assets.ts` changed, re-read `REQUIRED_BUNDLE_DIRECTORIES`: the contract
entries must stay in one-to-one correspondence with it. If `configuration.md`
changed, re-anchor the `### Bundled assets root` section by heading, not by
line.

## Repository conventions

- Build: `pnpm build` → `Tasks: … successful`. Required before any pack-based
  test, because `packPublicPackage` packs what is on disk. A `>>> FULL TURBO`
  replay is acceptable only if nothing under `packages/cli` changed since the
  last real build; the bundle step (`bundle-assets.sh`) reruns on every real
  build.
- Typecheck: `pnpm type-check` → exit 0.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/release/public-package-contract.test.ts` → all pass.
  Two of its cases run a real `pnpm pack` and are already given 20s/30s
  timeouts; the new negative controls need the same treatment.
- Lint/format check (non-mutating): `pnpm check` (which is what runs
  markdownlint over `apps/oat-docs/docs`, via `pnpm --filter oat-docs check`),
  plus `pnpm lint` and `pnpm format`. `pnpm check` and the lint/format pair
  overlap but neither contains the other.
- Release gate: `pnpm release:validate` is a **standalone/fan-in** gate. In lane
  mode this plan proves the new guard with the focused test above and does not
  run the gate; the wave fan-in runs `pnpm release:validate` (and
  `pnpm release:check-versions`) for the integrated wave.
- Implementation pattern: add entries to the existing `requiredPaths` array in
  `PUBLIC_PACKAGE_CONTRACTS`; do not introduce a second mechanism. The negative
  pack control copies the harness at
  `public-package-contract.test.ts:256-298` verbatim in shape.
- Import policy (`packages/cli/AGENTS.md:26`): `./…` for same-directory modules
  and a configured alias otherwise. The test file already reaches
  `tools/release/…` by relative path, matching its existing imports at `:17-20`;
  keep that, do not invent a new alias. `fs/assets.ts` is reachable from the
  test as `@fs/assets` if that alias exists in `packages/cli/tsconfig.json`;
  otherwise follow whatever the nearest test in `src/release` already uses.
- Skill versioning: no `.agents/skills/**` file is edited, so no
  `metadata.version` bump applies (at this `HEAD` all 83 bundled skills carry
  `metadata.version` and none carries a top-level `version:`).
  `pnpm run check:skill-bumps` must still pass.
- `DR-260906-standing-claims-in-skills-name`: the sentence added to
  `configuration.md` is a standing claim about release behavior and must name
  its executable owner — the negative pack control — in the same change.
- Never run `oxfmt` on a `state.md`.
- **Lane mode (the default for this plan under wave 7).** This plan runs as a
  lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. The lane runs focused tests plus `pnpm check`,
  `pnpm type-check`, a forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. The lane does
  **not** edit any lockstep release file and does **not** run
  `pnpm release:check-versions` or `pnpm release:validate`. Only a standalone
  execution bumps the five public packages itself, above freshly fetched
  `origin/main`, and runs the eight AGENTS.md gates in order — including
  `pnpm release:validate`, which is where the new guard is exercised end to end.
- Turborepo replays cached results; a green run printing `cache hit, replaying
logs` or `>>> FULL TURBO` executed nothing. Use
  `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root
  for evidence-grade verification, and capture every gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`).

## Scope

### In scope

- `packages/cli/src/release/public-package-contract.ts` — four entries added to
  the CLI contract's `requiredPaths`, plus a comment tying the list to
  `fs/assets.ts`'s `REQUIRED_BUNDLE_DIRECTORIES`.
- `packages/cli/src/fs/assets.ts` — `export` added to
  `REQUIRED_BUNDLE_DIRECTORIES` at `:81` so the correspondence test can import
  it. No other change to that file.
- `packages/cli/src/release/public-package-contract.test.ts` — the updated unit
  fixture, a correspondence test between the contract and
  `REQUIRED_BUNDLE_DIRECTORIES`, and the negative pack controls.
- `apps/oat-docs/docs/cli-utilities/configuration.md` — one added bullet in
  the existing `### Bundled assets root (OAT_ASSETS_DIR)` section (`:255-282`).

### Out of scope

- The contents and order of `REQUIRED_BUNDLE_DIRECTORIES` — the runtime
  validator is correct and is the authority this plan aligns to. Do not add,
  remove, or reorder its entries; the export is the only permitted change.
- `packages/cli/src/fs/assets.test.ts:53` — its local restatement of the seven
  names may be replaced by the new export in a follow-up; not required here.
- `packages/cli/scripts/bundle-assets.sh` and `bundle-inputs.mjs` — the producer
  is not changed. Making `docs/` population unconditional, or adding a
  keep-file, is a different fix; this plan guards the _consumer_ contract so a
  producer regression is caught at release time.
- `tools/release/validate-public-packages.ts` — already enforces
  `requiredPaths`; no wiring change is needed and none should be made.
- The other four public packages' contracts — none of them bundles assets.
- `packages/cli/assets/**` — a git-ignored build output; never hand-edited.
- `configuration.md` outside `:255-282` — in particular `:95`, which the
  sibling plan `name-the-resolved-symlink-target` owns.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan in lane mode; the wave fan-in owns the bump.

## Current state

Two lists describe the same bundle and do not agree. `fs/assets.ts` names seven
directories and fails closed with exit code 2 if any is missing at runtime, for
the packaged root and for an `OAT_ASSETS_DIR` override alike. The release
contract names concrete files under only three of them plus the bare `assets`
prefix, which `hasRequiredPackPath` satisfies from any file anywhere under
`assets/`.

`npm pack` does not record empty directories. Every one of `agents/`,
`scripts/`, `docs/`, and `templates/` is populated by a loop over an inventory
list, and `docs/` additionally by an `if [ -d … ]` guard. So a change that
empties one of the unguarded four — an inventory entry removed, a docs root
moved, a loop that silently reads nothing — produces a bundle that passes
`findMissingPackedPaths`, passes `findMissingBuildArtifacts` (which checks the
_workspace_ directory, where the empty directory still exists), passes every
local gate, and installs as a CLI whose first `resolveAssetsRoot` call exits 2.
`docs/` is the likeliest instance because it is the one with an explicit
conditional.

Guarding one concrete file per directory closes that hole with the mechanism
already in place, and needs no new validator: `validatePackage` already reports
`missing packed paths` and `runReleaseValidation` already fails the process.

## Implementation steps

### 1. Probe that the four chosen paths are actually produced

Run `pnpm build` (or `bash packages/cli/scripts/bundle-assets.sh`), then confirm
each of `packages/cli/assets/agents/oat-reviewer.md`,
`packages/cli/assets/scripts/generate-oat-state.sh`,
`packages/cli/assets/docs/index.md`, and
`packages/cli/assets/config/dispatch-matrix-recommendation.json` exists, and
cross-check each against its producer in `packages/cli/scripts/bundle-inputs.mjs`
(`agents` at `:83-86`, `oatScripts` at `:116-117`, `docsRoot` at `:149`) and
`bundle-assets.sh:124`.

**Verify:** `ls packages/cli/assets/agents/oat-reviewer.md packages/cli/assets/scripts/generate-oat-state.sh packages/cli/assets/docs/index.md packages/cli/assets/config/dispatch-matrix-recommendation.json`
→ all four listed, exit 0 (confirmed at this `HEAD` on 2026-09-08). If any is
absent, STOP and choose a different member of that directory from the inventory
rather than guarding a path the producer does not emit.

### 2. Add the four contract entries

In `packages/cli/src/release/public-package-contract.ts`, add to the CLI
contract's `requiredPaths` (`:67-80`), grouped with the existing `assets/*`
entries:

- `assets/agents/oat-reviewer.md`
- `assets/scripts/generate-oat-state.sh`
- `assets/docs/index.md`
- `assets/config/dispatch-matrix-recommendation.json`

Add a comment above the `assets/*` group recording the standing claim this
change owns: these entries exist so that each of the seven directories in
`fs/assets.ts`'s `REQUIRED_BUNDLE_DIRECTORIES` has at least one guarded packed
path, because `npm pack` drops empty directories while
`validateBundleStructure` exits 2 on a missing one. Name the correspondence test
and the negative pack control from Step 4 as its executable owners.

**Verify:** run the existing unit case _before_ updating its fixture:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts -t "reports missing and forbidden packed paths"`
→ **fails**, with `findMissingPackedPaths` returning the three entries the
fixture lacks (`assets/agents/oat-reviewer.md`,
`assets/scripts/generate-oat-state.sh`,
`assets/config/dispatch-matrix-recommendation.json`; `assets/docs/index.md` was
already in the fixture at `:233`). Record that red output — it is the first
negative control, and it is free.

### 3. Update the two contract-shape tests

Add the three missing paths to the `packedPaths` fixture at
`public-package-contract.test.ts:230-246`, and add all four to the
`requiredPaths: expect.arrayContaining([...])` assertion at `:100-112` so the
contract shape is pinned rather than merely satisfied.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`
→ the two shape cases pass; the two real-pack cases at `:256-298` and `:300-333`
also pass, proving the four new paths are present in a genuinely packed CLI.

### 4. Add the correspondence test and the negative pack control

Export `REQUIRED_BUNDLE_DIRECTORIES` from `packages/cli/src/fs/assets.ts:81`
(add `export`; change nothing else in that file). Then add two cases to
`public-package-contract.test.ts`:

1. `guards a packed path under every required bundle directory` — import
   `REQUIRED_BUNDLE_DIRECTORIES` from `fs/assets.ts` and assert that for each
   directory name, the CLI contract's `requiredPaths` contains at least one
   entry starting with `assets/<name>/`. This is the test that makes an eighth
   required directory fail loudly instead of silently going unguarded.
2. `fails release validation when a required bundle directory is empty in the
tarball` — the negative pack control. Following the harness at `:256-298`:
   `mkdtemp` a package directory, write the minimal `package.json` with
   `files: ['dist','assets','README.md']`, run `bundle-assets.sh` with
   `OAT_ASSETS_DIR` pointed there, then remove the contents of exactly one
   guarded directory with
   `await rm(join(packageDir, 'assets', 'agents'), { recursive: true, force: true })`
   followed by `await mkdir(join(packageDir, 'assets', 'agents'))` — the empty
   directory must still exist on disk, because reproducing the real failure mode
   requires the local tree to look complete while the tarball is not. Then
   `packPublicPackage(cliContract, packageDir)` and assert
   `findMissingPackedPaths(packedPaths, cliContract)` equals
   `['assets/agents/oat-reviewer.md']`. Assert the _exact_ array, not merely
   non-empty: the point is that this specific directory is what went missing.
   Give it the same 20s timeout as its sibling, and use `mkdtemp` for every
   path it touches — never `rm -rf` a variable path outside the directory the
   test itself created.

Repeat the control's assertion shape for a second directory (`assets/docs`, the
one with the conditional producer; expected `['assets/docs/index.md']`) so the
guard is proven for more than one member of the four. Share one bundled package
directory between the two controls if that keeps the suite under its timeout;
each control must still pack its own mutated copy.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`
→ all pass. Then revert Step 2's four contract entries alone, re-run, and
confirm the correspondence test and both negative-control cases fail; restore
and report that.

### 5. State the packed-path guarantee in the docs

In `apps/oat-docs/docs/cli-utilities/configuration.md`, inside the existing
`### Bundled assets root (OAT_ASSETS_DIR)` section (`:255-282`; locate it by
heading), add one bullet after the source-aware-remedies bullet at `:273-276`:
the published CLI tarball is held to the same seven-directory shape by release
validation, which requires a concrete packed file under each of them because
`npm pack` drops empty directories, so a published package cannot ship a bundle
that would make every command exit 2. Name
`public-package-contract.test.ts`'s negative pack control as the check that
owns the claim. Leave the rest of the section as it is — its description of the
runtime contract at `:264-276` is already accurate and satisfies the item's
third acceptance criterion. Do not touch `:95` (owned by the sibling plan), do
not touch `apps/oat-docs/docs/index.md`'s `## Contents` (no new page is added),
and do not hand-edit `apps/oat-docs/index.md`.

**Verify:** `pnpm --filter oat-docs check` → oxfmt and markdownlint both pass.

### 6. Run the lane gates

**Verify (lane mode):** in this order, each with its exit code captured
explicitly — `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
`pnpm oat:validate-skills`. All exit 0. Do **not** run `pnpm release:validate`
in lane mode: it is the fan-in's gate, and the focused negative pack control in
Step 4 is the lane's proof that the guard bites. **Standalone mode only:**
additionally bump the five public packages above freshly fetched `origin/main`
and run the eight AGENTS.md gates in order; `pnpm release:validate` must report
`release validation passed for 5 public packages`.

## Test plan

- **`packages/cli/src/release/public-package-contract.test.ts:228-254`
  (changed).** `reports missing and forbidden packed paths for release
validation` — fixture gains the three missing `assets/*` paths. **Red between
  Step 2 and Step 3**, and that red is the first proof the new entries are
  actually enforced by `findMissingPackedPaths`.
- **`packages/cli/src/release/public-package-contract.test.ts:85-197`
  (changed).** `captures role and artifact expectations for each package` —
  `requiredPaths` assertion at `:100-112` gains all four entries, pinning the
  contract shape.
- **New: `guards a packed path under every required bundle directory`.** Derives
  its expectation from the exported `REQUIRED_BUNDLE_DIRECTORIES` rather than
  restating the seven names, so adding an eighth required runtime directory
  without a corresponding guard fails here. Regression proved: the two lists
  silently diverging, which is the root cause of this item.
- **New: `fails release validation when a required bundle directory is empty in
the tarball`.** The reproduction-grade negative pack control the item asks
  for: a real `bundle-assets.sh` bundle, one guarded directory emptied but still
  present on disk, a real `pnpm pack`, and an exact-array assertion on
  `findMissingPackedPaths`. Run once for `assets/agents` and once for
  `assets/docs`. Structural pattern:
  `public-package-contract.test.ts:256-298`.
  - Accepted control (required alongside the rejected one): the unmodified
    bundle from the same harness must still report `[]`. That case already
    exists at `:291`; assert it in the same run so a control that rejects
    everything cannot pass as evidence.
- **Negative controls, run once and reported.** Revert Step 2's four contract
  entries and confirm the correspondence test and both pack controls fail;
  restore. A test that cannot fail is not evidence, and this is a release-gate
  contract, where positive-suite success is explicitly not sufficient.
- **Focused command:** from `packages/cli`,
  `pnpm exec vitest run src/release` → all pass.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root → all pass, with no `FULL TURBO` replay in the
  output.
- **Gate ownership:** `pnpm release:validate` is the end-to-end proof and is run
  by the wave fan-in (or by a standalone execution), not by this lane.

## Done criteria

- [ ] The CLI contract's `requiredPaths` contains at least one
      `assets/<dir>/…` entry for every name in
      `fs/assets.ts`'s `REQUIRED_BUNDLE_DIRECTORIES`, and the correspondence
      test derives that expectation from the exported runtime list rather than
      restating it.
- [ ] The negative pack control fails release validation when `assets/agents` is
      empty in the tarball, and again when `assets/docs` is, each with an exact
      `findMissingPackedPaths` array; the unmodified control bundle still
      reports `[]`.
- [ ] The pre-existing unit fixture was observed red after Step 2 and green
      after Step 3.
- [ ] Reverting the four contract entries makes the correspondence test and both
      pack controls fail; this was run and reported.
- [ ] `apps/oat-docs/docs/cli-utilities/configuration.md` states the packed-path
      guarantee, names the test that owns it, and its existing runtime
      `OAT_ASSETS_DIR` description is unchanged and still accurate.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`,
      `pnpm format`, and `pnpm oat:validate-skills` all pass with captured exit
      codes; no lockstep release file is edited and `pnpm release:validate` is
      left to the fan-in. Standalone mode: `pnpm release:validate` reports
      `release validation passed for 5 public packages`.
- [ ] `git status --short` contains no unexplained or out-of-scope files (in
      particular nothing under `packages/cli/assets/` or `packages/cli/dist/`,
      and no change to `configuration.md` outside the `OAT_ASSETS_DIR` section).

## STOP conditions

Stop and report instead of improvising when:

- Step 1's probe cannot find one of the four paths in a freshly built bundle —
  pick a different, unconditionally produced member of that directory rather
  than guarding a path the producer may not emit;
- guarding a directory appears to require changing
  `packages/cli/scripts/bundle-assets.sh` or `bundle-inputs.mjs` — the producer
  is out of scope, and a producer change is a different item;
- `REQUIRED_BUNDLE_DIRECTORIES` would have to change in content or order to make
  the correspondence test pass — the runtime validator is the authority, not
  the release contract;
- the negative pack control passes without the fix, or fails with a message
  naming a path other than the one that was emptied — the control is not
  reproducing the failure mode it claims to;
- the real-pack tests begin mutating `packages/cli/dist` or
  `packages/cli/assets` (the case at `:300-333` exists to prove they do not);
- a named verification gate fails twice after one bounded correction;
- the work would require editing `.agents/skills/**` or a lockstep release file.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- draft PR #190 lands, or the wave-7 lane
  `name-the-resolved-symlink-target` integrates (both edit `configuration.md`);
- `REQUIRED_BUNDLE_DIRECTORIES` in `packages/cli/src/fs/assets.ts` changes;
- `bundle-inputs.mjs`'s `agents`, `oatScripts`, or `docsRoot` entries change, or
  `bundle-assets.sh`'s `config/` copy at `:124` changes;
- any cited line anchor in `public-package-contract.ts`,
  `public-package-contract.test.ts`, `validate-public-packages.ts`, or
  `configuration.md` moves.

Apply the `## Landing-event impact` table when one of its events has occurred.
Executed inside a wave, this plan refreshes its drift check against the exact
execution `HEAD` after predecessor lanes integrate, not only from the authored
SHA to `origin/main`.

## Review focus

- **Whether the guard actually bites.** `findMissingPackedPaths` is only as good
  as the tarball listing it is given. Confirm the negative pack control packs a
  real tarball rather than asserting against a hand-written path array, and that
  it asserts an exact missing-path array so a control that would fail for any
  reason cannot pass as proof.
- **The empty-directory fidelity.** The control must leave the emptied directory
  present on disk. If it deletes the directory outright, it stops reproducing
  the real failure mode (a workspace that looks complete while
  `npm pack` publishes nothing) and instead tests a case
  `findMissingBuildArtifacts` would already have caught.
- **Correspondence, not restatement.** The new test must read
  `REQUIRED_BUNDLE_DIRECTORIES` from the runtime module. A test that hardcodes
  the seven names would go stale in exactly the way this item exists to prevent
  (`fs/assets.test.ts:53` already does this and is the cautionary example).
- **Test runtime.** Four pack-based cases now run in the ordinary suite. Check
  the timeouts and that the two new controls share one bundle build rather than
  each rebuilding from scratch unnecessarily.
- **Follow-ups intentionally deferred.** Making `docs/` population
  unconditional, adding keep-files to the bundle, replacing the restated list in
  `fs/assets.test.ts:53` with the new export, and extending guards to per-file
  manifests or checksums are all out of scope; this plan guards the shape,
  which is what `fs/assets.ts` itself checks.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p06 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `8cf75b11b` → integration `b89540879`; fix `0f81fd8fa` → `a9a958b90`): the release contract guards a packed path under every one of the seven required bundle directories (correspondence test over the exported `REQUIRED_BUNDLE_DIRECTORIES`), with real-tarball pack controls derived from that list for every directory and the docs bullet scoped to the top-level shape `validateBundleStructure` checks. Verification: focused 27; forced check/type-check/cli test `Cached: 0` (7114); check:skill-bumps; lint; format; validate-skills; one Codex round (1M fixed); root review PASS with findings (0/0/1M/1m; tarball-layer guard proven on two non-control directories; symlinked-directory probe) → fix round → round 2 PASS (0/0/0/0). Deviations: none against the plan; the pack-control table is derived from the directory list rather than hand-listed (review m1).
