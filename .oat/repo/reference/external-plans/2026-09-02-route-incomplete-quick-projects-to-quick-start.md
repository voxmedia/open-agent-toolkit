---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260830-clarify-quick-mode-resume.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260830-clarify-quick-mode-resume
oat_issue_url: null
created: '2026-09-02T23:59:00Z'
---

# Route incomplete quick projects to quick-start from plan, progress, and next

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This is a
> skills-only change: no CLI routing code for quick-mode resume exists to
> modify. Land before the consolidation plan, which edits the same
> quick-start Step 0.5 block.

## Outcome

An incomplete quick-workflow project never dead-ends. `oat-project-plan`,
`oat-project-progress`, and `oat-project-next` all route a quick project
whose plan is not implementation-ready to `oat-project-quick-start` with a
load-and-follow clause, explain why spec-driven planning does not apply, and
give a runnable continuation command. Quick-start documents how it resumes an
existing incomplete quick project in place without re-scaffolding. One
plan-readiness discriminator is defined once and referenced everywhere.

## Source and live evidence

- Source backlog item:
  [BL-260830-clarify-quick-mode-resume — Clarify quick-mode resume routing from oat-project-plan](../../pjm/backlog/items/BL-260830-clarify-quick-mode-resume.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-project-plan/SKILL.md:22` and `:113-119` — quick
    mode stops with "Run `oat-project-implement` to begin execution" and
    exits, with no check that `plan.md` is more than a stub. This is the
    dead end.
  - `.agents/skills/oat-project-progress/SKILL.md:266` — the quick routing
    row `plan / in_progress → Continue oat-project-plan`, a two-hop dead end.
  - `.agents/skills/oat-project-next/SKILL.md:244-245` — tier 3 already
    routes to quick-start; tier 2 (a substantive but stub plan) still routes
    to implement.
  - `.agents/skills/oat-project-quick-start/SKILL.md:120-138` — Step 0.5 has
    no documented resume branch for an existing incomplete quick project.
  - `oat_workflow_mode` is the canonical mode field (`oat-project-plan:19,110`,
    `oat-project-progress:174,197`, `oat-project-next:130`; written by
    `oat-project-quick-start:152` and
    `packages/cli/src/commands/project/new/scaffold.ts:36,123,163`).
  - No `packages/cli/src/commands/project/next/` exists; routing lives only in
    skill prose.
  - `review-skill-contracts.test.ts:1677` (`routes absent-checkout synced and
local-only projects through all-scope selection`; re-anchored 2026-09-04
    after PR #255) is the nearest routing
    contract test; no quick-mode routing test exists.
- Constraining decisions: none.

## Dependencies

| Type             | Dependency                                                                                                                                                  | Required state                                                                                                                  | Current state |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Soft ordering    | Sibling plan [Make consolidated-project retirement semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                 | Land this plan first; both edit quick-start Step 0.5 and its `version:` line.                                                   | Pending.      |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                                  | Write every routing pointer with an explicit load-and-follow clause so its corpus test stays green.                             | Pending (W2). |
| Soft ordering    | W5 group 4 plan [Defer activeProject clearing on shared and local archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md) | Runs after this plan; both edit `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`, so never in one parallel group. | Pending.      |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                                    | Required update                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Minor    | `.agents/docs/autonomy-contract.md` (inventory line refs), `review-skill-contracts.test.ts` (+17 lines; pattern case now `:1677`). | Rebase; re-run the inventory test; re-map plan/quick-start rows if shifted. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `.agents/docs/autonomy-contract.md`, `apps/oat-docs/docs/workflows/projects/picking-up-projects.md` (in scope here).               | Re-read the mirror sentence in `picking-up-projects.md` before editing; re-run the inventory test.                                                                           |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts apps/oat-docs/docs/workflows/projects/picking-up-projects.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If any routing row or the quick branch of `oat-project-plan` changed,
re-anchor before editing.

## Repository conventions

- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps` (four skills change, four bumps), `pnpm format`.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/autonomy-gate-inventory.test.ts`.
- Implementation pattern: `oat-project-next/SKILL.md:418-441` load-and-follow
  wording; keep routing tables tabular.
- Shipped skills require the five-package lockstep bump.

## Scope

### In scope

- `oat-project-plan/SKILL.md:18-24`, `:108-125` — replace the dead end.
- `oat-project-progress/SKILL.md:266` — retarget the row.
- `oat-project-next/SKILL.md:245` — add a plan-readiness discriminator
  rather than overloading tier.
- `oat-project-quick-start/SKILL.md:120-138` — document resume in place.
- Four `version:` bumps; `review-skill-contracts.test.ts` — three cases;
  `picking-up-projects.md` — mirror sentence; five package manifests.

### Out of scope

- `packages/cli/src/commands/project/**` — no routing code exists.
- `oat-project-import-plan` — its stop is correct and separate.
- `scaffold.ts` — mode is written correctly already.

## Current state

A quick project with a template or stub `plan.md` is told to run implement
(plan skill) or to continue plan (progress skill), which immediately stops.
Only `oat-project-next` tier 3 routes correctly. Nothing defines what
"implementation-ready" means for a quick plan.

## Implementation steps

### 1. Define plan readiness once

In `oat-project-quick-start/SKILL.md` add a short clause: a quick `plan.md`
is implementation-ready when it has at least one phase with concrete tasks;
a template or stub is not. Reference it from the other three skills.

**Verify:** `pnpm oat:validate-skills` → exit 0.

### 2. Fix `oat-project-plan`

At `:22` and `:113-119` keep the stop but route: not-ready → load
`oat-project-quick-start/SKILL.md` and follow it; ready → load
`oat-project-implement/SKILL.md`; state why spec-driven planning does not
apply and give the runnable command.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts` → green.

### 3. Fix the two routing rows

`oat-project-progress:266` and `oat-project-next:245` with the readiness
discriminator and load-and-follow wording.

**Verify:** same command → green.

### 4. Document quick-start resume

Step 0.5: an existing active quick project with a non-ready plan resumes at
the plan step in place and does not re-scaffold.

**Verify:** same command → green.

### 5. Add the contract tests, bump, gate

Three cases in the test plan; four skill bumps; five package bumps; inventory
test for plan/quick-start row drift; format.

**Verify:** `pnpm exec vitest run ... -t 'quick'` → pass;
`pnpm run check:skill-bumps`, `pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts`,
then the eight AGENTS.md gates.

## Test plan

Pattern: `review-skill-contracts.test.ts:1677`.

- `routes incomplete quick projects to quick-start from plan, progress, and next`.
- `explains why spec-driven planning stops and names a recoverable continuation`.
- `documents quick-start resume for an existing incomplete quick project`.
- Regression proved: all three acceptance criteria, including the stub-plan
  case that has zero coverage today.

## Done criteria

- [ ] All three skills route not-ready quick projects to quick-start with
      load-and-follow wording; ready projects still go to implement.
- [ ] Quick-start documents in-place resume.
- [ ] Tests fail on revert and pass on the change; inventory test green.
- [ ] Four skill bumps, lockstep bump, format, and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- readiness requires a new CLI probe (scope becomes a CLI change);
- retargeting the tier-2 row would break another intentional route in the
  `oat-project-next` table (add a readiness column instead);
- any of the four skill bumps is missing at `check:skill-bumps`; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, and the routing
prose when substantial time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, a named landing event lands,
cited routing rows change, or a load-bearing claim cannot be reproduced.
Apply the landing-event table above.

## Review focus

- One readiness definition, referenced not duplicated.
- No bare "run skill X" pointer without a load clause.
- Tier semantics in `oat-project-next` are preserved.
