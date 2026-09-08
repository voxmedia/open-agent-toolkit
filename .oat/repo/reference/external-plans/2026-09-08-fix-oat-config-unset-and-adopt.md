---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-let-oat-config-unset-remove.md
  - .oat/repo/pjm/backlog/items/BL-260907-fold-oat-config-adopt-onto.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-let-oat-config-unset-remove
  - BL-260907-fold-oat-config-adopt-onto
oat_issue_url: null
created: '2026-09-08T21:30:00Z'
---

# Let `oat config unset` remove a malformed value, and fold `adopt` onto the shared surface-flag resolver

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Two small
> changes in one file plus one export: `unsetConfigValue` stops making a strict
> effective read a precondition for removing the very value that read rejects,
> and `oat config adopt` calls the same `resolveSurfaceFlags` helper `set` and
> `unset` already call. Both are verified live on the built CLI (0.2.66) at the
> inspected `HEAD`, which already contains PR #273.

## Outcome

`oat config unset <key>` removes a stored value the normalizing reader rejects
and exits 0, for each of the three keys whose read fails closed
(`documentation.excludes`, `documentation.instructionPointerExcludes`,
`projects.defaultScope`), leaving every sibling value intact. The
environment-override refusal and the environment-override warning both still
fire, computed from the same override map the resolver uses rather than from a
whole-config read that a malformed value can abort. Separately,
`oat config adopt` resolves its `--shared`/`--local`/`--user` trio through
`resolveSurfaceFlags`, the helper `set` and `unset` already share, so the three
commands cannot drift apart; a test pins that all three reject conflicting
flags with a byte-identical message.

## Source and live evidence

- Source artifact or scope: `.oat/repo/pjm/backlog/items/`
- Related backlog items:
  [BL-260907-let-oat-config-unset-remove — Let oat config unset remove a malformed stored value](../../pjm/backlog/items/BL-260907-let-oat-config-unset-remove.md)
  and
  [BL-260907-fold-oat-config-adopt-onto — Fold oat config adopt onto the shared surface-flag resolver](../../pjm/backlog/items/BL-260907-fold-oat-config-adopt-onto.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`, rebased onto the merged
  PR #273).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, which is also the merge-base; the branch adds only plan
  files on top of it, so every code citation below is valid on both.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- CLI version at the inspected `HEAD`: `0.2.66`
  (`packages/cli/package.json`). `packages/cli/dist` was built from this tree
  (no source file newer than `dist/index.js`) and was the binary every
  reproduction below ran against.

### Verified evidence

- `packages/cli/src/commands/config/index.ts:2894-2924` —
  `unsetConfigValue` calls `validateSurfaceForKey` (`:2902`), refuses the three
  read-only `pjm.remote` structural keys (`:2905-2915`, added by PR #273), then
  immediately calls `dependencies.resolveEffectiveConfig(repoRoot,
userConfigDir, dependencies.processEnv)` at `:2918-2922`, and uses its result
  for exactly one thing: `const envShadowed = resolved.resolved[key]?.source ===
'env'` at `:2923`. Every lenient branch is downstream of that call.
- `packages/cli/src/commands/config/index.ts:3078-3087` — the lenient readers
  the item's fix asks for are **already present** in `removeFromSurface`
  (`:3001`): `readOatConfigForDocumentationExcludesRepair`,
  `readOatConfigForInstructionPointerExcludesRepair`, and
  `readOatConfigForDefaultScopeRepair` are selected per key on the shared
  surface. They are dead code today because `:2918` throws first.
- Reproduced on the built CLI in a scratch repository (`git init`, isolated
  `HOME`) at this `HEAD`:
  - shared config `{"version":1,"git":{"defaultBranch":"trunk"},"documentation":{"excludes":5,"root":"apps/docs"}}`
    → `oat config unset documentation.excludes` printed `Invalid
documentation.excludes in <path>: expected an array of non-empty strings.
Repair it with oat config set documentation.excludes "<glob>,<glob>" (an
empty value clears it).` and exited `1`.
  - `{"version":1,"documentation":{"instructionPointerExcludes":7}}` →
    `oat config unset documentation.instructionPointerExcludes` exited `1`
    with the matching `Invalid documentation.instructionPointerExcludes`
    message.
  - `{"version":1,"projects":{"defaultScope":{},"root":".oat/projects/shared"}}`
    → `oat config unset projects.defaultScope` exited `1` with `Invalid
projects.defaultScope in <path>: "[object Object]". Expected one of: shared,
local, synced.` **This third key is not named by the backlog item; it fails
    identically.**
  - The documented workaround holds: `oat config set documentation.excludes ''`
    printed `documentation.excludes=` and exited `0`.
- Simulated the planned fix end-to-end on the built CLI at the previous
  planning `HEAD` (`c9f2e147a`) by injecting a `resolveEffectiveConfig`
  override that swallows the throw into `createConfigCommand` (a read-only
  probe; no repository file was modified). All three keys then reported
  `<key> unset from shared config` and exited `0`, and every sibling survived.
  Nothing between that `HEAD` and this one changed `removeFromSurface`'s shared
  branch (PR #273 added `preservePjmRemotePolicyBoundary`, `:3116`, to the
  **user** branch only), so the conclusion stands: `:2918` is the only
  blocker and the downstream lenient path already works.
- `packages/cli/src/config/resolve.ts:147-151` — `ENV_OVERRIDE_MAP` maps
  exactly three keys: `projects.root` → `OAT_PROJECTS_ROOT`,
  `projects.defaultScope` → `OAT_PROJECTS_DEFAULT_SCOPE`, `worktrees.root` →
  `OAT_WORKTREES_ROOT`. `resolve.ts:553-564` defines `resolveEnvOverride`,
  which is **not** exported.
- `packages/cli/src/config/resolve.ts:46-49,173-193` — all three
  environment-mapped keys are present in `DEFAULT_SHARED_CONFIG` (`:46-49`), so
  each is always in the `keys` union `resolveEffectiveConfig` iterates
  (`:173-186`), and the env branch is checked first in that loop
  (`:189-193`). Therefore `resolved.resolved[key]?.source === 'env'` is true
  for exactly the keys where `resolveEnvOverride(key, env) !== undefined` is
  true — the equivalence Step 2 relies on.
- `packages/cli/src/commands/config/index.ts:1665-1683` —
  `resolveSurfaceFlags(options)` (`:1671`) counts the flags, throws
  `'--shared, --local, and --user flags are mutually exclusive; pass at most
one.'` when more than one is set, and returns `'shared' | 'local' | 'user' |
  'auto'`. Its doc comment (`:1665-1670`) already records that the message is
  byte-identical to the one `set` raised inline, because tests pin it.
- `packages/cli/src/commands/config/index.ts:3767` and `:3808` — the `set` and
  `unset` actions call `resolveSurfaceFlags(options)`.
- `packages/cli/src/commands/config/index.ts:3855-3868` — the `adopt` action
  carries a verbatim inline copy: the same `filter(Boolean).length` count
  (`:3855-3859`), the same thrown message (`:3860-3864`), and the same
  `shared`/`local`/`user`/`auto` ladder spelled as `let surface: ConfigSurface
= 'auto'` with `if/else if` (`:3865-3868`), followed by `runAdopt(template,
{ surface }, context, dependencies)` at `:3869`.
- Behavioral parity confirmed live on 0.2.66: `oat config set
git.defaultBranch main --shared --local`, `oat config unset git.defaultBranch
--shared --user`, and `oat config adopt bogus --shared --local` each printed
  `--shared, --local, and --user flags are mutually exclusive; pass at most
one.` and exited `1`. The `adopt` fold is therefore a pure de-duplication
  with no behavior change, and the three-command parity test is its control.
- The focused suites this plan's steps name
  (`src/commands/config/index.test.ts`, `src/config/resolve.test.ts`) pass at
  this `HEAD` (run 2026-09-08; part of a 12-file, 809-test green run).

### Source claims found false or narrower

1. `BL-260907-let-oat-config-unset-remove` names two affected keys
   (`documentation.excludes` and `documentation.instructionPointerExcludes`).
   There are **three**: `projects.defaultScope` fails identically and has its
   own lenient repair reader selected at `commands/config/index.ts:3085-3086`.
   This plan covers all three.
2. The item says the fix is to "read leniently for the targeted key before
   resolving the effective config". The lenient per-key read already exists in
   `removeFromSurface`; nothing new needs to be read leniently. The actual fix
   is to stop performing the strict effective read at all, because its only
   consumer is a three-key environment-override probe.
3. The item's criterion 1 says `unset` should work "for every catalogued key".
   Verified live: `unset` of an **unrelated** key while another key is
   malformed also exits 1 today (`oat config unset git.defaultBranch` with a
   malformed `documentation.excludes` printed `Invalid documentation.excludes`
   and exited `1`), and it still will after this plan. That case is out of
   reach for a bounded fix and is out of scope: see
   [Out of scope](#out-of-scope) for the `writeOatConfig` reason. `oat config
set` has the identical limitation today, so `unset` reaches parity with `set`
   rather than exceeding it.

## Dependencies

| Type             | Dependency                                                                                         | Required state                                                                                                                                      | Current state                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Soft adjacency   | [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)                     | Never in the same parallel group; both write `packages/cli/src/commands/config/index.ts`, its test, and `config/resolve.ts`. Merge this plan first. | Authored 2026-09-08 in the same wave-7 batch; not yet merged.                                                            |
| Soft adjacency   | [Warn on a wrong-typed documentation.root](./2026-09-08-warn-on-wrong-typed-documentation-root.md) | Never in the same parallel group; both write `packages/cli/src/commands/config/index.ts` and its test. Merge this plan first.                       | Authored 2026-09-08 in the same wave-7 batch; not yet merged.                                                            |
| Soft ordering    | [Close the docs-index follow-ups](./2026-09-08-close-the-docs-index-follow-ups.md)                 | Never in the same parallel group; both write `packages/cli/src/config/resolve.ts` and `resolve.test.ts`. Either order; re-anchor after the other.   | Authored 2026-09-08 in the same wave-7 batch; that plan already names "any wave-7 lane that writes `config/resolve.ts`". |
| Satisfied        | PR #273 (`feat: add provider-neutral remote project management`)                                   | Merged; its `commands/config/index.ts` additions are re-anchored in this plan.                                                                      | Merged 2026-09-08 (`7d70ac307`); every citation here is post-merge.                                                      |
| Soft integration | PR #190 (`ReviewPlan Stage A compatibility release`)                                               | Re-anchor `commands/config/index.ts` and `config/resolve.ts` citations if it merges first.                                                          | Open draft; its file list includes both files and their tests.                                                           |
| Soft distinct    | [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md)               | No file in common; may share a parallel group.                                                                                                      | Authored 2026-09-08; disjoint write surface.                                                                             |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                     | Affected | Files in common                                                                                                                     | Required update                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 (provider-neutral remote project management) — **landed**         | Done     | `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/config/index.test.ts`                                       | Merged before this revision; anchors already re-derived on the merged tree. No further action.                                                                                                                                           |
| PR #190 (ReviewPlan Stage A) lands                                        | Major    | `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/config/index.test.ts`, `packages/cli/src/config/resolve.ts` | Re-verify that `ENV_OVERRIDE_MAP` still has exactly three keys and that `resolveEnvOverride` is still the env branch of `resolveEffectiveConfig`; re-anchor `unsetConfigValue`, `resolveSurfaceFlags`, and the `adopt` action by symbol. |
| PR #125 (`oat-brainstorm` visual companion) lands                         | None     | None (verified on its paginated file list: no `packages/cli/src/config/**` or `packages/cli/src/commands/config/**` path).          | No action.                                                                                                                                                                                                                               |
| Sibling wave-7 lane `harden-normalized-config-maps` merges first          | Minor    | `packages/cli/src/commands/config/index.ts`, its test, `packages/cli/src/config/resolve.ts`                                         | Refresh the drift check against the integrated `HEAD` and re-anchor; the two changes are in different functions and do not conflict semantically.                                                                                        |
| Sibling wave-7 lane `warn-on-wrong-typed-documentation-root` merges first | Minor    | `packages/cli/src/commands/config/index.ts`, its test                                                                               | Same: refresh and re-anchor; that lane edits `runGet`/`runList` and the dependencies interface, not `unsetConfigValue` or the actions.                                                                                                   |
| Sibling wave-7 lane `close-the-docs-index-follow-ups` merges first        | Minor    | `packages/cli/src/config/resolve.ts`, `resolve.test.ts`                                                                             | It adds `documentation` defaults to `DEFAULT_SHARED_CONFIG`; `ENV_OVERRIDE_MAP` is untouched, so Step 2's equivalence holds. Re-anchor `:553` before Step 1.                                                                             |
| Any wave-7 lane that archives a backlog item merges                       | Minor    | `.oat/repo/pjm/backlog/index.md`                                                                                                    | Regenerate with `oat backlog regenerate-index` after integration rather than hand-merging; this lane archives its two items at close-out.                                                                                                |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- \
  packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts \
  packages/cli/src/config/resolve.ts \
  packages/cli/src/config/resolve.test.ts \
  packages/cli/src/config/oat-config.ts \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json
```

`config/oat-config.ts` is listed because the three lenient repair readers live
there and this plan depends on their behavior; it is **read**, never written.
`config/resolve.test.ts` is run by Step 1's verify, never written. The lockstep
`package.json` files are listed for drift awareness only; in lane mode this
plan never edits them.

If any listed file changed, re-anchor every `file:line` citation by symbol name
and re-run the three reproductions in
[Verified evidence](#verified-evidence). A material mismatch — for example
`unsetConfigValue` no longer calling `resolveEffectiveConfig`, or
`ENV_OVERRIDE_MAP` gaining a key that is not in `DEFAULT_SHARED_CONFIG` — is a
STOP condition.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before
  `pnpm test:smoke` / `pnpm test:release` and before the built-CLI Done check;
  not required for the focused vitest runs below.
- Typecheck: `pnpm type-check` → passes.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/commands/config/index.test.ts src/config/resolve.test.ts`
  → passes (verified green at this `HEAD`).
- Full test (uncached, evidence-grade): from the repository root,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`. A plain `pnpm test` is
  frequently a Turborepo cache replay (`cache hit, replaying logs`,
  `>>> FULL TURBO`) and is not evidence the suite ran. `pnpm test --force` does
  **not** force a re-run.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format` — neither of which CI runs. This plan touches no
  `tools/smoke` or `.agents/skills` path, so `pnpm check` is the binding one,
  but run all three.
- Capture each gate's exit code explicitly, for example
  `pnpm check > gate.log 2>&1; echo "exit=$?"`. Never derive success from a
  pipeline ending in a pager or filter.
- Skill versioning: **not applicable.** This plan changes no
  `.agents/skills/*/SKILL.md`, so there is no `metadata.version` bump to make.
  `pnpm run check:skill-bumps` must still pass, reporting nothing.
- Implementation pattern: `resolveSurfaceFlags` at
  `commands/config/index.ts:1671` is the exemplar the `adopt` fold matches. The
  test harness pattern is `createHarness({ cwd, home, env })` (`:39`) plus
  `runCommand(command, argv, globalArgv)` (`:117`) and `createRepoRoot()`
  (`:153`) in `commands/config/index.test.ts`.
- oxfmt owns formatting; never run oxfmt over an OAT `state.md`. This plan
  writes no `state.md`.
- `.oat/config.json` key parity: this plan adds and removes no config key, so
  `KEY_ORDER`, the describe catalog, and the docs key tables are untouched.
- Git/PR convention: do not push or open a PR unless the wave orchestration
  instructs it.

### Lane mode

**This plan runs as a LANE in wave 7**, in a worktree at
`.worktrees/wave-7/<lane>`, with a root review after. In lane mode the lane
runs focused tests plus `pnpm check`, `pnpm type-check`, a forced
`turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills`. The lane does **not** edit any lockstep release
file and does **not** run `pnpm release:check-versions` or
`pnpm release:validate`: the wave fan-in owns the single lockstep public-package
bump for the integrated wave and the full definition-of-done sequence. Only a
standalone execution bumps `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
itself, above freshly fetched `origin/main`, and runs all eight gates in order.

## Scope

### In scope

- `packages/cli/src/config/resolve.ts` — export `resolveEnvOverride`. No
  behavior change; the function body is untouched.
- `packages/cli/src/commands/config/index.ts` —
  - `unsetConfigValue`: replace the `resolveEffectiveConfig` call at
    `:2918-2922` and the `envShadowed` derivation at `:2923` with a direct
    `resolveEnvOverride(key, dependencies.processEnv) !== undefined` probe.
  - the `adopt` action at `:3855-3868`: replace the inline flag block with
    `const surface = resolveSurfaceFlags(options);`.
- `packages/cli/src/commands/config/index.test.ts` — the new and changed cases
  in [Test plan](#test-plan).

### Out of scope

- **Unsetting an unrelated key while a different key is malformed.** It exits 1
  today and still will. `removeFromSurface` writes through
  `dependencies.writeOatConfig`, and `writeOatConfig`
  (`config/oat-config.ts:1996-2003`) normalizes on write, so the write would
  either throw on the untargeted malformed sibling or silently destroy it.
  Making `unset` delete a value the operator did not name is worse than the
  refusal. `set` has the same limitation. A pinned control in the test plan
  records the refusal so it stays deliberate.
- `config/oat-config.ts` — the three lenient repair readers and
  `normalizeOatConfig` are read, not written. The sibling plans
  [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)
  and
  [Warn on a wrong-typed documentation.root](./2026-09-08-warn-on-wrong-typed-documentation-root.md)
  own that file in this wave.
- The PR #273 read-only refusal for `pjm.remote`, `pjm.remote.policy`, and
  `pjm.remote.schemaVersion` at `:2905-2915`, and
  `preservePjmRemotePolicyBoundary` (`:3116`). Both run unchanged; the first
  precedes the read this plan removes.
- `getConfigValue`, `listConfigKeys`, `setConfigValue`,
  `effectiveTerminalReviewerNotices` — all still call
  `resolveEffectiveConfig` (`:2262`, `:2338`, `:3273`), and must keep doing so.
  `get`, `list`, and `set` legitimately need the resolved view; only `unset`
  used it for a three-key boolean.
- `resolveEffectiveConfig` itself, and its strictness. Making the resolver
  lenient would weaken every reader in the CLI.
- The `--yes` compatibility flag on `adopt`, and everything `runAdopt` does
  after the surface is resolved.

## Current state

`packages/cli/src/commands/config/index.ts` is the whole `oat config` command
family: catalog (`KEY_ORDER`, the describe entries), per-key parsing, the four
read/write actions, the dispatch-matrix adoption path and, since PR #273, the
`pjm.remote` policy keys. Its dependencies are injected through
`ConfigCommandDependencies` (`:240-`, defaults `DEFAULT_DEPENDENCIES` at
`:1253`) and `createConfigCommand(overrides)` at `:3721`, which is what the
test harness drives.

`unsetConfigValue` (`:2894`) is the only action whose use of
`resolveEffectiveConfig` is a boolean probe rather than a value read. The
strict read at `:2918` runs after the surface validation and the `pjm.remote`
read-only refusal, but before the state-key refusal, the `tools.*` refusal, the
aggregate-key refusal, the surface defaulting, and `removeFromSurface` — so a
config the strict reader rejects aborts `unset` before any of that logic runs.

`removeFromSurface` (`:3001`) already encodes the correct behavior: for the
shared surface it selects a lenient repair reader for the three fail-closed
keys (`:3078-3087`), tries `removeConfigPath` on the normalized object, and
falls back to `removeConfigPathOnDisk` (`:3144`) when the normalized pass finds
nothing — which is exactly what happens for a malformed value, because the
lenient reader dropped it. The fallback re-parses the raw file, removes the
path, and writes the result back.

`resolveSurfaceFlags` (`:1671`) was extracted from `set` during wave-5 p05 so
`unset` could share it; `adopt` was not migrated at that time.

## Implementation steps

### 1. Export the environment-override probe

In `packages/cli/src/config/resolve.ts`, change `function resolveEnvOverride(`
at `:553` to `export function resolveEnvOverride(`. Do not change its body or
`ENV_OVERRIDE_MAP`.

Add a short comment above it recording why it is exported: `oat config unset`
needs "is this key environment-overridden?" without performing a whole-config
read that a malformed stored value aborts, and this map plus the env-first
branch in `resolveEffectiveConfig` is the single source of that answer.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/resolve.test.ts` → passes with no change in
case count.

### 2. Make the `unset` environment probe independent of the strict read

In `packages/cli/src/commands/config/index.ts`, add `resolveEnvOverride` to
the existing `@config/resolve` import group that closes at `:69`. In
`unsetConfigValue`, delete the `await dependencies.resolveEffectiveConfig(...)`
call at `:2918-2922` and replace the `envShadowed` derivation at `:2923` with:

```ts
// Deliberately not `resolveEffectiveConfig`: its result was used for this one
// boolean, and its strict normalization throws on exactly the malformed stored
// value `unset` exists to remove. `ENV_OVERRIDE_MAP` covers three keys, all of
// which are in `DEFAULT_SHARED_CONFIG` and therefore always present in the
// resolved view, and the env branch is checked first there -- so this probe
// answers identically for every config key.
const envShadowed =
  resolveEnvOverride(key, dependencies.processEnv) !== undefined;
```

Leave every other use of `dependencies.resolveEffectiveConfig` in the file
alone, leave the `pjm.remote` refusal at `:2905-2915` where it is, and leave
the `ConfigCommandDependencies` interface unchanged.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/config/index.test.ts` → passes, including
the two pre-existing environment-override cases at `index.test.ts:4953`
(`unset reports env-sourced values as not unsettable when the surface holds
nothing`) and `:4970` (`unset removes a stored value the env var only
shadows, and warns`).

### 3. Fold `adopt` onto the shared surface-flag resolver

In `packages/cli/src/commands/config/index.ts`, replace lines `:3855-3868`
inside the `adopt` action's `try` block with:

```ts
const surface = resolveSurfaceFlags(options);
```

so the block reads exactly like the `set` action at `:3767` and the `unset`
action at `:3808`. Delete the now-unused local `flagsPresent` computation and
the `let surface: ConfigSurface = 'auto'` ladder. Keep the surrounding
`try`/`catch`, the `--yes` option, and the `runAdopt(template, { surface },
context, dependencies)` call at `:3869` unchanged. If `ConfigSurface` becomes
an unused import in this file, leave the import list to `pnpm check` — do not
remove a type still used elsewhere in the file.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/config/index.test.ts` → passes, including
every existing `['adopt', 'dispatch-matrix', '--shared'|'--user']` case
(`index.test.ts:2403-3169`).

### 4. Add the regression and parity tests

Add the cases in [Test plan](#test-plan) to
`packages/cli/src/commands/config/index.test.ts`, inside the existing
`describe('unset', ...)` block at `:4478` for the unset cases and beside the
existing mutual-exclusion case at `:1442` for the three-command parity case.
Reuse `createRepoRoot` (`:153`), the `unset` block's `createHome` (`:4479`),
`writeSharedConfig` (`:4485`), `readSharedConfig` (`:4507`), `createHarness`,
and `runCommand` rather than introducing a new harness.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/config/index.test.ts -t 'malformed'` and
`... -t 'mutually exclusive'` → the new cases appear and pass (existing cases
whose names contain those words run too; that is fine).

### 5. Run the lane gates

**Verify (lane mode, the default under the wave-7 execution program):** from
the repository root, capturing each exit code explicitly:

```bash
pnpm check > /tmp/gate-check.log 2>&1; echo "check exit=$?"
pnpm type-check > /tmp/gate-typecheck.log 2>&1; echo "type-check exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/gate-test.log 2>&1; echo "test exit=$?"
pnpm run check:skill-bumps > /tmp/gate-bumps.log 2>&1; echo "skill-bumps exit=$?"
pnpm lint > /tmp/gate-lint.log 2>&1; echo "lint exit=$?"
pnpm format > /tmp/gate-format.log 2>&1; echo "format exit=$?"
pnpm oat:validate-skills > /tmp/gate-skills.log 2>&1; echo "validate-skills exit=$?"
```

Every line must report `exit=0`. Do not edit any lockstep release file and do
not run `pnpm release:check-versions` or `pnpm release:validate`; the wave
fan-in owns those. **Standalone mode only:** additionally bump the five public
package versions above freshly fetched `origin/main` and run the eight
AGENTS.md gates in order.

## Test plan

All cases live in `packages/cli/src/commands/config/index.test.ts`. The
structural pattern for the unset cases is the existing
`'unset removes an invalid stored value the normalizing reader drops'` at
`:4993`; for the parity case it is
`'set workflow.archiveOnComplete --shared --user rejects mutually exclusive
flags'` at `:1442` (and its `unset` twin at `:4904`).

1. **`unset removes a malformed documentation.excludes and leaves siblings
   intact`** — seed shared config
   `{ documentation: { excludes: 5, root: 'apps/docs' }, git: { defaultBranch:
'trunk' } }`; run `['unset', 'documentation.excludes']`; assert
   `process.exitCode` is `0`, `capture.info[0]` is
   `'documentation.excludes unset from shared config'`, and the re-read shared
   config still has `documentation.root === 'apps/docs'` and
   `git.defaultBranch === 'trunk'`.
   _Red before the fix:_ exits `1` with `Invalid documentation.excludes`.
2. **`unset removes a malformed documentation.instructionPointerExcludes`** —
   same shape with `{ documentation: { instructionPointerExcludes: 7, root:
'apps/docs' } }`.
   _Red before the fix:_ exits `1` with
   `Invalid documentation.instructionPointerExcludes`.
3. **`unset removes a malformed projects.defaultScope`** — seed
   `{ projects: { defaultScope: {}, root: '.oat/projects/shared' } }`; assert
   exit `0` and that `projects.root` survives. This is the key the backlog item
   does not name.
   _Red before the fix:_ exits `1` with `Invalid projects.defaultScope`.
4. **`unset removes a malformed projects.defaultScope and still warns about
the live environment override`** — seed the same malformed value **and** pass
   `env: { OAT_PROJECTS_DEFAULT_SCOPE: 'local' }` to `createHarness`. Assert
   exit `0`, that the value was removed, and that `capture.warn[0]` contains
   `'an environment variable override still supplies its effective value'`.
   This is the case that proves the new probe is not merely `false`: the old
   whole-config read could not reach it at all, because the malformed value
   aborted it.
   _Red before the fix:_ exits `1` with `Invalid projects.defaultScope`.
5. **`unset of an unrelated key still fails while another key is malformed`**
   — seed `{ documentation: { excludes: 5 }, git: { defaultBranch: 'trunk' } }`
   and run `['unset', 'git.defaultBranch']`; assert exit `1` and the
   `Invalid documentation.excludes` message. This pins the documented
   limitation as deliberate. It is **green both before and after** the change;
   its job is to fail loudly if a later change starts rewriting the file over a
   malformed sibling.
6. **`set, unset, and adopt reject the same conflicting surface flags with one
   message`** — for each of `['set', 'git.defaultBranch', 'main', '--shared',
'--local']`, `['unset', 'git.defaultBranch', '--shared', '--local']`, and
   `['adopt', 'dispatch-matrix', '--shared', '--local']`, run a fresh harness
   with `process.exitCode = undefined` and collect `capture.error[0]`. Assert
   all three are `'--shared, --local, and --user flags are mutually exclusive;
pass at most one.'` and all three exit `1`. Compare the strings to each
   other, not only to a literal, so a future message change has to move all
   three together.
7. **Existing cases that must stay green unchanged**: the two
   environment-override unset cases at `:4953` and `:4970`; the
   `'unset handles every key family in the live config catalog'` sweep at
   `:5257`; the three `pjm.remote` read-only refusals PR #273 added near
   `:5167-5250`; every `adopt dispatch-matrix` case from `:2403` to `:3169`.

### Red-then-green negative controls

Record each control's command and categorical outcome in the lane report.

- **Cases 1–4 (the unset fix).** Before Step 2, run the four new cases against
  the unmodified `unsetConfigValue`: each must fail with exit `1` and the
  `Invalid <key>` message. Capture that output. After Step 2, all four pass.
- **Case 6 (the adopt fold).** After Step 3, prove the parity test can fail:
  temporarily change the message thrown inside `resolveSurfaceFlags` (for
  example append `!`), confirm case 6 still passes (all three read the same
  helper, so they move together — this is the point), then temporarily restore
  the inline block in the `adopt` action with a _different_ message and confirm
  case 6 **fails** on the `adopt` string. Restore the folded call and confirm it
  passes again. Report both halves; the second half is the one that proves the
  test is load-bearing.
- **Case 5 (the pinned limitation).** Prove it can fail: temporarily make
  `removeFromSurface`'s shared branch fall through to
  `removeConfigPathOnDisk` unconditionally, confirm case 5 fails (the unrelated
  unset would then either succeed or throw from `writeOatConfig`), then revert.

### Weaker-anywhere rule

`unsetConfigValue` is a guarded write path, so any input it previously rejected
and now accepts is **Critical** unless this plan names it. The complete list of
newly-accepted inputs is: a config whose strict normalization throws, where the
key being unset is the one whose value is malformed. Nothing else changes —
`validateSurfaceForKey`, the `pjm.remote` read-only refusal, the state-key
refusal, the `tools.*` refusal, the aggregate-key refusal, and the
environment-override refusal all still run, and Case 5 pins that an unrelated
key is still refused. The `adopt` fold rejects exactly the same inputs it
rejected before, with the same message; Case 6 is its control. If the reviewer
finds any other newly-accepted input, that is a STOP condition.

## Done criteria

- [ ] `oat config unset documentation.excludes`,
      `oat config unset documentation.instructionPointerExcludes`, and
      `oat config unset projects.defaultScope` each exit `0` and remove the
      malformed stored value, with every sibling key intact, verified on the
      built CLI in a scratch repository (`pnpm build`, then run
      `node packages/cli/dist/index.js config unset <key>`).
- [ ] The environment-override refusal and the environment-override warning
      both still fire, including for a malformed `projects.defaultScope`
      (test-plan case 4).
- [ ] `oat config adopt` contains no inline surface-flag block; a grep for
      `flags are mutually exclusive` in
      `packages/cli/src/commands/config/index.ts` returns exactly one
      occurrence, inside `resolveSurfaceFlags`.
- [ ] Test-plan cases 1–6 pass, and the three negative controls were run with
      their pre-fix red state captured and reported.
- [ ] `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run
test --force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0` with the exit code
      captured explicitly.
- [ ] No lockstep release file is edited (lane mode), and
      `git status --short` contains no unexplained or out-of-scope file.
- [ ] Both source backlog items are linked from this plan and link back to it
      through `external_plans`.

## STOP conditions

Stop and report instead of improvising when:

- the drift check shows `unsetConfigValue` no longer calls
  `resolveEffectiveConfig`, or `resolveSurfaceFlags` no longer exists, or the
  `adopt` action no longer carries the inline block — the plan's premise is
  gone and it needs re-authoring, not adaptation;
- `ENV_OVERRIDE_MAP` has gained a key that is **not** present in
  `DEFAULT_SHARED_CONFIG`, which would break the equivalence Step 2 relies on
  (the correct response is a different derivation, not a silent behavior
  change);
- either environment-override case at `index.test.ts:4953` or `:4970` fails
  after Step 2 — the equivalence claim is false and must be re-derived before
  proceeding;
- test-plan case 5 turns green after Step 2, meaning the change reached beyond
  the targeted key and is now rewriting a file over a malformed sibling;
- the `adopt` fold changes any observable output, including the ordering of the
  flag check relative to the unknown-template error;
- any input previously rejected by `unsetConfigValue` becomes accepted beyond
  the single case named in the weaker-anywhere rule;
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands (it edits `packages/cli/src/commands/config/index.ts` and
  `packages/cli/src/config/resolve.ts`);
- any sibling wave-7 lane named in [Dependencies](#dependencies) merges, since
  each edits the same command file or `config/resolve.ts`;
- any cited line anchor in `commands/config/index.ts`, `config/resolve.ts`, or
  `commands/config/index.test.ts` moves;
- either reproduction in [Verified evidence](#verified-evidence) cannot be
  reproduced on the built CLI.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`, and record the refreshed comparison rather than re-stamping the
authored provenance.

## Review focus

- **The equivalence in Step 2.** The reviewer should independently confirm that
  `ENV_OVERRIDE_MAP` covers exactly three keys, that all three are in
  `DEFAULT_SHARED_CONFIG`, and that the env branch is first in
  `resolveEffectiveConfig`'s precedence loop. If any of those three facts is
  false, `unset` silently stops warning about a live environment override.
- **The removal of a read, not just of a throw.** `unsetConfigValue` no longer
  reads the effective config at all. Confirm nothing downstream in that
  function depended on the read having happened (for example as an implicit
  existence check on the config file).
- **That the `adopt` fold is behavior-preserving**, including the message and
  the point in the action at which the flag conflict is detected.
- **Deliberately deferred:** unsetting an unrelated key while another key is
  malformed still exits 1, for the `writeOatConfig` normalization reason in
  [Out of scope](#out-of-scope). Case 5 pins it. Widening that would require
  deciding what happens to an untargeted malformed sibling, which is a
  different decision than this plan makes.
- **Deliberately deferred:** `oat config set` and `oat config get` have the
  same cross-key limitation and are untouched here.
