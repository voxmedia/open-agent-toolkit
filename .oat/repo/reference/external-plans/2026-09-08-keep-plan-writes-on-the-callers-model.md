---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260908-keep-external-plan-writes.md
oat_external_plan_commit: a4c68cf893caa12139f9ee2196875ef05302011e
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-keep-external-plan-writes
oat_issue_url: null
created: '2026-09-08T21:33:45Z'
---

# Keep external-plan writes on the caller's model class in oat-repo-improve

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This plan edits
> two lifecycle skills' prose and one docs page and adds one contract pin; it
> changes no code path. It runs as a wave-7 lane in lane mode: the plan's
> focused tests plus `pnpm check`, `pnpm type-check`,
> `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
> `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
> `pnpm oat:validate-skills` in the lane worktree `.worktrees/wave-7/<lane>`;
> the wave fan-in owns the lockstep bump and the release gates. A root review
> follows the lane.

## Outcome

`oat-repo-improve` states, in the step that selects the orchestration tier
and again in its success criteria, that external-plan writes are never
delegated below the caller's own model class: reconnaissance lanes may run on
cheaper classes, plan authoring may not, and a parallelized author subagent
must run on the caller's model with the caller reviewing every plan before
publication or wave composition. `oat-wave-execute` carries the same rule for
the dated plan amendments it authors at wave boundaries and after a STOP. The
docs page that describes the delegation boundary says the same. A contract
test pins the operative sentences so the rule cannot drift out of the skills
silently (`DR-260906-standing-claims-in-skills-name`).

## Source and live evidence

- Source backlog item:
  [BL-260908-keep-external-plan-writes — Keep external-plan writes on the caller's model class in oat-repo-improve](../../pjm/backlog/items/BL-260908-keep-external-plan-writes.md)
- Planned at: branch `wave-7-plans` commit `a4c68cf893caa12139f9ee2196875ef05302011e` (= `origin/main`
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` at planning time) on `2026-09-08`.
- Verified evidence:
  - `.agents/skills/oat-repo-improve/SKILL.md:135-137` — Step 2 ends "The
    caller retains decomposition, synthesis, user dialogue, source
    verification, candidate selection, and all plan writes." Nothing in the
    step names a model class for plan writes; the tier bullets at `:145-147`
    speak only of read-only reconnaissance lanes.
  - `.agents/skills/oat-repo-improve/SKILL.md:333-349` — Success Criteria
    contain no line about who writes plans or on what model class.
  - `.agents/skills/oat-repo-improve/SKILL.md:9-11` — `metadata.version:
2.1.4` (top-level `version:` is gone since CLI 0.2.65).
  - `.agents/skills/oat-wave-execute/SKILL.md:163-187` — Step 2 dispatches
    "ONE economical recon subagent (read-only)" for the drift refresh and
    defines the non-narrowing reconciliation contract; the dated `Refresh
applied` entries that reconciliation produces are authored by the
    orchestrator, and the step does not say on which model class. Version
    `metadata.version: 1.9.1` (`:8-9`).
  - `apps/oat-docs/docs/workflows/skills/repo-improve.md:72-77` — "the root
    agent retains classification, vetting, prioritization, cross-lane
    synthesis, and plan writing" with no model-class statement.
  - `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:2584-2620`
    — the existing executable backstops for `oat-repo-improve` prose (the
    dispatch/orchestration root binding at `:2584`; the plan-readiness split
    at `:2611`). No case pins the caller-retains sentence.
  - `packages/cli/src/validation/skills.test.ts:6107` — the version pin
    `['.agents/skills/oat-repo-improve/SKILL.md', '2.1.4']`; no version pin
    exists for `oat-wave-execute` 1.9.1 in `packages/cli/src`,
    `tools/smoke`, or `.agents/skills/*/tests` (grep for the literal
    returns nothing).
  - Incident evidence (2026-09-08): a Fable session running this skill from
    memory delegated the sixteen wave-7 plan writes to Opus subagents; the
    operator's stated purpose of the skill ("have the smartest possible model
    write the plans") was met only by a same-model review pass with rewrite
    authority afterwards.

## Dependencies

| Type      | Dependency                                                                                                 | Required state                                                                                                                                 | Current state                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied | `DR-260906-standing-claims-in-skills-name`                                                                 | Accepted; every standing claim added here names its executable backstop.                                                                       | Accepted. Record present at `.oat/repo/reference/decisions/DR-260906-standing-claims-in-skills-name.md`; the backstop is the contract case added. |
| Satisfied | `DR-260906-one-version-bump-per-changed`                                                                   | Accepted; one `metadata.version` bump per changed skill in the PR.                                                                             | Accepted. Verified at `.oat/repo/reference/decisions/DR-260906-one-version-bump-per-changed.md`.                                                  |
| Soft      | [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md)                             | May share a parallel group; no common write surface.                                                                                           | Planned, unexecuted. Different skills (`create-*-skill`, `skills-guide.md`).                                                                      |
| Soft      | [Harden the external-plan readiness contract](./2026-09-08-harden-the-external-plan-readiness-contract.md) | Never in one parallel group; this plan merges second and re-anchors `:2584`.                                                                   | Planned, unexecuted. Shares `skills-bundled-docs-contract.test.ts` (that plan edits the readiness helpers; this one adds one case).               |
| Soft      | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)         | Never in one parallel group; whichever merges second re-anchors the `:6107` pin and takes no second bump of `oat-repo-improve` in the same PR. | Planned, unexecuted. Shares `packages/cli/src/validation/skills.test.ts` pins and `oat-repo-improve` (its plan template).                         |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                   | Affected | Files in common                         | Required update                                                                                                     |
| ------------------------------------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| PR #273 (remote project management) — merged 2026-09-08 | None     | none of this plan's five write surfaces | No update; the drift check below confirms at execution time (checked with `gh api --paginate .../pulls/273/files`). |
| PR #190 (ReviewPlan Stage A) lands                      | Minor    | `apps/oat-docs/docs/**` broadly         | Re-anchor `repo-improve.md:72-77` by content if it moved; no contract change.                                       |
| PR #125 (brainstorm companion) lands                    | None     | none                                    | No update.                                                                                                          |

## Drift check

```bash
git diff --stat a4c68cf893caa12139f9ee2196875ef05302011e..origin/main -- .agents/skills/oat-repo-improve/SKILL.md .agents/skills/oat-wave-execute/SKILL.md apps/oat-docs/docs/workflows/skills/repo-improve.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
```

Expected: no changes, or only the sibling wave-7 lanes named in Dependencies
(re-anchor and continue). A change to the caller-retains sentence at
`oat-repo-improve/SKILL.md:135-137` or to the recon step at
`oat-wave-execute/SKILL.md:163-187` from any other source is a STOP.

## Repository conventions

- One `metadata.version` bump per changed skill per PR; locate pins by the
  OLD VERSION LITERAL (plain and regex-escaped) across `packages/cli/src`,
  `tools/smoke`, and `.agents/skills/*/tests` — `oat-repo-improve` 2.1.4 is
  pinned at `packages/cli/src/validation/skills.test.ts:6107`;
  `oat-wave-execute` 1.9.1 has no pin.
- Standing claims in skills name their executable backstop
  (`DR-260906-standing-claims-in-skills-name`); this plan's backstop is the
  contract test case it adds.
- `pnpm exec oxfmt --write` on every Markdown file written; `pnpm test:skills`,
  `pnpm lint`, and `pnpm format` cover `.agents/skills` and are not run by
  CI's `pnpm check` — run them in the lane.
- Docs pages under `apps/oat-docs/docs` run markdownlint through `pnpm check`.

## Scope

### In scope

- `.agents/skills/oat-repo-improve/SKILL.md` (Step 2 sentence; Success
  Criteria; `metadata.version` 2.1.4 → 2.1.5)
- `.agents/skills/oat-wave-execute/SKILL.md` (Step 2 drift refresh and the
  post-STOP refresh rule; `metadata.version` 1.9.1 → 1.9.2)
- `apps/oat-docs/docs/workflows/skills/repo-improve.md` (Orchestration section)
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  (one new case beside `:2584`)
- `packages/cli/src/validation/skills.test.ts` (the `:6107` pin)

### Out of scope

- Any dispatch-machinery change: the rule is prose plus a pin; no CLI
  enforces it (a dispatch record's `model_selector` could pin it later — a
  follow-up, not this plan).
- `subagent-orchestration`'s class ladder and `oat-dispatch-subagents`.
- The wave-7 plan batch itself (already reviewed on the caller's model).

## Current state

Verified at `a4c68cf893caa12139f9ee2196875ef05302011e`:

- `oat-repo-improve/SKILL.md:135-137` reserves plan writes for "the caller"
  but the same skill's tier bullets (`:145-147`) and the docs page (`:72-77`)
  describe delegation only in terms of reconnaissance, so a reader who
  parallelizes authoring has no rule about the author subagent's model class.
- `oat-wave-execute/SKILL.md:163-187` names an "economical recon subagent" for
  the drift refresh and defines the reconciliation contract; the dated
  `Refresh applied` entries and post-STOP refreshes are authored by the
  orchestrator with no model-class statement.
- `skills-bundled-docs-contract.test.ts:2584-2620` pins two other
  `oat-repo-improve` sentences; no case names the caller-retains sentence, so
  rewording it today fails nothing.

## Implementation steps

### 1. Write the contract pin first (RED)

Add one case to `skills-bundled-docs-contract.test.ts` beside the existing
`binds repo-improve dispatch and orchestration references independently`
case (`:2584`), named
`keeps external-plan writes on the caller's model class`. It reads
`oat-repo-improve/SKILL.md` and asserts, with regexes tolerant of line
wrapping, that the skill contains (a) the caller-retains sentence including
"all plan writes", (b) a sentence stating plan writes are never delegated
below the caller's model class, (c) a sentence stating a parallelized author
subagent runs on the caller's model and the caller reviews every plan before
publication or wave composition, and (d) that reconnaissance lanes may run on
cheaper classes. It also reads `oat-wave-execute/SKILL.md` and asserts the
refresh-authoring sentence from step 3 is present.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t "caller's model class"` → 1 failed (the sentences do not exist yet); record the failure line.

### 2. Amend `oat-repo-improve` (GREEN)

In Step 2, directly after "The caller retains decomposition, synthesis, user
dialogue, source verification, candidate selection, and all plan writes.",
add: "Plan writes are never delegated below the caller's own model class. If
authoring is parallelized, the author subagent runs on the same model as the
caller, and the caller reviews every plan before publication or wave
composition. Reconnaissance lanes may run on cheaper classes; plan writes may
not. The executable backstop is the
`keeps external-plan writes on the caller's model class` case in
`skills-bundled-docs-contract.test.ts`." Add a Success Criteria bullet:
"Plan writes stay on the caller's model class; parallel authors are same-model
and caller-reviewed." Bump `metadata.version` 2.1.4 → 2.1.5 and move the pin
at `packages/cli/src/validation/skills.test.ts:6107` (locate by the literal
`2.1.4`; confirm no other pin exists in `tools/smoke` or
`.agents/skills/*/tests`).

**Verify:** the step-1 case passes for the repo-improve assertions; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "repo-improve"` → pass; `pnpm run check:skill-bumps` → `oat-repo-improve` validated with a bump.

### 3. Amend `oat-wave-execute`

In Step 2 (wave-boundary drift refresh), after the reconciliation contract
paragraph, add: "Recon is delegated; the dated `Refresh applied` entry and
any post-STOP refresh that amends a plan's mechanism are plan writes and stay
on the orchestrator's own model class (same rule as `oat-repo-improve`)."
Bump `metadata.version` 1.9.1 → 1.9.2 (no pin to move; confirm by grep).

**Verify:** the step-1 case passes in full; `pnpm run check:skill-bumps` → two changed skills validated, zero findings.

### 4. Update the docs page

In `apps/oat-docs/docs/workflows/skills/repo-improve.md` Orchestration
section, extend the sentence about the root agent retaining plan writing with
the model-class rule in one sentence, and name the contract test as the
backstop.

**Verify:** `pnpm check` → markdownlint green; `git diff --stat` shows the four intended files plus the two test files.

### 5. Format and lane gates

**Format (write/fix, before verification):** `pnpm exec oxfmt --write .agents/skills/oat-repo-improve/SKILL.md .agents/skills/oat-wave-execute/SKILL.md apps/oat-docs/docs/workflows/skills/repo-improve.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts`; then `pnpm format` as the check.

**Verify:** lane mode, exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (`Cached: 0`), `pnpm run check:skill-bumps` 0, `pnpm lint` 0, `pnpm format` 0, `pnpm oat:validate-skills` 0, `pnpm test:skills` 0; `pnpm run --silent cli -- sync --scope project` reports no provider-view deletion.

## Test plan

- `skills-bundled-docs-contract.test.ts` — new case
  `keeps external-plan writes on the caller's model class`: red at step 1
  (sentences absent), green after steps 2–3. Negative control after landing:
  delete the "never delegated below" sentence in a `mktemp -d` backup-restored
  probe → the case fails naming the missing sentence; restore with `cp`.
- `skills.test.ts:6107` pin → 2.1.5; the corpus sweeps (every skill resolves
  `source === 'metadata'`, every pin equals its skill) stay green.

## Done criteria

- [ ] `oat-repo-improve/SKILL.md` Step 2 and Success Criteria state that plan writes are never delegated below the caller's model class, that parallel authors are same-model and caller-reviewed, and that reconnaissance may run cheaper — naming the contract test as the backstop
- [ ] `oat-wave-execute/SKILL.md` Step 2 states that refresh entries and post-STOP refreshes are plan writes on the orchestrator's own model class
- [ ] `repo-improve.md` docs page carries the rule in its Orchestration section
- [ ] The contract test case exists, was red before the prose landed, and is green after; its neutralization control fails
- [ ] `oat-repo-improve` 2.1.4 → 2.1.5 with its pin moved; `oat-wave-execute` 1.9.1 → 1.9.2; `check:skill-bumps` reports both with zero findings
- [ ] Lane gates green; provider views unchanged apart from the two rewritten projections

## STOP conditions

- The caller-retains sentence at `oat-repo-improve/SKILL.md:135-137` is
  absent or reworded on the execution base (another change moved it) — re-anchor
  only if the meaning is intact; otherwise STOP and report.
- `oat-repo-improve` or `oat-wave-execute` was already bumped in the same PR
  by a sibling lane (e.g. the stray-fence lane edits `oat-repo-improve`'s plan
  template) — do not bump twice; coordinate the single bump at the fan-in and
  STOP the lane's own bump step.
- A pin for either skill's version exists somewhere the grep above did not
  cover (a new pin site) — STOP and report the site rather than guessing.

## Revalidation Before Execution

Re-run the drift check against the wave-7 execution base after predecessor
lanes integrate; re-anchor `:135-137`, `:163-187`, `:72-77`, `:2584`, and
`:6107` by content, not by number. Revalidate if `oat-repo-improve` or
`oat-wave-execute` changes version before this lane runs, or if PR #190 lands
and moves the docs page.

## Review focus

- The added sentences say exactly what the operator asked for and no more: no
  new dispatch machinery, no claim that a CLI enforces the rule.
- The contract case pins meaning, not line numbers, and tolerates oxfmt's
  wrapping.
- One bump per skill; the `:6107` pin moved; no second bump if a sibling lane
  already bumped `oat-repo-improve` in the same PR.
- Weaker-anywhere does not apply (no validator, guard, or reader changes).
