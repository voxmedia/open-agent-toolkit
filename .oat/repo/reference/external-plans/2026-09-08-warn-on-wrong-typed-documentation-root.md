---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-warn-when-documentation-root.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-warn-when-documentation-root
oat_issue_url: null
created: '2026-09-08T22:30:00Z'
---

# Warn on a wrong-typed `documentation.root` instead of dropping it in silence

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This plan was
> split out of
> [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)
> because it is a separate outcome with its own verification boundary; the two
> share `config/oat-config.ts` and `commands/config/index.ts`, so they run in
> different parallel groups, this one second. The one non-obvious fact is that
> `context.logger.warn` is a **no-op under `--json`**
> (`packages/cli/src/ui/logger.ts:50-53`), so the JSON surface needs its own
> channel; the plan specifies it.

## Outcome

A `documentation.root` whose stored value is not a string is no longer dropped
in silence. `oat config get` and `oat config list` emit one warning naming the
key, the observed type, and the repair command — on stderr in human mode and
as a `warnings` array in the JSON document under `--json` — so the operator
learns why the documentation tree reads as unset instead of discovering it
when `oat instructions sync` starts writing pointer files into the docs tree.
`normalizeOatConfig` gains an optional warning sink and `readOatConfigWithWarnings`
is exported, so the `oat instructions` surface can be wired in a two-line
follow-up once its file is free. The accept/reject behavior of the parser is
unchanged: the value is still dropped.

## Source and live evidence

- Source artifact or scope: `.oat/repo/pjm/backlog/items/`
- Source backlog item:
  [BL-260907-warn-when-documentation-root — Warn when documentation.root has the wrong type instead of dropping it](../../pjm/backlog/items/BL-260907-warn-when-documentation-root.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree
  whose content this plan read (branch `wave-7-plans`, rebased onto the merged
  PR #273).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, also the merge-base; the branch adds only plan files.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- CLI version at the inspected `HEAD`: `0.2.66`; `packages/cli/dist` was built
  from this tree and is the binary the reproduction below ran.

### Verified evidence

- `packages/cli/src/config/oat-config.ts:1692-1720` — inside
  `if (isRecord(parsed.documentation))`, the root branch (`:1694-1699`) is
  `if (typeof parsed.documentation.root === 'string' &&
parsed.documentation.root.trim()) { doc.root = ... }` with **no else
  branch**. Its three scalar siblings (`tooling`, `config`, `index` at
  `:1700-1717`) have the same shape.
- `normalizeOatConfig` (`:1565-1568`) takes `(parsed, configPath =
'.oat/config.json')` and returns `OatConfig`. There is no warning sink
  anywhere in the function: a grep for `warnings` or `onWarning` in
  `config/oat-config.ts` returns nothing. (The `findings` array PR #273 added
  at `:1180` belongs to the closed-schema check for `pjm.remote` and is not a
  channel a caller can receive.)
- `readOatConfig` (`:1813-1826`) is the only production entry point for the
  shared config: it reads the file, calls
  `normalizeOatConfig(parseJsonConfig(raw, configPath), configPath)`, returns
  `{ ...DEFAULT_OAT_CONFIG }` on a missing file, and rethrows anything else.
  The three lenient repair readers (`:1828`, `:1912`, `:1944`) are separate
  entry points and must stay silent.
- `packages/cli/src/commands/config/index.ts:3466` (`runGet`) and `:3646`
  (`runList`) reach the shared config through `getConfigValue` →
  `dependencies.resolveEffectiveConfig` (`:2262`), which calls
  `dependencies.readOatConfig`. `runGet` emits `context.logger.json({ status:
'ok', ...value })` under `--json` (`:3485-3489`) and
  `context.logger.info(formatResolvedValue(...))` otherwise (`:3491`);
  `runList` emits `{ status: 'ok', values }` (`:3663-3667`) or
  `formatList(values)` (`:3669`).
- `packages/cli/src/ui/logger.ts:50-56` — `warn(message)` returns early when
  `json` is true and otherwise writes the message to stderr. So a warning
  routed only through `logger.warn` is invisible under `--json`; the JSON
  document is the only channel there. The existing `unset` environment
  warning (`commands/config/index.ts:2976-2980`) uses `logger.warn` and is
  therefore human-mode only; this plan does better on its own surface.
- `ConfigCommandDependencies.readOatConfig` is declared at `:245`;
  `DEFAULT_DEPENDENCIES` starts at `:1253`.
- `packages/cli/src/config/oat-config.ts:1872` —
  `resolveDocumentationContentRoot(repoRoot, config, ...)` derives the
  documentation content root from `config.documentation?.root` and returns
  `null` when it is absent; `commands/instructions/instructions.utils.ts:303-304`
  calls `readOatConfig` then `resolveDocumentationContentRoot`, which is how a
  dropped root turns into "no default exclusion".
- Reproduced on the built CLI (0.2.66) in a scratch repository with shared
  config `{"version":1,"documentation":{"root":5}}`: `oat config get
documentation.root` printed an empty line and exited `0`; `oat config list`
  showed `documentation.root ... default`; `oat instructions validate`
  reported `status: ok` with `scanned=0`. Identical for
  `{"documentation":{"root":{"a":1}}}`. Zero diagnostics on every surface.
- `apps/oat-docs/docs/provider-sync/instruction-sync.md:110-114` documents
  today's behavior: "a wrong-typed scalar such as `documentation.root` is
  dropped rather than rejected, so it never aborts the command (a dropped
  `root` simply leaves the content root underived, and no default exclusion
  applies)". That sentence stays true after this plan — the value is still
  dropped and nothing aborts — so this plan edits no documentation page.
- The focused suites this plan names (`src/config/oat-config.test.ts`,
  `src/commands/config/index.test.ts`) pass at this `HEAD`.

### Source claims found false or narrower

1. The item says the warning should reach "`oat config`/`oat sync`/`oat
validate`". There is no top-level `oat validate` command (verified on
   `oat --help` at 0.2.66), and `oat sync` (provider-view sync) never reads
   `documentation.root`. The real consumers are `oat config`,
   `oat instructions sync` / `oat instructions validate` (through
   `resolveInstructionPointerExcludes`), and `oat docs generate-index`. This
   plan covers the `oat config` surface and exports the helper; see
   [Out of scope](#out-of-scope) for why the `oat instructions` surface is
   deferred in this wave.
2. The item's phrase "the docs tree quietly reverts to pointer sites" is
   accurate but describes `oat instructions sync`; on the `oat config` surface
   the observable is `documentation.root` reading as `default`.
3. The item says the value is dropped "in both the pointer and docs-tree
   modes". Verified: there is one parser, so there is one drop; the two modes
   differ only in what consumes the missing root.

## Dependencies

| Type             | Dependency                                                                                                                      | Required state                                                                                                                                                                                                                    | Current state                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied        | Wave-5 p02 [Keep instruction sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Merged, so the inert-exclusion warning channel exists as the precedent this plan's message and JSON field follow.                                                                                                                 | Merged; `resolveInstructionPointerExcludes` verified at this `HEAD`.                                                                      |
| Satisfied        | PR #273 (`feat: add provider-neutral remote project management`)                                                                | Merged; its `oat-config.ts` and `commands/config/index.ts` additions are re-anchored here.                                                                                                                                        | Merged 2026-09-08 (`7d70ac307`).                                                                                                          |
| Soft adjacency   | [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)                                                  | Never in the same parallel group; both write `config/oat-config.ts`, `commands/config/index.ts`, and their tests. Merge that plan **first**.                                                                                      | Authored 2026-09-08 in the same wave-7 batch (this plan was split from it); not yet merged.                                               |
| Soft adjacency   | [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md)                                                | Never in the same parallel group; both write `commands/config/index.ts` and its test. Merge that plan **first**.                                                                                                                  | Authored 2026-09-08 in the same wave-7 batch; not yet merged.                                                                             |
| Soft ordering    | [Close the docs-index follow-ups](./2026-09-08-close-the-docs-index-follow-ups.md)                                              | It adds `documentation` defaults to `DEFAULT_SHARED_CONFIG`; if it merges first, test case 8's `source` expectation for `documentation.root` may change from `default` — re-read `resolve.ts:46-80` before writing the assertion. | Authored 2026-09-08 in the same wave-7 batch; disjoint write surface from this plan (it writes `config/resolve.ts`, not `oat-config.ts`). |
| Soft integration | PR #190 (`ReviewPlan Stage A compatibility release`)                                                                            | Re-anchor `config/oat-config.ts` and `commands/config/index.ts` if it merges first.                                                                                                                                               | Open draft; its paginated file list includes both files.                                                                                  |
| Soft distinct    | [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md)                                            | No file in common; may share a parallel group. It owns `commands/instructions/**`, which is why the instructions wiring is deferred here.                                                                                         | Authored 2026-09-08; disjoint write surface.                                                                                              |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                              | Affected | Files in common                                                                                   | Required update                                                                                                                                      |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 (provider-neutral remote project management) — **landed**  | Done     | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts`              | Merged before this plan was written; anchors are post-merge. No further action.                                                                      |
| PR #190 (ReviewPlan Stage A) lands                                 | Major    | `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts`, their tests | Re-anchor `normalizeOatConfig`, `readOatConfig`, `runGet`, `runList` by symbol before editing.                                                       |
| Sibling wave-7 lane `harden-normalized-config-maps` merges first   | Minor    | `packages/cli/src/config/oat-config.ts`, `commands/config/index.ts`, their tests                  | Expected. It rewrites `normalizeRecordMap` (`:547-567`) and three helpers far from the `documentation` block; refresh the drift check and re-anchor. |
| Sibling wave-7 lane `fix-oat-config-unset-and-adopt` merges first  | Minor    | `packages/cli/src/commands/config/index.ts`, its test                                             | Expected. It edits `unsetConfigValue` and the `adopt` action, not `runGet`/`runList`; re-anchor.                                                     |
| Sibling wave-7 lane `close-the-docs-index-follow-ups` merges first | Minor    | None written in common                                                                            | Re-check the `source` value `oat config list` reports for `documentation.root` before asserting it in case 8.                                        |
| Any wave-7 lane that archives a backlog item merges                | Minor    | `.oat/repo/pjm/backlog/index.md`                                                                  | Regenerate with `oat backlog regenerate-index` at close-out rather than hand-merging.                                                                |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- \
  packages/cli/src/config/oat-config.ts \
  packages/cli/src/config/oat-config.test.ts \
  packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts \
  packages/cli/src/ui/logger.ts \
  packages/cli/src/commands/instructions/instructions.utils.ts \
  apps/oat-docs/docs/provider-sync/instruction-sync.md \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json
```

`ui/logger.ts` is listed because the JSON-mode channel decision depends on
`warn` being a no-op there; `instructions.utils.ts` and `instruction-sync.md`
are listed because the deferred follow-up and the unchanged doc sentence
depend on them. All three are **read**, never written. The lockstep
`package.json` files are listed for drift awareness only; in lane mode this
plan never edits them.

If any listed file changed, re-anchor every `file:line` citation by symbol name
and re-run the reproduction in [Verified evidence](#verified-evidence). A
material mismatch — for example `normalizeOatConfig` already taking a sink, or
`logger.warn` emitting under `--json` — is a STOP condition.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before the
  built-CLI Done check.
- Typecheck: `pnpm type-check` → passes.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/config/oat-config.test.ts src/commands/config/index.test.ts`
  → passes (green at this `HEAD`).
- Full test (uncached, evidence-grade): from the repository root,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`. A plain `pnpm test` is
  frequently a Turborepo cache replay; `pnpm test --force` does not force a
  re-run.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format`, neither of which CI runs.
- Capture each gate's exit code explicitly, for example
  `pnpm check > gate.log 2>&1; echo "exit=$?"`.
- Skill versioning: **not applicable.** This plan changes no
  `.agents/skills/*/SKILL.md`. `pnpm run check:skill-bumps` must still pass.
- Implementation pattern: the message shape follows the repair messages the
  fail-closed keys already use (`Invalid <key> in <path>: ... Repair it with
oat config set <key> ...`, see `readOatConfigForDocumentationExcludesRepair`
  at `config/oat-config.ts:1912`); the JSON field follows `exclusionWarnings`
  in `commands/instructions/sync/sync.ts:411` — present only when non-empty.
  The test harness is `createHarness` / `runCommand` /
  `capture.jsonPayloads` in `commands/config/index.test.ts` (`:39`, `:117`,
  `:231`, `:271`); the config-file pattern is `readOatConfig(repoRoot)` over a
  `mkdtemp` root in `config/oat-config.test.ts:37-120`.
- oxfmt owns formatting; never run oxfmt over an OAT `state.md`.
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

- `packages/cli/src/config/oat-config.ts` — an optional warning sink on
  `normalizeOatConfig`, a typed-key check for `documentation.root`, a new
  exported `readOatConfigWithWarnings` and `OatConfigRead`, and `readOatConfig`
  reimplemented as a thin wrapper over it.
- `packages/cli/src/commands/config/index.ts` — `readOatConfigWithWarnings`
  joins `ConfigCommandDependencies` and `DEFAULT_DEPENDENCIES`; `runGet` and
  `runList` emit the warnings (stderr in human mode, `warnings` in the JSON
  document).
- Tests: `config/oat-config.test.ts`, `commands/config/index.test.ts`.

### Out of scope

- **`packages/cli/src/commands/instructions/**`— do not touch.** Wiring`readOatConfigWithWarnings`into`resolveInstructionPointerExcludes`
(`instructions.utils.ts:303`) so `oat instructions sync`and`oat instructions validate`also print the warning is the natural next step
and a two-line change once the helper exists, but`instructions.utils.ts`
  is the entire write surface of the sibling wave-7 lane
  [Name the resolved symlink target](./2026-09-08-name-the-resolved-symlink-target.md).
  Record it as a follow-up in the lane report.
- `oat docs generate-index` — it already fails loudly on a missing
  `documentation.root` (`commands/docs/index-generate/index.ts:271`), though
  its message says "is not set" for a value that is set but wrong-typed.
  Improving that wording is a separate, visible-failure concern.
- The three scalar siblings `documentation.tooling`, `documentation.config`,
  `documentation.index` — same silent-drop shape, but dropping them changes no
  scan behavior, so the acceptance criteria do not reach them. The helper in
  Step 1 makes each a one-line addition later.
- A whitespace-only `documentation.root` (`""` or `"   "`). It is a string, so
  it is not a type error; it is dropped today and still will be.
- The three lenient repair readers (`:1828`, `:1912`, `:1944`) — they pass no
  sink and stay silent.
- Documentation pages. `instruction-sync.md:110-114` stays true;
  `cli-utilities/configuration.md` is written by two other wave-7 lanes and a
  sentence about this warning is not required by the item. Note it as a
  possible docs follow-up in the lane report.
- The prototype hardening in
  [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md).

## Current state

`normalizeOatConfig` (`config/oat-config.ts:1565`) is a pure normalizer with no
diagnostic channel. Its `documentation` block accepts each scalar only when it
is a non-empty string and has no else branch, so a wrong-typed value is dropped
with no signal. `readOatConfig` (`:1813`) is the only production entry point
for the shared config, and `oat config get` / `oat config list` reach it
through `resolveEffectiveConfig`. In human mode `context.logger.warn` writes
to stderr; under `--json` it writes nothing, and the command's JSON document is
the only output.

## Implementation steps

### 1. Give `normalizeOatConfig` a warning sink

In `packages/cli/src/config/oat-config.ts`, change `normalizeOatConfig`
(`:1565-1568`) to take an optional third parameter
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

In the `documentation` block, add an else branch to the `root` check at `:1694-1699`
that calls `warnWrongType('documentation.root', parsed.documentation.root,
configPath, onWarning)` when the value is present and not a string. Do **not**
add branches for `tooling`, `config`, or `index`. Do not warn for a
whitespace-only string.

Leave the three lenient repair readers passing no sink.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config/oat-config.test.ts` → passes unchanged;
`pnpm type-check` from the repository root → passes (the parameter is
optional, so no caller changes).

### 2. Export a warning-collecting reader

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

It performs exactly what `readOatConfig` (`:1813-1826`) does — same path, same
`parseJsonConfig`, same missing-file default, same rethrow — while collecting
into a local array through the sink. Reimplement `readOatConfig` as a thin
wrapper returning `.config`, so there is one read path and no chance of the two
drifting.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/config` → passes; every existing `readOatConfig`
caller is unaffected because its signature and behavior are unchanged.

### 3. Surface the warning on the `oat config` read commands

In `packages/cli/src/commands/config/index.ts`, add
`readOatConfigWithWarnings: (repoRoot: string) => Promise<OatConfigRead>` to
`ConfigCommandDependencies` (beside `readOatConfig` at `:245`) and to
`DEFAULT_DEPENDENCIES` (`:1253`). In `runGet` (`:3466`) and `runList`
(`:3646`), after `resolveProjectRoot` and before producing output, call it
once and:

- in human mode, emit each warning through `context.logger.warn` (stderr);
- under `--json`, add `warnings: string[]` to the document emitted at
  `:3485-3489` / `:3663-3667`, **only when non-empty**, so every existing
  `toMatchObject` / `toEqual` assertion on those payloads stays green.

Do not change stdout in human mode and do not change the exit code. If the
warn-read throws (a fail-closed key such as a malformed
`documentation.excludes`), let the existing `catch` report it exactly as
`resolveEffectiveConfig` would have; the message is the same because both
paths run `normalizeOatConfig`.

**Verify:** after `pnpm build`, in a scratch repository with shared config
`{"version":1,"documentation":{"root":5}}`:
`node packages/cli/dist/index.js config get documentation.root` prints the
warning on stderr, prints an empty value on stdout, and exits `0`;
`node packages/cli/dist/index.js config list` prints the same warning once;
`node packages/cli/dist/index.js config get documentation.root --json` prints
a JSON document whose `warnings` array has that one entry and nothing on
stderr.

### 4. Run the lane gates

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

### `packages/cli/src/config/oat-config.test.ts`

Structural pattern: the `readOatConfig(repoRoot)` cases at `:37-120` and
`describe('resolveDocumentationContentRoot')` at `:301`.

1. `readOatConfigWithWarnings` on `{"documentation":{"root":5}}` returns
   `config.documentation?.root` of `undefined` **and** exactly one warning
   containing `documentation.root`, `number`, and the config path. Repeat for
   `{"root":{"a":1}}` (`object`), `{"root":[1]}` (`array`), and
   `{"root":null}` (`null`).
   _Red before Step 1:_ zero warnings.
2. The fallback co-occurs with the warning: for the same wrong-typed fixtures,
   `resolveDocumentationContentRoot(repoRoot, config)` returns `null` — the
   documentation tree falls back — and the corresponding
   `readOatConfigWithWarnings` call carries the warning. Asserting both in one
   case is what closes the item's "does not silently fall back" criterion
   without editing `commands/instructions/**`.
3. A valid string root produces zero warnings, and a whitespace-only root
   produces zero warnings and no root (the deliberately unchanged case).
4. `readOatConfig` returns exactly what it returned before Step 2 for a valid
   config, a missing file, and a malformed-JSON file (same thrown
   `SyntaxError`, as the existing case at `:117` asserts).
5. The three lenient repair readers on a wrong-typed root produce no warning
   (they pass no sink) — assert by spying on nothing: they return an
   `OatConfig`, not an `OatConfigRead`, so the assertion is that their
   signatures are unchanged and `pnpm type-check` passes.

### `packages/cli/src/commands/config/index.test.ts`

Structural pattern: the `--json` payload assertions at `:231` and `:271`.

6. `oat config get documentation.root` and `oat config list` with
   `{"documentation":{"root":5}}` each emit exactly one warning through
   `capture.warn` naming `documentation.root` and `number`, exit `0`, and
   leave stdout unchanged (`get` prints an empty value; `list` still reports
   the key with its current `source`).
   _Red before Step 3:_ `capture.warn` is empty.
7. The same two commands under `--json`: `capture.warn` is empty (the logger
   is a no-op there), and `capture.jsonPayloads[0].warnings` is an array with
   that one entry.
   _Red before Step 3:_ `warnings` is absent.
8. A valid `documentation.root` emits no warning from either command in either
   mode, and the JSON document has **no** `warnings` key (no new noise on the
   common path; re-check the expected `source` if the docs-index lane merged
   first).
9. A fail-closed sibling (`{"documentation":{"root":5,"excludes":5}}`) still
   makes `get` exit `1` with the `Invalid documentation.excludes` message —
   the warn-read did not change which errors win.

### Red-then-green negative controls

- **Cases 1, 2, 6, 7 (the warning).** Run them before Step 1: zero warnings,
  so they fail. Then apply Steps 1–3 and confirm green. Additionally
  neutralize the guard once it is green — delete the `warnWrongType` call in
  the `documentation.root` else branch, confirm cases 1, 2, 6 and 7 all break,
  restore, confirm green.
- **Case 8 (no noise).** Prove it can fail: temporarily make the else branch
  fire for every root (drop the type test), confirm case 8 and the existing
  `documentation` cases break on the unexpected warning, restore.
- **Case 4 (the wrapper).** Prove it can fail: temporarily make the wrapper
  return `{ ...DEFAULT_OAT_CONFIG }` on a `SyntaxError` instead of rethrowing,
  confirm the `:117` case breaks, restore.

### Weaker-anywhere rule

`normalizeOatConfig` is a reader, so **any input previously rejected that
becomes accepted is Critical.** This plan changes no accept/reject decision at
all: a wrong-typed `documentation.root` is still dropped, a fail-closed sibling
still throws, and the repair readers are untouched. The only new behavior is a
diagnostic. If the reviewer finds any newly-accepted input, that is a STOP
condition.

## Done criteria

- [ ] `oat config get documentation.root` and `oat config list` each emit one
      warning naming the key and the observed type for the number, object,
      array and null cases, verified on the built CLI, and emit none for a
      valid value; under `--json` the same warning appears once in the
      document's `warnings` array and the key is absent when there is nothing
      to say.
- [ ] `readOatConfigWithWarnings` and `OatConfigRead` are exported from
      `config/oat-config.ts`; `readOatConfig` is a wrapper over the same read
      path; `normalizeOatConfig`'s new parameter is optional and no existing
      caller changed.
- [ ] Test-plan cases 1–9 pass, and every negative control was run with its
      red state captured and reported.
- [ ] `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run
test --force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0` with the exit code
      captured explicitly.
- [ ] No lockstep release file is edited (lane mode), no file under
      `packages/cli/src/commands/instructions/` is touched, no documentation
      page is edited, and `git status --short` contains no unexplained or
      out-of-scope file.
- [ ] The lane report names the two deferred follow-ups: wiring
      `readOatConfigWithWarnings` into `instructions.utils.ts:303`, and a
      docs sentence for the warning.
- [ ] The source backlog item is linked from this plan and links back to it
      through `external_plans`.

## STOP conditions

Stop and report instead of improvising when:

- the drift check shows `normalizeOatConfig` already accepts a sink, or
  `readOatConfigWithWarnings` already exists — the premise is gone;
- `logger.warn` starts emitting under `--json`, which would double-print the
  warning; re-decide the JSON channel before proceeding;
- a `documentation.root` warning fires for a valid configuration anywhere in
  the existing suites (a false alarm on the common path is worse than the
  silence it replaces);
- any input previously rejected by `normalizeOatConfig` becomes accepted;
- an existing `--json` assertion in `commands/config/index.test.ts` breaks
  because `warnings` was added to an empty-warning document — the field must
  be omitted when empty;
- the change would require editing any file under
  `packages/cli/src/commands/instructions/`;
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands (it edits `config/oat-config.ts` and
  `commands/config/index.ts`);
- any sibling wave-7 lane named in [Dependencies](#dependencies) merges;
- any cited line anchor in `config/oat-config.ts`, `commands/config/index.ts`,
  or `ui/logger.ts` moves;
- the reproduction in [Verified evidence](#verified-evidence) cannot be
  reproduced on the built CLI.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`, and record the refreshed comparison rather than re-stamping the
authored provenance.

## Review focus

- **Warning noise.** Confirm the warning cannot fire for a valid or absent
  value, that it appears once per command invocation rather than once per
  config layer read, and that the JSON document carries no `warnings` key
  when there is nothing to report.
- **The JSON channel.** `logger.warn` is silent under `--json`; confirm case
  7 asserts the document, not stderr.
- **Error precedence.** A fail-closed sibling must still win with the same
  message (case 9).
- **Deliberately deferred:** the `oat instructions sync` / `oat instructions
validate` half of the item's first criterion (sibling lane owns the file);
  typed warnings for `documentation.tooling`, `documentation.config`,
  `documentation.index`; the misleading "is not set" wording in
  `oat docs generate-index`; and a documentation sentence for the warning.
