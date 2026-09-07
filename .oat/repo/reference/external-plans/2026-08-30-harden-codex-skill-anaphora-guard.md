---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260827-harden-the-codex-skill-below.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260827-harden-the-codex-skill-below
oat_issue_url: null
created: '2026-08-31T00:01:21Z'
---

# Harden the codex-skill below-floor anaphora guard

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** This plan owns one narrow escaped anaphora class
> in the existing codex-skill test. It must preserve the legitimate direct-API
> confirmation clause and must not absorb the broader span/probe-runner backlog.

## Outcome

The below-task-class-floor guard rejects a confirmation requirement expressed
in an immediately following anaphoric clause such as “In that case, confirm
before launching.” It still permits confirmation when a clause explicitly and
independently classifies the selected model as a direct-API specialist route.

## Source and live evidence

- Source backlog item:
  [BL-260827-harden-the-codex-skill-below — Harden below-floor guard against paraphrase and anaphora](../../pjm/backlog/items/BL-260827-harden-the-codex-skill-below.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs:109-144`
    selects only clauses containing the literal “below the route” before
    applying its confirmation prohibition.
  - An immediately following clause beginning “In that case” or “Then” is not
    selected and can therefore reintroduce a blocking confirmation.
  - `.agents/skills/codex-skill/SKILL.md:24-30` intentionally contains two
    distinct rules: below-floor user selections warn without blocking, while
    an explicitly classified direct-API specialist route requires confirmation.
  - [Wave 4 execution summary](../project-summaries/20260830-wave-4-execution.md)
    at lines 123-128 records the residual and that an unqualified proximity
    window false-failed the shipped direct-API exception.
  - The focused command
    `node --test .agents/skills/codex-skill/tests/codex-skill-contract.test.mjs`
    passed 8 tests on the baseline, proving current text is green but not that
    the escaped anaphora is rejected.
  - [PR #222](https://github.com/voxmedia/open-agent-toolkit/pull/222) landed
    the baseline contract; [PR #223](https://github.com/voxmedia/open-agent-toolkit/pull/223)
    captured its follow-up findings.

## Dependencies

| Type                  | Dependency                                                                                        | Required state                                                                           | Current state            |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| Related, not blocking | [BL-260827-span-based-prose-guards](../../pjm/backlog/items/BL-260827-span-based-prose-guards.md) | Keep separate until its shared runner, anchor format, and migration roster are designed. | Open and not plan-ready. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                         | Required update                                                        |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections. | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted. |
| `review-plan-workflow` (draft PR #190) merges                                        | No               | None.                                                   | None.                                                                  |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/codex-skill/SKILL.md .agents/skills/codex-skill/tests/codex-skill-contract.test.mjs .agents/skills/subagent-orchestration/references/provider-codex.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

If the below-floor/direct-API paragraph changed, rerun the mutation against the
new semantic boundary. Do not preserve clause indexes from this baseline.

## Repository conventions

- Keep the change in the existing Node contract test unless live prose itself
  is wrong; no `SKILL.md` change or skill-version bump is currently planned.
- Use semantic anchors and clause relationships, not physical line numbers.
- Run `pnpm lint && pnpm format` for `.agents/skills` test changes.
- The test is a bundled skill asset, so the change is release-shaped; the
  lockstep bump is owned by the wave fan-in in lane mode (see Scope).
- Run the focused Node test independently, then the mode's gates in step 4.
- Do not push or open a PR unless instructed.

## Scope

### In scope

- `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs` — relational
  detection for anaphoric clauses immediately following below-floor guidance.
- Permanent negative cases for “In that case” and “Then.”
- Preservation test for the explicit direct-API specialist exception.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- A general Markdown span parser or shared probe runner.
- Changing model selection, task-class floors, or confirmation policy.
- Broadening the direct-API exception.
- Refactoring unrelated codex-skill guards or provider references.

## Current state

The test normalizes prose, splits on sentence/semicolon boundaries, selects
clauses containing “below the route,” and checks only those selected clauses.
This is intentionally narrower than a proximity window because the next
independent direct-API clause legitimately says “confirm before launching.” The
repair must follow only explicit anaphoric continuations of the below-floor
clause, not every neighboring clause.

## Implementation steps

### 1. Extract the below-floor relational assertion

Refactor the current test into a local helper that normalizes and segments the
provided prose. For every clause containing the stable below-floor concept,
build a guarded span from that clause plus consecutive immediately following
clauses that begin with a bounded anaphor such as `In that case` or `Then`.

Do not include a following clause merely because it is nearby. Stop the span at
an independent clause, especially one that states its own direct-API condition.

**Verify:** the current shipped paragraph remains accepted unchanged.

### 2. Apply confirmation prohibition to the guarded span

Reuse the existing `requiresConfirmation` semantic pattern against each guarded
span. Preserve the existing non-blocking requirement and its positive anchor.
Improve failure labels to identify the below-floor anchor and the attached
anaphoric clause without relying on line numbers.

**Verify:** an injected `In that case you must confirm before launching.` after
the below-floor clause fails, while the explicit direct-API clause passes.

### 3. Add permanent negative and control cases

Add helper-level cases for at least:

- `In that case, confirm before launching` — rejected;
- `Then obtain authorization` — rejected;
- an independent clause explicitly conditioned on direct-API classification —
  accepted; and
- a non-blocking anaphoric continuation — accepted.

These cases must execute the same helper used for live skill prose.

**Verify:** remove anaphora attachment temporarily and observe both negative
cases fail their expectations, then restore and pass the suite.

### 4. Run the mode's gates

Do not bump the codex-skill version unless its `SKILL.md` changes in the final
diff.

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

**Verify:** every named command exits zero with its own captured exit code.

## Test plan

- Focused live-prose contract test.
- Two escaped-anaphora negative cases.
- Explicit direct-API and non-blocking controls.
- Red/green proof by disabling anaphora attachment.
- Lint/format, package-version, release, and complete repository gates.

## Done criteria

- [ ] Immediate bounded anaphoric continuations are part of the guarded span.
- [ ] Blocking confirmation in those continuations fails.
- [ ] The explicit direct-API specialist exception still passes.
- [ ] The implementation uses no unqualified proximity window.
- [ ] Permanent cases exercise the same helper as live prose.
- [ ] No unrelated prose guard or skill version changes.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- current prose no longer separates below-floor and direct-API semantics;
- correct detection requires a general Markdown parser/shared runner;
- the direct-API control is rejected by the proposed relation rule;
- a negative case passes after anaphora attachment is removed;
- implementation would change confirmation policy; or
- a named verification gate fails twice after one bounded correction.

## Execution record (2026-09-06, wave 2)

Executed as wave-2 p02 (PR #267): the accepted shape is anaphor-only attachment — a continuation is attached to the non-blocking anchor only when it opens with an anaphor (demonstrative case/circumstance/scenario nouns, list-marker and blockquote forms), and a clause that classifies its own route is accepted as independent. A Codex-suggested 'classifies its own route' exemption was reverted because every workable form was an ordered-token heuristic that admitted real escapes. Documented fail-open boundary: a filler clause between the anchor and the anaphor breaks attachment (pinned as known-accepted; antecedent resolution belongs to `BL-260827-span-based-prose-guards`, where the confirmation-vocabulary and blockquoted-ordered-marker residuals are also recorded). Pinned: 15 rejected, 6 accepted controls, 6 known-accepted boundary cases.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, PRs #222 and
#223, the Wave 4 summary, live codex-skill prose, provider-Codex reference, and
focused test when main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, any policy wording changes, the
broad guard project begins, or the escaped mutation cannot be reproduced.
Refresh or supersede stale clause relationships before execution.

## Review focus

- Attack the anaphora boundary with both false-negative and false-positive cases.
- Confirm the direct-API exception is structural, not phrase-whitelisted.
- Reject a generic proximity window or broad parser work.
- Confirm live prose and synthetic cases share one assertion path.
