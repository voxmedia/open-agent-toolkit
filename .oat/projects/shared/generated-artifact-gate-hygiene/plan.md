---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: ['p01'] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p02', 'p03', 'p04']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: generated-artifact-gate-hygiene

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Stop OAT's own generated artifacts from tripping OAT's own clean-state gates, by fixing write timing and commit ownership rather than relaxing any clean-worktree check.

**Architecture:** One new project-scoped CLI primitive (`oat project preflight`) classifies working-tree dirt as sync-owned or not and reports the resulting preflight decision; the three project-start workflows consume that decision through a byte-identical shared decision core. Separately, every writer that appends to `project-log.md` — the implementation workflow, the gate CLI, and the delegated review workflow — gains an explicit commit owner, and no writer appends while a dispatched child owns the repository head.

**Tech Stack:** TypeScript ESM CLI (`@open-agent-toolkit/cli`), Commander, Vitest, canonical agent assets under `.agents/`.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add sync-ownership classifier`

**Formatting:** The repository's documented write/fix command is `pnpm format:fix` (oxfmt). Every task that writes a formatter-eligible file uses the file-scoped form `pnpm exec oxfmt --write <paths>` as an explicit Format step before verification. Check-only `pnpm format` belongs under verification, never as the write step. `.oxfmtrc.jsonc:18-25` ignores `packages/cli/assets/**`, so files under that path are not formatter-eligible; their formatting is owned by the generator that writes them, and tasks touching them must say so explicitly rather than silently skipping the step.

**Test-task ordering note:** `p02-t02`, `p03-t03`, `p03-t04`, and `p05-t01` are follow-on regression tests declared after the behavior they pin, so they are expected to pass in task order. A task cannot end RED, because per-task verification must pass before its commit. To prove each test genuinely binds, temporarily revert the corresponding change, observe the failure, restore it, and note the observation in the task record.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`p02`, `p03`, and `p04` are declared as one parallel group.

**Write sets are disjoint.**

- `p02` touches the three project-start skills and one new contract test file.
- `p03` touches `.agents/skills/oat-project-implement/` (entry plus two reference files), the existing `post-implement-sequence-contracts.test.ts`, the existing `review-skill-contracts.test.ts`, and one new behavioral test file.
- `p04` touches `packages/cli/src/commands/gate/index.ts` and its test, plus `.agents/skills/oat-project-review-provide/SKILL.md`.

No file appears in more than one set.

**Dependencies are satisfied.** None of the three depends on another's commits. Each verifies only against files it owns.

**Deliberately excluded from the group.**

- `p05` asserts a cross-workflow inventory spanning `p03`'s and `p04`'s changes. It cannot run inside either worktree, because a parallel phase cannot see its sibling's commits — the group members all branch from the same post-`p01` base. It must run after fan-in.
- `p06` performs the lockstep version bump and regenerates shared version artifacts, which every prior phase feeds into.

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Other task-body shapes, including non-TDD shapes, are allowed when appropriate, provided the plan preserves stable `pNN-tNN` IDs, per-task verification, and atomic commits.

## Phase 1: Sync-Ownership Preflight Primitive

Introduces `oat project preflight`, which answers one question for the project-start workflows: is the working tree clean, safely auto-committable sync output, or something a human must look at?

### Task p01-t01: Add the sync-ownership classifier

**Files:**

- Create: `packages/cli/src/commands/project/preflight/classify.ts`
- Create: `packages/cli/src/commands/project/preflight/classify.test.ts`

**Step 1: Write test (RED)**

Cover the classification contract as a pure function over parsed porcelain records plus a single explicit ownership-evidence input. That input is one structure carrying working-manifest entries, baseline-manifest entries, current extension paths, and validated baseline extension paths, so no ownership source is left implicit at the call boundary.

_Baseline decisions:_

- empty working tree yields `clean` with both path lists empty;
- a dirty `.oat/sync/manifest.json` alone yields `auto-commit`;
- a dirty path listed as an `entries[].providerPath` in the working manifest yields `auto-commit`;
- a mixed tree of one sync-owned and one unrelated path yields `prompt`, with each path in the correct list;
- a path absent from all ownership evidence classifies as other, so unmanaged provider entries never auto-commit;
- an unparseable or missing **working** manifest forces `prompt` for any dirty tree, never `auto-commit`;
- returned path lists are deduplicated and stably ordered.

_Unmerged states are never auto-committable._ Ownership alone must not decide the outcome. Preserve each porcelain record's XY status and force every unmerged code — `DD`, `AU`, `UD`, `UA`, `DU`, `AA`, `UU` — to `other`/`prompt` **before** ownership is consulted. Without this, a conflicted managed path would be staged as a conflict resolution and committed with no human review. Add a case for each code on both the manifest path and a provider path, asserting `auto-commit` is unreachable.

_Baseline evidence is path-specific._ A first sync has no committed baseline, so a blanket "missing baseline forces prompt" rule would defeat the untracked-provider-view case this project promises. Require baseline evidence only for claims that need history:

- an untracked path proved by the working manifest yields `auto-commit` even with **no** baseline manifest at all;
- a deleted path present in the baseline manifest but absent from the working manifest classifies as sync-owned, because sync removal deletes the provider path and drops its entry in one operation (`packages/cli/src/engine/execute-plan.ts:170-173`);
- the same for a `detach` operation, which drops the entry without deleting the file;
- a deletion with no ownership evidence classifies as other, since the claim cannot be proved;
- a malformed or unreadable baseline blocks removal claims only, leaving non-removal classification intact;
- renamed entries classify on both source and destination, and count as sync-owned only when both are owned.

_Ownership spans every sync writer._ Exact `entries[].providerPath` matching under-reports what sync actually writes. Include:

- managed paths contributed by Cursor and Codex materialization-extension writes (`packages/cli/src/commands/sync/index.ts:281-304`, `packages/cli/src/commands/sync/apply.ts:117-142`);
- path-segment-safe descendants of **directory-valued copy** entries only, since copy fallback writes child files below a directory path (`packages/cli/src/fs/io.ts:38-60`);
- exact matching retained for file and symlink entries.

Add prefix-collision coverage: a sibling path sharing a textual prefix with an owned directory (for example `.claude/skills-extra` against owned `.claude/skills`) must classify as other. Segment-safe means comparing path segments, never raw string prefixes.

_Extension-owned deletions are proved from committed content._ Extension role files such as `.cursor/agents/<role>.md` and `.codex/agents/<role>.md` never appear in the sync manifest, and the recomputed extension plan cannot see a deleted one, because both providers discover stale roles by scanning files that still exist (`packages/cli/src/providers/cursor/codec/sync-extension.ts:410-441`, `packages/cli/src/providers/codex/codec/sync-extension.ts:575-613`). The evidence is nonetheless recoverable: ownership is recorded as a marker inside each generated file's own content, which the committed blob still holds. Treat a validated baseline extension path as one whose `HEAD` blob satisfies the provider's existing managed-role predicate. Test:

- a deleted `.cursor/agents/<role>.md` whose committed content carries the OAT-managed marker classifies as sync-owned;
- the Codex equivalent behaves the same;
- a deleted role file whose committed content lacks the marker classifies as other, so hand-written provider files are never auto-committed;
- a deleted path whose committed blob is unreadable classifies as other rather than assuming ownership.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/preflight/classify.test.ts
```

Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Export a `PreflightDecision` union of `clean | auto-commit | prompt`, a `PreflightClassification` result carrying `decision`, `syncOwned`, `other`, and the recommended `commitMessage`, and a pure `classifyWorkingTree(records, evidence)` function. Evaluate in order: unmerged guard, then ownership. Any input the function cannot vouch for resolves to `other`; an unusable working manifest forces `prompt`.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/preflight/classify.test.ts
```

Expected: Tests pass (GREEN)

**Step 3: Refactor**

Keep the module free of filesystem and child-process access so it stays trivially testable; gathering evidence belongs to the command layer in `p01-t02`.

**Step 4: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/preflight/classify.ts packages/cli/src/commands/project/preflight/classify.test.ts
```

**Step 5: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/preflight/classify.test.ts && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 6: Commit**

```bash
git add packages/cli/src/commands/project/preflight/classify.ts packages/cli/src/commands/project/preflight/classify.test.ts
git commit -m "feat(p01-t01): add sync-ownership classifier for project preflight"
```

---

### Task p01-t02: Wire up the `oat project preflight` command

**Files:**

- Create: `packages/cli/src/commands/project/preflight/index.ts`
- Create: `packages/cli/src/commands/project/preflight/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

Registering the command changes the `project --help` inline snapshot in `help-snapshots.test.ts`, so that file is part of this task's boundary. Note that it sits one directory above the command tree and is therefore not covered by a `src/commands/project` scoped run.

**Step 1: Write test (RED)**

Drive the command through injected dependencies, following the existing dependency-override pattern used by sibling project commands:

- `--json` emits exactly one document containing `decision`, `syncOwned`, `other`, and `commitMessage`;
- human-readable output states the decision and lists the paths;
- porcelain status is read with `-z` and the parser preserves XY status codes;
- **rename records are parsed correctly.** A porcelain rename or copy record carries two NUL-delimited path fields, so a parser can satisfy every other case while dropping or swapping an endpoint, leaving the classifier's rename rule unreachable from real git output. Use a raw `--porcelain -z` rename fixture including spaces and non-ASCII characters, and assert both source and destination reach the classifier in the correct roles;
- the command assembles the full ownership-evidence structure: working manifest, baseline manifest from `HEAD`, current extension paths, and baseline extension paths resolved by reading each deleted candidate's `HEAD` blob and applying the provider's managed-role predicate;
- an absent baseline manifest is passed through as absent rather than treated as an error;
- a git invocation failure exits with the CLI's system/runtime code rather than throwing;
- the command is registered on the `project` command and appears in its help output.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/preflight/index.test.ts
```

Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Resolve the repo root, read `git status --porcelain -z` preserving status codes and both rename endpoints, load the working `.oat/sync/manifest.json` and the baseline copy via `git show HEAD:.oat/sync/manifest.json`, gather current extension-managed paths, and resolve baseline extension ownership by reading `git show HEAD:<path>` for deleted candidates and applying the existing managed-role predicates. Pass one evidence structure to `classifyWorkingTree` and render the result.

Mirror the narrow non-throwing `execFileSync` helper already used by `packages/cli/src/commands/project/new/scaffold.ts`, capturing stderr rather than inheriting it. Route all output through the CLI logger. This command reports; it never mutates the working tree or creates commits — the calling workflow owns the commit.

Register it in `createProjectCommand` and update the `project --help` inline snapshot.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/preflight/index.test.ts
```

Expected: Tests pass (GREEN)

**Step 3: Refactor**

Confirm imports follow the package convention: `./...` for same-directory modules and configured aliases for anything else. Reuse the providers' exported managed-role predicates rather than reimplementing the marker check.

**Step 4: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/preflight/index.ts packages/cli/src/commands/project/preflight/index.test.ts packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts
```

**Step 5: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/help-snapshots.test.ts && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 6: Commit**

```bash
git add packages/cli/src/commands/project/preflight/index.ts packages/cli/src/commands/project/preflight/index.test.ts packages/cli/src/commands/project/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): add oat project preflight command"
```

---

### Task p01-t03: Document the new command

**Files:**

- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/index.md` (generated)

**Step 1: Write documentation**

Add an `oat project preflight` entry to the CLI reference describing the three decisions, the JSON shape, and the rule that only paths OAT can prove it owns are eligible for auto-commit. Cover how deletions are proved — manifest history for declared entries, committed marker content for extension role files — and state that unmerged paths are never auto-committable. Note that the command is read-only.

**Step 2: Regenerate the index**

```bash
pnpm run cli -- docs generate-index
```

Do not hand-edit `apps/oat-docs/index.md`.

**Step 3: Format**

Both outputs are formatter-eligible, including the generated index:

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/index.md
```

**Step 4: Verify**

```bash
pnpm format && pnpm build:docs
```

Expected: Formatting clean and the docs site builds with the new reference entry. Help snapshots were already updated in `p01-t02`, so this task touches documentation only.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/index.md
git commit -m "docs(p01-t03): document oat project preflight"
```

---

## Phase 2: Project-Start Preflight Contract

Replaces the Step 0 preflights so sync-only dirt resolves without a prompt.

**Parity model.** The three Step 0 bodies are _not_ byte-identical today: only `oat-project-quick-start` carries an autonomy branch, and it records gate `QS-01`, while the autonomy contract maps the other two workflows to their own gate identifiers. Forcing whole-block parity would copy the wrong gate ID into the other skills. This phase therefore defines a **byte-identical shared decision core** — the classification call, the three branches, and their instructions — and keeps workflow-specific autonomy provenance deliberately outside that core. Parity is asserted on the core only.

### Task p02-t01: Rewrite Step 0 around a shared decision core

**Files:**

- Modify: `.agents/skills/oat-project-new/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1: Define the shared decision core**

In each skill, delimit the shared core with stable HTML-comment markers so it can be extracted mechanically, and make the enclosed text byte-identical across all three. The core runs `oat project preflight --json` and branches on the reported decision:

- `clean` — continue silently.
- `auto-commit` — stage exactly the reported sync-owned paths, commit them with the reported message, report the commit in one line, and continue without prompting. Do not ask the user; this output is regenerated deterministically and carries no user intent.
- `prompt` — present the dirty list and offer the existing three choices (commit now, proceed anyway, abort) through `AskUserQuestion`.

Preserve the existing note that tool availability is not the same as interactivity. Scope "Do not advance past this gate without an explicit choice" to the `prompt` branch only, since `clean` and `auto-commit` are no longer choices.

**Step 2: Keep autonomy provenance outside the core**

Leave each skill's autonomous branch outside the delimited core, retaining its own mapped gate identifier. `oat-project-quick-start` keeps `QS-01` verbatim. Do not introduce an autonomy branch into `oat-project-new` or `oat-project-import-plan` where none exists today; adding one is out of scope for this project.

**Step 3: Bump skill versions**

Increment the frontmatter `version:` of each of the three skills, as required for any canonical skill change.

**Step 4: Format**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-new/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md
```

**Step 5: Verify**

```bash
core() { sed -n '/<!-- OAT PREFLIGHT-CORE -->/,/<!-- END OAT PREFLIGHT-CORE -->/p' "$1"; }
core .agents/skills/oat-project-new/SKILL.md > /tmp/pf-new.txt
core .agents/skills/oat-project-quick-start/SKILL.md > /tmp/pf-quick.txt
core .agents/skills/oat-project-import-plan/SKILL.md > /tmp/pf-import.txt
test -s /tmp/pf-new.txt && diff /tmp/pf-new.txt /tmp/pf-quick.txt && diff /tmp/pf-new.txt /tmp/pf-import.txt && echo "preflight cores identical"
grep -c "QS-01" .agents/skills/oat-project-quick-start/SKILL.md
! grep -q "QS-01" .agents/skills/oat-project-new/SKILL.md && ! grep -q "QS-01" .agents/skills/oat-project-import-plan/SKILL.md && echo "no gate-ID bleed"
```

Expected: `preflight cores identical`, a non-zero `QS-01` count in quick-start only, and `no gate-ID bleed`. The `test -s` guard matters — if the markers are missing the extracts are all empty and would otherwise compare equal.

**Step 6: Commit**

```bash
git add .agents/skills/oat-project-new/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md
git commit -m "feat(p02-t01): auto-resolve sync-only dirt via shared preflight core"
```

---

### Task p02-t02: Add the preflight core parity contract test

Follow-on regression test; expected to pass in task order. Confirm it binds by temporarily reverting `p02-t01`'s prose and observing failure.

**Files:**

- Create: `packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts`

**Step 1: Write the test**

Following the prose-assertion pattern already established in `post-implement-sequence-contracts.test.ts`:

- extract the delimited core from all three project-start skills, assert each extract is non-empty, and assert the three are identical;
- assert each core contains the instruction to run `oat project preflight --json`;
- assert each core describes the `auto-commit` branch as staging only the reported sync-owned paths and continuing without prompting;
- assert each core retains the three-choice `prompt` branch;
- assert no core instructs a repository-wide `git add`;
- assert `QS-01` appears in `oat-project-quick-start`, appears outside the shared core, and appears in neither of the other two skills. This is the regression guard against a future parity rewrite bleeding one workflow's gate identifier into another.

**Step 2: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts
```

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts
git commit -m "test(p02-t02): pin project-start preflight core parity contract"
```

---

## Phase 3: Implementation Workflow Log Timing and Ownership

Fixes the originally reported bug inside `oat-project-implement`: no project-log write while a child owns the head, and every append path in this workflow has a commit owner. Gate and delegated-review writers are handled in `p04`.

### Task p03-t01: Move every log append out of child-owned windows

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

`review-skill-contracts.test.ts:302-320` currently asserts `/accepted subagent dispatch[\s\S]*?oat project log append/i` against the append-points section — precisely the instruction this task removes. It is declared here so the task stays self-consistent rather than leaving a failing test for a later task to discover.

**Step 1: Defer the dispatch-acceptance append**

In `## Project Log Append Points`, replace the bullet requiring an append after every accepted subagent dispatch. The replacement must state the governing invariant plainly: never append to the project log while a dispatched child owns the worktree, because the append dirties the tree that the child's preflight and per-task commit checks require to be clean.

Record accepted-dispatch details in the generic dispatch record at acceptance as today, then write the corresponding project-log entry after the child's report returns, batched with the existing phase-outcome entry. The deferred entry must carry the same information the acceptance-time entry carried, including the run anchor reference.

**Step 2: Defer review-orchestration appends too**

The premise that the remaining append points are safe because each fires after a child returns does not hold for review orchestration. In the actual phase flow, an attempted-reconnaissance reviewer returns, the root appends a project-log entry, and only then blocking findings resume or freshly dispatch the phase implementer in fix mode (`references/phase-execution.md:146-187`). Because the successful-path commit does not happen until the phase boundary, the fix child inherits exactly the dirty worktree that caused the original bug.

Defer review-orchestration log entries until the bounded fix and re-review loop reaches a terminal phase outcome, then batch them into the owned phase bookkeeping. Audit the remaining append points against the same rule and state it once as an invariant rather than per call site.

**Step 3: Update the existing contract assertions**

Rewrite the `review-skill-contracts.test.ts` append-point assertions to require deferred post-report logging, while still requiring the generic acceptance record and the `$PROJECT_PATH/implementation.md#<run-anchor>` evidence. Do not simply delete the assertions; they should now pin the new contract.

**Step 4: Bump the skill version**

Increment the frontmatter `version:`.

**Step 5: Format**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
```

**Step 6: Verify**

```bash
! grep -q "After every accepted subagent dispatch" .agents/skills/oat-project-implement/SKILL.md && echo "acceptance-time append removed"
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Expected: `acceptance-time append removed` and a passing contract test. The grep negation matters — a bare `grep` for an absent string exits nonzero and would read as a failed verification.

**Step 7: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p03-t01): move project-log appends out of child-owned windows"
```

---

### Task p03-t02: Give every implementation append path a commit owner

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`

**Step 1: Add the log to the successful-path staging blocks**

Three bookkeeping commit blocks currently stage exactly three tracking artifacts: the Step 7 phase-boundary commit in `phase-execution.md`, and the closeout-preparation and mark-complete commits in `completion-and-closeout.md`. Add the project log to each, staged only when it exists, so a project with logging disabled is unaffected.

Update the surrounding prose accordingly: the "commit the three tracking artifacts" and "Only commit the three project artifacts listed above" sentences must now name the project log as a conditional fourth path. Preserve every existing prohibition on `git add -A` and glob pathspecs, and preserve the note that the generated repo dashboard is gitignored and must not be staged.

**Step 2: Cover the terminal paths**

Adding the log to the success path alone is insufficient. The workflow also appends before every STOP or park return, and validation failure, invalid-run abort, retry exhaustion, and gate failure can all bypass the Step 7 boundary entirely — leaving the tracked log dirty and failing the next resume-time clean check. That is the same defect in a different place.

Require a scoped bookkeeping commit at every terminal append path, taken only once no dispatched child owns the head. State this as a single invariant rather than enumerating call sites: any workflow step that appends to the project log owns committing it before returning, parking, or stopping.

**Step 3: Format**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md
```

**Step 4: Verify**

```bash
grep -c "project-log.md" .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md
grep -rn "git add -A" .agents/skills/oat-project-implement/references/
```

Expected: The log now appears in all three staging blocks and in the terminal-path invariant. The second command is a read-and-judge step, not a pass/fail gate: confirm by inspection that every `git add -A` occurrence is still phrased as a prohibition rather than an instruction. The machine-checkable form lives in the `p03-t03` contract test.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md
git commit -m "fix(p03-t02): give every implementation log-append path a commit owner"
```

---

### Task p03-t03: Add the log-timing contract test

Follow-on regression test; expected to pass in task order. Confirm it binds by temporarily reverting `p03-t01` and `p03-t02` prose and observing failure.

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Write the test**

Using the existing `readImplementSkill` helper, which already concatenates the skill entry with all four reference files:

- assert the concatenated contract no longer instructs an append after accepted dispatch;
- assert it states the invariant that no project-log write occurs while a dispatched child owns the worktree;
- assert review-orchestration entries are deferred to a terminal phase outcome rather than written between a reviewer's return and a fix dispatch;
- assert the dispatch record is still written at acceptance, so deferring the log entry did not drop the evidence;
- assert the phase-boundary bookkeeping block stages the project log conditionally;
- assert both closeout bookkeeping blocks stage it too;
- assert the terminal-path invariant is present, so STOP, park, abort, and retry-exhaustion returns commit the log;
- assert the phase implementer's clean-worktree requirement is still unconditional, pinning the decision that no clean check was weakened.

**Step 2: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
```

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "test(p03-t03): pin project-log write-timing and staging contract"
```

---

### Task p03-t04: Add the behavioral staging regression test

Follow-on regression test; expected to pass in task order. Confirm it binds by temporarily reverting `p03-t02` staging and observing failure.

**Files:**

- Create: `packages/cli/src/commands/init/tools/shared/project-log-staging-behavior.test.ts`

`p03-t03` proves the contract text changed. This task proves the documented sequence actually leaves a clean tree, which is the property the phase implementer's preflight depends on and the property that was violated in the reported bug.

**Step 1: Write the test**

The test must execute the contract rather than restate it. Extract the bookkeeping staging command from the Step 7 block in `phase-execution.md` and run that extracted command, so the test fails if the documented path list and the behavior ever diverge. Do not hardcode a copy of the path list; that would let the prose drift silently. Follow the temp-repo pattern already used by `post-implement-sequence-contracts.test.ts`, which creates real git repositories with `mkdtempSync` and `execFileSync`.

Scenarios:

- initialize a temp repo with a project directory containing `state.md`, `plan.md`, `implementation.md`, and `project-log.md`, and commit that baseline;
- append an entry to `project-log.md`, mirroring what `oat project log append` writes, and assert the tree is now dirty — this pins the bug's precondition;
- run the staging and commit sequence extracted from the skill, then assert `git status --porcelain` is empty, so the next phase's clean-worktree check would pass;
- assert the inverse: staging only the three original tracking artifacts leaves the tree dirty. This is the actual regression guard — it fails if anyone removes the project log from the documented staging set;
- assert a project with no `project-log.md` still commits cleanly, covering the logging-disabled case;
- add a STOP/park-and-resume scenario: append a log entry on a terminal path that bypasses the phase boundary, apply the terminal-path commit owner, and assert the tree is clean at the point a resumed run would perform its preflight check;
- add a review-orchestration scenario: attempted reviewer reconnaissance returns, blocking findings are raised, and a fix child is dispatched. Assert the tree is clean at the moment the fix child starts, which is the boundary the current contract violates.

**Step 2: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/project-log-staging-behavior.test.ts
```

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/project-log-staging-behavior.test.ts
git commit -m "test(p03-t04): prove documented bookkeeping staging leaves a clean tree"
```

---

## Phase 4: Log Commit Ownership for Gate and Review Writers

`oat-project-implement` is not the only writer. `oat gate review` appends a structural entry from CLI code and returns without committing it (`packages/cli/src/commands/gate/index.ts`, `finalizeReviewGateProjectLog`), and `oat-project-review-provide` appends in its Step 8 attempted-reconnaissance branch while its Step 9.5 bookkeeping commit scope covers only the review artifact and `plan.md`. Both leave a tracked file dirty for the next clean-state gate.

This is not hypothetical. During this project's own planning, four consecutive gate runs each left `project-log.md` uncommitted, and one reviewer reported that dirt as a finding while excluding it from its own commit.

### Task p04-t01: Commit the gate's own project-log append

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Extend the existing gate command tests:

- after a review gate appends its structural entry, the gate creates a commit containing exactly `project-log.md` and nothing else;
- the commit is scoped to the same repo root the append used, so worktree-hosted runs commit on the correct branch;
- when the append no-ops because project logging is disabled, no commit is attempted;
- when the log file is already clean, no empty commit is created;
- a git failure during the commit degrades to the existing warning path and leaves the gate result unchanged, matching how the append failure is already handled;
- the commit happens after the reviewer child has exited, so it never dirties a child-owned window.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

In `finalizeReviewGateProjectLog`, follow a successful append with a scoped commit of the project-log path only. Reuse the narrow non-throwing `execFileSync` pattern from `packages/cli/src/commands/project/new/scaffold.ts`, which already classifies skip reasons distinctly from genuine git failures and captures stderr instead of inheriting it. Never stage anything but the log path, and never use `git add -A`. Preserve the existing behavior that log-bookkeeping problems warn rather than change the gate's exit status.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

Expected: Tests pass (GREEN)

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "fix(p04-t01): commit the gate's own project-log append"
```

---

### Task p04-t02: Include the project log in review bookkeeping

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Extend the Step 9.5 commit scope**

Step 8's attempted-reconnaissance branch appends a structural entry before Step 9.5 commits. Add `project-log.md` to the Step 9.5 commit scope, conditional on Step 8 having appended, so the writer owns the commit. Keep the existing scope rules intact: the review artifact is always included, `plan.md` is included when Step 9 updated the Reviews table, new artifacts are never written into `reviews/archived/`, and unrelated implementation files stay out.

State the conditionality precisely. The `not-attempted` branch must not append and therefore must not stage the log, and the `INLINE_ONLY=true` path still skips the step entirely. Preserve the worktree-scoped `git -C "$WORKTREE_PATH"` handling so the commit lands on the worktree branch.

**Step 2: Bump the skill version**

Increment the frontmatter `version:`.

**Step 3: Format**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-review-provide/SKILL.md
```

**Step 4: Verify**

```bash
grep -n "project-log.md" .agents/skills/oat-project-review-provide/SKILL.md
```

Expected: The log appears in the Step 9.5 commit scope, guarded by the attempted branch. The machine-checkable form lives in `p05-t01`.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "fix(p04-t02): include project log in review bookkeeping commit"
```

---

## Phase 5: Cross-Workflow Append-Site Inventory

This phase exists separately because its single test spans changes made in both `p03` and `p04`. A parallel group member cannot see its siblings' commits — all three branch from the same post-`p01` base — so this assertion is only satisfiable after fan-in.

### Task p05-t01: Pin the full append-site inventory

Follow-on regression test; expected to pass in task order. Confirm it binds by temporarily reverting `p03-t02` and `p04-t01` and observing failure.

**Files:**

- Create: `packages/cli/src/commands/init/tools/shared/project-log-append-owners.test.ts`

The point of this test is to stop the inventory from silently growing a new ownerless writer.

**Step 1: Write the test**

Enumerate every semantic call site that appends to the project log — CLI callers of the append helper and canonical skill prose invoking `oat project log append` — by scanning source and canonical assets rather than hardcoding a list. Define the extraction boundary explicitly: exclude the append command's own implementation, its help text, and documentation or reference mentions, while still failing on a newly introduced workflow call site.

Assert the enumerated set exactly matches an allowlist naming **all four** current canonical writers, then assert each has a declared commit owner:

- `oat-project-implement` — the staging blocks and terminal-path invariant from `p03-t02`;
- `oat-project-review-provide` — the conditional Step 9.5 inclusion from `p04-t02`;
- `oat-project-summary` (`SKILL.md:151-159`) — its existing commit owner;
- `oat-project-complete` (`SKILL.md:335-349`) — its existing commit owner;

plus the `oat gate review` CLI writer and its scoped commit from `p04-t01`.

The last two skills already have owners today; they are named so the allowlist is genuinely complete rather than narrowed until inconvenient writers disappear. Also assert no writer stages the log with `git add -A` or a glob pathspec.

**Step 2: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/project-log-append-owners.test.ts
```

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared && pnpm lint && pnpm type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/project-log-append-owners.test.ts
git commit -m "test(p05-t01): pin project-log append-site ownership inventory"
```

---

## Phase 6: Release Mechanics and Generated Version Artifacts

Ordering matters in this phase. The version bump must land before any bundle or sync regeneration, because both stamp the current CLI version into tracked generated files. Regenerating first would write a stale `oatVersion` into `.oat/sync/manifest.json` and leave the next no-op sync producing a diff — recreating exactly the generated-dirt failure this project exists to eliminate.

### Task p06-t01: Lockstep public package version bump

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Bump**

This project changes bundled assets under `.agents/skills` and ships a new CLI command, so repo release policy requires all five public packages to move together. Bump them to the same new version.

Confirm the per-skill frontmatter bumps from `p02-t01`, `p03-t01`, and `p04-t02` are present in the final branch diff — the requirement is one bump per changed skill in the PR diff, not per edit.

**Step 2: Format**

```bash
pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

**Step 3: Verify**

```bash
node -e "const v=require('./packages/cli/package.json').version;for(const p of ['control-plane','docs-config','docs-theme','docs-transforms']){const o=require('./packages/'+p+'/package.json').version;if(o!==v)throw new Error(p+' '+o+' != '+v);}console.log('lockstep ok',v)"
```

Expected: `lockstep ok <version>`

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p06-t01): lockstep public package version bump"
```

---

### Task p06-t02: Regenerate version artifacts and validate the release

**Files:**

- Modify: `.oat/sync/manifest.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: provider views under `.claude/` and `.cursor/` as regenerated

`packages/cli/assets/public-package-versions.json` is a tracked exception to the `packages/cli/assets/*` ignore rule and is regenerated from the bumped manifests, so it is declared here rather than left to appear as surprise dirt.

**Step 1: Capture the stray baseline**

Record the exact identity set, not a count — a count cannot detect one stray replacing another:

```bash
pnpm run cli -- status --scope project --json > /tmp/oat-status-before.json || true
node -e "const e=(require('/tmp/oat-status-before.json').entries||[]);const p=[...new Set(e.filter(x=>x.state?.status==='stray').map(x=>x.providerPath))].sort();require('fs').writeFileSync('/tmp/stray-before.json',JSON.stringify(p,null,2));console.log('stray baseline',p.length)"
```

Adjust the JSON accessor to the actual report shape if it differs; the requirement is a sorted set of `providerPath` values whose `state.status` is `stray`.

**Step 2: Regenerate after the bump**

```bash
pnpm run cli -- sync --scope all
pnpm build
```

Run `pnpm run cli` invocations serially. Concurrent invocations race in the shared `packages/cli/assets/` staging directory and fail the bundling step.

**Step 3: Format**

`.oat/sync/manifest.json` is formatter-eligible; format it explicitly:

```bash
pnpm exec oxfmt --write .oat/sync/manifest.json
```

`packages/cli/assets/public-package-versions.json` is **not** formatter-eligible — `.oxfmtrc.jsonc:18-25` ignores `packages/cli/assets/**`. Its formatting is owned by the generator that emits it, so the contract-compliant action is to leave it byte-for-byte as generated and record that here rather than running the formatter against an ignored path. Regenerated provider views under `.claude/` and `.cursor/` are symlinks to canonical assets already formatted by their owning tasks; do not format them separately.

**Step 4: Validate**

```bash
pnpm release:validate
pnpm lint && pnpm type-check && pnpm test
```

Expected: All pass. A publishable-package change is not done until `pnpm release:validate` does.

**Step 5: Commit**

```bash
git add .oat/sync/manifest.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p06-t02): regenerate version artifacts after lockstep bump"
```

**Step 6: Verify no generated dirt or stray drift remains**

```bash
pnpm run cli -- status --scope project --json > /tmp/oat-status-after.json || true
node -e "const f=p=>[...new Set((require(p).entries||[]).filter(x=>x.state?.status==='stray').map(x=>x.providerPath))].sort();const a=require('fs').readFileSync('/tmp/stray-before.json','utf8');const b=JSON.stringify(f('/tmp/oat-status-after.json'),null,2);if(a!==b)throw new Error('stray set changed');console.log('stray set unchanged')"
git status --porcelain
```

Expected: `stray set unchanged` and empty `git status`. This repo already reports stray, unmanaged provider entries; that is a pre-existing condition explicitly out of scope, and the assertion is set equality against the baseline rather than absence. Note that `oat status --scope project` exits nonzero whenever strays exist, so its exit status is captured separately from the equality assertion and never chained with `&&`.

Any residual diff means a generated artifact still lacks a commit owner, which is precisely the defect class this project closes.

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                             |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                    |
| p02    | code     | pending         | -          | -                                                    |
| p03    | code     | pending         | -          | -                                                    |
| p04    | code     | pending         | -          | -                                                    |
| p05    | code     | pending         | -          | -                                                    |
| p06    | code     | pending         | -          | -                                                    |
| final  | code     | pending         | -          | -                                                    |
| plan   | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T192500Z.md` |
| plan   | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T023301Z.md` |
| plan   | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T004055Z.md` |
| spec   | artifact | pending         | -          | -                                                    |
| design | artifact | pending         | -          | -                                                    |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing, requiring no unresolved Critical, Important, **or Medium** findings, plus final-scope deferred-finding disposition where applicable

`spec` and `design` are not produced in quick mode and are not required to pass before implementation.

### Plan artifact review disposition

**Review 1 (`...T004055Z`) — 0 Critical, 5 Important.** All applied in place: per-task Format steps; the false byte-identical parity premise replaced with a shared decision core (also correcting Key Decision 6 in `discovery.md`); baseline-manifest evidence for sync removals; terminal-path commit owners; and release ordering with the generated versions file declared.

**Review 2 (`...T023301Z`) — 0 Critical, 5 Important, 2 Medium, 1 Minor.** All applied in place: scope expanded to the gate CLI and `oat-project-review-provide` writers (adding Phase 4, confirmed with the user rather than assumed); ownership broadened to extension outputs and directory-copy descendants; baseline evidence made path-specific so first sync still auto-commits; an unmerged-status guard; complete Format coverage; a captured stray identity set; a corrected `passed` definition; and expected-green relabeling of follow-on tests.

**Review 3 (`...T192500Z`) — 0 Critical, 4 Important, 2 Medium.** All applied in place:

1. **Extension-owned deletions are now provable.** The reviewer concluded no evidence source survives deletion and recommended new durable persistence. That is not correct: both providers record ownership as a marker _inside each generated file's content_ and test it with `isOatManagedCursorRoleFile` / `isOatManagedCodexRoleFile`, so the committed blob at `HEAD` still carries the proof. The plan now reads that blob and applies the providers' existing predicates, closing the finding without a new mechanism or migration.
2. **`p05` split out of `p04`.** The inventory test asserted `p03`'s changes from inside a parallel sibling worktree, where those commits are not visible. It now runs after fan-in as its own phase; release mechanics moved to `p06`.
3. **Review-orchestration appends deferred.** A reviewer returning, the root appending, and a fix child then being dispatched reproduced the original bug in a path previously assumed safe. Appends now defer to a terminal phase outcome, with a behavioral scenario asserting a clean tree at fix-child start.
4. **`review-skill-contracts.test.ts` declared in `p03-t01`.** It asserts the exact instruction that task removes, so the phase could not have passed without an undeclared edit.
5. (Medium) A raw two-path `--porcelain -z` rename fixture, since a parser could otherwise drop an endpoint and make the rename rule unreachable.
6. (Medium) The append-site allowlist now names all four canonical writers, including `oat-project-summary` and `oat-project-complete`, with an explicit scan boundary.

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - `oat project preflight` sync-ownership primitive covering removals, extension outputs and deletions, first sync, renames, and unmerged states, plus documentation
- Phase 2: 2 tasks - project-start preflight auto-resolves sync-only dirt through a shared decision core, with a parity and gate-ID contract test
- Phase 3: 4 tasks - implementation-workflow appends moved out of every child-owned window and given commit owners, with contract and behavioral regression tests
- Phase 4: 2 tasks - commit ownership for the gate CLI and delegated-review log writers
- Phase 5: 1 task - post-fan-in cross-workflow append-site ownership inventory
- Phase 6: 2 tasks - lockstep version bump followed by version-artifact regeneration and release validation

**Total: 14 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Plan artifact reviews: `reviews/artifact-plan-review-2026-07-25T004055Z.md`, `reviews/artifact-plan-review-2026-07-25T023301Z.md`, `reviews/artifact-plan-review-2026-07-25T192500Z.md`
- Design: N/A (quick mode, straight to plan)
- Spec: N/A (quick mode)
