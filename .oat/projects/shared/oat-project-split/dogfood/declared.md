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

- Parent `state.md` body still says the parent has scaffolded `plan.md` and `implementation.md` artifacts even though the file invariant correctly removes them. The frontmatter and filesystem are correct; the human-readable template body is stale for coordination parents.
- Child routing bug found during this dogfood pass was fixed in `fix(p05-t02)`: split-seeded children now write scalar `oat_phase: discovery`, scalar `oat_workflow_mode: quick`, scalar `oat_plan_source: quick`, and `project status --project-path .oat/projects/shared/dogfood-config-unset --json` reports `workflowMode: "quick"` with quick-mode routing.
- Live declared entry-path coverage remains a release follow-up: `.oat/repo/reference/backlog/items/live-dogfood-oat-project-split-entry-paths.md` (`bl-074b`).
