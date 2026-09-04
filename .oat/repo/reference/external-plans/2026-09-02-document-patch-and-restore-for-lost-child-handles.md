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
> landing-event table. One scope question is settled below: the recovered
> patch applies to both `recover` and same-target `implement` continuations.

## Outcome

When a native phase-implementer child's handle is lost while it holds staged
but uncommitted work, `oat-project-implement` prescribes a five-step
patch-and-restore sequence instead of a dead stop: detect the dirty index,
save the staged diff as a patch outside the worktree, restore the affected
paths to a clean base, brief the fresh same-target continuation to apply,
review, and commit that patch as its first action, and record the patch path
and stat in the continuation event. The continuation brief gains an optional
`recovered_patch` field in both the root and child contracts, the rule "a
fresh child never starts on a dirty tree" is stated once, and a contract test
prevents the clauses from regressing.

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
- Constraining decisions: none govern handle-loss recovery; the DR-260831
  durability set governs archive, not dispatch.

## Dependencies

| Type             | Dependency                                                                                                                                    | Required state                                                                                                 | Current state |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                    | Both bump `oat-project-implement`; land in one wave group and coordinate the single `version:` bump.           | Pending (W2). |
| Soft integration | Any plan editing `.agents/docs/autonomy-contract.md` in the same wave                                                                         | Serialize inventory edits; the file has four byte-identical mirrors.                                           | See W2/W3.    |
| Soft ordering    | W3 group 1 plan [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                                      | Runs after this plan; both edit `.agents/agents/oat-phase-implementer.md`, so never in one parallel group.     | Pending.      |
| Soft ordering    | W2 group 1 plan [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md)                       | Runs before this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group. | Pending.      |
| Soft ordering    | W3 group 2 plan [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md) | Runs after this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group.  | Pending.      |

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

- `phase-execution.md:206-209` — the five-step sequence; `:266-267` — qualify
  the dirty-tree stop for a named, saved patch only; `:283-306` —
  `recovered_patch` field.
- `.agents/agents/oat-phase-implementer.md:438-478` — `recovered_patch` in the
  child YAML and a step-2 clause that a present `recovered_patch` is the one
  permitted pre-existing dirt, applied and committed first.
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

### 1. Add the sequence and the clean-base rule

After `phase-execution.md:209`, add: detect (`git status --porcelain`,
`git diff --cached --stat`) → save `git diff --cached` to a scratch patch
outside the worktree and record path and stat → `git restore --staged` and
`git restore` the affected paths only → brief the continuation to apply,
review, and commit the patch as its first action → record the patch in the
continuation event (`cont-<project>-<phase>-fix-N`). State "a fresh child
never starts on a dirty tree". Qualify `:266-267` so a saved, named patch is
not the blocking kind of dirt.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'recovery'` →
the handle-continuity, flake/recovery, and isolated-recovery cases still pass.

### 2. Add `recovered_patch` to both briefs

Add `recovered_patch: { path, stat }` (optional) to the YAML at
`phase-execution.md:283-306` and `oat-phase-implementer.md:445-465`, plus the
child clause in step 2.

**Verify:** same command → `defines an isolated fresh same-target recovery
continuation mode` passes with the new field present.

### 3. Add the contract test

Copy the two-file loop from `makes handle continuity alternatives compatible
with exact-target recovery` (`:3359`) into
`prescribes patch-and-restore before a fresh child continues on a dirty tree`
asserting the clean-base regex, the ordered five-step chain, and
`recovered_patch` in both files. Revert step 1 locally to prove it fails.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'patch-and-restore'` → pass.

### 4. Refresh the inventory mapping

Run the inventory test; if `autonomy-contract.md:295` line refs shifted,
update them and copy the file byte-identically to the four mirrors.

**Verify:** `pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts` → 4 passed.

### 5. Bump and gate

Bump `oat-project-implement` `version:` and the five packages; format.

**Verify:** `pnpm run check:skill-bumps`, `pnpm oat:validate-skills`,
`pnpm format`, then the eight AGENTS.md gates in order, exit codes captured.

## Test plan

- `skills.test.ts`: the new case above; existing `:3359`, `:3311`, `:3215`
  unchanged and green.
- `autonomy-gate-inventory.test.ts`: all four cases green.
- Regression proved: the sequence and `recovered_patch` cannot be dropped from
  either contract by a prose rewrite.

## Done criteria

- [ ] Both contracts carry the five-step sequence, the clean-base rule, and
      `recovered_patch`; the terminal-stop list is intact.
- [ ] The new contract test fails on revert and passes on the change.
- [ ] Inventory mappings are current; four mirrors byte-identical.
- [ ] Skill bump, lockstep bump, format, and all gates pass.
- [ ] `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- the prose cannot be added without relaxing the `:255-262` terminal-stop
  list or breaking the dirty-worktree chain pinned inside `skills.test.ts:3215`;
- a design needs a new prompt site (then an autonomy gate row is required and
  the scope changes);
- PR #190 merged first and the handle-loss branch no longer matches the
  cited shape; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #234, and
the three contract tests when substantial time passes, main advances
materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190 or the
truthfulness project lands, cited contracts change, another PR implements
part of the outcome, or a load-bearing claim cannot be reproduced. Apply the
landing-event table above.

## Review focus

- The exception is scoped to a saved, named patch; generic dirt still blocks.
- Root and child briefs stay field-for-field aligned.
- No `packages/cli/assets` file was edited by hand.
