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
  - `.agents/skills/oat-project-complete/SKILL.md:722` ("Follow the
    `oat-project-pr-final` skill's process (Steps 0.5 through 4) inline")
    is an executor-operated inline replication of a named skill with no load
    clause and no stated capability rationale; it belongs in the initial
    classification and is the canary the discovery sweep must find on its own
    (verified 2026-09-05).
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

| Type                   | Dependency                                                                                                                                          | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Current state                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft integration       | [PR #190](https://github.com/voxmedia/open-agent-toolkit/pull/190) / [review-plan-workflow](../../../projects/shared/review-plan-workflow/state.md) | If its head or disposition changes first, sweep the landed/terminal diff and preserve any new execution pointers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Open draft at `81a51d2d845afd7fdafc03f75eec009007ea135a`.                                                  |
| Satisfied revalidation | `tool-pack-scope-provider-truthfulness` merged as PR #255 (`a06e9713a`, 2026-09-03)                                                                 | Before dispatch, re-sweep `oat-project-implement/references/dispatch-and-dry-run.md` (+11 lines of dispatch-lineage guidance) and the review-provide skills for bare execution pointers, then bump any touched skill again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Landed; drift confirmed 2026-09-03 and re-run 2026-09-04.                                                  |
| Satisfied revalidation | [PR #246](https://github.com/voxmedia/open-agent-toolkit/pull/246) / `gate-execution-contract-hardening`                                            | Re-run the bounded sweep after merge and preserve its structured-command and lifecycle-gate edits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Satisfied; the delivered gate clauses are adjacent, compatible, and remain owned by PR #246.               |
| Soft ordering          | W3 group 2 plan [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md)       | Runs after this plan; both edit `create-oat-skill/SKILL.md`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Pending.                                                                                                   |
| Soft ordering          | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                          | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |
| Soft ordering          | Shared write: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts` (2026-09-05 Bugbot finding on PR #260)        | Never in one parallel group with any other plan that writes this file; wave order lands them in sequence (W2 group 2, W3 group 1, W4 group 1, W5 group 4). The other writers are: W3 group 1 [Require repo-wide call-site sweeps for cross-cutting options](./2026-08-30-require-repo-wide-call-site-sweeps.md); W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pending; the execution program keeps each of these lanes in a different group.                             |
| Soft ordering          | Shared write: `.agents/skills/oat-project-next/SKILL.md` (2026-09-05 Bugbot finding on PR #260)                                                     | Never in one parallel group with any other plan that writes this file; wave order lands them in sequence (W2 group 2, W4 group 1, W5 group 1, W5 group 4). The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Pending; the execution program keeps each of these lanes in a different group.                             |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                                                                                                                                                                                                                           | Required update                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                                                                                                                                                                                                                                   | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted.                                                                                    |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes              | `.agents/skills/oat-project-implement/SKILL.md`, `references/phase-execution.md`, `post-implement-sequence-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts` (version pins), `.agents/docs/autonomy-contract.md` (PR #190 head `63161897dd40a66e1b29cf19e286665895c40dde`) | If #190 merges first: re-run the discovery sweep over the landed lifecycle diff before editing and re-anchor the pins; if this lands first, #190 rebases. |

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
- Git/PR convention: bundled skill/agent changes are release-shaped; the
  lockstep bump is owned by the wave fan-in in lane mode (see Scope). Do not
  push or open a PR unless instructed.

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
- Changed skill versions, their pins in
  `packages/cli/src/validation/skills.test.ts`, and managed provider views.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

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

The test has two halves, and the fixed matrix alone is not enough: a matrix
detects removal of a known clause but lets a newly added bare pointer escape.
The second half is discovery: enumerate every candidate directive inside the
bounded surface (an execution verb from the classification list followed
within the same sentence by an `oat-project-*` skill name), look each
candidate up in the matrix or in an explicit exemption list keyed by file and
anchor, and fail on any unclassified candidate with the file, anchor, and
sentence in the failure message. Exemptions are enumerated, not pattern-wide.

Known required rows include implement closeout, autonomous chaining,
quick-start's plan-writing transition, execution-capable review/fix handoffs,
and completion's inline PR-final replication at
`oat-project-complete/SKILL.md:722` (classify it as `explicit-fallback` only if
step 3 adds the capability rationale, otherwise `load-required`). Known
compliant/exempt rows include `oat-project-next` and the documented summary
inline fallbacks. Run the discovery half before hand-writing the matrix and
confirm it surfaces the `:722` row unprompted.

**Verify:** two mutations, each restored afterwards: (a) remove one load
clause and observe the focused test fail; (b) insert a new bare pointer such
as "Run `oat-project-summary` now." into a bounded reference outside every
existing anchor and observe the discovery half fail naming that sentence.

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

### 4. Refresh managed views

Run `oat sync --scope all` and inspect provider-view changes. Reconcile rather
than overwrite any landed PR #190 or gate-contract change. Update the exact
version pins in `packages/cli/src/validation/skills.test.ts` for every bumped
skill.

**Verify:** `pnpm lint && pnpm format && pnpm run check:skill-bumps` → canonical
and generated skill surfaces pass.

### 5. Run the mode's gates

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in owns
the lockstep bump and the full definition-of-done sequence. **Standalone mode
only:** bump the five public packages above freshly fetched `origin/main` and
run the eight AGENTS.md gates in order.

Run focused lifecycle and skill tests independently so Turbo cache replay is
not the only evidence.

## Test plan

- Add a stable-anchor call-site matrix to
  `post-implement-sequence-contracts.test.ts` or a tightly scoped adjacent test.
- Prove each executor-operated row contains a load-and-follow contract or an
  explicit fallback rationale.
- Prove the discovery half fails on an unclassified candidate and lists
  exemptions explicitly.
- Include both red/green mutation proofs (removed clause; inserted bare
  pointer).
- Update exact skill-version pins in `packages/cli/src/validation/skills.test.ts`.
- Run focused tests, skill validation, lint/format, and the mode's gates.

## Done criteria

- [ ] Closeout loads each named lifecycle skill before execution.
- [ ] Every bounded-sweep hit is classified and contract-tested, and the
      discovery half fails on any new unclassified candidate.
- [ ] Remembered outcomes and ambient discovery are explicitly non-compliant.
- [ ] Intentional equivalent inline fallbacks remain available and documented.
- [ ] Lifecycle ordering, snapshots, approvals, and gate semantics are unchanged.
- [ ] Every changed skill has its required bump and pin update.
- [ ] Managed provider views pass.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
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
