---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-30
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: delivery-evidence-and-knowledge-preflight

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Close GitHub #383, #384, #385 and #355 in one PR: stacked goal deliveries judge their exit carrier at the stack tip, the exit gate's own artifact commit stays bookkeeping, `journal check` reports rewritten committed journal lines in goal projects, and `oat-repo-knowledge-index` resolves a provider-neutral mapper route before mutating knowledge.

**Architecture:** Evidence fixes extend `packages/cli/src/commands/project/delivery/evidence.ts` with a stack-aware head helper, a gate-row admission helper, and an exported journal-rewrite lister, consumed by `delivery check|refresh`, `closeout-check` and `journal check`. The skill fix reorders `.agents/skills/oat-repo-knowledge-index/SKILL.md` around an `oat-dispatch-subagents` preflight. See `design.md`.

**Tech Stack:** TypeScript (ESM) CLI on Node 22, vitest, canonical Markdown skills, Fumadocs docs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `fix(p01-t01): judge stacked exit carriers at the tip`

**Shared conventions for every task:**

- Format: `pnpm exec oxfmt --write <each created or edited file>` (the repository's oxfmt write command; lint-staged runs the same tool).
- Scoped tests: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run <file>` (isolated HOME per AGENTS.md).
- Commit with the exact task file list through `oat internal commit-paths` (hooks enabled).
- P0 guards (stack tip selection, stack order, gate head binding, own-evidence isolation, journal rewrite detection) need a can-fail proof: neutralize the guard, confirm the new test fails, restore, and record it in `implementation.md`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (autonomous: implement applies `hillCheckpointDefault: final`)
- [x] Set `oat_plan_hill_phases` in frontmatter (left unset for implement to write)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phases p01–p03 all edit `packages/cli/src/commands/project/delivery/evidence.ts`
and its test file, and p03's journal check reuses the lister p03 extracts from
that file, so they must run sequentially. p04 (skill prose plus one contract
test) is write-set disjoint from p01–p03, but each isolated worktree needs its
own `pnpm install` and workspace build before the CLI contract suites can run,
which costs more than p04's small scope saves. p05 bumps versions and runs the
full gate over everything. The plan therefore stays sequential:
`oat_plan_parallel_groups: []`.

---

## Phase 1: Stack-aware delivery exit carriers (#383)

### Task p01-t01: Add a stack-aware carrier-heads helper

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Write test (RED)**

In `evidence.test.ts`, using real Git fixtures like the existing successor
tests: (a) a linear 3-member `kind: stack` delivery whose carrier was reviewed
at the tip evaluates `fresh`; (b) a stack whose lower member head is not an
ancestor of the tip is `stale` with a `stack-order` reason; (c) a stack with an
unobserved member (`observed_head: null`) is `stale`; (d) a multi-member
`kind: pr` delivery keeps every-member evaluation (unchanged behavior).

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/evidence.test.ts`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Add an exported helper that, given a delivery, returns the heads for exit
carrier evaluation (tip only for `kind: stack`, every member otherwise) and,
for a stack, verifies each lower member head is the tip or its ancestor
through the existing Git runner, producing a `stack-order` stale reason on
violation. Keep `evaluateDeliveryReview` unchanged.

Run: the same vitest command
Expected: all cases pass (GREEN)

**Step 3: Refactor**

Keep the helper next to `evaluateGateCarrier`; document the stack rule in its
JSDoc.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec oxlint src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors. Record the can-fail proof for tip selection and stack order.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t01" --message "fix(p01-t01): judge stacked exit carriers at the stack tip" -- packages/cli/src/commands/project/delivery/evidence.ts packages/cli/src/commands/project/delivery/evidence.test.ts
```

---

### Task p01-t02: Use the helper in check, refresh and closeout; align the milestone subject scope

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/check.ts`
- Modify: `packages/cli/src/commands/project/delivery/refresh.ts`
- Modify: `packages/cli/src/commands/project/closeout-check/index.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/refresh.test.ts`
- Modify: the closeout-check test file that exercises delivery evidence (locate with `rg -l evaluateGateCarrier packages/cli/src/commands/project/closeout-check`)

**Step 1: Write test (RED)**

Through the production scope builder and command entry points: a 3-member
linear stack reviewed at the tip is deliverable under `delivery check`, is not
marked stale by `delivery refresh` (no `not-ancestor` reason written to the
milestone carrier), and passes the closeout evidence check. After a commit
that records a new own review artifact moving member 0's `reviewed_head`,
`--subject <milestone>` and `--subject <delivery>` report the same freshness.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Replace the three inline `delivery.members.map(...)` head lists with the p01-t01
helper. In `check.ts`'s milestone branch, when the milestone has a registered,
non-superseded delivery, build the evidence scope with `deliveryEvidenceScope`
for that delivery (reuse refresh's latest-non-superseded selection rather than
duplicating it); otherwise keep the `mNN`-row scope.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

Share the latest-non-superseded selection between `check.ts` and `refresh.ts`
if both now need it.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass. Record the can-fail proof for milestone/delivery agreement.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t02" --message "fix(p01-t02): apply stack heads and align milestone evidence scope" -- <exact files above>
```

---

### Task p01-t03: Document stacked deliveries

**Files:**

- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md` (§12.7, §12.8)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (registration item 4)
- Modify: `apps/oat-docs/docs/reference/project-state-machine.md` and/or `apps/oat-docs/docs/workflows/projects/closeout/pr-flow.md` where delivery `kind` or member evaluation is described

**Step 1: Write test (RED)**

Not applicable (prose). If a contract test pins `kind: pr` wording, update it
in this task.

**Step 2: Implement (GREEN)**

§12.7: list `kind: pr | stack`; add a "Stacked deliveries" bullet — members are
recorded base to tip, the exit carrier is judged against the tip member's
observed head, each lower member must be an ancestor of the tip, and the
integrated review stays per member. pr-progress item 4: `kind: pr` for a single
PR, `kind: stack` with members base to tip for a stacked delivery. Mirror the
rule in the docs page that describes delivery evaluation.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm exec markdownlint-cli2 <edited docs pages>` (use the docs app's markdownlint invocation from `apps/oat-docs/package.json` if different)
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t03" --message "docs(p01-t03): document stacked goal deliveries" -- <exact files above>
```

---

## Phase 2: Gate-originated artifact admission (#384)

### Task p02-t01: Admit the exit gate's own artifact as bookkeeping

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.ts`
- Modify: `packages/cli/src/commands/project/delivery/refresh.ts`
- Modify: `packages/cli/src/commands/project/closeout-check/index.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.test.ts`

**Step 1: Write test (RED)**

Through the production scope builder: (a) a gate row (`Invocation: gate`,
Scope `final`, `Reviewed Head` = carrier `reviewed_head`) plus its artifact
commit after the carrier is a bookkeeping successor — the milestone carrier
stays fresh; (b) the same commit with a `manual` `final` row is
`disallowed-path`; (c) a gate row whose reviewed head differs from the carrier's
is `disallowed-path`; (d) the gate artifact never appears in
`ownEvidenceArtifacts` and so cannot unlock a delivery's set-once fields; (e)
the gate row is never selected as the milestone or delivery integrated review.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery`
Expected: (a) fails (RED); (b)–(e) pass before and after

**Step 2: Implement (GREEN)**

Add a helper that returns the artifacts of gate evidence rows for a carrier
(design: Invocation `gate`, non-placeholder reviewed head equal to the
carrier's `reviewed_head`, non-placeholder artifact). Merge them into
`evidenceArtifacts` only: in `check.ts`'s milestone branch (working carrier)
and in `deliveryEvidenceScope` through an optional carrier input supplied by
check/refresh (milestone working carrier) and closeout (`exit_gate`).
Callers that supply no carrier keep today's scope exactly.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None beyond keeping the helper beside `reviewRowsFor`.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass. Record can-fail proofs for the head binding and own-evidence isolation.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p02-t01" --message "fix(p02-t01): admit the exit gate's own artifact as bookkeeping" -- <exact files above>
```

---

### Task p02-t02: Reconcile goal exit-gate guidance

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (goal-mode exit gate, around the "scoped to the milestone's ordered phase set" wording)
- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md` (§12.8 path list)
- Modify: `apps/oat-docs/docs/workflows/advanced/workflow-gates.md` if it describes goal exit-gate freshness

**Step 1: Write test (RED)**

Not applicable (prose); update any contract pin that quotes the changed
sentences.

**Step 2: Implement (GREEN)**

State that the configured gate runs verbatim with `--review-scope final`, that
its own Reviews row (Invocation `gate`, reviewed head equal to the carrier's)
and artifact are admitted as bookkeeping for the carrier it produced, that this
row never serves as the integrated review or unlocks delivery fields, and that
no placeholder row is required. Add the admission to §12.8's path list.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p02-t02" --message "docs(p02-t02): document exit-gate bookkeeping admission" -- <exact files above>
```

---

## Phase 3: Journal rewrite detection (#385)

### Task p03-t01: Export a journal-rewrite lister from delivery evidence

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Write test (RED)**

The lister returns every rewritten or removed recorded line and every new
extraction marker for a before/after pair, and returns nothing for an append
or a progress-field update; `judgeJournalChange` still refuses the existing
fixture with the same message.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/evidence.test.ts`
Expected: lister cases fail (RED)

**Step 2: Implement (GREEN)**

Refactor `judgeJournalChange` so its line rules live in an exported lister;
`judgeJournalChange` returns the first entry as its `Verdict`.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p03-t01" --message "refactor(p03-t01): export the journal rewrite rule" -- packages/cli/src/commands/project/delivery/evidence.ts packages/cli/src/commands/project/delivery/evidence.test.ts
```

---

### Task p03-t02: Report rewritten committed journal lines in goal projects

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/types.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (journal check reason list)

**Step 1: Write test (RED)**

With a real Git fixture: a goal project whose working `implementation.md`
rewrites a committed recorded line reports `journal-line-rewritten` (one per
offending line); an append-only change passes; a quick project with the same
edit is unaffected; a journal not yet tracked at HEAD adds no reason; a Git
failure other than "not tracked at HEAD" is a command error.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Add `journal-line-rewritten` to `JournalReasonCode`. Add an injectable Git
dependency to journal check; for `oat_workflow_mode: goal`, read
`HEAD:<projectDir>/implementation.md` and append one reason per lister entry
(path `implementation.md`). Keep `evaluateJournal` pure; the comparison is an
additional step in the command.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass. Record the can-fail proof for rewrite detection.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p03-t02" --message "feat(p03-t02): flag rewritten committed journal lines in goal projects" -- <exact files above>
```

---

## Phase 4: Knowledge-index dispatch preflight (#355)

### Task p04-t01: Resolve a mapper route before mutating knowledge

**Files:**

- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` (or the closest existing knowledge-index contract test) to pin the new ordering

**Step 1: Write test (RED)**

Add contract assertions: the dispatch-route preflight section appears before
"Step 2: Prepare Only Owned Generated Outputs"; the skill names
`oat-dispatch-subagents`; `model: "haiku"`, `run_in_background` and `Explore`
appear only inside the labelled Claude route; no `/private/tmp/claude-` path
remains; an unlaunched probe worker is described as a route failure, not
read-only mode.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
Expected: new assertions fail (RED)

**Step 2: Implement (GREEN)**

Per `design.md` "Knowledge-index dispatch preflight": insert the preflight
(probe-and-bind of `oat-dispatch-subagents` and `subagent-orchestration`,
capability classification, one authorization for all mapper lanes, stop with an
actionable message before Step 2 when unresolved); move the write-permission
probe before Step 2 on a resolved route; rewrite mapper launches as
provider-neutral requests with per-provider routes (Claude, Codex, Cursor);
replace Step 6b's hard-coded path with the accepted handle's output; keep
ownership protection, templates, frontmatter and verify unchanged. Update
`allowed-tools` if needed.

Run: the same vitest command, plus `node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs`
Expected: pass (GREEN)

**Step 3: Refactor**

Remove now-duplicated per-mapper boilerplate where one request shape covers all
mappers.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm exec oxlint .agents/skills/oat-repo-knowledge-index && pnpm oat:validate-skills`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p04-t01" --message "fix(p04-t01): preflight knowledge-index mapper dispatch on every provider" -- <exact files above>
```

---

## Phase 5: Release bookkeeping and gates

### Task p05-t01: Bump changed skills and lockstep package versions

**Files:**

- Modify: `.agents/skills/oat-project-brief/SKILL.md` (`metadata.version` 1.0.3 → 1.0.4)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (1.3.5 → 1.3.6)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (2.3.22 → 2.3.23)
- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md` (1.3.3 → 1.4.0)
- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` (0.3.36 → 0.3.37)
- Modify: `packages/cli/assets/public-package-versions.json`

Bump only skills whose bundled files actually changed in the final diff
(`git diff --name-only origin/main...HEAD -- .agents/skills`); adjust the list
if a phase touched a different skill.

**Step 1: Write test (RED)**

Not applicable.

**Step 2: Implement (GREEN)**

Apply the bumps.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `git fetch origin main && pnpm run check:skill-bumps && pnpm release:check-versions && pnpm release:validate`
Expected: each exits 0

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p05-t01" --message "chore(p05-t01): bump public packages to 0.3.37 and changed skills" -- <exact files above>
```

---

### Task p05-t02: Close out backlog items and run the full gate list

**Files:**

- Modify (via `oat backlog archive`): the four backlog items, `.oat/repo/pjm/backlog/completed.md`, `.oat/repo/pjm/backlog/index.md`, and any reference the command rewrites
- Modify: `apps/oat-docs/index.md` only if step 9 regeneration changes it

**Step 1: Write test (RED)**

Not applicable.

**Step 2: Implement (GREEN)**

Run `oat --json backlog archive <id> --summary "<outcome>"` for
`BL-261030-evaluate-stacked-goal-delivery`, `BL-261030-admit-goal-exit-gate-review`,
`BL-261030-flag-rewritten-committed` and `BL-261030-preflight-knowledge-index`,
capturing each result's `affectedPaths` (archive never stages). Note #385's
goal-only narrowing in its summary.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run the AGENTS.md Definition of Done gates in order, each with an explicit exit
code: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`,
`pnpm run check:skill-bumps`, `pnpm release:check-versions`,
`pnpm release:validate`, `pnpm build:docs`, then
`pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md`.
Also run `pnpm lint` and `pnpm format` (this PR touches `.agents/skills`).
Expected: every exit code is 0; note any Turbo cache replay.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p05-t02" --message "chore(p05-t02): archive shipped backlog items" -- <literal affectedPaths union>
```

---

## Reviews

| Scope | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01   | code     | pending | -    | -        | -             | -          | -           |
| p02   | code     | pending | -    | -        | -             | -          | -           |
| p03   | code     | pending | -    | -        | -             | -          | -           |
| p04   | code     | pending | -    | -        | -             | -          | -           |
| p05   | code     | pending | -    | -        | -             | -          | -           |
| final | code     | pending | -    | -        | -             | -          | -           |
| plan  | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Stack-aware delivery exit carriers (#383)
- Phase 2: 2 tasks - Gate-originated artifact admission (#384)
- Phase 3: 2 tasks - Journal rewrite detection (#385)
- Phase 4: 1 task - Knowledge-index dispatch preflight (#355)
- Phase 5: 2 tasks - Release bookkeeping and gates

**Total: 10 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Triage record: `.oat/repo/pjm/triage/2026-10-30-untriaged-issues.md`
- Backlog: `BL-261030-evaluate-stacked-goal-delivery`, `BL-261030-admit-goal-exit-gate-review`, `BL-261030-flag-rewritten-committed`, `BL-261030-preflight-knowledge-index`
