---
title: Human-in-the-Loop Lifecycle (HiLL) Checkpoints
description: 'Checkpoint configuration and behavior for pauseable, human-in-the-loop lifecycle execution.'
---

# Human-in-the-Loop Lifecycle (HiLL) Checkpoints

OAT supports two checkpoint classes:

- Workflow phase checkpoints
- Plan phase checkpoints

The [Phase gate review](../reviews/index.md#phase-review-gate) (`oat_phase_review_gate`) is a separate, non-pausing mechanism — it does not pause on a passing gate and never modifies the HiLL keys below (`oat_hill_completed`, `oat_plan_hill_phases`).

## Workflow checkpoints (`state.md`)

Frontmatter keys:

- `oat_hill_checkpoints`
- `oat_hill_completed`

Example:

```yaml
oat_hill_checkpoints: ['discovery', 'design']
oat_hill_completed: ['discovery']
```

An older project may still list `spec`, and the design skill honors it by
asking for your review at the design step unless the standalone
`oat-project-spec` skill already completed that checkpoint.

## Plan phase checkpoints (`plan.md`)

Frontmatter key written after implementation confirmation:

- `oat_plan_hill_phases`

Semantics:

- Field absent: valid before the first `oat-project-implement` run confirms checkpoint selection. Planning may intentionally leave the field unset until that first execution starts.
- Empty list: checkpoint after every phase boundary, but only after implementation has confirmed the choice and written `oat_plan_hill_phases: []` into `plan.md`.
- Explicit list: checkpoint only after completing the named phases (`p01`, `p04`, etc).

### Lite checkpoint bypass

Lite projects have no HiLL checkpoints. `oat-project-implement` resolves
`oat_workflow_mode` from project state before any checkpoint field read, and
when the mode is `lite` it resolves checkpoint state as `none` without reading
or interpreting `oat_plan_hill_phases`. An empty list cannot represent lite's
policy, because for every other mode an empty list means "checkpoint after every
phase". `oat-project-implement`'s Lite checkpoint bypass writes:

```yaml
oat_auto_review_at_hill_checkpoints: false # lite: no checkpoints
```

The workflow preference prompt, the standard checkpoint prompt, and the
auto-review preference prompt are all skipped in both interactive and autonomous
runs. Only HiLL approval pauses are absent — the root-owned per-phase review and
the final review remain required.

The rest of this section applies to `spec-driven`, `quick`, and `import`
projects.

On the first implementation run, `oat-project-implement` must summarize every plan phase, state the total phase count and final phase ID, and then ask an explicit three-option checkpoint question:

- Stop after each phase
- Stop after specific phases
- Stop only after the final phase is completed

It then writes the confirmed value into `plan.md`. If the field is later missing during a resumed implementation run, treat that as bookkeeping drift rather than as an implicit default.

Listed phases are where you stop **after completing them**, not before. `["p03"]` means "complete p03, then pause" — not "pause before starting p03." Setting the last phase ID (e.g., `["p03"]` when p03 is final) means "stop only at the end of implementation."

### Setting a default via `workflow.hillCheckpointDefault`

The first-run checkpoint prompt can be skipped entirely by setting the `workflow.hillCheckpointDefault` preference:

- `every` — automatically write `oat_plan_hill_phases: []` (pause after every phase) without prompting
- `final` — automatically write `oat_plan_hill_phases: ["<final-phase-id>"]` (pause only at the end) without prompting

When set, `oat-project-implement` reads the preference before the prompt and prints `HiLL checkpoints: <every|final> (from workflow.hillCheckpointDefault)`, skipping the interactive choice. When unset (default), the skill prompts as before.

Treat this setting as a personal preference by default and set it at user
level (`--user`, stored in `~/.oat/config.json`), so it applies to every
repository you work in. Set it at shared level (`--shared`, stored in the
committed `.oat/config.json`) only when your team has agreed on a rule for
where agents must pause. Configuration resolves local first, then shared, then
user, so a shared value overrides each person's user-level value, and anyone
can still override it for their own checkout with `--local`.

A configured value is used on each project's first implementation run without
asking, and it replaces any checkpoint value already written in that project's
`plan.md` (see the warning under
[Choosing checkpoint frequency](#choosing-checkpoint-frequency)).

- If you want more control and the chance to steer between phases, use
  `every`:

  ```bash
  oat config set workflow.hillCheckpointDefault every --user
  ```

- If you want fewer interruptions and you trust the plan and the automatic
  reviews, use `final`:

  ```bash
  oat config set workflow.hillCheckpointDefault final --user
  ```

- If you want to decide per project, or to pause after specific phases, leave
  the setting unset and answer the prompt on the first implementation run.

See [Workflow preferences in the Configuration guide](../../../reference/configuration.md#workflow-preferences-workflow) for the full list of preference keys and surface guidance.

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/state.md`

## Choosing checkpoint frequency

A HiLL (human-in-the-loop lifecycle) checkpoint is a point where the
implementing agent stops and waits for a person to approve before it continues.
This choice decides how often that happens during implementation. Lite projects
have no checkpoints, so it does not apply to them.

| Choice             | Choose it when                                    | What you give up                             |
| ------------------ | ------------------------------------------------- | -------------------------------------------- |
| Every phase (`[]`) | The work is high-risk and you want to steer often | Speed: you approve after every phase         |
| Specific phases    | Only some phases are risky                        | Pauses after the other phases                |
| Final phase only   | You trust the plan and the automatic reviews      | The chance to correct course partway through |

You can pick any of the three at the first-run prompt. The
`workflow.hillCheckpointDefault` setting can express only `every` or `final`, so
choosing specific phases needs the prompt or a hand edit of
`oat_plan_hill_phases` in `plan.md`. The setting is unset by default, and the
prompt suggests stopping after every phase.

> [!WARNING]
> On a project's first implementation run (unless the run is autonomous), a
> configured `workflow.hillCheckpointDefault` is used without asking, and it
> replaces any checkpoint value already written in that project's `plan.md`. After the first
> run, the value stored in `plan.md` is what applies; changing the config later
> does not change that project. To choose specific phases, remove the setting
> before the first run from the layer that sets it (for example
> `oat config unset workflow.hillCheckpointDefault --user` if you set it with
> `--user`), or edit `oat_plan_hill_phases` in `plan.md` afterwards.

- If you are a solo developer working from a plan you trust, choose final only,
  for example with `oat config set workflow.hillCheckpointDefault final --user`.
- If the change is high-risk or regulated, such as a data migration, run
  implementation interactively and choose every phase. Check that no
  `workflow.hillCheckpointDefault` is configured first, because it would skip
  the prompt.
- If only a few phases need sign-off, such as a migration phase and a
  deployment phase, list those phases at the first-run prompt.

Autonomous runs (started with `OAT_AUTONOMOUS=1`) ignore
`workflow.hillCheckpointDefault`. If `plan.md` has no checkpoint value, they
write the final phase only; a valid value already in `plan.md` is kept as
written. Autonomous runs also turn on the automatic review at checkpoints: at
each checkpoint the agent runs that review, handles its findings, and continues
instead of waiting for a person. The per-phase and final code reviews run in
every mode.
