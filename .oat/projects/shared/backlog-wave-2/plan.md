---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: true
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
- [ ] Set `oat_plan_hill_phases` in frontmatter (confirmed at implementation
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
|                                            | Release notes call out the automatic removal                                                                                | p05-t05 (PR Requirements)                             |
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

**Step 1: Record the shared path**

The block computes `const outside = join(root, '..', 'outside.md')` (line
~310), and `root` is a fresh `mkdtemp(tmpdir(), 'agents-md-test-')`, so every
variant, and every concurrent test process, uses the same `$TMPDIR/outside.md`.
Try to reproduce the race by running the file in two concurrent processes in a
loop (for example ten iterations of two backgrounded
`vitest run src/commands/shared/agents-md.test.ts` invocations) and record the
result in `implementation.md` whether or not it fails; the race is timing
dependent, so a green pre-fix run does not block the fix.

**Step 2: Isolate (GREEN)**

Create a second `mkdtemp` directory per variant for the outside target, point
the `external` symlink at that directory's `outside.md` with a path that still
leaves `root`, and clean it up with the variant. Remove every other reference to
the shared `outside.md` path in the file.

**Step 3: Verify**

Run twenty times with explicit exit codes (vitest 4 has no `--repeat`):
`for i in $(seq 1 20); do HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts > /tmp/agents-md-r$i.log 2>&1; echo "run=$i exit=$?"; done`
Expected: all twenty exit 0; record the exit codes in `implementation.md`. Also `rg -n "'\.\.', 'outside\.md'|\.\./outside\.md" packages/cli/src/commands/shared/agents-md.test.ts`
returns no shared-path use.

**Step 4: Commit**

`test(p01-t01): isolate the agents-md unsafe-target fixtures per variant`

---

### Task p01-t02: Append absent managed blocks to an existing AGENTS.md

Backlog: `BL-260903-close-manual-only-agents-md` (criteria 1, 2).

**Files:**

- Modify: `packages/cli/src/commands/shared/agents-md.ts` (result action union
  at line ~76, `createMissingFile` ~443, the existing-file branch ~462-556,
  `formatAgentsMdGuidanceResult` ~396)
- Modify: `packages/cli/src/commands/shared/agents-md.test.ts`
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
  the manual patch)

**Step 1: Write tests (RED)**

Cover the four-way contract for `upsertAgentsMdSections` against an existing
file:

- block absent → action `appended`, exit-code-bearing result is success, the
  file equals the original bytes followed by the block (a newline is inserted
  first only when the file does not end with one);
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
exactly one managed block. Inject the concurrent write through an injectable
filesystem dependency of `agents-md.ts` (the module already takes a
`fileSystem` parameter) between the existence check and the append.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts`
Expected: the absent-block and concurrent cases fail.

**Step 2: Implement (GREEN)**

Add the `appended` action. For an existing regular file whose managed block is
absent, open it with an append-only flag (`'a'`, which maps to `O_APPEND`),
decide the separating newline from the opened descriptor immediately before
writing (fstat for the size, then a positional read of the last byte), or
always write a leading newline when the block marker must start a line, and
write only the new block; never truncate, rename, or rewrite the file. State in
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

- `oat pjm init` against a repo whose `AGENTS.md` lacks both managed blocks:
  the combined guidance result is printed exactly once and the command exits 0
  with both blocks appended.
- A fresh temp repository: run the `oat init` path that creates `AGENTS.md`,
  then `oat pjm init`; assert both managed blocks are present, the exit code is
  0, and no manual patch is printed. Use the command runners the existing
  tests use, with an isolated `HOME`.

**Step 2: Implement (GREEN)**

Deduplicate the guidance output in `pjm/index.ts` so one combined result prints
per command. Update the next-step message and docs to describe the append
behavior (absent block appended; different block still needs the printed
patch).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm`
Then build and probe in a temp repo inside one subshell so both commands share
the isolated `HOME`:
`pnpm build && (export HOME=$(mktemp -d); cd $(mktemp -d) && git init -q && node /Users/tstang/Code/open-agent-toolkit/packages/cli/dist/index.js init --scope project; echo "init exit=$?"; node /Users/tstang/Code/open-agent-toolkit/packages/cli/dist/index.js pjm init; echo "pjm exit=$?"; grep -n '^## ' AGENTS.md)`;
record both exit codes and the resulting `AGENTS.md` block headings in
`implementation.md`.

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

## Phase 2: CLAUDE.md shims

### Task p02-t01: Persist the instruction sync strategy with a none default

Backlog: `BL-260927-make-claude-md-shims-opt` (criterion 1);
`DR-260927-claude-md-shims-are-opt`.

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
  (`INSTRUCTION_SYNC_STRATEGIES` gains `none`)
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts` (add
  the config-aware resolver: `--strategy` flag, then
  `documentation.instructionSyncStrategy`, then the built-in default; in this
  task the built-in default stays `pointer`, and p02-t02 flips it to `none`
  together with the `none` behavior so every intermediate commit is coherent)
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
  strategy instead, and report the effective strategy and its source (flag,
  config, or default) in `--json` output
- Modify: tests: `src/config/oat-config.test.ts`, `src/config/resolve.test.ts`,
  `src/commands/config/index.test.ts`, `src/commands/instructions/**/*.test.ts`,
  `src/commands/help-snapshots.test.ts` (`instructions --help` block ~861)

**Step 1: Write tests (RED)**

- Config: the key accepts `none`, `pointer`, `symlink`, `copy`; rejects other
  values with the existing validation style; `oat config set/get/unset` round
  trip.
- Resolution: flag beats config beats default.
- CLI level (not only the resolver): with `documentation.instructionSyncStrategy:
copy` in config and no flag, `instructions sync --dry-run --json` and
  `instructions validate --json` report the effective strategy `copy` with
  source `config`; with `--strategy symlink` they report `symlink` with source
  `flag`. This fails before the fix because Commander's default fills the
  option.

**Step 2: Implement (GREEN)**

Add the key and resolver. `none` is accepted as a value, but its behavior and
the default flip belong to p02-t02.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/config src/commands/config src/commands/instructions src/commands/help-snapshots.test.ts`
Expected: green.

**Step 4: Commit**

`feat(p02-t01): persist the instruction sync strategy with a none default`

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

Negative control: with `pointer` configured, a missing CLAUDE.md is still
reported as `missing` drift and created by sync, exactly as today; each of
`symlink` and `copy` keeps today's behavior.

**Step 2: Implement (GREEN)**

Flip the built-in default to `none` (`DEFAULT_INSTRUCTION_SYNC_STRATEGY`) and
update existing tests that relied on the implicit `pointer` default to pass
`--strategy pointer` or configure it. Add `none` handling everywhere the
strategy is switched on (`sync.ts` ~60-62, `getSyncedDetail`). Add a removal
action for exact managed shapes under `none`; keep every existing strategy path
unchanged. Removal only ever targets a file named `CLAUDE.md` whose sibling is
`AGENTS.md`, inside the set the scanner already walks; it never touches
`CLAUDE.local.md`, `.claude/CLAUDE.md`, files in
`documentation.instructionPointerExcludes` or the documentation content tree,
or anything that is not an exact managed shape.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions`
Expected: green. Prove the hand-written-preservation and foreign-symlink
controls by neutralizing the exact-shape check, observing the tests fail, and
restoring.

**Step 4: Commit**

`feat(p02-t02): remove OAT-managed CLAUDE.md shims under the none strategy`

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
adoption behaves as today. State in the commit body whether the leftover
warning covers excluded and documentation trees (recommended: yes, because
Claude Code's walk does not honor OAT's excludes).

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
- Verify/pin: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh`
  (~83) already detects Claude from `.claude/` or from `.oat/sync/config.json`
  `providers.claude.enabled` (~26, ~62-76) without a root CLAUDE.md; add
  fixtures to `tests/resolve-providers.test.mjs` that pin both no-shim paths
  (these are pinning tests and may pass before any change; record that the
  criterion is met by existing behavior). Change the script only if a fixture
  fails.
- Modify: `.agents/skills/oat-agent-instructions-apply/SKILL.md` (~207, 243;
  `metadata.version` 1.7.2 → 1.7.3)
- Modify: version pins (`packages/cli/src/validation/skills.test.ts`,
  `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`,
  and any other hit for the old values)

**Step 1: Write tests (RED)**

Contract tests pin the conditional wording in doctor, analyze (including the
artifact template row), and apply; these fail before the edit. The
`resolve-providers.sh` pinning fixtures cover `.claude/` only and sync-config
only, both without a root CLAUDE.md.

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
and `pnpm exec markdownlint-cli2 "apps/oat-docs/docs/**/*.md"` (or the
repository's `pnpm check` markdownlint step). Expected: green.

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
  `--json` source field; the migration criterion superseded by
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
(non-empty fields) as the "reaches the semantic checks" assertion. Keep it as a
test case, not a one-off.

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
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (summary, if it
  describes the order; `metadata.version` 2.3.13 → 2.3.14)
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
Optional External Phase Review Gate (~797) sees the same committed ledger; pin
both in the contract test.

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

Either narrow the scanner's `^\s*` indent laxity and column-0 heading anchor
toward CommonMark and reduce the inventory headroom with tests, or record in
`implementation.md` and the item a one-line reason for leaving it.

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
  ships in the `workflows` pack and the validator in the `research` pack, so
  specify resolution: probe
  `${HOME}/.agents/skills/recon/scripts/validate-assignment.mjs`, then
  `<repo-root>/.agents/skills/recon/scripts/validate-assignment.mjs`; on a miss,
  do not launch the recon worker, cover the lane inline, and name
  `oat tools install research --scope <scope>`
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
exits non-zero on an invalid envelope; valid fixtures for both lanes pass.

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

## Phase 5: CI and backlog tooling, release fan-in

### Task p05-t01: Give packages/control-plane a check script

Backlog: `BL-260909-give-packages-control-plane` (criteria 1, 2, 4).

**Files:**

- Modify: `packages/control-plane/package.json` (add `check` copying the other
  packages' `oxlint . && oxlint --type-aware ... && oxfmt --check .` pattern)
- Modify: `AGENTS.md` (both passages naming the gap: the `pnpm check`
  description ~40 and the control-plane paragraphs ~113-136)
- Modify: `tools/smoke/verification/lint-enrollment.test.mjs` (assert
  explicitly that `packages/control-plane/package.json` defines `scripts.lint`,
  and that `pnpm exec turbo run lint --dry-run=json` lists
  `@open-agent-toolkit/control-plane#lint` as a real task rather than
  `<NONEXISTENT>`; a universal "every package with a lint script" check alone
  passes vacuously when the script is deleted)

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
- Modify: `apps/oat-docs/docs/` backlog command docs and
  `.oat/repo/pjm/AGENTS.md` (Backlog Lifecycle: note the rewrite)

**Step 1: Write tests (RED)**

A fixture repository whose external plan, decision record, and another backlog
item link to `pjm/backlog/items/<id>.md` (relative paths from their own
locations); after archive, each link points at `pjm/backlog/archived/<id>.md`
with a correct relative path, and the command output lists the rewritten
files. Include a repository-root path reference in external-plan frontmatter
(`oat_external_plan_sources: - .oat/repo/pjm/backlog/items/<id>.md`) and either
rewrite it or state in the commit body why it is reported instead. Links inside
the archived item itself and in `completed.md` stay correct.

**Step 2: Implement (GREEN)**

Scan tracked Markdown under `.oat/repo/**` for links resolving to the moved
item and rewrite them in place; report each rewritten path. If a reference
cannot be rewritten safely (for example a non-link mention), list it as a
warning instead of editing it.

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
every remaining match must be a non-link mention that the archive command
reported as a warning, and each is listed in `implementation.md` (no file-class
exemptions). Then run the executable bidirectional-link check,
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

## PR Requirements

GitHub generates this repository's release notes from the PR title and body
(`.github/workflows/release.yml`), so the PR must carry the shim behavior
change prominently:

- Title uses a Conventional Commit breaking marker, for example
  `feat!: wave 2 backlog fixes and opt-in CLAUDE.md shims (lockstep 0.3.9)`.
- The body opens with a **Behavior change** callout: `oat instructions sync` no
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

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

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

- Phase 1: 6 tasks - AGENTS.md guidance
- Phase 2: 6 tasks - CLAUDE.md shims
- Phase 3: 3 tasks - Lifecycle skill routing and bookkeeping
- Phase 4: 2 tasks - Agent roles and recon validation
- Phase 5: 6 tasks - CI and backlog tooling, release fan-in

**Total: 23 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`
- Backlog items: `.oat/repo/pjm/backlog/items/` (IDs listed per task)
- Decisions: `.oat/repo/reference/decisions/DR-260927-claude-md-shims-are-opt.md`
- External: `anthropics/claude-code` `mods/agents-md/README.md` at v2.1.278
