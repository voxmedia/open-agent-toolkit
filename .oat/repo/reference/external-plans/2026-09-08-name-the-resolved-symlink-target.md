---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-name-the-resolved-target.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-name-the-resolved-target
oat_issue_url: null
created: '2026-09-08T21:50:00Z'
---

# Name the resolved target in the symlink inert-exclusion warning

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The change is
> confined to one function and one warning string in
> `packages/cli/src/commands/instructions/instructions.utils.ts`, plus its test
> file and one documentation sentence. It is independent of the two sibling
> wave-7 config lanes: they write no file this plan writes, and this plan
> writes no file they write, so it may run in the same parallel group as
> either.

## Outcome

An inert `documentation.instructionPointerExcludes` (or `documentation.root`)
entry is reported with the reason that actually applies. An entry naming
nothing on disk still gets today's message, byte for byte. An entry that
`realpath` resolves to a different directory — through a symlink, or through a
case-insensitive filesystem — gets a distinct message that names the resolved
target, so the operator can see _where_ the entry went instead of being told
the path does not exist and that matching is case-sensitive. The
case-insensitive variant keeps its case-sensitivity hint, because there the
hint is true; the symlink variant drops it, because there it is misleading.
Both messages are pinned by tests, including a fixture with a real symlinked
directory.

## Source and live evidence

- Source backlog item:
  [BL-260907-name-the-resolved-target — Name the resolved target in the symlink inert-exclusion warning](../../pjm/backlog/items/BL-260907-name-the-resolved-target.md)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756`
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the
  fetched `origin/main` tip; branch and tip coincide here.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.

### Verified evidence

- `packages/cli/src/commands/instructions/instructions.utils.ts:246-262` —
  `isCaseExactDirectory(dependencies, repoRoot, relativePath)` returns a single
  `boolean`. It realpaths `repoRoot` at `:252`, joins the candidate at `:253`,
  returns `false` when `directoryExists` is false at `:254-255`, realpaths the
  candidate at `:257`, and at `:258` returns
  `toPosixPath(relative(realRoot, realCandidate)) === relativePath`. The
  `catch` at `:259-260` also returns `false`. Four distinct situations —
  absent, unstat-able, resolved elsewhere by symlink, resolved elsewhere by
  case — collapse into one `false`.
- `packages/cli/src/commands/instructions/instructions.utils.ts:352-357` — the
  only consumer. When the probe is false it pushes
  `` `${source} entry ${JSON.stringify(normalizedPath)} matches no directory
in this repository (matching is case-sensitive), so it excludes nothing.` ``
  and `continue`s, keeping the entry out of `effective`.
- `packages/cli/src/commands/instructions/instructions.utils.ts:316-324` —
  both warning sources flow through the same loop: `documentation.root` (via
  the derived content root) and each
  `documentation.instructionPointerExcludes` entry. The `source` label is
  interpolated into the message, so both inherit whatever this plan writes.
- Reproduced live against the built CLI's module in a scratch repository, with
  a symlink `link-dir -> ../elsewhere/target` where `elsewhere/target` is a
  real directory inside the repository and shared config
  `{"version":1,"documentation":{"instructionPointerExcludes":["link-dir"]}}`:

  ```text
  configured: ["link-dir"]
  effective:  []
  warnings:   ["documentation.instructionPointerExcludes entry \"link-dir\"
               matches no directory in this repository (matching is
               case-sensitive), so it excludes nothing."]
  ```

  The directory exists and the entry names it correctly; the message is wrong
  on both counts.

- Reproduced the same collapse for an in-repository alias
  (`alias -> real-docs`) together with a genuinely absent entry
  (`missing-dir`): both produced the identical message, so the operator cannot
  tell the two apart.
- `packages/cli/src/commands/instructions/instructions.utils.test.ts:1002-1035`
  — the existing case-mismatch test simulates a case-insensitive filesystem by
  injecting `stat` and `realpath`, and asserts
  `expect(exclusions.warnings[0]).toContain('case-sensitive')`. The case
  branch must keep that substring or this test has to change; this plan keeps
  it.
- `packages/cli/src/commands/instructions/instructions.utils.test.ts:927-1050`
  — `describe('resolveInstructionPointerExcludes', ...)` with the
  `writeConfig(repoRoot, documentation)` helper and `createRepoRoot()`; this is
  the structural pattern for the new cases.
- `apps/oat-docs/docs/cli-utilities/configuration.md:95` — the prose behind the
  message says inert entries include "paths that match no directory (matching
  is case-sensitive)". It is the only documentation sentence that describes
  this warning; `apps/oat-docs/docs/provider-sync/instruction-sync.md:115-133`
  describes the `--json` fields but pins no message text.
- A repository-wide search for the message string
  (`grep -rn 'matches no directory'`) finds exactly two occurrences outside
  `dist/`: the source line and the backlog item. Nothing else pins it.

### Source claims found true, and one narrower

- The item's core claim is **true and reproduced**: the warning blames
  case-sensitivity for an entry `realpath` resolved elsewhere through a
  symlink.
- Narrower than the item implies: the item's criterion says the warning should
  distinguish "no such directory" from "resolves **outside the docs tree** via
  a symlink". The code's actual comparison is not against the docs tree — it is
  `relative(realRoot, realCandidate) === relativePath`, i.e. "does the entry
  resolve to _itself_". A symlink to a sibling directory **inside** the
  repository is reported inert for exactly the same reason as one pointing
  outside it (verified: `alias -> real-docs` warns identically). This plan
  implements the code's real distinction — resolved-to-a-different-path — and
  names the target in both cases, which covers the item's case as a subset.
- Also narrower: the item names only the symlink cause. The same branch fires
  for a case-insensitive filesystem, which is the branch the existing test at
  `:1002` exercises. The two are separated here so each keeps an accurate
  reason.

## Dependencies

| Type                  | Dependency                                                                                                                      | Required state                                                                                                   | Current state                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Satisfied predecessor | Wave-5 p02 [Keep instruction sync pointers out of docs trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | Merged, so the warning this plan refines exists.                                                                 | Merged; `resolveInstructionPointerExcludes` verified at this `HEAD`.  |
| Soft distinct         | [Fix oat config unset and adopt](./2026-09-08-fix-oat-config-unset-and-adopt.md)                                                | No file in common; may share a parallel group.                                                                   | Authored 2026-09-08 in the same wave-7 batch; disjoint write surface. |
| Soft distinct         | [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)                                                  | No file in common; may share a parallel group. That plan is explicitly scoped out of `commands/instructions/**`. | Authored 2026-09-08 in the same wave-7 batch; disjoint write surface. |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                      | Affected | Files in common                                                                                                  | Required update                                                                                                                            |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PR #273 (provider-neutral remote project management) lands | None     | None (verified: its changed-file list contains no `packages/cli/src/commands/instructions/` path).               | No action.                                                                                                                                 |
| PR #190 (ReviewPlan Stage A) lands                         | None     | None (verified: its changed-file list contains no `packages/cli/src/commands/instructions/` path).               | No action.                                                                                                                                 |
| PR #125 (`oat-brainstorm` visual companion) lands          | None     | None (verified: its changed-file list contains no `packages/cli/src/commands/instructions/` path).               | No action.                                                                                                                                 |
| Either sibling wave-7 config lane merges                   | None     | None. Both are scoped out of `commands/instructions/**`; the harden lane says so explicitly in its Out of scope. | If a later lane does wire a config warning into `resolveInstructionPointerExcludes`, re-anchor `:316-324` before editing the warning loop. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- \
  packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts \
  packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/validate/validate.ts \
  apps/oat-docs/docs/cli-utilities/configuration.md \
  apps/oat-docs/index.md \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json
```

`instructions.types.ts`, `sync/sync.ts` and `validate/validate.ts` are listed
because they consume the `warnings` array; they are **read**, never written
(the array's shape does not change, only the strings in it).
`apps/oat-docs/index.md` is listed because it is generated and must stay
byte-identical. The lockstep `package.json` files are listed for drift
awareness only; in lane mode this plan never edits them.

If any listed file changed, re-anchor every `file:line` citation by symbol name
(`isCaseExactDirectory`, `resolveInstructionPointerExcludes`) and re-run the
symlink reproduction from [Verified evidence](#verified-evidence). A material
mismatch — for example the probe already returning a structured result, or the
warning string already naming a resolved path — is a STOP condition.

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before any
  built-CLI reproduction and before `pnpm test:smoke` / `pnpm test:release`.
- Typecheck: `pnpm type-check` → passes.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/commands/instructions` → passes.
- Full test (uncached, evidence-grade): from the repository root,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`. A plain `pnpm test` is
  frequently a Turborepo cache replay; `pnpm test --force` does not force a
  re-run.
- Lint/format check (non-mutating): `pnpm check` — which is the gate that runs
  markdownlint over `apps/oat-docs/docs`, and therefore the binding one for the
  documentation sentence this plan edits — plus `pnpm lint` and `pnpm format`,
  neither of which CI runs.
- Capture each gate's exit code explicitly, for example
  `pnpm check > gate.log 2>&1; echo "exit=$?"`.
- Docs: `apps/oat-docs/index.md` is generated by `oat docs generate-index` and
  must never be hand-edited. Editing prose in an existing page adds no page, so
  the index must come out unchanged; verify that rather than assuming it.
- Release policy: a change under `apps/oat-docs/docs` counts as shipped CLI
  functionality for the lockstep bump. In lane mode the wave fan-in owns that
  bump; this lane makes none.
- Skill versioning: **not applicable.** This plan changes no
  `.agents/skills/*/SKILL.md`, so there is no `metadata.version` bump (the
  top-level `version:` field is gone since CLI 0.2.65).
  `pnpm run check:skill-bumps` must still pass, reporting nothing.
- Implementation pattern: the discriminated-result shape follows
  `InstructionPointerExclusions` in
  `commands/instructions/instructions.types.ts:100-107` — a small, named,
  exhaustively-handled result rather than a boolean plus out-of-band context.
  The test pattern is the injected-`stat`/`realpath` simulation at
  `instructions.utils.test.ts:1002-1035`.
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

- `packages/cli/src/commands/instructions/instructions.utils.ts` — replace the
  boolean `isCaseExactDirectory` (`:246-262`) with a probe returning a
  discriminated result, and replace the single warning at `:352-357` with the
  two messages that result selects.
- `packages/cli/src/commands/instructions/instructions.utils.test.ts` — the new
  and extended cases in [Test plan](#test-plan).
- `apps/oat-docs/docs/cli-utilities/configuration.md:95` — one sentence, so the
  documented reason list matches the messages the command now emits.

### Out of scope

- The `effective` / `configured` classification. A resolved-elsewhere entry is
  still inert and still kept out of `effective`; only the _reason text_
  changes. Making such an entry effective would silently start excluding a
  directory the operator did not name.
- `packages/cli/src/commands/instructions/sync/sync.ts` and
  `validate/validate.ts` — they iterate `exclusions.warnings` and print them
  (`sync.ts:380-382`, `validate.ts:59`). The array's shape is unchanged, so
  they need no edit; verify, do not edit.
- `InstructionPointerExclusions` in `instructions.types.ts` — unchanged. The
  new result type is internal to `instructions.utils.ts` and is not exported.
- The absent-entry message. It stays byte-identical, so an operator or script
  that recognizes it today keeps working.
- `UNEXCLUDABLE_PATHS` and the normalization warnings at `:333-338` and
  `:345-350` — different branches, untouched.
- Any file under `packages/cli/src/config/` or
  `packages/cli/src/commands/config/`. Those belong to the two sibling wave-7
  lanes; this plan must not touch them, and does not need to.
- Symlink handling in the directory scan itself
  (`scanInstructionDirectories`, `:365`). This plan changes a diagnostic, not
  traversal.

## Current state

`resolveInstructionPointerExcludes` (`instructions.utils.ts:289-363`) is the
single place `oat instructions sync` and `oat instructions validate` compute
exclusions, so both commands report identically. It builds a `requested` list
from the derived documentation content root plus the configured
`instructionPointerExcludes` entries, then classifies each one: dropped during
normalization, an unexcludable carve-in root, not a real case-exact directory,
or effective. Each of the first three pushes a warning and keeps the entry out
of `effective`.

`isCaseExactDirectory` implements the third check. Resolving through `realpath`
and comparing against the requested spelling is deliberate and correct — the
scan compares directories against `relative(repoRoot, ...)`, which always
yields the true on-disk case, so a plain existence test would accept a
mis-cased path on APFS or NTFS and report an exclusion as applied while it
matched nothing (issue #238). The defect is not the check; it is that the
check's single `false` is reported with one fixed explanation that is only
sometimes the right one.

## Implementation steps

### 1. Replace the boolean probe with a discriminated result

In `packages/cli/src/commands/instructions/instructions.utils.ts`, replace
`isCaseExactDirectory` (`:246-262`) with:

```ts
/**
 * How a configured exclusion path resolves on disk.
 *
 * The scan compares directories against `relative(repoRoot, ...)`, which
 * always yields the true on-disk path, so an entry is only effective when it
 * resolves to itself. That test is unchanged. What is split out here is *why*
 * it failed: "there is nothing there" and "there is something there, but it is
 * really somewhere else" are different operator problems, and only the second
 * has a target worth naming.
 */
type ExclusionDirectoryProbe =
  | { kind: 'exact' }
  | { kind: 'absent' }
  | { kind: 'resolved-elsewhere'; resolvedPath: string; caseOnly: boolean };
```

and a `probeExclusionDirectory(dependencies, repoRoot, relativePath):
Promise<ExclusionDirectoryProbe>` that keeps every existing step in order:

- realpath `repoRoot`, join the candidate — unchanged;
- `directoryExists` false → `{ kind: 'absent' }` (today's `false` at `:255`);
- realpath the candidate, compute
  `resolved = toPosixPath(relative(realRoot, realCandidate))`;
- `resolved === relativePath` → `{ kind: 'exact' }` (today's `true`);
- otherwise → `{ kind: 'resolved-elsewhere', resolvedPath, caseOnly }`, where
  `caseOnly` is `resolved.toLowerCase() === relativePath.toLowerCase()` and
  `resolvedPath` is `resolved` when it stays inside the repository
  (it does not start with `..`) and the absolute `realCandidate` otherwise, so
  a link out of the tree is named plainly instead of as a chain of `../`;
- any throw → `{ kind: 'absent' }` (today's `catch` at `:259-260`).

Keep the existing doc comment's explanation of _why_ `realpath` is used and why
`repoRoot` is realpathed too; it is still the reason the check exists.

**Verify:** from `packages/cli`, `pnpm type-check` at the repository root
passes and `pnpm exec vitest run src/commands/instructions` → passes with the
existing assertions still green (the messages have not changed yet, because
Step 2 has not run).

### 2. Emit the reason that applies

In the same file, replace the block at `:352-357` with a switch on the probe:

- `exact` → fall through to `effective.push(normalizedPath)` as today.
- `absent` → push the **byte-identical** existing message:
  `` `${source} entry ${JSON.stringify(normalizedPath)} matches no directory in
this repository (matching is case-sensitive), so it excludes nothing.` ``
- `resolved-elsewhere` with `caseOnly: true` → push a message that keeps the
  case-sensitivity hint and adds the on-disk spelling, for example:
  `` `${source} entry ${JSON.stringify(normalizedPath)} matches no directory in
this repository (matching is case-sensitive; the directory on disk is
${JSON.stringify(resolvedPath)}), so it excludes nothing.` ``
- `resolved-elsewhere` with `caseOnly: false` → push a message that drops the
  case hint and names the target, for example:
  `` `${source} entry ${JSON.stringify(normalizedPath)} resolves to
${JSON.stringify(resolvedPath)}, not to itself, so the scan never matches it
and it excludes nothing. Point the entry at the resolved directory, or remove
the symlink.` ``

Handle every `kind` exhaustively — no `default` that silently absorbs a future
variant.

**Verify:** after `pnpm build`, re-run the symlink reproduction from
[Verified evidence](#verified-evidence) against the built module: the warning
must name the resolved target and must **not** contain `case-sensitive`.

### 3. Add and extend the tests

Add the cases in [Test plan](#test-plan) to
`packages/cli/src/commands/instructions/instructions.utils.test.ts`, inside the
existing `describe('resolveInstructionPointerExcludes', ...)` block at `:927`,
reusing `createRepoRoot()` and `writeConfig()`. Extend the existing
case-mismatch case at `:1002` to also assert the on-disk spelling is named.

**Verify:** from `packages/cli`,
`pnpm exec vitest run src/commands/instructions/instructions.utils.test.ts`
→ all cases pass.

### 4. Update the documented reason list

In `apps/oat-docs/docs/cli-utilities/configuration.md:95`, change the inert-entry
list so it distinguishes the two: an entry that matches no directory (matching
is case-sensitive) and an entry that resolves elsewhere through a symlink, with
the warning naming the resolved target in the second case. Change nothing else
in the sentence, and add no heading.

**Verify:**

```bash
pnpm check > /tmp/gate-check.log 2>&1; echo "check exit=$?"
pnpm run cli -- docs generate-index
git diff --stat -- apps/oat-docs/index.md
```

`pnpm check` must report `exit=0` (it runs markdownlint over
`apps/oat-docs/docs`), and the index diff must be empty.

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
not run `pnpm release:check-versions` or `pnpm release:validate`. **Standalone
mode only:** additionally bump the five public package versions above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

All cases live in
`packages/cli/src/commands/instructions/instructions.utils.test.ts`, inside
`describe('resolveInstructionPointerExcludes', ...)` at `:927`. The structural
pattern for the injected-filesystem case is `:1002-1035`; for the on-disk
cases it is `:958-971`.

1. **`warns with the resolved target for an entry that is a symlink to another
directory`** — create `real-docs/` and `alias -> real-docs` inside the
   repository root, configure `instructionPointerExcludes: ['alias']`, and
   assert: `configured` is `['alias']`, `effective` is `[]`, exactly one
   warning, and the warning contains `alias`, contains `real-docs`, contains
   `excludes nothing`, and does **not** contain `case-sensitive`.
   _Red before Step 2:_ the warning is the old one — it lacks `real-docs` and
   contains `case-sensitive`.
2. **`warns with the resolved target for a symlink pointing outside the
repository`** — create the link target outside the repository root (a second
   `mkdtemp` directory), link to it from inside, and assert the warning names
   the resolved absolute path rather than a chain of `../` segments, and again
   omits `case-sensitive`. Compute the expected path in the test with
   `fsRealpath` so no machine-specific literal is hardcoded.
   _Red before Step 2:_ the old message, with no target.
3. **`keeps the existing message for an entry that names nothing`** — the
   existing case at `:958` extended with an exact-string assertion (not just
   `toContain`) on the full message, so the byte-identical promise is pinned
   rather than assumed.
   _Green before and after:_ this is the regression guard for the unchanged
   branch.
4. **`names the on-disk spelling for a case-mismatched content root`** — the
   existing case at `:1002`, extended to assert the warning still contains
   `case-sensitive` **and** now contains the true on-disk spelling
   (`apps/docsapp/docs`). Keep the injected `stat`/`realpath` simulation so the
   case is deterministic on a case-sensitive runner.
   _Red before Step 2:_ the on-disk spelling is absent.
5. **`applies the same distinction to a symlinked documentation.root`** —
   configure `root` as a symlink alias rather than an
   `instructionPointerExcludes` entry, and assert the warning is prefixed
   `documentation.root` and names the resolved target. This pins that the
   `source` label at `:319` still flows into the new messages.
   _Red before Step 2:_ the old message.
6. **Unchanged neighbours that must stay green**: the effective-entry case at
   `:940`, the normalization-drop case at `:973`, and the carve-in case at
   `:988`.

### Red-then-green negative controls

- **Cases 1, 2, 4, 5.** Run all four against the unmodified
  `isCaseExactDirectory` and the unmodified warning at `:352-357`; each must
  fail, and cases 1, 2 and 5 must fail specifically on the
  `not.toContain('case-sensitive')` or the missing-target assertion. Capture
  that output. After Steps 1–2, all four pass.
- **Case 3 (the unchanged branch).** Prove it can fail: temporarily alter the
  `absent` message by one character, confirm case 3 fails on the exact-string
  assertion, restore, confirm green. Without this, "byte-identical" is an
  unverified claim.
- **The exhaustive switch.** Prove the classifier is load-bearing: temporarily
  make `probeExclusionDirectory` return `{ kind: 'absent' }` for the
  resolved-elsewhere branch, confirm cases 1, 2, 4 and 5 all fail, restore,
  confirm green.

### Weaker-anywhere rule

`resolveInstructionPointerExcludes` decides which configured exclusions count
as protection, so it is a guard. **No entry may become effective that was not
effective before.** The `exact` branch is byte-for-byte the previous `true`
condition, and both new branches still `continue` without pushing to
`effective`, so the effective set is provably unchanged; cases 1, 2, 4, 5 and 6
assert `effective` explicitly for exactly that reason. If any entry that was
previously reported inert becomes effective, that is Critical and a STOP
condition — it means a directory is now being skipped that the operator was
previously told was unprotected.

## Done criteria

- [ ] `isCaseExactDirectory`'s boolean is gone; the probe returns a
      discriminated result whose every variant is handled without a catch-all
      `default`.
- [ ] The absent-entry warning is byte-identical to the message at
      `instructions.utils.ts:354` at the inspected `HEAD`, pinned by an
      exact-string assertion (test case 3).
- [ ] The resolved-elsewhere warning names the resolved target and omits the
      case-sensitivity hint; the case-only variant keeps the hint and adds the
      on-disk spelling.
- [ ] A live reproduction on the built CLI with a real symlinked directory
      shows the new message (`pnpm build`, then the probe from
      [Verified evidence](#verified-evidence)).
- [ ] `effective` is unchanged for every case in the suite; no previously inert
      entry became effective.
- [ ] Test-plan cases 1–6 pass, and all three negative controls were run with
      their red state captured and reported.
- [ ] `apps/oat-docs/docs/cli-utilities/configuration.md` describes both
      reasons, `pnpm check` passes (markdownlint included), and
      `oat docs generate-index` leaves `apps/oat-docs/index.md` unchanged.
- [ ] `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run
test --force`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0` with the exit code
      captured explicitly.
- [ ] No lockstep release file is edited (lane mode), no file under
      `packages/cli/src/config/` or `packages/cli/src/commands/config/` is
      touched, and `git status --short` contains no unexplained or
      out-of-scope file.
- [ ] The source backlog item is linked from this plan and links back to it
      through `external_plans`.

## STOP conditions

Stop and report instead of improvising when:

- the drift check shows `isCaseExactDirectory` already returns a structured
  result, or the warning already names a resolved path — the plan's premise is
  gone and it needs re-authoring;
- any entry that was inert before becomes effective (the weaker-anywhere rule);
- the existing case-mismatch test at `instructions.utils.test.ts:1002` cannot
  be kept green with its `case-sensitive` assertion intact — that would mean
  the case branch lost its accurate hint, which this plan promises to keep;
- a symlink fixture cannot be created on the runner (for example on a platform
  without symlink permission). Do **not** substitute a mocked `realpath` for
  case 1 and call it a symlink test; report the platform limitation, keep case
  4's injected simulation, and mark case 1 as unverified on that host;
- the change would require editing `instructions.types.ts`,
  `sync/sync.ts`, `validate/validate.ts`, or any file under
  `packages/cli/src/config/` or `packages/cli/src/commands/config/`;
- `oat docs generate-index` produces a diff in `apps/oat-docs/index.md`;
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- PR #273, PR #190, or PR #125 lands — none touches
  `packages/cli/src/commands/instructions/` today, so re-check that before
  relying on the "no action" rows in
  [Landing-event impact](#landing-event-impact);
- a later lane wires an additional warning source into
  `resolveInstructionPointerExcludes`, which would move the `:316-324` and
  `:330-360` anchors;
- any cited line anchor in `instructions.utils.ts`,
  `instructions.utils.test.ts`, or
  `apps/oat-docs/docs/cli-utilities/configuration.md` moves;
- the symlink reproduction in [Verified evidence](#verified-evidence) cannot be
  reproduced on the built CLI.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`, and record the refreshed comparison rather than re-stamping the
authored provenance.

## Review focus

- **That the `exact` branch is byte-for-byte the old `true` condition.** The
  whole change is a diagnostic refinement; if the effectiveness test drifted at
  all, a directory could start or stop being excluded, which is a behavior
  change nobody asked for.
- **The exact-string assertion on the absent message** (case 3), and its
  negative control. "Unchanged" claims are the ones most often wrong.
- **That `caseOnly` is computed from the resolved path, not from the platform.**
  A case-insensitive host is not the only way to reach that branch, and a
  platform check would make the message wrong on the other paths.
- **The out-of-repository path rendering** in case 2 — a resolved target
  outside the repository should read as a plain path, not as a `../` chain.
- **Independence:** confirm the diff touches no file under
  `packages/cli/src/config/` or `packages/cli/src/commands/config/`, which
  belong to the two sibling wave-7 lanes.
- **Deliberately deferred:** resolved-elsewhere entries stay inert rather than
  being followed to their target; and `scanInstructionDirectories`' own symlink
  handling is untouched.
