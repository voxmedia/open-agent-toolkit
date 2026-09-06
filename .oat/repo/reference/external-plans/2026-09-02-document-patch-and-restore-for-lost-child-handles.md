---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-document-patch-and-restore.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-document-patch-and-restore
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/234
created: '2026-09-02T23:59:00Z'
---

# Document patch-and-restore recovery for lost child handles with staged work

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Draft PR #190
> rewrites `phase-execution.md`, this plan's primary surface; see the
> landing-event table. Two scope questions are settled below: the recovered
> patch applies to both `recover` and same-target `implement` continuations,
> and the capture is fail-closed and executable (a skill script with tests),
> not a prose-only recipe.

## Outcome

When a native phase-implementer child's handle is lost while it holds
uncommitted work, `oat-project-implement` prescribes a fail-closed
capture-and-restore sequence instead of a dead stop: establish that the
former child is no longer writing and that the dirt belongs to the supported
class, capture every index, worktree, and untracked component binary-safely
into an immutable artifact with a recorded digest and size, prove the artifact
applies cleanly before touching the tree, restore only the affected paths to
the clean base, brief the fresh same-target continuation to apply, review, and
commit that artifact as its first action, and record the artifact reference in
the continuation event. Unsupported dirt (an active writer, an unreadable or
tampered artifact, a failed round trip) is a STOP, never a best-effort
restore. The continuation brief gains an optional `recovered_patch` field in
both the root and child contracts, the rule "a fresh child never starts on a
dirty tree" is stated once, a skill script performs the capture and
verification, and its tests plus a contract test prevent the behavior and the
clauses from regressing.

## Source and live evidence

- Source backlog item:
  [BL-260902-document-patch-and-restore — Document patch-and-restore recovery for lost child handles with staged work](../../pjm/backlog/items/BL-260902-document-patch-and-restore.md)
- Source issue: [#234](https://github.com/voxmedia/open-agent-toolkit/issues/234)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-project-implement/references/phase-execution.md:206-209`
    — the handle-unavailable branch authorizes only an unchanged fresh
    `mode: recover` launch; staged work is not mentioned.
  - `phase-execution.md:266-267` — "A dirty worktree or dirty history blocks
    continuation"; today dirt is a terminal stop.
  - `phase-execution.md:283-306` — the `mode: recover` continuation brief
    YAML (17 fields); no `recovered_patch`.
  - `.agents/agents/oat-phase-implementer.md:438-478` — the child-side
    `## Mode: Recover` mirror of that YAML; step 2 allows only the pending
    ledger reservation plus a bounded diff as pre-existing dirt.
  - `.agents/docs/autonomy-contract.md:295` — maps `phase-execution.md`
    lines `260-261 -> IMPLEMENT-10`; inserting prose above line 260 shifts
    it. The contract is a prompt-site inventory, so the change adds no gate
    row, only a line-mapping refresh.
  - `packages/cli/src/validation/autonomy-gate-inventory.test.ts:332-371` —
    requires the autonomy contract to be byte-identical across its four skill
    mirrors and current against HEAD.
  - `packages/cli/src/validation/skills.test.ts:3359` (`makes handle continuity
alternatives compatible with exact-target recovery`), `:3311` (`defines an
isolated fresh same-target recovery continuation mode`), `:3215` and the
    dirty-worktree chain inside it (re-anchored 2026-09-04; filter by test title)
    (dirty-worktree stop chain) — the regexes the new prose must keep
    satisfying.
  - `grep -rn "recovered_patch\|git diff --cached" packages/cli/src` → no
    hits; nothing guards the sequence today.
  - Why the naive recipe is unsafe (verified 2026-09-05 against git
    semantics, not against a fixture): `git diff --cached` alone omits
    unstaged hunks in the same paths, so `git restore` of those paths after
    saving only the staged diff discards them; without `--binary` a diff
    carries no binary payload, so a restored binary is truncated to a stub;
    untracked files are invisible to both diffs; and a former child that is
    still writing can change the tree between capture and restore. Issue #234's
    scenario (a child lost mid-task-list) does not guarantee any of those
    conditions is absent.
  - `.agents/skills/oat-project-complete/scripts/*.mjs` with tests under
    `oat-project-complete/tests/` and the root `test:skills` script
    (`node --test .agents/skills/*/tests/*.test.mjs`) are the precedent for a
    skill-owned executable with its own tests; `oat-project-implement/tests/`
    already exists.
- Constraining decisions: none govern handle-loss recovery; the DR-260831
  durability set governs archive, not dispatch.

## Dependencies

| Type             | Dependency                                                                                                                                    | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Current state                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                    | Both bump `oat-project-implement`; land in one wave group and coordinate the single `version:` bump.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pending (W2).                                                                                              |
| Soft integration | Any plan editing `.agents/docs/autonomy-contract.md` in the same wave                                                                         | Serialize inventory edits; the file has four byte-identical mirrors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | See W2/W3.                                                                                                 |
| Soft ordering    | W3 group 1 plan [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                                      | Runs after this plan; both edit `.agents/agents/oat-phase-implementer.md`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pending.                                                                                                   |
| Soft ordering    | W2 group 1 plan [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md)                       | Runs before this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Pending.                                                                                                   |
| Soft ordering    | W3 group 2 plan [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md) | Runs after this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Pending.                                                                                                   |
| Soft ordering    | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                    | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                    | Required update                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Minor    | `.agents/docs/autonomy-contract.md` (inventory rows, +2/−2) and `validation/skills.test.ts` (+62 lines, new case). | Rebase, re-run the inventory test, re-anchor `skills.test.ts` case line numbers; no prose change. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch.                              |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `oat-project-implement/SKILL.md`, `references/phase-execution.md`, `.agents/docs/autonomy-contract.md`.            | If #190 merges first: re-read the handle-loss branch and the recover YAML, re-anchor every line above, and re-run `skills.test.ts:3325/:3277` before editing. If this lands first: #190 rebases and re-runs the inventory test. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-project-implement .agents/agents/oat-phase-implementer.md .agents/docs/autonomy-contract.md packages/cli/src/validation/skills.test.ts packages/cli/src/validation/autonomy-gate-inventory.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts apps/oat-docs/docs/workflows/projects/implementation-execution.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If the handle-loss branch or the recover YAML moved or changed wording,
re-anchor before editing. Never hand-edit `packages/cli/assets/**`; those are
build-time copies.

## Repository conventions

- Skill validation: `pnpm oat:validate-skills` → passes.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/validation/skills.test.ts src/validation/autonomy-gate-inventory.test.ts`.
- Bump gates: `pnpm run check:skill-bumps`; five-package lockstep bump because
  `.agents/skills` and `.agents/agents` are shipped assets.
- Format: `pnpm format` covers `.agents/skills/**/*.md`; run it.
- Implementation pattern: `oat-project-next/SKILL.md:418-441` for load-and-follow
  wording; keep the `:255-262` terminal-stop list intact.

## Scope

### In scope

- `phase-execution.md:206-209` — the capture-and-restore sequence and its STOP
  boundaries; `:266-267` — qualify the dirty-tree stop for a verified, named
  artifact only; `:283-306` — `recovered_patch` field.
- `.agents/agents/oat-phase-implementer.md:438-478` — `recovered_patch` in the
  child YAML and a step-2 clause that a present, digest-verified
  `recovered_patch` is the one permitted pre-existing dirt, applied and
  committed first.
- New `oat-project-implement/scripts/capture-dirty-tree.mjs` — the executable
  capture/verify step the prose invokes — and
  `oat-project-implement/tests/capture-dirty-tree.test.mjs` exercising it in
  temporary git repositories.
- `oat-project-implement/SKILL.md` frontmatter `version:` bump (2.3.1 → next).
- `packages/cli/src/validation/skills.test.ts` — one new case.
- `.agents/docs/autonomy-contract.md` and its four mirrors — line-mapping
  refresh only.
- `apps/oat-docs/docs/workflows/projects/implementation-execution.md:141-143`
  — one mirror sentence.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `references/dispatch-and-dry-run.md` — owned by the truthfulness branch.
- `completion-and-closeout.md`, `plan-and-resume.md` — other lifecycle stages.
- Any new prompt site or gate row; this is guidance, not a decision point.
- `packages/cli/assets/**` — generated.

## Current state

The root contract (`phase-execution.md`) authorizes a fresh `mode: recover`
launch when the accepted handle is unavailable, and the child contract
(`oat-phase-implementer.md`) mirrors the brief. Both treat any dirt beyond the
pending reservation as a block. Issue #234's real scenario is a child lost
mid-task-list with staged work; `mode: recover` is defined as post-commit
defect repair, so this plan places the clean-base rule and `recovered_patch`
on the shared continuation-brief fields used by both `recover` and
same-target `implement` continuations, not only on the recover branch.

## Implementation steps

### 1. Write the capture script and its behavioral tests

Add `oat-project-implement/scripts/capture-dirty-tree.mjs` (Node, no
dependencies beyond `node:` modules and `git`). Given a worktree path and an
artifact directory outside the worktree, it:

- refuses unless writer quiescence is established: the caller passes the
  former child's process or handle identity and the script requires two
  `git status --porcelain=v2 -z` snapshots taken at least a short interval
  apart to be byte-identical, otherwise exits non-zero with
  `active-writer`;
- classifies the dirt: staged and unstaged hunks in tracked paths, binary
  changes, and untracked files (`git ls-files --others --exclude-standard -z`)
  are supported; submodule changes, in-progress merge/rebase/cherry-pick
  state (`.git/MERGE_HEAD`, `rebase-merge`, `rebase-apply`,
  `CHERRY_PICK_HEAD`), and changes outside the phase's `bounded_files` are
  unsupported and exit non-zero with `unsupported-dirt` before any capture;
- captures every component binary-safely: `git diff --cached --binary`
  (index), `git diff --binary` (worktree vs index), and byte copies of each
  untracked file under a mirrored path inside the artifact directory, then
  writes a `manifest.json` naming each component, the affected paths, the
  `HEAD` SHA, a SHA-256 digest and byte size of every artifact file, and the
  `git diff --cached --stat` summary;
- proves the round trip before anything is restored: in a temporary
  `git worktree` at the same `HEAD`, applies the index patch with
  `git apply --index`, the worktree patch with `git apply`, and copies the
  untracked files, then compares the resulting `git status --porcelain=v2 -z`
  and per-path content digests with the captured tree; any mismatch exits
  non-zero with `round-trip-failed` and leaves the original worktree untouched;
- on success prints the artifact directory, the manifest digest, and the
  affected-path list as JSON; the caller then runs the restore itself
  (`git restore --staged --` and `git restore --` on the affected tracked
  paths and deletion of the captured untracked files), never the script.

Add `oat-project-implement/tests/capture-dirty-tree.test.mjs` (run by
`pnpm test:skills`), creating temporary git repositories per case:

- positive: mixed staged and unstaged hunks in the same path, a binary file
  change, and an untracked file are captured, the round trip reproduces the
  exact tree, and the manifest digests match the artifact bytes;
- negative controls, each asserting the specific exit reason and that the
  original worktree bytes are unchanged: an unstaged same-path hunk is present
  in the artifact (the pre-fix `git diff --cached`-only recipe would drop it;
  assert the captured worktree patch contains it); a binary change restores
  byte-identically (a text-only diff would not); an untracked file is present
  in the artifact; a tampered artifact (one byte changed after capture) fails
  digest verification when re-verified with the script's `--verify` mode; an
  unreadable artifact file fails `--verify`; a background writer appending to
  a tracked file between the two snapshots yields `active-writer`; an
  in-progress merge yields `unsupported-dirt`.

**Verify:** `pnpm test:skills` → every new case passes; temporarily replace
`git diff --cached --binary` with `git diff --cached` in the script and
observe the binary case fail, then restore.

### 2. Add the sequence and the clean-base rule to the root contract

After `phase-execution.md:209`, add the ordered sequence: establish that the
former child cannot still be writing (handle terminated or its worktree
quiescent) → run the capture script and STOP on `active-writer`,
`unsupported-dirt`, or `round-trip-failed`, reporting the exit reason
verbatim → restore only the affected paths listed by the script → brief the
continuation with `recovered_patch` → the continuation applies the artifact
with the script's `--verify` mode first (digest and size check), then
`git apply --index` / `git apply` / untracked copy, reviews, and commits it as
its first action → record the artifact reference and manifest digest in the
continuation event (`cont-<project>-<phase>-fix-N`). State "a fresh child
never starts on a dirty tree". Qualify `:266-267` so a verified, named
artifact is not the blocking kind of dirt, while unverified or unsupported
dirt still blocks. Keep the `:255-262` terminal-stop list intact.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'recovery'` →
the handle-continuity, flake/recovery, and isolated-recovery cases still pass.

### 3. Add `recovered_patch` to both briefs

Add `recovered_patch: { artifact, manifest_digest, size, stat, components }`
(optional; `artifact` is a readable path outside the worktree, never a
mutable worktree path, and `components` lists the `index`, `worktree`, and
`untracked` entries present) to the YAML at `phase-execution.md:283-306` and
`oat-phase-implementer.md:445-465`, plus the child clause in step 2 that the
child runs `--verify` before applying and stops on any mismatch.

**Verify:** same command → `defines an isolated fresh same-target recovery
continuation mode` passes with the new field present.

### 4. Add the prose contract test

Copy the two-file loop from `makes handle continuity alternatives compatible
with exact-target recovery` (`:3359`) into
`prescribes verified capture-and-restore before a fresh child continues on a
dirty tree`, asserting the clean-base regex, the ordered chain (quiescence →
capture script → STOP reasons → restore → verify-then-apply → commit → event),
the three STOP reasons by name, and `recovered_patch` with `artifact` and
`manifest_digest` in both files. Revert step 2 to prove it fails.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'capture-and-restore'` → pass.

### 5. Refresh the inventory mapping (conditional)

Run the inventory test. This step only has work when the prose change adds,
removes, or rewords a prompt-site sentence (the inventory is keyed by content
hash, not line number; `autonomy-contract.md:295` sits in the historical
comparison table pinned to an old commit). If a hash moved, update the mapping
row; the four skill-tree mirrors are symlinks and need no copy. Wave 2 needed
no edit here.

**Verify:** `pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts` → 4 passed.

### 6. Bump and gate

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists
(`oat-project-implement` is pinned there); run the focused tests above, then
`pnpm check`, `pnpm type-check`, and `pnpm run check:skill-bumps` with
captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` because this plan changes `.agents/skills`. Do not
edit lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.

**Verify:** every named command exits zero with its own captured exit code.

## Test plan

- `oat-project-implement/tests/capture-dirty-tree.test.mjs`: the positive
  case and the seven negative controls above, each in a fresh temporary git
  repository; the tests are the behavioral evidence, the prose test is not.
- `skills.test.ts`: the new case above; existing `:3359`, `:3311`, `:3215`
  unchanged and green.
- `autonomy-gate-inventory.test.ts`: all four cases green.
- Regression proved: the sequence and `recovered_patch` cannot be dropped from
  either contract by a prose rewrite, and the script cannot silently regress to
  a text-only or index-only capture.

## Done criteria

- [ ] The capture script fails closed on an active writer, unsupported dirt,
      a failed round trip, and a tampered or unreadable artifact, and its
      behavioral tests prove mixed, binary, and untracked components survive.
- [ ] Both contracts carry the verified sequence, the clean-base rule, and
      `recovered_patch`; the terminal-stop list is intact.
- [ ] The new contract test fails on revert and passes on the change.
- [ ] Inventory mappings are current; four mirrors byte-identical.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- the prose cannot be added without relaxing the `:255-262` terminal-stop
  list or breaking the dirty-worktree chain pinned inside `skills.test.ts:3215`;
- a design needs a new prompt site (then an autonomy gate row is required and
  the scope changes);
- writer quiescence cannot be established by the script's snapshot rule for a
  provider's child (then the prose must keep the dead stop for that provider
  rather than weaken the rule);
- PR #190 merged first and the handle-loss branch no longer matches the
  cited shape; or
- a named verification gate fails twice after one bounded correction.

## Execution record (2026-09-06, wave 2)

Executed as wave-2 p05 (PR #267, CLI 0.2.57): `capture-dirty-tree.mjs` plus the `recovered_patch` contract; `oat-phase-implementer` 1.1.1 → 1.1.2 with three pins; `oat-project-implement` bump carried from p04 (one bump per skill per PR). Five review rounds plus two post-PR rounds: the reviewer's fresh-shell execution of the prose snippets caught a guard living in a different block than its invocations; Cursor Bugbot caught the recover-mode ordering (patch committed before the pending attempt was reconciled); the exit gate caught the artifact-free retry path. The plan's 'two byte-identical status snapshots' rule shipped as a superset (HEAD plus per-path content and exec-bit fingerprints, because porcelain v2 carries no worktree object id); staged renames are `unsupported-dirt`.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #234, and
the three contract tests when substantial time passes, main advances
materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 or the
truthfulness project lands, cited contracts change, another PR implements
part of the outcome, or a load-bearing claim cannot be reproduced. Apply the
landing-event table above.

## Review focus

- The exception is scoped to a verified, named artifact; generic, unsupported,
  or unverified dirt still blocks, and no STOP reason was turned into a
  best-effort path.
- The negative controls exercise git behavior in real temporary repositories,
  not prose presence.
- Root and child briefs stay field-for-field aligned.
- No `packages/cli/assets` file was edited by hand.
