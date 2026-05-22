# Declared Path Dogfood

Date: 2026-05-21

## Scenario

Candidate decomposition: the backlog quick-win batch for workflow friction polish.

- Parent: `dogfood-declared-workflow-friction-polish`
- Children:
  - `dogfood-config-unset` (foundation child)
  - `dogfood-quick-routing`
  - `dogfood-staleness-threshold`

The run used a declared `SplitPlanDocument` with `origin: "declared"` and `interactive: true`.

## Commands Exercised

```bash
pnpm run cli -- project split validate-plan --plan-file /tmp/oat-split-declared-XXXXXX.json
pnpm run cli -- project split run --plan-file /tmp/oat-split-declared-XXXXXX.json
pnpm run cli -- project list
```

The first `project split run --help` probe hit the known root asset-copy race:

```text
cp: .../packages/cli/assets/skills/oat-agent-instructions-analyze/SKILL.md: No such file or directory
```

Retrying the same command standalone succeeded.

## Evidence

- `validate-plan` returned `{ "ok": true }`.
- `project split run` completed with `Split completed.`
- Coordination parent exists at `.oat/projects/shared/dogfood-declared-workflow-friction-polish`.
- Parent `state.md` contains `oat_kind: coordination`, `oat_phase: decomposition`, `oat_phase_status: complete`, and ordered `oat_children`.
- Parent has no `spec.md`, `design.md`, `plan.md`, or `implementation.md`.
- Parent persisted `references/split-plan.json` with the declared origin, child graph, foundation child, integration sketch, and initial active child.
- Each child has `state.md`, `discovery.md`, `plan.md`, and `implementation.md`.
- `dogfood-config-unset/discovery.md` includes the required split sections and `oat_inherited_context_revalidated: false`.
- `.oat/config.local.json.activeProject` was updated to `.oat/projects/shared/dogfood-config-unset`.
- `project list` omitted the completed coordination parent and showed the three children as normal discovery projects.

## Limitations

This was not a full live `oat-brainstorm` conversation. I could not honestly exercise an interactive agent-to-agent brainstorm inside this phase runner. The exercised path starts at the command boundary that the `oat-project-split` skill invokes after declared umbrella framing has produced the persisted plan.

No live umbrella-framing prompt, boundary question, or brainstorm confirmation flow was observed in this p05 run. Treat the declared-entry dogfood as limited until tracked follow-up `bl-074b` runs the live session and records the prompt wording, confirmation flow, invoked split payload, and resulting tree.

## Followups / Rough Edges

- Parent `state.md` body said the parent had scaffolded `plan.md` and `implementation.md` artifacts during this dogfood pass, even though the file invariant correctly removed them. This symptom was fixed by the coordination-parent state-body update; current generated parent state bodies list spec, design, plan, and implementation as `N/A (coordination parent)`.
- Child routing bug found during this dogfood pass was fixed in `fix(p05-t02)`: split-seeded children now write scalar `oat_phase: discovery`, scalar `oat_workflow_mode: quick`, scalar `oat_plan_source: quick`, and `project status --project-path .oat/projects/shared/dogfood-config-unset --json` reports `workflowMode: "quick"` with quick-mode routing.
- Live declared entry-path coverage remains a release follow-up: `.oat/repo/reference/backlog/items/live-dogfood-oat-project-split-entry-paths.md` (`bl-074b`).

## Live Entry Dogfood

Date: 2026-05-21

### Actual Prompt Wording Shown

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ BRAINSTORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OAT MODE: Brainstorm

Activating declared multi-project mode. Visual companion is deferred because this is text/process-oriented.

Do you already know the child projects, or should we decompose the scope together?
```

After the declared child list was clear, the split handoff banner was also shown:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT SPLIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### User Replies

```text
I already know the children:

Parent slug: live-dogfood-declared-workflow-friction-polish

Children:
1. live-dogfood-declared-config-unset — foundation child; handle unset config values cleanly and define status semantics.
2. live-dogfood-declared-quick-routing — depends on config-unset; ensure quick-mode projects route to the right next skill.
3. live-dogfood-declared-staleness-threshold — independent; tune knowledge staleness threshold messaging.

Shared context: these are all workflow-friction polish items from the OAT workflow backlog. Shared constraint: keep each child independently shippable and do not create a shared design surface. Integration risk: config semantics can affect routing wording, so quick-routing should depend on config-unset. Please proceed with the declared split handoff.
```

### SplitPayload Summary

- `origin`: `declared`
- `interactive`: `true`
- `parentSlug`: `live-dogfood-declared-workflow-friction-polish`
- `declaredChildren`:
  - `live-dogfood-declared-config-unset`: foundation child; no dependencies.
  - `live-dogfood-declared-quick-routing`: depends on `live-dogfood-declared-config-unset`.
  - `live-dogfood-declared-staleness-threshold`: independent child; no dependencies.
- `foundationChild`: `live-dogfood-declared-config-unset`
- `initialActiveChild`: `live-dogfood-declared-config-unset`
- `integrationSketch`: keep children independently shippable; route quick-mode wording after config semantics; keep staleness-threshold independent; do not create a shared design surface.

### SplitPlanDocument Summary

The persisted `SplitPlanDocument` used by the command had:

- `origin: "declared"`
- `interactive: true`
- `plan.parentSlug: "live-dogfood-declared-workflow-friction-polish"`
- ordered children:
  1. `live-dogfood-declared-config-unset`
  2. `live-dogfood-declared-quick-routing`
  3. `live-dogfood-declared-staleness-threshold`
- `plan.foundationChild: "live-dogfood-declared-config-unset"`
- `plan.initialActiveChild: "live-dogfood-declared-config-unset"`

The command persisted the full document to `.oat/projects/shared/live-dogfood-declared-workflow-friction-polish/references/split-plan.json`.

### Commands Run

```bash
rg -n "oat-project-split|workflow-friction|quick-mode|staleness threshold|config unset" /Users/thomas.stang/.codex/memories/MEMORY.md
sed -n '1,240p' .agents/skills/oat-brainstorm/SKILL.md
git status --short
sed -n '241,620p' .agents/skills/oat-brainstorm/SKILL.md
sed -n '1,240p' .agents/skills/oat-project-split/SKILL.md
find .oat/projects/shared/oat-project-split -maxdepth 3 -type f | sort
oat config get tools.ideas
oat config get tools.project-management
oat config get tools.workflows
oat config get activeProject
sed -n '1,240p' packages/cli/src/projects/split/child-plan.ts
sed -n '1,180p' packages/cli/src/projects/split/document-validation.ts
sed -n '160,260p' packages/cli/src/commands/project/split/run.ts
sed -n '1,140p' packages/cli/src/projects/split/__tests__/child-plan.test.ts
pnpm run cli -- project split validate-plan --plan-file .oat/projects/shared/oat-project-split/dogfood/live-dogfood-declared-split-plan.tmp.json
pnpm run cli -- project split run --plan-file .oat/projects/shared/oat-project-split/dogfood/live-dogfood-declared-split-plan.tmp.json
find .oat/projects/shared/live-dogfood-declared-workflow-friction-polish .oat/projects/shared/live-dogfood-declared-config-unset .oat/projects/shared/live-dogfood-declared-quick-routing .oat/projects/shared/live-dogfood-declared-staleness-threshold -maxdepth 3 -type f | sort
oat config get activeProject
sed -n '1,120p' .oat/projects/shared/live-dogfood-declared-workflow-friction-polish/references/split-plan.json
sed -n '1,90p' .oat/projects/shared/live-dogfood-declared-workflow-friction-polish/state.md
sed -n '1,70p' .oat/projects/shared/live-dogfood-declared-config-unset/state.md
sed -n '1,70p' .oat/projects/shared/live-dogfood-declared-quick-routing/state.md
sed -n '1,70p' .oat/projects/shared/live-dogfood-declared-staleness-threshold/state.md
pnpm run cli -- project list --include-coordination
pnpm run cli -- project list
pnpm run cli -- project split validate-plan --plan-file .oat/projects/shared/live-dogfood-declared-workflow-friction-polish/references/split-plan.json
```

Validation returned:

```json
{
  "ok": true
}
```

Run output:

```text
Split completed.
```

Post-run validation of the persisted `references/split-plan.json` failed because the split-created slugs now exist:

```text
slug-collision-existing: Parent slug already exists: live-dogfood-declared-workflow-friction-polish
slug-collision-existing: Child slug already exists: live-dogfood-declared-config-unset
slug-collision-existing: Child slug already exists: live-dogfood-declared-quick-routing
slug-collision-existing: Child slug already exists: live-dogfood-declared-staleness-threshold
```

### Resulting Tree

```text
.oat/projects/shared/live-dogfood-declared-config-unset/discovery.md
.oat/projects/shared/live-dogfood-declared-config-unset/implementation.md
.oat/projects/shared/live-dogfood-declared-config-unset/plan.md
.oat/projects/shared/live-dogfood-declared-config-unset/state.md
.oat/projects/shared/live-dogfood-declared-quick-routing/discovery.md
.oat/projects/shared/live-dogfood-declared-quick-routing/implementation.md
.oat/projects/shared/live-dogfood-declared-quick-routing/plan.md
.oat/projects/shared/live-dogfood-declared-quick-routing/state.md
.oat/projects/shared/live-dogfood-declared-staleness-threshold/discovery.md
.oat/projects/shared/live-dogfood-declared-staleness-threshold/implementation.md
.oat/projects/shared/live-dogfood-declared-staleness-threshold/plan.md
.oat/projects/shared/live-dogfood-declared-staleness-threshold/state.md
.oat/projects/shared/live-dogfood-declared-workflow-friction-polish/discovery.md
.oat/projects/shared/live-dogfood-declared-workflow-friction-polish/references/split-plan.json
.oat/projects/shared/live-dogfood-declared-workflow-friction-polish/state.md
```

### Active Project

`.oat/config.local.json.activeProject` was updated to:

```text
.oat/projects/shared/live-dogfood-declared-config-unset
```

### Evidence Notes

- Parent `state.md` has `oat_kind: coordination`, `oat_phase: decomposition`, `oat_phase_status: complete`, and ordered `oat_children`.
- Parent has only `discovery.md`, `state.md`, and `references/split-plan.json`; it has no executable `spec.md`, `design.md`, `plan.md`, or `implementation.md`.
- Child projects have `oat_kind: implementation`, `oat_parent: live-dogfood-declared-workflow-friction-polish`, `oat_workflow_mode: quick`, `oat_phase: discovery`, and `oat_phase_status: in_progress`.
- `live-dogfood-declared-quick-routing/state.md` records `oat_depends_on: live-dogfood-declared-config-unset`.
- Child `discovery.md` files include `oat_inherited_context_revalidated: false`.
- `pnpm run cli -- project list` omits the completed coordination parent by default.
- `pnpm run cli -- project list --include-coordination` included `live-dogfood-declared-workflow-friction-polish` during this dogfood pass, but displayed it as `discovery (complete)` with recommendation `oat-project-plan` even though its `state.md` correctly recorded `decomposition`/`coordination`. This was fixed after the live dogfood run; current behavior displays coordination parents as `decomposition (complete)` with recommendation `none`.

### Limitations

- The live entry did exercise the actual `oat-brainstorm` declared-mode boundary question and the `oat-project-split` CLI handoff.
- The `OAT ▸ PROJECT SPLIT` banner was printed after `project split run` completed, not before the run. The command path was still the required split-skill entrypoint, but the progress-indicator ordering was not faithful.
- No satisfaction-check prompt was used after the user explicitly instructed "Please proceed with the declared split handoff"; the declared-mode handoff proceeded directly once the child list, dependencies, parent slug, shared constraints, and integration risk were clear.
- `project split validate-plan` is useful before creation, but re-validating the persisted plan after creation reports slug collisions against the just-created parent and children. Resume-oriented validation may need different collision semantics or clearer operator guidance.
