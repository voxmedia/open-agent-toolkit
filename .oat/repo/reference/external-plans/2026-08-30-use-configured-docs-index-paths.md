---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260718-fix-oat-docs-generate-index.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260718-fix-oat-docs-generate-index
oat_issue_url: null
created: '2026-08-30T23:40:20Z'
---

# Make docs index generation honor configured repository paths

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> Revalidate first if any trigger in **Revalidation Before Execution** applies.

## Outcome

A bare `oat docs generate-index` resolves the repository's configured
`documentation.root`, so invoking it from a monorepo root writes the intended
docs-app manifest at `<documentation.root>/index.md`. Generation never treats
the raw `documentation.index` value as an output path, because `oat docs init`
seeds that key with an authored Fumadocs page (`<root>/docs/index.md`) or the
MkDocs YAML (`<root>/mkdocs.yml`); it refuses to write into the indexed source
tree, onto `documentation.config`, or onto any YAML path. The only
configuration write that survives is the Fumadocs bootstrap transition: after
writing the manifest inside `documentation.root`, generation records that path
in `documentation.index` when it differs. MkDocs configuration is never
touched. Missing or unusable path configuration fails before any output write,
while explicit path flags remain explicit overrides.

## Source and live evidence

- Source backlog item:
  [BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index cwd-relative defaults in monorepos](../../pjm/backlog/items/BL-260718-fix-oat-docs-generate-index.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/docs/index-generate/index.ts:71-97` resolves both
    defaults against `context.cwd`, writes the output, and then rewrites
    `documentation.index` to match that output.
  - `packages/cli/src/commands/docs/index-generate/index.test.ts:102-182`
    explicitly locks in the CWD-relative repository-root `index.md` behavior
    that the backlog item rejects, and the unconditional config rewrite.
  - `packages/cli/src/commands/docs/init/scaffold.ts:404-420`
    (`buildDocumentationConfig`) seeds `documentation.index` with
    `<root>/docs/index.md` for Fumadocs (the authored source map) and with
    `<root>/mkdocs.yml` for MkDocs (the nav/config YAML). Defaulting the
    generator's output to `documentation.index` would therefore overwrite an
    authored page or a YAML file on a fresh scaffold.
  - `.agents/skills/oat-docs-bootstrap/SKILL.md:906-910` narrates a bootstrap
    transition in which the first `oat docs generate-index` run moves the
    Fumadocs `documentation.index` from `<appRoot>/docs/index.md` to the
    generated `<appRoot>/index.md`, and warns when that did not happen.
    Removing the config update outright would break that documented
    transition; `:653` documents a D.2 backstop for older scaffolds whose
    authored `docs/index.md` carries the generated-file warning, so the
    generated-header marker alone cannot prove a file is safe to overwrite.
  - `.oat/config.json:29-34` sets `documentation.root` to `apps/oat-docs` (the
    docs **app** root, whose source pages live under `apps/oat-docs/docs`) and
    `documentation.index` to `apps/oat-docs/index.md`. The reference example in
    `apps/oat-docs/docs/reference/oat-directory-structure.md:160` uses
    `apps/docs/docs` (a docs **source** directory) for the same key, so the
    key's meaning is ambiguous today. This plan declares the docs **app root**
    (what `oat docs init` writes) as the canonical meaning, keeps a labeled
    compatibility rule for legacy source-root configs, and corrects the
    reference example.
  - `apps/oat-docs/AGENTS.md:47` already records the exact safe explicit
    invocation used by this repository; it needs verification, not a blind
    rewrite.
  - `apps/oat-docs/docs/docs-tooling/commands.md:119-140` and
    `apps/oat-docs/docs/reference/oat-directory-structure.md:113-116` still
    describe CWD defaults and config mutation.
- Related history:
  - [PR #27 — fix(docs-init): resolve friction points in oat docs init](https://github.com/voxmedia/open-agent-toolkit/pull/27)
    established the docs configuration surface.
  - [PR #231 — fix: make every user-default skill and agent reference scope-portable](https://github.com/voxmedia/open-agent-toolkit/pull/231)
    supplied the second recurrence recorded in the backlog item; it did not fix
    this command.
  - [Issue #239 — oat docs generate-index has no exclusion mechanism](https://github.com/voxmedia/open-agent-toolkit/issues/239)
    is adjacent but independent: exclusion policy is not required to fix path
    resolution or config mutation.

## Dependencies

| Type          | Dependency                                                                                                                           | Required state                                                                                                                                                                                         | Current state                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Soft          | [Issue #239](https://github.com/voxmedia/open-agent-toolkit/issues/239)                                                              | Recheck only if it changes the same option/config resolver first.                                                                                                                                      | Open; concerns exclusion rather than path ownership. |
| Soft ordering | W1 group 2 plan [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)       | Runs after this plan; both edit `index-generate/index.ts`, `apps/oat-docs/docs/reference/oat-directory-structure.md`, `index.test.ts`, and `docs-tooling/commands.md`, so never in one parallel group. | Pending.                                             |
| Soft ordering | W5 group 1 plan [Keep instruction-sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Runs after this plan and inherits the app-root meaning of `documentation.root` and the content-tree derivation settled here; it must not re-derive the docs root independently. No file is shared.     | Pending.                                             |
| Soft surface  | `packages/cli/src/commands/docs/init/scaffold.ts`, its tests, and `.agents/skills/oat-docs-bootstrap/SKILL.md`                       | No other program plan edits these files; this plan owns the Fumadocs seed value and the bootstrap narration if its wording changes.                                                                    | Verified 2026-09-05 against the corpus.              |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                                                                         | Required update                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                                                                                 | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted.                                                                                                                           |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes              | `apps/oat-docs/docs/reference/oat-directory-structure.md` (PR #190 head `63161897dd40a66e1b29cf19e286665895c40dde` rewrites this page). | If #190 merges first: re-read the merged page, re-anchor the `:113-116` and `:160` citations, and apply step 3 to the merged text. If this lands first, #190 rebases onto the corrected example. |

## Drift check

Run before editing:

```bash
git fetch origin main
test "$(git rev-parse origin/main)" = "49aeb5075971180b48c131bbd2b21b82d455bfc9" || git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/docs/index-generate packages/cli/src/commands/docs/init/scaffold.ts packages/cli/src/commands/docs/init/scaffold.test.ts packages/cli/src/commands/docs/init/integration.test.ts packages/cli/src/commands/docs/init/mkdocs-compat.test.ts .agents/skills/oat-docs-bootstrap/SKILL.md .oat/config.json apps/oat-docs/AGENTS.md apps/oat-docs/docs/docs-tooling/commands.md apps/oat-docs/docs/reference/oat-directory-structure.md
```

If any cited path changed, compare the live behavior with this plan before
editing. A material mismatch is a STOP condition unless this plan is refreshed
or superseded.

## Repository conventions

- Build: `pnpm build` and `pnpm build:docs` → workspace and docs builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/commands/docs/index-generate/index.test.ts`
  → configured, explicit, and failure cases pass.
- Lint/format check: `pnpm check` → repository and docs Markdown checks pass.
- Implementation pattern: resolve the repository root before interpreting
  repository-relative configuration; treat supplied CLI paths as CWD-relative.
- Git/PR convention: shipped CLI/docs changes are release-shaped; the lockstep
  bump is owned by the wave fan-in in lane mode (see Scope). Do not push or
  open a PR unless instructed.
- Skill assets: `pnpm lint && pnpm format` and `pnpm oat:validate-skills` if
  step 4 changes `.agents/skills/oat-docs-bootstrap/SKILL.md`.

## Scope

### In scope

- `packages/cli/src/commands/docs/index-generate/index.ts` — distinguish omitted
  options from explicit flags, resolve configured paths, validate before write,
  refuse unsafe output targets, and confine the config write to the Fumadocs
  manifest transition.
- `packages/cli/src/commands/docs/index-generate/index.test.ts` — replace stale
  CWD/config-write assertions with configured, explicit, fail-closed, and
  scaffold-derived safety cases.
- `packages/cli/src/commands/docs/init/scaffold.ts`
  (`buildDocumentationConfig`) and its tests (`scaffold.test.ts`,
  `integration.test.ts`, `mkdocs-compat.test.ts`, `index.test.ts` where they
  assert `documentation.index`) — seed the Fumadocs `documentation.index` with
  the generated manifest path `<root>/index.md` so a fresh scaffold is correct
  before the first build; leave the MkDocs seed unchanged.
- `.agents/skills/oat-docs-bootstrap/SKILL.md` — Section A narration
  (`:906-910`) only if the seed change makes the "stale path warning" wording
  inaccurate; bump `version:` if edited.
- `apps/oat-docs/docs/docs-tooling/commands.md` and
  `apps/oat-docs/docs/reference/oat-directory-structure.md` — document the
  configured default and immutable config contract.
- `apps/oat-docs/AGENTS.md` — verify its explicit command remains correct; edit
  only if live text no longer matches the tested safe invocation.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Exclusion globs or ignore files from issue #239 — separate behavior and tests.
- Changing docs navigation semantics or generated index content.
- Inferring a docs app from arbitrary marker files when configuration is absent.
- Mutating `documentation.root`, `documentation.config`, or any MkDocs
  configuration during generation; writing `documentation.index` for any reason
  other than recording the Fumadocs manifest actually written inside
  `documentation.root`.
- A new generated-index config field or a migration of existing configs.

## Current state

Commander assigns `docsDir = "docs"` before `runIndexGenerate` can tell whether
the operator supplied the option. `runIndexGenerate` then joins both paths to
the invoking CWD, writes first, and persists the resulting output path back to
configuration. In this repository that turns a bare root invocation into a
stray `index.md` and can silently replace the configured docs-app index path.
Using `documentation.index` as the default output would be worse on a fresh
scaffold: `buildDocumentationConfig` seeds it with the authored Fumadocs
`docs/index.md` or with `mkdocs.yml`, and both would be clobbered.

The safe contract is configuration-first for omitted values:

- `documentation.root` canonically means the docs **app root**, exactly what
  `oat docs init` writes (`scaffold.ts:404-420`), and this repository's
  `apps/oat-docs` value matches. Omitted `--docs-dir` → `<root>/docs` when that
  is a directory, otherwise `<root>`. The `<root>/docs` precedence is
  **compatibility behavior** for legacy configs whose `root` names a docs
  source directory (the reference example `apps/docs/docs` today); it is not a
  second meaning of the key. A source root that itself contains a `docs`
  subsection is narrowed by this rule, so generation prints the derived
  directory in human and JSON output, the docs page names `--docs-dir` as the
  escape hatch, and the test plan pins that case explicitly. This repository's
  root `apps/oat-docs` carries top-level `AGENTS.md`, `CLAUDE.md`, and
  `index.md`, so any "looks like a docs tree" heuristic on the root itself
  misclassifies it; the child-directory test is the only safe rule. Document
  the canonical meaning and the compatibility rule in
  `oat-directory-structure.md` and correct its example to an app root;
- omitted `--output` → `<root>/index.md`, the generated app-root manifest
  (`AGENTS.md` "Generated index" and `oat-docs-bootstrap/SKILL.md:931`), never
  the raw `documentation.index` value;
- an explicitly supplied path → resolved from `context.cwd`;
- any omitted value without a non-empty configured `documentation.root` →
  error before calling `generateIndex` or `writeFile`;
- output safety, checked before generation for derived and explicit paths
  alike: the output must not lie inside the resolved docs directory (the
  generator never writes into the tree it indexes, which also covers older
  scaffolds whose authored `docs/index.md` carries the generated-file warning
  per `oat-docs-bootstrap/SKILL.md:653`), must not equal
  `documentation.config`, and must not end in `.yml`/`.yaml`; an existing
  Markdown file at the output path that lacks the `GENERATED_INDEX_WARNING`
  marker (`index.ts:16-17`) is overwritten only when `--output` named it
  explicitly, otherwise the command fails with a `CliError` naming the
  conflicting file; and
- the only configuration write: when `documentation.tooling` is `fumadocs`
  (or `documentation.config` is absent), the written output lies inside
  `documentation.root`, and `documentation.index` differs, record the
  repo-relative output path in `documentation.index`. This preserves the
  bootstrap transition at `oat-docs-bootstrap/SKILL.md:906-910` for both the
  bare invocation and the explicit `predev`/`prebuild` script at `:564`. When
  `documentation.tooling` names any tooling other than `fumadocs`, or tooling
  is undeclared and `documentation.config` is set, never call `writeOatConfig`
  (amended 2026-09-06 by the wave-1 wrapper: the earlier "or
  `documentation.config` is set" wording contradicted the Fumadocs transition
  above for this repository's own config shape).

## Implementation steps

### 1. Resolve omitted paths from repository configuration

In `index.ts`, make both command options distinguishable as omitted versus
explicit. Resolve the repository root and read config before generating. Add a
small resolver that returns absolute docs/output paths using the contract above
and throws `CliError` with `exitCode: 2` and an actionable flag/config message
when an omitted value has no usable configuration. The command wrapper at
`index.ts:118-129` currently sets `process.exitCode = 1` for every error; make it
propagate `error.exitCode` when the error is a `CliError` (see
`packages/cli/src/errors/cli-error.ts`) so the documented exit code is real.

Keep explicit paths CWD-relative for backward compatibility. Validate all
inputs, including the output-safety checks above, before generation. Keep the
injected `writeOatConfig` seam but call it only under the Fumadocs transition
condition; the MkDocs branch and the outside-root branch return before it.

**Verify:** `pnpm --filter @open-agent-toolkit/cli type-check` → the command and
dependency harness compile; `grep -n "writeOatConfig" packages/cli/src/commands/docs/index-generate/index.ts`
shows exactly one call site guarded by the tooling and inside-root conditions.

### 2. Replace tests for the rejected side effect

Update `index.test.ts` so bare invocation from `/tmp/repo` with repository
config `root: apps/docs` writes `/tmp/repo/apps/docs/index.md` from
`/tmp/repo/apps/docs/docs`. Add table-driven cases for explicit paths, one
explicit/one configured path, missing root, and a failure-before-write
assertion.

Build two fixtures from the real scaffold output rather than invented config:
call `buildDocumentationConfig` (or copy its literal result and cite the
function) for `fumadocs` and `mkdocs`. For the Fumadocs fixture, seed
`documentation.index` with the pre-fix `<root>/docs/index.md` value and place
authored bytes there; assert the bare run writes `<root>/index.md`, leaves the
authored `docs/index.md` bytes unchanged, and records `<root>/index.md` in
`documentation.index` (the bootstrap transition). For the MkDocs fixture,
assert the bare run writes `<root>/index.md`, leaves `mkdocs.yml` bytes
unchanged, and calls `writeOatConfig` zero times. Add refusal cases:
`--output` pointing inside the docs directory, at `documentation.config`, or
at a `.yaml` path fails before `generateIndex`; a derived output whose
existing file lacks the marker fails, while the same path named by `--output`
is overwritten. Add the compatibility cases: a legacy source-root config
(`root: apps/docs/docs`, no `docs` child) indexes `apps/docs/docs`; a source
root that contains a nested `docs` directory is narrowed to it and the JSON
output reports the derived directory; explicit `--docs-dir` wins over both.

Retain repeated-header and stale-output coverage. Delete tests whose only
purpose was to require an unconditional config rewrite.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/commands/docs/index-generate/index.test.ts`
→ all focused cases pass; the only config-write expectations are the Fumadocs
transition case and its zero-write MkDocs twin.

### 3. Align command and config documentation

Update the two docs pages to say omitted paths come from `.oat/config.json`,
explicit flags override them, the default output is `<root>/index.md`, the
generator refuses the unsafe targets above, and the only configuration write
is the Fumadocs manifest transition. In `oat-directory-structure.md`, state
that `documentation.root` is the docs app root, describe the `<root>/docs`
rule as compatibility behavior for legacy source-root values, name
`--docs-dir` as the override, and replace the `apps/docs/docs` example
(`:160`) with an app-root example such as `apps/docs`. Show the repository's
explicit invocation as a portable fallback. Confirm the existing
`apps/oat-docs/AGENTS.md:47` command remains accurate; do not churn it if it
already matches.

**Verify:** `pnpm check && pnpm build:docs` → Markdown and docs build pass;
`grep -n "apps/docs/docs" apps/oat-docs/docs/reference/oat-directory-structure.md`
→ no hit.

### 4. Seed the Fumadocs scaffold with the generated manifest path

In `scaffold.ts` `buildDocumentationConfig`, set the Fumadocs `index` to
`join(targetDir, 'index.md')` so a fresh scaffold names the generated manifest
before the first build; keep the MkDocs branch unchanged. Update the
`docs/init` tests that assert the Fumadocs seed. Re-read
`oat-docs-bootstrap/SKILL.md:906-910`: the "stale path warning" branch still
describes older scaffolds correctly, so edit it only if a sentence becomes
false; if edited, bump the skill `version:`.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/docs/init` → scaffold, integration, and
mkdocs-compat suites pass with the new Fumadocs seed and the unchanged MkDocs
seed.

### 5. Bump and gate

**Lane mode (default under the execution program):** bump changed skill
`version:` fields (only `oat-docs-bootstrap` if step 4 edited it; it has no
pin in `packages/cli/src/validation/skills.test.ts`); run the focused tests
above, then `pnpm check`, `pnpm type-check`, and `pnpm run check:skill-bumps`
with captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` if `.agents/skills` changed. Do not edit lockstep
release files or run `pnpm release:check-versions` / `pnpm release:validate`;
the wave fan-in owns the lockstep bump and the full definition-of-done
sequence. **Standalone mode only:** bump the five public packages above
freshly fetched `origin/main` and run the eight AGENTS.md gates in order.

**Verify:** every named command exits zero, and the focused docs-index test
must execute rather than replay stale cache evidence.

## Test plan

- Change `packages/cli/src/commands/docs/index-generate/index.test.ts` using its
  injected config/filesystem dependencies.
- Prove a bare monorepo-root invocation derives both paths from
  `documentation.root` and writes `<root>/index.md`.
- Prove explicit flags win and remain CWD-relative.
- Prove missing config fails before generation/output mutation.
- Prove, on both scaffold-derived fixtures, that authored `docs/index.md` and
  `mkdocs.yml` bytes are unchanged after a bare run.
- Prove the Fumadocs transition writes `documentation.index` once and the
  MkDocs run never calls `writeOatConfig`.
- Prove the refusal set (inside docs dir, `documentation.config`, YAML,
  unmarked Markdown without explicit `--output`) fails before generation.
- Prove the compatibility derivation (legacy source root, nested `docs`
  narrowing with reported derivation, explicit `--docs-dir` precedence).
- Prove the scaffold seeds Fumadocs `documentation.index` with `<root>/index.md`.
- Retain generated-header idempotence cases.

## Done criteria

- [ ] Bare root invocation writes `<documentation.root>/index.md`.
- [ ] Explicit path flags retain their documented meaning.
- [ ] Missing configured defaults fail before any output write.
- [ ] No run overwrites an authored page, `documentation.config`, or a YAML
      file; both scaffold-derived fixtures keep their authored bytes.
- [ ] The only configuration write is the Fumadocs manifest transition; MkDocs
      runs never write `.oat/config.json`.
- [ ] A fresh Fumadocs scaffold seeds `documentation.index` with the generated
      manifest path.
- [ ] Docs state the app-root meaning, the labeled compatibility rule, the
      corrected example, and the `--docs-dir` override; issue #239 remains out
      of scope.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no stray root `index.md` or unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the configured `documentation.root` does not exist, or the docs owner
  rejects the app-root meaning or the labeled `<root>/docs` compatibility
  rule; record the decision instead of guessing;
- live config schema no longer names `documentation.root`,
  `documentation.index`, and `documentation.tooling`;
- a caller other than the documented Fumadocs bootstrap transition relies on
  generation mutating config, or the scaffold seed change breaks a
  `docs/init` contract not covered by step 4;
- preserving an explicit flag requires guessing an unconfigured output path;
- issue #239 or another PR has already replaced this resolver contract;
- a named verification gate fails twice after one bounded correction; or
- the change would expand into docs navigation/exclusion redesign.

## Revalidation Before Execution

Revalidate this plan against current `origin/main`, the source backlog item,
issue #239, cited files, and focused tests when any of the following is true:

- a hard or soft dependency changed after planning;
- substantial time has elapsed or `origin/main` advanced materially from
  `49aeb5075971180b48c131bbd2b21b82d455bfc9`;
- any cited config, command, docs, or test contract changed;
- linked backlog, issue, decision, or project intent changed;
- another PR implemented part of the outcome; or
- the executor cannot reproduce a load-bearing current-state claim.

Update or supersede this plan rather than silently executing stale instructions.

## Review focus

- Verify all validation, including output safety, occurs before the first
  write, for derived and explicit outputs alike.
- Confirm the config write is reachable only on the Fumadocs inside-root
  branch and that the MkDocs fixture proves zero writes.
- Confirm explicit paths and configured paths use the intended base directory.
- Confirm JSON/human errors remain machine-safe and actionable.
- Confirm config mutation and exclusion-policy work did not creep back in.
