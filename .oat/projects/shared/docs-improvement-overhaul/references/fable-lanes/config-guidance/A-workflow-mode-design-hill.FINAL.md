> **Status:** Drafted by one agent. Verified independently by another against commit `a080dfbef` on 2026-10-02: ACCEPT WITH CHANGES.
> **Applied:** the blocking checkpoint-precedence fix, all eight should-fix items, and the accuracy nits. One refuted docs-contradiction item was removed.
> **Unverified:** live CLI output (a merge conflict blocked the CLI, so defaults come from reading code) and the open questions at the end.

# Choosing how to run tracked work

**Terms**

- **OAT project**: a folder of tracked artifacts that lets an agent resume work.
- **Phase**: a numbered block of plan tasks, such as `p01`.
- **Frontmatter**: the YAML block at the top of `state.md` or `plan.md`.
- **HiLL (human-in-the-loop lifecycle) checkpoint**: a point where the agent waits for a person to approve.
- **Autonomous run**: a run with `OAT_AUTONOMOUS=1`.
- **Non-interactive run**: a run with `OAT_NON_INTERACTIVE=1` (autonomous runs imply it), or one where you have no way to reply. An agent that lacks a question tool asks in chat instead, so that alone does not count.
- **Config scopes**: `--local` applies to this checkout, `--shared` to the repo for everyone, and `--user` to all your repos. Local beats shared, and shared beats user, so a `--shared` value overrides each teammate's `--user` value unless they set `--local`.

## 1. Workflow mode

**The choice**: how much planning happens before any code. Run one of these skills:

- `oat-project-new` (spec-driven)
- `oat-project-quick-start`
- `oat-project-lite`
- `oat-project-import-plan`

Each skill creates (scaffolds) its project with `oat project new <name> --mode <mode>`. Running that command yourself only creates the files, so start with the skill.

| Option      | Choose it when                                                   | What you give up                                                                                                                                                        | What it changes in practice                                                                                                                           |
| ----------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No project  | The work is small, or is just provider sync or one CLI command   | Resume, a tracked plan, and lifecycle reviews. Ad-hoc reviews still work through `oat-review-provide`, and `oat-project-capture` can turn the work into a project later | No artifacts                                                                                                                                          |
| Lite        | The work fits in one sitting and the outcome is clear            | Discovery and design documents, multiple phases, and HiLL pauses                                                                                                        | One round of questions, then a single-phase `plan.md` where each validation criterion names its proving command, then **one** approval                |
| Quick       | The work is bounded and the requirements are clear               | `spec.md` (formal requirements); design is optional                                                                                                                     | Creates `discovery.md` (the problem and its constraints) and `plan.md`. After discovery: go straight to the plan, do a lightweight design, or promote |
| Spec-driven | Requirements are unclear, or the change cuts across the codebase | Speed                                                                                                                                                                   | Creates `discovery.md`, `spec.md`, `design.md` and `plan.md`, and pauses after discovery and after design                                             |
| Import      | A plan already exists elsewhere                                  | OAT discovery and design                                                                                                                                                | Keeps the source in `references/imported-plan.md` and normalizes it into `plan.md`                                                                    |

**Promotion** converts a project in place:

- **Lite to quick**: `oat project promote <path> --to quick`. That is the only target.
- **Quick or import to spec-driven**: `oat-project-promote-spec-driven`. You must invoke it yourself; the agent will not run it on its own. It writes `discovery.md`, `spec.md` and `design.md` from the existing plan. It does not take you back through discovery or design, and it adds no discovery or design approval checkpoints.

**Default**: the skill you run decides the mode. `oat project new` with no `--mode` creates a spec-driven project.

**Why this default**: _Likely rationale (inferred)_: `oat project new` backs the spec-driven skill. The repository's stated selection rule is "requirements clarity and design risk, not task count".

**Which should I pick**

- **Solo developer, small fix**: lite, or no project.
- **Team feature with unclear requirements, or regulated or high-risk work**: spec-driven.
- **A plan written elsewhere**: import.

**Evidence**

- `packages/control-plane/src/types.ts:11-17`
- `packages/cli/src/commands/project/new/index.ts:164-166`
- `packages/cli/src/commands/project/new/scaffold.ts:115-131`, `:576`
- `.agents/skills/oat-project-new/SKILL.md:69`
- `.agents/skills/oat-project-lite/SKILL.md:51-52`, `:155`, `:192-197`, `:243-247`, `:291-320`
- `.agents/skills/oat-project-quick-start/SKILL.md:160`, `:296-325`
- `.agents/skills/oat-project-import-plan/SKILL.md:54`, `:118`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:125-128`
- `packages/cli/src/commands/project/promote/promote.ts:351-352`, `:381-382`
- `.agents/skills/oat-project-promote-spec-driven/SKILL.md:3`, `:5`, `:16`, `:20-21`, `:112-116`, `:129-140`
- `.agents/skills/oat-review-provide/SKILL.md:3`
- `.agents/skills/oat-project-capture/SKILL.md:3`, `:149`
- `apps/oat-docs/docs/workflows/choose-workflow.md:38-42`
- `AGENTS.md:261` (repository instructions)

## 2. Design interaction mode

**The choice**: how the design is reviewed with you. Set `workflow.designMode` (`collaborative|selective|draft`), pass `--mode <value>` when you invoke `oat-project-design`, or set `OAT_DESIGN_MODE`.

| Option                       | Choose it when                                                             | What you give up             | What it changes in practice                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collaborative                | The design is uncertain, or the repo has little documentation              | Time                         | You confirm each section. `design.md` is written only after all sections are approved                                                                                                                             |
| Selective (spec-driven only) | The repo documents its architecture and conventions well (its "grounding") | Seeing routine sections live | Risky sections are always presented to you, including architecture, security, error handling and migration. Routine sections, which follow existing patterns, are written silently and listed at the final review |
| Draft                        | You want a full draft, or the run is non-interactive                       | Live input                   | The final review is your only interaction                                                                                                                                                                         |

Quick-start offers only collaborative and draft, and treats a configured `selective` as collaborative.

**Default**: unset, so the skill asks. It recommends collaborative when in doubt and never recommends draft. Precedence: `--mode`, then `OAT_DESIGN_MODE`, then a non-interactive run (which forces `draft`), then config, then the prompt.

**Why this default**: draft is forced "so automation does not block on prompts" (design-modes.md). Why the picker leans collaborative is not stated.

**Which should I pick**

- **Well-documented repo (for example, a populated `.oat/repo/knowledge/`), and you are comfortable reviewing routine sections only in the final file**: `selective --user`.
- **The team has agreed on a rule**: set it with `--shared`. The configuration guide treats this as a personal preference.

**Evidence**

- `packages/cli/src/commands/config/index.ts:1055-1061`
- `packages/cli/src/config/resolve.ts:129`, `:194-216`
- `.agents/skills/oat-project-design/SKILL.md:87-159`, `:633`
- `.agents/skills/oat-project-design/references/selective-review-pass.md:30-46`
- `.agents/skills/oat-project-quick-start/SKILL.md:425-462`
- `apps/oat-docs/docs/workflows/projects/planning/design-modes.md:14`, `:22`, `:44-62`, `:108`
- `apps/oat-docs/docs/reference/configuration.md:781-790`, `:829-836`

## 3. HiLL checkpoints

**Before implementation**, checkpoints come from `oat_hill_checkpoints` in the `state.md` frontmatter. Scaffolding sets this field, and no config key changes it.

- **Spec-driven** gets `['discovery','design']`, and `oat-project-next` holds the project at each step until it is approved.
- **Quick, import and lite** get `[]`. Quick-start also resets the field to `[]` after planning "to avoid spec/design gate confusion".

**During implementation**, the first run of `oat-project-implement` writes the chosen checkpoints into `plan.md` as `oat_plan_hill_phases`. If `workflow.hillCheckpointDefault` (`every|final`) is set, it supplies the choice without prompting and replaces any value already in `plan.md`. After that, the stored value applies to that project only: resumed runs use it and do not read config. To change one project mid-implementation, edit `oat_plan_hill_phases`.

| Option             | Choose it when                     | What you give up          | What it changes in practice                                                                                                            |
| ------------------ | ---------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Every phase (`[]`) | The work is high-risk              | Speed                     | The agent pauses after each phase                                                                                                      |
| Specific phases    | Only some phases are risky         | Nothing                   | The agent pauses after the listed phases. Config cannot express this; choose it at the first-run prompt or edit `oat_plan_hill_phases` |
| Final only         | You trust the plan and the reviews | Correcting course mid-run | The agent pauses once, before closeout (closeout covers summary, PR and completion)                                                    |

Lite is the only mode with no checkpoints, which is why `[]` means "every phase" and never "none".

**Default**: unset. The first run lists the phases and asks, with "every phase" as the default answer. Autonomous runs ignore `workflow.hillCheckpointDefault`: if `plan.md` has no value they write the final phase only, and no checkpoint waits for a person.

**Why this default**: leaving the key unset so that the skill prompts is DR-260410's standard pattern for workflow preferences. Why the prompt defaults to every phase is not stated.

**Where to set it**: DR-260410 treats it as a personal setting ("interruption tolerance") for `--user`.

**Which should I pick**

- **Solo developer**: `final --user`.
- **Regulated or high-risk work**: run interactively and choose every phase, or list the risky phases. If `workflow.hillCheckpointDefault` is set, the prompt is skipped. Run `oat config unset workflow.hillCheckpointDefault` (or set a repo-local value) first, or edit `oat_plan_hill_phases` after implementation starts.

**Evidence**

- `packages/cli/src/commands/project/new/scaffold.ts:152-154`, `:174`, `:195`, `:216`
- `.agents/skills/oat-project-discover/SKILL.md:407-411`
- `.agents/skills/oat-project-design/SKILL.md:614-620`
- `.agents/skills/oat-project-next/SKILL.md:209-224`
- `.agents/skills/oat-project-quick-start/SKILL.md:1118`
- `.agents/skills/oat-project-plan/SKILL.md:382-384`
- `packages/cli/src/commands/config/index.ts:858-867`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:113-128`, `:142-168`, `:171-214`, `:237-258`
- `.oat/repo/reference/decisions/DR-260410-add-workflow-preference-keys.md:35`, `:47`, `:59`

## 4. Automatic review at checkpoints

OAT runs four kinds of review:

- **Per-phase review**: after every phase. It always runs.
- **Final review**: must pass before closeout. It always runs.
- **Lifecycle review**: an extra `oat-project-review-provide` review at a checkpoint.
- **Phase review gate**: an optional cross-provider check that never pauses, set through `oat_phase_review_gate`.

**The choice**: whether the lifecycle review runs automatically. Set `workflow.autoReviewAtHillCheckpoints`; each project stores the choice as `oat_auto_review_at_hill_checkpoints`.

| Option  | Choose it when                       | What you give up                                                                                                                                                                                   | What it changes in practice                                                                                            |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `true`  | You want a review at every pause     | Deciding each finding. Low findings become fix tasks, and findings the agent disagrees with are deferred with a note, without asking you. The checkpoint still pauses for your approval afterwards | The review runs at each checkpoint                                                                                     |
| `false` | You prefer to start reviews yourself | Automation                                                                                                                                                                                         | No extra review at non-final checkpoints; start one yourself if you want it. The per-phase and final reviews still run |

With final-only checkpoints this setting has almost no effect, because the final review always runs.

**Default**: unset. The agent asks, and the default answer is "no". The legacy shared key `autoReviewAtCheckpoints` is used as a fallback. Autonomous runs write `true` even if config says `false`, and lite writes `false`. No rationale is stated. Plan review before implementation (`workflow.autoArtifactReview.plan`, default `true`) is a separate setting.

**Which should I pick**

- **Every-phase or specific-phase checkpoints**: `true --user`.
- **Final-only checkpoints**: leave it unset.

**Evidence**

- `packages/cli/src/commands/config/index.ts:979-985`
- `packages/cli/src/config/resolve.ts:121-125`, `:230-239`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:122`, `:155-157`, `:216-235`, `:267-297`
- `.agents/skills/oat-project-implement/references/phase-execution.md:1024-1040`
- `.agents/skills/oat-project-implement/references/completion-and-closeout.md:796-800`
- `.agents/skills/oat-project-review-receive/SKILL.md:353-358`
- `.agents/skills/oat-project-review-provide/SKILL.md:1028`
- `apps/oat-docs/docs/reference/configuration.md:850-855`

## Proposed home

Re-check every path against the merged tree. On `origin/main`, `hill-checkpoints.md` and `design-modes.md` live under `workflows/projects/`, and `choose-workflow.md` does not exist.

- **Section 1**: the workflow-choice page. Promotion goes after the "Lite lane" section in `lifecycle.md`.
- **Section 2**: `design-modes.md`, before "Collaborative".
- **Section 3**: `hill-checkpoints.md`, under its two existing headings.
- **Section 4**: the empty auto-review heading in `lifecycle.md`.

## Docs that contradict the code (confirmed)

1. **`hill-checkpoints.md:25`** shows `['discovery','spec','design']`, but new projects get `['discovery','design']` (`scaffold.ts:154`). `spec` appears only in older projects.
2. **`lifecycle.md:510`** (516 on main) claims an `env` layer for workflow preferences. The CLI's environment overrides cover only `projects.root`, `projects.defaultScope` and `worktrees.root` (`resolve.ts:156-160`), and the passage calls a five-element chain "three-layer". When fixing it, keep in mind that the design skills do read `OAT_DESIGN_MODE` themselves.
3. **`lifecycle.md:220`** (226 on main) is an empty heading. Its paragraph is at line 261 (267 on main), in the wrong section, and says "Disabled by default". The real default is unset, and the skill asks with "no" as the default answer.

## Could not verify

- Whether hand-editing `oat_hill_checkpoints` is supported. Routing and bookkeeping recognize `plan`, but no approval prompt for it was found.
- The designers' reasons for each prompt default, and for spec-driven as the default `--mode`.
- Whether an interactive run with auto-review on processes findings immediately. This is explicit only for autonomous runs.
- Whether `--mode collaborative` beats forced draft under `OAT_AUTONOMOUS=1`. The design skill says the argument wins, but quick-start's autonomy rule QS-07 says draft.
- How quick-start handles `selective` passed through `--mode` or `OAT_DESIGN_MODE`.
- Live `oat config` output.
