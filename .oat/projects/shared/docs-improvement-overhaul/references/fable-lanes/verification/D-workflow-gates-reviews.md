# D. Workflow gates and automated reviews: which to choose, and why

- **Gate**: a final check command run by a lifecycle skill (plan, quick-start, lite, import-plan, implement). It is usually `oat --json gate review`, which sends a review to a _different_ agent runtime and turns findings into pass/fail.
- **Exec target**: a named way to launch a reviewer runtime.
- **Artifact review**: a same-session `oat-reviewer` check of a generated `plan.md` or analysis report before the next step uses it.

Edit gates with `oat gate set` and `oat gate target set`, not `oat config set` (see [Workflow Gates](../workflows/advanced/workflow-gates.md)).

## 1. Add a lifecycle gate?

**The choice**: `workflow.gates.skills.<skill>`, set with `oat gate set <skill> --command … --on-failure …`.

| Option                     | Choose it when                                       | You give up               | In practice                                          |
| -------------------------- | ---------------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| None                       | You want speed, or have only one runtime installed   | A second-runtime check    | The skill finishes after its own reviews             |
| On `oat-project-implement` | You want independent sign-off on code                | Up to 30 min per closeout | Completion waits until the gate result is received   |
| On a planning skill        | You want a second model to check plans before coding | Up to 15 min              | The plan is not marked ready until the gate resolves |

**Default**: none. The built-in defaults have no `gates` key. **Why**: not stated. Likely rationale (inferred): a gate needs a second runtime that OAT cannot assume is installed.

**Which should I pick**

- Solo, wanting speed: none.
- A second model on every plan: gate the planning skills.
- One project skipping a team gate: set `oat_skill_gate_overrides: {<skill>: disabled}` in its `state.md`.
- `--layer` defaults to `user`. Put team gates in `shared`, with no `--target`.

## 2. When a gate finds blocking problems

**The choice**: `--on-failure block|prompt|warn` and `--max-attempts`.

| Option   | Choose it when             | You give up        | In practice                                                                                                          |
| -------- | -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `block`  | Findings must be fixed     | Time on fix rounds | The agent fixes and reruns up to `maxAttempts` times, then hands the problem to a person; the skill stays incomplete |
| `prompt` | A person decides each case | Unattended runs    | With no answer, the gate stays blocked                                                                               |
| `warn`   | The gate is only advisory  | Enforcement        | Records the failure and continues                                                                                    |

Launch failures, timeouts and invalid artifacts stay blocked under every option. They don't use up attempts.

**Default**: `onFailure` has no default and is required. `maxAttempts` is `2`. **Why**: not stated.

**Which should I pick**: for a high-risk repo, use `block`. For CI, use `block` or `warn`, never `prompt`.

## 3. How independent the reviewer must be

**The choice**: `--avoid same-family|same-runtime|none` inside the gate command.

| Option         | Choose it when                         | You give up                  | In practice                                                                           |
| -------------- | -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `same-family`  | You want a different model family      | A strict guarantee           | With no different-family target it **still runs** the best available target and warns |
| `same-runtime` | A different CLI is mandatory           | Runs on one-runtime machines | It fails with "No eligible gate exec target found"                                    |
| `none`         | You knowingly allow same-family review | Independence                 | It uses the highest-priority available target                                         |

`--target <id>` pins one target for manual or debug runs. Implement closeout rejects stored commands that include it.

**Default**: `same-family`. **Why**: the docs say it stops multi-family hosts like Cursor "reviewing with the same model family that produced the work". DR-260621 records the earlier runtime-only design.

**Which should I pick**: in a high-risk repo, use `same-runtime` for a hard guarantee. Otherwise keep the default.

## 4. Built-in or trusted exec targets

**The choice**: `oat gate target set <id> --base-command-json … --priority …`.

| Option                                                                      | Choose it when                   | You give up                                   | In practice                                                        |
| --------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Built-ins only (`codex-default`, `claude-default` 100; `cursor-default` 70) | You are getting started          | Approval prompts can stall headless reviewers | The phase gate (section 6) is never offered                        |
| Your own target with bypass flags                                           | Trusted machine, unattended runs | Safety prompts                                | A higher priority wins. It can pin a model, effort and `timeoutMs` |

**Default**: built-ins only. **Why**: OAT "should not bake dangerous provider permission flags into built-ins" (docs; DR-260629).

**Which should I pick**: for CI or headless runs on a trusted machine, add your own target with `--layer user`.

## 5. Which severity blocks

**The choice**: `--exit-nonzero-on critical|high|medium|low`, or `exit_nonzero_on` for the phase gate. A lower threshold blocks more often, which means more fix rounds. Findings below the threshold are still received.

**Default**: `high`. The legacy value `important` maps to `high`. **Why**: Likely rationale (inferred): it matches the "Critical/High: address before pass" policy.

**Which should I pick**: for a high-risk repo, use `medium`. Keep `high` otherwise.

## 6. Per-phase external gate

**The choice**: `oat_phase_review_gate` in `plan.md`, which planning skills offer to set.

| Option | Choose it when      | You give up              | In practice                                                                                              |
| ------ | ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| Off    | Most projects       | Early independent review | Only the standard per-phase reviewer runs                                                                |
| On     | Long or risky plans | One gate run per phase   | A pass doesn't pause. A block sends the phase back for fixes, bounded by `oat_orchestration_retry_limit` |

**Default**: off. It is offered only when an explicitly configured, available target exists, and never in non-interactive planning. **Why**: DR-260706 explains the no-pause design. The opt-in default is not explained.

**Which should I pick**: if your team wants a second model after every phase, turn it on.

## 7. Reviewer time budget

**The choice**: `workflow.gateTimeouts.code|artifact`, a target's `timeoutMs`, or `--timeout-ms`. **Default**: 30 min for final, phase and phase-range code reviews; otherwise 15 min. **Why**: a final review "exceeded the old 15-minute budget" (docs incident table). **Which should I pick**: a timeout counts as `review_failed`, never a pass, so raise the budget only on the slow target.

## 8. Automatic artifact review

**The choice**: `workflow.autoArtifactReview.plan` and `.analysis`. The retry bound is `oat_orchestration_retry_limit` in `state.md`.

| Option  | Choose it when                      | You give up                 | In practice                                                                                                                 |
| ------- | ----------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| On      | Almost always                       | Some minutes before handoff | Applies clear Critical and High fixes, offers Medium and Low ones, and re-reviews until clean or the retry limit is reached |
| `false` | Something else reviews the artifact | Automatic checking          | `plan.md` records "skipped", and an unverified analysis reaches the apply workflows                                         |

**Default**: both `true`. Only an explicit `false` disables a loop. The retry limit is `2` (range 0–5). **Why**: "plans and analysis artifacts are immediately consumed by downstream workflows" (project summary). The value 2 is not explained.

**Which should I pick**: keep it on. This review is same-session only, so for a second model, add a planning gate as well.

## 9. Extra review at HiLL checkpoints

A HiLL ("human in the loop") checkpoint is a planned pause in implementation. **The choice**: `workflow.autoReviewAtHillCheckpoints`. **Default**: unset, so the skill asks (suggested answer: no). `OAT_AUTONOMOUS=1` forces it on. **Which should I pick**: if nobody is around at checkpoints, set it to `true`.

## (a) Proposed home

- workflow-gates.md: sections 1–2 after `## Gate config`, 3–4 after `## Exec targets`, 7 after `## Failure behavior`.
- reviews/index.md: 5–6 after `## Phase review gate`, 8 after `## Auto artifact-review loops` (linked from configuration.md), 9 after `## Auto-review at HiLL checkpoints`.

## (b) Docs that contradict the code

1. review-flavors.md:69-70, 105-120 says gates "fail closed" without an independent target. The default `same-family` falls back and warns instead.
2. review-flavors.md:67 says artifact review covers "plan/spec/design". Only `plan` and `analysis` exist.
3. workflow-gates.md:920 names a "legacy `GATE_EXEC_TIMEOUT_MS`" source. No such environment variable is read.
4. reviews/index.md:137 says HiLL auto-review is "disabled by default". It is unset, so the skill prompts.
5. Superseded decision records: DR-260621:38 (`same-runtime`) and DR-260706:26 (`important`).

## (c) Could not verify

- Stated rationale for: `maxAttempts` 2, threshold `high`, retry limit 2, opt-in phase gate, no gate by default.
- Code enforcement of the 0–5 retry-limit range. I found it only in prose.
- Whether `OAT_GATE_LIVENESS_INTERVAL_MS` is meant to be public. Code reads it but it is undocumented. Liveness is otherwise fixed, so it is not a team choice.
- Not covered: `workflow.reviewExecutionModel` and `workflow.autoNarrowReReviewScope`.

## Evidence

- No gate by default; gate precedence `local > shared > user`; target merge order: `packages/cli/src/config/resolve.ts:114-153`, `:266-287`, `:296-310`.
- Gate schema, `onFailure` values, timeout bounds 1,000–14,400,000: `packages/cli/src/config/oat-config.ts:207-210`, `:244-249`, `:269-277`; gate missing valid `onFailure` dropped `:509-516`; `maxAttempts` default 2 `:460-467`.
- `oat gate set` requires `--on-failure`, `--max-attempts` default 2, `--layer` default `user`: `packages/cli/src/commands/gate/index.ts:825-833`, `:862-867`, `:1126-1139`.
- Built-in targets and priorities: `oat-config.ts:357-399`.
- `--avoid` default, filtering, no-diverse fallback, warning, no-target error: `gate/index.ts:835-845`, `:1746-1771`, `:1865-1898`, `:1686-1698`, `:2063-2068`; docs `apps/oat-docs/docs/workflows/advanced/workflow-gates.md:19-24`, `:1041-1047`.
- `--target` excluded from lifecycle commands: `workflow-gates.md:729-735`, `:760-764`; `.agents/skills/oat-project-quick-start/SKILL.md:857-863`.
- Threshold default, legacy aliases, mapping: `gate/index.ts:450-465`, `:847-860`, `:2545-2561`; `.agents/skills/oat-project-implement/references/plan-and-resume.md:289`; policy `apps/oat-docs/docs/workflows/projects/reviews/index.md:114`.
- `onFailure` semantics; operational failures stay blocked and do not consume attempts; `prompt` without answer stays blocked: `oat-project-quick-start/SKILL.md:885-889`, `:900-902`; `.agents/skills/oat-project-implement/references/completion-and-closeout.md:531-551`; `workflow-gates.md:890-906`.
- Per-project disable: `workflow-gates.md:71-105`; `.oat/repo/reference/decisions/DR-260906-project-scoped-gate-overrides.md`.
- Gate-aware skills: `oat_gateable: true` in `.agents/skills/oat-project-{plan,implement,quick-start,lite,import-plan}/SKILL.md`; `workflow-gates.md:65-69`.
- Layer rationale: `apps/oat-docs/docs/reference/configuration.md:362-365`; `workflow-gates.md:294-297`, `:606-609`; `DR-260629-keep-review-gates-stateful.md:55`; `DR-260410-add-workflow-preference-keys.md:47`.
- Independence rationale: `DR-260621-ship-workflow-gates-at-runtime.md:38-57`; `DR-260718-family-aware-gate-exclusions.md`.
- Phase gate: `plan-and-resume.md:269-298`; `.agents/skills/oat-project-implement/references/phase-execution.md:786`, `:809-845`; qualification probe and non-interactive rule `.agents/skills/oat-project-plan-writing/SKILL.md:310-330`, `:394-402`; `DR-260706-phase-review-gate-is-non.md:22-40`; `reviews/index.md:139-170`.
- Timeouts: `gate/index.ts:478`, `:911-1016`; `workflow-gates.md:912-927`, `:1016-1021`, `:1033`.
- Artifact review: `oat-config.ts:232-235`; `resolve.ts:123-126`; `oat-project-plan-writing/SKILL.md:515-557`; `oat-project-quick-start/SKILL.md:789-790`, `:915-918`; `.oat/templates/state.md:16`; `.oat/repo/reference/project-summaries/20260604-skill-automation-and-review.md:33-34`; `reviews/index.md:172-187`.
- HiLL auto-review: `resolve.ts:121`, `:230-239`; `plan-and-resume.md:153-157`, `:216-233`; `packages/cli/src/commands/config/index.ts:985`.
- Contradiction 1: `apps/oat-docs/docs/workflows/projects/reviews/review-flavors.md:69-70`, `:105-110`, `:118-120` vs `gate/index.ts:1882-1897`. Contradiction 2: `review-flavors.md:67` vs `oat-project-plan-writing/SKILL.md:519-522`. Contradiction 3: `workflow-gates.md:920` vs `gate/index.ts:478`, `:1015` (no env read). Contradiction 4: `reviews/index.md:137` vs `resolve.ts:121`, `plan-and-resume.md:155-157`, `:223-228`. Contradiction 5: `gate/index.ts:838`, `:461-465`.
- Liveness env: `gate/index.ts:1082-1095`; fixed bounds `workflow-gates.md:979-981`.
- Fixed 3-cycle review cap (not configurable; gate artifacts excluded): `.agents/skills/oat-project-review-receive/SKILL.md:602-622`.
