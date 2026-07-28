---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # pause only after the final phase
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # sequential; see Parallelism
oat_phase_review_gate:
  enabled: true
  phases: ['p02', 'p05']
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: false
oat_generated: false
---

# Implementation Plan: rereview-scope-narrowing

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make re-review scope narrowing the default behavior, with `false` as the explicit opt-out, and replace the local rail's unsound commit-message narrowing with guarded prior-reviewed-commit ranges so that silent narrowing is trustworthy.

**Architecture:** Narrowing resolves a range from a prior review in the same lineage, guards it for existence and ancestry, classifies the result, and fails open to full scope. Provenance is written to both the review artifact and the tracked plan review row so it survives artifact archival. The tested helper module carries the canonical semantics; both rails mirror it in prose.

**Tech Stack:** TypeScript ESM, vitest, oxlint/oxfmt, pnpm workspaces, Turborepo. Agent and skill contracts are Markdown with YAML frontmatter.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): match prior reviews by lineage`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Declared sequential (`oat_plan_parallel_groups: []`).

The write sets of the two rail phases (p03 local, p04 remote) are genuinely disjoint, so a naive file-boundary analysis would permit running them concurrently. They are kept sequential anyway because both phases are prose mirrors of the same semantics defined in p01, and the repository already documents that these mirrors drift silently without any test failing. Two agents independently transcribing the same guard into two skill files is precisely the condition that produces divergence, and no test would catch it. The phases are also small enough that concurrency would buy little.

p05 must follow p01–p04: flipping the default before the semantics are sound would leave intermediate commits in which narrowing is both silent and wrong.

---

## Dispatch Profile

_No explicit constraints. Runtime selection chooses the tier._

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Phases p01 and p05 change TypeScript with existing test suites and use the TDD shape. Phases p02, p03, p04, and p06 change Markdown contracts and documentation, where the meaningful verification is contract self-consistency and cross-surface parity rather than a unit test; those tasks use a review-and-verify shape.

## Phase 1: Range resolution core

Establishes the canonical semantics in the tested helper module before either rail mirrors them.

### Task p01-t01: Match prior reviews by lineage

**Files:**

- Modify: `packages/cli/src/review-remote/narrowing.ts`
- Modify: `packages/cli/src/review-remote/narrowing.test.ts`

**Step 1: Write test (RED)**

Extend the tuple-matching tests so a candidate prior review must match the current review's lineage, not merely its project and scope:

- a gate-originated prior review with the same gate target and scope is eligible for a gate re-review
- a gate-originated prior review with a **different** gate target is not eligible
- a lifecycle (non-gate) prior review is not eligible for a gate invocation
- a gate-originated prior review is not eligible for a lifecycle invocation
- existing same-project/same-scope lifecycle matching continues to pass unchanged

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: New lineage tests fail (RED); pre-existing tests pass.

**Step 2: Implement (GREEN)**

Extend `PriorReview` and `NarrowingInput` with the lineage discriminator (invocation kind plus gate target when the invocation is a gate) and fold it into `matchesTuple`. Absent lineage on a legacy record means not eligible, consistent with fail-open-to-full-scope.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Keep `matchesTuple` a single readable predicate; do not fan lineage handling out across the module.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/narrowing.ts packages/cli/src/review-remote/narrowing.test.ts
git commit -m "feat(p01-t01): match prior reviews by review lineage"
```

---

### Task p01-t02: Narrow by default and remove the prompt

**Files:**

- Modify: `packages/cli/src/review-remote/narrowing.ts`
- Modify: `packages/cli/src/review-remote/narrowing.test.ts`
- Modify: `packages/cli/src/review-remote/reviewer-dispatch.ts` (only if the result shape it consumes changes)

**Step 1: Write test (RED)**

- narrowing proceeds with no prompt when the preference is unset
- narrowing proceeds with no prompt when the preference is `true`
- the preference set to `false` yields full scope without consulting a prior review
- guard failure still yields full-scope fallback with its reason preserved
- explicit force-narrow still turns guard failure into a hard error

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: Prompt-related expectations fail (RED).

**Step 2: Implement (GREEN)**

Remove the `prompted` concept from the result types and stop deriving it from `autoNarrow`. Replace the `autoNarrow` input with a resolved three-state preference where unset and `true` both narrow. Update `reviewer-dispatch.ts` only if it reads the removed field.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts src/review-remote/reviewer-dispatch.test.ts`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Delete now-unreachable prompt branches rather than leaving them behind a permanently false flag.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/
git commit -m "feat(p01-t02): narrow re-review scope by default and drop the prompt"
```

---

### Task p01-t03: Classify the resolved range

**Files:**

- Modify: `packages/cli/src/review-remote/narrowing.ts`
- Modify: `packages/cli/src/review-remote/narrowing.test.ts`

**Step 1: Write test (RED)**

- a range with no commits classifies as `empty`
- a range touching only the project's own tracking directory classifies as `bookkeeping-only`
- a range touching a bundled template or a durable repository reference record classifies as `substantive`, not bookkeeping
- a range mixing project tracking files and source files classifies as `substantive`
- all three classifications still return a dispatchable range

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: Classification tests fail (RED).

**Step 2: Implement (GREEN)**

Add the classification to the narrow-range result. Scope the bookkeeping test to the project's own directory rather than the toolkit directory as a whole. The classification is reporting only — it must not gate, skip, or shorten the review — so a path-based test is sufficient here and the stronger closeout-only corroboration standard is deliberately not used.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Record in a short comment that the path-based test is sufficient only because nothing is skipped on its result, so a later change that makes it authoritative knows it must be strengthened first.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/
git commit -m "feat(p01-t03): classify resolved re-review ranges"
```

---

## Phase 2: Provenance contract

Makes the reviewed commit durable and defines what a narrowed artifact must disclose. HiLL checkpoint after this phase.

### Task p02-t01: Record the reviewed head on the review artifact

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`

**Step 1: Change**

Add the reviewed head commit to the review artifact frontmatter template as a required field for code reviews, and add the narrowed-review disclosure fields: the resolved range, and the prior artifact path plus prior reviewed head when the review narrowed.

Specify how the value is obtained, not just that it exists. The reviewer resolves the **full 40-character** SHA of the head of its authoritative review range and records that. An abbreviated SHA, a symbolic ref, or a range string is invalid: the guard added in p01 performs object-existence and ancestry checks against this value, so anything else silently prevents narrowing from ever applying. Mirror the remote rail, which already captures a full 40-character head SHA for the same purpose.

Add a rule to the artifact template section: a narrowed review must not restate requirements-coverage claims it did not itself verify. It either references the prior artifact's coverage or marks inherited rows as inherited.

Bump frontmatter `version: 1.1.9` → `1.2.0`.

**Step 2: Verify**

Confirm the added fields do not collide with the existing gate-only frontmatter block, that the gate parsing contract paragraph still holds, and that the structured-output mode section is unaffected (it writes no artifact and therefore records no reviewed head).

Run: `pnpm exec oxfmt --check .agents/agents/oat-reviewer.md`
Expected: No formatting diff

**Step 3: Commit**

```bash
git add .agents/agents/oat-reviewer.md
git commit -m "feat(p02-t01): record reviewed head and narrowing provenance on review artifacts"
```

---

### Task p02-t02: Migrate the review ledger to carry lineage-qualified provenance

**Files:**

- Modify: `packages/control-plane/src/state/reviews.ts`
- Modify: `packages/control-plane/src/state/reviews.test.ts`
- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/control-plane/README.md`
- Modify: `.oat/templates/plan.md`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: `.agents/skills/oat-project-review-receive-remote/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Write test (RED)**

The parser is the blocking constraint and must move first. `parseTableRow` currently returns `null` unless the row has exactly five cells, and additionally rejects any empty cell, so widening the table without changing the parser would make **every** row unparseable and silently present an empty review ledger to `oat project status` and everything routing off it.

Add tests covering:

- an existing five-column row still parses unchanged, with the new fields absent
- a widened row parses, exposing the reviewed head and the lineage qualifier
- a widened row with empty new cells parses, treating the new fields as absent rather than malformed
- a reviewed head that is not a full 40-character SHA is rejected as absent rather than accepted
- row count and ordering are unchanged for a mixed table containing both shapes

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/reviews.test.ts`
Expected: New tests fail (RED); existing tests pass.

**Step 2: Implement (GREEN)**

Widen the parser to accept both shapes rather than a fixed cell count, and make the new cells optional. Extend the public `ReviewStatus` type with the new optional fields and update `README.md`, since this is a published package's public surface.

Persist **lineage**, not just the reviewed head. A bare head cannot distinguish a lifecycle review from a gate review, nor one gate target from another. Because the durable row exists precisely for the case where the artifact has been archived, a head-only row would let a re-review inherit a lifecycle or different-target baseline and quietly break the independence guarantee in Decision 9 — defeating the guarantee in exactly the situation the row was added to protect. Record the invocation kind and, for gate reviews, the gate target alongside the head.

Then widen the template table and update every canonical ledger writer — local receive, remote receive, and provide — to populate or preserve the new cells rather than rewriting rows back to five columns.

Run: `pnpm --filter @open-agent-toolkit/control-plane test && pnpm --filter @open-agent-toolkit/cli test`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Keep the preservation rule intact: rows are never deleted, and a writer that does not understand a cell must leave it alone rather than blank it.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane lint && pnpm --filter @open-agent-toolkit/control-plane type-check && pnpm format`
Expected: No errors, no formatting diff

Bump `oat-project-review-receive` `1.5.9` → `1.6.0`, `oat-project-review-receive-remote` `1.4.2` → `1.5.0`, and `oat-project-review-provide` `1.3.22` → `1.4.0`. Where a skill is also edited in a later phase, the branch still carries exactly one bump per skill.

**Step 5: Commit**

```bash
git add packages/control-plane/src/state/reviews.ts packages/control-plane/src/state/reviews.test.ts
git add packages/control-plane/src/types.ts packages/control-plane/README.md
git add .oat/templates/plan.md
git add .agents/skills/oat-project-review-receive/SKILL.md
git add .agents/skills/oat-project-review-receive-remote/SKILL.md
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "feat(p02-t02): migrate review ledger to lineage-qualified provenance"
```

---

### Task p02-t03: Fail open when durable lineage cannot be established

**Files:**

- Modify: `packages/cli/src/review-remote/narrowing.ts`
- Modify: `packages/cli/src/review-remote/narrowing.test.ts`

**Step 1: Write test (RED)**

With the artifact archived or absent, and only the tracked row available:

- a lifecycle row is not eligible for a gate invocation, and falls back to full scope
- a gate row from a different target is not eligible, and falls back to full scope
- a gate row from the same target is eligible and narrows
- a gate row is not eligible for a lifecycle invocation
- a legacy row carrying a head but no lineage qualifier falls back to full scope rather than being assumed to match

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: New tests fail (RED).

**Step 2: Implement (GREEN)**

Apply the p01-t01 lineage predicate to row-sourced prior reviews on the same terms as artifact-sourced ones. Unknown lineage is not a match.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review-remote/narrowing.test.ts`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Ensure artifact-sourced and row-sourced candidates run through one predicate, so the two paths cannot drift.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/review-remote/
git commit -m "feat(p02-t03): fail open when durable lineage cannot be established"
```

---

## Phase 3: Local rail rewrite

Replaces the commit-message narrowing with the semantics established in p01.

### Task p03-t01: Replace Step 3a narrowing with guarded prior-head ranges

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Change**

Replace the commit-message grep and fixed lookback window in Step 3a with:

- resolve the prior reviewed head in order — review artifact frontmatter, then the tracked plan review row, then full scope
- restrict candidates to the same lineage per p01-t01
- run the existence and ancestry guard before accepting a range
- fall back to full scope on no prior review, missing head, failed guard, or disagreement between the two provenance sources, stating the reason

State explicitly that a gate invocation narrows only from its own prior run on the same target, and never from a lifecycle review.

**Step 2: Verify**

Confirm the resulting Step 3a describes the same guard and the same range as `packages/cli/src/review-remote/narrowing.ts`, field for field. Confirm initial reviews remain unaffected and that explicit scope tokens still take priority.

Run: `pnpm exec oxfmt --check '.agents/skills/oat-project-review-provide/SKILL.md'`
Expected: No formatting diff

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "fix(p03-t01): narrow local re-reviews from guarded prior reviewed head"
```

---

### Task p03-t02: Drop the prompt and print a classified resolution line

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Change**

Remove the interactive confirm from the re-review path. Print one resolution line stating the resolved range, its classification (empty, bookkeeping-only, or substantive), and the reason narrowing applied or did not.

State the escape hatch precisely, because a loose reading disables the feature. Only an explicitly supplied base commit (`base_sha=<sha>`) or an explicit `<sha1>..<sha2>` range overrides automatic narrowing. Nominal scope identifiers — `pNN`, `pNN-pMM`, `final`, and task IDs — do **not** override it and remain eligible for narrowing. Every ordinary re-review supplies a nominal identifier, so treating those as an override would bypass narrowing on every invocation and defeat the change entirely. With that distinction stated, no capability is lost by removing the prompt.

Add the narrowed-artifact disclosure requirement from p02-t01 to the reviewer payload this skill builds, so a narrowed review is told to name the prior artifact it builds on.

Bump `oat-project-review-provide` frontmatter `version: 1.3.22` → `1.4.0`.

**Step 2: Verify**

Confirm no remaining prompt path in the re-review flow, and that the Tier 3 inline reset path is consistent with the new narrowing rather than still reading every changed file from a full-scope assumption.

Run: `pnpm exec oxfmt --check '.agents/skills/oat-project-review-provide/SKILL.md'`
Expected: No formatting diff

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "feat(p03-t02): drop the local re-review prompt and report the resolved range"
```

---

## Phase 4: Remote rail alignment

### Task p04-t01: Align both remote provide skills

**Files:**

- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-review-provide-remote/SKILL.md`

**Step 1: Change**

Change the documented preference handling so unset narrows without prompting and only `false` forces full scope. Keep the existing per-invocation narrowing flags. Add the range classification to the reported narrowing decision. Add the lineage restriction to each rail's prior-review filter.

Preserve the rails' actual provenance ownership rather than forcing local lifecycle storage onto them:

- the project remote rail resolves prior reviewed heads from target-qualified GitHub review marker blocks for the same project and scope
- the ad-hoc remote rail resolves them from ad-hoc GitHub review marker blocks and has no project-plan fallback
- neither remote rail writes or reads the local lifecycle Reviews table merely to satisfy parity with the local rail

The shared helper semantics begin after a rail has supplied a candidate prior review. Candidate discovery remains rail-specific.

Bump frontmatter versions: `oat-project-review-provide-remote` `1.0.4` → `1.1.0`, `oat-review-provide-remote` `1.0.3` → `1.1.0`.

**Step 2: Verify**

Diff the narrowing prose in both skills against `narrowing.ts` and against the local rail's new Step 3a. All three must describe the same lineage match, existence/ancestry guard, fallback reasons, classification vocabulary, and preference behavior. Do **not** require the same provenance resolution order: local lifecycle reviews use artifacts plus the tracked plan row, project/ad-hoc remote reviews use their own GitHub marker blocks, and configured gates use target-qualified gate-owned state.

Run: `pnpm exec oxfmt --check '.agents/skills/oat-project-review-provide-remote/SKILL.md' '.agents/skills/oat-review-provide-remote/SKILL.md'`
Expected: No formatting diff

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide-remote/SKILL.md .agents/skills/oat-review-provide-remote/SKILL.md
git commit -m "feat(p04-t01): align remote rails to default narrowing and lineage matching"
```

---

## Phase 5: Config default flip

Last behavior change, so no intermediate commit narrows silently on unsound semantics. HiLL checkpoint after this phase.

### Task p05-t01: Default the preference to narrow

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

- resolving the preference with nothing configured returns `true` with source `default`
- an explicit `false` at any layer still resolves to `false` with the correct source
- an explicit `true` continues to resolve to `true`
- the config metadata entry reports the new default

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: Default-value tests fail (RED).

**Step 2: Implement (GREEN)**

Change the resolved default from `null` to `true`, and update the config metadata `defaultValue` and description to describe narrowing as the default with `false` as the opt-out. Remove the "when unset, the skill prompts" language.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: All tests pass (GREEN).

**Step 3: Refactor**

Check no other resolved default in the same table was disturbed.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/ packages/cli/src/commands/config/
git commit -m "feat(p05-t01): default re-review scope narrowing to enabled"
```

---

## Phase 6: Documentation and release

### Task p06-t01: Update documentation

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Change**

Update the three places the preference is described so they state the new default and drop the prompt. Rewrite the re-review narrowing section to describe prior-reviewed-head ranges, the guard, the lineage rule, and the resolution order.

Set expectations honestly: narrowing applies opportunistically, and rebase or integration-merge heavy histories will often fall back to full scope by design. Remove the user-scope guidance example that sets the preference to `true`, which is now redundant.

**Step 2: Verify**

Run: `pnpm format && pnpm build:docs`
Expected: No formatting diff; docs build succeeds

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/
git commit -m "docs(p06-t01): document default re-review narrowing and guard semantics"
```

---

### Task p06-t02: Verify cross-surface semantic parity

**Files:**

- Read-only across: `packages/cli/src/review-remote/narrowing.ts`, `.agents/skills/oat-project-review-provide/SKILL.md`, `.agents/skills/oat-project-review-provide-remote/SKILL.md`, `.agents/skills/oat-review-provide-remote/SKILL.md`
- Modify: only whichever canonical/source surface is found to disagree

**Step 1: Change**

No planned edit. This task exists because the repository documents that the helper modules and skill prose mirror each other with no test enforcing agreement, and this change edits all four surfaces. Each earlier task checked itself against the module in isolation; this task checks the finished canonical surfaces together before generated provider views or release validation are produced.

**Step 2: Verify**

Confirm all four surfaces agree on the shared narrowing semantics, and correct only the canonical/source files that disagree:

- lineage matching, including that a configured gate narrows only from its own prior run on the same target and scope
- existence and ancestry guards
- explicit force-narrow turns guard failure into a hard error; the default path fails open to full scope with a reason
- classification vocabulary (`empty`, `bookkeeping-only`, `substantive`) and the rule that classification never gates, skips, or shortens a review
- unset and `true` both narrow, and only `false` forces full scope
- nominal task/phase/final scope identifiers remain eligible for narrowing, while `base_sha=<sha>` and an explicit SHA range override it

Verify provenance **by rail**, not as one shared resolution order:

- local lifecycle rail: review artifact, then lineage-qualified tracked Reviews row, then full scope
- project remote rail: same-project/same-scope GitHub review marker blocks
- ad-hoc remote rail: ad-hoc GitHub review marker blocks with no project key
- configured gate rail: target-qualified gate-owned state/artifacts

No rail may inherit another rail's coverage merely because a reviewed head exists.

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm format`
Expected: No errors, no formatting diff

**Step 3: Commit**

Create a commit only if reconciliation changed a source surface. Stage exactly the files changed by this task, not the entire `.agents/` tree.

```bash
git add packages/cli/src/review-remote/narrowing.ts packages/cli/src/review-remote/narrowing.test.ts
git add .agents/skills/oat-project-review-provide/SKILL.md
git add .agents/skills/oat-project-review-provide-remote/SKILL.md
git add .agents/skills/oat-review-provide-remote/SKILL.md
git diff --cached --quiet || git commit -m "chore(p06-t02): reconcile narrowing semantics across module and rails"
```

---

### Task p06-t03: Refresh provider views, bump versions, validate release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: generated provider views corresponding to the canonical reviewer agent and review skills changed by this plan

**Step 1: Change**

After p06-t02 has reconciled all canonical surfaces, refresh provider-linked views and bump all five public packages together from their then-current version to the next version. Both the CLI source changes and bundled asset changes under `.agents/` and `.oat/templates/` independently require the lockstep bump.

Run: `oat sync --scope all`

**Step 2: Verify**

Confirm each changed canonical skill and reviewer agent carries exactly one frontmatter version increment across the final branch diff, and that every generated provider view matches its canonical source. Because this is the last task, no later task may edit canonical assets or shipped source without repeating sync and release validation.

Run: `pnpm build && pnpm test && pnpm lint && pnpm type-check && pnpm format && pnpm release:validate`
Expected: All pass. This is the definition of done for publishable package changes.

**Step 3: Commit**

Stage the five lockstep manifests explicitly. Then inspect `git diff --name-only` and stage only the lockfile and generated provider-view paths produced for the changed canonical assets; do not stage whole provider directories.

```bash
git add packages/cli/package.json
git add packages/control-plane/package.json
git add packages/docs-config/package.json
git add packages/docs-theme/package.json
git add packages/docs-transforms/package.json
git add pnpm-lock.yaml
git add .claude/agents/oat-reviewer.md .cursor/agents/oat-reviewer.md
git add .claude/skills/oat-project-review-provide/SKILL.md .cursor/skills/oat-project-review-provide/SKILL.md
git add .claude/skills/oat-project-review-provide-remote/SKILL.md .cursor/skills/oat-project-review-provide-remote/SKILL.md
git add .claude/skills/oat-project-review-receive/SKILL.md .cursor/skills/oat-project-review-receive/SKILL.md
git add .claude/skills/oat-project-review-receive-remote/SKILL.md .cursor/skills/oat-project-review-receive-remote/SKILL.md
git add .claude/skills/oat-review-provide-remote/SKILL.md .cursor/skills/oat-review-provide-remote/SKILL.md
git add .cursor/agents/oat-reviewer-*.md
git add .codex/agents/oat-reviewer*.toml
git commit -m "chore(p06-t03): sync provider views and bump public packages"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target          |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01    | code     | fixes_completed | 2026-07-28 | reviews/archived/p01-review-2026-07-28T204348Z.md           | -                                        | -          | -                    |
| p02    | code     | fixes_completed | 2026-07-28 | reviews/archived/p02-review-2026-07-28T211745Z.md           | 33e4506ef7211d75faa30402ea6b1a11e278e475 | auto       | -                    |
| p03    | code     | fixes_completed | 2026-07-28 | reviews/p03-review-2026-07-28T220431Z.md                    | f914b9ea1e8c24de7cf81dab6aec0f01e3e37d0f | auto       | -                    |
| p04    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p05    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p06    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-07-27 | inline (structured)                                         | -                                        | -          | -                    |
| spec   | artifact | n/a             | -          | -                                                           | -                                        | -          | -                    |
| design | artifact | n/a             | -          | -                                                           | -                                        | -          | -                    |
| plan   | artifact | received        | 2026-07-28 | reviews/archived/artifact-plan-review-2026-07-28T004222Z.md | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-07-28 | reviews/archived/artifact-plan-review-2026-07-28T182554Z.md | -                                        | -          | -                    |
| p01    | code     | passed          | 2026-07-28 | reviews/archived/p01-review-2026-07-28T205203Z.md           | -                                        | -          | -                    |
| p02    | code     | passed          | 2026-07-28 | reviews/archived/p02-review-2026-07-28T212511Z.md           | 0908e1cf87a50f6fd81f10ab30735ac88e5e9813 | auto       | -                    |
| p02    | code     | passed          | 2026-07-28 | reviews/archived/p02-review-2026-07-28T214026Z.md           | a53071f308e7f6db07c4f0bc0ddeef7ac6c17b9a | gate       | cursor-fable-5-xhigh |
| p03    | code     | passed          | 2026-07-28 | reviews/p03-review-2026-07-28T221100Z.md                    | 28afd27b4959f4ef535f961b7348e5d0dfeb438b | auto       | -                    |

`spec` and `design` are `n/a` because this is a quick-mode project that produces neither artifact. The rows are retained rather than deleted, per the plan template's preservation rule.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - canonical range resolution (lineage, default narrowing, classification)
- Phase 2: 3 tasks - durable lineage-qualified provenance, ledger migration, and narrowed-artifact disclosure
- Phase 3: 2 tasks - local rail rewritten onto guarded prior-head ranges
- Phase 4: 1 task - remote rails aligned
- Phase 5: 1 task - config default flipped to narrow
- Phase 6: 3 tasks - documentation, cross-surface parity verification, provider sync and lockstep version bump

**Total: 13 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Design: N/A (quick mode, straight to plan)
- Spec: N/A (quick mode)
- Upstream feedback that motivated this work: `.oat/projects/local/slow-review-triage/slow-review-feedback.md` (untracked local reference)
- Canonical narrowing semantics: `packages/cli/src/review-remote/narrowing.ts`
- Module/skill drift warning: `packages/cli/src/review-remote/README.md`
- Closeout-only classifier referenced by the deferred skip-entirely idea: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
