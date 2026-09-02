---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260718-mandatory-skill-load-clause.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260718-mandatory-skill-load-clause
oat_issue_url: null
created: '2026-08-30T23:49:30Z'
---

# Require lifecycle orchestrators to load every named execution skill

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The bounded call-site sweep was repeated after
> gate-contract PR #246 merged; it changed gate-command clauses but did not add
> named-skill load requirements or invalidate intentional inline fallbacks.
> PR #190 remains an open soft revalidation dependency.

## Outcome

Every bundled lifecycle instruction that directs an orchestrator to execute a
named OAT project skill either requires loading that skill's current `SKILL.md`
and following it, or records a narrow intentional inline fallback. Closeout can
no longer substitute a remembered outcome for current summary, documentation,
PR, or review steps, and a corpus test prevents new bare execution pointers.

## Source and live evidence

- Source backlog item:
  [BL-260718-mandatory-skill-load-clause — Mandatory skill-load clause for lifecycle steps that name skills](../../pjm/backlog/items/BL-260718-mandatory-skill-load-clause.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-project-implement/SKILL.md:22-39` already establishes
    mandatory ordered loading for dispatch support skills.
  - `.agents/skills/oat-project-implement/references/completion-and-closeout.md:740`
    and `:925` direct summary/document/PR/retro dispatch without an equivalent
    named-skill load requirement.
  - `.agents/skills/oat-project-next/SKILL.md:418-441` is a compliant exemplar:
    it invokes the selected target through the Skill tool and requires the
    target to be loaded and followed.
  - Current additional execution pointers occur in
    `.agents/skills/oat-project-autonomous/SKILL.md:249,409`,
    `.agents/skills/oat-project-quick-start/SKILL.md:665`, and review/fix
    handoffs; each needs classification rather than a blind string rewrite.
  - `.agents/skills/oat-project-pr-final/SKILL.md:220` and
    `.agents/skills/oat-project-complete/SKILL.md:465` contain intentional
    host-capability fallbacks that must remain valid when they execute the same
    synthesis contract inline.
  - `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts:699-723`
    already reads the implementation closeout surface but does not enforce
    named-skill loading.
  - [PR #246 — Harden gate execution contracts](https://github.com/voxmedia/open-agent-toolkit/pull/246)
    updated gate sections in discover/quick-start and added lifecycle gate
    assertions to the focused contract test. The named execution pointers and
    load/fallback classification remain unsatisfied and in scope.
  - [PR #254 — Retire archived synced project records](https://github.com/voxmedia/open-agent-toolkit/pull/254)
    rewrote the synced-archive arrival of `oat-project-complete` (skill
    `1.7.6`) and added five completion scripts. The 2026-09-02 re-sweep found
    no new bare execution pointers; the inline summary fallback moved from
    line 406 to line 465 and remains an intentional host-capability fallback.
- Related project/PR:
  - [review-plan-workflow](../../../projects/shared/review-plan-workflow/state.md)
    and [PR #190 — ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190)
    modify lifecycle/review guidance and require a fresh sweep if resolved first.

## Dependencies

| Type                   | Dependency                                                                                                                                          | Required state                                                                                                                                         | Current state                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soft integration       | [PR #190](https://github.com/voxmedia/open-agent-toolkit/pull/190) / [review-plan-workflow](../../../projects/shared/review-plan-workflow/state.md) | If its head or disposition changes first, sweep the landed/terminal diff and preserve any new execution pointers.                                      | Open draft at `81a51d2d845afd7fdafc03f75eec009007ea135a`.                                                                                                                                     |
| Soft integration       | `tool-pack-scope-provider-truthfulness` project (in flight; one integrated PR)                                                                      | After it merges, re-sweep `oat-project-implement/references/dispatch-and-dry-run.md` and the review-provide skills, then bump any touched skill again. | Not merged; verified read-only on 2026-09-02 at `27b978528`. Its dispatch-lineage paragraphs reference the `oat project dispatch record` CLI, not a named skill; confirm during the re-sweep. |
| Satisfied revalidation | [PR #246](https://github.com/voxmedia/open-agent-toolkit/pull/246) / `gate-execution-contract-hardening`                                            | Re-run the bounded sweep after merge and preserve its structured-command and lifecycle-gate edits.                                                     | Satisfied; the delivered gate clauses are adjacent, compatible, and remain owned by PR #246.                                                                                                  |

There are no unsatisfied hard dependencies.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-project-implement .agents/skills/oat-project-autonomous .agents/skills/oat-project-quick-start .agents/skills/oat-project-next .agents/skills/oat-project-complete .agents/skills/oat-project-pr-final .agents/skills/oat-project-review-receive .agents/skills/oat-project-revise .agents/skills/oat-project-discover .agents/skills/create-oat-skill packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/validation/skills.test.ts
```

Also inspect PR #190's terminal diff if it resolves after this refresh. New
execution pointers or changed fallback semantics require plan refresh before
edits.

## Repository conventions

- Build: `pnpm build` and `pnpm build:docs` → workspace and docs builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused tests: run
  `post-implement-sequence-contracts.test.ts` and
  `packages/cli/src/validation/skills.test.ts` → lifecycle matrix and skill
  versions pass.
- Skill validation: `pnpm oat:validate-skills` and
  `pnpm run check:skill-bumps` → every changed canonical skill is valid and
  bumped exactly once.
- Lint/format: `pnpm lint && pnpm format` → required canonical-skill coverage
  passes.
- Provider refresh: `oat sync --scope all` → managed views match canonical
  sources; do not patch provider copies directly.
- Git/PR convention: bundled skill/agent changes require all five public
  package versions to move together; do not push or open a PR unless instructed.

## Scope

### In scope

- Canonical `.agents/skills/oat-project-*/SKILL.md` files and their direct
  `references/*.md` — bounded inventory of executor-operated named-skill steps.
- `.agents/skills/create-oat-skill/SKILL.md` — one reusable authoring rule.
- Known current misses in implement closeout, autonomous chaining, quick-start
  plan-writing, and execution-capable review/fix handoffs.
- Existing explicit load contracts and intentional inline fallbacks — preserve
  and classify, not rewrite.
- `post-implement-sequence-contracts.test.ts` and skill-version contract tests.
- Changed skill versions, managed provider views, five public package versions,
  and `pnpm-lock.yaml`.

### Out of scope

- User-facing suggestions that merely mention another skill.
- Examples, self-references, owner pointers, or non-executing cross-links.
- Removing intentional host-capability inline fallbacks.
- Changing lifecycle order, review semantics, or gate behavior.
- Expanding the sweep beyond canonical OAT project lifecycle skills.

## Current state

The repository has a strong local pattern but no corpus-wide convention.
`oat-project-next` loads its target, while closeout names outcomes and lets the
orchestrator infer how to achieve them. The contract must distinguish
executor-operated directives from explanatory references so a test does not
force meaningless boilerplate around every mention.

Use this classification:

- execution verbs (`invoke`, `dispatch`, `route`, `run`, `follow`) directing
  the current orchestrator to a named `oat-project-*` skill require an explicit
  load-and-follow clause;
- an explicit capability fallback may remain when it states why skill loading
  is unavailable and executes the same contract inline; and
- user advice, examples, and non-executing references are exempt.

## Implementation steps

### 1. Add the default authoring convention

In `create-oat-skill/SKILL.md`, add a concise named-skill execution rule beside
existing lifecycle/autonomy guidance. Require loading the target `SKILL.md` and
following its current steps, or dispatching a child that carries it. State that
achieving a remembered outcome or relying on ambient discovery is
non-compliant. Define the three exemption classes above.

**Verify:** `pnpm oat:validate-skills` → authoring skill remains structurally
valid after its version bump.

### 2. Repeat and record the bounded lifecycle sweep in tests

Search only canonical `.agents/skills/oat-project-*/SKILL.md` and their direct
references for named project-skill execution verbs. Classify every hit as
`load-required`, `explicit-fallback`, or `non-executing`. Encode the resulting
current matrix in the existing lifecycle contract test using file paths and
stable semantic anchors, never physical line numbers.

Known required rows include implement closeout, autonomous chaining,
quick-start's plan-writing transition, and execution-capable review/fix
handoffs. Known compliant/exempt rows include `oat-project-next` and the
documented summary inline fallbacks.

**Verify:** deliberately remove one load clause in a temporary test mutation,
observe the focused test fail, restore it, and observe the suite pass.

### 3. Repair every verified executor-operated pointer

For each `load-required` row, place the mandatory clause at the execution
boundary, not in a remote generic preface the orchestrator may skip. In
completion-and-closeout, require loading summary, document, PR-final, and retro
immediately before each step (or dispatching a child carrying the named skill).
Preserve ordering, approvals, snapshots, and terminal conditions unchanged.

Do not add the clause to exempt explanatory mentions. Bump each changed
canonical skill exactly once.

**Verify:** focused lifecycle/skill tests pass and the matrix has no unclassified
executor-operated row.

### 4. Refresh managed views and apply release bookkeeping

Run `oat sync --scope all`, inspect provider-view changes, bump all five public
packages together, and update `pnpm-lock.yaml`. Reconcile rather than overwrite
any landed PR #190 or gate-contract change.

**Verify:** `pnpm lint && pnpm format && pnpm run check:skill-bumps` → canonical
and generated skill surfaces pass.

### 5. Run complete gates

Run the repository Definition of Done in documented order, fetching
`origin/main` immediately before version validation. Run focused lifecycle and
skill tests independently so Turbo cache replay is not the only evidence.

## Test plan

- Add a stable-anchor call-site matrix to
  `post-implement-sequence-contracts.test.ts` or a tightly scoped adjacent test.
- Prove each executor-operated row contains a load-and-follow contract or an
  explicit fallback rationale.
- Include one red/green mutation proof.
- Update exact skill-version pins in `packages/cli/src/validation/skills.test.ts`.
- Run focused tests, skill validation, lint/format, full tests/build, release
  gates, and docs build.

## Done criteria

- [ ] Closeout loads each named lifecycle skill before execution.
- [ ] Every bounded-sweep hit is classified and contract-tested.
- [ ] Remembered outcomes and ambient discovery are explicitly non-compliant.
- [ ] Intentional equivalent inline fallbacks remain available and documented.
- [ ] Lifecycle ordering, snapshots, approvals, and gate semantics are unchanged.
- [ ] Every changed skill and all five public packages have required bumps.
- [ ] Managed provider views and all verification gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- PR #190 changes a cited execution boundary and the sweep has not been
  repeated;
- a candidate is ambiguous between executor operation and user-facing advice;
- a required host fallback cannot preserve the named skill's semantics;
- the change would alter lifecycle order, gate behavior, or approval policy;
- a named verification gate fails twice after one bounded correction; or
- scope expands beyond canonical OAT project lifecycle skills.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, PR #190 and
its project, all cited canonical skills, and focused tests when that soft
dependency changes, substantial time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, cited contracts or intent change,
another PR implements part of the outcome, or a load-bearing current miss
cannot be reproduced.

Refresh or supersede the plan before executing stale call-site classifications.

## Review focus

- Review the classification matrix, especially exemptions and fallbacks.
- Ensure clauses sit at actual execution boundaries.
- Confirm no lifecycle behavior changed beyond mandatory loading.
- Confirm landed PR/project work was reconciled rather than overwritten.
