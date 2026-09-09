---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-guard-normalized-config-maps
oat_issue_url: null
created: '2026-09-08T21:40:00Z'
---

# Harden normalized config maps against a preserved `__proto__` key

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The source item
> is a wave-6 follow-up whose upstream work (wave-6 p03, `config/json.ts`
> materialization) is merged at the inspected `HEAD`. The riskiest part is
> **not** the two named normalizers: fixing them makes a `__proto__` key
> visible to `Object.entries` for the first time, which newly exposes four
> assignment sites that are dormant today. Those are in scope, the exposure is
> reproduced on the built module below, and the plan's test plan requires an
> intermediate red to prove the closing step is load-bearing.
>
> This revision narrows the plan to the one backlog item above. The
> `documentation.root` warning that an earlier draft bundled here is a separate
> outcome and now lives in
> [Warn on a wrong-typed documentation.root](./2026-09-08-warn-on-wrong-typed-documentation-root.md).

## Outcome

Every map OAT rebuilds from parsed config data holds a key literally named
`__proto__` as an ordinary own key instead of installing it as the map's
prototype, and every user-named lookup on such a map is own-key guarded. That
covers the two normalizers the source item names (`normalizeRecordMap` and the
dispatch-matrix provider assignment), the four downstream sites that the fix
itself would otherwise newly expose (`mergeExecTargetLayer`,
`resolveExecTargetViews`, `applyDispatchMatrixRecommendation`,
`effectiveTerminalReviewerNotices`), and one pre-existing unguarded lookup in
the gate command. The remaining candidate sites — including the `pjm.remote`
maps PR #273 added — are swept, shown bounded or inert behind independent
guards, and pinned by a control rather than changed.
`DR-260907-oat-config-reads-materialize` drops its residual scoping sentence,
because the scope it described is closed.

## Source and live evidence

- Source artifact or scope: `.oat/repo/pjm/backlog/items/`
- Source backlog item:
  [BL-260908-guard-normalized-config-maps — Guard normalized config maps against a preserved proto key](../../pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree
  whose content this plan read (branch `wave-7-plans`, rebased onto the merged
  PR #273).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, also the merge-base; the branch adds only plan files, so
  every code citation is valid on both.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- CLI version at the inspected `HEAD`: `0.2.66`; `packages/cli/dist` was built
  from this tree and is the module every reproduction below imported.
- Related decision:
  [DR-260907-oat-config-reads-materialize](../decisions/DR-260907-oat-config-reads-materialize.md)
  — this plan edits its Consequences section.

### Verified evidence — the prototype hazard

- `packages/cli/src/config/json.ts:29-52,89` — the wave-6 materialization has
  landed: `parseJsonConfig` (`:50`) uses `parseTree` and defines every own key
  with `Object.defineProperty` (`:89`), so a `__proto__` key survives a read as
  an own data property. `packages/cli/src/config/json.test.ts:50` pins it. The
  premise of the source item therefore holds at this `HEAD`.
- `packages/cli/src/config/oat-config.ts:547-567` — `normalizeRecordMap`
  builds `const next: Record<string, T | null> = {}` at `:555` and assigns
  `next[key] = normalized` at `:562`. It backs `workflow.gates.execTargets`
  (`:862`) and `workflow.gates.skills` (`:870`). Reproduced through the built
  module's `readOatConfig` in a scratch repository with shared config
  `{"version":1,"workflow":{"gates":{"skills":{"__proto__":{"command":"echo pwned","onFailure":"block"},"real":{"command":"echo ok","onFailure":"warn"}}}}}`:
  `Object.keys(skills)` is `['real']`, `'command' in skills` is `true`,
  `Object.getPrototypeOf(skills) === Object.prototype` is `false`, and
  `for...in` yields `['real','command','onFailure','maxAttempts']`. Global
  `Object.prototype` is untouched (`({}).command` is `undefined`).
- `packages/cli/src/config/dispatch-matrix.ts:281-353` — `normalizeDispatchMatrix`
  builds `const providers: Record<string, WorkflowDispatchProviderValue> = {}`
  at `:288` and assigns at **two** sites: `providers[provider] = scalar` at
  `:307` and `providers[provider] = tiers` at `:343`. Reproduced with
  `"dispatchCeiling":{"providers":{"__proto__":{"high":"max"},"codex":{"high":"high"}}}`
  in the same fixture: `Object.keys(providers)` is `['codex']`, `'high' in
providers` is `true`, `providers.high` is `{"candidates":["max"]}`, and the
  map's prototype is not `Object.prototype`.
- `packages/cli/src/config/resolve.ts:270` — the gate lookup is
  `hasOwn`-guarded (`hasOwn` at `:570-572`), as the source item states.
- `packages/cli/src/commands/config/index.ts:2026-2062` — `providers[provider]`
  at `:2030` is unguarded, where `provider` comes from
  `parseDispatchCeilingProviderConfigKey(key)` (`:1305`) and therefore from a
  user-supplied config key (the only open key grammar `isConfigKey`, `:1277`,
  admits). The surrounding writes use computed object-literal keys
  (`[provider]:` at `:2044` and `:2059`), which use define semantics and are
  already safe; only the lookup needs a guard.
- The repository's own remedy pattern is `Object.fromEntries`:
  `config/oat-config.ts:1606-1612` (with the comment naming this exact hazard)
  and `commands/config/index.ts:2752-2765` (`withoutOwnKey`).

### Verified evidence — sites the fix would newly expose

This is the part the source item does not cover, and it is why the plan is
larger than the item's `XS` estimate. Today `Object.entries` on an affected map
does **not** yield `__proto__`, because the key became the prototype. Once
`normalizeRecordMap` and `normalizeDispatchMatrix` keep it as an own key, every
downstream loop that iterates those maps and assigns by computed member access
sees it for the first time.

- **Reproduced on the built module, not by analogy.** Importing
  `resolveExecTargets` and `resolveExecTargetViews` from
  `packages/cli/dist/config/resolve.js` and passing a `ResolvedConfig` whose
  `shared.workflow.gates.execTargets` is what a post-fix `normalizeRecordMap`
  would return — `Object.fromEntries([['__proto__', { runtime: 'shell',
baseCommand: 'echo pwned', priority: 1 }], ['real', {...}]])` — gives a
  registry whose `Object.getPrototypeOf(registry) === Object.prototype` is
  `false`, where `'baseCommand' in registry` is `true`, and whose own keys are
  only the three built-ins. `resolveExecTargetViews` on the same input returns
  views whose prototype is replaced and where `'target' in views` is `true`.
  The control, passing today's map (prototype already installed, key invisible
  to `Object.entries`), returns a clean registry: prototype intact,
  `'baseCommand' in registry` `false`. So the two normalizer fixes alone move
  the injection from the normalizer's map into the resolver's registry.
- `packages/cli/src/config/resolve.ts:370-409` — `mergeExecTargetLayer`
  iterates `Object.entries(layer)` (`:378`), `delete targets[id]` at `:380`,
  reads `const existing = targets[id]` at `:384`, and assigns `targets[id] =`
  at `:386` and `:406`. This is the site the reproduction above exercises.
- `packages/cli/src/config/resolve.ts:312-366` — `resolveExecTargetViews`
  iterates the same layers and does `targets[id] ?? views[id]?.target` at
  `:339`, `delete targets[id]` at `:340`, `views[id] =` at `:342` and `:355`,
  and `const target = targets[id]` at `:353`. Same exposure, same
  reproduction.
- `packages/cli/src/commands/config/index.ts:3236-3266` —
  `applyDispatchMatrixRecommendation` iterates
  `Object.entries(existingProviders)` (`:3245`) where `existingProviders` is
  `workflow?.dispatchCeiling?.providers` (a `normalizeDispatchMatrix` product),
  reads `recommendation.providers[provider]` at `:3246`, and assigns
  `providers[provider] =` at `:3252` and `:3254`. Same exposure by the same
  mechanism (not a public export, so not reproduced through `dist`; case 18
  reproduces it through `oat config adopt`).
- `packages/cli/src/commands/config/index.ts:3268-3291` —
  `effectiveTerminalReviewerNotices` iterates the same provider maps across
  three surfaces (`:3279-3281`), reads `effectiveProviders[provider]` at
  `:3283`, and assigns `effectiveProviders[provider] =` at `:3284`. Same
  exposure. **This site is not named in the source item.**
- `packages/cli/src/commands/gate/index.ts:1220` —
  `gates.execTargets?.[targetId]`, with `targetId` from
  `oat gate target set <id>` (the subcommand is `target`, `:4740`; there is no
  `exec-target` spelling). Unguarded today and unguarded after the fix: for a
  target id of `__proto__` with no own key present, it returns
  `Object.prototype`, which is truthy, so `setExecTarget` (`:1214`) takes the
  merge branch and silently omits the `priority: 0` default the create branch
  applies (`:1225`). The writes at `:1242` (computed literal key) and `:1254`
  (`delete`) are already safe. Pre-existing, one line to fix, in scope because
  the sweep criterion asks for it.

### Verified evidence — sites swept and shown bounded or inert

The source item lists four candidates and says none is reachable "because zod
strips `__proto__` before `mergeProviderConfigs`". Verified live, and there are
**two** independent guards, not one; PR #273 also added a new family that is
bounded by construction.

- Guard 1 (zod). `packages/cli/src/config/sync-config.ts:20` types
  `providers` as `z.record(ProviderConfigSchema)`. Loading a sync config
  containing `{"providers":{"__proto__":{"enabled":true},"claude":{"enabled":true}}}`
  through the built `loadSyncConfig` yields `providers` of
  `{"claude":{"enabled":true}}`, `'enabled' in providers` is `false`, and the
  map still has `Object.prototype`. The key is dropped before any of the
  candidate sites runs.
- Guard 2 (name validation). `packages/cli/src/commands/providers/set/index.ts:152-160`
  rejects any provider name not in `knownProviders`.
  `packages/cli/src/commands/init/index.ts:990-996` and
  `packages/cli/src/commands/sync/index.ts:239-245` iterate adapter names and
  detection results, never raw user strings.
- `packages/cli/src/config/sync-config.ts:37-51` (`mergeProviderConfigs`) and
  `:167-185` (`setProviderEnabled`, lookup at `:178`) are further sites in the
  same family, also behind guard 1. **`mergeProviderConfigs` is not named in
  the source item.**
- **PR #273's `pjm.remote` maps — bounded by construction, not by a guard.**
  `config/oat-config.ts:1094-1099` assigns `operations[operation] =` while
  iterating the constant `PJM_REMOTE_OPERATION_CLASSES` (`:987`), and
  `:1142-1161` assigns `providers[provider] = providerPolicy` while iterating
  the constant `PJM_REMOTE_PROVIDERS` (`:975`, `['github','linear','jira']`);
  an input key outside those lists is never read. In
  `commands/config/index.ts:2221-2251` (`applyPjmRemoteSharedValue`, `:2153`),
  `remote.policy.authority.operations[operation]` (`:2227`) and
  `remote.policy.providers[provider]` (`:2236`, `:2251`) take
  `operation`/`provider` from segments of a `ConfigKey` that `isConfigKey`
  (`:1277`) admits only from `KEY_ORDER`, whose `pjm.remote.policy.*` entries
  are generated from the same two constant lists (`:226-236`). No user string
  reaches those subscripts. Classified **safe-by-construction**; no change.

Because the guards are real and independent and the new family is bounded,
this plan pins guard 1 with a control and adds a pointer comment rather than
rewriting call sites for a hazard none of them admits.

### Source claims found false or narrower

1. The item cites `config/oat-config.ts:556-568` for `normalizeRecordMap`; the
   function is at `:547-567`, the fresh object at `:555`, the assignment at
   `:562`. The decision record repeats the `:556-568` anchor and is corrected
   by this plan. The item's `Object.fromEntries` precedent anchor
   (`config/oat-config.ts:1828`) is now the user-config write path at `:2175`;
   the closer precedent is `:1606-1612`.
2. The item names one assignment in `dispatch-matrix.ts` (`:343`). There are
   two: `:307` (the scalar branch) and `:343`. `:307` does not install a
   prototype — assigning a string to `__proto__` is a silent no-op — but it
   does silently drop the key, which is the same data-loss defect. Both are
   fixed by the same rewrite.
3. The item's estimate is `XS` and its remedy list has three sites. Live
   verification shows the two normalizer fixes **newly expose** four further
   assignment/lookup sites (`resolve.ts` twice, `commands/config/index.ts`
   twice) that are dormant today, reproduced on the built module above.
   Shipping the item's three-site fix alone would be a net regression, not a
   hardening. The true size is `M`.
4. The item's sweep list omits `commands/config/index.ts:3268-3291`
   (`effectiveTerminalReviewerNotices`), `config/sync-config.ts:37-51`
   (`mergeProviderConfigs`), `commands/sync/index.ts:239-245`,
   `commands/gate/index.ts:1220`, and the `pjm.remote` family PR #273 added
   after the item was written. All are covered here.
5. The item's `commands/config/index.ts:1921` and `:2947-2955` anchors are now
   `:2030` and `:3246-3254` after PR #273.

## Dependencies

| Type                  | Dependency                                                                                         | Required state                                                                                                                                                                                                                       | Current state                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Satisfied predecessor | Wave-6 p03 [Preserve proto-named config keys](./2026-09-03-preserve-proto-named-config-keys.md)    | Merged, so `config/json.ts` preserves the key and the hazard is live.                                                                                                                                                                | Merged; `config/json.ts` and `config/json.test.ts:50` verified at this `HEAD`.                                           |
| Satisfied             | PR #273 (`feat: add provider-neutral remote project management`)                                   | Merged; its `oat-config.ts` and `commands/config/index.ts` additions are classified in this plan.                                                                                                                                    | Merged 2026-09-08 (`7d70ac307`); every citation here is post-merge.                                                      |
| Soft adjacency        | [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md)                   | Never in the same parallel group; both write `packages/cli/src/commands/config/index.ts`, its test, and `config/resolve.ts`. Merge that plan **first**.                                                                              | Authored 2026-09-08 in the same wave-7 batch; not yet merged.                                                            |
| Soft adjacency        | [Warn on a wrong-typed documentation.root](./2026-09-08-warn-on-wrong-typed-documentation-root.md) | Never in the same parallel group; both write `config/oat-config.ts`, `commands/config/index.ts`, and their tests. Merge that plan **after** this one (it is smaller and touches `normalizeOatConfig`'s signature).                   | Authored 2026-09-08 in the same wave-7 batch (split from this plan); not yet merged.                                     |
| Soft ordering         | [Close the docs-index follow-ups](./2026-09-08-close-the-docs-index-follow-ups.md)                 | Never in the same parallel group; both write `packages/cli/src/config/resolve.ts` and `resolve.test.ts`. Either order; re-anchor after the other.                                                                                    | Authored 2026-09-08 in the same wave-7 batch; that plan already names "any wave-7 lane that writes `config/resolve.ts`". |
| Soft ordering         | [Guard bare proto in Markdown records](./2026-09-08-guard-bare-proto-in-markdown-records.md)       | Never in the same parallel group: it repairs the YAML title of this plan's source item and regenerates `.oat/repo/pjm/backlog/index.md`, and this lane archives that same item at close-out. Merge that guard **first**, as it asks. | Authored 2026-09-08; its Dependencies table names this lane and asks to land first.                                      |
| Soft integration      | PR #190 (`ReviewPlan Stage A compatibility release`)                                               | Re-anchor `commands/config/index.ts`, `config/oat-config.ts`, `config/resolve.ts` and `commands/gate/index.ts` if it merges first.                                                                                                   | Open draft; its paginated file list includes all four files and their tests.                                             |
| Soft distinct         | [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md)               | No file in common; may share a parallel group. This plan is scoped out of `commands/instructions/**`.                                                                                                                                | Authored 2026-09-08; disjoint write surface.                                                                             |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                     | Affected | Files in common                                                                                                                                                       | Required update                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR #273 (provider-neutral remote project management) — **landed**         | Done     | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts`, `.oat/repo/reference/decisions/index.md`                                        | Merged before this revision; anchors re-derived and its new map sites classified. No further action.                                                                                                               |
| PR #190 (ReviewPlan Stage A) lands                                        | Major    | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/gate/index.ts` | It rewrites the gate module; re-anchor `commands/gate/index.ts:1220` by symbol (`setExecTarget`) and re-run the exposure reproduction for `resolveExecTargets` before editing `config/resolve.ts`.                 |
| PR #125 (`oat-brainstorm` visual companion) lands                         | None     | None (verified on its paginated file list: no `packages/cli/src/config/**` or `packages/cli/src/commands/**` path in this plan's scope).                              | No action.                                                                                                                                                                                                         |
| Sibling wave-7 lane `fix-oat-config-unset-and-adopt` merges               | Minor    | `packages/cli/src/commands/config/index.ts`, its test, `packages/cli/src/config/resolve.ts`                                                                           | Expected: it merges first. Refresh the drift check against the integrated `HEAD` and re-anchor; the changes are in different functions (it exports `resolveEnvOverride`; this plan edits the exec-target helpers). |
| Sibling wave-7 lane `close-the-docs-index-follow-ups` merges first        | Minor    | `packages/cli/src/config/resolve.ts`, `resolve.test.ts`                                                                                                               | It edits `DEFAULT_SHARED_CONFIG` near `:74-80`; the exec-target helpers this plan edits are below `:312`. Re-anchor before Step 3.                                                                                 |
| Sibling wave-7 lane `guard-bare-proto-in-markdown-records` merges         | Minor    | `.oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md`, `.oat/repo/pjm/backlog/index.md`                                                          | Expected: it merges first. Its contract test then guards every Markdown file this plan writes; keep every occurrence of the key name inside backticks and regenerate the backlog index at close-out.               |
| Sibling wave-7 lane `warn-on-wrong-typed-documentation-root` merges first | Minor    | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts`, their tests                                                                     | Not expected, but harmless: it changes `normalizeOatConfig`'s signature and `runGet`/`runList`, none of which this plan edits. Refresh and re-anchor.                                                              |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- \
  packages/cli/src/config/oat-config.ts \
  packages/cli/src/config/oat-config.test.ts \
  packages/cli/src/config/dispatch-matrix.ts \
  packages/cli/src/config/dispatch-matrix.test.ts \
  packages/cli/src/config/resolve.ts \
  packages/cli/src/config/resolve.test.ts \
  packages/cli/src/config/sync-config.ts \
  packages/cli/src/config/sync-config.test.ts \
  packages/cli/src/config/json.ts \
  packages/cli/src/config/json.test.ts \
  packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts \
  packages/cli/src/commands/gate/index.ts \
  packages/cli/src/commands/gate/index.test.ts \
  packages/cli/src/commands/providers/set/index.ts \
  packages/cli/src/commands/init/index.ts \
  packages/cli/src/commands/sync/index.ts \
  .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md \
  .oat/repo/reference/decisions/index.md \
  .oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json
```

`config/json.ts`, `commands/providers/set/index.ts`, `commands/init/index.ts`
and `commands/sync/index.ts` are listed because the plan's premise or its
inert-sweep conclusion depends on them; they are **read**, never written
(`sync-config.test.ts` is written, `sync-config.ts` gains only a comment). The
source item is listed because a sibling lane repairs its title. The new files
`packages/cli/src/config/own-keys.ts` and
`packages/cli/src/config/own-keys.test.ts` do not exist at the inspected
`HEAD` (verified), so the diff cannot report them; confirm they are still
absent before Step 1. The lockstep `package.json` files are listed for drift
awareness only; in lane mode this plan never edits them.

If any listed file changed, re-anchor every `file:line` citation by symbol name
and re-run the reproductions in
[Verified evidence — the prototype hazard](#verified-evidence--the-prototype-hazard)
and
[Verified evidence — sites the fix would newly expose](#verified-evidence--sites-the-fix-would-newly-expose).
A material mismatch — for example `config/json.ts` no longer preserving the key,
which would remove this plan's premise entirely — is a STOP condition.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before
  `pnpm test:smoke` / `pnpm test:release` and before any built-module
  reproduction.
- Typecheck: `pnpm type-check` → passes.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/config src/commands/config/index.test.ts src/commands/gate/index.test.ts`
  → passes (the named files were green at this `HEAD` in a 12-file, 809-test
  run).
- Full test (uncached, evidence-grade): from the repository root,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`. A plain `pnpm test` is
  frequently a Turborepo cache replay; `pnpm test --force` does not force a
  re-run. The isolated `HOME` also keeps a maintainer's `~/.oat/templates/`
  out of the bundle-tier resolution order.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format`, neither of which CI runs.
- Capture each gate's exit code explicitly, for example
  `pnpm check > gate.log 2>&1; echo "exit=$?"`.
- Skill versioning: **not applicable.** This plan changes no
  `.agents/skills/*/SKILL.md`, so there is no `metadata.version` bump.
  `pnpm run check:skill-bumps` must still pass, reporting nothing.
- **Markdown hazard:** oxfmt rewrites a bare occurrence of the key name in
  Markdown prose into bold text, destroying it silently. Every occurrence in
  the decision record this plan edits, and in any note it writes, must stay
  inside backticks. Verify after formatting with
  `grep -n '\*\*proto\*\*' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
  → no output. Once the sibling guard lane merges, its contract test
  (`packages/cli/src/validation/markdown-proto-literal-contract.test.ts`)
  enforces this across `.oat/repo/**`.
- Decision records: never hand-edit the generated index. After changing a
  record, run `oat decision regenerate-index`. Before any decision-surface
  write, run `oat pjm doctor --json` and require `adoption.state` of `declared`
  or `inferred-legacy` (it reported `declared` at this `HEAD`).
- Implementation pattern: `Object.fromEntries` over `Object.entries(...)`, as
  at `config/oat-config.ts:1609` and `commands/config/index.ts:2763`; and
  `Object.defineProperty` for imperative accumulation, as in
  `config/json.ts:89`. Existing private `hasOwn` helpers live at
  `config/resolve.ts:570` and `config/user-sync-config.ts:106`; this plan adds
  one shared module rather than a third copy.
- Import path convention: same-directory `./own-keys` from other
  `packages/cli/src/config/*` modules; the `@config/own-keys` alias
  (`packages/cli/tsconfig.json:17`) from `packages/cli/src/commands/**`. No
  parent-relative imports.
- oxfmt owns formatting; never run oxfmt over an OAT `state.md`. This plan
  writes no `state.md`.
- `.oat/config.json` key parity: this plan adds and removes no config key.
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
standalone execution bumps the five public packages itself, above freshly
fetched `origin/main`, and runs all eight gates in order.

## Scope

### In scope

- **New** `packages/cli/src/config/own-keys.ts` — `getOwnKey` and `setOwnKey`
  helpers, plus `packages/cli/src/config/own-keys.test.ts`.
- `packages/cli/src/config/oat-config.ts` — `normalizeRecordMap`
  (`:547-567`) only.
- `packages/cli/src/config/dispatch-matrix.ts` — `normalizeDispatchMatrix`
  (`:281-353`), both assignment sites.
- `packages/cli/src/config/resolve.ts` — `mergeExecTargetLayer` (`:370-409`)
  and `resolveExecTargetViews` (`:312-366`).
- `packages/cli/src/commands/config/index.ts` — the lookup at `:2030`,
  `applyDispatchMatrixRecommendation` (`:3236-3266`), and
  `effectiveTerminalReviewerNotices` (`:3268-3291`).
- `packages/cli/src/commands/gate/index.ts` — the lookup at `:1220` only.
- `packages/cli/src/config/sync-config.ts` — a comment above
  `mergeProviderConfigs` naming the two guards and the pinning test. No
  behavior change.
- Tests: `config/oat-config.test.ts`, `config/dispatch-matrix.test.ts`,
  `config/resolve.test.ts`, `config/sync-config.test.ts`,
  `commands/config/index.test.ts`, `commands/gate/index.test.ts`.
- `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md` —
  the residual scoping paragraph in Consequences, plus the corrected
  `:556-568` anchor; then `oat decision regenerate-index`, which rewrites
  `.oat/repo/reference/decisions/index.md`.

### Out of scope

- **The `documentation.root` typed warning** — split into
  [Warn on a wrong-typed documentation.root](./2026-09-08-warn-on-wrong-typed-documentation-root.md).
  Do not change `normalizeOatConfig`'s signature, `readOatConfig`, `runGet`, or
  `runList` here.
- **`packages/cli/src/commands/instructions/**` — do not touch.\*\* It is the
  write surface of the sibling wave-7 lane
  [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md).
- `config/json.ts` — the parse chokepoint is correct and owned by the merged
  wave-6 plan.
- `config/resolve.ts:270` (`resolveGateWithSource`) — already `hasOwn`-guarded.
- The five sync-config-family call sites and the `pjm.remote` family in
  [Verified evidence — sites swept and shown bounded or inert](#verified-evidence--sites-swept-and-shown-bounded-or-inert):
  swept, classified, pinned by a control, and left unchanged apart from one
  comment.
- `normalizePjmConfig` and everything PR #273 added under `pjm.remote` in
  `config/oat-config.ts:921-1343` and `commands/config/index.ts:2153-2252`
  — bounded by constant key lists; classified, not edited.
- `resolveEffectiveConfig`'s strictness, and the `oat config unset` behavior
  owned by the sibling lane
  [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md).

## Current state

`packages/cli/src/config/json.ts` is the single parse chokepoint and, since
wave-6, returns ordinary objects on which a key named `__proto__` is an own
data property. Everything downstream that copies such an object into a fresh
map by member assignment reinstalls the key as that map's prototype: the key
disappears from `Object.keys` and `Object.entries` while `in`, `for...in`, and
plain member reads see the injected members. Global `Object.prototype` is never
touched, so this is a per-map defect, not process-wide pollution.

`normalizeRecordMap` (`config/oat-config.ts:547`) backs
`workflow.gates.execTargets` (`:862`) and `workflow.gates.skills` (`:870`).
`normalizeDispatchMatrix` (`config/dispatch-matrix.ts:281`) backs
`workflow.dispatchCeiling.providers` and is called from
`config/oat-config.ts:830`, `commands/config/index.ts:1873`,
`commands/project/dispatch-ceiling/index.ts:470` and
`providers/cursor/codec/sync-extension.ts:279`.

The consumers of those maps split into four groups: `hasOwn`-guarded
(`config/resolve.ts:270`), safe-by-construction (object spread, computed
literal keys, and loops over constant key lists such as the `pjm.remote`
normalizers), inert behind an upstream guard (the sync-config family), and
unguarded member access on a user-named key. Only the last group needs work,
and it is larger after the normalizers are fixed than before, because the fix
is what makes the key visible to `Object.entries`.

## Implementation steps

Steps 1–5 are the code change; step 6 is the decision record; step 7 is the
gates. Execute in order — step 3 exists only because steps 1 and 2 create the
exposure it closes.

### 1. Add the own-key helpers

Create `packages/cli/src/config/own-keys.ts` exporting exactly two functions:

```ts
/**
 * Read `key` from `map` only when it is an own key.
 *
 * Since `config/json.ts` materializes a key literally named `__proto__` as an
 * own data property, config-derived maps can carry names that also exist on
 * `Object.prototype`. A bare `map[name]` for a user-supplied name would
 * otherwise return an inherited member -- `Object.prototype` itself for
 * `__proto__`, a function for `constructor` or `toString` -- and read as
 * configuration that nobody wrote.
 */
export function getOwnKey<T>(
  map: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key)
    ? (map as Record<string, T>)[key]
    : undefined;
}

/**
 * Define `key` on `map` as an own data property.
 *
 * `map[key] = value` reaches the legacy prototype setter for a key named
 * `__proto__`, which loses the entry as data and installs its value as the
 * map's prototype. `Object.defineProperty` never invokes that setter. The
 * descriptor matches an ordinary assignment so the result is an unremarkable
 * object, exactly as `config/json.ts` does.
 */
export function setOwnKey<T>(
  map: Record<string, T>,
  key: string,
  value: T,
): void {
  Object.defineProperty(map, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
```

Add `packages/cli/src/config/own-keys.test.ts` with the cases named in the
[Test plan](#test-plan).

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/own-keys.test.ts` → all cases pass.

### 2. Rebuild the two normalizers with `Object.fromEntries`

In `packages/cli/src/config/oat-config.ts`, rewrite `normalizeRecordMap`
(`:547-567`) to accumulate `[key, value]` pairs into a local array and return
`Object.fromEntries(entries)` when the array is non-empty, `undefined`
otherwise. Preserve every existing rule exactly: the `isRecord` guard, the
`!key.trim()` skip, and "keep the entry only when `normalizeValue` returned
something other than `undefined`" (a `null` return is a real entry and must
survive). Add a comment naming the hazard and pointing at
`config/oat-config.ts:1606-1612` as the precedent.

In `packages/cli/src/config/dispatch-matrix.ts`, rewrite
`normalizeDispatchMatrix` (`:281-353`) the same way: accumulate provider
entries into a local array at both `:307` and `:343`, and build `providers`
with `Object.fromEntries` for both the early malformed-root return and the
normal return. Leave `tiers[tier as WorkflowDispatchMatrixTier] = normalized`
at `:338` alone — `tier` is validated against `VALID_DISPATCH_MATRIX_TIERS` at
`:325`, so it can never be `__proto__` — and say so in a comment so a later
reader does not "fix" it.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/oat-config.test.ts src/config/dispatch-matrix.test.ts`
→ passes, then re-run the two live reproductions from
[Verified evidence — the prototype hazard](#verified-evidence--the-prototype-hazard)
after `pnpm build`: `Object.keys(skills)` must now include the key,
`'command' in skills` must be `false`, and `Object.getPrototypeOf(skills)` must
be `Object.prototype`. The same for the dispatch-ceiling providers map.

### 3. Close the sites the fix newly exposes

This step is not optional. Steps 1–2 make `Object.entries` yield the key for
the first time; without this step the injection simply moves one layer
downstream, as the built-module reproduction shows.

In `packages/cli/src/config/resolve.ts`, import `getOwnKey` and `setOwnKey`
from `./own-keys` and apply them in:

- `mergeExecTargetLayer` (`:370-409`) — `const existing = getOwnKey(targets,
id)` at `:384`, `setOwnKey(targets, id, ...)` at `:386` and `:406`. Leave
  `delete targets[id]` at `:380` as is: `delete` removes an own key and is a
  no-op otherwise, so it is already correct.
- `resolveExecTargetViews` (`:312-366`) — `getOwnKey(targets, id)` and
  `getOwnKey(views, id)?.target` at `:339`, `setOwnKey(views, id, ...)` at
  `:342` and `:355`, `getOwnKey(targets, id)` at `:353`. The
  `mergeExecTargetLayer(targets, { [id]: override })` call at `:352` builds
  its one-entry layer with a computed literal key, which is define semantics
  and already safe.

In `packages/cli/src/commands/config/index.ts`, import `getOwnKey` and
`setOwnKey` from `@config/own-keys` and apply them in:

- `:2030` — `const existingProviderValue = getOwnKey(providers, provider);`.
  Leave the two computed-literal writes at `:2044` and `:2059` unchanged and
  add a one-line comment recording that a computed key in an object literal
  uses define semantics and is already safe.
- `applyDispatchMatrixRecommendation` (`:3236-3266`) —
  `getOwnKey(recommendation.providers, provider)` at `:3246`, and
  `setOwnKey(providers, provider, ...)` at `:3252` and `:3254`. The initial
  `{ ...recommendation.providers }` spread is safe and stays.
- `effectiveTerminalReviewerNotices` (`:3268-3291`) —
  `getOwnKey(effectiveProviders, provider)` at `:3283` and
  `setOwnKey(effectiveProviders, provider, ...)` at `:3284`.

In `packages/cli/src/commands/gate/index.ts`, change `:1220` to
`const existing = getOwnKey(gates.execTargets ?? {}, targetId);`, importing
`getOwnKey` from `@config/own-keys`. Change nothing else in that file; the
computed-key write at `:1242` and the `delete` at `:1254` are already safe.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts src/commands/gate/index.test.ts`
→ passes.

### 4. Record the swept-and-inert family

In `packages/cli/src/config/sync-config.ts`, add a comment above
`mergeProviderConfigs` (`:37`) recording that provider names reaching this
family are guarded twice — `SyncConfigSchema.providers` (`:20`) is a
`z.record`, which drops a `__proto__` key during parsing, and
`commands/providers/set/index.ts` rejects any name outside `knownProviders` —
and naming the test added in the [Test plan](#test-plan) as the pin. Change no
code here.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/sync-config.test.ts` → passes, including the
new zod-strip control.

### 5. Prove the sweep is complete

Run the enumeration that produced this plan's site list and confirm every hit
is either fixed, guarded, safe-by-construction, or listed as inert:

```bash
cd packages/cli
grep -rn 'providers\[\|targets\[\|views\[\|skills\[\|execTargets\[\|operations\[\|merged\[\|next\[' \
  --include='*.ts' src | grep -v '\.test\.ts'
```

At the inspected `HEAD` the expected classification is: `config/oat-config.ts:562`
(fixed, Step 2), `:1097` and `:1161` (safe — constant key lists);
`config/dispatch-matrix.ts:307` and `:343` (fixed, Step 2);
`config/resolve.ts:339,340,342,353,355,380,384,386,406` (fixed, Step 3; the
two `delete`s are already safe); `commands/config/index.ts:2030,3246,3252,3254,3283,3284`
(fixed, Step 3), `:2227,2236,2251` (safe — catalogued `pjm.remote` keys);
`commands/gate/index.ts:1220` (fixed, Step 3), `:1254` (safe — `delete`);
`config/sync-config.ts:178`, `commands/init/index.ts:992-993`,
`commands/sync/index.ts:241-242` (inert — guard 1 and guard 2). Record the
classification of every line in the lane report. A hit that is none of the
four categories is a STOP condition.

**Verify:** the command runs and every reported line is classified in the lane
report.

### 6. Update the decision record

Run `oat pjm doctor --json` and require `adoption.state` of `declared` or
`inferred-legacy` (STOP otherwise). Read
`.oat/repo/reference/decisions/AGENTS.md`. Then edit
`.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`:

- Replace the paragraph beginning "That equivalence is scoped to the parsed
  objects themselves…" (line 23 at this `HEAD`) so it no longer scopes the
  equivalence away. State that the downstream normalizers now build their maps
  with `Object.fromEntries`, that the sites the change exposed are guarded
  with own-key access, that the `pjm.remote` maps iterate constant key lists,
  and that the sync-config family is inert behind zod's record parsing and
  provider-name validation. Name this plan and the backlog item.
- Correct the `config/oat-config.ts:556-568` anchor to the live
  `normalizeRecordMap` location and the `commands/config/index.ts:1921`
  anchor to its live location.
- Keep every occurrence of the key name inside backticks.

Then run `oat decision regenerate-index`. Do not hand-edit
`.oat/repo/reference/decisions/index.md`.

**Verify:**
`grep -c 'That equivalence is scoped' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
→ `0`; and
`grep -n '\*\*proto\*\*' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md .oat/repo/reference/decisions/index.md`
→ no output.

### 7. Run the lane gates

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
not run `pnpm release:check-versions` or `pnpm release:validate`. **Standalone
mode only:** additionally bump the five public package versions above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

### New file `packages/cli/src/config/own-keys.test.ts`

1. `setOwnKey` stores the key name `__proto__` as an own key: after the call,
   `Object.keys(map)` contains it, `Object.getPrototypeOf(map)` is
   `Object.prototype`, and `map` round-trips through `JSON.stringify` with the
   key intact.
2. `setOwnKey` on an ordinary name behaves exactly like assignment
   (enumerable, writable, configurable; overwrite works).
3. `getOwnKey` returns `undefined` for `__proto__`, `constructor`, and
   `toString` on a map that does not own them, and the stored value when it
   does.

### `packages/cli/src/config/oat-config.test.ts`

Structural pattern: `'normalizes workflow.gates.skills entries and preserves
null tombstones'` at `:2003` and its `execTargets` twin at `:2065`.

4. `normalizeRecordMap` through `readOatConfig`: the gate-skills fixture from
   [Verified evidence](#verified-evidence--the-prototype-hazard) yields a
   `skills` map where the key is an own key, `'command' in skills` is `false`,
   `for...in` yields only the two entry names, and
   `Object.getPrototypeOf(skills)` is `Object.prototype`.
   _Red before Step 2:_ `Object.keys` omits the key, `'command' in skills` is
   `true`.
5. A `null` entry in a record map still survives normalization (the
   `normalizeValue` contract distinguishes `null` from `undefined`; `:2003`
   already asserts tombstones survive — extend or mirror it); this guards the
   rewrite in Step 2 against collapsing the two.

### `packages/cli/src/config/dispatch-matrix.test.ts`

Structural pattern: `describe('normalizeDispatchMatrix')` at `:5`; the
`malformed-tier` / `malformed-provider` issue assertions at `:112-117`.

6. `normalizeDispatchMatrix` with a `__proto__` provider carrying a tier map
   keeps it as an own key and leaves the result's prototype as
   `Object.prototype`.
   _Red before Step 2:_ `'high' in providers` is `true` and the prototype is
   replaced.
7. The same with a **scalar** `__proto__` provider value, which today is
   silently dropped rather than installed (the `:307` branch the item does not
   name). After the fix the key is present as an own key.
8. A provider whose tier keys include a name that is not in
   `VALID_DISPATCH_MATRIX_TIERS` still produces a `malformed-tier` issue —
   the tier loop must not have been loosened by the rewrite.

### `packages/cli/src/config/resolve.test.ts`

Structural pattern: `describe('resolveExecTargets')` at `:1710` with the
`createResolvedConfig()` helper (used at `:1745`), and `describe('resolveGate')`
at `:1597`.

9. `resolveExecTargets` with an `execTargets` layer that owns a `__proto__`
   key (build it with `Object.fromEntries`, exactly as the reproduction did)
   returns a registry whose prototype is `Object.prototype`, where
   `'baseCommand' in registry` is `false`, and whose built-in targets are
   unchanged.
   _Red after Step 2 and before Step 3:_ the registry's prototype is
   replaced. **This case must be written and observed red at that exact
   intermediate state**, because it is the regression Step 2 would ship on its
   own. (Before Step 2 it is trivially green: the normalizer never hands the
   resolver such a map. The built-module reproduction in the evidence section
   is what shows the red will appear.)
10. `resolveExecTargetViews` on the same input returns views whose prototype
    is `Object.prototype` and does not report a view for the injected name.
11. `resolveGateWithSource` still resolves a real skill name and still returns
    `{ gate: null, source: null }` for a skill named `__proto__` that no layer
    owns (the existing `hasOwn` guard, pinned so a later refactor cannot drop
    it).

### `packages/cli/src/config/sync-config.test.ts`

Structural pattern: `'merges per-provider overrides'` at `:148` and
`'rejects invalid config with CliError'` at `:182`.

12. `loadSyncConfig` on `{"providers":{"__proto__":{"enabled":true},"claude":{"enabled":true}}}`
    returns providers of exactly `{ claude: { enabled: true } }`, with
    `'enabled' in providers` `false` and the prototype intact. This pins guard
    1; if a future zod upgrade stops stripping the key, this test fails and the
    swept-inert conclusion in Step 4's comment is re-opened.

### `packages/cli/src/commands/config/index.test.ts`

Structural pattern: the `adopt dispatch-matrix` cases at `:2379-3169`
(`createHarness`, `runCommand`, `readSharedConfig`).

13. `oat config set workflow.dispatchCeiling.providers.__proto__.high <value>`
    (or the closest spelling the key grammar at `:1305` accepts) does not
    replace the prototype of the written providers map, and `oat config get`
    of an ordinary provider key is unaffected. If the grammar rejects the
    segment outright, assert that rejection instead and record that `:2030`
    is additionally guarded by the parser.
14. `oat config adopt dispatch-matrix --shared` against a shared config whose
    providers map owns a `__proto__` key writes a providers map whose prototype
    is `Object.prototype` and preserves the recommendation's real providers.
    _Red after Step 2 and before Step 3._

### `packages/cli/src/commands/gate/index.test.ts`

Structural pattern: `'sets exec targets and preserves provider flags in JSON
argv inputs'` at `:1579`, which drives `runGateCommand(root, home, ['target',
'set', '<id>', '--runtime', ..., '--base-command-json', ...])` and reads back
through `readResolvedTargets`.

15. `oat gate target set __proto__ --runtime codex --base-command-json
'["codex","exec"]'` creates the target with the `priority: 0` default rather
    than taking the merge branch against `Object.prototype`, and does not
    replace the prototype of the stored `execTargets` map. If the command
    rejects the id before reaching `setExecTarget`, assert that rejection,
    record the site as guarded-by-validation, and still apply the one-line
    change (it is then defensive, and the sweep classification says so).
    _Red before Step 3 (when the id is accepted):_ the create-branch default
    is missing.

### Red-then-green negative controls

Each control must be run, its red state captured, and both halves reported.

- **Cases 4, 6, 7 (the normalizers).** Run them against the unmodified
  `normalizeRecordMap` / `normalizeDispatchMatrix`: each fails on the
  prototype assertion. Then apply Step 2 and confirm green.
- **Cases 9, 10, 14, 15 (the exposure).** Run them at the intermediate state
  after Step 2 and **before** Step 3: cases 9, 10 and 14 must fail there, and
  case 15 must fail both before and after Step 2. This is the control that
  proves Step 3 is load-bearing rather than defensive decoration. Then apply
  Step 3 and confirm green. Report the intermediate red explicitly.
- **Case 12 (the inert sweep).** Prove it can fail by temporarily replacing
  `SyncConfigSchema`'s `z.record` parse result with the raw parsed object in a
  scratch copy of the assertion; confirm the case fails; restore.
- **Case 5 (the `null` entry).** Prove it can fail: temporarily change the
  Step 2 rewrite's filter from `!== undefined` to a truthiness check, confirm
  case 5 breaks, restore.

### Weaker-anywhere rule

`normalizeRecordMap` and `normalizeDispatchMatrix` are readers and
normalizers, so **any input previously rejected that becomes accepted is
Critical.** The intended change is narrow: a map entry whose key is
`__proto__` (or any other `Object.prototype` member name) is now retained as
data where it was previously turned into a prototype or silently dropped. The
set of _values_ accepted for each entry is unchanged, because
`normalizeValue`, `normalizeMatrixCell`, and every tier and scalar validator
are untouched. In particular:

- an entry whose key fails `!key.trim()` must still be skipped;
- an entry whose normalizer returns `undefined` must still be dropped, while a
  `null` return must still be kept (case 5);
- a malformed tier must still produce a `malformed-tier` issue (case 8);
- an empty provider object must still produce a `malformed-provider` issue.

If the reviewer finds any other newly-accepted input, that is a STOP condition.

## Done criteria

- [ ] `normalizeRecordMap` and `normalizeDispatchMatrix` build their maps with
      `Object.fromEntries`; a live built-module reproduction shows the key as
      an own key with `Object.getPrototypeOf(map) === Object.prototype` for
      both the gate-skills and the dispatch-ceiling-providers fixtures.
- [ ] Every user-named lookup on a config-derived map is own-key guarded:
      `commands/config/index.ts:2030`, `:3246`, `:3283`,
      `config/resolve.ts` in `mergeExecTargetLayer` and
      `resolveExecTargetViews`, and `commands/gate/index.ts:1220`.
- [ ] The Step 5 enumeration is recorded in the lane report with every hit
      classified as fixed, guarded, safe-by-construction, or inert, and the
      list matches the expected classification in Step 5 (or every difference
      is explained).
- [ ] The sync-config family is unchanged in behavior, carries the guard
      comment, and is pinned by test case 12.
- [ ] `packages/cli/src/config/json.test.ts` still passes unchanged.
- [ ] `DR-260907-oat-config-reads-materialize` no longer contains the residual
      scoping sentence, carries the corrected anchors, and
      `.oat/repo/reference/decisions/index.md` was regenerated with
      `oat decision regenerate-index` rather than hand-edited.
- [ ] No bolded mangled form of the key name appears in any Markdown file this
      plan wrote (`grep -rn '\*\*proto\*\*'` over the changed Markdown files
      returns nothing).
- [ ] Test-plan cases 1–15 pass, and every negative control in
      [Red-then-green negative controls](#red-then-green-negative-controls) was
      run with its red state captured — including the intermediate
      after-Step-2-before-Step-3 red for cases 9, 10 and 14.
- [ ] `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run
test --force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0` with the exit code
      captured explicitly.
- [ ] No lockstep release file is edited (lane mode), no file under
      `packages/cli/src/commands/instructions/` is touched,
      `normalizeOatConfig`'s signature is unchanged, and
      `git status --short` contains no unexplained or out-of-scope file.
- [ ] The source backlog item is linked from this plan and links back to it
      through `external_plans`.

## STOP conditions

Stop and report instead of improvising when:

- the drift check shows `config/json.ts` no longer preserves the key as an own
  data property — this plan's entire premise is that wave-6 p03 landed, and
  without it the normalizer changes are unmotivated;
- `oat pjm doctor --json` reports adoption `none` or
  `partial-initialization`, so the decision record cannot be written
  (initialize with `oat pjm init` first);
- the Step 5 enumeration surfaces a site that is not fixed, guarded,
  safe-by-construction, or on the inert list — the sweep criterion is not met
  and the site needs a decision, not an improvised guard;
- test cases 9, 10 or 14 do **not** fail at the intermediate state after Step
  2 and before Step 3 — either the exposure analysis is wrong or the test does
  not exercise it, and both need resolving before the change can be trusted;
- any input previously rejected by a normalizer becomes accepted beyond the
  key-retention change named in the weaker-anywhere rule;
- test case 12 fails, meaning zod no longer strips the key and the
  swept-inert conclusion for the sync-config family is void;
- the change would require editing any file under
  `packages/cli/src/commands/instructions/`, or changing `normalizeOatConfig`'s
  signature, `readOatConfig`, `runGet`, or `runList` — those belong to sibling
  lanes in this wave;
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

**Refresh applied 2026-09-09 (wave-7 p05, post-STOP amendment; widens In scope by three files and amends Steps 3, 5, and 6, the Test plan, and the Done criteria — the Outcome, the weaker-anywhere rule, and every other STOP stand):** the lane ran Step 5's `src`-wide enumeration on the group-2 base (`15c9a3b09`) and surfaced four member-access sites that this plan's evidence sections, which were derived from the files it inspected, never classified — the plan's own STOP. Each was reproduced on the built CLI with a passing control. Decision: **A is part of this plan's Outcome and is fixed here; B, C, and D are the same own-key lookup class on user-supplied ids and are guarded here, because the helper exists now and leaving three known `__proto__`-id crash or corrupt-output paths behind would be the residue the source item names.** (A) `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2110-2111` — `mergeEffectiveDispatchMatrix` iterates `Object.entries` over the normalized product and does `merged[provider]` read/assign, so the own `__proto__` key Step 2 now preserves is swallowed one layer downstream (`oat project dispatch-ceiling resolve --provider codex` reports matrix keys `["codex","claude","cursor"]`, `hasOwnProperty('__proto__') === false`) — apply `getOwnKey`/`setOwnKey` exactly as Step 3 does at the other assignment sites. (B) `packages/cli/src/commands/gate/index.ts:1865` — `resolveSelectedExecTarget` does `targets[explicitTarget]` with the user's `--target <id>`, so `--target __proto__` (or `constructor`) throws `Cannot read properties of undefined (reading 'length')` instead of the adjacent `Unknown exec target "…"` error — read through `getOwnKey` so a prototype id takes the existing unknown-target path. (C) `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2628` and `:2792` — `resolution.providers[resolution.provider]` where the provider type is an open string union, so `--provider __proto__` prints `Mode: unsupported (undefined)` (the `if (providerResolution)` guard takes the true branch on `Object.prototype`) instead of `unsupported (none)` — read through `getOwnKey` so a prototype id resolves like any unknown provider. **Correction applied 2026-09-09 (from the p05 root review):** those two `resolution.providers` maps are built with a computed-literal key (`dispatch-ceiling/index.ts:2249-2250`) and therefore own the name; the guards there are defensive. The real cause of `unsupported (undefined)` is `packages/cli/src/providers/ceiling/registry.ts:219` (`getCeilingAdapter`: `REGISTERED_ADAPTERS[provider]` returns `Object.prototype`, defeating its `??` fallback) — added to In scope with its test; reverting only that guard restores the defect. The lane's cross-model round also found, and this plan now covers, a global prototype-pollution path in `buildResolvedConfigAggregate` (`commands/config/index.ts`: the aggregate walker descended into `Object.prototype` for a `__proto__` provider once Step 2 preserved the key), `toProjectMatrixCompatibility` (`dispatch-ceiling/index.ts`, the project-state path), and the two ceiling layer lookups (`dispatch-ceiling/index.ts:736`, `:788`, defensive) — each with a pinned control. Step 5's prescribed grep is keyed to variable names and structurally cannot find `REGISTERED_ADAPTERS[provider]` or `cursor[part]`; a future sweep greps by shape as well. (D) `packages/cli/src/providers/identity/dispatch-report.ts:378` — `input.resolution.providers[input.resolution.provider]` guarded only by `if (!provider) throw`, which `Object.prototype` passes — read through `getOwnKey` so the existing throw fires. **In scope (added):** `packages/cli/src/commands/project/dispatch-ceiling/index.ts` (`mergeEffectiveDispatchMatrix`, the two provider lookups, `toProjectMatrixCompatibility`, and the two layer lookups) and its test file; `packages/cli/src/providers/ceiling/registry.ts` (`getCeilingAdapter`) and its test; `buildResolvedConfigAggregate` in `commands/config/index.ts` (already in scope); `packages/cli/src/commands/gate/index.ts:1865` in addition to `:1220`; `packages/cli/src/providers/identity/dispatch-report.ts:378` and its test. **Step 5 classification (amended):** A fixed (Step 3), B/C/D guarded (Step 3); the remaining hits the lane classified — comment-only (`oat-config.ts:555`, `dispatch-matrix.ts:289`, `sync-config.ts:43`), guarded (`resolve.ts:275`), safe (`delete`s; constant key lists; `dispatch-ceiling:402` validated result; `scoped-pack-intent.ts:187,189` union; `sync-extension.ts:721` numeric index), inert (`sync-config.ts:60,61,194`; `init/index.ts:978,992,993`; `sync/index.ts:241,242`; `providers/set/index.ts:85,86,92,93`; `registry.ts:366`; `adapter.utils.ts:52`; `compute-plan.ts:130,165`), not member access (`review/latest.ts:176`, `cleanup/project/project.utils.ts:20`) — are accepted as the expected classification on this base. **Weaker-anywhere (unchanged, restated for B–D):** these guards reject cleanly what previously crashed or produced corrupt output; no input that was previously rejected becomes accepted, and no input that previously succeeded changes outcome (an own-key provider or target still resolves identically — pin that with a control). **Test plan additions:** case 16 — with `providers.__proto__` in shared config, `dispatch-ceiling resolve` keeps `__proto__` as an own key of the effective matrix (red before A, green after); case 17 — `oat gate … --target __proto__` and `--target constructor` produce `Unknown exec target` with the same exit code as an unknown id, and `--target <real-id>` is unchanged; case 18 — `dispatch-ceiling resolve --provider __proto__` reports `unsupported (none)` exactly like an unknown provider, and a real provider is unchanged; case 19 — the dispatch-report builder with provider `__proto__` throws the existing error. Each new case red-then-green against its guard. **Step 6 (decision record):** the Consequences paragraph also names sites A–D and the rule that user-supplied ids are read through `getOwnKey`. **Done criteria (amended):** cases 1–19 pass; the four sites are fixed or guarded with their controls reported; the anchor shifts the lane recorded (`hasOwn` `:570→:580`, `applyDispatchMatrixRecommendation` `:3236→:3292`, `effectiveTerminalReviewerNotices` `:3268→:3324`, the `:2030` lookup `→:2038`, `pjm.remote` `:1097→:1102`/`:1161→:1167` and `:2227,2236,2251→:2239,2248,2263`) are noted for the wave-close correction pass. The plan's Step 5 evidence should have been derived from the `src`-wide command it prescribes, not from the inspected files — recorded as a plan-authoring lesson.

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands (it rewrites `commands/gate/index.ts` and edits
  `config/resolve.ts`, `config/oat-config.ts` and `commands/config/index.ts`);
- any sibling wave-7 lane named in [Dependencies](#dependencies) merges;
- any cited line anchor moves in `config/oat-config.ts`,
  `config/dispatch-matrix.ts`, `config/resolve.ts`,
  `commands/config/index.ts`, or `commands/gate/index.ts`;
- any reproduction in the evidence sections cannot be reproduced on the built
  module.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`, and record the refreshed comparison rather than re-stamping the
authored provenance.

## Review focus

- **Step 3 is the point of the plan.** A reviewer should check first that the
  exposure analysis is right: that `Object.entries` on a post-fix map yields
  the key, and that `mergeExecTargetLayer`, `resolveExecTargetViews`,
  `applyDispatchMatrixRecommendation` and `effectiveTerminalReviewerNotices`
  really do assign by member access. The built-module reproduction in the
  evidence section can be re-run in under a minute. If Step 3 were dropped,
  Steps 1–2 would move the injection one layer downstream instead of removing
  it.
- **The intermediate red for cases 9, 10 and 14.** Confirm the lane report
  records it. A green-only report cannot distinguish "Step 3 was necessary"
  from "Step 3 was decoration".
- **That the normalizer rewrites preserve every existing accept/reject rule**,
  especially the `null`-versus-`undefined` distinction in `normalizeRecordMap`
  and the tier validation in `normalizeDispatchMatrix`.
- **That the swept family really is inert or bounded**, that case 12 pins the
  zod guard rather than merely asserting current output, and that the
  `pjm.remote` classification (constant key lists, catalogued keys) is
  re-read rather than taken on trust.
- **Deliberately deferred:** the `documentation.root` typed warning (split to
  its own plan); the three `pjm.remote` families are classified, not edited.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p05 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `412abf81d` → integration `930466d4b`; record fix `054de3cf3` → `8d3291f6c`): every map OAT rebuilds from parsed config data keeps a preserved `__proto__` key as an own data property through the new `getOwnKey`/`setOwnKey` helpers (`normalizeRecordMap`, `normalizeDispatchMatrix`, the exec-target merges, the config-command lookups, the gate lookups at `:1220` and `:1865`, `mergeEffectiveDispatchMatrix`, `toProjectMatrixCompatibility`, the ceiling layer lookups, `getCeilingAdapter`, the dispatch-report lookup), and a global prototype-pollution path in `buildResolvedConfigAggregate` that Step 2 would have exposed is closed; user-supplied ids (`--target`, `--provider`) reject cleanly instead of crashing; the materialization decision record names every guarded site. Verification: focused 780+; forced check/type-check/cli test `Cached: 0` (7128); check:skill-bumps (nothing changed); lint; format; validate-skills; the plan's intermediate-red control held (cases 9, 10, 14, 15); two Codex rounds (R1 DO-NOT-SHIP: 2C/1I fixed; R2 SHIP); root review PASS with findings (0/3I/1M/3m, all artifact alignment; base → intermediate → head pollution ladder reproduced; 432-pair-style probes; shape-based sweep clean) → record-only fix round → round 2 PASS. Deviations: STOP at Step 5 (four unclassified sweep sites) closed by the plan's dated 2026-09-09 refresh; the refresh's site-C attribution corrected by the review (`registry.ts:219` is the cause); six files beyond the wrapper's declared surface, all review-justified (`registry.ts` + test; the aggregate walker; `toProjectMatrixCompatibility`; the layer lookups).
