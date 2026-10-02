# B. Dispatch policy and autonomy: which to choose, and why

Terms: the **root** is the main agent session running a project. It hands each phase and each review to a **subagent**. The **ladder** (dispatch matrix) lists, per provider, model/effort **candidates** in four **tiers**: Economy, Balanced, High, Frontier.

## 1. Dispatch policy

**The choice:** how far up the ladder subagents may go. Planning records it in the project's `state.md` as `oat_dispatch_policy`. The config keys `workflow.dispatchPolicy.mode` (`managed`|`inherit`) and `workflow.dispatchPolicy.policy` (`economy`|`balanced`|`high`|`frontier`|`uncapped`) set it too. "Dispatch ceiling" is the older name.

| Option                | Choose it when                          | You give up                                        | In practice                                                                     |
| --------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Economy / Balanced    | Routine work, cost matters              | Higher tiers are refused                           | Candidates above the cap are refused. Reviews use the cap tier's last candidate |
| High                  | Broad or security-sensitive change      | More cost on every review                          | Three tiers are eligible. Reviews are pinned at High                            |
| Frontier              | A missed defect costs more than the run | Highest cost. The top target may need model access | All tiers are eligible                                                          |
| Uncapped              | You trust the root's per-phase choice   | A cost ceiling, and pinned reviewers               | No cap. Reviewers fall back to the provider default                             |
| Inherit Host Defaults | Host settings must stay untouched       | All OAT model control                              | OAT passes no model or effort, reviewers included                               |
| Leave Unresolved      | Not decided yet                         | The ability to implement                           | Implementation blocks                                                           |

Implementers can stay below the cap; reviews always run at it.

**Default:** unset (`null`). A non-interactive run blocks and an interactive run prompts. **Why:** ADR-018 says the provider default "is not project/user-declared dispatch intent". Relying on it risked dispatching "above or below the user's intended ceiling". DR-260706 adds that Uncapped must be chosen explicitly and never implied by a missing value.

**Which should I pick**

- If you are cost-sensitive, then choose Balanced. Narrow single phases with a plan `## Dispatch Profile` row.
- If the change is critical, then choose High, and keep Frontier for the riskiest reviews.
- If your host settings must stay untouched, then choose Inherit Host Defaults.
- If this is your first trial, then choose Balanced.

## 2. Provider differences that affect the choice

| Provider | Cap holds?                                          | Watch for                                                                                               |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Codex    | Yes, through pinned roles that `oat sync` generates | Preflight blocks if `agents.max_depth` is present but below 1                                           |
| Claude   | Yes, through an agent variant or a `model` argument | Under host-managed routing, a short alias fails closed. Use versioned model IDs                         |
| Cursor   | Requested only                                      | Plan, account or typo problems silently swap the model. OAT records the request, not the model that ran |
| Others   | Advisory only                                       | Nothing is enforced                                                                                     |

## 3. Autonomous execution

**The choice:** whether one session drives the project to a final PR without asking you. Start it explicitly with the `oat-project-autonomous` skill (`<goal|project-slug|ticket-ref>`). The skill sets `OAT_AUTONOMOUS=1` and `OAT_NON_INTERACTIVE=1` for that session only and never saves them.

| Option                  | Choose it when                               | You give up               | In practice               |
| ----------------------- | -------------------------------------------- | ------------------------- | ------------------------- |
| Interactive (default)   | You want to approve checkpoints              | Unattended runs           | Each prompt waits for you |
| `OAT_NON_INTERACTIVE=1` | CI or a scripted step                        | Chaining                  | Unresolved choices block  |
| Autonomous              | The goal is clear and you will review the PR | Approving each checkpoint | See below                 |

What it does without asking:

- authorizes subagents for the run;
- defaults the review checkpoint to the final phase, then reviews and fixes there;
- adopts the ladder into the first compatible scope, in the order user, then local, then shared (shared only where policy allows);
- approves the final checkpoint after a passing review;
- runs summary, docs and PR;
- pushes phases without force.

Where it stops:

- the dispatch policy is unresolved (autonomy never picks one);
- Critical review findings remain;
- an action is destructive;
- a protected branch or required approval is involved;
- credentials are missing;
- a product decision is needed.

It never merges.

Settings that bound a run:

- the policy above;
- the plan's `oat_plan_hill_phases`, which is preserved (`[]` means every phase);
- `workflow.postImplementSequence`;
- gate `onFailure`;
- `workflow.retro.apply` and `workflow.retro.filing.*`, which count as consent.

`workflow.hillCheckpointDefault` is skipped on an autonomous first run.

**Default:** interactive. The skill sets `disable-model-invocation: true`. **Why:** the contract says "a restarted session is interactive unless autonomy is deliberately activated again."

**Which should I pick**

- If this is your first trial, then stay interactive.
- If you go autonomous, then set the dispatch policy first.
- If quality comes first, then set `oat_plan_hill_phases: []` so every phase gets reviewed.

## 4. Ladder ownership

**The choice:** which scope owns the ladder. Use `oat config adopt dispatch-matrix --shared|--local|--user`, with `--keep-existing` to fill only missing cells and `--dry-run` to preview. Cells are `workflow.dispatchCeiling.providers.<provider>.<tier>`.

| Option       | Choose it when                   | You give up                            | In practice                                   |
| ------------ | -------------------------------- | -------------------------------------- | --------------------------------------------- |
| `--shared`   | The team should share models     | Individual flexibility                 | Generated roles are tracked in the repository |
| `--local`    | One checkout differs             | Consistency                            | Written to `.oat/config.local.json`           |
| `--user`     | Your personal default everywhere | Team visibility                        | Roles go under `~/.codex` and `~/.cursor`     |
| Custom cells | Access or cost limits            | Pruned task classes become unreachable | A tier's last candidate becomes its reviewer  |

**Default:** no ladder. Planning offers the bundled recommendation, and declining blocks readiness. **Why:** the docs call the ownership boundary "deliberate", and the plan skill says hand-tuning "can be worse than runtime selection". Likely rationale (inferred): team model choices should be visible in version control.

**Which should I pick:** if you are a team, then use `--shared`. If you are trying OAT alone, then run `--user --dry-run` and then `--user`.

---

## Proposed home

- §1 → `workflows/advanced/dispatch-ceiling.md`, after "Named Policy Choices"
- §2 → same page, after "Provider Enforcement"
- §3 → `workflows/advanced/autonomy.md`, after "Activation contract"
- §4 → `dispatch-ceiling.md`, after "Ownership and Adoption"

## Docs that contradict the code

1. **Which setting wins.** `configuration.md:408` calls `workflow.dispatchPolicy.policy` a "Default named maximum". The plan and quick-start skills put project state first and config "as a proposed starting value". The resolver reads any explicit config value before `state.md` (`dispatch-ceiling/index.ts:2550-2558`; test `index.test.ts:529`; ADR-018 decision 3).
2. **The legacy preset overwrites ladders.** `config set workflow.dispatchCeiling.preset` writes plain `codex` and `claude` values over that scope's ladder columns (`commands/config/index.ts:1949-1967`). The resolver treats them as `legacy-ceiling` (`index.ts:1511-1546`) and refuses exact candidates (`index.ts:2595-2598`). Yet `configuration.md:802,810,819` still use them as examples.
3. **`config describe` is incomplete.** It lists only scalar `providers.codex` and `.claude` (`commands/config/index.ts:1102-1123`). It has no Cursor entry, no tier cells and no `recommendationVersion`, though `set` accepts them (`index.ts:1282`).
4. **Cursor is called advisory.** `registry.ts:28-31` and `dispatch-and-dry-run.md:272-275` call every provider except Codex and Claude advisory. A Cursor pinned adapter exists (`registry.ts:203-229`).

## Could not verify

- Whether Inherit Host Defaults still requires a complete ladder at planning.
- Any cost figure per tier.
- Whether an absent `agents.max_depth` blocks Codex. The code checks only present values below 1.

## Evidence

- Choices and descriptions: `packages/cli/src/config/dispatch-policy-options.ts:36-46,94-116`
- Defaults: `packages/cli/src/config/resolve.ts:130-140`
- Unresolved policy blocks: `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2264-2280,2483-2512`; `index.test.ts:5410`
- Inherit sends no model or effort: `index.ts:2585-2589`
- Codex depth check: `index.ts:2367-2404,2168-2178`
- Ladder merge has no bundled default: `index.ts:2207-2236`
- Legacy preset mapping: `packages/cli/src/config/dispatch-ceiling-preset.ts:18-41`
- Effort and reviewer rules: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:440-463,495-498`
- Reviewer pinned at the cap: `apps/oat-docs/docs/workflows/advanced/dispatch-ceiling.md:272-273,411-413`; DR-260706-reviewer-targets-only-capped
- Rationale: DR-260525-make-oat-dispatch-ceiling, DR-260706-managed-uncapped-is-explicit, DR-260706-inherit-host-defaults-means-no
- Provider adapters: `packages/cli/src/providers/ceiling/registry.ts:94-245`; Claude host routing at `dispatch-ceiling.md:387-391`; Cursor fallback at `dispatch-ceiling.md:437-440`
- Autonomy: `.agents/skills/oat-project-autonomous/SKILL.md:5,54-80,129-136,404-446`; `.agents/docs/autonomy-contract.md:24-47,115,151,171-184,198`; `oat-project-implement/references/plan-and-resume.md:144-169,239-243`; `completion-and-closeout.md:832-837`; `dispatch-and-dry-run.md:80-84`
- Ladder ownership: `dispatch-ceiling.md:117-131,155-171`; `.agents/skills/oat-project-plan-writing/SKILL.md:128-171,587-602`; `.agents/skills/oat-project-plan/SKILL.md:430-437`; `.agents/skills/oat-project-quick-start/SKILL.md:680-682`
