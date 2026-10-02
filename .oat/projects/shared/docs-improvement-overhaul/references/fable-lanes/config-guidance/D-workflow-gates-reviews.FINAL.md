> **Status.** One agent drafted this. A second agent verified it independently (verdict: ACCEPT WITH CHANGES), and all of its corrections have been applied.
> The verifier worked by reading the code at `a080dfbef` and comparing installed-CLI 0.3.13 help output. An in-progress merge stopped the branch CLI from launching.
> No gate was run.

# D. Workflow gates and automated reviews: which to choose, and why

## Terms used on this page

- **Runtime**: the agent CLI (Claude Code, Codex or Cursor).
- **Model family**: the model maker or line, such as Claude versus GPT. Cursor can run several.
- **Gate**: an extra review that a lifecycle skill runs as its final check: mainly plan, quick-start, lite, import-plan and implement, plus discover or design if configured. It is usually `oat --json gate review`, which asks another agent CLI, preferably on a different model family, to review the work. It then turns the findings into pass or fail.
- **Exec target**: a saved command that starts a reviewer CLI, such as `claude -p`.
- **HiLL checkpoint** ("human in the loop"): a planned pause where a person approves before implementation continues.
- **Artifact review**: an automatic check of a generated `plan.md` or analysis report. It runs **same-session**, in the agent conversation that wrote it.
- **Closeout**: the end of `oat-project-implement`.
- **Phase / phase-range**: `p02` / `p02-p03`.
- **Headless**: no person is available to answer prompts, as in CI.
- **Received**: processed by `oat-project-review-receive` into fixes or deferrals.
- **Layers**: `shared` is the committed `.oat/config.json`; `local` is the uncommitted `.oat/config.local.json`; `user` is `~/.oat/config.json`, which applies to all your repos.

Gates and targets are edited with `oat gate set` and `oat gate target set`, not `oat config set` (see [Workflow Gates](../workflows/advanced/workflow-gates.md)).

## 1. Add a lifecycle gate?

**The choice**: `workflow.gates.skills.<skill>`, set with `oat gate set <skill> --command … --on-failure …`.

| Option                     | Choose it when                                       | You give up                                                         | In practice                                          |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| None                       | You want speed, or have only one runtime             | A second-reviewer check                                             | The skill finishes after its own reviews             |
| On `oat-project-implement` | You want independent sign-off on code                | Up to 30 min per gate run (default), times up to `maxAttempts` runs | Closeout waits until the gate result is received     |
| On a planning skill        | You want a second model to check plans before coding | Up to 15 min per gate run with `--review-type artifact`             | The plan is not marked ready until the gate resolves |

**Default**: none. The built-in defaults have no `gates` key. **Why**: not stated. Likely rationale (inferred): a gate needs a second runtime, and OAT cannot assume one is installed.

**Which should I pick**

- Solo, wanting speed: no gate.
- A second model on every plan: gate the planning skills.
- Team policy: use `--layer shared` (the default is `user`). A shared gate overrides a user gate for the same skill.
- To skip a shared gate on one machine: `oat gate set <skill> --disable --layer local`.
- To skip it in one project: `oat_skill_gate_overrides: {<skill>: disabled}` in that project's `state.md`. Discover and design gates cannot be skipped this way.

**Evidence**: `packages/cli/src/config/resolve.ts:114-154`, `:266-287` (first declaring layer wins: local > shared > user); `packages/cli/src/commands/gate/index.ts:825-833`, `:998-1015`; `apps/oat-docs/docs/workflows/advanced/workflow-gates.md:71-89`; `.agents/skills/oat-project-implement/references/completion-and-closeout.md:535-542`.

## 2. When a gate finds blocking problems

**The choice**: `--on-failure block|prompt|warn` and `--max-attempts`.

| Option   | Choose it when             | You give up        | In practice                                                                                                                                                                                                                               |
| -------- | -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block`  | Findings must be fixed     | Time on fix rounds | The agent fixes the findings and reruns the gate, at most `maxAttempts` runs in total (default 2: the first run plus one fix-and-rerun). After that a person takes over, and the skill stays incomplete. Reruns are narrowed (section 10) |
| `prompt` | A person decides each case | Unattended runs    | With no answer, the gate stays blocked                                                                                                                                                                                                    |
| `warn`   | The gate is only advisory  | Enforcement        | Records the failure and continues                                                                                                                                                                                                         |

Launch failures, timeouts that produced no review, and invalid artifacts are not findings, so `onFailure` should not apply to them. Implement and lite keep them blocked; for the other skills, see contradiction 5.

**Default**: `onFailure` has no default. `oat gate set` rejects a gate without it, and a stored gate without a valid value is silently dropped. `maxAttempts` defaults to 2, which is also what an invalid stored value becomes. **Why**: not stated.

**Which should I pick**: for a high-risk repo (production, security or data-migration code), use `block`. For headless runs, use `block` or `warn`, never `prompt`.

**Evidence**: `gate/index.ts:862-867`, `:1126-1139`; `packages/cli/src/config/oat-config.ts:460-467`, `:509-516`; `completion-and-closeout.md:535-548`; `.agents/skills/oat-project-lite/SKILL.md:442-443`; `workflow-gates.md:903-920`; `apps/oat-docs/docs/workflows/projects/reviews/index.md:189-197`.

## 3. How independent the reviewer must be

> **Read this before relying on a gate for independence.**
>
> - The default, `same-family`, falls back to the best available reviewer, which may be on the same runtime. When it does, it only records a warning in the JSON result. With `--json` it prints no separate warning line.
> - `same-runtime` guarantees a different CLI only when OAT detects the host runtime (Claude Code, Codex or Cursor). On an undetected host, such as a plain shell or CI, it excludes nothing. It never checks the model family.
> - To confirm independence, check `diversity.achieved` in the gate result (`different-family` means it was achieved). For a hard guarantee, pin a known-independent target with `--target` in a manual run.

**The choice**: `--avoid same-family|same-runtime|none` inside a lifecycle gate command that you configure. The per-phase gate (section 6) always uses `same-family`.

| Option         | Choose it when                                    | You give up                       | In practice                                                                                            |
| -------------- | ------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `same-family`  | You want a different model family when one exists | A guarantee                       | Skips the producer's family, with the fallback described above                                         |
| `same-runtime` | You want a different CLI                          | Runs on machines with one runtime | On a detected host with no other runtime available, it fails with "No eligible gate exec target found" |
| `none`         | You knowingly allow same-family review            | Independence                      | Uses the highest-priority available target                                                             |

`oat gate set` accepts `--target`, but every lifecycle skill refuses to run a stored command that contains it.

**Default**: `same-family`. **Why**: the docs say it is meant to keep multi-family hosts like Cursor from reviewing with the same model family. DR-260621 notes that "unknown hosts cannot be excluded by runtime".

**Which should I pick**: keep the default. In a high-risk repo, check `diversity.achieved` in every gate result.

**Evidence**: `gate/index.ts:835-845`, `:1686-1708`, `:1754-1757`, `:1838-1863`, `:1882-1897`, `:2050-2056`, `:2063-2068`; `.agents/skills/oat-project-implement/references/phase-execution.md:819-825`; `completion-and-closeout.md:727-736`; `.agents/skills/oat-project-quick-start/SKILL.md:867`; `workflow-gates.md:19-24`, `:1054-1060`; `.oat/repo/reference/decisions/DR-260621-ship-workflow-gates-at-runtime.md:38-57`.

## 4. Built-in or trusted exec targets

**The choice**: `oat gate target set <id> --base-command-json … --priority …`.

| Option                                                                               | Choose it when                   | You give up                                                                  | In practice                                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Built-ins only (`codex-default` and `claude-default` at 100; `cursor-default` at 70) | You are getting started          | Headless reliability, because provider approval prompts can stall a reviewer | Planning never offers the per-phase gate (section 6)                                  |
| Your own target with bypass flags (provider options that skip tool-approval prompts) | Trusted machine, unattended runs | Those safety prompts                                                         | A higher priority wins. The target can pin a model, an effort level and a `timeoutMs` |

**Default**: built-ins only. **Why**: the docs say OAT "should not bake dangerous provider permission flags into built-ins" (also DR-260629).

**Which should I pick**: for headless runs on a trusted machine, add your own target with `--layer user`.

**Evidence**: `oat-config.ts:357-399`; `.agents/skills/oat-project-plan-writing/SKILL.md:310-345`; `workflow-gates.md:606-609`; `DR-260629-keep-review-gates-stateful.md:55`.

## 5. Which severity blocks

**The choice**: `--exit-nonzero-on critical|high|medium|low` in the gate command, or `exit_nonzero_on` for the phase gate. A lower threshold blocks more often and means more fix rounds. Findings below the threshold are still received.

**Default**: `high`. The legacy names `important` and `minor` map to `high` and `low`. **Why**: Likely rationale (inferred): it matches the review policy "Critical/High: address before pass".

**Which should I pick**: in a high-risk repo, use `medium`. Otherwise keep `high`.

**Evidence**: `gate/index.ts:450-465`, `:847-860`, `:2545-2561`; `.agents/skills/oat-project-implement/references/plan-and-resume.md:289`; `reviews/index.md:114`.

## 6. Per-phase external gate

**The choice**: `oat_phase_review_gate` in the `plan.md` front matter.

| Option                      | Choose it when      | You give up                 | In practice                                                                                                                                             |
| --------------------------- | ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Off                         | Most projects       | An early independent review | Only the reviewer the implement skill runs after each phase checks the work                                                                             |
| On (all or selected phases) | Long or risky plans | One gate run per phase      | A pass does not pause. A block sends the phase back for fixes, bounded by `oat_orchestration_retry_limit` (the project's fix-round limit in `state.md`) |

**Default**: off. Non-interactive planning never turns it on. **Why**: DR-260706 explains why the gate never pauses ("HiLL already owns human pauses"). The opt-in default is not explained.

**Which should I pick**: if your team wants a second model after every phase, turn it on. Planning offers it only after you configure your own exec target (section 4); otherwise, add `oat_phase_review_gate` to `plan.md` yourself.

**Evidence**: `plan-and-resume.md:269-298`; `phase-execution.md:786`, `:809-845`; `oat-project-plan-writing/SKILL.md:310-345`, `:394-402`; `DR-260706-phase-review-gate-is-non.md:22-40`; `reviews/index.md:139-170`.

## 7. Reviewer time budget

**The choice**: how long one gate run may take, from 1,000 to 14,400,000 ms. The first valid value wins:

1. `--timeout-ms` in the command;
2. the selected target's `timeoutMs`;
3. `workflow.gateTimeouts.code` or `.artifact`;
4. `OAT_GATE_EXEC_TIMEOUT_MS`;
5. the built-in default.

**Default**: 30 min for code reviews at final, phase or phase-range scope; otherwise 15 min. These defaults depend on the `--review-type` and `--review-scope` flags in the gate command. A command without them gets 15 minutes and ignores `workflow.gateTimeouts`. **Why**: a large final review "exceeded the old 15-minute budget" (docs incident table).

**Which should I pick**: raise the budget only on the slow target. A timeout with no recovered review artifact counts as `review_failed` (no verdict), never a pass. If the reviewer still wrote a valid artifact, OAT uses it and marks the result `lateCompletion: true`.

**Evidence**: `gate/index.ts:478`, `:911-1016` (environment variable read at `:986`), `:4444-4446`, `:4480-4501`; `workflow-gates.md:926-933`, `:1023-1035`, incident table near `:1043`; `apps/oat-docs/docs/reference/configuration.md:284-285`.

## 8. Automatic artifact review

**The choice**: `workflow.autoArtifactReview.plan` and `workflow.autoArtifactReview.analysis`. The rewrite limit is `oat_orchestration_retry_limit` in the project's `state.md`.

| Option  | Choose it when                      | You give up                  | In practice                                                                                                           |
| ------- | ----------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| On      | Almost always                       | A few minutes before handoff | Applies clear Critical and High fixes, offers Medium and Low ones, and re-reviews until clean or the limit is reached |
| `false` | Something else reviews the artifact | Automatic checking           | `plan.md` records "skipped", and an unverified analysis goes to the apply workflow                                    |

**Default**: both `true`. Only a boolean `false` disables a loop. The retry limit is `2`; a limit of `0` still allows one review. **Why**: "plans and analysis artifacts are immediately consumed by downstream workflows" (project summary). The value 2 is not explained.

**Which should I pick**: keep it on. The review is same-session, so for a second model, also add a planning gate.

**Evidence**: `oat-config.ts:232-235`, `:766-776`; `resolve.ts:123-126`; `oat-project-plan-writing/SKILL.md:515-557`; `.oat/templates/state.md:16`; `.oat/repo/reference/project-summaries/20260604-skill-automation-and-review.md:33-34`; `reviews/index.md:172-187`.

## 9. Extra review at HiLL checkpoints

**The choice**: `workflow.autoReviewAtHillCheckpoints`, which runs an extra lifecycle review whenever a HiLL checkpoint is reached. It never affects the reviewer that runs after each phase.

**Default**: unset, so the implement skill asks and suggests "no". **Why**: not stated.

- Lite projects have no checkpoints, so this setting does not apply to them.
- The first implementation run copies the value into `plan.md`. Later config changes do not affect that project.
- `OAT_AUTONOMOUS=1` turns it on for non-lite projects.

**Which should I pick**: if nobody is around at checkpoints, set `true` before the first implementation run.

**Evidence**: `resolve.ts:121`, `:230-239`; `plan-and-resume.md:113-128`, `:153-157`, `:216-236`.

## 10. Re-review scope

**The choice**: `workflow.autoNarrowReReviewScope`.

| Option  | Choose it when                                 | You give up                | In practice                                                                                                                                           |
| ------- | ---------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`  | Normal use                                     | Re-checking unchanged code | A re-review, gate reruns included, covers only commits since the prior matching review. It falls back to full scope when that link cannot be verified |
| `false` | You want every re-review to see the full scope | Time                       | Each re-review covers the full nominal scope                                                                                                          |

**Default**: `true`. **Why**: not stated beyond the docs' "narrowing is enabled by default".

**Which should I pick**: keep `true`. Set `false` for high-risk repos where fixes might break code that was already reviewed.

**Evidence**: `resolve.ts:122`; `packages/cli/src/commands/config/index.ts:962-999`; `reviews/index.md:189-208`.

## 11. How the final implementation review runs

**The choice**: `workflow.reviewExecutionModel`.

| Option          | Choose it when                                    | You give up                  | In practice                                                                                                   |
| --------------- | ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `subagent`      | Your host supports subagents                      | —                            | Starts a reviewer subagent without asking                                                                     |
| `inline`        | You accept a review in the current conversation   | Separation from the producer | Used only when the inline route passes the skill's check; otherwise the skill uses the pinned route or blocks |
| `fresh-session` | You will run the review yourself in a new session | Automation                   | Prints instructions and waits, with an option to switch to subagent or inline                                 |

**Default**: unset, so the skill asks. **Why**: DR-260410 added these keys so people can "answer repetitive confirmation prompts once".

**Which should I pick**: solo or headless, use `subagent`. This setting never puts the review on a different runtime; for that, use an implement gate (section 1).

**Evidence**: `resolve.ts:120`; `config/index.ts:962-999`; `completion-and-closeout.md:243-271`; `.oat/repo/reference/decisions/DR-260410-add-workflow-preference-keys.md`.

## Proposed home

These page paths are from the pre-merge tree. Re-check them against the merged tree before placing anything.

- `workflows/advanced/workflow-gates.md`:
  - sections 1–2 after `## Gate config`;
  - sections 3–4 after `## Exec targets`;
  - section 7 after `## Failure behavior`.
- `workflows/projects/reviews/index.md`:
  - sections 5–6 after `## Phase review gate`;
  - section 8 after `## Auto artifact-review loops` (link it from `reference/configuration.md`);
  - section 9 after `## Auto-review at HiLL checkpoints`;
  - section 10 after `## Re-review scope narrowing`;
  - section 11 after `## Phase and final review`.

## Docs that contradict the code

1. `reviews/review-flavors.md:69-70`, `106-110` and `118-120` say an unavailable independent target makes the gate fail closed. The default `same-family` falls back to any available target (`gate/index.ts:1882-1897`). `workflow-gates.md:1054-1060` agrees with the code.
2. `reviews/review-flavors.md:67` says the auto artifact-review loop covers "plan/spec/design". Only the `plan` and `analysis` loops exist (`oat-project-plan-writing/SKILL.md:521-522`; `oat-config.ts:232-235`).
3. `reviews/index.md:137` says HiLL auto-review is "disabled by default". It is unset, and the skill asks with "no" suggested. The page also omits that autonomous runs force it on (`resolve.ts:121`; `plan-and-resume.md:153-157`, `:224-228`). This is an omission rather than a hard contradiction.
4. Two decision records are out of date but still marked accepted:
   - DR-260621:38 names the old `same-runtime` default, which is now `same-family` (`gate/index.ts:838`).
   - DR-260706:26 uses the old name `important`, which still maps to `high` (`gate/index.ts:461-465`).
5. The plan, quick-start and import-plan skill text sends every nonzero gate exit to `onFailure`, so under `warn` an agent could continue past an operational failure. The docs and the implement and lite skills keep operational failures blocked. The same three skills also still say the dispatcher avoids "the same runtime", but the default is `same-family`.
   - Plan, quick-start and import-plan: `oat-project-plan/SKILL.md:652-664`, `oat-project-quick-start/SKILL.md:889-892`, `oat-project-import-plan/SKILL.md:570-573`.
   - Docs, implement and lite: `completion-and-closeout.md:543-548`, `oat-project-lite/SKILL.md:442-443`, `workflow-gates.md:915-920`.

## Could not verify

- No rationale is stated for `maxAttempts` 2, the `high` threshold, the retry limit of 2, the opt-in phase gate, having no default gate, or the HiLL prompt default.
- The 0–5 retry-limit range appears only in prose; the CLI does not enforce it.
- Whether `OAT_GATE_LIVENESS_INTERVAL_MS` (`gate/index.ts:1082-1095`) is meant to be public: the code reads it, but no doc mentions it. Liveness is otherwise fixed, so it is not a team choice.
- Branch-built `config describe` output and live gate behavior: the branch CLI could not launch, and no gate was run.
- Whether artifact review's below-ceiling exception route ever uses a different provider.
- Not a choice: the fixed 3-cycle review cap, from which gate artifacts are excluded (`.agents/skills/oat-project-review-receive/SKILL.md:602-622`).
