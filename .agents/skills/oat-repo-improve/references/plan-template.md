# External Implementation Plan Template

Use this template for plans written by `oat-repo-improve`. Every plan must stand alone for an executor that has zero context from the advisor session, source review, backlog discussion, or sibling plans.

External plans are durable reference artifacts. They are deliberately not canonical OAT `plan.md` files and must not contain OAT phase IDs, task IDs, lifecycle readiness, review tables, or implementation bookkeeping.

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
oat_external_plan_commit: <short SHA>
oat_backlog_items: []
oat_issue_url: null
created: '<ISO 8601 UTC>'
---
```

`oat_backlog_items` contains backlog IDs represented by the plan. Keep it empty when none apply. Set `oat_issue_url` only after confirmed issue publication. Never record absolute workstation paths in durable frontmatter.

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

## Outcome

State the observable end result in 2–5 sentences. Explain why it matters and preserve the source intent in language an executor and reviewer can understand without opening the source artifact.

## Source and live evidence

- Source artifact or scope: `<repo-relative path or scope>`
- Planned at: commit `<short SHA>` on `<YYYY-MM-DD>`
- Related backlog items: `<ID and title, or none>`
- Verified evidence:
  - `<file:line or command evidence>` — what it establishes

Distinguish source assertions from facts verified against the live repository. Do not copy stale evidence forward.

## Drift check

Run before editing:

```bash
git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>
```
````

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
- the work would expose, copy, or rotate a credential without explicit authority.

Add plan-specific STOP conditions for its actual risks.

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
oat_external_plan_commit: <short SHA>
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

| Order | Plan | Source item/finding | Depends on | Tracking | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | [Title](./YYYY-MM-DD-slug.md) | <ID/title or finding> | — | <backlog ID and/or issue URL, or none> | <reason> |

## Dependency notes

- <Dependency or parallel-lane explanation.>
````

Do not use a repository-wide `README.md` as the index. Do not ask executors to mutate the index; execution tracking belongs to the chosen execution workflow.

## Quality Gate

Before finishing each plan, confirm:

- It can be executed with only the plan and repository.
- Every source claim used for implementation was verified live.
- It has one coherent shippable outcome and verification boundary. Independent outcomes are separate plans; inseparable project-sized work is escalated to an OAT project/import decision.
- Every step names exact files/symbols and ends in a command with an expected result.
- Scope and STOP conditions are specific enough to prevent plausible but unauthorized expansion.
- Frontmatter source paths are repo-relative and backlog IDs are exact.
- No secret value, workstation-only absolute path, OAT task ID, or lifecycle bookkeeping appears.
