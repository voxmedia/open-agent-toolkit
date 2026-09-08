---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-finalize-synced-archive-mjs.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-finalize-synced-archive-mjs
oat_issue_url: null
created: '2026-09-08T21:15:43Z'
---

# Read stdin with an fd-capable API in finalize-synced-archive.mjs

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks
> execution. Every ordering constraint is soft: this plan shares
> `.agents/skills/oat-project-complete/SKILL.md` with
> `2026-09-08-make-the-completion-seal-idempotent.md`, and shares the version
> pins in `packages/cli/src/validation/skills.test.ts` with six other wave-7
> plans, so it is never composed into one parallel group with any of them.

## Outcome

`finalize-synced-archive.mjs` reads its terminal report from stdin with an
fd-capable API, so the Step 12 pipe form in `oat-project-complete/SKILL.md`
succeeds and the synced deferred active-pointer clear shipped by PR #254
actually completes. The script's main-module guard canonicalizes both sides
before comparing, so reaching the script through a symlinked install root no
longer makes it a silent exit-0 no-op that a caller reads as "verified". A new
test drives the script's CLI entry point through a real pipe and through a
symlinked path, and a scratch-project control shows the `activeProject` pointer
actually cleared end to end.

## Source and live evidence

- Source backlog item:
  [BL-260907-finalize-synced-archive-mjs — finalize-synced-archive.mjs reads stdin with fs/promises readFile(0), so the synced deferred clear always fails](../../pjm/backlog/items/BL-260907-finalize-synced-archive-mjs.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan actually read (branch `wave-7-plans`; it is `origin/main`
  plus the wave-7 program-ledger and plan commits, none of which touch this
  plan's surfaces).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, which is the merge of PR #273 (remote project management,
  merged 2026-09-08T21:27:49Z).
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Verified evidence (every citation re-read at the inspected `HEAD`):
  - `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs:2`
    imports `readFile` from `node:fs/promises`; `:94` calls
    `JSON.parse(await readFile(0, 'utf8'))`. The promises API rejects a numeric
    fd.
  - Reproduced on Node `v22.17.0` in a `mktemp -d` copy of the script, piping a
    valid terminal report on stdin through the directory's realpath:
    `{"ok":false,"code":"E_SYNCED_ARCHIVE_FINALIZATION","message":"Unable to parse synced archive terminal report: The \"path\" argument must be of type string or an instance of Buffer or URL. Received type number (0)"}`
    on stderr, exit `1`. Every synced archive completion that reaches Step 12
    therefore exits 1 and leaves the pointer set.
  - Reproduced the whole Step 12 pipe form end to end in a scratch repository
    with the branch-built CLI (`0.2.66`) as `oat` on `PATH`: after
    `oat config set activeProject .oat/projects/synced/demo`, the exact
    `SKILL.md:1616-1621` invocation exited `1` with the error above and
    `oat config get activeProject` still returned the path. The pointer lives in
    the CLI's local config tier (`.oat/config.local.json`), not in
    `.oat/config.json`; only `oat config get` is a reliable probe of it.
  - `.agents/skills/oat-project-complete/SKILL.md:1616-1621` — Step 12 invokes
    the script exactly that way:
    `SYNCED_ARCHIVE_FINALIZATION=$(printf '%s\n' "$ARCHIVE_OUTPUT" | node "$SYNCED_ARCHIVE_FINALIZE_SCRIPT" --project-name "$PROJECT_NAME") || exit 1`,
    guarded by `[[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "true" ]]`.
    The `|| exit 1` makes the defect a hard completion failure, not a warning.
  - `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs:113-116`
    — the main-module guard is
    `process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href`,
    with realpath applied to neither side. Reproduced in the same scratch copy
    two ways: invoking the script through the `/var/folders/...` alias of its
    `/private/var/folders/...` realpath, and through an explicit `symlink` to
    its parent directory. Both exit `0` with no output at all — `main()` never
    runs. A caller that checks only the exit status reads that silence as
    success.
  - `.agents/skills/oat-project-implement/scripts/capture-dirty-tree.mjs:1046-1067`
    — the repository already owns the correct pattern and documents exactly this
    failure mode: `isDirectInvocation` compares
    `realpathSync(fileURLToPath(import.meta.url))` against
    `realpathSync(resolve(invokedPath))`, "canonicalizing only one side has the
    same effect under `--preserve-symlinks-main`".
  - Guard inventory across the thirty `.agents/skills/*/scripts/*.mjs` files:
    **eighteen** carry the raw one-sided comparison (this script plus
    seventeen others — six of its seven siblings under
    `oat-project-complete/scripts/`, five under `explainer-kit/scripts/`, two
    under `oat-explainer-kit/scripts/`, four under `recon/scripts/`); only
    `capture-dirty-tree.mjs` canonicalizes both sides; the seventh sibling,
    `validate-nonarchive-lifecycle-receipt.mjs`, has no main-module guard at
    all and runs at top level; the remaining eleven carry neither pattern. The
    seventeen raw siblings are a follow-up sweep, not this plan.
  - `finalize-synced-archive.mjs` is the only script under `.agents/skills`
    that reads a numeric fd at all: sweeping `.agents/skills/*/scripts/*.mjs`
    for `readFile(0`, `readFileSync(0`, and `process.stdin` returns exactly
    this file's `:94`. The stdin defect is isolated to one file.
  - Test coverage today: `.agents/skills/oat-project-complete/tests/` holds
    `resolve-synced-archive-entry.test.mjs` and `check-terminal-outcome.test.mjs`.
    The first imports `finalizeSyncedArchive` and
    `validateSyncedArchiveTerminalReport` from the module
    (`resolve-synced-archive-entry.test.mjs:20-23`) and calls
    `finalizeSyncedArchive({...})` with injected dependencies at `:335`, `:477`,
    `:558`, `:574`. Its only `execFile` use (`:42`) runs `git`; nothing runs
    the script itself as a subprocess, which is why a green suite coexists with
    a CLI entry point that cannot run.
  - `package.json:35` — `test:skills` is
    `node --test .agents/skills/*/tests/*.test.mjs`, so a new `.test.mjs` under
    that directory is picked up with no registration. `package.json:20` and
    `:26` show `format` and `lint` are the only coverage for
    `.agents/skills/**/*.{md,mjs}`.
  - `packages/cli/scripts/bundle-assets.sh:48-49` copies each skill into the
    staging tree with `cp -RL` and then
    `rm -rf "${STAGING}/skills/${skill}/tests"`. `.gitignore:25`
    (`packages/cli/assets/*`) ignores the whole bundled tree. The canonical
    `.agents/skills/...` file is the only write surface, and the new test does
    not ship.
  - `.agents/skills/oat-project-complete/SKILL.md:8` declares
    `metadata.version: 1.7.9`. Sweeping the literal `1.7.9` across
    `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests` returns
    exactly two pins:
    `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:1401`
    (`expect(readDeclaredVersion(content)).toBe('1.7.9')`) and
    `packages/cli/src/validation/skills.test.ts:4550`
    (`['oat-project-complete', '1.7.9']`).
  - `packages/cli/src/validation/skills.ts:943-960` — `listChangedSkillFiles`
    diffs only `.agents/skills/*/SKILL.md`, so `pnpm run check:skill-bumps`
    cannot see a scripts-only skill change. The bump in this plan is therefore
    carried by the repository's release convention (AGENTS.md: assets under
    `.agents/skills` count as shipped CLI functionality), and bumping
    `SKILL.md` also makes the gate fire and pass rather than stay silent.
  - Probe of the replacement API on Node `v22.17.0`: `readFileSync(0, 'utf8')`
    returned a 5 MiB payload intact (`len=5242880`) when it arrived as eighty
    64 KiB writes from a slow producer, and returned `''` (`len=0`) for
    `< /dev/null`. It neither truncates at the pipe buffer nor hangs. A copy
    of the script with only the two-line stdin substitution applied printed the
    documented success JSON and exit `0` with a stub `oat` on `PATH`, and
    exited `1` with `Unexpected end of JSON input` under
    `E_SYNCED_ARCHIVE_FINALIZATION` on empty stdin — the empty-input path
    stays fail-closed with no extra code.
  - `HOME=$(mktemp -d)` matters for the forced test gate: a maintainer with
    `~/.oat/templates/` from a user-scope install resolves bundle-tier
    templates against real files (AGENTS.md, Definition of Done).

## Dependencies

| Type          | Dependency                                                                                                     | Required state                                                                                                                                                                                                                                                                                                                | Current state                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Soft ordering | [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md)                     | Never in one parallel group: both write `.agents/skills/oat-project-complete/SKILL.md`, `review-skill-contracts.test.ts`, and `skills.test.ts`. One `metadata.version` bump for `oat-project-complete` per PR: whichever of the two merges second adopts the first's value and takes no second bump. Re-anchor pins on merge. | Pending; the wave composition serializes the two lanes. |
| Soft ordering | [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md)                           | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins on merge.                                                                                                                                                                                                                | Pending; the wave composition serializes them.          |
| Soft ordering | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)             | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins on merge.                                                                                                                                                                                                                | Pending; the wave composition serializes them.          |
| Soft ordering | [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md)                   | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins on merge.                                                                                                                                                                                                                | Pending; the wave composition serializes them.          |
| Soft ordering | [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins on merge.                                                                                                                                                                                                                | Pending; the wave composition serializes them.          |
| Soft ordering | [Calculate dispatch baselines after journaling](./2026-09-08-calculate-dispatch-baselines-after-journaling.md) | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins on merge.                                                                                                                                                                                                                | Pending; the wave composition serializes them.          |
| Soft ordering | [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md)                                 | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts` (that plan adds two cases). Re-anchor pins on merge.                                                                                                                                                                                     | Pending; the wave composition serializes them.          |
| Soft evidence | PR #254 (delivered the synced deferred-clear path)                                                             | Already merged; its script is the subject of this fix. No further state needed.                                                                                                                                                                                                                                               | Landed.                                                 |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                        | Affected | Files in common                                                                                                                                                                                                                            | Required update                                                                                                                                          |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewPlan Stage A` (draft PR #190) merges  | Minor    | `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` — both appear in PR #190's 217 changed files (paginated listing), as do the five lockstep `package.json` files. | Rebase, then re-locate the two `oat-project-complete` version pins by the OLD VERSION LITERAL rather than by the line numbers cited here before editing. |
| `remote project management` (PR #273) merges | None     | None: none of its 143 changed files touch `oat-project-complete`, `packages/cli/src/commands/project/log`, `capture-dirty-tree.*`, `bundle-assets.sh`, or either pin file.                                                                 | Merged 2026-09-08 and verified: this plan's inspected `HEAD` already contains it. No action.                                                             |
| `brainstorm companion` (PR #125) merges      | None     | None of its 26 changed files touch this plan's surfaces.                                                                                                                                                                                   | No action.                                                                                                                                               |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- .agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-complete/tests .agents/skills/oat-project-implement/scripts/capture-dirty-tree.mjs .agents/skills/oat-project-implement/tests/capture-dirty-tree.test.mjs packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts packages/cli/scripts/bundle-assets.sh package.json
```

If `finalize-synced-archive.mjs` changed shape, if Step 12's pipe form moved,
if `oat-project-complete`'s `metadata.version` is no longer `1.7.9`, or if
either pin moved, re-anchor before editing. A pin that no longer reads `1.7.9`
means another lane already bumped the skill in this PR: adopt that value, do not
add a second bump. A material mismatch that the plan does not explain is a STOP
condition.

## Repository conventions

- Focused test: `pnpm test:skills` →
  `node --test .agents/skills/*/tests/*.test.mjs` passes. A single file runs as
  `node --test .agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`.
- Focused pin tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`.
- Check: `pnpm check` (includes markdownlint over `apps/oat-docs/docs` and
  `oat:validate-skills`). Typecheck: `pnpm type-check`.
- Lint/format check (non-mutating): `pnpm lint` and `pnpm format`. Both are
  required here because this plan changes `.agents/skills`; `package.json:20,26`
  show they are the only coverage for `.agents/skills/**/*.{md,mjs}`, and CI
  runs neither.
- Skill version convention: one `metadata.version` bump per changed skill per
  PR — the top-level `version:` field is gone since CLI 0.2.65. Locate pins by
  the OLD VERSION LITERAL across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`, never by the line numbers quoted in this plan. The
  bump is PR-scoped, not edit-scoped, and is shared with any sibling lane in the
  same wave PR that edits the same skill.
- `DR-260906-standing-claims-in-skills-name`: a standing claim in a skill names
  the code that owns it and ships its executable backstop in the same change,
  never keyed to a physical line number. This plan adds no new standing claim to
  `SKILL.md`; if execution finds one is needed, it ships with its backstop.
- Implementation pattern:
  `.agents/skills/oat-project-implement/scripts/capture-dirty-tree.mjs:1046-1067`
  (`isDirectInvocation`) for the guard, and
  `.agents/skills/oat-project-implement/tests/capture-dirty-tree.test.mjs:136-149,1036-1080`
  (`runScript`, and the symlinked-install-root case that also covers
  `--preserve-symlinks-main` and `NODE_OPTIONS`) for the test.
- Git/PR convention: do not push or open a PR from this plan; the wave owns
  merge choreography.
- Shipped CLI and bundled-skill change: in lane mode the wave fan-in owns the
  lockstep bump; only a standalone execution bumps the five public packages
  itself.

## Scope

### In scope

- `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs` —
  the stdin read at `:2`/`:94` and the main-module guard at `:113-116`. No
  change to `validateSyncedArchiveTerminalReport`, `finalizeSyncedArchive`,
  `parseArguments`, the error code `E_SYNCED_ARCHIVE_FINALIZATION`, the success
  JSON shape, or the stderr failure JSON shape.
- `.agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
  — new: CLI entry-point coverage through a real pipe and through a symlinked
  install root.
- `.agents/skills/oat-project-complete/SKILL.md` — the `metadata.version` bump
  only. Step 12's pipe form is already correct and does not change.
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  — the `oat-project-complete` version pin (found by literal).
- `packages/cli/src/validation/skills.test.ts` — the `oat-project-complete`
  version pin (found by literal).
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan when it runs as a wave lane; the wave fan-in step makes
  exactly one lockstep bump for the integrated wave and regenerates the version
  asset through the build. Only a standalone execution bumps them itself, above
  freshly fetched `origin/main`.

### Out of scope

- `packages/cli/assets/skills/oat-project-complete/**` — a gitignored byte copy
  regenerated by `packages/cli/scripts/bundle-assets.sh`. Never edit it; never
  add it to a commit.
- The seventeen other `.mjs` scripts under `.agents/skills/*/scripts/` that
  carry the same raw main-module comparison (inventory above). Fixing them is a
  separate sweep with its own bumps across five skills, and folding it in here
  would collide with every other wave lane. Record it as a follow-up backlog
  item instead; note that the sibling seal plan re-applies a parked script
  (`validate-durable-archive-receipt.mjs`) whose parked copy carries the raw
  shape and is told to adopt the canonical guard from this plan.
- The completion seal's idempotency, `oat project log check`'s result shape,
  and the parked wave-5 p09 patch — all owned by
  `2026-09-08-make-the-completion-seal-idempotent.md`.
- Any change to Step 12's ordering, to `ARCHIVE_OUTPUT`, or to what counts as a
  valid terminal report.

## Current state

`finalize-synced-archive.mjs` exports two pure functions
(`validateSyncedArchiveTerminalReport`, `finalizeSyncedArchive`) and wraps them
in a `main(argv)` that supplies two side-effecting dependencies: reading the
terminal report from stdin, and clearing the pointer with
`execFile('oat', ['config', 'set', 'activeProject', ''])` (`:101-109`). Both
dependencies are injected as closures, which is why the existing test can
exercise `finalizeSyncedArchive` fully while the two lines that actually run in
production are untested.

Those two untested lines are both broken in the same direction — fail-silent or
fail-late:

- `:94` `await readFile(0, 'utf8')` — the `node:fs/promises` `readFile` accepts
  only a path, `Buffer`, `URL`, or `FileHandle`. A numeric fd is rejected with a
  `TypeError`, which the surrounding `catch` re-wraps as
  `E_SYNCED_ARCHIVE_FINALIZATION`. Step 12's `|| exit 1` turns that into a hard
  completion failure with the pointer retained, so the synced deferred-clear
  path from PR #254 has never once succeeded.
- `:113-116` — the guard compares `import.meta.url` (the real path, because
  Node canonicalizes the main module unless `--preserve-symlinks-main` is set)
  against `pathToFileURL(process.argv[1])` (whatever the caller typed). When a
  skill is installed or reached through a symlink — user-scope installs, and
  `/var` → `/private/var` on macOS — the two differ, `main()` is skipped, and
  the process exits 0 having done nothing. That is strictly worse than the
  stdin bug: the caller cannot tell it apart from success.

Fixing only the stdin read would leave a fail-open guard sitting directly behind
the fix, so this plan fixes both and proves each one red first.

## Implementation steps

### 1. Reproduce both defects and record the red state

In a `mktemp -d` scratch directory (never `rm -rf` a variable path; let the
temp directory be reclaimed), copy the current script, pipe a valid terminal
report into it through the directory's realpath (`cd "$DIR" && pwd -P`), and
record the stderr JSON and exit code. Then invoke the same copy through a
non-canonical path — on macOS the `/var/folders/...` form of a
`/private/var/folders/...` realpath is enough; elsewhere, `ln -s "$REAL"
"$REAL/link/root"` and invoke `"$REAL/link/root/<script>"` — and record exit 0
with empty stdout.

**Verify:** the realpath run prints
`"code":"E_SYNCED_ARCHIVE_FINALIZATION"` with
`Received type number (0)` in the message and exits `1`; the aliased run
prints nothing and exits `0`. Both observations are recorded in the execution
notes before any edit.

### 2. Read stdin with an fd-capable API

In `finalize-synced-archive.mjs`, replace the `node:fs/promises` `readFile`
import (`:2`) with `import { readFileSync } from 'node:fs';` and change the
`getArchiveReport` closure (`:94`) to `JSON.parse(readFileSync(0, 'utf8'))`.
Keep the surrounding `try`/`catch` and the
`Unable to parse synced archive terminal report: ${error.message}` wrapping
exactly as they are, so an empty or malformed report still fails closed with
`E_SYNCED_ARCHIVE_FINALIZATION` rather than being treated as valid. Do not
introduce a timeout, a default report, or a fallback that would let an empty
stdin succeed. `readFileSync(0, 'utf8')` was probed against a chunked 5 MiB
pipe and against `/dev/null` on Node `v22.17.0`; if execution prefers an async
stream drain (`for await (const chunk of process.stdin)`), that is acceptable
only if it keeps the same fail-closed behavior on empty input.

**Verify:** rerun step 1's realpath pipe against the edited file →
`{"status":"ok","pointerCleared":true,...}` on stdout with exit `0` when a stub
`oat` is first on `PATH`; and piping `''` still exits `1` with
`E_SYNCED_ARCHIVE_FINALIZATION` and `Unexpected end of JSON input`.

### 3. Canonicalize both sides of the main-module guard

Replace the guard at `:113-116` with an `isDirectInvocation(invokedPath)`
helper modeled on
`.agents/skills/oat-project-implement/scripts/capture-dirty-tree.mjs:1046-1067`:
import `realpathSync` from `node:fs`, `resolve` from `node:path`, and
`fileURLToPath` from `node:url` (drop the now-unused `pathToFileURL`), compare
`realpathSync(fileURLToPath(import.meta.url))` with
`realpathSync(resolve(invokedPath))`, return `false` on a falsy path or a
thrown `realpathSync`, and keep the existing `main(...).then(...).catch(...)`
body unchanged. Carry the same explanatory comment the exemplar carries: a
one-sided comparison is a no-op under `--preserve-symlinks-main`, and the
caller reads "exited 0" as "verified".

**Verify:** rerun step 1's aliased invocation → the script now runs and
produces the same stdout JSON as the realpath invocation; adding
`--preserve-symlinks-main` as a node argument and
`NODE_OPTIONS=--preserve-symlinks-main` in the environment produces the same
result.

### 4. Add the CLI entry-point test

Create `.agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
using `node:test` and `node:assert/strict`, following the structure of
`capture-dirty-tree.test.mjs` (a promisified `execFile` helper that returns
`{ code, stdout, stderr }` for both success and failure; pass the report on
stdin through the child's `stdin` stream, or spawn `node` with `input` via
`execFile`'s `stdio` piping). Because `main`'s `clearActiveProject` shells out
to `oat` (`:101-109`), every case writes a stub `oat` executable into a
`mkdtemp` bin directory, `chmod 0o755`, and runs the script with
`env: { ...process.env, PATH: \`${bin}:${process.env.PATH}\` }`— the
precedent is`tools/smoke/runner/preflight.test.mjs:553`and`tools/smoke/runner/cursor-broker.test.mjs:50`. The stub appends its argv to a
file so the test can assert the exact `config set activeProject ''`invocation. Never let a case reach a real`oat`or touch a real`.oat/config.local.json`.

Cases:

1. a valid report piped on stdin exits 0, prints the documented success JSON
   (`status: 'ok'`, `pointerCleared: true`, and the five echoed report fields),
   and the stub records exactly one `config set activeProject` call with an
   empty value;
2. a report that fails `validateSyncedArchiveTerminalReport` (wrong
   `completedRef`) exits 1, prints the `E_SYNCED_ARCHIVE_FINALIZATION` JSON on
   stderr, and the stub records **zero** calls;
3. empty stdin exits 1 with `E_SYNCED_ARCHIVE_FINALIZATION` and zero stub
   calls;
4. bad usage (`--project-name` missing) exits 1 with the usage message and zero
   stub calls;
5. the same valid report through a symlinked install root exits 0 and clears,
   run three ways — plain, with `--preserve-symlinks-main` as a node arg, and
   with `NODE_OPTIONS=--preserve-symlinks-main` — mirroring
   `capture-dirty-tree.test.mjs:1036-1080`.

**Verify:**
`node --test .agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
→ all cases pass; `pnpm test:skills` → the whole skill suite passes.

### 5. Prove the tests can fail

Restore the pre-fix state one defect at a time and confirm the matching cases
go red, then restore the fix:

- put back `import { readFile } from 'node:fs/promises'` and
  `await readFile(0, 'utf8')` → cases 1 and 5 fail with
  `Received type number (0)`; case 3 still passes (it asserts a failure, so it
  is not the control);
- put back the raw
  `import.meta.url === pathToFileURL(process.argv[1]).href` guard → case 5
  fails on all three invocation forms (exit 0 with empty stdout), while case 1
  still passes, which is exactly the fail-open shape the guard change removes.

**Verify:** each neutralization is run, its failure output recorded, and the fix
restored; a final
`node --test .agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
is green. If either neutralization leaves the suite green, the test is vacuous
and must be rewritten before continuing.

### 6. End-to-end synced deferred-clear control in a scratch project

After `pnpm build`, in a fresh `mktemp -d`: `git init` a scratch repository
with `.oat/config.json` (`{}` is enough) and
`.oat/projects/synced/<name>/state.md`; put a wrapper script named `oat` that
runs `exec node <repo>/packages/cli/dist/index.js "$@"` first on `PATH`; run
`oat config set activeProject .oat/projects/synced/<name>` and confirm
`oat config get activeProject` echoes the path (the pointer is stored in the
local config tier, so do not expect it in `.oat/config.json`). Then run Step
12's exact pipe form from `SKILL.md:1616-1621` — `SYNCED_ARCHIVE_FINALIZE_SCRIPT`
pointing at the edited canonical script, `PROJECT_NAME=<name>`, and a valid
`ARCHIVE_OUTPUT` whose `completedRef` is `refs/oat/completed/<name>`. This is
the plan's answer to the item's third acceptance criterion and is a manual
control, not an automated test — it is the only step that exercises the real
`oat config set` write.

**Verify:** the finalizer prints its success JSON and exits 0, and
`oat config get activeProject` afterwards prints an empty value. Re-running the
same pipe form against the now-cleared pointer must still exit 0 (the finalizer
only validates the report and clears; it must not become order-dependent).
Before the edit, the same sequence exits 1 and the pointer survives — record
that as the pre-fix control.

### 7. Bump the skill and its pins

Bump `metadata.version` in
`.agents/skills/oat-project-complete/SKILL.md:8` by one patch level
(`1.7.9` → `1.7.10` unless the drift check found a higher value already in the
PR), then sweep the OLD literal across `packages/cli/src`, `tools/smoke`, and
`.agents/skills/*/tests` and update every pin it finds — at the inspected
`HEAD` that is
`packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:1401`
and `packages/cli/src/validation/skills.test.ts:4550`. Exactly one bump for this
skill exists in the final PR diff: if a sibling lane in the same wave PR already
bumped `oat-project-complete`, adopt that value and add no second bump.

**Verify:**
`rg -n '1\.7\.9' packages/cli/src tools/smoke .agents/skills` returns nothing;
`pnpm run check:skill-bumps` exits 0; from `packages/cli`,
`pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
→ green.

### 8. Gate

**Verify (lane mode, the default under the execution program):** run, capturing
each exit code explicitly (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`, never
`… | tail && echo OK`):
`node --test .agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`,
`pnpm test:skills`, the two focused vitest files above, then `pnpm check`,
`pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force` (a plain `pnpm test` can
replay a cache hit; look for `cache hit, replaying logs` or `>>> FULL TURBO`),
`pnpm run check:skill-bumps`, and — because this plan changes
`.agents/skills` — `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`.
Do not edit lockstep release files and do not run
`pnpm release:check-versions` or `pnpm release:validate`; the wave fan-in owns
the lockstep bump and the full definition-of-done sequence. This plan runs as a
lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root review
after. **Standalone mode only:** bump the five public packages above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- New:
  `.agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
  with the five cases in step 4. Structural pattern:
  `.agents/skills/oat-project-implement/tests/capture-dirty-tree.test.mjs`
  (`runScript` at `:136-149`; the symlinked-install-root case at `:1036-1080`).
  `PATH`-stub precedent: `tools/smoke/runner/preflight.test.mjs:553`,
  `tools/smoke/runner/cursor-broker.test.mjs:50`.
- Red-then-green negative controls (step 5, both mandatory and both recorded):
  - restore `readFile` from `node:fs/promises` → cases 1 and 5 fail with
    `Received type number (0)`; this is the pre-fix state the backlog item
    describes, reproduced at the inspected `HEAD`, and it must be shown red
    before the fix is accepted;
  - restore the raw one-sided main-module guard → case 5 fails on all three
    invocation forms with exit 0 and empty stdout.
- Unchanged and expected green:
  `.agents/skills/oat-project-complete/tests/resolve-synced-archive-entry.test.mjs`
  (it imports `finalizeSyncedArchive` and
  `validateSyncedArchiveTerminalReport` directly and must keep passing
  untouched — that is the proof the exported contract did not move) and
  `check-terminal-outcome.test.mjs`.
- Pin tests:
  `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  and `packages/cli/src/validation/skills.test.ts` fail on the old literal after
  the bump and pass once both pins are updated — that failure is itself the
  control proving the pins are live.
- Manual control (step 6): the scratch-project end-to-end synced deferred
  clear, with `oat config get activeProject` empty afterwards, and the pre-fix
  run of the same sequence exiting 1 with the pointer retained.
- Regression proved: a piped terminal report reaches the validator instead of
  dying in the reader; a symlink-reached invocation cannot report success by
  doing nothing.

## Done criteria

- [ ] `finalize-synced-archive.mjs` reads stdin with an fd-capable API and the
      exact Step 12 pipe form from `SKILL.md:1616-1621` exits 0 and prints the
      success JSON.
- [ ] The main-module guard canonicalizes both sides; the script runs through a
      symlinked install root under plain invocation,
      `--preserve-symlinks-main`, and `NODE_OPTIONS=--preserve-symlinks-main`.
- [ ] `.agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`
      exists, drives the script as a subprocess through a pipe, and its two
      neutralization controls were each observed red and are recorded.
- [ ] A synced deferred clear completes end to end in a scratch project and
      `oat config get activeProject` prints an empty value afterwards.
- [ ] `resolve-synced-archive-entry.test.mjs` passes unmodified.
- [ ] Exactly one `oat-project-complete` `metadata.version` bump exists in the
      PR diff and `rg -n '<old literal>' packages/cli/src tools/smoke .agents/skills`
      returns nothing.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`,
      `pnpm format`, and `pnpm oat:validate-skills` pass with captured exit
      codes, and no lockstep release file is edited. Standalone mode: one
      lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained or out-of-scope files, and in
      particular nothing under `packages/cli/assets/`.

## STOP conditions

Stop and report instead of improvising when:

- the drift check shows `finalize-synced-archive.mjs` already reads stdin with
  an fd-capable API, or the guard is already canonicalized — the defect was
  fixed elsewhere and this plan needs re-scoping, not re-application;
- either neutralization in step 5 leaves the suite green (the test is vacuous
  and proves nothing);
- making the CLI test pass would require changing
  `validateSyncedArchiveTerminalReport`, `finalizeSyncedArchive`, the
  `E_SYNCED_ARCHIVE_FINALIZATION` code, or the success/failure JSON shapes —
  those are consumed by `resolve-synced-archive-entry.test.mjs` and by Step 12,
  and a change there is a different plan;
- the scratch control in step 6 needs a real repository, a real project, or a
  network call to pass;
- any fix would make the finalizer accept input it previously rejected — an
  empty report, a report missing `lifecycleCommit`/`verifiedSourceSha`, a wrong
  `completedRef`, or `recordRetired !== true`. The **weaker-anywhere rule**
  applies to this script as a validator: any input previously rejected that
  becomes accepted is a Critical finding, whatever the test suite says. The
  guard change deliberately makes the script do _more_ work, never less
  validation;
- a required change crosses into `packages/cli/src/commands/project/log/**`,
  the seal, or the parked wave-5 p09 patch (owned by the sibling plan), or
  into any of the seventeen sibling scripts with the raw guard (the follow-up
  sweep);
- a named verification gate fails twice after one bounded correction;
- an unsatisfied hard dependency in `## Dependencies` still blocks execution,
  whatever `oat_execution_status` claims.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 or #125 lands (apply the `## Landing-event impact` table);
- a dependency named in `## Dependencies` changes state — in particular if
  `2026-09-08-make-the-completion-seal-idempotent.md` merges first, in which
  case `oat-project-complete` is already bumped in this PR and step 7 adopts
  that value instead of adding a bump;
- `oat-project-complete`'s `metadata.version`, Step 12's pipe form, or either
  version pin's line anchors change;
- a load-bearing evidence claim cannot be reproduced — re-run the two
  reproductions in step 1 before trusting this plan.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`.

## Review focus

- The stdin read is fd-capable and the empty-input path still fails closed. A
  reader that silently accepts `''` would be a weaker-anywhere regression.
- Both neutralization controls were actually observed red, with output recorded
  — not asserted. A test that mocks the reader it is meant to exercise proves
  nothing here.
- The exported contract (`validateSyncedArchiveTerminalReport`,
  `finalizeSyncedArchive`, the JSON shapes, the error code) is byte-stable, and
  `resolve-synced-archive-entry.test.mjs` was not edited.
- The new test never reaches a real `oat` binary or a real
  `.oat/config.local.json`; the `PATH` stub is in place for every case,
  including the failure cases where the assertion is that the stub was **not**
  called.
- Nothing under `packages/cli/assets/` is staged.
- Exactly one `oat-project-complete` bump in the PR diff, with both pins moved
  by literal sweep rather than by the line numbers this plan quotes.
- Deferred on purpose: the seventeen sibling scripts carrying the same
  one-sided main-module guard (six under `oat-project-complete/scripts/`, five
  under `explainer-kit/scripts/`, two under `oat-explainer-kit/scripts/`, four
  under `recon/scripts/`). They are a separate sweep with bumps across five
  skills; file it as a follow-up backlog item rather than widening this lane.
