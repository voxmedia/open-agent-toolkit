> **Status:** One agent drafted this; a second agent verified it independently (verdict: ACCEPT WITH CHANGES). All blocking and should-fix corrections are applied.
> **CLI not run:** an in-progress merge broke `packages/cli/package.json`, so the CLI could not start during verification. Defaults were confirmed by reading the code at HEAD `a080dfbef`.

# B. Dispatch policy and autonomy: which to choose, and why

> **Most important fact:** a value for `workflow.dispatchPolicy.*` in **any** config scope overrides every project's own choice in `state.md`. So does a legacy plain value in `workflow.dispatchCeiling.providers.<provider>`. To choose per project, leave these keys unset.

**Terms**

- **Provider (host):** the agent tool running OAT, such as Codex, Claude Code or Cursor.
- **Root:** the main session running a project. It starts a **subagent** for each phase and each review.
- **Ladder (or matrix):** the configured model/effort **candidates** for each provider, grouped into four ordered **tiers**: Economy, Balanced, High and Frontier.
- **Last candidate:** the final entry listed in a tier. It is not necessarily the strongest.
- **Cap (ceiling):** the highest tier allowed. "Dispatch ceiling" is the old name for the dispatch policy.
- **Role (variant):** a generated agent definition fixed to one model and effort.
- **Preflight:** the check that runs before implementation starts.
- **Scope:** where a setting lives:
  - user: `~/.oat/config.json`
  - shared: `.oat/config.json`
  - repo-local: `.oat/config.local.json`

## 1. Dispatch policy

**The choice:** how far up the ladder subagents may go. Planning saves the choice to `state.md` as `oat_dispatch_policy`. Two config keys override that choice: `workflow.dispatchPolicy.mode` (`managed`|`inherit`) and `workflow.dispatchPolicy.policy` (`economy`|`balanced`|`high`|`frontier`|`uncapped`).

| Option                | Choose it when                                  | You give up                                                           | In practice                                                                                  |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Economy               | Routine work where cost matters                 | Every higher tier                                                     | Lowest cost                                                                                  |
| Balanced              | Normal work                                     | High and Frontier                                                     | —                                                                                            |
| High                  | Broad or security-sensitive changes             | Higher review cost                                                    | Economy through High are allowed                                                             |
| Frontier              | A missed defect costs more than the run         | Highest cost; the top target may need model access your account lacks | All tiers are allowed                                                                        |
| Uncapped              | You trust the root's choice for each phase      | A cost ceiling, and pinned reviewers                                  | No cap; reviewers use the provider's default                                                 |
| Inherit Host Defaults | The provider's own settings must stay untouched | All OAT model control                                                 | OAT passes no model or effort, reviewers included. Planning still asks you to adopt a ladder |
| Leave Unresolved      | You have not decided yet                        | Starting implementation                                               | An interactive run asks at implementation start; a non-interactive run stops                 |

Implementers may run below the cap. Implementation's per-phase and final code reviews always run on the **last candidate of the cap tier**. That includes phases narrowed by a **Dispatch Profile** row, an optional per-phase limit in `plan.md`. Two kinds of review pick their reviewers separately:

- planning-artifact reviews;
- review **gates**, which are extra configured review commands set in `workflow.gates.execTargets`.

**Default:** unset (`null`).

**Why:** `DR-260525-make-oat-dispatch-ceiling` says the provider's default "is not project/user-declared dispatch intent" and risked dispatching "above or below the user's intended ceiling". `DR-260706-managed-uncapped-is-explicit` says a missing value never means Uncapped.

**Which should I pick**

- If cost matters most, choose Economy for routine work or Balanced for normal work. Add a Dispatch Profile row only for a specific reason, because reviews still run at the project cap.
- If the change is critical, choose High. Choose Frontier only if every implementation code review should run on Frontier's last candidate. For an independent review by a different model family, configure a gate.
- If the provider's own settings must stay untouched, choose Inherit Host Defaults.
- If this is your first trial, choose Balanced, set per project.

**Evidence**

- Config overrides `state.md`: `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2551-2558,1443-1509,1549-1576`; test `index.test.ts:529`; `packages/cli/src/commands/config/index.ts:1937-1945`; `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:193-200`
- Defaults: `packages/cli/src/config/resolve.ts:130-140`
- No policy set: `index.ts:2483-2494`; `dispatch-and-dry-run.md:246-270,298-305`
- Options: `packages/cli/src/config/dispatch-policy-options.ts:36-46,94-116`
- Reviewer on the last candidate: `index.ts:749-751,950-995,1648-1676`; `apps/oat-docs/docs/workflows/advanced/dispatch-ceiling.md:117-122`; `.agents/skills/oat-project-plan-writing/SKILL.md:185-199`; `review-flavors.md:64-69,94-121`
- Uncapped and Inherit reviewers: `index.ts:1831,1854-1873`; `DR-260706-reviewer-targets-only-capped`
- Inherit still adopts a ladder: `.agents/skills/oat-project-plan/SKILL.md:394-420`

## 2. Provider differences that affect the choice

| Provider | Does the cap hold?                                     | Watch for                                                                                                                                                              |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex    | Yes, through roles that `oat sync` generates           | Preflight blocks if `agents.max_depth` in `.codex/config.toml` (the allowed agent nesting depth) is set below 1 or is not a number. An absent value is fine            |
| Claude   | Yes, through a role or a `model` argument on each call | With `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` set, a bare alias with a pinned effort (for example `opus` + `high`) fails closed. Use versioned model IDs in ladder cells |
| Cursor   | Pinned, for mapped candidates                          | Not verified at run time. A plan, account or typo problem can silently swap the model, and OAT records what it requested                                               |
| Others   | Advisory only (suggested, not enforced)                | Nothing is enforced                                                                                                                                                    |

**Evidence**

- Provider registry: `packages/cli/src/providers/ceiling/registry.ts:94-245`
- Codex nesting-depth check: `index.ts:2121-2123,2367-2404`
- Cursor enforcement: `index.ts:2062-2069`; `dispatch-ceiling.md:402,437-456`
- Claude alias failure: `dispatch-ceiling.md:387-394`

## 3. Autonomous execution

**The choice:** whether one session drives a project to a final PR without asking you. Invoke the `oat-project-autonomous` skill by name with a goal, project slug or ticket. It sets `OAT_AUTONOMOUS=1` and `OAT_NON_INTERACTIVE=1` for that session only.

| Option                  | Choose it when                               | You give up                | In practice                                                                          |
| ----------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| Interactive             | You want to approve each step                | Unattended runs            | Every prompt waits for you                                                           |
| `OAT_NON_INTERACTIVE=1` | CI, or one scripted step                     | Steps running back to back | Each skill takes its documented default. A choice with no safe default stops the run |
| Autonomous              | The goal is clear and you will review the PR | Approving each checkpoint  | See below                                                                            |

**What it does without asking:**

- chooses the workflow mode (lite, quick or spec-driven) and creates the project;
- answers discovery questions from repository evidence;
- authorizes subagents for the run;
- sets the **HiLL checkpoint** (the human-in-the-loop stop after a phase) to the final phase if none is set;
- turns on review at every checkpoint;
- adopts the bundled ladder once, with `--keep-existing`, into the first existing config file that can take it: user, then repo-local, then shared if repository policy allows;
- applies all non-destructive documentation changes;
- generates a project recap;
- approves the final checkpoint after a passing review;
- runs summary, docs and PR;
- pushes without force.

**Where it stops:**

- the dispatch policy is unresolved (autonomy never picks one);
- a Critical finding is unresolved;
- a destructive action;
- a protected branch or a required approval;
- missing credentials;
- a product decision;
- a prompt with no autonomous rule;
- a gate set to `onFailure: prompt` fails, or any gate fails to run;
- a manual or visual check it cannot perform;
- no config file can take the ladder.

It never merges.

**Settings that bound a run:**

- the dispatch policy;
- `oat_plan_hill_phases` in `plan.md`, which is kept as written;
- `workflow.postImplementSequence`;
- each gate's `onFailure`;
- `workflow.retro.apply` and `workflow.retro.filing.*`, which count as consent.

On a first autonomous run, `workflow.hillCheckpointDefault` and `workflow.autoReviewAtHillCheckpoints` are ignored.

**Default:** interactive. An agent never starts autonomy on its own.

**Why:** the autonomy contract says "a restarted session is interactive unless autonomy is deliberately activated again."

**Which should I pick**

- If this is your first trial, stay interactive.
- If you go autonomous, set the dispatch policy first.
- If quality comes first, set `oat_plan_hill_phases: []` before starting. Every phase is already code-reviewed. `[]` adds a full lifecycle review after every phase, plus an approval pause in interactive runs.

**Evidence**

- Autonomous skill: `.agents/skills/oat-project-autonomous/SKILL.md:5,54-80,129-136,236-269,368-379,404-446`
- Autonomy contract: `.agents/docs/autonomy-contract.md:24-66,115,151,171-188,198`, rows QS-03, DOCUMENT-02 and IMPLEMENT-04
- Checkpoint handling: `.agents/skills/oat-project-implement/references/plan-and-resume.md:144-169,231-250`; `apps/oat-docs/docs/reference/configuration.md:717`
- Closing sequence: `completion-and-closeout.md:832-837`
- Ladder adoption: `plan-writing/SKILL.md:145-164`

## 4. Ladder ownership

**The choice:** which scope owns the ladder. Set it with `oat config adopt dispatch-matrix --shared|--local|--user`; with no flag it writes repo-local. Without `--keep-existing` it replaces cells you already set, so preview with `--dry-run` first. Cells live at `workflow.dispatchCeiling.providers.<provider>.<tier>`.

| Option       | Choose it when                         | You give up                                                                                                                         | In practice                                                                                                                                  |
| ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--shared`   | The team should share one model list   | Individual flexibility                                                                                                              | Generated roles are tracked in the repository                                                                                                |
| `--local`    | One checkout needs a different list    | Team consistency                                                                                                                    | Written to `.oat/config.local.json`. After `oat sync`, generated roles still appear in the tracked `.codex`, `.claude` and `.cursor` folders |
| `--user`     | You want a personal default everywhere | Team visibility                                                                                                                     | `oat sync --scope user` generates roles under `~/.codex`, `~/.claude` and `~/.cursor`                                                        |
| Custom cells | Model-access or cost limits            | Remove a tier's only route for a **task class** (recon, implementation, hard reasoning or consequential) and that work has no route | A tier's last candidate becomes its reviewer                                                                                                 |

**Default:** no ladder is configured. Planning offers the bundled recommendation, and declining it blocks readiness.

**Why (inferred):** OAT does not choose models silently. Adoption makes the owner of the model list explicit, and `--shared` keeps team choices in version control.

**Which should I pick:** if you are a team, use `--shared`. If you are trying OAT alone, run `--user --dry-run` first, then `--user`.

**Evidence**

- Ownership: `dispatch-ceiling.md:61-65,117-131,155-171`
- Merged ladder has no bundled default: `index.ts:2207-2236`
- No-flag adoption writes local: `commands/config/index.ts:3473-3474`
- Sync outputs: `codex/codec/sync-extension.ts:529-538`; `claude/codec/sync-extension.ts:159-172,251`
- Planning adoption flow: `plan-writing/SKILL.md:128-171`

---

## Proposed home

Re-check every page path against the merged tree once the merge of `origin/main` finishes.

- **§1:** `apps/oat-docs/docs/workflows/advanced/dispatch-ceiling.md`, after "Named Policy Choices".
  - Put the boxed fact at the top of that page.
  - Also put it in `reference/configuration.md` under "Dispatch policy resolution".
- **§2:** the same page, after "Provider Enforcement".
- **§3:** `workflows/advanced/autonomy.md`, after "Activation contract".
- **§4:** `dispatch-ceiling.md`, after "Ownership and Adoption".

## Docs that contradict the code

1. **Which setting wins.**
   - **Docs and skills say state wins:** `configuration.md:408` calls the policy a "Default named maximum". `oat-project-plan/SKILL.md:430-437` and `oat-project-quick-start/SKILL.md:678-684` put `state.md` first and treat config "as a proposed starting value".
   - **The code reads config first:** the resolver and the implement skill both do (`index.ts:2558`; `dispatch-and-dry-run.md:193-200`; DR-260525 decision 3).
2. **Legacy settings overwrite ladders.**
   - `config set workflow.dispatchCeiling.preset` writes plain `codex` and `claude` values into that scope's ladder columns (`commands/config/index.ts:1949-1967`).
   - A plain value also wipes lower-layer cells for that provider (`index.ts:856-858`). After that, exact candidate selection breaks for Codex and Claude (`index.ts:1163-1165,2594-2599`).
   - Docs still show the preset as an example (`configuration.md:802,810`), and a plain `providers.codex` value (`:819`).
   - `config describe` says `providers.codex` "Wins over any preset" (`commands/config/index.ts:1112-1113`).
3. **`config describe` is incomplete.**
   - Its dispatch entries (`commands/config/index.ts:1064-1126`) omit Cursor, tier cells and `recommendationVersion`.
   - `set` accepts all of these (`:1262-1300,1970-2008`).
4. **A code comment and skill text say Cursor is advisory.**
   - The stale code comment at `registry.ts:29-32` says "Every other provider is advisory by default", but a pinned Cursor adapter exists at `:202-224`.
   - `dispatch-and-dry-run.md:272-275` names only Codex and Claude and says other providers "may" be advisory. That is misleading but hedged, and the same file has Cursor pinning rules (`:551-579`).
   - The user-facing table at `dispatch-ceiling.md:402` is already right.
5. **Legacy presets do not map to named tiers.**
   - `dispatch-ceiling.md:588-590` says they do.
   - In code, a preset compiles to plain values that the resolver treats as `legacy-ceiling`, with no tier and no ladder candidates (`commands/config/index.ts:1949-1967`; `index.ts:522-529,1511-1546,2594-2599`). The values only happen to equal tier caps.
6. **Minor wording.**
   - `autonomy.md:123-124` says autonomy "takes the existing `workflow.hillCheckpointDefault: final` path", which reads as if the config value is honored.
   - The config value is ignored (`plan-and-resume.md:144-169`).

## Could not verify

- **Plan template default:** `.oat/templates/plan.md:8` ships `oat_plan_hill_phases: []`, while `oat-project-plan/SKILL.md:384` says to leave it unset. If a plan kept the template value, autonomy would preserve it and stop at a checkpoint after every phase. I did not confirm whether the plan skill removes that line.
- **Live CLI output:** `oat config describe` output could not be checked because the CLI cannot start mid-merge.
- **Cost:** the code contains no per-tier cost figure.
