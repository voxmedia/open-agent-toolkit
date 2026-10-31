---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-31
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [['p01', 'p02', 'p03', 'p04']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: wave-1-correctness

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship Wave 1 of the backlog-and-roadmap review: seven confirmed
correctness defects in provider sync, tool-pack install scope, CLI messages,
lifecycle skill contracts, exact-path commits, and the evidence-grade test
recipe, each closed against its backlog item's acceptance criteria.

**Architecture:** Each fix lands in the component that owns the defect
(Cursor/Codex sync extensions, the tools-install scope resolver, init/status/
doctor command handlers, the CLI entry point, three lifecycle skills, the
exact-path commit helper, and a repository script). Shared documentation,
generated provider views, the lockstep version bump, and backlog close-out
land in one integration phase after the parallel group merges.

**Tech Stack:** TypeScript ESM CLI (`packages/cli`, vitest), Bash scripts with
`node --test`, Markdown skills and Fumadocs docs, oxfmt/oxlint.

**Commit Convention:** `{type}({task-id}): {description}` — e.g.
`fix(p01-t01): skip dangling agent links in the Cursor collision scan`.

**Inputs:** `discovery.md` (evidence, Options Considered, Key Decisions) and
the seven item files under `.oat/repo/pjm/backlog/items/` named in each phase.
Each item's acceptance criteria are the requirement; do not expand scope.

## Conventions for every task

- **Format** every created or edited file with the repository write command,
  file-scoped: `pnpm exec oxfmt --write <files>`.
- **Lint/type-check** after code tasks:
  `pnpm --filter @open-agent-toolkit/cli lint` and
  `pnpm --filter @open-agent-toolkit/cli type-check`.
- **Focused tests** run with an isolated HOME that is removed afterwards
  (AGENTS.md: tests can resolve the maintainer's `~/.oat/templates`):
  `H=$(mktemp -d); HOME="$H" pnpm --filter @open-agent-toolkit/cli exec vitest run <test files>; S=$?; rm -rf "$H"; echo "exit=$S"`.
- **Prove the guard can fail** where a task says so: neutralize the fix,
  confirm the new test fails, restore it, confirm it passes, and report the
  probe, the failing assertion, and the restored pass in the task report. The
  root records it in `implementation.md` (AGENTS.md negative-control rule).
- **Commit** each task once, with only that task's files, through
  `oat internal commit-paths --identity "<run identity>:<task-id>" --message "<message>" -- <exact files>`
  (hooks enabled; restage nothing by hand).
- Do not commit `.oat/sync/manifest.json` changes produced by worktree init.
- **Phase-end check** (every phase, before its report): run the whole CLI
  suite forced, with a self-removing isolated HOME:
  `H=$(mktemp -d); HOME="$H" pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli; S=$?; rm -rf "$H"; echo "exit=$S"`.
  Fix failures inside the phase boundary; report any failure in a file
  another phase owns instead of editing it (p05's cross-phase reconciliation
  owns those fixes). Phase 5 replaces this check with the Definition of Done
  gates.
- Stay inside the phase's **File boundary**. If a needed change falls outside
  it, stop and report instead of editing (another parallel phase owns it).

---

## Parallelism

`p01`–`p04` run as one parallel group in isolated worktrees; `p05` runs after
the group merges.

- **Write sets are disjoint by assignment.** Each phase lists a file
  boundary. Documentation pages that more than one item touches
  (`reference/what-oat-writes.md`, `provider-sync/*.md`,
  `getting-started/tool-packs.md`, `reference/troubleshooting.md` and other
  reference pages) are all assigned to `p05`, so `p01` and `p02` change code
  and tests only. `commands/status/index.test.ts` belongs to `p02`; `p01`
  adds new test files instead of editing it. The skill-sentence contract test
  `validation/named-skill-load-contract.test.ts` belongs to `p03`. Root
  `README.md` and `packages/cli/README.md` belong to `p05`.
- **Cross-phase test expectations** (for example a `p02`-owned test fixture
  that pins the old Codex base-role header) surface only after the merge;
  p05's cross-phase reconciliation owns them.
- **Verification is independent.** Each phase's tests run against its own
  code; none depends on another phase's behavior.
- **`p05` depends on all four:** its docs describe the shipped behavior, its
  provider-view refresh needs `p01`'s Codex owner change, and its version
  bump and backlog close-out cover the whole delivery.
- Not further split: `p01` keeps items 1 and 2 together (both edit the Codex
  sync extension and config merge), and `p02` keeps items 3 and 4 together
  (both edit `init` and `tools install`).

---

## Phase 1: Provider sync cleanup and Codex config values

Items: BL-261002-clean-up-stale-provider-views — Clean up stale provider
views and Codex entries when a canonical agent is deleted or renamed; and
BL-261002-stop-oat-sync-from-changing — Stop oat sync from changing user
values in .codex/config.toml.

**File boundary:** `packages/cli/src/providers/**` (source and tests),
`packages/cli/src/fs/**` only if a helper change is unavoidable,
`packages/cli/src/commands/sync/**` (existing and new tests; source only if
needed for output), `packages/cli/src/commands/providers/codex/**`,
`packages/cli/src/commands/tools/remove/**` and
`packages/cli/src/commands/tools/shared/auto-sync*` (tests only),
`packages/cli/src/commands/shared/codex-strays.test.ts` (fixture updates for
the base-role owner header), and **new** test files under
`packages/cli/src/commands/status/` (do not edit `commands/status/index.ts`
or `index.test.ts`). Fixture breakage in files p02 owns (status, init, doctor
tests) is reported for p05's cross-phase reconciliation, not edited here. No docs edits (p05 owns
them).

### Task p01-t01: Skip dangling agent links in the Cursor collision scan

**Files:**

- Modify: `packages/cli/src/providers/cursor/codec/materialize.ts`
- Modify: `packages/cli/src/providers/cursor/codec/materialize.test.ts`
- Create: a sync/status integration test for agent delete and rename (for
  example `packages/cli/src/commands/sync/stale-agent-views.test.ts` and a new
  file under `packages/cli/src/commands/status/`)

**Step 1: Write tests (RED)**

- Unit: in a scratch scope with `.cursor/agents/gone.md` and
  `.claude/agents/gone.md` as relative links to a missing
  `.agents/agents/gone.md`, `assertNoUnmanagedCursorAgentCollisions` resolves
  without throwing; a link whose existing target is outside the scope still
  throws the "escapes the sync scope" error.
- Integration: scratch repository with claude, cursor, codex and copilot
  enabled and a canonical agent synced once. Then
  (a) delete the canonical agent, (b) rename it. For each: `oat sync --scope
project --dry-run` exits 0, lists the removals of `.cursor/agents/<name>.md`,
  `.claude/agents/<name>.md` and the `.github/agents/` view, and writes
  nothing (snapshot the tree); `oat sync --scope project`
  exits 0 and removes those views (rename: creates the new name's views);
  `oat status --scope project` exits without the escapes error and reports
  the pending change before sync.

**Step 2: Implement (GREEN)**

In the collision scan, when an entry is a symbolic link whose target does not
exist (dangling), skip it: a dangling link cannot define a role, and the main
sync plan removes manifest-tracked views. Keep the refusal for a link whose
existing target escapes the scope, and keep the colliding-link refusal.

**Step 3: Verify**

Run the focused tests (isolated HOME), then lint and type-check. Prove the
guard can fail: revert the skip, confirm the unit and integration tests fail
with the escapes error, restore.

**Step 4: Commit** — `fix(p01-t01): skip dangling agent links in the Cursor collision scan`

---

### Task p01-t02: Remove stale canonical-derived Codex roles, including on pack removal

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
  (stamp the owner in `desiredRolesFromCanonical` by wrapping
  `exported.content` with `withOatManagedCodexRoleOwner(…, scopeOwner)`;
  leave `export-to-codex.ts` unchanged because materialized variants build on
  it and are stamped separately)
- Modify: related tests (`sync-extension.test.ts`, `export-to-codex` and
  `shared` tests, `commands/sync/index.test.ts` expectations that pin base
  role content)
- Extend: the integration test from p01-t01 with Codex assertions

**Step 1: Write tests (RED)**

- Full project sync: after a canonical agent is deleted (and renamed),
  `.codex/agents/<name>.toml` is removed and its `[agents.<name>]` table is
  removed from `.codex/config.toml`; a user-authored `[agents.custom]` table
  and a null-owner managed role (left by an older CLI) are untouched;
  `--dry-run` lists the role and table removals and writes nothing.
- Partial sync for pack removal (`runSyncInProcess` with
  `removedCanonicalPaths`, as `oat tools remove` calls it, or an
  `oat tools remove` scenario): the removed agents' Codex roles and tables are
  removed, including when every removed agent was the last one (the current
  early return for an empty partial set must not skip cleanup).
- Base canonical exports now carry `# oat-owner: project-config` at project
  scope and `# oat-owner: user-config` at user scope, and the header still
  parses as managed.
- Supported base role removed (`oat-reviewer`), both by deleting it before a
  full project sync and through `removedCanonicalPaths`: every
  `oat-reviewer-<model>-<effort>.toml` variant (owner `supported-catalogue`
  or `project-config`) and its `[agents.*]` table are removed; a variant owned
  by another scope (`user-config`) and a user-authored table stay.

**Step 2: Implement (GREEN)**

Decision (discovery Options Considered, item 1): stamp each canonical agent's
base Codex export with the sync scope's existing owner value. Do not add a new
owner value (older CLIs reject unknown owners). At project scope, stale
cleanup covers the owners `supported-catalogue` and `project-config` (the
Cursor extension's precedent, `cursor/codec/sync-extension.ts` cleanup
owners); at user scope it stays `user-config`. Apply the same owner set to
full-sync cleanup and to the new partial-sync removal. In partial sync, derive
the removed agents' role names (and their materialized variants for supported
base roles) from `allowedCanonicalPaths` entries under `.agents/agents/` that
no longer exist, mirroring the Claude extension's `removedSupportedBaseRoles`,
and remove only roles that are OAT-managed with one of those owners (or match
the existing legacy rule).

**Step 3: Verify**

Focused Codex and sync tests (isolated HOME), lint, type-check. Prove the
guard can fail: separately drop the owner stamp, the `supported-catalogue`
cleanup owner, and the partial-sync removal; confirm the new tests fail each
time; restore.

**Step 4: Commit** — `fix(p01-t02): remove stale canonical-derived Codex roles on agent delete, rename, and pack removal`

---

### Task p01-t03: Keep user values for Codex multi_agent and max_depth

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts` and
  `config-merge.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts` (config
  operation reason) and its tests
- Modify: `packages/cli/src/commands/providers/codex/materialize.ts` /
  `materialize.test.ts` and `packages/cli/src/commands/sync/index.test.ts`
  where they pin the old override

**Step 1: Write tests (RED)**

- Seed an existing `.codex/config.toml` with `[features] multi_agent = false`
  and `[agents] max_depth = 1` (both table and dotted-key forms): after merge
  both values are unchanged; the sync output (human and `--json`) names the
  conflict for `multi_agent` (kept `false`; OAT-managed Codex roles need
  `true`) and notes that `max_depth = 1` disables only optional nested work.
- Absent keys: merge adds `multi_agent = true` and `max_depth` (2, or a higher
  inherited value) and the output names each key added.
- Explicit `max_depth = 0` is kept and reported as a conflict (default
  dispatch needs depth 1). A conflict is still reported when nothing else in
  the file changes (the config operation is `skip`).

**Step 2: Implement (GREEN)**

Decision (discovery item 2, option A): never override an explicit user value;
add absent keys; return the added keys and conflicts from the merge and carry
them in the config operation's reason so `oat sync`, `--dry-run`, and
`oat providers codex materialize` print them. Keep writing role files and
tables when `multi_agent` is `false` (no refusal). `oat doctor` checks are
unchanged.

**Step 3: Verify**

Focused tests (isolated HOME), lint, type-check. Prove the guard can fail:
restore the old unconditional upsert, confirm the seeded regression test fails,
restore.

**Step 4: Commit** — `fix(p01-t03): keep user multi_agent and max_depth values in Codex config`

---

## Phase 2: Install scope and CLI messages

Items: BL-261002-honor-the-requested-scope — Honor the requested scope for
every pack in tools install and init --setup; and
BL-261002-correct-misleading-init-status — Correct misleading init, status,
and doctor messages and stop scripts from defaulting to user-scope sync.

**File boundary:** `packages/cli/src/commands/init/**` except the
skill-sentence contract tests `packages/cli/src/commands/init/tools/shared/*.test.ts`
(p03 owns those), `packages/cli/src/commands/tools/install/**`,
`packages/cli/src/commands/tools/shared/**` (except `auto-sync*`, which p01
may test), `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`,
`packages/cli/src/commands/shared/scope-option.ts` (only if the help change
needs it), `packages/cli/src/commands/status/index.ts` and `index.test.ts`,
`packages/cli/src/commands/doctor/**`, `packages/cli/src/commands/project/new/**`,
`packages/cli/src/config/oat-config.ts` (default-branch detection only) and its
tests, `packages/cli/src/index.ts`, `packages/cli/src/ui/**`,
`packages/cli/src/commands/help-snapshots.test.ts`, new CLI test files for the
broken-pipe check, `scripts/worktree/init.sh`, and
`scripts/worktree/init.test.mjs`. No docs edits (p05 owns them).

### Task p02-t01: Refuse a pack install that resolves to no allowed scope

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (reconciled pack
  command selection and success reporting; aggregate core handling)
- Test: `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts`
  or a new real-filesystem test file under `packages/cli/src/commands/tools/`

**Step 1: Write tests (RED)** — real filesystem, isolated HOME and scratch
repository, snapshot both trees before and after:

- `oat tools install core --scope project` exits 1 with a message that core is
  user-scope only, prints no "Installed" line, and writes nothing in either
  tree.
- Any single-pack install whose requested scopes all fall outside the pack's
  allowed scopes exits 1 the same way (no success after writing nothing).
- `oat tools install --scope project` (no pack name) writes nothing under
  HOME, installs the other packs at project scope, and reports that core was
  skipped because it is user-scope only.

**Step 2: Implement (GREEN)** — decision: core stays user-only (discovery
item 3, option A). No-flag installs keep today's behavior.

**Step 3: Verify** — focused tests, lint, type-check. Prove the guard can
fail: remove the empty-scope refusal and the aggregate core skip, confirm the
HOME/repository snapshot assertions fail, restore. Report the pre-fix bad
state (writes nothing but exits 0; core written under HOME), the post-fix
rejection, and the accepted control (`oat tools install core` with no flag
installs at user scope).

**Step 4: Commit** — `fix(p02-t01): refuse pack installs that resolve to no allowed scope`

---

### Task p02-t02: Write only the requested scope when --scope is explicit

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (additive scope
  union, the single-pack `resolvePackCommandSelection`, and the workflows
  `localPaths` / `.gitignore` step)
- Modify if needed: `packages/cli/src/commands/tools/shared/pack-lifecycle-outcome.ts`
  (`resolveAdditivePackScopeSelection`) and its test
- Test: same real-filesystem test file as p02-t01

**Step 1: Write tests (RED)** — with workflows already installed at project
scope in the scratch repository, both `oat tools install --scope user` and
`oat tools install workflows --scope user` write nothing into the repository
(no `localPaths` added to `.oat/config.json`, no `# OAT local paths` block in
`.gitignore`, no project skill writes) and install at user scope. With a pack
installed at user scope, `oat tools install --scope project` and
`oat tools install <pack> --scope project` write nothing under HOME.

**Step 2: Implement (GREEN)** — decision (discovery item 3): an explicit
`--scope project|user` limits writes to that scope's targets for both the
single-pack and aggregate commands; existing placements in the other scope
stay as they are (neither reconciled nor removed). Keep the no-flag and
`--scope all` behavior unchanged.

**Step 3: Verify** — focused tests, lint, type-check. Prove the guard can
fail: restore the union-driven project request, confirm the repository
snapshot assertion fails, restore. Report pre-fix bad state, post-fix result,
and accepted control as in p02-t01.

**Step 4: Commit** — `fix(p02-t02): limit explicit-scope tool installs to the requested scope`

---

### Task p02-t03: State the real --scope default in tools install help

**Files:**

- Modify: `packages/cli/src/commands/tools/install/index.ts` (and
  `packages/cli/src/commands/shared/scope-option.ts` only if the help string
  must be passed through it)
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1–2:** `oat tools install --help` states that the default `all` keeps
each installed pack's existing placement, that a pack not yet installed lands
at user scope, and that core is user-scope only. Update the snapshot.

**Step 3: Verify** — `help-snapshots.test.ts` (isolated HOME), lint.

**Step 4: Commit** — `fix(p02-t03): state the real tools install scope default in help`

---

### Task p02-t04: Honor --scope in init --setup and stop calling gh

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts` (guided setup scope
  selection)
- Modify: `packages/cli/src/config/oat-config.ts` (`detectDefaultBranch`)
  and its tests
- Modify: `packages/cli/src/commands/init/index.test.ts`,
  `packages/cli/src/commands/init/guided-setup.test.ts` as needed

**Step 1: Write tests (RED)**

- `oat init --scope project --setup` (non-interactive) installs the selected
  packs at project scope, skips core with the user-scope-only message, and
  writes nothing under HOME (real-filesystem test with HOME and repository
  snapshots; mock only prompts and the provider-sync step if needed).
- `detectDefaultBranch` never runs `gh` (inject or spy on the command runner):
  it uses `origin/HEAD`, then `main`.
- `oat init --setup` without an explicit scope keeps today's pack defaults.

**Step 2: Implement (GREEN)** — guided setup passes an explicit `--scope
project|user` through to the tools flow as an explicit selection; default-
branch detection drops the `gh repo view` probe (discovery item 3, option A).

**Step 3: Verify** — focused tests, lint, type-check. Prove the guard can
fail: restore `scopeSelection: defaults` for explicit scope, confirm the HOME
snapshot assertion fails, restore.

**Step 4: Commit** — `fix(p02-t04): honor --scope in init --setup and stop calling gh`

---

### Task p02-t05: Correct the --no-hook, packs:inventory, and local-scope scaffold messages

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts` (`--no-hook` help),
  `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`,
  `packages/cli/src/commands/status/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`,
  `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`,
  `packages/cli/src/commands/project/new/index.ts` and their tests

**Steps:**

- `--no-hook` help says it removes an installed optional OAT pre-commit hook
  (and skips installing one).
- `packs:inventory` recovery in `oat status` and `oat doctor` (and the doctor
  skill-version comparison fix that also says `pnpm build`) gives a remedy an
  adopter can run: reinstall the CLI so its bundled assets match
  (`npm install --global @open-agent-toolkit/cli`) or fix `OAT_ASSETS_DIR`,
  with `pnpm build` named only for an OAT source checkout. Update the JSON
  `recovery` assertion and add a doctor `fix` assertion.
- A local-scope `oat project new` reports a status that names the real
  reason (local-scope projects are not committed), not `--no-commit`; JSON
  `commitStatus` carries a distinct value. Test both local without the flag
  and shared with `--no-commit`.

**Verify:** focused tests (isolated HOME), lint, type-check.

**Commit** — `fix(p02-t05): correct no-hook, packs:inventory, and local scaffold messages`

---

### Task p02-t06: Exit quietly when stdout is closed (EPIPE)

**Files:**

- Modify: `packages/cli/src/index.ts` (and/or `packages/cli/src/ui/logger.ts`)
- Create: a test that spawns the built CLI (`packages/cli/dist/index.js`,
  following the existing `builtCliEntry` pattern) with output piped into a
  reader that closes after the first line

**Step 1: Write test (RED)** — reproduced in discovery: `oat tools list |
head -1` prints an `Error: write EPIPE` stack trace. The test asserts no
`EPIPE` text on stderr and a zero exit status.

**Step 2: Implement (GREEN)** — handle `EPIPE` on stdout (and stderr) by
exiting quietly; other stream errors keep their current behavior.

**Step 3: Verify** — `pnpm --filter @open-agent-toolkit/cli build`, then the
test (isolated HOME), lint, type-check. Prove the guard can fail: remove the
handler, rebuild, confirm the test fails, restore and rebuild.

**Step 4: Commit** — `fix(p02-t06): exit quietly when stdout is closed`

---

### Task p02-t07: Use project-scope sync in the worktree script and AGENTS.md guidance

**Files:**

- Modify: `scripts/worktree/init.sh` (sync call and header comment)
- Modify: `scripts/worktree/init.test.mjs` (pin the call)
- Modify: `packages/cli/src/commands/init/tools/project-guidance.ts` and its
  test (pin the line)

**Steps:** `init.sh` runs `pnpm run --silent cli -- sync --scope project`;
`init.test.mjs` asserts the script contains that call and no bare `cli --
sync`. The guidance block line reads `oat sync --scope project`, pinned by a
test. Verify with `pnpm test:scripts` and the project-guidance tests.

**Commit** — `fix(p02-t07): use project-scope sync in worktree init and AGENTS.md guidance`

---

## Phase 3: Lifecycle skill contracts

Item: BL-261002-align-implement-complete — Align implement, complete, and
pr-final skill contracts with their actual behavior.

**File boundary:** `.agents/skills/oat-project-implement/SKILL.md`,
`.agents/skills/oat-project-complete/SKILL.md`,
`.agents/skills/oat-project-pr-final/SKILL.md`,
`packages/cli/src/validation/named-skill-load-contract.test.ts` (and any other
skill-sentence contract test under `packages/cli/src/validation` or
`packages/cli/src/commands/init/tools/shared` that pins changed text), and
`apps/oat-docs/docs/workflows/projects/execution/execution-skills.md` plus
any other docs page that restates these three behaviors (search
`apps/oat-docs/docs` for `--retry-limit`, `--base main`, and the pr-final
"will ask for" text before editing; stop and report if a match is in a page
p05 owns).

### Task p03-t01: Remove the unread --retry-limit hint from oat-project-implement

**Files:** `.agents/skills/oat-project-implement/SKILL.md` (argument hint;
`metadata.version` 2.3.23 → 2.3.24),
`apps/oat-docs/docs/workflows/projects/execution/execution-skills.md` (remove
the `--retry-limit` note at line 79, keep the retry-limit source sentence).

**Verify:** `pnpm oat:validate-skills`; skill contract tests
`H=$(mktemp -d); HOME="$H" pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation; S=$?; rm -rf "$H"; echo "exit=$S"`;
`pnpm lint` and `pnpm format` (AGENTS.md: required when `.agents/skills`
changes); `pnpm --filter oat-docs docs:check` for the changed docs page.

**Contract-test note (applies to p03-t02 and p03-t03):**
`packages/cli/src/validation/named-skill-load-contract.test.ts` pins the
pr-final "Without arguments" sentence ("Run the `oat-project-pr-final` skill
and it will ask for") and fails on unclassified named-skill mentions. Update
that row's `match` when p03-t03 rewrites the sentence, and either add a row for
a new `oat-project-pr-final` mention in `oat-project-complete` (p03-t02) or
word the new sentence without naming the skill.

**Commit** — `fix(p03-t01): drop the unread --retry-limit hint from oat-project-implement`

---

### Task p03-t02: Resolve the completion PR base branch from config

**Files:** `.agents/skills/oat-project-complete/SKILL.md` (Step 11:
resolve `BASE_BRANCH` with the same chain `oat-project-pr-final` uses —
explicit argument when the skill accepts one, `git.defaultBranch`,
`origin/HEAD`, then `main` — and use it in `gh pr create`; mention the
resolved base in the manual-PR fallback; `metadata.version` 1.7.18 → 1.7.19).
Keep the `### Step 11: Open PR in GitHub (Conditional)` heading, the
`**Skip if SHOULD_OPEN_PR is false.**` line, and the `gh pr create` call,
which `packages/cli/src/commands/init/tools/shared/complete-auto-contracts.test.ts`
pins.

**Verify:** `grep -n -- '--base main' .agents/skills/oat-project-complete/SKILL.md`
returns nothing; skill validation and contract tests as in p03-t01.

**Commit** — `fix(p03-t02): resolve the completion PR base branch from config`

---

### Task p03-t03: Make oat-project-pr-final usage text match its behavior

**Files:** `.agents/skills/oat-project-pr-final/SKILL.md` ("Without
arguments": state that it fills the title and base branch from the listed
defaults without asking and then pushes the branch and creates the PR;
`metadata.version` 1.6.12 → 1.6.13).

**Verify:** skill validation and contract tests as in p03-t01.

**Commit** — `fix(p03-t03): describe oat-project-pr-final defaults without promising prompts`

---

## Phase 4: Exact-path commits and isolated test HOME

Items: BL-261012-commit-paths-should-accept — commit-paths should accept
tracked files under ignored directories; and BL-261011-clean-up-the-isolated-home
— Clean up the isolated HOME directories that evidence-grade test runs leave
under TMPDIR.

**File boundary:** `packages/cli/src/commands/shared/exact-path-commit.ts`
and `exact-path-commit.test.ts`,
`apps/oat-docs/docs/reference/cli-reference.md` (the "Exact-path maintenance
commits" section only), `.lintstagedrc.mjs` and `tools/git-hooks/pre-commit`
(only if the real-hook probe in p04-t01 requires it), a new script and test
under `scripts/`, root `package.json` (scripts only), and root `AGENTS.md`.

### Task p04-t01: Stage tracked files under ignored directories in commit-paths

**Files:** `packages/cli/src/commands/shared/exact-path-commit.ts`,
`exact-path-commit.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`.

**Step 1: Write tests (RED)** — scratch repository with enabled hooks and
`.gitignore` containing `assets/*`, a tracked `assets/templates/t.md`
(force-added once at setup):

- Modifying the tracked file and running `commitExactPaths` for it commits
  (outcome `committed`), with hooks run.
- Deleting the tracked file and committing its path records the removal.
- An untracked `assets/templates/new.md` is refused (outcome `failed`, message
  naming the ignored path) and nothing is committed.
- An untracked, non-ignored file still commits (accepted control).

Discovery reproduced the bad state with the built CLI on Git 2.56.0: the
tracked-file case exits 2 with "The following paths are ignored".

**Step 2: Implement (GREEN)** — stage paths already tracked in the isolated
index's base (`HEAD`) with Git's force flag, and stage the remaining paths
without it so an untracked ignored path is still refused.

**Step 3: Verify** — focused test (isolated HOME), lint, type-check. Prove
the guard can fail: (a) remove the tracked/force split and confirm the
tracked-file test fails; (b) force-add every path and confirm the
untracked-ignored refusal test fails; restore. Re-run the scratch probe with
the rebuilt CLI and report the pre-fix bad state, post-fix commit, refusal,
and accepted control.

**Real-hook probe (acceptance criterion 3):** this repository's pre-commit
hook runs lint-staged, which matches `*.md` and re-stages task files with its
own `git add` (no `-f`), so a scratch hook is not enough evidence. Note that
`tools/git-hooks/pre-commit` does not check lint-staged's exit status and
ends in `|| true`, so a successful commit alone proves nothing. Procedure:

1. `git worktree add <tmp> HEAD`, then in `<tmp>` run
   `pnpm install --frozen-lockfile --offline` (or `pnpm install`) so
   lint-staged is available; the installed hook is shared through the common
   Git directory and runs `<tmp>/tools/git-hooks/pre-commit`. commit-paths
   discards hook output on success, so make lint-staged observable: in
   `<tmp>` only (uncommitted, before running commit-paths), change that
   script's lint-staged call to
   `run_pnpm exec lint-staged --verbose >"$PROBE_LOG" 2>&1; echo "lint-staged-exit=$?" >>"$PROBE_LOG"`
   with `PROBE_LOG` exported to a path outside the repository.
2. Make an unformatted change to `packages/cli/assets/templates/plan-lite.md`
   (one oxfmt would rewrite, if oxfmt formats that path; otherwise any change).
3. Commit it from `<tmp>` with this phase worktree's build by absolute path:
   `node <phase-worktree>/packages/cli/dist/index.js --json internal commit-paths --identity probe-<n> --message probe -- packages/cli/assets/templates/plan-lite.md`.
4. Pass only when all hold: the outcome is `committed`; `$PROBE_LOG` shows
   the `*.md` task ran on `plan-lite.md` and ends with `lint-staged-exit=0`;
   the committed blob (`git show HEAD:packages/cli/assets/templates/plan-lite.md`)
   is the expected content; `git status --short` shows only the probe's own
   edit to `tools/git-hooks/pre-commit`. A missing log or a nonzero
   `lint-staged-exit` is a probe failure, not a pass. Quote the log lines in
   the task report.
5. Remove the worktree (`git worktree remove --force <tmp>`) and delete the
   probe branch state; nothing from the probe is pushed.

If the hook's re-stage fails, fix it within this phase's boundary (lint-staged
config or hook script) so a tracked file under `packages/cli/assets/templates/`
commits with hooks enabled and no `git add -f`, and re-run the probe.

Update the cli-reference paragraph to say tracked files under ignored
directories are committed and untracked ignored paths are rejected.

**Step 4: Commit** — `fix(p04-t01): commit tracked files under ignored directories in commit-paths`

---

### Task p04-t02: Add an isolated-HOME wrapper and pnpm test:evidence

**Files:**

- Create: `scripts/with-isolated-home.sh` — creates a temporary HOME under
  `TMPDIR`, runs the given command with `HOME` set to it, and removes it on
  every exit path (success, failure, `INT`, `TERM`), propagating the command's
  exit status
- Create: `scripts/with-isolated-home.test.mjs` (`node --test`): directory
  removed after success, after a failing command (exit status preserved), and
  after `SIGTERM`; the command sees the temporary `HOME`
- Modify: root `package.json`: add
  `"test:evidence": "bash scripts/with-isolated-home.sh pnpm exec turbo run test --force"`
  and include the new test in `test:scripts`
- Modify: root `AGENTS.md`: the Definition of Done points the evidence-grade
  recipe at `pnpm test:evidence`; the skill-prose contract-test recipe uses
  `bash scripts/with-isolated-home.sh pnpm --filter ...`; the `test:scripts`
  description names both script tests

**Verify:** `pnpm test:scripts`; `bash scripts/with-isolated-home.sh sh -c 'echo $HOME'`
then confirm that directory no longer exists. Prove the guard can fail: remove
the trap, confirm the removal tests fail, restore.

**Commit** — `fix(p04-t02): add pnpm test:evidence with a self-cleaning isolated HOME`

---

## Phase 5: Integration — docs, generated views, release, close-out

Runs after the p01–p04 group merges. **File boundary:** `apps/oat-docs/docs/**`
pages that describe the fixed behavior, root `README.md` and
`packages/cli/README.md`, this repository's generated provider views and
`.oat/sync/manifest.json`, the five public `package.json` files and
`packages/cli/assets/public-package-versions.json`, the `.oat/repo/**` paths
returned in `oat backlog archive` `affectedPaths`, and (only under the
cross-phase reconciliation rule at the end of this phase) any file needed to
fix a cross-phase gate failure.

### Task p05-t01: Update docs that describe the fixed behavior

**Files:** `apps/oat-docs/docs/reference/what-oat-writes.md`,
`apps/oat-docs/docs/provider-sync/manifest-and-drift.md`,
`provider-sync/pilot-with-a-team.md`, `provider-sync/providers.md`,
`provider-sync/scope-and-surface.md`, `provider-sync/commands.md`,
`apps/oat-docs/docs/getting-started/tool-packs.md`,
`apps/oat-docs/docs/reference/troubleshooting.md`, root `README.md` (line 36
says a no-name `--scope project` install also installs core under HOME),
`packages/cli/README.md`, and any other page found by searching
`apps/oat-docs/docs`, `README.md`, and `packages/cli/README.md` for the old
behaviors (`escapes the sync
scope`, `multi_agent`, `max_depth`, `Known surprises`, `--scope all` in sync
guidance, `packs:inventory`, `--no-hook`, `EPIPE`, `--no-commit)`, `gh repo
view`, core and `--scope project`).

**Steps:** Do a delta analysis against the merged code (read the tests that
pin each behavior) and change only claims that are now false:

- Item 1: remove the manual-cleanup warnings
  (`manifest-and-drift.md` around lines 65–70, `pilot-with-a-team.md` around
  147 and 158) and say sync removes a deleted or renamed agent's views, Codex
  role file and table; note that Codex roles left by versions before 0.3.39
  without an owner header need one manual removal.
- Item 2: `what-oat-writes.md` (around 49–50 and 93),
  `pilot-with-a-team.md` (around 184), `providers.md` (around 60–75): sync
  adds missing `multi_agent` / `max_depth` and reports what it added; it keeps
  explicit values and reports conflicts.
- Item 3: remove the fixed "Known surprises in 0.3.14" bullets in
  `what-oat-writes.md` and the matching notes in `tool-packs.md`; describe the
  new behavior (core is user-scope only and is refused or skipped under
  `--scope project`; explicit scope writes only that scope; `init --setup`
  honors `--scope` and does not call `gh`).
- Item 4: update `troubleshooting.md` (`packs:inventory`, around 307) and
  `what-oat-writes.md` (guidance block around 206, and the `--project-guidance`,
  local-scope `--no-commit`, and `EPIPE` surprises).
- Keep each page's headings and links; no new pages. Retitle the surprises
  section only if its version label is no longer true.

**Verify:** `pnpm --filter oat-docs docs:check`; markdownlint through
`pnpm check`'s docs step or `pnpm --filter oat-docs check`;
`pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
then commit any change to `apps/oat-docs/index.md` with this task.

**Commit** — `docs(p05-t01): describe the fixed sync, install-scope, and message behavior`

---

### Task p05-t02: Refresh this repository's generated provider views

**Steps:** With the merged branch CLI, run
`pnpm run cli:source -- sync --scope project`; review the diff (expected:
canonical-derived `.codex/agents/*.toml` gain the `# oat-owner:
project-config` header; `.codex/config.toml` keeps its values) and commit
exactly the changed generated files and `.oat/sync/manifest.json`. Confirm a
second run reports no changes.

**Verify:** `pnpm run cli:source -- status --scope project` exits 0.

**Commit** — `chore(p05-t02): refresh generated provider views`

---

### Task p05-t03: Lockstep version bump to 0.3.39

**Files:** `packages/cli/package.json`, `packages/control-plane/package.json`,
`packages/docs-config/package.json`, `packages/docs-theme/package.json`,
`packages/docs-transforms/package.json`,
`packages/cli/assets/public-package-versions.json` (follow the shape of the
last lockstep bump, commit 6b17fd21f).

**Verify:** `git fetch origin main`; `pnpm release:check-versions`;
`pnpm run check:skill-bumps`; `pnpm release:validate` — each with its exit
code captured.

**Commit** — `chore(p05-t03): bump public packages to 0.3.39`

---

### Task p05-t04: Archive the delivered backlog items

**Steps:** For each delivered item, run the branch CLI
`pnpm run cli:source -- backlog archive <id> --summary "<outcome>" --json`, capture
`affectedPaths`, convert to repository-relative paths, deduplicate, format the
existing text files, and commit the exact union through `oat internal
commit-paths` with identity `<run identity>:backlog-closeout`. If an item was
dropped, record why in `implementation.md` instead of archiving it.

**Verify:** `pnpm run cli:source -- pjm doctor --json` reports no backlog
drift; the delivered items are under `.oat/repo/pjm/backlog/archived/`.

**Commit** — `chore(p05-t04): archive wave 1 backlog items`

---

### Phase 5 phase-end check: Definition of Done gates

This replaces the forced-CLI-only phase-end check for p05. It is a check, not
a task: it creates no commit unless the reconciliation rule below fires.

Run the nine root AGENTS.md Definition of Done gates in CI order,
capturing each exit code (`pnpm <gate> > /tmp/wave1-<gate>.log 2>&1; echo "exit=$?"`):
`pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`,
`pnpm run check:skill-bumps`, `git fetch origin main` then
`pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, and
the generated docs index freshness check
(`pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
then `git diff --exit-code -- apps/oat-docs/index.md`). Also run the
evidence-grade suite through `pnpm test:evidence`, `pnpm lint`, and
`pnpm format` (this delivery changes `.agents/skills`). Confirm `pnpm test`
actually executed (no `>>> FULL TURBO` replay for changed packages).

Report every gate's exit code and log path; the root records them in
`implementation.md`.

**Cross-phase reconciliation rule:** if a gate fails because of combining the
parallel phases (for example a p02-owned test fixture that pins the old Codex
base-role header), append the next free task ID to Phase 5 —
`### Task p05-t05: Reconcile cross-phase test expectations` — with the
failing gate, the files fixed, and its verification; fix each failure within
the failing component; commit it as
`fix(p05-t05): reconcile cross-phase test expectations`; update
Implementation Complete; add the matching `### Task p05-t05` block under
Phase 5 in `implementation.md` (status, commit SHA, outcome, files,
verification) and update its Progress Overview row and total; run
`oat project journal check --project <project> --at review`; then re-run the
failing gate and every later gate.
When every gate passes, no task is appended and nothing is committed.

---

## Reviews

| Scope | Type     | Status          | Date       | Artifact | Reviewed Head                            | Invocation | Gate Target |
| ----- | -------- | --------------- | ---------- | -------- | ---------------------------------------- | ---------- | ----------- |
| p01   | code     | pending         | -          | -        | -                                        | -          | -           |
| p02   | code     | pending         | -          | -        | -                                        | -          | -           |
| p03   | code     | pending         | -          | -        | -                                        | -          | -           |
| p04   | code     | pending         | -          | -        | -                                        | -          | -           |
| p05   | code     | pending         | -          | -        | -                                        | -          | -           |
| final | code     | pending         | -          | -        | -                                        | -          | -           |
| plan  | artifact | fixes_completed | 2026-10-31 | -        | ca7780669bee124cd23222f8b2f48d4c3ef39e12 | auto       | -           |

Plan artifact review disposition (Auto Artifact-Review Loop, structured
mode, native Cursor variant `oat-reviewer-claude-opus-5-5-high` resolved for
the `high` reviewer ceiling; requests `wave1-plan-artifact-review-1..3`; retry
bound 2 exhausted): cycle 1 returned F1–F9 (2 High), cycle 2 confirmed them and
returned R1 (High), R2, R3, cycle 3 confirmed R1–R3 and returned M1 (Medium:
real-hook probe evidence not observable through commit-paths) and L1 (Low:
appended reconciliation task needs its journal block). M1 and L1 were applied
as unambiguous in-bundle fixes under autonomy gate `QS-11` after the last
cycle, so they have not been re-reviewed by this loop; the configured
cross-family quick-start gate reviews the resulting plan. No Critical or High
finding remains open.

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/High)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Provider sync cleanup and Codex config values (items 1, 2)
- Phase 2: 7 tasks - Install scope and CLI messages (items 3, 4)
- Phase 3: 3 tasks - Lifecycle skill contracts (item 5)
- Phase 4: 2 tasks - Exact-path commits and isolated test HOME (items 6, 7)
- Phase 5: 4 tasks - Docs, generated views, version bump, backlog close-out (Definition of Done gates run as its phase-end check)

**Total: 19 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md` (section 5, Wave 1)
- Backlog items: `.oat/repo/pjm/backlog/items/BL-261002-clean-up-stale-provider-views.md`,
  `BL-261002-stop-oat-sync-from-changing.md`, `BL-261002-honor-the-requested-scope.md`,
  `BL-261002-correct-misleading-init-status.md`, `BL-261002-align-implement-complete.md`,
  `BL-261012-commit-paths-should-accept.md`, `BL-261011-clean-up-the-isolated-home.md`
- Design: not produced (quick mode, straight to plan — gate `QS-04` in `discovery.md`)
