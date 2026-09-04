---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-add-an-exclusion-mechanism.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: BLOCKED
oat_backlog_items:
  - BL-260902-add-an-exclusion-mechanism
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/239
created: '2026-09-02T23:59:00Z'
---

# Add an exclusion mechanism to docs index generation

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: BLOCKED.** Hard ordering dependency on the W1 plan
> [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md),
> which rewrites the same command's path resolution and its injected
> `generateIndex` dependency type. Execute only after that plan has merged and
> this plan's step 1 confirms the post-state; then set this plan `READY`.

## Outcome

`oat docs generate-index` can exclude non-page Markdown. A repeatable
`--exclude <glob>` flag and a `documentation.excludes` config key both feed one
path-relative matcher; flags extend config defaults rather than replace them; a
directory left empty by exclusion emits no bare heading; and the default output
is byte-identical when nothing is excluded. Downstream repositories stop
post-processing the tracked manifest.

## Source and live evidence

- Source backlog item:
  [BL-260902-add-an-exclusion-mechanism — Add an exclusion mechanism to oat docs generate-index](../../pjm/backlog/items/BL-260902-add-an-exclusion-mechanism.md)
- Source issue: [#239](https://github.com/voxmedia/open-agent-toolkit/issues/239)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/docs/index-generate/generator.ts:85-118` —
    `generateIndex(docsDir)` indexes every `.md` entry (`:94`); no filter.
  - `packages/cli/src/commands/docs/index-generate/index.ts:143-148` — only
    `--docs-dir` and `--output` are registered.
  - `packages/cli/src/commands/docs/index-generate/index.ts:19-27` —
    `IndexGenerateOptions` and the injected `generateIndex` dependency type,
    which the W1 plan also rewrites.
  - `packages/cli/src/config/oat-config.ts:36-42`, `:1195-1226` — no
    `excludes` key.
  - `packages/cli/src/commands/config/index.ts:106-109`, `:230-233`,
    `:2189-2220` — settable `documentation.*` keys are scalar-only; an array
    key is a new shape (closest precedent `archive.awsProfile` delete-on-empty
    at `:2233-2240`).
  - `apps/oat-docs/docs/docs-tooling/commands.md:119-150` — documents two
    flags and the config rewrite that the W1 plan removes.
  - [2026-08-30-use-configured-docs-index-paths](./2026-08-30-use-configured-docs-index-paths.md)
    `:124` — explicitly scopes issue #239 out.
- Constraining decision:
  [DR-260217-introduce-oat-config-json](../decisions/DR-260217-introduce-oat-config-json.md)
  — the config key lives in `.oat/config.json`; the acceptance criteria chose
  a config key over a `.oatdocsignore` file.

## Dependencies

| Type          | Dependency                                                                                                                        | Required state                                                                                                            | Current state                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Hard ordering | [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md) / `BL-260718-fix-oat-docs-generate-index`      | Merged to `origin/main`; `index.ts:71-97` no longer calls `writeOatConfig`; the `generateIndex` dependency type is final. | Pending in W1; this plan is BLOCKED until then. |
| Soft ordering | Sibling plan [Keep instruction-sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Both edit `OatDocumentationConfig`; sequence.                                                                             | Pending.                                        |
| Soft ordering | Sibling plan [Add oat config unset](./2026-09-02-add-oat-config-unset-command.md)                                                 | Land this plan first so `unset` covers the new key.                                                                       | Pending.                                        |

One hard dependency is unsatisfied: the W1 docs-index path plan must merge
first.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                       | Required update                                                                                                          |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | `docs/init/index.ts` only (different command).                                        | Re-run the drift check. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | Minor    | `commands/config/index.ts`, `config/index.test.ts`, `cli-utilities/configuration.md`. | Re-anchor the config key-union, `KEY_ORDER`, and set-branch line numbers before editing step 3; no behavioral change.    |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/docs/index-generate packages/cli/src/config/oat-config.ts packages/cli/src/commands/config/index.ts .oat/config.json apps/oat-docs/docs/docs-tooling/commands.md apps/oat-docs/docs/reference/cli-reference.md .oat/repo/reference/external-plans/2026-08-30-use-configured-docs-index-paths.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

The W1 plan is expected to change `index-generate`; that diff is the
prerequisite, not drift. Any other change to path resolution is a STOP.

## Repository conventions

- Build: `pnpm build` → passes. Typecheck: `pnpm type-check` → passes.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/docs/index-generate src/config/oat-config.test.ts src/commands/config/index.test.ts`.
- Lint/format/docs: `pnpm check` and `pnpm build:docs` → pass.
- Implementation pattern: Commander `Option` registration as at
  `index.ts:143-148`; config catalog entries as at `config/index.ts:343-355`.
- Git/PR convention: shipped CLI surface; five-package lockstep bump; do not
  push or open a PR unless instructed.

## Scope

### In scope

- `generator.ts` — `generateIndex` accepts an exclusion matcher evaluated
  against docs-root-relative paths, threaded through the recursion; prune
  directories emptied by exclusion.
- `index.ts` — repeatable `--exclude`, merged after config defaults, threaded
  into the injected dependency type.
- `oat-config.ts` — `documentation.excludes?: string[]` parse.
- `config/index.ts` — key union, `KEY_ORDER`, catalog entry, array-valued set
  branch.
- Tests: `generator.test.ts`, `index-generate/index.test.ts`,
  `config/index.test.ts`, `oat-config.test.ts`.
- Docs: `docs-tooling/commands.md:119-150`, `reference/cli-reference.md`
  config section, `cli-utilities/configuration.md` if it enumerates
  `documentation.*`.
- Five public package manifests.

### Out of scope

- Path resolution and the config-rewrite removal — owned by the W1 plan.
- `oat docs nav sync`, the MkDocs `## Contents` contract.
- Regenerating `apps/oat-docs/index.md` unless the docs tree changes.
- A `.oatdocsignore` dotfile.

## Current state

After the W1 plan, `runIndexGenerate` (`index.ts:71-111`) resolves paths from
config first and no longer writes config. `generateIndex` recurses per
subdirectory (`generator.ts:106-115`) and drops directories with no children,
so exclusion must be evaluated on a path relative to the docs root inside the
recursion (or collect-then-filter), and a directory emptied by exclusion must
not emit a heading. Glob semantics must be specified once: `**/CLAUDE.md`,
`CLAUDE.md`, and `subdir/` all need defined behavior.

## Implementation steps

### 1. Confirm the prerequisite landed

Read `index.ts:71-97`. If it still calls `writeOatConfig`, STOP. Record the
merge SHA of the W1 plan in the execution notes and set this plan `READY`.

**Verify:** `git log --oneline -3 -- packages/cli/src/commands/docs/index-generate/index.ts`
names the path-resolution change.

### 2. Add exclusion support to the generator

Add a library-free matcher supporting `**`, `*`, and trailing `/`; thread it
through the recursion; prune emptied directories.

**Verify:** `pnpm exec vitest run src/commands/docs/index-generate/generator.test.ts`
→ new cases pass; the four existing `generateIndex` cases unchanged.

### 3. Add the config key and command surface

`oat-config.ts`: `documentation.excludes` parsed as a trimmed string array.
`config/index.ts`: union, `KEY_ORDER`, catalog, and an array-valued set branch
that clears the key on an empty value.

**Verify:** `pnpm exec vitest run src/config/oat-config.test.ts src/commands/config/index.test.ts`
→ round-trip cases pass.

### 4. Add the repeatable flag

Register `--exclude <glob>` with a variadic collector at `index.ts:143-148`;
merge flags after config defaults.

**Verify:** `pnpm exec vitest run src/commands/docs/index-generate/index.test.ts`
→ accumulation and precedence cases pass.

### 5. Document and bump

Update the docs pages and `--help` text; bump the five lockstep packages above
fresh `origin/main`.

**Verify:** `pnpm check && pnpm build:docs` → exit 0; then the eight AGENTS.md
gates in order.

## Test plan

Pattern: `it('generates entries from nested directories')` at
`generator.test.ts:50`; the `createHarness` mock in
`index-generate/index.test.ts:16-65`; `it('rejects empty string for
archive.wrapUpExportPath')` at `config/index.test.ts:3566`.

- `excludes a glob match at depth`; `excludes an entire directory`;
  `prunes a directory left empty by exclusion`; `unchanged output when the
exclusion list is empty`.
- `repeated --exclude flags accumulate`; `config-sourced excludes apply with no
flags`; `flags extend rather than replace config excludes`.
- `config`: set/get round-trip for the array key; empty value clears it.

## Done criteria

- [ ] `--exclude` is repeatable and `documentation.excludes` is honored; flags
      extend config.
- [ ] Emptied directories emit no heading; default output is byte-identical.
- [ ] `--help` and the docs-tooling reference document both mechanisms.
- [ ] Path resolution from the W1 plan is untouched.
- [ ] Lockstep bump and all gates pass; `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- the W1 docs-index plan has not merged, or it changed the injected
  `generateIndex` type in a way incompatible with an added parameter;
- implementing exclusions would require re-touching path resolution;
- a reviewer or decision prefers `.oatdocsignore` over the config key; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #239, the
W1 plan's merged result, and the generator and config tests when substantial
time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 lands (config command
anchors), cited contracts change, another PR implements part of the outcome,
or a load-bearing claim cannot be reproduced. Flip the status to `READY` only
after step 1 passes.

## Review focus

- Matcher semantics are documented and tested for depth, directory, and
  root-level patterns.
- The config key is additive; unset and empty behave predictably.
- No path-resolution behavior from the W1 plan was altered.
