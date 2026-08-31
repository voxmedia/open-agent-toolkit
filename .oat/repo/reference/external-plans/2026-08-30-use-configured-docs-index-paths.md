---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260718-fix-oat-docs-generate-index.md
oat_external_plan_commit: 2c6005d64f45a19e8b9eedbc977959b066d3eda0
oat_external_plan_date: '2026-08-31'
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
`documentation.root` and `documentation.index`, so invoking it from a monorepo
root writes the intended docs-app index. Generation becomes read-only with
respect to `.oat/config.json`: missing or unusable path configuration fails
before any output write, while explicit path flags remain explicit overrides.

## Source and live evidence

- Source backlog item:
  [BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index cwd-relative defaults in monorepos](../../pjm/backlog/items/BL-260718-fix-oat-docs-generate-index.md)
- Planned at: `origin/main` commit
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` on `2026-08-31`.
- Verified evidence:
  - `packages/cli/src/commands/docs/index-generate/index.ts:71-97` resolves both
    defaults against `context.cwd`, writes the output, and then rewrites
    `documentation.index` to match that output.
  - `packages/cli/src/commands/docs/index-generate/index.test.ts:102-182`
    explicitly locks in the config rewrite and repository-root `index.md`
    behavior that the backlog item rejects.
  - `.oat/config.json:28-33` already names
    `apps/oat-docs/docs` and `apps/oat-docs/index.md` as the authoritative paths.
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

| Type | Dependency                                                              | Required state                                                    | Current state                                        |
| ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Soft | [Issue #239](https://github.com/voxmedia/open-agent-toolkit/issues/239) | Recheck only if it changes the same option/config resolver first. | Open; concerns exclusion rather than path ownership. |

There are no unsatisfied hard dependencies.

## Drift check

Run before editing:

```bash
git fetch origin main
test "$(git rev-parse origin/main)" = "2c6005d64f45a19e8b9eedbc977959b066d3eda0" || git diff --stat 2c6005d64f45a19e8b9eedbc977959b066d3eda0..origin/main -- packages/cli/src/commands/docs/index-generate .oat/config.json apps/oat-docs/AGENTS.md apps/oat-docs/docs/docs-tooling/commands.md apps/oat-docs/docs/reference/oat-directory-structure.md
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
- Git/PR convention: shipped CLI/docs changes require all five public package
  versions to move together; do not push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/commands/docs/index-generate/index.ts` — distinguish omitted
  options from explicit flags, resolve configured paths, validate before write,
  and remove generation-time config mutation.
- `packages/cli/src/commands/docs/index-generate/index.test.ts` — replace stale
  CWD/config-write assertions with configured, explicit, and fail-closed cases.
- `apps/oat-docs/docs/docs-tooling/commands.md` and
  `apps/oat-docs/docs/reference/oat-directory-structure.md` — document the
  configured default and immutable config contract.
- `apps/oat-docs/AGENTS.md` — verify its explicit command remains correct; edit
  only if live text no longer matches the tested safe invocation.
- Five public package manifests and `pnpm-lock.yaml` — required release
  bookkeeping.

### Out of scope

- Exclusion globs or ignore files from issue #239 — separate behavior and tests.
- Changing docs navigation semantics or generated index content.
- Inferring a docs app from arbitrary marker files when configuration is absent.
- Mutating `documentation.root` or `documentation.index` during generation.

## Current state

Commander assigns `docsDir = "docs"` before `runIndexGenerate` can tell whether
the operator supplied the option. `runIndexGenerate` then joins both paths to
the invoking CWD, writes first, and persists the resulting output path back to
configuration. In this repository that turns a bare root invocation into a
stray `index.md` and can silently replace the configured docs-app index path.

The safe contract is configuration-first for omitted values:

- omitted `--docs-dir` → `documentation.root`, resolved from repo root;
- omitted `--output` → `documentation.index`, resolved from repo root;
- an explicitly supplied path → resolved from `context.cwd`;
- any omitted value without a non-empty configured path → error before calling
  `generateIndex` or `writeFile`; and
- successful generation never calls `writeOatConfig`.

## Implementation steps

### 1. Resolve omitted paths from repository configuration

In `index.ts`, make both command options distinguishable as omitted versus
explicit. Resolve the repository root and read config before generating. Add a
small resolver that returns absolute docs/output paths using the contract above
and throws `CliError` exit code 2 with an actionable flag/config message when an
omitted value has no usable configuration.

Keep explicit paths CWD-relative for backward compatibility. Validate all
inputs before generation and remove `writeOatConfig`, `relative`, and the
associated dependency seam entirely.

**Verify:** `pnpm --filter @open-agent-toolkit/cli type-check` → the command and
dependency harness compile without config-write support.

### 2. Replace tests for the rejected side effect

Update `index.test.ts` so bare invocation from `/tmp/repo` with repository
config writes `/tmp/repo/apps/docs/index.md` from
`/tmp/repo/apps/docs/docs`. Prove no config write occurs. Add table-driven cases
for explicit paths, one explicit/one configured path, missing root, missing
index, and a failure-before-write assertion.

Retain repeated-header and stale-output coverage. Delete tests whose only
purpose was to require a config rewrite.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/commands/docs/index-generate/index.test.ts`
→ all focused cases pass and no test expects config mutation.

### 3. Align command and config documentation

Update the two docs pages to say omitted paths come from `.oat/config.json`,
explicit flags override them, and generation does not update configuration.
Show the repository's explicit invocation as a portable fallback. Confirm the
existing `apps/oat-docs/AGENTS.md:47` command remains accurate; do not churn it
if it already matches.

**Verify:** `pnpm check && pnpm build:docs` → Markdown and docs build pass.

### 4. Apply release bookkeeping and complete gates

Bump the five public package versions together and update `pnpm-lock.yaml`
through pnpm. Fetch `origin/main` immediately before the version gate.

**Verify:** run the repository Definition of Done in order:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
git fetch origin main
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Every command exits zero, and the focused docs-index test must execute rather
than replay stale cache evidence.

## Test plan

- Change `packages/cli/src/commands/docs/index-generate/index.test.ts` using its
  injected config/filesystem dependencies.
- Prove a bare monorepo-root invocation uses both configured paths.
- Prove explicit flags win and remain CWD-relative.
- Prove missing config fails before generation/output mutation.
- Prove generation never writes `.oat/config.json`.
- Retain generated-header idempotence cases.

## Done criteria

- [ ] Bare root invocation writes the configured docs-app index.
- [ ] Explicit path flags retain their documented meaning.
- [ ] Missing configured defaults fail before any output write.
- [ ] No generation path writes `.oat/config.json`.
- [ ] Docs describe the tested behavior and issue #239 remains out of scope.
- [ ] Focused tests and the full Definition of Done exit zero.
- [ ] All five public packages have one lockstep version bump.
- [ ] `git status --short` contains no stray root `index.md` or unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- live config schema no longer names both `documentation.root` and
  `documentation.index`;
- an existing caller demonstrably relies on generation mutating config;
- preserving an explicit flag requires guessing an unconfigured output path;
- issue #239 or another PR has already replaced this resolver contract;
- a named verification gate fails twice after one bounded correction; or
- the change would expand into docs navigation/exclusion redesign.

## Revalidation Before Execution

Revalidate this plan against current `origin/main`, the source backlog item,
issue #239, cited files, and focused tests when any of the following is true:

- a hard or soft dependency changed after planning;
- substantial time has elapsed or `origin/main` advanced materially from
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0`;
- any cited config, command, docs, or test contract changed;
- linked backlog, issue, decision, or project intent changed;
- another PR implemented part of the outcome; or
- the executor cannot reproduce a load-bearing current-state claim.

Update or supersede this plan rather than silently executing stale instructions.

## Review focus

- Verify all validation occurs before the first write.
- Confirm explicit paths and configured paths use the intended base directory.
- Confirm JSON/human errors remain machine-safe and actionable.
- Confirm config mutation and exclusion-policy work did not creep back in.
