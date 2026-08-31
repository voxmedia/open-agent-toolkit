---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260714-executable-backstops.md
oat_external_plan_commit: 2c6005d64f45a19e8b9eedbc977959b066d3eda0
oat_external_plan_date: '2026-08-31'
oat_execution_status: READY
oat_backlog_items:
  - BL-260714-executable-backstops
oat_issue_url: null
created: '2026-08-31T00:01:21Z'
---

# Require executable backstops for standing contract claims

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** This is an authoring-policy change with no
> unsatisfied hard dependency. Preserve the cited mechanisms as examples; do
> not retrofit them or broaden this into a repository-wide invariant migration.

## Outcome

Skill authors and project designers distinguish point-in-time observations
from standing invariant claims. A new or materially changed standing claim
ships with an executable backstop in the same PR: a stable-identity contract
test for repository-static truth, or a CLI-owned check with structured output
for runtime/lifecycle truth. The guidance is itself contract-tested.

## Source and live evidence

- Source backlog item:
  [BL-260714-executable-backstops — Executable backstops for contract claims](../../pjm/backlog/items/BL-260714-executable-backstops.md)
- Planned at: `origin/main` commit
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` on `2026-08-31`.
- Verified evidence:
  - `.agents/skills/create-oat-skill/SKILL.md:109-120` has a specific autonomy
    inventory maintenance rule, but no general rule for standing claims.
  - `.agents/skills/oat-project-design/SKILL.md:387-400` defines Error Handling
    and Testing Strategy sections without asking designs to identify the
    executable owner of invariants they introduce.
  - `packages/cli/src/validation/autonomy-gate-inventory.test.ts` is the
    repository-static inventory precedent.
  - `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
    is the shipped-copy consistency precedent.
  - `packages/cli/src/commands/project/log/rollup.ts` is the runtime/lifecycle
    precedent: the CLI owns the operation and emits structured evidence.
  - [PR #133](https://github.com/voxmedia/open-agent-toolkit/pull/133) landed
    the autonomy-contract precedent; this plan extracts its reusable authoring
    lesson rather than changing that delivered contract.

## Dependencies

| Type          | Dependency                                                             | Required state                                                                            | Current state                     |
| ------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| Soft evidence | Autonomy gate inventory, bundled-docs contract, and project-log rollup | Keep as illustrative implementations; revalidate names and behavior if any changes first. | Present on the planning baseline. |

There are no unsatisfied hard dependencies.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 2c6005d64f45a19e8b9eedbc977959b066d3eda0..origin/main -- .agents/skills/create-oat-skill .agents/skills/oat-project-design packages/cli/src/validation/autonomy-gate-inventory.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/project/log packages/cli/src/validation/skills.test.ts
```

If the authoring or design section moved, remap the semantic insertion point.
If any precedent changed meaning, refresh the example instead of preserving a
stale name.

## Repository conventions

- Canonical skill edits require one frontmatter version bump per changed skill
  in the final PR diff.
- Add stable semantic assertions to `packages/cli/src/validation/skills.test.ts`;
  never guard prose by physical line number.
- Run `oat sync --scope all` after canonical edits and inspect managed views.
- Run `pnpm lint && pnpm format` because canonical skill files are touched.
- Bundled skill changes require all five public package versions and
  `pnpm-lock.yaml` to move together.
- Run the complete repository Definition of Done in its documented order.
- Do not push or open a PR unless instructed.

## Scope

### In scope

- `.agents/skills/create-oat-skill/SKILL.md` — normative authoring rule.
- `.agents/skills/oat-project-design/SKILL.md` — concise design-time echo in
  Error Handling/Testing Strategy.
- `packages/cli/src/validation/skills.test.ts` — stable contract assertions.
- Skill versions, managed provider views, five public package versions, and
  `pnpm-lock.yaml`.

### Out of scope

- Auditing or retrofitting every existing prose claim.
- Replacing the three cited precedent mechanisms.
- Requiring an executable test for point-in-time observations, rationale,
  examples, or deliberately non-normative guidance.
- Prescribing one universal test framework or structured-result schema.

## Current state

The repository has several effective backstops, but their shared rule is
implicit. Authors can still write “every,” “always,” ordering, completeness,
or exhaustiveness claims without identifying how drift will fail in CI or at
the owning CLI boundary. The new rule must be strong enough to change author
behavior and narrow enough not to turn ordinary explanatory prose into tests.

Use this classification:

- **point-in-time observation:** describes evidence at a named baseline; cite
  the evidence and revalidation trigger, but no permanent backstop is required;
- **repository-static standing invariant:** can be decided from tracked files;
  use a contract test keyed by paths plus semantic IDs/content, never lines;
- **runtime/lifecycle standing invariant:** depends on execution state or
  ordering; place enforcement in the owning CLI/runtime boundary and expose a
  structured result that callers and tests can verify.

## Implementation steps

### 1. Add the canonical authoring rule

Add an “Executable backstops for contract claims” subsection to
`create-oat-skill/SKILL.md` near the existing autonomy inventory guidance.
Define the three claim classes above, the same-PR requirement, stable identity,
and the requirement to state the maintenance rule inside the guarded artifact.
State that claim and backstop cannot be split across follow-up work.

Keep examples short and point to the three existing mechanisms. Do not imply
that a CLI command is necessary when a repository-static test is sufficient.
Bump the skill version exactly once.

**Verify:** the guidance can classify one example of each claim type without
depending on a line number or a provider-specific tool.

### 2. Add the design-time echo

In `oat-project-design/SKILL.md`, add a concise requirement spanning Error
Handling and Testing Strategy: each standing invariant introduced by a design
must name its executable owner and verification method. Point authors to the
full create-oat-skill rule instead of duplicating its taxonomy. Bump the skill
version exactly once.

Do not add a new design artifact section or change collaborative review flow.

**Verify:** the existing section list and requirement-to-test mapping remain
ordered and intact.

### 3. Backstop the new guidance

Extend `packages/cli/src/validation/skills.test.ts` with semantic assertions
that both canonical surfaces retain the standing-invariant requirement, the
repository-static/runtime distinction, stable identity, and same-PR timing.
Assert concepts through bounded section extraction and resilient patterns, not
an exact paragraph snapshot.

Add a red/green mutation proof that removing the same-PR obligation or changing
stable identity to physical line matching fails the focused assertion.

**Verify:** the focused validation test fails under each mutation, then passes
after restoration.

### 4. Refresh shipped views and release bookkeeping

Run `oat sync --scope all`, inspect generated changes, update exact skill-version
pins, bump all five public packages together, and update `pnpm-lock.yaml`.

**Verify:** `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`pnpm lint`, and `pnpm format` all exit zero.

### 5. Run complete gates

Run the repository Definition of Done in documented order. Fetch `origin/main`
immediately before version validation and run the focused validation test
independently so Turbo cache replay is not the only evidence.

## Test plan

- Focused semantic contract checks for both canonical skills.
- Red/green mutation for same-PR timing and no-line-number identity.
- Skill structure and exact version-bump validation.
- Managed-view consistency after `oat sync --scope all`.
- Complete repository gates, including release validation and docs build.

## Done criteria

- [ ] Skill authors can distinguish point-in-time and standing claims.
- [ ] Static and runtime claims name the correct class of executable owner.
- [ ] Stable identity, in-artifact maintenance, and same-PR timing are explicit.
- [ ] Project designs echo the obligation without duplicating the full rule.
- [ ] The guidance has a non-vacuous red/green contract test.
- [ ] Both skill versions and all five public package versions are correct.
- [ ] Managed views and all repository gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the change would require a repository-wide migration of existing claims;
- a cited precedent no longer represents the stated enforcement class;
- the contract test can pass after either required rule is removed;
- guidance would force tests for point-in-time or non-normative prose;
- a named verification gate fails twice after one bounded correction; or
- scope expands beyond the two canonical skills and their contract test.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, both cited
skills, all three precedent mechanisms, and the focused validation test when
main advances materially from
`2c6005d64f45a19e8b9eedbc977959b066d3eda0`, cited paths or intent change,
another PR implements this guidance, or a load-bearing absence cannot be
reproduced. Refresh or supersede the plan before executing stale evidence.

## Review focus

- Challenge the boundary between standing claims and ordinary prose.
- Confirm runtime claims remain owned by runtime/CLI code, not prose tests.
- Confirm the new rule dogfoods a non-vacuous executable backstop.
- Confirm no existing precedent or unrelated claim was retrofitted.
