---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-27
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: false
oat_generated: false
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
---

# Implementation Plan: backlog-wave-2

> Execute this plan using `oat-project-implement`. The five phases run
> sequentially on branch `wave/2026-09-27-backlog-wave-2`.

**Goal:** Ship Wave 2 of the 2026-09-26 backlog review plus the CLAUDE.md shim
change as one PR: close eleven backlog items with evidence, absorb
`BL-260830-persist-instruction-sync`, ship `BL-260829-order-phase-bookkeeping-before`
while keeping it open for live observation, and bump the lockstep packages to
0.3.9.

**Architecture:** Five sequential phases grouped by shared write sets: AGENTS.md
guidance (p01), CLAUDE.md shims (p02), lifecycle skill prose (p03), agent roles
and recon validation (p04), and CI/backlog tooling plus the release fan-in
(p05).

**Tech Stack:** TypeScript ESM CLI (`packages/cli`, vitest), bundled skills
under `.agents/skills` and agent roles under `.agents/agents` (markdown plus
`node --test` scripts), Fumadocs docs under `apps/oat-docs/docs`.

**Commit Convention:** `{type}({pNN-tNN}): {description}` — for example
`fix(p01-t02): append absent managed blocks to an existing AGENTS.md`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (autonomous run; phase gates on all
      phases replace per-phase pauses; `p05` is the fan-in checkpoint)
- [x] Set `oat_plan_hill_phases` in frontmatter (confirmed at implementation
      start)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

## Conventions for Every Task

- **Test runner:** CLI tests run from the repository root with
  `pnpm --filter @open-agent-toolkit/cli exec vitest run <paths relative to packages/cli>`.
  Skill and agent script tests run with `node --test <path>`. Always set
  `HOME=$(mktemp -d)` for any test that could resolve user-scope OAT state.
- **Imports:** same-directory `./...` or the package's configured aliases
  (`@rules/*`, `@engine/*`, `@config/*`, `@providers/*`, `@commands/*`,
  `@agents/*`); never `../`, `src/...`, or `@/*` (`packages/cli/AGENTS.md`).
- **Format:** run `pnpm exec oxfmt --write <files you created or edited>` on
  every changed `.ts`, `.mjs`, `.json`, and non-`.oat` `.md` file before
  committing. oxfmt skips `.oat/` paths when given explicit arguments; never
  run it on `state.md`.
- **Failing-first proof:** every defect fix records, in the task's commit body
  or `implementation.md`, that the new test fails against the pre-fix code (run
  it before the fix, or neutralize the fix, observe the failure, and restore).
  Load-bearing negative controls named in a task are proven by
  neutralize-and-restore.
- **Bundled mirrors:** never edit `packages/cli/assets/skills/**` or
  `packages/cli/assets/docs/**`; `pnpm build` regenerates them. Only four files
  under `packages/cli/assets/` are tracked.
- **Versions:** bump a changed canonical skill's `metadata.version`, or a
  changed agent role's top-level `version:`, once in the PR, in the task that
  first changes it, and update every test pin of that version in the same
  task (search `packages/cli/src` and `.agents/skills/*/tests` for the old
  value). Later tasks that edit the same skill do not bump again.
- **Sync:** if a task needs provider views refreshed, run
  `pnpm run cli -- sync --scope project`; never `--scope all`.
- **Branch CLI for probes:** run `pnpm build` then
  `node packages/cli/dist/index.js ...` for temp-repo probes; the `oat` on
  `PATH` is the installed 0.3.7 release.
- **After every commit:** run `git status --short`; if the pre-commit hook left
  a reformatted file, review it and commit it in the same task.

---

## Parallelism

The plan is fully sequential (`oat_plan_parallel_groups: []`). Every adjacent
phase pair shares a write:

- p01 and p02 both edit `.agents/skills/oat-doctor/SKILL.md`,
  `packages/cli/src/commands/pjm/init.ts` (the next-step hint), and
  `packages/cli/src/commands/help-snapshots.test.ts`.
- p02 and p03 both bump skills whose versions are pinned in
  `packages/cli/src/validation/skills.test.ts`.
- p03 and p04 both edit `packages/cli/src/validation/named-skill-load-contract.test.ts`
  (routing pins in p03; the fence-scan inventory in p04).
- p05 is the fan-in: the lockstep bump and backlog close-out need every earlier
  phase.

Within p04, both tasks edit `.agents/agents/oat-reviewer.md`; they are ordered,
and the first owns the one version bump.

---

## Acceptance Mapping

| Item                                       | Criterion                                                                                                                   | Task                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `BL-260909-fix-the-agents-md-unsafe`       | Each variant writes under its own temp dir; repeated run green; no shared `outside.md` reference                            | p01-t01                                               |
| `BL-260903-close-manual-only-agents-md`    | Append absent block, `appended`, exit 0; different block keeps manual patch; identical no-op; absent file exclusive create  | p01-t02                                               |
|                                            | Negative control: pre-fix manual state, post-fix append, concurrent-edit survival                                           | p01-t02                                               |
|                                            | Brand-new repo `oat init` → `oat pjm init` ends with both blocks, no manual action                                          | p01-t03                                               |
|                                            | Guidance printed once per command                                                                                           | p01-t03                                               |
|                                            | Docs and `oat pjm init` next-step message describe append                                                                   | p01-t03                                               |
|                                            | Every `--project-guidance` consumer acts or rejects                                                                         | p01-t04                                               |
|                                            | `oat init` without `--setup` honors or warns                                                                                | p01-t04                                               |
|                                            | Read-only emission of the managed block                                                                                     | p01-t05                                               |
|                                            | `oat-doctor` hints name a producing command                                                                                 | p01-t05                                               |
| `BL-260927-name-only-installed-pack`       | Scope-aware directory naming by pack membership                                                                             | p01-t06                                               |
|                                            | Non-pack project skills described separately                                                                                | p01-t06                                               |
|                                            | Fixtures: all-user, all-project, mixed, user-plus-unrelated                                                                 | p01-t06                                               |
|                                            | `oat tools where` decision recorded (deferred)                                                                              | p01-t06                                               |
| `BL-260927-make-claude-md-shims-opt`       | Persisted config key, default `none`, `--strategy` override, `oat config set`, docs                                         | p02-t01, p02-t05                                      |
|                                            | `none`: missing is not drift; configured strategy unchanged (negative control)                                              | p02-t02                                               |
|                                            | No partial coverage: managed-shim removal, dry-run listing, hand-written preserved                                          | p02-t02                                               |
|                                            | Leftover CLAUDE.md warning (sync, `--json`, validate, doctor); silent when none                                             | p02-t03, p02-t04                                      |
|                                            | Stray adoption under `none` leaves no CLAUDE.md                                                                             | p02-t03                                               |
|                                            | Analyze/apply conditional import; `resolve-providers.sh` detection; bumps                                                   | p02-t04                                               |
|                                            | Docs: default, when to opt in, plugin constraints                                                                           | p02-t05                                               |
|                                            | `BL-260830-persist-instruction-sync` absorbed                                                                               | p02-t06, p05-t05                                      |
|                                            | This repository drops its shims; sync clean                                                                                 | p02-t06                                               |
|                                            | Lockstep bump; tests for each strategy with isolated `HOME`                                                                 | p02-t02, p02-t03, p05-t04                             |
|                                            | Release notes call out the automatic removal (via the PR title)                                                             | p05-t05 (PR Requirements)                             |
| `BL-260907-route-quick-mode-discovery`     | Discovery rows name quick-start; pins; one bump each                                                                        | p03-t01                                               |
| `BL-260907-record-absorbed-projects`       | Lite records both fields; contract test and scratch probe; `lifecycle.md` qualifier dropped                                 | p03-t02                                               |
| `BL-260829-order-phase-bookkeeping-before` | Reviewer never sees a stale ledger; clean tree for the fix child preserved; relationship to `BL-260711` recorded            | p03-t03                                               |
|                                            | Live multi-phase verification                                                                                               | Not in this wave (item stays open; operator decision) |
| `BL-260909-repair-the-bare-fences-that`    | Five instances repaired; scanner covers `.agents/agents` and `.oat/templates` with negative control; bumps; laxity decision | p04-t01                                               |
| `BL-260927-validate-recon-worker`          | Deterministic validator; reviewer runs it before launch and corrects accepted handles; fixtures for both lanes              | p04-t02                                               |
| `BL-260909-give-packages-control-plane`    | `pnpm check` fails on control-plane formatting (red then green); AGENTS.md updated; lint enrollment pinned                  | p05-t01                                               |
|                                            | Lockstep bump                                                                                                               | p05-t04                                               |
| `BL-260909-rewrite-inbound-references`     | No dangling `.oat/repo` links after archive; fixture test                                                                   | p05-t02                                               |
|                                            | Tip clean after a real archival                                                                                             | p05-t05                                               |
| `BL-260904-stabilize-the-collection`       | Ten consecutive uncached runs recorded                                                                                      | p05-t03                                               |

---

## Phase 1: AGENTS.md guidance

### Task p01-t01: Give each unsafe-directory variant its own outside directory

Backlog: `BL-260909-fix-the-agents-md-unsafe`.

**Files:**

- Modify: `packages/cli/src/commands/shared/agents-md.test.ts` (the `it.each`
  "unsafe %s target" block, lines ~296-321)

**Step 1: Isolate (GREEN)**

The block computes `const outside = join(root, '..', 'outside.md')` (line
~310), and `root` is a fresh `mkdtemp(tmpdir(), 'agents-md-test-')`, so every
variant, and every concurrent test process, uses the same `$TMPDIR/outside.md`.

Create a second `mkdtemp` directory per variant for the outside target, point
the `external` symlink at that directory's `outside.md` with a path that still
leaves `root`, and clean it up with the variant. Remove every other reference to
the shared `outside.md` path in the file.

**Step 2: Verify**

Run twenty times with explicit exit codes (vitest 4 has no `--repeat`):
`for i in $(seq 1 20); do HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts > /tmp/agents-md-r$i.log 2>&1; echo "run=$i exit=$?"; done`
Expected: all twenty exit 0; record the exit codes in `implementation.md`. Also `rg -n "'\.\.', 'outside\.md'|\.\./outside\.md" packages/cli/src/commands/shared/agents-md.test.ts`
returns no shared-path use.

**Step 3: Commit**

`test(p01-t01): isolate the agents-md unsafe-target fixtures per variant`

---

### Task p01-t02: Append absent managed blocks to an existing AGENTS.md

Backlog: `BL-260903-close-manual-only-agents-md` (criteria 1, 2).

**Files:**

- Modify: `packages/cli/src/commands/shared/agents-md.ts` (result action union
  at line ~76, `createMissingFile` ~443, the existing-file branch ~462-556,
  `formatAgentsMdGuidanceResult` ~396)
- Modify: `packages/cli/src/commands/shared/agents-md.test.ts`
- Modify: `packages/cli/src/commands/init/tools/project-guidance.ts`
  (`AgentsGuidanceAction` gains `appended`; the prompt "Create missing or
  propose manual repository AGENTS.md tool guidance?" and the "an existing file
  requires a manual patch" reason strings, ~14-20, ~180, ~218, ~232, describe
  the append path) and `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: every caller that switches on the action (search `'manual-required'`
  under all of `packages/cli/src`) so `appended` is handled wherever `created`
  is, including `packages/cli/src/commands/decision/index.ts` (~167) and
  `packages/cli/src/commands/docs/init/index.ts` (~310), which map
  `manual-required` to a partial non-zero outcome
- Modify: `packages/cli/src/commands/decision/*.test.ts`,
  `packages/cli/src/commands/docs/init/index.test.ts`, and
  `packages/cli/src/e2e/workflow.test.ts` (~562-641, "reports $consumer manual
  guidance truthfully", which seeds an AGENTS.md without the blocks and today
  expects exit 1 plus `manual-required`; under the new contract the absent-block
  cases become `appended` with exit 0, while present-but-different cases keep
  the manual patch; the tools-guidance cases at ~354-460, "keeps $entryPoint
  ... guidance manual-only across reruns", flip the same way)

**Step 1: Write tests (RED)**

Cover the four-way contract for `upsertAgentsMdSections` against an existing
file:

- the real-filesystem append (no injected seam) uses the exact open flags from
  Step 2 and succeeds;
- block absent → action `appended`, exit-code-bearing result is success, and
  the file equals the original bytes, one separator newline (`\n`), the absent
  blocks joined by `\n\n`, and a trailing `\n` (matching `createMissingFile`),
  so the block marker always starts its own line regardless of how the file
  (or a concurrent writer) ended;
- block present and identical → `no-change`, file untouched;
- block present but different → `manual-required` with the same manual patch
  as today, file untouched;
- file absent → exclusive create as today.

Add the negative control: (a) a fixture capturing today's behavior (existing
file, absent block → `manual-required`) that fails after the change; (b) the
append case; (c) a concurrent-edit fixture where another writer appends user
content to the file between the read and the append, and both the user bytes
and the managed block are present afterwards with the original prefix
byte-for-byte unchanged; (d) the same race where the concurrent append has no
trailing newline: the managed block's opening marker still starts its own
line, and a second `upsertAgentsMdSections` run returns `no-change` with
exactly one managed block. Inject the concurrent write through a new `open` member on
`AgentsMdFileSystem` (today it exposes only `lstat`, `readFile`, `readlink`,
`realpath`, `writeFile`), between planning and the append. (e) Target swap:
rename a hard link to a file outside the repository (in a sibling `mkdtemp` on
the same filesystem) over `AGENTS.md` between planning and the open; expect
`blocked`, zero bytes written, and the outside file byte-identical; prove it by
neutralize-and-restore of the `fstat` `dev`/`ino` identity check, since only
that check can reject this swap (`O_NOFOLLOW` stays in Step 2 as defense in
depth without a separate proof).
(f) Multi-section and legacy cases: tools block absent while the legacy
`<!-- OAT workflows -->` block is present stays `manual-required` with zero
writes (append cannot remove the legacy block); in a multi-section write
(pjm init writes two sections in one call) with one block absent and the other
present-but-different, append the absent block and report `manual-required`
with a patch for only the different block and a non-zero exit.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts`
Expected: the absent-block and concurrent cases fail.

**Step 2: Implement (GREEN)**

Add the `appended` action. For an existing regular file whose managed block is
absent, open it with `O_WRONLY | O_APPEND | O_NOFOLLOW` (a write access mode is required; `O_APPEND | O_NOFOLLOW` alone opens read-only and the write fails with `EBADF`) for a direct target (or open the
already-approved in-repository resolved target with an equivalent writable
append mode), `fstat` the opened handle and
compare `dev`/`ino` with the planned target identity, closing with `blocked`
and zero bytes written on a mismatch; then
always write one leading `\n` before the block marker (no last-byte read, so
no read-to-write window), then the absent blocks joined by `\n\n` and a
trailing `\n`, and nothing else; never truncate, rename, or rewrite the file. State in
the commit body whether an in-repository symlinked `AGENTS.md` target (the e2e
symlink cases) is appended through or keeps the manual patch; keep today's
refusal for any target outside the repository. Keep the existing
symlink/unsafe-target refusals in front of the append. Present-but-different
stays the zero-write manual patch.

**Step 3: Verify**

Run
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared src/commands/pjm src/commands/init src/commands/decision src/commands/docs/init src/e2e/workflow.test.ts`.
Expected: green. Prove the concurrent-edit control by neutralizing the append
(swap in a read-modify-write), observing the control fail, and restoring.

**Step 4: Commit**

`fix(p01-t02): append absent managed blocks to an existing AGENTS.md`

---

### Task p01-t03: Print guidance once and prove the fresh-repo sequence

Backlog: `BL-260903-close-manual-only-agents-md` (criteria 3, 4, 5).

**Files:**

- Modify: `packages/cli/src/commands/pjm/index.ts` (guidance print loop, lines
  ~203-212)
- Modify: `packages/cli/src/commands/pjm/init.ts` (next-step message constants)
- Modify: `packages/cli/src/commands/pjm/index.test.ts`,
  `packages/cli/src/commands/pjm/init.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` (guidance section,
  now near line ~688) and any `oat pjm init` docs page that describes
  `manual-required` for an absent block

**Step 1: Write tests (RED)**

- `oat pjm init` against a repo whose `AGENTS.md` has both PJM blocks present
  but different: the combined manual patch is printed exactly once (today it
  prints once per writer) and the command exits non-zero. This fails before
  the dedup fix.
- A fresh temp repository: run an `oat init` path that actually writes
  `AGENTS.md` non-interactively (for example `init --setup --project-guidance`
  with a pack, or the tools-install guidance path), assert the file exists,
  then run `oat pjm init`; assert the tools, project-management, and decisions
  block markers are all present, the exit code is 0, and no manual patch is
  printed. Use the command runners the existing tests use, with an isolated
  `HOME`.

**Step 2: Implement (GREEN)**

Deduplicate the guidance output in `pjm/index.ts` so one combined result prints
per command. Update the next-step message and docs to describe the append
behavior (absent block appended; different block still needs the printed
patch).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm`
Then build and probe in a temp repo inside one subshell so both commands share
the isolated `HOME`:
`pnpm build && (export HOME=$(mktemp -d); cd $(mktemp -d) && git init -q && node /Users/tstang/Code/open-agent-toolkit/packages/cli/dist/index.js init --scope project --setup --project-guidance <same non-interactive flags the test uses>; echo "init exit=$?"; test -f AGENTS.md && echo "AGENTS.md exists"; node /Users/tstang/Code/open-agent-toolkit/packages/cli/dist/index.js pjm init; echo "pjm exit=$?"; grep -n '<!-- OAT' AGENTS.md)`;
record the exit codes and the block markers in `implementation.md`.

**Step 4: Commit**

`fix(p01-t03): print AGENTS.md guidance once and document the append path`

---

### Task p01-t04: Make every --project-guidance consumer act or reject

Backlog: `BL-260903-close-manual-only-agents-md` (criteria 6, 7).

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts` (guidance gated on
  `pack === 'workflows'` at ~1207, ~1790-1805, ~1940; whole-set command
  ~2144-2159)
- Modify: `packages/cli/src/commands/init/index.ts` (the guidance block skipped
  when `!setupFlag && !(interactive && freshInit)`, ~1305-1328)
- Modify: `packages/cli/src/commands/init/tools/index.test.ts` (or the
  existing pack-command tests), `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` if help text
  changes

**Step 1: Write tests (RED)**

For each of the seven non-`workflows` pack install commands (and the
`oat tools install <pack>` equivalents), passing `--project-guidance` either
plans and writes the OAT tools guidance block or exits non-zero with a message
naming the command that does; none exits 0 while ignoring it. `oat init
--project-guidance` without `--setup` on a non-fresh repo either applies
guidance or prints a warning that it was ignored and how to apply it.

**Step 2: Implement (GREEN)**

Choose one behavior per surface and document it in the commit body. Preferred:
the OAT tools guidance block describes all installed packs, so any pack command
given `--project-guidance` plans guidance the same way `workflows` does; if a
surface cannot, it rejects the flag explicitly. `oat init` without `--setup`
applies the guidance directly when the flag is given (or warns, if applying
would require the setup flow).

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init src/commands/tools src/commands/help-snapshots.test.ts`
Expected: green.

**Step 4: Commit**

`fix(p01-t04): honor or reject --project-guidance on every command`

---

### Task p01-t05: Add read-only guidance emission and fix the oat-doctor hint

Backlog: `BL-260903-close-manual-only-agents-md` (criteria 8, 9).

**Files:**

- Modify: `packages/cli/src/commands/init/tools/project-guidance.ts` and the
  tools command registration (new read-only subcommand, for example
  `oat tools guidance [--json]`, that renders the managed OAT tools block from
  the installed pack state without installing, upgrading, or writing anything)
- Create/modify: tests for the new command (no filesystem writes, output equals
  the block the writer would produce, `--json` shape)
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `.agents/skills/oat-doctor/SKILL.md` (every fix hint that names
  `oat tools install <pack> --project-guidance`, at ~line 128 and in the
  instructions dive ~line 224;
  `metadata.version` 2.0.1 → 2.0.2) and its pins (search for `2.0.1` in
  `packages/cli/src` and `.agents/skills/oat-doctor/tests`)
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` and
  `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Write tests (RED)**

The new command prints the block, writes nothing (assert the tree and
`AGENTS.md` are byte-identical before and after), and does not call the
install/upgrade path. The doctor contract test asserts that both hint sites
name the new command (or `oat pjm init` for PJM blocks) and that no hint names
`oat tools install <pack> --project-guidance`.

**Step 2: Implement (GREEN)**

Reuse the existing block builder; the command only renders. Update the
`oat-doctor` hint and bump the skill.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init src/commands/tools src/commands/help-snapshots.test.ts src/validation/skills.test.ts`
and `node --test .agents/skills/oat-doctor/tests/*.test.mjs`.
Expected: green.

**Step 4: Commit**

`feat(p01-t05): print the OAT tools guidance block without reinstalling`

---

### Task p01-t06: Name only installed pack locations in the guidance block

Backlog: `BL-260927-name-only-installed-pack` (all criteria).

**Files:**

- Modify: `packages/cli/src/commands/init/tools/project-guidance.ts`
  (`buildToolPacksSectionBody`, `PACK_DESCRIPTIONS`; the unconditional
  `.agents/skills/` lines at ~76-77)
- Modify: `packages/cli/src/commands/init/tools/project-guidance.test.ts`
- Modify: `.oat/repo/pjm/backlog/items/BL-260927-name-only-installed-pack.md`
  (notes: record the `oat tools where` deferral)

**Step 1: Write tests (RED)**

Fixtures: all packs user-scope (block names `~/.agents/skills/`, not
`.agents/skills/`); all project-scope (names `.agents/skills/`); mixed (names
both, each with its packs); user-scope packs plus unrelated project skills
(names `~/.agents/skills/` for packs and describes the unrelated project skills
separately, not as OAT packs). Decide by pack membership, never by directory
existence.

**Step 2: Implement (GREEN)**

Derive the named directories from each installed pack's scope. Add a separate
line for project skills that belong to no pack when present.

**Step 3: Record the deferral**

Add a note to the item: `oat tools where` deferred by the operator on
2026-09-27; `oat tools list --json` and `oat tools info` already report scope,
and the scope-aware block plus p01-t05's read-only command cover the reported
confusion. Record the same in `implementation.md`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools`
Expected: green.

**Step 5: Commit**

`fix(p01-t06): name only the skills directories installed packs use`

---

### Task p01-t07: (review) Close p01 review findings M1, M2, L1-L4

Source: `reviews/archived/p01-review-2026-09-27T235828Z.md` (auto review,
head `6aa11df62600cd72e41559a611697afb873893d7`).

**Files:**

- Modify: `packages/cli/src/commands/shared/agents-md.ts` and
  `agents-md.test.ts` (M1, L1, L2)
- Modify: `packages/cli/src/commands/init/index.ts` and its tests (M2)
- Modify: `.agents/skills/oat-doctor/SKILL.md` (L3; already bumped to 2.0.2 in
  this PR, do not bump again)
- Modify: `packages/cli/src/commands/pjm/index.test.ts` (L4)

**Step 1: Fix (failing-first for M1 and M2)**

- M1: an existing `AGENTS.md` whose link count is above 1 (a pre-existing hard
  link, possibly to a file outside the repository) never takes the append path;
  it returns the zero-write manual patch. Add a failing-first test with a hard
  link to a file outside the repository present at planning time.
- M2: `oat init --project-guidance` without `--setup` and with no installed
  pack does not append an empty `OAT tools` block; it skips with a clear
  message (or plans only the blocks that have content) and exits 0, so a later
  `oat tools install <pack> --project-guidance` appends normally. Add a test
  that exercises the real applier, not a mock, for that sequence.
- L1: report append failures with a reason matching the actual error (for
  example permission denied) and include the manual patch; distinguish a
  partial write from a clean refusal.
- L2: add `O_NONBLOCK` to the append open flags and refuse a non-regular file
  after `fstat`.
- L3: fix the oat-doctor PJM hint wording (`oat pjm init` appends absent
  blocks; it does not rewrite).
- L4: make the pjm test title match its assertions.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared src/commands/init src/commands/pjm src/e2e/workflow.test.ts`
and `node --test .agents/skills/oat-doctor/tests/*.test.mjs`. Expected: green.

**Step 3: Commit**

`fix(p01-t07): close p01 review findings`

---

### Task p01-t08: (review) Close p01 round-2 Low findings L1-L3

Source: `reviews/archived/p01-review-2026-09-28T000859Z.md` (auto review,
passing: 0 Critical/High/Medium, 3 Low).

**Files:** `packages/cli/src/commands/pjm/index.ts` (or the shared guidance
formatter) and tests; `apps/oat-docs/docs/cli-utilities/tool-packs.md`;
`packages/cli/src/commands/shared/agents-md.ts` and tests;
`packages/cli/src/commands/tools/guidance/index.ts` and tests.

**Step 1: Fix**

- L1: when a zero-write refusal happens (hard link, permission denied, and so
  on), `oat pjm init`'s header states the refusal, not "an existing block
  differs"; fix `tool-packs.md` (~736) to match.
- L2: a directory swapped in before the append is reported as an identity
  change, not a write refusal.
- L3: `oat tools guidance` with no installed packs prints a clear "no packs
  installed" message (and `--json` says so) instead of an empty placeholder
  block.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared src/commands/pjm src/commands/tools src/commands/init`.

**Step 3: Commit**

`fix(p01-t08): close p01 round-2 review findings`

---

## Phase 2: CLAUDE.md shims

### Task p02-t01: Persist a configurable instruction sync strategy

Backlog: `BL-260927-make-claude-md-shims-opt` (criterion 1);
`DR-260927-claude-md-shims-are-opt`.

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.types.ts` only if
  the resolver needs a type; `none` is not added in this task
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts` (add
  the config-aware resolver: `--strategy` flag, then
  `documentation.instructionSyncStrategy`, then the built-in default; in this
  task the built-in default stays `pointer`, and p02-t02 flips it to `none`
  together with the `none` behavior so every intermediate commit is coherent)
- Modify: `packages/cli/src/config/resolve.ts` (default row for
  `documentation.instructionSyncStrategy` beside `instructionPointerExcludes`
  ~76)
- Modify: `packages/cli/src/config/oat-config.ts` (`OatDocumentationConfig`
  gains `instructionSyncStrategy`; parse and validate alongside
  `instructionPointerExcludes`, ~1523-1548 and ~1778-1783)
- Modify: `packages/cli/src/commands/config/index.ts` (`oat config
set/get/unset` support, following the `instructionPointerExcludes` pattern at
  ~137-142, ~313-318, ~513-534)
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts` (~356-358) and
  `validate/validate.ts` (~42-44): remove the Commander
  `.default(DEFAULT_INSTRUCTION_SYNC_STRATEGY)` on `--strategy`, which would
  otherwise always fill the option and hide the config; read the resolved
  strategy instead, and report the effective strategy in `--json` output
- Modify: tests: `src/config/oat-config.test.ts`, `src/config/resolve.test.ts`,
  `src/commands/config/index.test.ts`, `src/commands/instructions/**/*.test.ts`,
  `src/commands/help-snapshots.test.ts` (`instructions --help` block ~861)

**Step 1: Write tests (RED)**

- Config: the key accepts `pointer`, `symlink`, `copy`; rejects other values
  (including `none`, which p02-t02 adds together with its behavior) with the
  existing validation style; `oat config set/get/unset` round trip.
- Resolution: flag beats config beats default.
- CLI level (not only the resolver): with `documentation.instructionSyncStrategy:
copy` in config and no flag, `instructions sync --dry-run --json` and
  `instructions validate --json` report the effective strategy `copy`; with
  `--strategy symlink` they report `symlink`. This fails before the fix because Commander's default fills the
  option.

**Step 2: Implement (GREEN)**

Add the key and resolver for the three existing strategies. Accepting `none`,
its behavior, and the default flip all land together in p02-t02, so no commit
exposes a `none` value that still creates shims.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/config src/commands/config src/commands/instructions src/commands/help-snapshots.test.ts`
Expected: green.

**Step 4: Commit**

`feat(p02-t01): persist a configurable instruction sync strategy`

---

### Task p02-t02: Stop creating shims and remove OAT-managed shims under none

Backlog: `BL-260927-make-claude-md-shims-opt` (criteria 2, 3, 10).

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
  (`planSyncActions` ~121, `applySyncActions` ~207)
- Modify: `packages/cli/src/commands/instructions/validate/validate.ts` (~88)
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
  (`scanInstructionFiles` ~552 statuses)
- Modify: `packages/cli/src/commands/instructions/**/*.test.ts`,
  `instructions.integration.test.ts`

**Step 1: Write tests (RED)**

With the strategy resolved to `none` (isolated `HOME`, temp repos):

- an AGENTS.md without a CLAUDE.md → sync plans nothing; validate exits 0.
- a managed pointer shim (`@AGENTS.md\n`), a symlink to the sibling AGENTS.md,
  and a byte-identical copy → a non-dry-run sync removes each; `--dry-run` lists
  each as a planned removal and removes nothing.
- a hand-written or modified CLAUDE.md → never deleted; reported.
- a `CLAUDE.md` symlink whose target is not the sibling AGENTS.md → kept and
  reported.
- `CLAUDE.local.md` and `.claude/CLAUDE.md` whose content is exactly
  `@AGENTS.md` → never removed (p02-t03 warns about them).
- a pointer shim inside an excluded directory or the documentation content
  tree → never removed.
- a planned shim that is replaced with hand-written content between planning
  and removal → kept byte-identical and reported; the same for a planned shim
  replaced by a symlink between planning and removal (inject the change through
  the sync apply path's filesystem seam).

Negative control: with `pointer` configured, a missing CLAUDE.md is still
reported as `missing` drift and created by sync, exactly as today; each of
`symlink` and `copy` keeps today's behavior.

**Step 2: Implement (GREEN)**

Add `none` to `INSTRUCTION_SYNC_STRATEGIES` and to the config key's accepted
values (with the `oat config set` test), flip the built-in default to `none`
(`DEFAULT_INSTRUCTION_SYNC_STRATEGY`), and
update existing tests that relied on the implicit `pointer` default to pass
`--strategy pointer` or configure it. Add `none` handling everywhere the
strategy is switched on (`sync.ts` ~60-62, `getSyncedDetail`). Add a removal
action for exact managed shapes under `none`; keep every existing strategy path
unchanged. Removal only ever targets a file named `CLAUDE.md` whose sibling is
`AGENTS.md`, inside the set the scanner already walks; it never touches
`CLAUDE.local.md`, `.claude/CLAUDE.md`, files in
`documentation.instructionPointerExcludes` or the documentation content tree,
or anything that is not an exact managed shape. Removal fails closed at apply
time: immediately before deleting, re-`lstat` the target and re-verify both its
identity (the `dev`/`ino` or symlink target recorded at planning) and its exact
managed content; on any change, skip the deletion and report the file as
changed-since-planning.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions`
Expected: green. Prove the hand-written-preservation and foreign-symlink
controls by neutralizing the exact-shape check, and the changed-since-planning
control by neutralizing the apply-time re-verification, observing each test
fail, and restoring.

**Step 4: Commit**

`feat(p02-t02): default to no CLAUDE.md shims and remove OAT-managed ones`

---

### Task p02-t03: Warn about leftover CLAUDE.md files and adopt strays without shims

Backlog: `BL-260927-make-claude-md-shims-opt` (criteria 4, 5).

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts` (stray adoption
  ~250-290; warning output)
- Modify: `packages/cli/src/commands/instructions/validate/validate.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
  (detection of `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`)
- Modify: instructions tests

**Step 1: Write tests (RED)**

Under `none`:

- after sync, each remaining `CLAUDE.md`, `.claude/CLAUDE.md`, or
  `CLAUDE.local.md` produces one warning naming the path, stating that Claude
  Code's default `agents-md` mode ignores every AGENTS.md in the project while
  it exists, and giving exactly two options: remove the file, or set
  `documentation.instructionSyncStrategy` in `.oat/config.json` to a shim
  strategy and rerun `oat instructions sync`. `--json` carries the same
  finding as a structured warning; `oat instructions validate` reports it; exit
  codes are unchanged (warning, not failure).
- a repository with no remaining CLAUDE.md prints no such warning (negative
  control).
- stray adoption: a lone CLAUDE.md with no AGENTS.md is adopted into a new
  AGENTS.md and the CLAUDE.md is removed (or, if removal is refused because the
  content differs after adoption, the kept file is reported with the reason).

Under a configured shim strategy, no leftover warning is emitted and stray
adoption behaves as today. Leftover detection is a separate, read-only,
repository-wide walk that is independent of the mutation exclusions
(`documentation.instructionPointerExcludes` and the documentation content root
limit removal only, never the warning), because Claude Code's walk does not
honor OAT's excludes. Add a case with a leftover `CLAUDE.md` in an excluded
directory and one under the documentation root, asserted at the public command
boundaries: `instructions sync` (human and `--json`) and
`instructions validate --json`; p02-t04 pins the doctor surface.

**Step 2: Implement (GREEN)**

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions`
Expected: green.

**Step 4: Commit**

`feat(p02-t03): warn when a CLAUDE.md would hide AGENTS.md from Claude Code`

---

### Task p02-t04: Update doctor, instructions skills, and provider detection

Backlog: `BL-260927-make-claude-md-shims-opt` (criteria 4 doctor half, 6).

**Files:**

- Modify: `.agents/skills/oat-doctor/SKILL.md` (instructions check ~90, ~126-127:
  `missing` is an error only when a shim strategy is configured; surface the
  leftover-CLAUDE.md warning; already bumped in p01-t05, do not bump again)
- Modify: `.agents/skills/oat-doctor/tests/doctor-contract.test.mjs` (~20, 29, 278)
- Modify: `.agents/skills/oat-agent-instructions-analyze/SKILL.md` (~262, 309,
  317: recommend the `@AGENTS.md` import only when shims are configured;
  `metadata.version` 1.12.3 → 1.12.4)
- Modify: `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`
  (~124: the "Claude import shim" recommendation row fires only when a shim
  strategy is configured) and `references/quality-checklist.md` (~30, ~47)
- Verify: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh`
  (~83) already detects Claude from `.claude/` or from `.oat/sync/config.json`
  `providers.claude.enabled` (~26, ~62-76) without a root CLAUDE.md, and
  `tests/resolve-providers.test.mjs` (~48-50, "AGENTS.md plus .claude/ only")
  already proves the `.claude/`-only path; record that the criterion is met by
  existing behavior. Change the script only if that evidence fails.
- Modify: `.agents/skills/oat-agent-instructions-apply/SKILL.md` (~207, 243;
  `metadata.version` 1.7.2 → 1.7.3)
- Modify: version pins (`packages/cli/src/validation/skills.test.ts`,
  `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`,
  and any other hit for the old values)

**Step 1: Write tests (RED)**

Update the existing doctor contract pins (`doctor-contract.test.mjs` ~20, 29, 278) to the conditional wording and to the leftover-CLAUDE.md warning; they
fail before the doctor edit. Analyze, the artifact template row, and apply are
prose edits verified by review and the version-bump gate.

**Step 2: Implement (GREEN)**

**Step 3: Verify**

Run: `node --test .agents/skills/oat-doctor/tests/*.test.mjs .agents/skills/oat-agent-instructions-analyze/tests/*.test.mjs`
and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared`.
Expected: green.

**Step 4: Commit**

`feat(p02-t04): make instructions skills and doctor shim-aware`

---

### Task p02-t05: Document the no-shim default and the pjm init hint

Backlog: `BL-260927-make-claude-md-shims-opt` (criteria 1 docs half, 7).

**Files:**

- Modify: `packages/cli/src/commands/pjm/init.ts` (`INSTRUCTIONS_SYNC_HINT`
  ~57-62: stop promising shim creation) and `pjm/init.test.ts` (~218-219)
- Modify: `apps/oat-docs/docs/provider-sync/instruction-sync.md` (strategy table
  ~163-167 gains `none` as the default; statuses ~179-182; adoption ~186-198; a
  section on the Claude Code `agents-md` plugin: default mode, when to opt in —
  releases before the plugin, `instructionFiles: claude-md`, the nested-file
  gaps — that a project cannot set `instructionFiles`, and that any root
  `CLAUDE.md` or `CLAUDE.local.md` makes the default mode ignore AGENTS.md)
- Modify: `apps/oat-docs/docs/provider-sync/commands.md` (~211-239),
  `apps/oat-docs/docs/cli-utilities/configuration.md` (~98, new key entry),
  `apps/oat-docs/docs/reference/oat-directory-structure.md` (~128),
  `apps/oat-docs/docs/reference/troubleshooting.md` (~61-64),
  `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` (~259-262),
  `apps/oat-docs/docs/provider-sync/scope-and-surface.md` (~126),
  `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Implement**

Cite the plugin source as `anthropics/claude-code` `mods/agents-md` at
v2.1.278.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm`
and `pnpm --filter oat-docs check` (the oxfmt and markdownlint check CI
uses). Expected: green.

**Step 3: Commit**

`docs(p02-t05): document the no-shim default and when to opt in`

---

### Task p02-t06: Drop this repository's shims

Backlog: `BL-260927-make-claude-md-shims-opt` (criteria 8, 9).

**Files:**

- Delete: the tracked pointer shims (root `CLAUDE.md`,
  `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/CLAUDE.md`,
  `apps/oat-docs/CLAUDE.md`, `.oat/repo/CLAUDE.md`,
  `.oat/repo/pjm/CLAUDE.md`, `.oat/repo/reference/CLAUDE.md`,
  `.oat/repo/reference/decisions/CLAUDE.md`; confirm the list with
  `git ls-files | grep -E '(^|/)CLAUDE\.md$'` and check each is exactly
  `@AGENTS.md`)
- Modify: `.oat/repo/pjm/backlog/items/BL-260830-persist-instruction-sync.md`
  (disposition note, one line per criterion, reused as the p05-t05 archive
  summary: project-config persistence delivered by p02-t01; user-config
  persistence dropped because shims are a per-repository choice under the new
  default; the init prompt dropped because the default is `none` and opting in
  is one `oat config set`; effective-strategy reporting delivered by p02-t01's
  `--json` effective strategy field; the migration criterion superseded by
  `DR-260927-claude-md-shims-are-opt` automatic removal)
- Modify: any test or smoke fixture that asserts this repository's shims exist
  (search `tools/smoke` and `packages/cli/src` for repository-root CLAUDE.md
  assertions)

**Step 1: Remove through the product path**

Run `pnpm build`, then `node packages/cli/dist/index.js instructions sync
--dry-run` from the repository root and confirm it lists exactly the managed
shims for removal and nothing else; then run it without `--dry-run`. Record the
dry-run output in `implementation.md`. If any non-shim CLAUDE.md appears,
stop and report instead of deleting.

**Step 2: Verify**

Run `node packages/cli/dist/index.js instructions validate --json` (exit 0, no
leftover warning) and `node packages/cli/dist/index.js instructions sync
--json` (no changes).

**Step 3: Commit**

`chore(p02-t06): drop this repository's CLAUDE.md shims`

---

### Task p02-t07: (review) Close p02 review findings C1, M1, M2, L1-L3

Source: `reviews/archived/p02-review-2026-09-28T005842Z.md` (auto review:
1 Critical, 2 Medium, 3 Low).

**Step 1: Fix (failing-first for C1 and M1; neutralize-and-restore for C1)**

- C1: never treat a `CLAUDE.md` as a managed copy when the sibling `AGENTS.md`
  is a symlink that resolves to that `CLAUDE.md` (or when both resolve to the
  same file or inode); such a `CLAUDE.md` is the source of truth and is kept
  and reported. Compare the copy shape against a distinct regular `AGENTS.md`
  only. Add tests for `AGENTS.md -> CLAUDE.md` (hand-written) and the reverse
  shapes; prove the guard by neutralize-and-restore.
- M1: sync, validate, and the leftover walk stop at nested git checkouts
  (a directory containing `.git`, including submodules and nested worktrees
  such as `.claude/worktrees/<name>`); add a failing-first test.
- M2: update the analyze skill's bundled `.agents/docs/rules-files.md`
  (sections 2.6, 5.4) to the new Claude Code `agents-md` facts and the
  conditional shim guidance; bump that file's owning skill only if not already
  bumped in this PR.
- L1: word the leftover warning precisely for a subdirectory `CLAUDE.md`
  (it disables the plugin for Claude Code sessions started in that directory or
  below).
- L2: correct `instruction-sync.md` (`CLAUDE.local.md` reporting; the
  `--add-dir` claim).
- L3: include `CLAUDE.local.md` in the analyze skill's discovered file list.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run`
(full CLI suite), `node --test .agents/skills/oat-agent-instructions-analyze/tests/*.test.mjs .agents/skills/oat-doctor/tests/*.test.mjs`,
`pnpm --filter oat-docs check`, `pnpm run check:skill-bumps`.

**Step 3: Commit**

`fix(p02-t07): close p02 review findings`

---

### Task p02-t08: (review) Close p02 round-2 findings M1, M2, L1

Source: `reviews/archived/p02-review-2026-09-28T011221Z.md` (auto review,
passing: 0 Critical/High, 2 Medium, 1 Low).

**Step 1: Fix (failing-first for M1 and M2)**

- M1: before removing or adopting a `CLAUDE.md`, check whether any scanned
  `AGENTS.md` (or other instruction file) in the repository resolves to it; if
  so, keep it and report it (no dangling links, no silent success). Cover
  `pkg/AGENTS.md -> ../CLAUDE.md` with an identical root copy and with the root
  `CLAUDE.md` as the only instructions.
- M2: when an `AGENTS.md` links to the named `CLAUDE.md`, the leftover warning
  (CLI human and `--json`), doctor, analyze, and docs advice says to replace the
  link with the file's content first instead of "remove the file"; doctor
  surfaces that caveat, not just the generic warning.
- L1: report case variants of `CLAUDE.md` / `CLAUDE.local.md` (for example
  `claude.md`) in the leftover warning without removing them, or record why not.

**Step 2: Verify**

Run the full CLI suite with an isolated `HOME`, the analyze and doctor node
tests, `pnpm --filter oat-docs check`, `pnpm run check:skill-bumps`, and the
branch CLI `instructions validate --json` / `instructions sync --dry-run --json`
on this repository.

**Step 3: Commit**

`fix(p02-t08): close p02 round-2 review findings`

---

## Phase 3: Lifecycle skill routing and bookkeeping

### Task p03-t01: Route quick-mode discovery rows straight to quick-start

Backlog: `BL-260907-route-quick-mode-discovery` (all criteria).

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md` (quick-mode discovery rows
  ~256-257; `metadata.version` 1.1.2 → 1.1.3)
- Modify: `.agents/skills/oat-project-progress/SKILL.md` (routing row ~279;
  `metadata.version` 1.4.2 → 1.4.3)
- Modify: `packages/cli/src/validation/named-skill-load-contract.test.ts` (pin
  both rows beside the existing next/progress pins ~1650-1859, ~2141-2162)
- Modify: version pins (`packages/cli/src/validation/skills.test.ts` and any
  other hit)

**Step 1: Write the pins (RED)**

**Step 2: Edit the rows (GREEN)**

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts`
Expected: green.

**Step 4: Commit**

`fix(p03-t01): route quick-mode discovery rows straight to quick-start`

---

### Task p03-t02: Record absorbed projects in Lite consolidations

Backlog: `BL-260907-record-absorbed-projects` (all criteria).

**Files:**

- Modify: `.agents/skills/oat-project-lite/SKILL.md` (the Lite frontmatter
  write for `state.md`; `metadata.version` 1.1.5 → 1.1.6), mirroring
  `oat-project-quick-start/SKILL.md` ~201-219 field shapes
  (`absorbed_projects: [<slug>]`, `absorbed_backlog_ids: [<BL-id>]`)
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  (new Lite case beside the quick-start case ~1587-1616)
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (~165: drop the
  quick-mode-only qualifier)
- Modify: version pins

**Step 1: Write the contract test (RED)**

**Step 2: Edit the skill and docs (GREEN)**

**Step 3: Scratch-tree probe**

The retirement sweep is agent-executed prose in
`oat-project-complete/SKILL.md` (~770-775); there is no sweep script. Model the
probe on the quick-start harness in `review-skill-contracts.test.ts`
(~4303-4380): extract Lite's scaffold and consolidation block from the edited
`SKILL.md`, run it verbatim in a scratch repository through the built CLI,
assert that `state.md` carries `absorbed_projects` and `absorbed_backlog_ids`
in quick-start's shapes, and apply the sweep's documented input predicate
(non-empty fields) as the "reaches the semantic checks" assertion. Run it once in a
scratch repository and record the result in `implementation.md`; the Step 1
contract pin stays the durable guard.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts`
Expected: green.

**Step 5: Commit**

`fix(p03-t02): record absorbed projects in Lite consolidations`

---

### Task p03-t03: Commit phase bookkeeping before per-phase review dispatch

Backlog: `BL-260829-order-phase-bookkeeping-before` (criteria 1, 2, 4; criterion
3 stays open by operator decision).

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
  (Per-Phase Review ~684-796, the deferral note ~756-758, Step 7 Root
  Bookkeeping ~880-916)
- Bump: `.agents/skills/oat-project-implement/SKILL.md` `metadata.version`
  2.3.13 → 2.3.14 (required: `references/phase-execution.md` is a bundled file
  of the skill)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` summary, if it
  describes the order
- Modify: the implement skill contract tests that pin the review/bookkeeping
  order (search `packages/cli/src/commands/init/tools/shared/*.test.ts` and
  `.agents/skills/oat-project-implement/tests/` for `Step 7: Artifact Updates`
  and `bookkeeping`)
- Modify: `.oat/repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md`
  and `.oat/repo/pjm/backlog/items/BL-260829-order-phase-bookkeeping-before.md`
  (notes)
- Modify: version pins

**Step 1: Write the contract test (RED)**

Pin that the phase's task ledger (`implementation.md` task and phase completion
rows plus the `state.md` resume pointer) is committed before the per-phase
reviewer is dispatched, that the reviewer brief names review-outcome
bookkeeping (review rows and dispositions, which are written after the review)
as out of scope, and that the fix child still starts from a clean tree.

**Step 2: Edit the reference (GREEN)**

Split Step 7 into pre-review bookkeeping (committed before dispatch) and
post-review bookkeeping (review rows, dispositions, orchestration log entry
for the review outcome). State why this keeps the fix-child preflight clean:
the pre-review writes are committed, so the tree is clean when a bounded fix
child is dispatched. The pre-review commit reuses Step 7's scope-resolving
commit branch, including the synced-scope `oat project push` path, and the
Optional External Phase Review Gate (~797) sees the same committed ledger.

**Step 3: Record relationships and status**

Add a note to `BL-260711-skip-re-review-for-bookkeeping` stating that
`BL-260829-order-phase-bookkeeping-before` shipped first and prevents the
stale-ledger finding at its source, so `BL-260711` should cover only residual
bookkeeping-only findings. Add a note to `BL-260829` that code and contract
tests shipped in this PR and only live observation on the next multi-phase
project remains; the item stays open.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
and `node --test .agents/skills/oat-project-implement/tests/*.test.mjs`.
Expected: green.

**Step 5: Commit**

`fix(p03-t03): commit phase bookkeeping before per-phase review dispatch`

---

### Task p03-t04: (review) Close p03 review findings M1, M2, L2-L4

Source: `reviews/archived/p03-review-2026-09-28T014814Z.md` (auto review,
passing: 0 Critical/High, 2 Medium, 4 Low; L1 deferred to a follow-up backlog
item at closeout because it touches CLI routers outside the item's scope).

**Step 1: Fix**

- M1: state that settling a completed recovery marker (clearing
  `pending_attempt`, recording its canonical event) belongs to Step 7a, before
  reviewer dispatch; state which commit owns bookkeeping for stops that end
  without a review.
- M2: Step 7a records task completion and the resume pointer but not the
  phase's pass status; the phase status is set in Step 7b from the review
  outcome (and corrected on retry exhaustion). Fix the "nothing here depends
  on the review outcome" sentence.
- L2: correct the gate sentence for parallel groups and after a fix loop, and
  lead Per-Phase Review with the parallel-group exception.
- L3: update `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
  to show the split and the reviewer-brief scope.
- L4: pin the parallel-group "task ledger out of scope" clause and the new
  `SKILL.md` sentence with failing-first contract assertions.

No second version bump (`oat-project-implement` is already 2.3.14 in this PR).

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`,
`node --test .agents/skills/oat-project-implement/tests/*.test.mjs`,
`pnpm run check:skill-bumps`, `pnpm --filter oat-docs check`.

**Step 3: Commit**

`fix(p03-t04): close p03 review findings`

---

### Task p03-t05: (review) Keep the phase row nonterminal until review fixes and the gate settle

Source: `reviews/archived/p03-review-2026-09-28T015614Z.md` (phase gate,
passing; M2 addressed now in the judgment sweep).

**Step 1: Fix (failing-first pin)**

In `.agents/skills/oat-project-implement/references/phase-execution.md` Step
7b, a passing root review with queued review-fix tasks, or with a selected
external phase gate still pending, leaves the phase row nonterminal; the row
becomes `complete` only after review dispositions and any selected gate pass.
Define how a blocked gate or an added fix task updates the row, and pin the
transition in the phase-sequence contract test. No version bump
(`oat-project-implement` is already 2.3.14 in this PR).

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`
and `node --test .agents/skills/oat-project-implement/tests/*.test.mjs`.

**Step 3: Commit**

`fix(p03-t05): keep the phase row nonterminal until review and gate settle`

---

## Phase 4: Agent roles and recon validation

### Task p04-t01: Repair bare fences outside .agents/skills and extend the scanner

Backlog: `BL-260909-repair-the-bare-fences-that` (all criteria).

**Files:**

- Modify: `.agents/agents/oat-codebase-mapper.md` (fence ~246-255;
  `version:` 1.0.1 → 1.0.2)
- Modify: `.agents/agents/oat-reviewer.md` (fences ~502-523 and ~534-559;
  `version:` 1.2.9 → 1.2.10; p04-t02 does not bump again)
- Modify: `.agents/agents/skeptical-evaluator.md` (fence ~81-99; `version:`
  1.0.0 → 1.0.1)
- Modify: `.oat/templates/docs-app-mkdocs/docs/contributing.md` (fence
  ~107-122)
- Modify: `packages/cli/src/validation/named-skill-load-contract.test.ts`
  (`collectFenceScanFiles` ~456-537 walks only `.agents/skills`; extend to
  `.agents/agents` and `.oat/templates`; update `CORPUS_MINIMUMS`)
- Modify: agent-role version pins, if any test pins them
- Regenerate: tracked provider views of the edited roles
  (`.codex/agents/*.toml`, `.cursor/agents/*.md`)

**Step 1: Extend the scanner (RED)**

With the five fences still broken, the extended scan fails and names each.

**Step 2: Repair (GREEN)**

Apply the wave-7 p10 treatment to each (opener, narrowed closers, balanced info
strings) so the swallowed headings, including `### Step 9: Return
Confirmation` and `## Structured-Output Mode` in `oat-reviewer.md`, render as
headings.

**Step 3: Negative control**

Seed a bare fence that swallows a heading in a scratch copy under each new tree
(or a fixture the scanner reads), confirm the test fails, and restore. Record
the result in `implementation.md`.

**Step 4: Decide the laxity narrowing**

Record in `implementation.md` and the item a one-line reason for leaving the
scanner's `^\s*` indent laxity, column-0 heading anchor, and inventory headroom
as they are (latent, not live, per the wave-7 p10 root review). Reintroduce the
narrowing when a heading-swallowing fence the current scanner misses is found.

**Step 5: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts src/validation`
Expected: green. Then `pnpm build && pnpm run cli -- sync --scope project`
(never `--scope all`), confirm with `git status --short` that only the edited
roles' `.codex/agents` and `.cursor/agents` views changed, and include them in
this task's commit; `node packages/cli/dist/index.js status --scope project`
reports no drift.

**Step 6: Commit**

`fix(p04-t01): repair bare fences in agent roles and templates`

---

### Task p04-t02: Validate recon assignment envelopes before launch

Backlog: `BL-260927-validate-recon-worker` (all criteria; GitHub #295).

**Files:**

- Create: `.agents/skills/recon/scripts/validate-assignment.mjs` (deterministic
  validator reusing `.agents/skills/recon/scripts/lib/` contract helpers)
- Create: `.agents/skills/recon/tests/validate-assignment.test.mjs` and fixtures
  (valid and invalid envelopes for the mechanical and intelligent recon lanes
  project review uses)
- Modify: `.agents/skills/recon/SKILL.md` (document the script;
  `metadata.version` 1.1.5 → 1.1.6)
- Modify: `.agents/agents/oat-reviewer.md` (~101: run the validator before
  launch; when a launched child's envelope is found invalid after acceptance,
  correct it through the accepted handle instead of relaunching). The reviewer
  ships in the `workflows` pack and the validator in the `research` pack: add
  `recon` to the reviewer's existing sibling-skill probe (~89, user scope then
  repository) with recovery `oat tools install research --scope <scope>`; the
  existing "cannot be constructed → do not launch, cover the lane inline" rule
  (~101) covers a miss
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
  (~469-476: add `['skills','recon','scripts','validate-assignment.mjs']` to the
  recon scripts that must ship)
- Regenerate: tracked provider views of `oat-reviewer` (and `recon-worker` if
  edited) under `.codex/agents` and `.cursor/agents`
- Modify: `.agents/agents/recon-worker.md` only if its Assignment Gate
  (~33-43) must reference the validator (`version:` 1.0.2 → 1.0.3 if edited)

**Step 1: Read the contract**

Read GitHub #295 (`gh issue view 295`) and the recon-worker Assignment Gate to
list the envelope's required fields and their constraints for each lane.

**Step 2: Write tests (RED)**

The validator reports every missing or invalid field (not just the first) and
exits non-zero on an invalid envelope; valid fixtures for both lanes pass. Add
a contract assertion (in `packages/cli/src/validation/skills.test.ts` or the
existing agent-role contract tests) that `oat-reviewer.md` names
`validate-assignment.mjs` and the accepted-handle correction rule; it fails
before the edit.

**Step 3: Implement (GREEN)**

**Step 4: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`.
Expected: green. Then `pnpm build && pnpm run cli -- sync --scope project`,
commit the regenerated views of the edited roles in this task, and confirm
`git status --short` is clean.

**Step 5: Commit**

`feat(p04-t02): validate recon assignment envelopes before launch`

---

### Task p04-t03: (review) Close p04 review findings M1, L1-L7

Source: `reviews/archived/p04-review-2026-09-28T021519Z.md` (auto review,
passing: 0 Critical/High, 1 Medium, 7 Low).

**Step 1: Fix (failing-first for M1)**

- M1: an array of envelopes validates as one homogeneous wave (same run, wave,
  wave mode, and task class); flip the test that accepts a mixed array.
- L1: reject `writePath: "."` (and other non-file paths).
- L2: detect file-editing tools case-insensitively and across providers
  (`write`, `apply_patch`, and so on).
- L3: report a missing envelope file distinctly from invalid JSON.
- L4: list `taskClass` and `escalation` among the worker contract's required
  fields.
- L5: name all scanned roots in the fence scanner's failure message.
- L6: remove the empty leftover code block in `oat-reviewer.md` (~595-597).
- L7: have the reviewer pass the envelope on stdin instead of writing a file
  (structured-output mode must not write).

No further bumps (reviewer 1.2.10 and recon 1.1.6 already in this PR);
regenerate the reviewer's provider views with `sync --scope project` if the
role changes.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`,
`pnpm run check:skill-bumps`, `node packages/cli/dist/index.js status --scope project`.

**Step 3: Commit**

`fix(p04-t03): close p04 review findings`

---

### Task p04-t04: (review) Close p04 gate findings H1, M1

Source: `reviews/archived/p04-review-2026-09-28T022315Z.md` (phase gate
`codex-6-sol-xhigh`, blocked: 1 High, 1 Medium).

**Step 1: Fix (failing-first negative controls)**

- H1: every `readSources.sources` entry must resolve inside the declared
  allowed inputs and scope and outside excluded inputs and scope (excluded
  directories exclude descendants), using the contract's path or locator
  semantics; reject authority that cannot be verified before launch. Add a
  valid nested-source control and negative controls for an unrelated absolute
  path and an excluded descendant.
- M1: `artifact.outputSchema` must resolve to an approved packet-contract
  schema reference or be a closed inline schema; add unknown-reference and
  open-object negative controls beside the documented valid reference.

No further version bumps (recon 1.1.6 already in this PR).

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`.

**Step 3: Commit**

`fix(p04-t04): bound recon read sources and output schemas`

---

### Task p04-t05: (review) Close p04 round-2 findings M1-M3, L1-L2

Source: `reviews/archived/p04-review-2026-09-28T023246Z.md` (auto review,
passing: 0 Critical/High, 3 Medium, 2 Low).

**Step 1: Fix (failing-first negative controls)**

- M1: treat any string with a URL scheme (`scheme:`), with or without `//`, as
  a URL; only `http`/`https` are allowed URL forms; `file:` and other schemes
  are unverifiable; compare URL origins including host.
- M2: compare repository paths case-insensitively for exclusion and
  containment (fail closed on case-insensitive filesystems).
- M3: make the approved output-schema reference resolve to a real anchor in
  `packet-contract.md` (add stable headings for the artifact kinds, or change
  the accepted reference form to one that resolves), and add a test that the
  accepted reference's anchor exists.
- L1: state in the contract how packet-relative exclusions (for example
  `raw/`, `reviews/`) are expressed, and align the fixtures.
- L2: an inline output schema must match the schema for its artifact kind (or
  record why top-level closure is sufficient).

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`.

**Step 3: Commit**

`fix(p04-t05): close p04 round-2 review findings`

---

### Task p04-t06: (review) Restrict read-only tool authority to an allowlist

Source: `reviews/archived/p04-review-2026-09-28T024124Z.md` (phase gate
attempt 2, blocked: 1 High). Operator direction (2026-09-28): fix, run one
root re-review, record an override of the exhausted gate budget, continue.

**Step 1: Fix (failing-first)**

`readSources.tools` accepts only an explicit set of supported read-only tool
names across providers (for example `Read`, `Grep`, `Glob`, and their
provider equivalents); shell or execution tools (`Bash`, `exec_command`, and
so on) and unknown names are rejected. Add negative controls for a shell tool
and an unknown tool beside the valid fixture; they must fail against the
current validator.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`.

**Step 3: Commit**

`fix(p04-t06): restrict recon read-only tool authority to an allowlist`

---

### Task p04-t07: (review) Bound recon write paths and make wave duplicate checks case-insensitive

Source: `reviews/archived/p04-review-2026-09-28T025845Z.md` (operator-authorized
root re-review: 1 High, 2 Medium, 3 Low). Operator direction (2026-09-28): fix
H1 and M1, defer M2 and L1-L3 to a follow-up backlog item, continue to p05
without another p04 review; the final review covers p04.

**Step 1: Fix (failing-first)**

- H1: `writePath` must sit inside the packet directory for the lane's
  artifact kind and must never name a controller-owned file (`manifest.json`,
  `claims.json`, `packet.md`, `reviews/reconciliation.json`,
  `raw/failure.json`, and any other canonical packet file in the contract).
- M1: compare write paths across a wave case-insensitively and after Unicode
  normalization for the duplicate check.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs` and
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`.

**Step 3: Commit**

`fix(p04-t07): bound recon write paths and case-fold duplicate checks`

---

## Phase 5: CI and backlog tooling, release fan-in

### Task p05-t01: Give packages/control-plane a check script

Backlog: `BL-260909-give-packages-control-plane` (criteria 1, 2, 4).

**Files:**

- Modify: `packages/control-plane/package.json` (add `check` copying the other
  packages' `oxlint . && oxlint --type-aware ... && oxfmt --check .` pattern)
- Modify: `AGENTS.md` (both passages naming the gap: the `pnpm check`
  description ~40 and the control-plane paragraphs ~113-136)
- Modify: `tools/smoke/verification/lint-enrollment.test.mjs` (assert
  explicitly that `packages/control-plane/package.json` defines `scripts.lint`;
  the test's existing `pnpm lint` shell-out proves turbo reaches it)

**Step 1: Red control**

Seed a formatting violation in `packages/control-plane/src`, run
`pnpm exec turbo run check --filter @open-agent-toolkit/control-plane --force`,
and record that nothing fails (no `check` task).

**Step 2: Implement (GREEN)**

Add the script; rerun with the seeded violation (fails), remove the seed, rerun
(passes). Record both exit codes in `implementation.md`.

**Step 3: Pin the lint enrollment**

Add the assertion and prove it by temporarily deleting the control-plane `lint`
script (test fails), then restoring.

**Step 4: Verify**

Run: `node --test tools/smoke/verification/lint-enrollment.test.mjs` (after
`pnpm build`) and `pnpm lint`, `pnpm format`.
Expected: green.

**Step 5: Commit**

`build(p05-t01): gate packages/control-plane formatting through check`

---

### Task p05-t02: Rewrite inbound references when a backlog item is archived

Backlog: `BL-260909-rewrite-inbound-references` (criteria 1, 2).

**Files:**

- Modify: `packages/cli/src/commands/backlog/archive.ts` (`archiveBacklogItem`
  ~200-321)
- Modify: `packages/cli/src/commands/backlog/archive.test.ts`
- Modify: `apps/oat-docs/docs/` backlog command docs,
  `.oat/repo/pjm/AGENTS.md` (Backlog Lifecycle: note the rewrite), and the
  shipped template `.oat/templates/pjm-agents.md` (primary path notes the
  rewrite; the manual fallback adds "rewrite inbound `.oat/repo` links to
  `archived/`")

**Step 1: Write tests (RED)**

A fixture repository whose external plan, decision record, and another backlog
item link to `pjm/backlog/items/<id>.md` (relative paths from their own
locations); after archive, each link points at `pjm/backlog/archived/<id>.md`
with a correct relative path, and the command output lists the rewritten
files. Include a repository-root path reference in external-plan frontmatter
(`oat_external_plan_sources: - .oat/repo/pjm/backlog/items/<id>.md`) and assert it is
rewritten. Links inside
the archived item itself and in `completed.md` stay correct.

**Step 2: Implement (GREEN)**

Scan tracked Markdown under `.oat/repo/**` and rewrite every link or path
string (including repository-root frontmatter paths) that resolves to the moved
item; report each rewritten path, and warn only on forms that cannot be
resolved.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog`
Expected: green.

**Step 4: Commit**

`feat(p05-t02): rewrite inbound references when archiving a backlog item`

---

### Task p05-t03: Record ten uncached runs of the collection-detach test

Backlog: `BL-260904-stabilize-the-collection` (criterion 3; criteria 1-2 met
by `ddddba079`).

**Step 1: Run**

Run the named case ten times uncached with an isolated `HOME`, for example
`for i in $(seq 1 10); do HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/engine.integration.test.ts -t "preserves a same-target user replacement during disablement"; echo "run=$i exit=$?"; done`,
capturing each exit code.

**Step 2: Record**

Record the ten exit codes, the head SHA, and the platform in
`implementation.md` and the item notes.

**Step 3: Commit**

`test(p05-t03): record ten uncached collection-detach runs`

---

### Task p05-t04: Bump the lockstep public package versions

Backlog: lockstep criteria of `BL-260909-give-packages-control-plane` and
`BL-260927-make-claude-md-shims-opt`.

**Files:**

- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
  (0.3.8 → 0.3.9) and any tracked version manifest the release tooling reads
  (`packages/cli/assets/public-package-versions.json`)

**Step 1: Bump**

Follow the same files the 0.3.8 bump changed (`git show 5bb73dd08 --stat`
filtered to version files).

**Step 2: Verify**

Run: `git fetch origin main && pnpm release:check-versions` and
`pnpm release:validate`.
Expected: exit 0.

**Step 3: Commit**

`chore(p05-t04): bump lockstep public packages to 0.3.9`

---

### Task p05-t05: Archive the shipped backlog items

Backlog: close-out for every closable item; `BL-260909-rewrite-inbound-references`
criterion 3.

**Step 1: Archive with the branch CLI**

After `pnpm build`, run `node packages/cli/dist/index.js backlog archive <id>
--summary "<outcome>"` for each item whose criteria all pass:
`BL-260903-close-manual-only-agents-md`, `BL-260927-name-only-installed-pack`,
`BL-260909-fix-the-agents-md-unsafe`, `BL-260927-make-claude-md-shims-opt`,
`BL-260830-persist-instruction-sync` (summary: absorbed by the shim item),
`BL-260907-route-quick-mode-discovery`, `BL-260907-record-absorbed-projects`,
`BL-260909-repair-the-bare-fences-that`, `BL-260927-validate-recon-worker`,
`BL-260909-give-packages-control-plane`, `BL-260909-rewrite-inbound-references`,
`BL-260904-stabilize-the-collection`. Do not archive
`BL-260829-order-phase-bookkeeping-before`.

**Step 2: Verify no dangling links**

Run `rg -n "pjm/backlog/items/(<archived ids joined by |>)\.md" .oat/repo`;
expect no matches; any match is a defect in p05-t02 to fix before
continuing. Then run the executable bidirectional-link check,
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t "every current external plan"`,
as the `BL-260909-rewrite-inbound-references` criterion 3 evidence. Note in
`implementation.md` that no external plan links to this wave's items, so the
p05-t02 fixture test carries the behavioral proof.

**Step 3: Record the PR requirements**

Write the `## PR Requirements` section below into `implementation.md`'s
hand-off so the PR step (`oat-project-pr-final`) uses them verbatim.

**Step 4: Index note**

Add a curated overview note to `.oat/repo/pjm/backlog/index.md` summarizing the
wave, run `node packages/cli/dist/index.js backlog regenerate-index`, and run
`node packages/cli/dist/index.js pjm doctor --json` (no new warnings).

**Step 5: Commit**

`chore(p05-t05): archive the backlog items shipped in wave 2`

---

### Task p05-t06: Run the full Definition of Done

**Step 1: Run every gate with explicit exit codes**

In CI order, each captured as `pnpm <gate> > <log> 2>&1; echo "exit=$?"`:
`pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions` (after
`git fetch origin main`), `pnpm release:validate`, `pnpm build:docs`; then
`pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, and
`pnpm format` (this wave touches `tools/smoke`, `.agents/skills`, and
`packages/control-plane`). Confirm test runs were not cache replays.

**Step 2: Record**

Record each exit code and the head SHA in `implementation.md`.

**Step 3: Commit**

`chore(p05-t06): record wave 2 definition-of-done evidence`

---

### Task p05-t07: (review) Close p05 review findings M1, L1-L7

Source: `reviews/archived/p05-review-2026-09-28T103350Z.md` (auto review,
passing: 0 Critical/High, 1 Medium, 7 Low).

**Step 1: Fix**

- M1: give `packages/control-plane` `check:fix` and `lint:fix` scripts matching
  its siblings, so `pnpm check:fix` repairs it.
- L1: correct the AGENTS.md and `contributing/code.md` wording (not every
  workspace package runs oxlint; keep why the root oxlint pass is ungated).
- L2: pin the control-plane `check` script alongside `lint`.
- L3: test the untracked-file scan flags and links at depths other than two.
- L4: do not rewrite inside code spans or fenced code; rebase reference-style
  link definitions in the moved item; remove the unreachable backslash branch
  or make it reachable.
- L5: make a failed rewrite retryable (regenerate the index and retry the
  rewrite on the already-archived path).
- L6: mention the rewrite in `archive --help` (with the help snapshot) and say
  "tracked and untracked, not ignored" in the docs.
- L7: note in the archived `BL-260904-stabilize-the-collection` item that the
  ten local runs were on macOS and the Linux (inode-reuse) evidence comes from
  the PR's Linux CI; correct the index note so it does not claim the rewriter
  prevented dangling links in this wave (it made zero rewrites).

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog src/commands/help-snapshots.test.ts`,
`node --test tools/smoke/verification/lint-enrollment.test.mjs`, `pnpm check`,
`pnpm lint`, `pnpm format`.

**Step 3: Commit**

`fix(p05-t07): close p05 review findings`

---

### Task p05-t08: (review) Close p05 gate findings H1, M1, M2

Source: `reviews/archived/p05-review-2026-09-28T104612Z.md` (phase gate
`codex-6-sol-xhigh`, blocked: 1 High, 2 Medium).

**Step 1: Fix (failing-first)**

- H1: never read or write through a symlink in the rewrite scan (`lstat`, or
  resolve and require the real target inside `.oat/repo`); a Git-tracked
  symlink fixture proves an outside target stays unchanged.
- M1: rewrite only tokens whose resolved target is the archived item's former
  path; leave URLs unchanged; warn on unresolved local forms; pin a remote URL
  and an unrelated `../../elsewhere/backlog/items/<id>.md` path as unchanged.
- M2: parse optional angle delimiters separately in inline links and
  reassemble after rebasing; assert an angle-bracket sibling link.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog`
and type-check.

**Step 3: Commit**

`fix(p05-t08): bound backlog reference rewriting to real in-repo targets`

---

### Task p05-t09: (review) Close p05 re-review findings H1, M1, M2, L1-L3

Source: `reviews/archived/p05-review-2026-09-28T105839Z.md` (auto re-review
after gate attempt 1: 1 High, 2 Medium, 3 Low).

**Step 1: Fix (failing-first on real-shaped fixtures)**

- H1: rewrite repository paths inside inline code spans when the whole span
  is a path that resolves to the moved item (the canonical external-plan
  "Source artifact or scope" citation form); keep fenced code blocks and
  non-path code spans untouched. Fixture mirrors
  `.agents/skills/oat-repo-improve/references/plan-template.md` rows.
- M1: fallback resolution bases apply only when the token does not already
  resolve to an existing file; never rewrite a working link.
- M2: reference-definition rebase applies only to `[label]: <url-or-path>`
  definitions, never to footnotes (`[^n]:`) or prose.
- L1: rebase links with single-quoted or parenthesized titles in the moved
  item.
- L2: make inline code-span detection robust to an unmatched backtick.
- L3: list rewritten files in plain-text output on the retry path.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog`,
type-check, lint, and a scratch archive of a real linked item with an
external plan citing it in the template's code-span form.

**Step 3: Commit**

`fix(p05-t09): rewrite code-span path citations and protect working links`

---

## PR Requirements

The release workflow (`.github/workflows/release.yml`) publishes a fixed body
plus `generate_release_notes: true`, whose "What's Changed" list carries merged
PR titles only, not PR bodies. The removal must therefore be stated in the PR
title itself:

- Title uses a Conventional Commit breaking marker and names the removal, for
  example
  `feat!: stop creating and auto-remove OAT-managed CLAUDE.md shims by default (wave 2, lockstep 0.3.9)`.
- The body (for reviewers) opens with a **Behavior change** callout: `oat instructions sync` no
  longer creates `CLAUDE.md` shims by default and removes OAT-managed shims
  (exact `@AGENTS.md` pointer, sibling symlink, or identical copy) on its next
  run; hand-written `CLAUDE.md` files are kept and reported. Opt back in with
  `oat config set documentation.instructionSyncStrategy pointer` and rerun
  `oat instructions sync`.
- The body also lists the other user-visible changes (append-only AGENTS.md
  guidance, `--project-guidance` behavior, the read-only guidance command, and
  backlog archive link rewriting).

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target       |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------- |
| p01    | code     | fixes_completed | 2026-09-27 | reviews/archived/p01-review-2026-09-27T235828Z.md           | 6aa11df62600cd72e41559a611697afb873893d7 | auto       | -                 |
| p01    | code     | passed          | 2026-09-28 | reviews/archived/p01-review-2026-09-28T000859Z.md           | 80d514bbdf342391944b6580b3341a6e074b8a84 | auto       | -                 |
| p01    | code     | passed          | 2026-09-28 | reviews/archived/p01-review-2026-09-28T001719Z.md           | 4905ae61b93f3011d368258f5eda6297904d4184 | gate       | codex-6-sol-xhigh |
| p02    | code     | fixes_completed | 2026-09-28 | reviews/archived/p02-review-2026-09-28T005842Z.md           | 8724f5b4ff88c132909cf900fd0bf31b3e0e2948 | auto       | -                 |
| p02    | code     | passed          | 2026-09-28 | reviews/archived/p02-review-2026-09-28T011221Z.md           | c5886c1bf65cd776eba7051cd22ae5cb52ba352b | auto       | -                 |
| p02    | code     | passed          | 2026-09-28 | reviews/archived/p02-review-2026-09-28T013003Z.md           | 01055b7963a8e6931762a0780ffed5ee46168f19 | gate       | codex-6-sol-xhigh |
| p03    | code     | fixes_completed | 2026-09-28 | reviews/archived/p03-review-2026-09-28T014814Z.md           | bfc92754bd4ed05afd5a2f7da173edad7e82fccb | auto       | -                 |
| p04    | code     | fixes_completed | 2026-09-28 | reviews/archived/p04-review-2026-09-28T021519Z.md           | a5ebb0813cf786a9fb06e04f87aaacd7566bbdfe | auto       | -                 |
| p05    | code     | fixes_completed | 2026-09-28 | reviews/archived/p05-review-2026-09-28T103350Z.md           | 3cfab725098067df0b1f002d80ec5ed4f2d4aeed | auto       | -                 |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -                 |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                 |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                 |
| plan   | artifact | fixes_completed | 2026-09-27 | -                                                           | -                                        | auto       | -                 |
| plan   | artifact | fixes_completed | 2026-09-27 | reviews/archived/artifact-plan-review-2026-09-27T150947Z.md | -                                        | gate       | codex-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-09-27 | reviews/archived/artifact-plan-review-2026-09-27T151608Z.md | -                                        | gate       | codex-6-sol-xhigh |
| p03    | code     | passed          | 2026-09-28 | reviews/archived/p03-review-2026-09-28T015614Z.md           | 91066575de14dab6df77a52dcb1e967bfad91890 | gate       | codex-6-sol-xhigh |
| p04    | code     | fixes_completed | 2026-09-28 | reviews/archived/p04-review-2026-09-28T022315Z.md           | 8e34aae0ccb86f9af3e1f26648a50a556ae92144 | gate       | codex-6-sol-xhigh |
| p04    | code     | fixes_completed | 2026-09-28 | reviews/archived/p04-review-2026-09-28T023246Z.md           | 53346a3878ed3a4ed6f2d81b0e683e2893954bdb | auto       | -                 |
| p04    | code     | fixes_completed | 2026-09-28 | reviews/archived/p04-review-2026-09-28T024124Z.md           | de61806bc4789e7901dd0b90b0ee5579e4bca8e9 | gate       | codex-6-sol-xhigh |
| p04    | code     | fixes_completed | 2026-09-28 | reviews/archived/p04-review-2026-09-28T025845Z.md           | 7342fc69d8e9ee79929221a885d56a8e63a24f87 | auto       | -                 |
| p05    | code     | fixes_completed | 2026-09-28 | reviews/archived/p05-review-2026-09-28T104612Z.md           | 3c64d9e225a789e50caa1ba4edb153e943331365 | gate       | codex-6-sol-xhigh |
| p05    | code     | fixes_added     | 2026-09-28 | reviews/archived/p05-review-2026-09-28T105839Z.md           | 7085ab58146ade146e41617e3cdef15b0b9694d9 | auto       | -                 |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

Plan artifact review dispositions: the automatic structured review (Opus 5.5
high, exception route because the planning parent's effort was unknown) ran
three attempts within the retry bound of 2; attempts 1-2 findings (M1-M13,
L1-L4; M1-M5, L1-L6) were applied and re-reviewed, and attempt 3's two findings
(M1 control split, L1 trailing newline) were applied after the bound without a
further structured pass and are covered by the configured gate. Gate attempt 1
(`codex-6-sol-xhigh`, QS-12, `onFailure: block`) returned H1 (apply-time
re-verification before shim removal), H2 (repository-wide leftover detection
independent of exclusions), and M1 (`none` accepted only with its behavior);
all three were resolved in the plan, together with the complexity-review
simplifications (p01-t01 repro deleted; one target-swap control; no `--json`
source field; existing doctor pins and resolve-providers fixture reused; Lite
probe run once; scanner narrowing deferred with a trigger; reviewer probe
reuse; explicit `scripts.lint` pin; rewrite-all archive references).

Gate attempt 2 (`codex-6-sol-xhigh`) returned one High: the append open flags
lacked a write access mode (`EBADF`). Resolved in p01-t02 (`O_WRONLY | O_APPEND
| O_NOFOLLOW` plus a real-filesystem success assertion). The configured gate's
`maxAttempts: 2` is exhausted, so readiness waits on an operator decision
(QS-12 boundary).

Operator disposition (2026-09-27): with the gate's attempts exhausted and its
last finding resolved in the plan, the operator approved proceeding to
implementation (QS-12 boundary resolved by explicit operator decision; recorded
in `implementation.md`). Phase gates and the final review still run.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/High)

---

## Implementation Complete

**Summary:**

- Phase 1: 8 tasks - AGENTS.md guidance
- Phase 2: 8 tasks - CLAUDE.md shims
- Phase 3: 5 tasks - Lifecycle skill routing and bookkeeping
- Phase 4: 7 tasks - Agent roles and recon validation
- Phase 5: 9 tasks - CI and backlog tooling, release fan-in

**Total: 37 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`
- Backlog items: `.oat/repo/pjm/backlog/items/` (IDs listed per task)
- Decisions: `.oat/repo/reference/decisions/DR-260927-claude-md-shims-are-opt.md`
- External: `anthropics/claude-code` `mods/agents-md/README.md` at v2.1.278
