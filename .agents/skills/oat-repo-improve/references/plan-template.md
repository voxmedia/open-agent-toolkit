# External Implementation Plan Template

Use this template for plans written by `oat-repo-improve`. Every plan must stand alone for an executor that has zero context from the advisor session, source review, backlog discussion, or sibling plans.

External plans are durable reference artifacts. They are deliberately not canonical OAT `plan.md` files and must not carry canonical OAT lifecycle state: phase IDs, task IDs, phase or task status tables, review tables, or implementation bookkeeping.

External execution-readiness metadata is a different thing and is explicitly permitted and required: `oat_execution_status`, the `## Dependencies` table, `## Landing-event impact`, and `## Revalidation Before Execution`. These record whether the plan's own prerequisites have merged, not how an OAT project is progressing through phases.

## File Contract

Write plans under `.oat/repo/reference/external-plans/` as:

`YYYY-MM-DD-<short-slug>.md`

Use this frontmatter:

```yaml
---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: repo-audit|maintainability-review|backlog-review|backlog-directory|backlog-item
oat_external_plan_sources:
  - <repo-relative source artifact or scope>
oat_external_plan_commit: <full 40-character SHA of the inspected HEAD>
oat_external_plan_main_commit: <full 40-character SHA of the compared origin/main or merge-base>
oat_external_plan_date: '<YYYY-MM-DD>'
oat_execution_status: READY|BLOCKED
oat_backlog_items: []
oat_issue_url: null
created: '<ISO 8601 UTC>'
---
```

`oat_backlog_items` contains backlog IDs represented by the plan. Keep it empty when none apply. Set `oat_issue_url` only after confirmed issue publication. Never record absolute workstation paths in durable frontmatter.

`oat_external_plan_commit` is the full SHA of the `HEAD` whose content was actually inspected while planning — never a fetched tip that was not read. `oat_external_plan_main_commit` records the fetched `origin/main`, or the merge-base with it, as comparison evidence only. The two SHAs may differ, and they normally do when planning happens on a branch; recording them separately is what keeps "what I read" distinct from "what I compared against". `oat_external_plan_date` is the planning date. `oat_execution_status` is `READY` when no unsatisfied hard dependency blocks execution and `BLOCKED` otherwise.

### Legacy plans

A plan with no `oat_external_plan_date`, or dated before this contract's landing date of `2026-09-07`, is read in legacy mode. Legacy mode accepts a short `oat_external_plan_commit` SHA, a missing `oat_external_plan_main_commit`, missing `## Dependencies`, `## Landing-event impact`, and `## Revalidation Before Execution` sections, and a missing `oat_execution_status` (read as `READY`).

Legacy plans are never rewritten to satisfy the prospective rules. Retrofitting durable plans is not a prerequisite for this contract, and a rule that would make an existing plan invalid or unimportable is a defect in the rule.

## Plan Template

````markdown
# <Imperative title: what will be true after execution>

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY|BLOCKED.** Say why in one or two sentences: assert
> that no unsatisfied hard dependency blocks execution, or name the blocking
> dependency and the state that would unblock it.

## Outcome

State the observable end result in 2–5 sentences. Explain why it matters and preserve the source intent in language an executor and reviewer can understand without opening the source artifact.

## Source and live evidence

- Source artifact or scope: `<repo-relative path or scope>`
- Inspected `HEAD`: `<full SHA>` — the tree whose content this plan actually read
- Comparison baseline: `<full SHA>` — say which it is, the fetched `origin/main` tip or the merge-base with it; comparison evidence only, and it may differ from the inspected `HEAD`
- Planning date: `<YYYY-MM-DD>`
- Working tree while planning: `git status --porcelain` was empty, or every dirty path is named here
- Related backlog items: `<ID and title, or none>` — link the item from this plan body so the link runs in both directions
- Verified evidence:
  - `<file:line or command evidence>` — what it establishes

Distinguish source assertions from facts verified against the live repository. Do not copy stale evidence forward.

## Dependencies

Type every dependency and name its unblock state. `Hard` blocks execution. `Soft` records an ordering, integration, or evidence preference that never blocks. `Satisfied` records a formerly hard dependency that is now met.

The first word of the Type cell is the class; anything after it is a free-form qualifier, as in `Hard ordering`, `Soft adjacency`, or `Satisfied predecessor`. Earlier plans used ad-hoc type words such as `Related, distinct`, `Downstream`, or `Open question`; those stay valid in legacy mode, and a new plan expresses the same meaning as a `Soft` row with that word as its qualifier.

| Type          | Dependency                   | Required state           | Current state |
| ------------- | ---------------------------- | ------------------------ | ------------- |
| Hard ordering | [Plan](./YYYY-MM-DD-slug.md) | Merged to `origin/main`. | Pending.      |
| Soft ordering | [Plan](./YYYY-MM-DD-slug.md) | Never in one group.      | Landed.       |

Every `Hard` row's Current state begins with a named unblock state: `Satisfied`, `Landed`, `Merged`, or `Accepted` when it is met; `Pending`, `Blocked`, or `In flight` when it is not. State plainly whether any unsatisfied hard dependency remains, and keep `oat_execution_status` in agreement with that sentence.

Dependency state alone never disqualifies a plan. A well-formed plan whose prerequisites have not merged is written and recorded as `BLOCKED`, not withheld.

## Landing-event impact

| Event                   | Affected | Files in common | Required update                        |
| ----------------------- | -------- | --------------- | -------------------------------------- |
| `<PR or project>` lands | Minor    | `<shared file>` | Re-anchor `<citation>` before editing. |

## Drift check

Run before editing:

```bash
git diff --stat <inspected HEAD SHA>..HEAD -- <in-scope paths>
```

If an in-scope file changed, compare the plan's current-state evidence with the live code. A material mismatch is a STOP condition unless the plan explicitly explains how to reconcile it.

## Repository conventions

- Build: `<exact command>` → `<expected success>`
- Typecheck: `<exact command or not applicable>`
- Test: `<exact command>` → `<expected success>`
- Lint/format check: `<exact non-mutating command>`
- Implementation pattern: `<exemplar file and the convention to match>`
- Git/PR convention: `<observed convention; do not push/open a PR unless instructed>`

Only include commands verified from repository instructions or configuration.

## Scope

### In scope

- `<exact file, directory, symbol, or behavior>`

### Out of scope

- `<specific adjacent concern>` — `<why it must remain untouched>`

## Current state

Describe the minimum facts needed to execute safely:

- role of each relevant file or module;
- short current-state excerpts with `file:line` markers when exact code shape matters;
- applicable decisions, vocabulary, data contracts, or design constraints;
- dependencies and assumptions established during vetting.

## Implementation steps

### 1. <Imperative step title>

Name exact files and symbols. Describe the target behavior or code shape and any boundary that must remain stable.

**Verify:** `<command>` → `<expected output>`

### 2. <Imperative step title>

Continue in dependency order. Keep each step independently checkable and leave the repository in a coherent state.

**Verify:** `<command>` → `<expected output>`

## Test plan

- Tests to add or change, with exact paths and named cases.
- Existing test to use as the structural pattern.
- Regression or failure mode each test proves.
- Focused command and expected result.
- Full relevant suite and expected result.

## Done criteria

- [ ] All in-scope behavior matches the stated outcome.
- [ ] Focused tests pass with the expected cases.
- [ ] Required build, typecheck, lint, and full relevant tests pass.
- [ ] `git status --short` contains no unexplained or out-of-scope files.
- [ ] Documentation or migration notes named by the plan are complete.

Replace generic criteria with machine-checkable commands or observable assertions specific to the plan.

## STOP conditions

Stop and report instead of improvising when:

- live state materially contradicts the verified evidence or drift assumptions;
- a required change crosses an out-of-scope boundary;
- a named verification gate fails twice after one bounded correction;
- a load-bearing dependency, API, ownership assumption, or migration precondition is false;
- an unsatisfied hard dependency in `## Dependencies` still blocks execution, whatever `oat_execution_status` claims;
- the work would expose, copy, or rotate a credential without explicit authority.

Add plan-specific STOP conditions for its actual risks.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after the planning date;
- `origin/main` advances materially from the inspected `HEAD`;
- a named in-flight project or PR lands;
- a dependency named in `## Dependencies` changes state;
- an in-scope file's step numbering, section order, or cited line anchors change;
- a load-bearing evidence claim cannot be reproduced.

Apply the `## Landing-event impact` table when one of its events has occurred. A plan executed inside a wave refreshes its drift check against the exact execution `HEAD` after predecessor lanes integrate, not only from the authored SHA to `origin/main`.

## Review focus

- What a reviewer should inspect most closely.
- Compatibility or regression risks.
- Follow-ups intentionally deferred and why.
````

## Multi-Plan Index

When one run writes multiple plans, create `YYYY-MM-DD-<source-mode>-plan-index.md`:

```markdown
---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: <source mode>
oat_external_plan_sources:
  - <source artifact or scope>
oat_external_plan_commit: <full 40-character SHA of the inspected HEAD>
oat_external_plan_main_commit: <full 40-character SHA of the compared origin/main or merge-base>
oat_external_plan_date: '<YYYY-MM-DD>'
created: '<ISO 8601 UTC>'
---

# External Plan Index: <run title>

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: <why these candidates were chosen>
- Deferred/rejected: <material candidates and rationale>
- Unaudited or out of scope: <boundaries>

## Recommended order

| Order | Plan                          | Source item/finding   | Depends on | Tracking                               | Rationale |
| ----- | ----------------------------- | --------------------- | ---------- | -------------------------------------- | --------- |
| 1     | [Title](./YYYY-MM-DD-slug.md) | <ID/title or finding> | —          | <backlog ID and/or issue URL, or none> | <reason>  |

## Dependency notes

- <Dependency or parallel-lane explanation.>
```

Do not use a repository-wide `README.md` as the index. Do not ask executors to mutate the index; execution tracking belongs to the chosen execution workflow.

An index records the same provenance as a plan, but it carries no `oat_execution_status` and none of the dependency, landing-event, or revalidation sections: it is not executable, so it has no execution readiness of its own. Each indexed plan carries its own status.

## Execution Programs

A third document kind can appear in `external-plans/`: an execution program, marked `oat_execution_program: true`. Programs are written by `oat-wave-program`, not by this skill, and this contract only says how to read one.

A program maps a corpus of plans into waves. It inspects no tree, so it carries no `oat_external_plan_commit`, no `oat_external_plan_main_commit`, and no `oat_execution_status` — asking a map for provenance or execution readiness is a category error, and each plan it lists answers those questions for itself. What a program must carry instead is its ledger:

- `oat_program_indexes` listing at least one plan index path;
- a `## Status Ledger` section with a `Wave | Theme | Lanes | Status | Record` table recording at least one wave, where every Status cell is `composed`, `in-progress`, `merged`, or `done` — the vocabulary `oat-wave-program` itself uses;
- a `## Wave Table` section recording at least one plan; its heading may carry a coverage suffix, as in `## Wave Table (coverage: 31 plans = 31 index rows)`.

A program's mode is selected by `oat_external_plan_date` when it has one and by the date part of `created` otherwise, because the producing template emits `created` and no plan date. Without that fallback every generated program would sort into legacy mode permanently and never be checked at all.

A program dated on or after the contract's landing date is held to exactly the rules above; an earlier one is read in legacy mode like any other artifact. The exemption is deliberate and bounded: a program is not exempt from the contract, it is held to the part of it that applies to a map.

## Quality Gate

Before finishing each plan, confirm:

- It can be executed with only the plan and repository.
- Every source claim used for implementation was verified live.
- It has one coherent shippable outcome and verification boundary. Independent outcomes are separate plans; inseparable project-sized work is escalated to an OAT project/import decision.
- Every step names exact files/symbols and ends in a command with an expected result.
- Scope and STOP conditions are specific enough to prevent plausible but unauthorized expansion.
- Frontmatter source paths are repo-relative and backlog IDs are exact.
- `oat_external_plan_commit` holds the full SHA of the inspected `HEAD`, `oat_external_plan_main_commit` holds the compared `origin/main` or merge-base SHA, and `oat_external_plan_date` is set.
- `oat_execution_status` is exactly `READY` or `BLOCKED` and agrees with the unblock states recorded in `## Dependencies`.
- `## Dependencies`, `## Landing-event impact`, and `## Revalidation Before Execution` are all present, and the plan body links back to its source item.
- No secret value, workstation-only absolute path, OAT phase or task ID, or canonical OAT lifecycle bookkeeping appears; external execution-readiness metadata is permitted.
