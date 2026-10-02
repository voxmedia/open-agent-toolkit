# Choosing how to run tracked work (draft A)

An **OAT project** is a folder of tracked plan artifacts that lets work resume across sessions. A **phase** is a numbered block of plan tasks, such as `p01`. A **HiLL (human-in-the-loop lifecycle) checkpoint** is a point where the agent stops until a person approves.

## 1. Workflow mode

**The choice**: how much planning happens before code is written. You choose it by running a skill: `oat-project-new` (spec-driven), `oat-project-quick-start`, `oat-project-lite` or `oat-project-import-plan`. The CLI form is `oat project new --mode`.

| Option      | Choose it when                                                  | What you give up                                  | What it changes in practice                                                                                            |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| No project  | The task is small or utility-only                               | Resume and reviews                                | Creates no artifacts                                                                                                   |
| Lite        | The change fits in one sitting and the outcome is clear         | Design documents, multiple phases, HiLL pauses    | One batched interview, a single-phase `plan.md` with proof commands, and **one** approval. Reviews still run           |
| Quick       | The feature is bounded and the requirements are clear           | `spec.md`; the design is optional and lightweight | Creates `discovery.md` and `plan.md`. After discovery: go straight to the plan, write a lightweight design, or promote |
| Spec-driven | Requirements are unclear or the change cuts across the codebase | Speed                                             | Creates `discovery.md`, `spec.md`, `design.md` and `plan.md`, and pauses after discovery and design                    |
| Import      | A plan already exists elsewhere                                 | OAT discovery and design                          | Keeps the source at `references/imported-plan.md` and normalizes it into `plan.md`                                     |

**Promotion** moves a project to a heavier mode in place, keeping its folder and history:

- Lite to quick: run `oat project promote <path> --to quick` (`quick` is the only target the command accepts).
- Quick or import to spec-driven: run the `oat-project-promote-spec-driven` skill.

**Default**: the skill you invoke decides the mode. `oat project new` with no `--mode` creates a spec-driven project.

**Why this default**: _Likely rationale (inferred)_: `oat project new` backs the spec-driven skill. The stated selection rule is "requirements clarity and design risk, not task count" (AGENTS.md).

**Which should I pick**

- If you are a solo developer making a small fix, use lite, or no project at all.
- If your team has a feature with unclear requirements, or the change is high-risk, use spec-driven.
- If you are importing a plan written elsewhere, use import, and promote it later if needed.

**Evidence**

- `packages/control-plane/src/types.ts:11-17`
- `packages/cli/src/commands/project/new/index.ts:164-166`
- `packages/cli/src/commands/project/new/scaffold.ts:115-131`, `:576`
- `.agents/skills/oat-project-lite/SKILL.md:51-52`, `:192-197`, `:243-247`, `:291-320`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:125-128`
- `.agents/skills/oat-project-quick-start/SKILL.md:296-325`
- `.agents/skills/oat-project-import-plan/SKILL.md:54`
- `packages/cli/src/commands/project/promote/promote.ts:351-352`, `:381-382`
- `.agents/skills/oat-project-promote-spec-driven/SKILL.md:3`, `:16`, `:20-21`
- `apps/oat-docs/docs/workflows/projects/lifecycle.md:406-413`
- `AGENTS.md:226-261` (repository instructions, not shipped docs)

## 2. Design interaction mode

**The choice**: how the design is reviewed with you. You set it with `workflow.designMode` (`collaborative|selective|draft`), the design skill's `--mode` argument, or the `OAT_DESIGN_MODE` environment variable.

| Option                       | Choose it when                                                                | What you give up                | What it changes in practice                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Collaborative                | The design is uncertain or the repository has little documentation to draw on | Time                            | You confirm each section in chat. `design.md` is written only after every section is approved                   |
| Selective (spec-driven only) | Most sections follow existing patterns                                        | Live review of routine sections | Risky sections are presented to you. Routine sections are written without asking and listed at the final review |
| Draft                        | You want a full draft, or the run is unattended                               | Live input                      | The final review gate is your only interaction                                                                  |

The quick workflow offers only collaborative and draft, and treats a configured `selective` as collaborative.

**Default**: unset, so the skill asks. It recommends collaborative when in doubt and never recommends draft. Order of precedence: `--mode`, then `OAT_DESIGN_MODE`, then a non-interactive run (which forces `draft`), then config, then the prompt.

**Why this default**: not stated. _Inferred_: draft exists so that unattended runs never block.

**Which should I pick**

- If you are a solo developer in a familiar repository, set `selective --user`.
- If your team is new to OAT, or the change is high-risk, set `collaborative --shared`.

**Evidence**

- `packages/cli/src/commands/config/index.ts:1055-1061`
- `packages/cli/src/config/resolve.ts:129`
- `.agents/skills/oat-project-design/SKILL.md:87-159`, `:633`
- `.agents/skills/oat-project-quick-start/SKILL.md:425-462`
- `apps/oat-docs/docs/workflows/projects/planning/design-modes.md:14`, `:44-50`, `:108`

## 3. HiLL checkpoints

**Lifecycle checkpoints** are set per project by `oat_hill_checkpoints` in `state.md`. No config key sets them; the scaffold writes them according to the mode. Spec-driven gets `['discovery','design']`: approval is required after discovery and after design, and `oat-project-next` holds the project until each approval is given. Quick, import and lite get `[]` ("to avoid spec/design gate confusion", per quick-start).

**Implementation checkpoints**: set `workflow.hillCheckpointDefault` (`every|final`) as your default. The `plan.md` field `oat_plan_hill_phases` overrides it for one project.

| Option             | Choose it when                     | What you give up                     | What it changes in practice                                                  |
| ------------------ | ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Every phase (`[]`) | The work is high-risk              | Speed                                | The agent pauses after each phase                                            |
| Specific phases    | Only some phases are risky         | —                                    | The agent pauses after the listed phases. Only the prompt offers this option |
| Final only         | You trust the plan and the reviews | The chance to correct course mid-run | The agent stops once before closeout                                         |

Lite never pauses here. `[]` means every phase, never "none".

**Default**: unset, so the first run lists the phases and asks; the prompt's default is "every phase". Autonomous runs write "final only". Once stored, the value is not asked about again.

**Why this default**: DR-260410 calls this key personal "interruption tolerance" that belongs at user scope. The reason for the prompt's default is not stated.

**Which should I pick**

- If you are a solo developer, set `final --user`.
- If the change is regulated or high-risk, choose every phase, or list the risky phases at the prompt.

**Evidence**

- `packages/cli/src/commands/project/new/scaffold.ts:152-154`, `:174`, `:195`, `:216`
- `.agents/skills/oat-project-discover/SKILL.md:407-411`
- `.agents/skills/oat-project-design/SKILL.md:614-620`
- `.agents/skills/oat-project-next/SKILL.md:209-224`
- `.agents/skills/oat-project-quick-start/SKILL.md:1118`
- `packages/cli/src/commands/config/index.ts:858-867`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:113-128`, `:142-157`, `:171-214`
- `.oat/repo/reference/decisions/DR-260410-add-workflow-preference-keys.md:47`

## 4. Automatic review at checkpoints

**The choice**: whether a lifecycle review runs automatically when a checkpoint is reached. You set it with `workflow.autoReviewAtHillCheckpoints`, and it is stored per project as `oat_auto_review_at_hill_checkpoints`.

| Option  | Choose it when                     | What you give up                  | What it changes in practice                                                            |
| ------- | ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `true`  | You want fewer prompts             | Control over when the review runs | The review runs at each checkpoint, and its findings are handled without prompting you |
| `false` | You want to start reviews yourself | Automation                        | You start each review manually                                                         |

The per-phase review always runs. The phase review gate and `workflow.autoArtifactReview.plan` (default `true`) are separate settings; link to their pages.

**Default**: unset, so the agent asks; the prompt's default is "no". The legacy `autoReviewAtCheckpoints` key is read as a fallback. Autonomous runs write `true`; lite writes `false`. No rationale is stated.

**Evidence**

- `packages/cli/src/commands/config/index.ts:979-985`
- `packages/cli/src/config/resolve.ts:230-239`
- `.agents/skills/oat-project-implement/references/plan-and-resume.md:122`, `:155-157`, `:216-235`, `:293-297`

## (a) Proposed home

- **Section 1**: `choose-workflow.md`, replacing "Workflow Modes In Practice".
- **Section 2**: `design-modes.md`, before "## Collaborative".
- **Section 3**: `hill-checkpoints.md`, under each of its two existing headings.
- **Section 4**: the empty heading in `lifecycle.md` at line 220.

## (b) Docs that contradict the code

1. The example in `hill-checkpoints.md:25` includes `spec`. The scaffold writes `['discovery','design']` (`scaffold.ts:154`).
2. `lifecycle.md:510` lists an `env` layer for workflow preferences. No workflow key has one (`resolve.ts:157-159`).
3. `lifecycle.md:220` is a heading with no text under it. Its paragraph sits at line 261, in the wrong section.
4. DR-260706 gives the default for `exit_nonzero_on` as `important`. The skill uses `high` (`plan-and-resume.md:289`).

## (c) Could not verify

- Whether hand-editing `oat_hill_checkpoints` (for example, to add `plan`) is supported.
- The designers' reasons for each prompt default, and for spec-driven as the default `--mode`.
- How quick-start handles `--mode selective`, either as an argument or through the environment variable.
