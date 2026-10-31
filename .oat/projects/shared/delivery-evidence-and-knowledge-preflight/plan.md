---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-30
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # sequential; see ## Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
---

# Implementation Plan: delivery-evidence-and-knowledge-preflight

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Close GitHub #383, #384, #385 and #355 in one PR: stacked goal deliveries judge their exit carrier at the stack tip, the exit gate's own artifact commit stays bookkeeping, `journal check` reports rewritten committed journal lines in goal projects, and `oat-repo-knowledge-index` resolves a provider-neutral mapper route before mutating knowledge.

**Architecture:** Evidence fixes extend `packages/cli/src/commands/project/delivery/evidence.ts` with a stack-aware exit-carrier wrapper, a gate-row admission helper, and an exported journal-rewrite lister, consumed by `delivery check|refresh`, `closeout-check` and `journal check`. The skill fix reorders `.agents/skills/oat-repo-knowledge-index/SKILL.md` around an `oat-dispatch-subagents` preflight. See `design.md`.

**Tech Stack:** TypeScript (ESM) CLI on Node 22, vitest, canonical Markdown skills, Fumadocs docs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `fix(p01-t01): judge stacked exit carriers at the tip`

**Shared conventions for every task:**

- Format: `pnpm exec oxfmt --write <each created or edited file>` (the repository's oxfmt write command; lint-staged runs the same tool).
- Scoped tests: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run <file>` (isolated HOME per AGENTS.md).
- Docs lint: `pnpm --filter oat-docs exec markdownlint-cli2 docs/<page>.md` (paths relative to `apps/oat-docs`; the root has no `markdownlint-cli2`).
- Commit with the exact task file list through `oat internal commit-paths` (hooks enabled).
- P0 guards (stack tip selection, stack order at every call site, gate head binding, own-evidence isolation, journal rewrite detection) need a can-fail proof: neutralize the guard, confirm the new test fails, restore, and record it in `implementation.md`.
- Evidence negative controls run through the production scope builder **and the built CLI** (brief contract §12.8): `pnpm --filter @open-agent-toolkit/cli build`, then run from inside each scratch fixture repository with the absolute dist path — `REPO=$(git rev-parse --show-toplevel); (cd <scratch-root> && node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject m01)` — because `delivery check` resolves the repository root from the working directory. Assert `status` and the exact reason code, and record the commands, how each fixture is regenerated (the `goal-repo.ts` builder plus the listed commits; no large tracked baselines), and expected/observed categorical outcomes in `implementation.md`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (autonomous: implement applies `hillCheckpointDefault: final`)
- [x] Set `oat_plan_hill_phases` in frontmatter (left unset for implement to write)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phases p01–p03 all edit `packages/cli/src/commands/project/delivery/evidence.ts`,
its test file and the shared fixture helper
`delivery/__tests__/goal-repo.ts`, and p03's journal check reuses the lister
extracted from `evidence.ts`, so they must run sequentially. p04 (skill prose,
one docs page and one contract test) is write-set disjoint from p01–p03, but
each isolated worktree needs its own `pnpm install` and workspace build before
the CLI contract suites can run, which costs more than p04's small scope saves.
p05 bumps versions and runs the full gate over everything. The plan therefore
stays sequential: `oat_plan_parallel_groups: []`.

---

## Phase 1: Stack-aware delivery exit carriers (#383)

### Task p01-t01: Add a stack-aware exit-carrier wrapper

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts` (multi-member and `kind` options for the registry fixture)

**Step 1: Write test (RED)**

In `evidence.test.ts`, using real Git fixtures like the existing successor
tests: (a) a linear 3-member `kind: stack` delivery whose carrier was reviewed
at the tip evaluates `fresh`; (b) a stack whose lower member head is not an
ancestor of the tip is `stale` with a `stack-order` reason; (c) a stack with an
unobserved lower member (`observed_head: null`) is `stale`; (d) a multi-member
`kind: pr` delivery keeps every-member evaluation (unchanged behavior); (e) a
`kind: stack` delivery with no members is `stale` (`member-missing`).

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/evidence.test.ts`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Add one exported wrapper that callers cannot bypass, for example
`evaluateDeliveryExitCarrier(carrier, expected, { git, scope, delivery })`: for
`kind: stack` it first verifies each lower member's `observed_head` is the tip's
or an ancestor of it (a violation or unobserved member returns a stale
`CarrierEvaluation` with a `stack-order` or unobserved reason; a stack with no
members returns stale `member-missing` without calling `evaluateGateCarrier`),
then calls `evaluateGateCarrier` with only the tip head; for any other `kind` it calls
`evaluateGateCarrier` with every member head exactly as today. Keep
`evaluateDeliveryReview` unchanged.

Run: the same vitest command
Expected: all cases pass (GREEN)

**Step 3: Refactor**

Keep the wrapper next to `evaluateGateCarrier`; document the stack rule in its
JSDoc.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec oxlint src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: no errors. Record the can-fail proof for tip selection and stack order.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t01" --message "fix(p01-t01): judge stacked exit carriers at the stack tip" -- packages/cli/src/commands/project/delivery/evidence.ts packages/cli/src/commands/project/delivery/evidence.test.ts packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts
```

---

### Task p01-t02: Use the wrapper in check, refresh and closeout; align the milestone subject scope

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/check.ts`
- Modify: `packages/cli/src/commands/project/delivery/refresh.ts`
- Modify: `packages/cli/src/commands/project/closeout-check/index.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/refresh.test.ts`
- Modify: `packages/cli/src/commands/project/closeout-check/goal-boundary.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts` (if further fixture options are needed)

**Step 1: Write test (RED)**

Through the production scope builder and command entry points:

- Positive: a 3-member linear stack reviewed at the tip is deliverable under
  `delivery check`, is not marked stale by `delivery refresh` (no
  `not-ancestor` reason written to the milestone carrier), and its closeout
  `DeliveryEvidenceFact.exit` is fresh.
- Negative, per call site: a lower member whose `observed_head` is not an
  ancestor of the tip makes `delivery check` undeliverable with a `stack-order`
  reason, makes `delivery refresh` write `freshness: stale` with a
  `stack-order` reason, and makes the closeout exit stale; an unobserved lower
  member is stale at each call site.
- Agreement: after a commit that records a new own review artifact moving
  member 0's `reviewed_head`, `--subject <milestone>` and `--subject <delivery>`
  report the same freshness.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Replace the three inline `delivery.members.map(...)` carrier evaluations with
the p01-t01 wrapper. Keep `SubjectEvidenceReport.publishedHeads` reporting
every member's observed head (public JSON field unchanged). Extract
`latestDeliveryForMilestone(deliveries, milestone)` — the last registry entry
for that milestone with status `open` or `at_endpoint` (`registering` and
`superseded` excluded), matching refresh's current inline selection — use it in
`refresh.ts` over the observed delivery list (the `observedById` copies carrying
this run's fresh `gh` observations, never the raw registry entries), and in
`check.ts`'s milestone branch, over the persisted registry, build the evidence scope with
`deliveryEvidenceScope` for that delivery when one exists; otherwise keep the
`mNN`-row scope.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None beyond the extracted selection helper.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass. Record the can-fail proof for stack order at each of the three call sites and for milestone/delivery agreement.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t02" --message "fix(p01-t02): apply stack heads and align milestone evidence scope" -- <exact files above that changed>
```

---

### Task p01-t03: Document stacked deliveries and their registration

**Files:**

- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md` (§12.7)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (registration items 4–6 and the `registering` resume)
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (the `delivery check` / `delivery refresh` entries)

**Step 1: Write test (RED)**

Not applicable (prose). If a contract test pins the changed `kind: pr`
wording, update it in this task and add the test file to the commit.

**Step 2: Implement (GREEN)**

§12.7: list `kind: pr | stack` and add a "Stacked deliveries" bullet: members
are recorded base to tip; the exit carrier is judged against the tip member's
observed head and each lower member must be an ancestor of the tip
(`stack-order` otherwise); the integrated review stays per member;
post-review bookkeeping lands on the tip member's branch (a commit on a lower
layer changes upper members' bases and stales their review); a mis-ordered
stack is replaced through supersession (`covers_scope_of`), never repaired in
place.

pr-progress registration (attach-only for stacks): item 4 writes `kind: pr` for
a single pull request or `kind: stack` when the milestone is delivered as an
existing gh-stack; `lookup.head_branch` names the tip layer's branch, and
because the layer pull requests already exist, item 4 records every member's
`url` in base-to-tip order in the same `registering` write. Item 5 for a stack
attaches those pull requests (it never creates a stack); item 6 fills each
member's `base` and `reviewed_head`. A `registering` stack on resume re-checks
each recorded URL with `gh pr view`; a missing, closed-unmerged, or
re-targeted layer stops and routes to `oat-project-reconcile`. In `cli-reference.md`, note that stacked deliveries
are judged at the tip.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p01-t03" --message "docs(p01-t03): document stacked goal deliveries" -- <exact files above that changed>
```

---

### Task p01-t04: (review) Classify stack inspection failures separately from stack-order

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Understand the issue**

Review finding: M1 — `evaluateDeliveryExitCarrier` maps every non-zero `git merge-base --is-ancestor` exit to `stack-order`, so an unfetched commit reads as a mis-ordered stack (which the docs route to supersession); tests assert only `/^stack-order/`, so disabling the genuine non-ancestor branch leaves them green. L1 — stack topology checks run before the carrier's own checks, so a `null` carrier reports `stack-order` instead of `no carrier is recorded`, and unreviewed (`no_gate`/`project_disabled`) carriers go stale on topology where `kind: pr` stays fresh.
Location: see `reviews/archived/p01-review-2026-10-31T002508Z.md`.

**Step 2: Implement fix**

Resolve each member head first the way `evaluateSuccessor` does (`resolveCommit` → `missing-object`); map exit codes other than 0/1 and thrown errors to `inspection-failed:`; keep `stack-order:` only for exit code 1 (assert the "is not an ancestor of tip" text). Delegate to `evaluateGateCarrier` first (no topology checks) when the carrier is `null` or an unreviewed resolution, so outcome and reason match `kind: pr`. Add tests: unavailable tip and unavailable lower head (`'f'.repeat(40)`) → `missing-object`; null carrier on a stack → `no carrier is recorded`; `no_gate` carrier on a mis-ordered stack → same result as `kind: pr`. Prove the classification can fail: disable only the `code === 1` branch and confirm the mis-ordered tests fail.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p01-t04" --message "fix(p01-t04): classify stack inspection failures separately from stack-order" -- <exact files changed>
```

---

### Task p01-t05: (review) Align contract registration wording for stacked deliveries

**Files:**

- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md`
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md`

**Step 1: Understand the issue**

Review finding: L2 — the §12.7 "Idempotent registration" bullet still reads as create-once for every kind; pr-progress item 6 does not say which member `oat_pr_url` projects for a stack, and item 5 points to "the preceding reconciliation route" instead of naming `oat-project-reconcile`.
Location: see `reviews/archived/p01-review-2026-10-31T002508Z.md`.

**Step 2: Implement fix**

Qualify the Idempotent registration bullet for `kind: stack` (attach-only; every member URL in the `registering` write; resume re-checks each URL); state that `oat_pr_url`/`oat_pr_status` project the tip member for a stack; name `oat-project-reconcile` directly in item 5.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p01-t05" --message "fix(p01-t05): align contract registration wording for stacked deliveries" -- <exact files changed>
```

---

### Task p01-t06: (review) Pin latestDeliveryForMilestone exclusions

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Understand the issue**

Review finding: L3 — no test covers the cases `latestDeliveryForMilestone` excludes (`registering`, `superseded`) or the `at_endpoint` selection.
Location: see `reviews/archived/p01-review-2026-10-31T002508Z.md`.

**Step 2: Implement fix**

Add a unit test over `[open d01, superseded d02, registering d03]` for one milestone expecting `d01`, and an `at_endpoint` case that is selected.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery/evidence.test.ts`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p01-t06" --message "fix(p01-t06): pin latestDeliveryForMilestone exclusions" -- <exact files changed>
```

---

### Task p01-t07: (review) Scope the stack-order rule to configured code carriers in docs

**Files:**

- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Understand the issue**

Review finding: L1 (round 2) — after p01-t04, null and unreviewed-resolution carriers (`no_gate`, `project_disabled`) are evaluated before stack topology, so a mis-ordered stack with such a carrier is fresh, exactly as on `kind: pr`. Brief contract §12.7 "Stacked deliveries" and the `delivery check` entry in `cli-reference.md` still say every mis-ordered stack is refused.
Location: see `reviews/archived/p01-review-2026-10-31T004233Z.md`.

**Step 2: Implement fix**

State in both places that the tip/ancestor rule applies to configured code carriers bound to a reviewed head; null and unreviewed-resolution carriers follow the same evaluation as `kind: pr`. (The root aligns `design.md` itself.)

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p01-t07" --message "fix(p01-t07): scope the stack-order rule to configured code carriers in docs" -- <exact files changed>
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
- Modify: `packages/cli/src/commands/project/delivery/refresh.test.ts`
- Modify: `packages/cli/src/commands/project/closeout-check/goal-boundary.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts` (Invocation column in the Reviews table and an invocation parameter on the review-row builder)

**Step 1: Write test (RED)**

Through the production scope builder:

- (a) a gate row (`Invocation: gate`, Type `code`, Scope `final`,
  `Reviewed Head` = carrier `reviewed_head`) plus its artifact commit after the
  carrier is a bookkeeping successor: `delivery check --subject <milestone>`
  keeps the carrier fresh, `delivery refresh` writes no stale reason, and the
  closeout exit evaluation of the delivery's `exit_gate` is fresh under the
  same commit;
- (b) the same commit with a `manual` `final` row is `disallowed-path`;
- (c) a gate row whose reviewed head differs from the carrier's is
  `disallowed-path` in check, refresh and closeout;
- (d) the gate artifact never appears in `ownEvidenceArtifacts`, so it cannot
  unlock a delivery's set-once fields;
- (e) the gate row is never selected as the milestone or delivery integrated
  review;
- (f) a gate row whose Reviewed Head is `-` is not admitted;
- (g) a gate-invocation row with Type `artifact` is not admitted.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check`
Expected: (a) fails (RED); (b)–(g) pass before and after

**Step 2: Implement (GREEN)**

Add a helper beside `reviewRowsFor` that returns the artifacts of gate evidence
rows for a carrier (Type `code`, Invocation `gate`, non-placeholder reviewed
head equal to the carrier's `reviewed_head`, non-placeholder artifact). Merge
them into `evidenceArtifacts` only: in `check.ts`'s milestone branch (working
carrier) and in `deliveryEvidenceScope` through an optional carrier input
supplied by check/refresh (milestone working carrier) and closeout
(`exit_gate`). Callers that supply no carrier keep today's scope exactly.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Then the built-CLI negative controls, using the shared-conventions invocation
(build once, capture `REPO`, `cd` into each scratch fixture repository, run
`node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject m01`)
against preserved fixtures for (a) a matching gate row (expect ok, fresh),
(b) a manual `final` row (expect undeliverable, `disallowed-path`), (c) a
mismatched-head gate row (expect undeliverable, `disallowed-path`), and a
stack with a non-ancestor lower layer (expect undeliverable, `stack-order`).
Expected: every categorical outcome as stated. Record commands, fixture
provenance and outcomes, plus can-fail proofs for the head binding and
own-evidence isolation, in `implementation.md`.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p02-t01" --message "fix(p02-t01): admit the exit gate's own artifact as bookkeeping" -- <exact files above that changed>
```

---

### Task p02-t02: Reconcile goal exit-gate guidance

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (goal-mode exit gate, around the "scoped to the milestone's ordered phase set" wording)
- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md` (§12.8 path list)
- Modify: `apps/oat-docs/docs/workflows/advanced/workflow-gates.md` only if it describes goal exit-gate freshness (confirm with `rg -n 'milestone|goal' apps/oat-docs/docs/workflows/advanced/workflow-gates.md`)

**Step 1: Write test (RED)**

Not applicable (prose); update any contract pin that quotes the changed
sentences and add it to the commit.

**Step 2: Implement (GREEN)**

State that the configured gate runs verbatim with `--review-scope final`, that
its own Reviews row (Type `code`, Invocation `gate`, reviewed head equal to the
carrier's) and artifact are admitted as bookkeeping for the carrier it
produced, that this row never serves as the integrated review or unlocks
delivery fields, and that no placeholder row is required. Add the admission to
§12.8's path list.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation` and, if `workflow-gates.md` changed, `pnpm --filter oat-docs exec markdownlint-cli2 docs/workflows/advanced/workflow-gates.md`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p02-t02" --message "docs(p02-t02): document exit-gate bookkeeping admission" -- <exact files above that changed>
```

---

### Task p02-t03: (review) Revert the milestone-subject stack carrier deviation

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/check.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.test.ts`

**Step 1: Understand the issue**

Review finding: H1 — for `--subject mNN` with a registered `kind: stack` delivery, p02-t01 judges the exit carrier against stored member heads while the review is judged against local `HEAD`; a substantive commit plus a passing re-review without a new gate reads as deliverable, which phase 1 refused.
Location: see `reviews/archived/p02-review-2026-10-31T010236Z.md`.

**Step 2: Implement fix**

Revert the milestone branch to `evaluateGateCarrier(workingCarrier, expected, { git, scope, publishedHeads: [publishedHead] })` for every delivery kind (scope alignment and gate admission stay). Add a command-level regression: milestone subject with a registered stack, a substantive commit after the carrier, and a passing re-review stays `undeliverable`. Re-run the stack built-CLI control with `--subject d01` (expected exit 1, `stack-order`). Can-fail: reintroduce the stack wrapper in the milestone branch and confirm the regression test fails.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p02-t03" --message "fix(p02-t03): revert the milestone-subject stack carrier deviation" -- <exact files changed>
```

---

### Task p02-t04: (review) Cover the unregistered milestone gate path and own-evidence effect

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts`
- Modify: `packages/cli/src/commands/project/delivery/check.test.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Understand the issue**

Review finding: M1 — every gate fixture registers `d01`, so the production pre-registration path (`mNN`-row branch) has no regression test; removing its gate admission leaves all tests green. L2 — own-evidence isolation is pinned only by a static `not.toContain`.
Location: see `reviews/archived/p02-review-2026-10-31T010236Z.md`.

**Step 2: Implement fix**

Add an unregistered option to `gateArtifactScenario` (milestone gates without `oat_deliveries`) and `--subject m01` cases: matching gate row → `ok`/fresh; manual and mismatched → `undeliverable`/`disallowed-path`. Add a behavioral control: a commit swapping `d01`'s `integrated_review.artifact` to the gate artifact is `substantive-change` on `state.md` through `deliveryEvidenceScope` with the carrier supplied. Can-fail: remove the gate spread in the unregistered milestone branch (matching case red); leak gate artifacts into `ownEvidenceArtifacts` (swap control red). Add the unregistered matching built-CLI control.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p02-t04" --message "fix(p02-t04): cover the unregistered milestone gate path and own-evidence effect" -- <exact files changed>
```

---

### Task p02-t05: (review) Admit gate artifacts only under reviews/

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`

**Step 1: Understand the issue**

Review finding: L1 — `gateEvidenceArtifacts` admits any non-placeholder artifact of a code/gate row, so a forged gate row naming `design.md` makes a `design.md` change read as bookkeeping.
Location: see `reviews/archived/p02-review-2026-10-31T010236Z.md`.

**Step 2: Implement fix**

Admit a gate row's artifact only when its project-relative path is under `reviews/` (or `reviews/archived/`), matching `artifactVariants` and the `EvidenceScope` contract. Add a negative control: a gate row naming `design.md` stays `disallowed-path`. (Treating an `Invocation` cell change as an identity change is deferred; see Deferred Findings.)

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/delivery src/commands/project/closeout-check && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p02-t05" --message "fix(p02-t05): admit gate artifacts only under reviews/" -- <exact files changed>
```

---

### Task p02-t06: (review) Correct gate-admission wording in the contract and CLI reference

**Files:**

- Modify: `.agents/skills/oat-project-brief/references/brief-contract.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Understand the issue**

Review finding: L3 — §12.8 says the gate artifact is admitted "for that carrier only", but it joins the whole evidence scope built with that carrier (review and exit evaluations); the `delivery check` CLI reference allowlist omits the gate-row admission.
Location: see `reviews/archived/p02-review-2026-10-31T010236Z.md`.

**Step 2: Implement fix**

Reword §12.8 to "admitted in evidence scopes built for that carrier (its review and exit evaluations)", note the `reviews/` path restriction, and add one clause to the `delivery check` entry naming the gate-row admission and its head binding.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p02-t06" --message "fix(p02-t06): correct gate-admission wording in the contract and CLI reference" -- <exact files changed>
```

---

### Task p02-t07: (review) Add the reviews/ restriction to exit-gate guidance

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `apps/oat-docs/docs/workflows/advanced/workflow-gates.md`

**Step 1: Understand the issue**

Review finding: L1 (round 2) — `completion-and-closeout.md` (goal-mode exit gate) and `workflow-gates.md` describe the gate-row bookkeeping admission without the `reviews/` path restriction p02-t05 added.
Location: see `reviews/archived/p02-review-2026-10-31T012557Z.md`.

**Step 2: Implement fix**

State in both places that the admitted gate artifact must live under `reviews/` (or `reviews/archived/`), matching brief contract §12.8.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm --filter oat-docs exec markdownlint-cli2 docs/workflows/advanced/workflow-gates.md`
Expected: pass.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p02-t07" --message "fix(p02-t07): add the reviews/ restriction to exit-gate guidance" -- <exact files changed>
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
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (journal check reason list and boundary notes, around lines 210–217)

**Step 1: Write test (RED)**

With a real Git fixture and one before/after pair: a goal project whose working
`implementation.md` rewrites a committed recorded line makes
`journal check --at review` report `journal-line-rewritten` (one per offending
line, with a named `owner`), `status: refused` and exit 1; committing that same
edit makes `evaluateSuccessor` through `deliveryEvidenceScope` return
`substantive-change` for `implementation.md` (parity with delivery evidence). An
append-only change passes; a quick project with the same edit is unaffected; a
journal not tracked at HEAD and a repository with an unborn HEAD add no reason;
any other Git failure is a command error. `--at completion` does not run the
comparison.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery`
Expected: new cases fail (RED)

**Step 2: Implement (GREEN)**

Add `journal-line-rewritten` to `JournalReasonCode`. Add an injectable Git
dependency to journal check; for `oat_workflow_mode: goal` at the
`implement-preflight` and `review` boundaries, read
`HEAD:<projectDir>/implementation.md` and append one reason per rewritten or
removed lister entry (path `implementation.md`, the owner used by sibling
journal reasons, e.g. `oat-project-implement`), recomputing `status` so an
added reason refuses. New extraction markers are not reported here (they are
not rewrites of committed lines and remain delivery evidence's to judge); add a
test that an uncommitted new extraction marker adds no
`journal-line-rewritten` reason.
Keep `evaluateJournal` pure and leave `complete-state` unchanged (at
completion the journal is committed, so working and HEAD agree). Update
`cli-reference.md` to say the check reports uncommitted rewrites of committed
lines in goal projects at those two boundaries.

Run: the same vitest command
Expected: pass (GREEN)

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery src/commands/project/complete-state && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass. Record the can-fail proof for rewrite detection.

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p03-t02" --message "feat(p03-t02): flag rewritten committed journal lines in goal projects" -- <exact files above that changed>
```

---

### Task p03-t03: (review) Resolve the committed journal path through Git from the project directory

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`

**Step 1: Understand the issue**

Review finding: M1 — `readCommittedJournal` computes the Git path lexically with `relative(repoRoot, …)`; an absolute `--project` spelled through a symlink alias (macOS `/var` vs `/private/var`) yields an outside-repository path and exit 2 on a valid goal project.
Location: see `reviews/archived/p03-review-2026-10-31T014304Z.md`.

**Step 2: Implement fix**

Run the HEAD lookups with `cwd: projectDir` (`git ls-tree --full-name -z HEAD -- implementation.md`, `git show HEAD:./implementation.md`), or realpath both sides before `relative`. Add a test passing the realpath of the fixture project directory while the root is the logical tmpdir path (expect `ok`).

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p03-t03" --message "fix(p03-t03): resolve the committed journal path through Git from the project directory" -- <exact files changed>
```

---

### Task p03-t04: (review) Fail closed on a dangling HEAD and cover each Git failure branch

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`

**Step 1: Understand the issue**

Review finding: L1 — any exit 1 from `git rev-parse --verify --quiet HEAD^{commit}` is treated as an unborn HEAD, so a branch ref naming a missing object silently skips the comparison. L4 — the injected-failure test fails every Git call, so the `ls-tree` and `show` failure branches have no test of their own; the parity assertion does not pin the rewritten-line reason; no lister case for a pure deletion.
Location: see `reviews/archived/p03-review-2026-10-31T014304Z.md`.

**Step 2: Implement fix**

On exit 1, return "no committed version" only when `git symbolic-ref -q HEAD` names a ref that `git show-ref --verify --quiet` cannot resolve; otherwise raise the same `CliError(…, 2)`. Add a runner that fails only the Nth Git call, once for each of the three calls; add `reason: expect.stringContaining(<rewritten line>)` to the parity assertion; add a lister case for a removed line with no replacement.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p03-t04" --message "fix(p03-t04): fail closed on a dangling HEAD and cover each Git failure branch" -- <exact files changed>
```

---

### Task p03-t05: (review) Signal unparseable committed frontmatter from the shared journal rule

**Files:**

- Modify: `packages/cli/src/commands/project/delivery/evidence.ts`
- Modify: `packages/cli/src/commands/project/delivery/evidence.test.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`

**Step 1: Understand the issue**

Review finding: L2 — `journalRewrites` returns `[]` when either side's frontmatter cannot be parsed, so a committed journal with broken frontmatter plus a body rewrite passes journal check while delivery evidence refuses the same pair.
Location: see `reviews/archived/p03-review-2026-10-31T014304Z.md`.

**Step 2: Implement fix**

Have the lister return a distinct entry (for example `kind: 'frontmatter-unparseable'`) when either side cannot be split; keep `judgeJournalChange`'s existing refusal message for that case; map the committed-side case in journal check to a reason (reuse `journal-frontmatter-malformed` or the rewrite reason with an explicit message). Add lister and journal-check cases.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p03-t05" --message "fix(p03-t05): signal unparseable committed frontmatter from the shared journal rule" -- <exact files changed>
```

---

### Task p03-t06: (review) Make the journal-line-rewritten message actionable

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Understand the issue**

Review finding: L3 — the refusal states the fact but not the correction, unlike sibling reasons.
Location: see `reviews/archived/p03-review-2026-10-31T014304Z.md`.

**Step 2: Implement fix**

Append the requirement (for example `; the journal is append-only — restore the committed line and append the correction`), update any assertion on the message, and note in `cli-reference.md` that the comparison base is `HEAD`, so an already-committed rewrite is left to `delivery check`.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check src/commands/project/delivery && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass; record any can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p03-t06" --message "fix(p03-t06): make the journal-line-rewritten message actionable" -- <exact files changed>
```

---

### Task p03-t07: (review) Align the committed-frontmatter reason and make the alias test portable

**Files:**

- Modify: `packages/cli/src/commands/project/journal-check/index.ts`
- Modify: `packages/cli/src/commands/project/journal-check/index.test.ts`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Understand the issue**

Review findings (round 2): L1 — the committed-frontmatter refusal reuses `journal-frontmatter-malformed` with owner `oat-project-implement`, while the existing reason with that code uses `oat-project-reconcile`; the message gives no remedy and the CLI reference does not mention it. L2 — the alias test relies on the macOS temp-directory symlink, so on Ubuntu CI it cannot fail, and it passes if the lookup silently finds nothing.
Location: see `reviews/archived/p03-review-2026-10-31T015808Z.md`.

**Step 2: Implement fix**

Use the same owner as the existing `journal-frontmatter-malformed` reason (`oat-project-reconcile`) and append a remedy to the committed-frontmatter message; mention the case in the journal check entry of `cli-reference.md`. Replace or add an alias test that creates its own symlink to the fixture project directory and asserts a committed-line rewrite is refused with `journal-line-rewritten` through the symlinked absolute path (so it fails if the lookup finds nothing).

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/journal-check && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter oat-docs exec markdownlint-cli2 docs/reference/cli-reference.md`
Expected: pass; can-fail: restore the lexical path and the new symlink test fails on any platform.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p03-t07" --message "fix(p03-t07): align the committed-frontmatter reason and make the alias test portable" -- <exact files changed>
```

---

## Phase 4: Knowledge-index dispatch preflight (#355)

### Task p04-t01: Resolve a mapper route before mutating knowledge

**Files:**

- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `apps/oat-docs/docs/skills/repo-improve.md` (knowledge-index prerequisites, "what it does without asking", read-only fallback condition)
- Modify (optional): `packages/cli/src/validation/named-skill-load-contract.test.ts` comment citations of knowledge-index line numbers, if the rewrite moves those blocks

**Step 1: Write test (RED)**

Add contract assertions: the dispatch-route preflight section appears before
"Step 2: Prepare Only Owned Generated Outputs"; the skill names
`oat-dispatch-subagents`; the probe-miss branch gives
`oat tools install utility --scope <user|project>` or
`oat tools update --pack utility --scope <user|project>` (add
`['oat-repo-knowledge-index', '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md', 'utility']`
to the existing bundled-skill sibling-root recovery list); `model: "haiku"`,
`run_in_background` and `Explore` appear only inside the labelled Claude route;
no `/private/tmp/claude-` path remains; an unlaunched probe worker is described
as a route failure, not read-only mode; per-provider routes launch the
installed provider projection of `oat-codebase-mapper` and never present
inlined role text as a registered native role.

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
Expected: new assertions fail (RED)

**Step 2: Implement (GREEN)**

Per `design.md` "Knowledge-index dispatch preflight": insert the preflight
(probe-and-bind of `oat-dispatch-subagents` and `subagent-orchestration` with
the utility-pack recovery commands on a miss, capability classification, one
authorization for all mapper lanes, stop with an actionable message before
Step 2 when unresolved); move the write-permission probe before Step 2 on a
resolved route; rewrite mapper launches as provider-neutral requests with
per-provider routes (Claude, Codex, Cursor) that launch the installed role
projection; replace Step 6b's hard-coded path with the accepted handle's
output; keep ownership protection, templates, frontmatter and verify
unchanged. Update `allowed-tools` if needed. Update `repo-improve.md` to
match.

Run: the same vitest command, plus `node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs`
Expected: pass (GREEN)

**Step 3: Refactor**

Remove now-duplicated per-mapper boilerplate where one request shape covers all
mappers.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm exec oxlint .agents/skills/oat-repo-knowledge-index && pnpm oat:validate-skills && pnpm --filter oat-docs exec markdownlint-cli2 docs/skills/repo-improve.md`
Expected: pass

**Step 5: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:p04-t01" --message "fix(p04-t01): preflight knowledge-index mapper dispatch on every provider" -- <exact files above that changed>
```

---

### Task p04-t02: (review) Route the refresh branch through the preflight and make the pins fail on regressions

**Files:**

- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `apps/oat-docs/docs/skills/repo-improve.md`

**Step 1: Understand the issue**

Review finding: C1 — Step 1's Refresh branch still says "Continue to the owned-output preflight in Step 2", so a refresh deletes generated knowledge before any route is resolved. H1 — the new pin only scans the Codex/Cursor route paragraphs: re-adding Claude-only controls to Step 5a or 5b, reverting the empty-knowledge branch, or making Step 4b treat a missing probe as read-only mode all stay green.
Location: see `reviews/archived/p04-review-2026-10-31T021449Z.md`.

**Step 2: Implement fix**

Change the Refresh branch to continue to the dispatch-route preflight, then Step 2. Assert that `model: 'haiku'`, `run_in_background` and `subagent_type: 'Explore'` occur nowhere outside the Claude route slice; that both Step 1 branches name the dispatch-route preflight; and that Step 4b keeps the route-failure (not read-only) sentence. Can-fail: seed each of the reviewer's six regressions (Claude controls in 5a, in 5b, empty branch reverted, refresh branch reverted, Step 4b read-only, preflight after Step 2) and confirm each turns the pin red. Keep `repo-improve.md` accurate ("before changing knowledge" on refresh too).

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs && pnpm exec oxlint .agents/skills/oat-repo-knowledge-index && pnpm oat:validate-skills && pnpm --filter oat-docs exec markdownlint-cli2 docs/skills/repo-improve.md`
Expected: pass; record every can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p04-t02" --message "fix(p04-t02): route the refresh branch through the preflight and make the pins fail on regressions" -- <exact files changed>
```

---

### Task p04-t03: (review) Use the generator class for write lanes and verify the probe file

**Files:**

- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Understand the issue**

Review finding: M1 — the write probe and `write-declared-outputs` lanes are labelled `class: recon`, which `oat-dispatch-subagents` defines as read-only. M2 — direct-write mode now rests on the worker's `WRITE_OK` self-report; the observable `.preflight/test.txt` check was dropped.
Location: see `reviews/archived/p04-review-2026-10-31T021449Z.md`.

**Step 2: Implement fix**

Label the write probe and direct-write lanes `generator` and keep `recon` only for read-only response lanes. Before removing `.preflight`, require `WRITE_OK` to coincide with `.preflight/test.txt` existing with content `test` and `WRITE_BLOCKED` with its absence; any disagreement is a malformed result (route failure, stop before Step 2). Pin both.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs && pnpm exec oxlint .agents/skills/oat-repo-knowledge-index && pnpm oat:validate-skills`
Expected: pass; record every can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p04-t03" --message "fix(p04-t03): use the generator class for write lanes and verify the probe file" -- <exact files changed>
```

---

### Task p04-t04: (review) Make mapper instructions provider-neutral and harden probe handling

**Files:**

- Modify: `.agents/skills/oat-repo-knowledge-index/SKILL.md`
- Modify: `apps/oat-docs/docs/skills/repo-improve.md`

**Step 1: Understand the issue**

Review finding: L1 — Step 5a/5b prompts name Claude tools ("Write tool", "Write or Bash tools"). L2 — the Codex route's writable-roots sentence makes the whole repository writable and gives no rule when per-spawn sandbox controls are not exposed. L3 — every unresolved-route stop prescribes the utility-pack install, even when the mapper projection (workflows pack) or host capability is what is missing. L4 — `.preflight` is created before Step 2's symlink guard and is not removed on a failed probe. L5 — Step 6b asks the orchestrator to splice worker output into Python source.
Location: see `reviews/archived/p04-review-2026-10-31T021449Z.md`.

**Step 2: Implement fix**

Use neutral wording ("write only your declared outputs with your host's file-write capability"; "do not modify files or run mutating commands"). Limit Codex writable roots to `.oat/repo/knowledge/` (plus `.preflight/` for the probe) and state that without a per-spawn sandbox override read-only lanes rely on the prompt constraint or the route is `unresolved-or-unsupported`. Give utility commands only on a dispatch-skill probe miss, the workflows pack or `oat sync` for a missing mapper projection, and no install advice for an unsupported host or declined authorization (align `repo-improve.md`). Run a non-mutating `lstat` check of the knowledge chain before creating `.preflight` and remove `.preflight` on every probe exit path. Have Step 6b read each accepted handle's returned text from a scratch file outside the repository instead of a source literal.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && node --test .agents/skills/oat-repo-knowledge-index/tests/refresh-owned.test.mjs && pnpm exec oxlint .agents/skills/oat-repo-knowledge-index && pnpm oat:validate-skills && pnpm --filter oat-docs exec markdownlint-cli2 docs/skills/repo-improve.md`
Expected: pass; record every can-fail proof the fix adds.

**Step 4: Commit**

```bash
oat internal commit-paths --identity "$COMMIT_IDENTITY:oat-project-review-receive:p04-t04" --message "fix(p04-t04): make mapper instructions provider-neutral and harden probe handling" -- <exact files changed>
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
capturing each result's `affectedPaths` (archive never stages). The #385
summary notes the goal-only narrowing; the #384 summary notes that admission
binds to Invocation `gate` and Reviewed Head equal to the carrier's reviewed
head instead of artifact frontmatter.

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

| Scope | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target       |
| ----- | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------- |
| p01   | code     | fixes_completed | 2026-10-31 | reviews/archived/p01-review-2026-10-31T002508Z.md           | 1b89c4cce67a9fd5b1ab1b18dce914b6611a5be3 | auto       | -                 |
| p01   | code     | passed          | 2026-10-31 | reviews/archived/p01-review-2026-10-31T004233Z.md           | b9c8c436e274083bc1bd994d99cce3cb26320d75 | auto       | -                 |
| p02   | code     | fixes_completed | 2026-10-31 | reviews/archived/p02-review-2026-10-31T010236Z.md           | 6abea4b392bf44a9535cc74fda4769366d86ee5b | auto       | -                 |
| p02   | code     | passed          | 2026-10-31 | reviews/archived/p02-review-2026-10-31T012557Z.md           | 42db803d4ef78d7bcb5c1b8c04ddbfd08709a008 | auto       | -                 |
| p03   | code     | fixes_completed | 2026-10-31 | reviews/archived/p03-review-2026-10-31T014304Z.md           | 55f83e676b328c30fbd721eb800a842c9521b378 | auto       | -                 |
| p03   | code     | passed          | 2026-10-31 | reviews/archived/p03-review-2026-10-31T015808Z.md           | 373d70cf23049ae9ba2ca4d863465404db3a5ec4 | auto       | -                 |
| p04   | code     | fixes_added     | 2026-10-31 | reviews/archived/p04-review-2026-10-31T021449Z.md           | cff79cf176a0aa2db4430eb15666db6ad8bc3c6b | auto       | -                 |
| p05   | code     | pending         | -          | -                                                           | -                                        | -          | -                 |
| final | code     | pending         | -          | -                                                           | -                                        | -          | -                 |
| plan  | artifact | fixes_completed | 2026-10-30 | -                                                           | -                                        | auto       | -                 |
| plan  | artifact | passed          | 2026-10-30 | reviews/archived/artifact-plan-review-2026-10-30T235710Z.md | -                                        | gate       | codex-6-sol-xhigh |

Plan artifact review (structured, `oat-reviewer-claude-opus-5-5-high`, ceiling exception; `Dispatch: scope=plan action=review role=reviewer provider=cursor variant=oat-reviewer-claude-opus-5-5-high policy=high source=project-state`): attempt 1 returned 3 High, 7 Medium and 8 Low; attempt 2 confirmed all 18 resolved and raised 2 Medium and 3 Low; attempt 3 confirmed those resolved and raised 1 Low (design wording drift on extraction markers). That Low was fixed after the retry bound (`oat_orchestration_retry_limit` default 2) was exhausted and was not re-reviewed; no residual findings remain open.

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 7 tasks - Stack-aware delivery exit carriers (#383), including 4 review-fix tasks
- Phase 2: 7 tasks - Gate-originated artifact admission (#384), including 5 review-fix tasks
- Phase 3: 7 tasks - Journal rewrite detection (#385), including 5 review-fix tasks
- Phase 4: 4 tasks - Knowledge-index dispatch preflight (#355), including 3 review-fix tasks
- Phase 5: 2 tasks - Release bookkeeping and gates

**Total: 27 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Triage record: `.oat/repo/pjm/triage/2026-10-30-untriaged-issues.md`
- Backlog: `BL-261030-evaluate-stacked-goal-delivery`, `BL-261030-admit-goal-exit-gate-review`, `BL-261030-flag-rewritten-committed`, `BL-261030-preflight-knowledge-index`
