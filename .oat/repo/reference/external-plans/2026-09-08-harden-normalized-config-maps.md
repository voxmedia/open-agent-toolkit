---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260908-guard-normalized-config-maps.md
  - .oat/repo/pjm/backlog/items/BL-260907-warn-when-documentation-root.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-guard-normalized-config-maps
  - BL-260907-warn-when-documentation-root
oat_issue_url: null
created: '2026-09-08T21:40:00Z'
---

# Harden normalized config maps against a preserved `__proto__` key, and warn on a wrong-typed `documentation.root`

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Both source
> items are wave-follow-ups whose upstream work has already merged: wave-6 p03
> (`config/json.ts` materialization) and wave-5 p02 (the inert-exclusion
> warnings) are both present at the inspected `HEAD`. The riskiest part is
> **not** the two named normalizers: fixing them makes a `__proto__` key
> visible to `Object.entries` for the first time, which newly exposes three
> further assignment sites that are dormant today. Those are in scope, and the
> plan says why.

## Outcome

Every map OAT rebuilds from parsed config data holds a key literally named
`__proto__` as an ordinary own key instead of installing it as the map's
prototype, and every user-named lookup on such a map is own-key guarded. That
covers the two normalizers the source item names (`normalizeRecordMap` and the
dispatch-matrix provider assignment), the three downstream sites that the fix
itself would otherwise newly expose (`mergeExecTargetLayer`,
`resolveExecTargetViews`, and the two dispatch-ceiling merge helpers in the
config command), and one pre-existing unguarded lookup in the gate command. The
remaining candidate sites are swept, shown inert behind two independent guards,
and pinned by a control rather than changed. `DR-260907-oat-config-reads-materialize`
drops its residual scoping sentence, because the scope it described is closed.

Separately, a `documentation.root` whose stored value is not a string is no
longer dropped in silence: `oat config get` and `oat config list` emit a
warning naming the key and the observed type, so the operator learns why the
documentation tree reads as unset.

## Source and live evidence

- Source artifact or scope: `.oat/repo/pjm/backlog/items/`
- Related backlog items:
  [BL-260908-guard-normalized-config-maps — Guard normalized config maps against a preserved proto key](../../pjm/backlog/items/BL-260908-guard-normalized-config-maps.md)
  and
  [BL-260907-warn-when-documentation-root — Warn when documentation.root has the wrong type instead of dropping it](../../pjm/backlog/items/BL-260907-warn-when-documentation-root.md)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756`
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the
  fetched `origin/main` tip; branch and tip coincide here.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Related decision:
  [DR-260907-oat-config-reads-materialize](../decisions/DR-260907-oat-config-reads-materialize.md)
  — this plan edits its Consequences section.

### Verified evidence — the prototype hazard

- `packages/cli/src/config/json.ts:1-60` — the wave-6 materialization has
  landed: `parseJsonConfig` uses `parseTree` and defines every own key with
  `Object.defineProperty`, so a `__proto__` key survives a read as an own data
  property. `packages/cli/src/config/json.test.ts` exists. The premise of the
  source item therefore holds at this `HEAD`.
- `packages/cli/src/config/oat-config.ts:547-567` — `normalizeRecordMap`
  builds `const next: Record<string, T | null> = {}` at `:555` and assigns
  `next[key] = normalized` at `:562`. Reproduced through the built CLI's
  `readOatConfig` in a scratch repository, with shared config
  `{"workflow":{"gates":{"skills":{"__proto__":{"command":"echo pwned","onFailure":"block"},"real":{"command":"echo ok","onFailure":"warn"}}}}}`:
  `Object.keys(skills)` is `['real']`, `'command' in skills` is `true`,
  `skills.command` is `'echo pwned'`, `Object.getPrototypeOf(skills)` is not
  `Object.prototype`, and `for...in` yields
  `['real','command','onFailure','maxAttempts']`. Global `Object.prototype` is
  untouched (`({}).command` is `undefined`).
- `packages/cli/src/config/dispatch-matrix.ts:288-353` — `normalizeDispatchMatrix`
  builds `const providers: Record<string, WorkflowDispatchProviderValue> = {}`
  at `:288` and assigns at **two** sites: `providers[provider] = scalar` at
  `:307` and `providers[provider] = tiers` at `:343`. Reproduced with
  `{"workflow":{"dispatchCeiling":{"providers":{"__proto__":{"high":"max"},"codex":{"high":"high"}}}}}`:
  `Object.keys(providers)` is `['codex']`, `'high' in providers` is `true`,
  `providers.high` is `{ candidates: ['max'] }`, and the map's prototype is not
  `Object.prototype`.
- `packages/cli/src/config/resolve.ts:270` — the gate lookup is
  `hasOwn`-guarded, as the source item states. Verified.
- `packages/cli/src/commands/config/index.ts:1917-1927` — `providers[provider]`
  at `:1921` is unguarded, where `provider` comes from
  `parseDispatchCeilingProviderConfigKey(key)` and therefore from a
  user-supplied config key. The surrounding writes use computed object-literal
  keys (`{ ...providers, [provider]: ... }` at `:1933-1939` and `:1948-1951`),
  which use define semantics and are already safe; only the lookup needs a
  guard.
- The repository's own remedy pattern is `Object.fromEntries`:
  `config/oat-config.ts:1262-1269` (with the comment naming this exact hazard)
  and `commands/config/index.ts:2515-2528` (`withoutOwnKey`).

### Verified evidence — sites the fix would newly expose

This is the part the source item does not cover, and it is why the plan is
larger than the item's `XS` estimate. Today `Object.entries` on an affected map
does **not** yield `__proto__`, because the key became the prototype. Once
`normalizeRecordMap` and `normalizeDispatchMatrix` keep it as an own key, every
downstream loop that iterates those maps and assigns by computed member access
sees it for the first time.

- `packages/cli/src/config/resolve.ts:370-409` — `mergeExecTargetLayer`
  iterates `Object.entries(layer)` where `layer` is
  `workflow.gates.execTargets` (a `normalizeRecordMap` product), reads
  `const existing = targets[id]` at `:384`, and assigns `targets[id] = ...` at
  `:386` and `:406`. Confirmed by direct execution of the same shape in Node:
  with `layer` built by `Object.fromEntries` including a `__proto__` entry,
  `Object.entries(layer)` yields `__proto__`, `targets['__proto__']` returns
  `Object.prototype` (truthy, so the merge branch is taken), and
  `targets['__proto__'] = value` leaves `Object.getPrototypeOf(targets)` no
  longer `Object.prototype` while `Object.keys(targets)` omits the key. The
  registry `resolveExecTargets` returns would then inherit the injected
  members.
- `packages/cli/src/config/resolve.ts:337-362` — `resolveExecTargetViews`
  iterates the same layers and does `targets[id] ?? views[id]?.target` at
  `:339`, `delete targets[id]` at `:340`, `views[id] = ...` at `:342` and
  `:355`, and `const target = targets[id]` at `:353`. Same exposure.
- `packages/cli/src/commands/config/index.ts:2937-2967` —
  `applyDispatchMatrixRecommendation` iterates
  `Object.entries(existingProviders)` where `existingProviders` is
  `workflow?.dispatchCeiling?.providers` (a `normalizeDispatchMatrix` product),
  reads `recommendation.providers[provider]` at `:2947`, and assigns
  `providers[provider] = ...` at `:2953` and `:2955`. Same exposure.
- `packages/cli/src/commands/config/index.ts:2969-2992` —
  `effectiveTerminalReviewerNotices` iterates the same provider maps across
  three surfaces, reads `effectiveProviders[provider]` at `:2984`, and assigns
  `effectiveProviders[provider] = ...` at `:2985`. Same exposure. **This site
  is not named in the source item.**
- `packages/cli/src/commands/gate/index.ts:1220` —
  `gates.execTargets?.[targetId]`, with `targetId` from
  `oat gate exec-target set <id>`. Unguarded today and unguarded after the fix:
  for a target id of `__proto__` with no own key present, it returns
  `Object.prototype`, which is truthy, so `setExecTarget` takes the merge
  branch and silently omits the `priority: 0` default the create branch
  applies. Pre-existing, one line to fix, in scope because the sweep criterion
  asks for it.

### Verified evidence — sites swept and shown inert

The source item lists four candidates and says none is reachable "because zod
strips `__proto__` before `mergeProviderConfigs`". Verified live, and there are
**two** independent guards, not one:

- Guard 1 (zod). `packages/cli/src/config/sync-config.ts:11-21` types
  `providers` as `z.record(ProviderConfigSchema)`. Loading a sync config
  containing `{"providers":{"__proto__":{"enabled":true},"claude":{"enabled":true}}}`
  through the built `loadSyncConfig` yields `providers` of
  `{"claude":{"enabled":true}}`, `'enabled' in providers` is `false`, and the
  map still has `Object.prototype`. The key is dropped before any of the
  candidate sites runs.
- Guard 2 (name validation). `packages/cli/src/commands/providers/set/index.ts:155-162`
  rejects any provider name not in `knownProviders`.
  `packages/cli/src/commands/init/index.ts:990-996` and
  `packages/cli/src/commands/sync/index.ts:239-245` iterate adapter names and
  detection results, never raw user strings.
- `packages/cli/src/config/sync-config.ts:37-51` (`mergeProviderConfigs`) and
  `:167-185` (`setProviderEnabled`) are further sites in the same family, also
  behind guard 1. **`mergeProviderConfigs` is not named in the source item.**

Because both guards are real and independent, this plan pins them with a
control and adds a pointer comment rather than rewriting five call sites for a
hazard neither guard admits.

### Verified evidence — the silent `documentation.root` drop

- `packages/cli/src/config/oat-config.ts:1348-1355` — inside
  `if (isRecord(parsed.documentation))`, the root branch is
  `if (typeof parsed.documentation.root === 'string' &&
parsed.documentation.root.trim()) { doc.root = ... }` with **no else
  branch**. Its three scalar siblings (`tooling`, `config`, `index` at
  `:1356-1372`) have the same shape.
- `normalizeOatConfig` (`:1221-1224`) takes `(parsed, configPath)` and returns
  `OatConfig`. There is no warning sink anywhere in the function; a repository
  grep for `warnings` in `config/oat-config.ts` returns nothing.
- Reproduced on the built CLI with shared config
  `{"documentation":{"root":5}}`: `oat config get documentation.root` printed
  an empty line and exited `0`; `oat config list` showed
  `documentation.root ... default`; `oat instructions validate` reported
  `status: ok` with `scanned=0`. Identical for `{"documentation":{"root":{"a":1}}}`.
  Zero diagnostics on every surface.

### Source claims found false or narrower

1. The item cites `config/oat-config.ts:556-568` for `normalizeRecordMap`; the
   function is at `:547-567`, the fresh object at `:555`, the assignment at
   `:562`. The decision record repeats the `:556-568` anchor and is corrected
   by this plan.
2. The item names one assignment in `dispatch-matrix.ts` (`:343`). There are
   two: `:307` (the scalar branch) and `:343`. `:307` does not install a
   prototype — assigning a string to `__proto__` is a silent no-op — but it
   does silently drop the key, which is the same data-loss defect. Both are
   fixed by the same rewrite.
3. The item's estimate is `XS` and its remedy list has three sites. Live
   verification shows the two normalizer fixes **newly expose** four further
   assignment/lookup sites (`resolve.ts` twice, `commands/config/index.ts`
   twice) that are dormant today. Shipping the item's three-site fix alone
   would be a net regression, not a hardening. The true size is `M`.
4. The item's sweep list omits `commands/config/index.ts:2979-2989`
   (`effectiveTerminalReviewerNotices`), `config/sync-config.ts:37-51`
   (`mergeProviderConfigs`), `commands/sync/index.ts:239-245`, and
   `commands/gate/index.ts:1220`. All four are covered here.
5. `BL-260907-warn-when-documentation-root` says the warning should reach
   "`oat config`/`oat sync`/`oat validate`". There is no top-level
   `oat validate` command (verified: `oat --help` lists `backlog, decision,
init, status, sync, config, gate, local, providers, remove, repo, review,
doctor, cleanup, docs, instructions, index, pjm, project, state, tools,
internal`), and `oat sync` (provider-view sync) never reads
   `documentation.root`. The real consumers are `oat config`,
   `oat instructions sync` / `oat instructions validate` (through
   `resolveInstructionPointerExcludes`), and `oat docs generate-index`. This
   plan covers the `oat config` surface and exports the helper; see
   [Out of scope](#out-of-scope) for why the `oat instructions` surface is
   deferred in this wave.
6. The item's phrase "the docs tree quietly reverts to pointer sites" is
   accurate but describes `oat instructions sync`; on the `oat config` surface
   the observable is `documentation.root` reading as `default`.

## Dependencies

| Type                  | Dependency                                                                                                                      | Required state                                                                                                                      | Current state                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Satisfied predecessor | Wave-6 p03 [Preserve proto-named config keys](./2026-09-03-preserve-proto-named-config-keys.md)                                 | Merged, so `config/json.ts` preserves the key and the hazard is live.                                                               | Merged; `config/json.ts` and `config/json.test.ts` verified at this `HEAD`. |
| Satisfied predecessor | Wave-5 p02 [Keep instruction sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Merged, so the inert-exclusion warning channel exists as the precedent this plan's message follows.                                 | Merged; `resolveInstructionPointerExcludes` verified at this `HEAD`.        |
| Soft adjacency        | [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md)                                                | Never in the same parallel group; both write `packages/cli/src/commands/config/index.ts` and its test. Merge that plan **first**.   | Authored 2026-09-08 in the same wave-7 batch; not yet merged.               |
| Soft adjacency        | `BL-260908-keep-a-bare-proto-in-markdown` (Markdown guard for a bare proto key)                                                 | Never in the same parallel group as this plan if its lane edits `.oat/repo/reference/decisions/**`; this plan edits a record there. | Open backlog item; lane status decided by the wave composition.             |
| Soft integration      | PR #273 (`feat: add provider-neutral remote project management`)                                                                | Re-anchor `commands/config/index.ts`, `config/oat-config.ts` and the decision index if it merges first.                             | Open, not draft.                                                            |
| Soft integration      | PR #190 (`ReviewPlan Stage A compatibility release`)                                                                            | Re-anchor `commands/config/index.ts`, `config/oat-config.ts`, `config/resolve.ts` and `commands/gate/index.ts` if it merges first.  | Open draft.                                                                 |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                | Affected | Files in common                                                                                                                                                       | Required update                                                                                                                                                                                      |
| -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A) lands                                   | Major    | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/gate/index.ts` | It rewrites the gate module; re-anchor `commands/gate/index.ts:1220` by symbol (`setExecTarget`) and re-run the exposure reproduction for `mergeExecTargetLayer` before editing `config/resolve.ts`. |
| PR #273 (provider-neutral remote project management) lands           | Major    | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts`, `.oat/repo/reference/decisions/index.md`                                        | Re-anchor `normalizeRecordMap`, `applyDispatchMatrixRecommendation` and `effectiveTerminalReviewerNotices` by symbol; regenerate the decision index after its records land rather than hand-merging. |
| PR #125 (`oat-brainstorm` visual companion) lands                    | None     | None (verified: its changed-file list touches no `packages/cli/src/config/**` or `packages/cli/src/commands/**` path in this plan's scope).                           | No action.                                                                                                                                                                                           |
| Sibling wave-7 lane `fix-oat-config-unset-and-adopt` merges          | Minor    | `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/config/index.test.ts`                                                                         | Expected: it merges first. Refresh the drift check against the integrated `HEAD` and re-anchor; the two changes are in different functions.                                                          |
| A lane implementing `BL-260908-keep-a-bare-proto-in-markdown` merges | Minor    | `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`                                                                                             | Re-read the record before editing it, and keep every occurrence of the key name inside backticks so the new guard passes.                                                                            |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- \
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
new files `packages/cli/src/config/own-keys.ts` and
`packages/cli/src/config/own-keys.test.ts` do not exist at the inspected
`HEAD`, so the diff cannot report them; confirm they are still absent before
Step 1. The lockstep `package.json` files are listed for drift awareness only;
in lane mode this plan never edits them.

If any listed file changed, re-anchor every `file:line` citation by symbol name
and re-run the reproductions in
[Verified evidence — the prototype hazard](#verified-evidence--the-prototype-hazard)
and
[Verified evidence — the silent documentation.root drop](#verified-evidence--the-silent-documentationroot-drop).
A material mismatch — for example `config/json.ts` no longer preserving the key,
which would remove this plan's premise entirely — is a STOP condition.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before
  `pnpm test:smoke` / `pnpm test:release` and before any built-CLI
  reproduction.
- Typecheck: `pnpm type-check` → passes.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/config src/commands/config/index.test.ts src/commands/gate/index.test.ts`
  → passes.
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
  `.agents/skills/*/SKILL.md`, so there is no `metadata.version` bump
  (the top-level `version:` field is gone since CLI 0.2.65).
  `pnpm run check:skill-bumps` must still pass, reporting nothing.
- **Markdown hazard:** oxfmt rewrites a bare occurrence of the key name in
  Markdown prose into bold text, destroying it silently
  (`BL-260908-keep-a-bare-proto-in-markdown`). Every occurrence in the decision
  record this plan edits, and in any note it writes, must stay inside backticks.
  Verify after formatting with
  `grep -n '\*\*proto\*\*' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
  → no output.
- Decision records: never hand-edit the generated index. After changing a
  record, run `oat decision regenerate-index`. Before any decision-surface
  write, run `oat pjm doctor --json` and require `adoption.state` of `declared`
  or `inferred-legacy`.
- Implementation pattern: `Object.fromEntries` over `Object.entries(...)`, as
  at `config/oat-config.ts:1265` and `commands/config/index.ts:2526`; and
  `Object.defineProperty` for imperative accumulation, as in
  `config/json.ts`'s materializer.
- Import path convention: same-directory `./own-keys` from other
  `packages/cli/src/config/*` modules; the `@config/own-keys` alias from
  `packages/cli/src/commands/**`. No parent-relative imports.
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

Prototype hardening:

- **New** `packages/cli/src/config/own-keys.ts` — `getOwnKey` and `setOwnKey`
  helpers, plus `packages/cli/src/config/own-keys.test.ts`.
- `packages/cli/src/config/oat-config.ts` — `normalizeRecordMap`
  (`:547-567`).
- `packages/cli/src/config/dispatch-matrix.ts` — `normalizeDispatchMatrix`
  (`:288-353`), both assignment sites.
- `packages/cli/src/config/resolve.ts` — `mergeExecTargetLayer` (`:370-409`)
  and `resolveExecTargetViews` (`:312-366`).
- `packages/cli/src/commands/config/index.ts` — the lookup at `:1921`,
  `applyDispatchMatrixRecommendation` (`:2937-2967`), and
  `effectiveTerminalReviewerNotices` (`:2969-2992`).
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

Wrong-typed `documentation.root`:

- `packages/cli/src/config/oat-config.ts` — an optional warning sink on
  `normalizeOatConfig`, a typed-key check for `documentation.root`, and a new
  exported `readOatConfigWithWarnings`.
- `packages/cli/src/commands/config/index.ts` — `runGet` and `runList` emit the
  warnings through `context.logger.warn`; the new reader joins
  `ConfigCommandDependencies` and `DEFAULT_DEPENDENCIES`.
- Tests: `config/oat-config.test.ts`, `commands/config/index.test.ts`.

### Out of scope

- **`packages/cli/src/commands/instructions/**`— do not touch.** Wiring`readOatConfigWithWarnings`into`resolveInstructionPointerExcludes`so`oat instructions sync`and`oat instructions validate`also print the
warning is the natural next step and is a two-line change once the helper
exists, but`commands/instructions/instructions.utils.ts` is the entire write
  surface of the sibling wave-7 lane
  [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md),
  and the two lanes must not edit one file. Record it as a follow-up in the
  lane report rather than doing it here.
- `oat docs generate-index` — it already fails loudly on a missing
  `documentation.root` (`commands/docs/index-generate/index.ts:271`), though
  its message says "is not set" for a value that is set but wrong-typed.
  Improving that wording is a separate, visible-failure concern.
- The three scalar siblings `documentation.tooling`, `documentation.config`,
  `documentation.index` — same silent-drop shape, but dropping them changes no
  scan behavior, so the acceptance criteria do not reach them. The helper
  written in Step 6 makes each a one-line addition later.
- A whitespace-only `documentation.root` (`""` or `"   "`). It is a string, so
  it is not a type error; it is dropped today and still will be.
- `config/json.ts` — the parse chokepoint is correct and owned by the merged
  wave-6 plan.
- `config/resolve.ts:270` (`resolveGateWithSource`) — already `hasOwn`-guarded.
- The five sync-config-family call sites in
  [Verified evidence — sites swept and shown inert](#verified-evidence--sites-swept-and-shown-inert):
  swept, shown inert behind two guards, pinned by a control, and left unchanged
  apart from one comment.
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
`workflow.gates.skills` and `workflow.gates.execTargets` (`:862-872`).
`normalizeDispatchMatrix` (`config/dispatch-matrix.ts:281`) backs
`workflow.dispatchCeiling.providers` and is called from
`config/oat-config.ts:830`, `commands/config/index.ts:1764`,
`commands/project/dispatch-ceiling/index.ts:470` and
`providers/cursor/codec/sync-extension.ts:279`.

The consumers of those maps split into three groups: `hasOwn`-guarded
(`config/resolve.ts:270`), safe-by-construction (object spread and computed
literal keys, which use define semantics), and unguarded member access. Only
the third group needs work, and it is larger after the normalizers are fixed
than before, because the fix is what makes the key visible to `Object.entries`.

`normalizeOatConfig` (`config/oat-config.ts:1221`) is a pure normalizer with no
diagnostic channel. Its `documentation` block accepts each scalar only when it
is a non-empty string and has no else branch, so a wrong-typed value is dropped
with no signal. `readOatConfig` (`:1466-1480`) is the only production entry
point for the shared config, and `oat config get` / `oat config list` reach it
through `resolveEffectiveConfig`.

## Implementation steps

Steps 1–5 are the prototype hardening; steps 6–8 are the
`documentation.root` warning; step 9 is the decision record; step 10 is the
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
`config/oat-config.ts:1262-1269` as the precedent.

In `packages/cli/src/config/dispatch-matrix.ts`, rewrite
`normalizeDispatchMatrix` (`:288-353`) the same way: accumulate provider
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
downstream.

In `packages/cli/src/config/resolve.ts`, import `getOwnKey` and `setOwnKey`
from `./own-keys` and apply them in:

- `mergeExecTargetLayer` (`:370-409`) — `const existing = getOwnKey(targets,
id)` at `:384`, `setOwnKey(targets, id, ...)` at `:386` and `:406`. Leave
  `delete targets[id]` at `:380` as is: `delete` removes an own key and is a
  no-op otherwise, so it is already correct.
- `resolveExecTargetViews` (`:312-366`) — `getOwnKey(targets, id)` and
  `getOwnKey(views, id)?.target` at `:339`, `setOwnKey(views, id, ...)` at
  `:342` and `:355`, `getOwnKey(targets, id)` at `:353`.

In `packages/cli/src/commands/config/index.ts`, import `getOwnKey` and
`setOwnKey` from `@config/own-keys` and apply them in:

- `:1921` — `const existingProviderValue = getOwnKey(providers, provider);`.
  Leave the two computed-literal writes at `:1935` and `:1950` unchanged and
  add a one-line comment recording that a computed key in an object literal
  uses define semantics and is already safe.
- `applyDispatchMatrixRecommendation` (`:2937-2967`) —
  `getOwnKey(recommendation.providers, provider)` at `:2947`, and
  `setOwnKey(providers, provider, ...)` at `:2953` and `:2955`. The initial
  `{ ...recommendation.providers }` spread is safe and stays.
- `effectiveTerminalReviewerNotices` (`:2969-2992`) —
  `getOwnKey(effectiveProviders, provider)` at `:2984` and
  `setOwnKey(effectiveProviders, provider, ...)` at `:2985`.

In `packages/cli/src/commands/gate/index.ts`, change `:1220` to
`const existing = getOwnKey(gates.execTargets ?? {}, targetId);`, importing
`getOwnKey` from `@config/own-keys`. Change nothing else in that file; the
spread-plus-computed-key writes at `:1240-1243` and `:1253-1254` are already
safe.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts src/commands/gate/index.test.ts`
→ passes.

### 4. Record the swept-and-inert family

In `packages/cli/src/config/sync-config.ts`, add a comment above
`mergeProviderConfigs` (`:37`) recording that provider names reaching this
family are guarded twice — `SyncConfigSchema.providers` is a `z.record`, which
drops a `__proto__` key during parsing, and `commands/providers/set/index.ts`
rejects any name outside `knownProviders` — and naming the test added in the
[Test plan](#test-plan) as the pin. Change no code here.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/sync-config.test.ts` → passes, including the
new zod-strip control.

### 5. Prove the sweep is complete

Run the enumeration that produced this plan's site list and confirm every hit
is either fixed, guarded, safe-by-construction, or listed as inert:

```bash
cd packages/cli
grep -rn 'providers\[\|targets\[\|views\[\|skills\[\|execTargets\[\|merged\[\|next\[' \
  --include='*.ts' src | grep -v '\.test\.ts'
```

Record the classification of every line in the lane report. A hit that is none
of the four categories is a STOP condition.

**Verify:** the command runs and every reported line is classified in the lane
report.

### 6. Give `normalizeOatConfig` a warning sink

In `packages/cli/src/config/oat-config.ts`, change `normalizeOatConfig`
(`:1221-1224`) to take an optional third parameter
`onWarning?: (message: string) => void`. Add a small local helper beside it:

```ts
/**
 * Report a stored value whose type the normalizer cannot use.
 *
 * The scalar `documentation.*` branches accept only a non-empty string and
 * have no else branch, so a wrong-typed value is dropped with no signal
 * anywhere. That is defensible for a value nobody reads, but `documentation.root`
 * decides which tree OAT treats as documentation, and its silent absence looks
 * exactly like "never configured".
 */
function warnWrongType(
  key: string,
  value: unknown,
  configPath: string,
  onWarning: ((message: string) => void) | undefined,
): void {
  if (!onWarning || value === undefined) return;
  const observed = Array.isArray(value)
    ? 'array'
    : value === null
      ? 'null'
      : typeof value;
  onWarning(
    `Invalid ${key} in ${configPath}: expected a string, got ${observed}; ` +
      `the value is ignored and ${key} reads as unset. ` +
      `Repair it with oat config set ${key} <path>.`,
  );
}
```

In the `documentation` block, add an else branch to the `root` check at
`:1350-1355` calling
`warnWrongType('documentation.root', parsed.documentation.root, configPath,
onWarning)` when the value is present and not a string. Do **not** add
branches for `tooling`, `config`, or `index` (see
[Out of scope](#out-of-scope)). Do not warn for a whitespace-only string.

Leave the three lenient repair readers (`:1483`, `:1567`, `:1599`) passing no
sink, so a repair read stays silent.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/oat-config.test.ts` → passes unchanged;
`pnpm type-check` from the repository root → passes.

### 7. Export a warning-collecting reader

In `packages/cli/src/config/oat-config.ts`, add:

```ts
export interface OatConfigRead {
  config: OatConfig;
  warnings: string[];
}

export async function readOatConfigWithWarnings(
  repoRoot: string,
): Promise<OatConfigRead> {
  /* ... */
}
```

It performs exactly what `readOatConfig` (`:1466-1480`) does — same path, same
`parseJsonConfig`, same missing-file default, same rethrow — while collecting
into a local array through the sink. Reimplement `readOatConfig` as a thin
wrapper returning `.config`, so there is one read path and no chance of the two
drifting.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config` → passes; every existing `readOatConfig`
caller is unaffected because its signature and behavior are unchanged.

### 8. Surface the warning on the `oat config` read commands

In `packages/cli/src/commands/config/index.ts`, add
`readOatConfigWithWarnings: (repoRoot: string) => Promise<OatConfigRead>` to
`ConfigCommandDependencies` (beside `readOatConfig` at `:194`) and to
`DEFAULT_DEPENDENCIES` (`:1158-1179`). In `runGet` (`:3167`) and `runList`
(`:3347`), after `resolveProjectRoot` and before producing output, call it and
emit each warning through `context.logger.warn`, in both human and `--json`
mode (warnings go to stderr; the JSON document on stdout is unchanged).

**Verify:** after `pnpm build`, in a scratch repository with shared config
`{"version":1,"documentation":{"root":5}}`:
`node packages/cli/dist/index.js config get documentation.root` prints the
warning on stderr, prints an empty value on stdout, and exits `0`;
`node packages/cli/dist/index.js config list` prints the same warning once.

### 9. Update the decision record

Run `oat pjm doctor --json` and require `adoption.state` of `declared` or
`inferred-legacy` (STOP otherwise). Read
`.oat/repo/reference/decisions/AGENTS.md`. Then edit
`.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`:

- Replace the paragraph beginning "That equivalence is scoped to the parsed
  objects themselves…" so it no longer scopes the equivalence away. State that
  the downstream normalizers now build their maps with `Object.fromEntries`,
  that the sites the change exposed are guarded with own-key access, and that
  the sync-config family is inert behind zod's record parsing and provider-name
  validation. Name this plan and the two backlog items.
- Correct the `config/oat-config.ts:556-568` anchor to the live
  `normalizeRecordMap` location.
- Keep every occurrence of the key name inside backticks.

Then run `oat decision regenerate-index`. Do not hand-edit
`.oat/repo/reference/decisions/index.md`.

**Verify:**
`grep -c 'That equivalence is scoped' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
→ `0`; and
`grep -n '\*\*proto\*\*' .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md .oat/repo/reference/decisions/index.md`
→ no output.

### 10. Run the lane gates

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

4. `normalizeRecordMap` through `readOatConfig`: the gate-skills fixture from
   [Verified evidence](#verified-evidence--the-prototype-hazard) yields a
   `skills` map where the key is an own key, `'command' in skills` is `false`,
   `for...in` yields only the two entry names, and
   `Object.getPrototypeOf(skills)` is `Object.prototype`.
   _Red before Step 2:_ `Object.keys` omits the key, `'command' in skills` is
   `true`.
5. A `null` entry in a record map still survives normalization (the
   `normalizeValue` contract distinguishes `null` from `undefined`); this
   guards the rewrite in Step 2 against collapsing the two.
6. `documentation.root` typed warnings: `readOatConfigWithWarnings` on
   `{"documentation":{"root":5}}` returns `config.documentation?.root` of
   `undefined` **and** exactly one warning containing `documentation.root`,
   `number`, and the config path. Repeat for `{"root":{"a":1}}` (`object`),
   `{"root":[1]}` (`array`), and `{"root":null}` (`null`).
   _Red before Step 6:_ zero warnings.
7. The fallback co-occurs with the warning: for the same wrong-typed fixtures,
   `resolveDocumentationContentRoot(repoRoot, config)` returns `null` — the
   documentation tree falls back — and the corresponding
   `readOatConfigWithWarnings` call carries the warning. Asserting both in one
   case is what closes the item's "does not silently fall back" criterion
   without editing `commands/instructions/**`.
8. A valid string root produces zero warnings, and a whitespace-only root
   produces zero warnings and no root (the deliberately unchanged case).
9. `readOatConfig` returns exactly what it returned before Step 7 for a valid
   config, a missing file, and a malformed-JSON file (same thrown
   `SyntaxError`).

### `packages/cli/src/config/dispatch-matrix.test.ts`

10. `normalizeDispatchMatrix` with a `__proto__` provider carrying a tier map
    keeps it as an own key and leaves the result's prototype as
    `Object.prototype`.
    _Red before Step 2:_ `'high' in providers` is `true` and the prototype is
    replaced.
11. The same with a **scalar** `__proto__` provider value, which today is
    silently dropped rather than installed (the `:307` branch the item does not
    name). After the fix the key is present as an own key.
12. A provider whose tier keys include a name that is not in
    `VALID_DISPATCH_MATRIX_TIERS` still produces a `malformed-tier` issue —
    the tier loop must not have been loosened by the rewrite.

### `packages/cli/src/config/resolve.test.ts`

13. `resolveExecTargets` with an `execTargets` layer that owns a `__proto__`
    key returns a registry whose prototype is `Object.prototype` and whose
    built-in targets are unchanged.
    _Red after Step 2 and before Step 3:_ the registry's prototype is
    replaced. **This case must be written and observed red at that exact
    intermediate state**, because it is the regression Step 2 would ship on its
    own.
14. `resolveExecTargetViews` on the same input returns views whose prototype is
    `Object.prototype` and does not report a view for the injected name.
15. `resolveGateWithSource` still resolves a real skill name and still returns
    `{ gate: null, source: null }` for a skill named `__proto__` that no layer
    owns (the existing `hasOwn` guard, pinned so a later refactor cannot drop
    it).

### `packages/cli/src/config/sync-config.test.ts`

16. `loadSyncConfig` on `{"providers":{"__proto__":{"enabled":true},"claude":{"enabled":true}}}`
    returns providers of exactly `{ claude: { enabled: true } }`, with
    `'enabled' in providers` `false` and the prototype intact. This pins guard
    1; if a future zod upgrade stops stripping the key, this test fails and the
    swept-inert conclusion in Step 4's comment is re-opened.

### `packages/cli/src/commands/config/index.test.ts`

17. `oat config set workflow.dispatchCeiling.providers.__proto__.high <value>`
    (or the closest catalogued spelling the key grammar accepts) does not
    replace the prototype of the written providers map, and `oat config get`
    of an ordinary provider key is unaffected.
18. `oat config adopt dispatch-matrix --shared` against a shared config whose
    providers map owns a `__proto__` key writes a providers map whose prototype
    is `Object.prototype` and preserves the recommendation's real providers.
    _Red after Step 2 and before Step 3._
19. `oat config get documentation.root` and `oat config list` with
    `{"documentation":{"root":5}}` each emit exactly one warning through
    `capture.warn` naming `documentation.root` and `number`, exit `0`, and
    leave stdout unchanged (`get` prints an empty value; the `list` JSON
    payload still reports the key as `default`).
    _Red before Step 8:_ `capture.warn` is empty.
20. A valid `documentation.root` emits no warning from either command (no new
    noise on the common path).

### `packages/cli/src/commands/gate/index.test.ts`

21. `oat gate exec-target set __proto__ ...` (whichever argv the command
    accepts for a target id) creates the target with the `priority: 0` default
    rather than taking the merge branch against `Object.prototype`, and does
    not replace the prototype of the stored `execTargets` map.
    _Red before Step 3:_ the create-branch default is missing.

### Red-then-green negative controls

Each control must be run, its red state captured, and both halves reported.

- **Cases 4, 10, 11 (the normalizers).** Run them against the unmodified
  `normalizeRecordMap` / `normalizeDispatchMatrix`: each fails on the
  prototype assertion. Then apply Step 2 and confirm green.
- **Cases 13, 14, 18, 21 (the exposure).** Run them at the intermediate state
  after Step 2 and **before** Step 3: cases 13, 14 and 18 must fail there, and
  case 21 must fail both before and after Step 2. This is the control that
  proves Step 3 is load-bearing rather than defensive decoration. Then apply
  Step 3 and confirm green. Report the intermediate red explicitly.
- **Cases 6, 7, 19 (the warning).** Run them before Step 6: zero warnings, so
  they fail. Then apply Steps 6–8 and confirm green. Additionally neutralize
  the guard once it is green — delete the `warnWrongType` call in the
  `documentation.root` else branch, confirm cases 6, 7 and 19 all break,
  restore, confirm green.
- **Case 16 (the inert sweep).** Prove it can fail by temporarily replacing
  `SyncConfigSchema`'s `z.record` parse result with the raw parsed object in a
  scratch copy of the assertion; confirm the case fails; restore.
- **Case 5 (the `null` entry).** Prove it can fail: temporarily change the
  Step 2 rewrite's filter from `!== undefined` to a truthiness check, confirm
  case 5 breaks, restore.

### Weaker-anywhere rule

`normalizeRecordMap`, `normalizeDispatchMatrix`, and `normalizeOatConfig` are
readers and normalizers, so **any input previously rejected that becomes
accepted is Critical.** The intended change is narrow: a map entry whose key is
`__proto__` (or any other `Object.prototype` member name) is now retained as
data where it was previously turned into a prototype or silently dropped. The
set of _values_ accepted for each entry is unchanged, because
`normalizeValue`, `normalizeMatrixCell`, and every tier and scalar validator
are untouched. In particular:

- an entry whose key fails `!key.trim()` must still be skipped;
- an entry whose normalizer returns `undefined` must still be dropped, while a
  `null` return must still be kept (case 5);
- a malformed tier must still produce a `malformed-tier` issue (case 12);
- an empty provider object must still produce a `malformed-provider` issue.

The `documentation.root` change adds a warning and changes no accept/reject
decision at all: a wrong-typed value is still dropped. If the reviewer finds
any other newly-accepted input, that is a STOP condition.

## Done criteria

- [ ] `normalizeRecordMap` and `normalizeDispatchMatrix` build their maps with
      `Object.fromEntries`; a live built-CLI reproduction shows the key as an
      own key with `Object.getPrototypeOf(map) === Object.prototype` for both
      the gate-skills and the dispatch-ceiling-providers fixtures.
- [ ] Every user-named lookup on a config-derived map is own-key guarded:
      `commands/config/index.ts:1921`, `:2947`, `:2984`,
      `config/resolve.ts` in `mergeExecTargetLayer` and
      `resolveExecTargetViews`, and `commands/gate/index.ts:1220`.
- [ ] The Step 5 enumeration is recorded in the lane report with every hit
      classified as fixed, guarded, safe-by-construction, or inert.
- [ ] The sync-config family is unchanged in behavior, carries the guard
      comment, and is pinned by test case 16.
- [ ] `packages/cli/src/config/json.test.ts` still passes unchanged.
- [ ] `DR-260907-oat-config-reads-materialize` no longer contains the residual
      scoping sentence, carries the corrected `normalizeRecordMap` anchor, and
      `.oat/repo/reference/decisions/index.md` was regenerated with
      `oat decision regenerate-index` rather than hand-edited.
- [ ] No bolded mangled form of the key name appears in any Markdown file this
      plan wrote (`grep -rn '\*\*proto\*\*'` over the changed Markdown files
      returns nothing).
- [ ] `oat config get documentation.root` and `oat config list` each emit one
      warning naming the key and the observed type for the number, object,
      array and null cases, verified on the built CLI, and emit none for a
      valid value.
- [ ] Test-plan cases 1–21 pass, and every negative control in
      [Red-then-green negative controls](#red-then-green-negative-controls) was
      run with its red state captured — including the intermediate
      after-Step-2-before-Step-3 red for cases 13, 14 and 18.
- [ ] `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run
test --force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0` with the exit code
      captured explicitly.
- [ ] No lockstep release file is edited (lane mode), no file under
      `packages/cli/src/commands/instructions/` is touched, and
      `git status --short` contains no unexplained or out-of-scope file.
- [ ] Both source backlog items are linked from this plan and link back to it
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
- test cases 13, 14 or 18 do **not** fail at the intermediate state after Step
  2 and before Step 3 — either the exposure analysis is wrong or the test does
  not exercise it, and both need resolving before the change can be trusted;
- any input previously rejected by a normalizer becomes accepted beyond the
  key-retention change named in the weaker-anywhere rule;
- test case 16 fails, meaning zod no longer strips the key and the
  swept-inert conclusion for five call sites is void;
- a `documentation.root` warning fires for a valid configuration anywhere in
  the existing suites (a false alarm on the common path is worse than the
  silence it replaces);
- the change would require editing any file under
  `packages/cli/src/commands/instructions/`, which belongs to a sibling lane
  in this wave;
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- PR #190 lands (it rewrites `commands/gate/index.ts` and edits
  `config/resolve.ts`, `config/oat-config.ts` and `commands/config/index.ts`)
  or PR #273 lands (it edits `config/oat-config.ts`,
  `commands/config/index.ts` and the decision index);
- the sibling wave-7 lane
  [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md)
  merges, since it edits the same command file;
- a lane implementing `BL-260908-keep-a-bare-proto-in-markdown` merges, since
  it adds a guard over the decision record this plan edits;
- any cited line anchor moves in `config/oat-config.ts`,
  `config/dispatch-matrix.ts`, `config/resolve.ts`,
  `commands/config/index.ts`, or `commands/gate/index.ts`;
- any reproduction in the evidence sections cannot be reproduced on the built
  CLI.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`, and record the refreshed comparison rather than re-stamping the
authored provenance.

## Review focus

- **Step 3 is the point of the plan.** A reviewer should check first that the
  exposure analysis is right: that `Object.entries` on a post-fix map yields
  the key, and that `mergeExecTargetLayer`, `resolveExecTargetViews`,
  `applyDispatchMatrixRecommendation` and `effectiveTerminalReviewerNotices`
  really do assign by member access. If Step 3 were dropped, Steps 1–2 would
  move the injection one layer downstream instead of removing it.
- **The intermediate red for cases 13, 14 and 18.** Confirm the lane report
  records it. A green-only report cannot distinguish "Step 3 was necessary"
  from "Step 3 was decoration".
- **That the normalizer rewrites preserve every existing accept/reject rule**,
  especially the `null`-versus-`undefined` distinction in `normalizeRecordMap`
  and the tier validation in `normalizeDispatchMatrix`.
- **That the swept-inert family really is inert**, and that case 16 pins the
  guard rather than merely asserting current output.
- **Warning noise.** Confirm the `documentation.root` warning cannot fire for
  a valid or absent value, and that it appears once per command invocation
  rather than once per config layer read.
- **Deliberately deferred:** the `oat instructions sync` / `oat instructions
validate` half of `BL-260907-warn-when-documentation-root`'s first criterion,
  because `commands/instructions/instructions.utils.ts` belongs to a sibling
  lane this wave. `readOatConfigWithWarnings` is exported precisely so that
  wiring is a two-line follow-up.
- **Deliberately deferred:** typed warnings for `documentation.tooling`,
  `documentation.config` and `documentation.index`, and the misleading "is not
  set" wording in `oat docs generate-index`.
