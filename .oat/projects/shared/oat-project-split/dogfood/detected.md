# Detected Path Dogfood

Date: 2026-05-21

## Scenario

Candidate detected request: a discovery that starts as "improve OAT workflow friction" but separates into independently shippable config-command, quick-mode-routing, and staleness-threshold work.

The expected mid-stream signals are:

- `independently-shippable`
- `no-shared-design-surface`

## Commands Exercised

```bash
pnpm run cli -- project split evaluate-signals --fired independently-shippable,no-shared-design-surface
pnpm --filter @open-agent-toolkit/cli exec vitest run src/__tests__/skills/discover-detection.test.ts src/commands/project/split/__tests__/run.test.ts
```

## Evidence

- `evaluate-signals` returned `triggered: true` and `confidence: "high"` for the two load-bearing signals.
- `discover-detection.test.ts` passed, including coverage for:
  - high-confidence prompt when the two load-bearing signals fire;
  - no prompt below threshold;
  - non-interactive detected recommendations writing `## Detected Split Recommendation` and exiting non-zero;
  - convergence detection failing fast in non-interactive mode instead of silently proceeding as one project.
- `run.test.ts` passed, including command-boundary coverage for detected-origin non-interactive behavior and declared non-interactive behavior.

## Limitations

This was not a full live `oat-project-discover` conversation. I could not honestly create an interactive mid-stream offer and end-of-discovery scope-check from inside this phase runner. The exercised evidence covers the shared signal evaluator and the automated discover/CLI behavior that backs the detected path.

No live mid-stream offer, convergence scope-check prompt, or interactive detected confirmation flow was observed in this p05 run. Treat the detected-entry dogfood as limited until tracked follow-up `bl-074b` runs the live session and records the prompt wording, confirmation flow, invoked split payload, and resulting tree.

## Followups / Rough Edges

- Tracked release follow-up `bl-074b` should run an actual interactive `oat-project-discover` conversation and capture the exact prompt wording for the mid-stream offer and convergence scope check.
- No product issue was found in the signal threshold behavior during this non-interactive pass.

## Live Entry Dogfood

Date: 2026-05-21

### Initial Prompt

User prompt under dogfood:

> $oat-project-discover Start discovery for improving OAT workflow friction. The likely scope may include config unset handling, quick-mode routing, and knowledge staleness threshold cleanup, but I want discovery to tell us whether this should split.

### Prompts Shown And Replies

1. Active project resolution prompt shown:

   > The discovery skill found an existing active project:
   >
   > `.oat/projects/shared/live-dogfood-declared-config-unset`
   >
   > That project is already in discovery and belongs to a prior declared-split dogfood parent, so I should not silently reuse it for this detected-split run.
   >
   > Which should I do?
   >
   > 1. **Create/switch to a new dogfood project** named with the required prefix, e.g. `.oat/projects/shared/live-dogfood-detected-workflow-friction`
   > 2. **Continue with the current active project** `.oat/projects/shared/live-dogfood-declared-config-unset`
   > 3. **Open a different existing project** you name

   Reply:

   > Choose option 1. Create/switch to a new dogfood project at `.oat/projects/shared/live-dogfood-detected-workflow-friction`. Use quick workflow context. Initial request: improve OAT workflow friction; possible areas include config unset handling, quick-mode routing, and knowledge staleness threshold cleanup, but discovery should determine whether it should split. Continue the live discovery and watch for detected split behavior.

2. Knowledge staleness prompt shown:

   > Knowledge base exists, but it is stale by both thresholds:
   >
   > - Generated: `2026-04-02`
   > - Age: `48` days old
   > - Files changed since indexed HEAD: `499`
   > - Diff summary: `499 files changed, 50320 insertions(+), 9220 deletions(-)`
   >
   > **Continue discovery with stale knowledge, or refresh the knowledge base first?**
   >
   > Recommendation for this dogfood run: **continue with stale knowledge**, because one of the suspected friction areas is knowledge staleness threshold cleanup, and this warning is useful evidence for the session.

   Reply:

   > Continue with stale knowledge for this dogfood run. Record the staleness warning as useful evidence. Proceed with discovery.

3. Gray-area selection prompt shown:

   > Which areas should we explore during discovery? Select all that apply.
   >
   > 1. **Config unset handling**: how OAT behaves when required config like `activeProject` or roots are missing, invalid, or stale.
   > 2. **Quick-mode routing**: whether terse project commands route correctly through quick workflow state without unnecessary prompts.
   > 3. **Knowledge staleness cleanup**: whether stale-knowledge warnings are calibrated, actionable, and not noisy.
   > 4. **Split boundary**: whether these are one cohesive workflow-friction project or independently shippable child projects.
   > 5. **Lifecycle evidence quality**: what dogfood evidence should be captured so this improves the workflow rather than just producing artifacts.
   >
   > My recommendation: select **all five** for one broad discovery pass, then let split detection decide whether to hand off to `oat-project-split`.

   Reply:

   > Select all five areas. The key things to capture: config unset handling and quick-mode routing are independently shippable; staleness threshold cleanup is separate and can be a separate PR; there is no shared design surface beyond broad workflow polish; lifecycle evidence quality is cross-cutting but can be parent context.

4. Mid-stream split offer shown:

   > This looks like multiple independent projects.
   >
   > Detected split signals:
   >
   > - `independently-shippable`
   > - `no-shared-design-surface`
   > - `expect-separate-prs`
   > - `distinct-subsystems`
   >
   > Evaluator result: `confidence: high`.
   >
   > Choose one:
   >
   > 1. **Split now** into coordinated child projects.
   > 2. **Do one round of broad cross-cutting discovery first**, then split or proceed.
   > 3. **Keep this as one project** despite the high-confidence split signal.
   >
   > My recommendation: **Split now**. The config unset, quick-mode routing, and staleness threshold work can ship separately, while lifecycle evidence quality belongs in the coordination parent.

   Reply:

   > Choose option 1: split now into coordinated child projects.
   >
   > Use this detected split shape:
   >
   > - Coordination parent slug: `live-dogfood-detected-workflow-friction`
   > - Child 1: `live-dogfood-detected-config-unset` (foundation)
   > - Child 2: `live-dogfood-detected-quick-routing` (depends on `live-dogfood-detected-config-unset`)
   > - Child 3: `live-dogfood-detected-staleness-threshold` (independent)

5. Convergence scope-check wording:

   Not reached. The user accepted the high-confidence mid-stream detected split offer, so discovery handed off to `oat-project-split` before the final convergence prompt.

### Detected Signals

- Fired signals: `independently-shippable`, `no-shared-design-surface`, `expect-separate-prs`, `distinct-subsystems`
- Evaluator result: `triggered: true`, `confidence: high`
- Signal basis:
  - config unset handling and quick-mode routing were described as independently shippable;
  - staleness threshold cleanup was described as separate and PR-suitable;
  - the only shared surface was broad workflow polish;
  - lifecycle evidence quality fit coordination-parent context.

### SplitPayload / SplitPlanDocument Summary

Observed split origin: `detected-mid-stream`.

Effective `SplitPayload` shape used to produce the persisted plan:

- `origin`: `detected-mid-stream`
- `interactive`: `true`
- `parentSlug`: `live-dogfood-detected-workflow-friction`
- `foundationChild`: `live-dogfood-detected-config-unset`
- `initialActiveChild`: `live-dogfood-detected-config-unset`
- `priorDiscovery.path`: `.oat/projects/shared/live-dogfood-detected-workflow-friction/discovery.md`
- `children`:
  - `live-dogfood-detected-config-unset`, no dependencies
  - `live-dogfood-detected-quick-routing`, depends on `live-dogfood-detected-config-unset`
  - `live-dogfood-detected-staleness-threshold`, no dependencies

Persisted `SplitPlanDocument` summary:

- Parent: `live-dogfood-detected-workflow-friction`
- Children in order:
  1. `live-dogfood-detected-config-unset`
  2. `live-dogfood-detected-quick-routing`
  3. `live-dogfood-detected-staleness-threshold`
- Foundation child: `live-dogfood-detected-config-unset`
- Initial active child: `live-dogfood-detected-config-unset`
- Integration sketch: parent preserves workflow-polish context and lifecycle evidence quality; children revalidate inherited context and can ship as separate PRs.

### Commands Run

```bash
git status --short
oat config get activeProject 2>/dev/null || true
test -f .oat/repo/knowledge/project-index.md && printf yes || printf no
sed -n '1,220p' .oat/projects/shared/live-dogfood-declared-config-unset/state.md
oat project new --mode quick live-dogfood-detected-workflow-friction --no-dashboard
grep "^oat_source_head_sha:" .oat/repo/knowledge/project-index.md | awk '{print $2}'
grep "^oat_generated_at:" .oat/repo/knowledge/project-index.md | awk '{print $2}'
git rev-parse HEAD
git merge-base HEAD origin/main
git diff --numstat "$SOURCE_HEAD_SHA..HEAD" | wc -l
git diff --shortstat "$SOURCE_HEAD_SHA..HEAD"
sed -n '1,220p' .oat/repo/knowledge/project-index.md
sed -n '1,220p' .oat/repo/knowledge/architecture.md
sed -n '1,220p' .oat/repo/knowledge/conventions.md
sed -n '1,220p' .oat/repo/knowledge/concerns.md
oat project split evaluate-signals --fired "independently-shippable,no-shared-design-surface,expect-separate-prs,distinct-subsystems"
pnpm run cli -- project split evaluate-signals --fired "independently-shippable,no-shared-design-surface,expect-separate-prs,distinct-subsystems"
pnpm run cli -- project split run --help
pnpm run cli -- project split validate-plan --help
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project split validate-plan --plan-file /tmp/oat-live-dogfood-detected-split-plan.json
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project split run --plan-file /tmp/oat-live-dogfood-detected-split-plan.json
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts project split run --plan-file /tmp/oat-live-dogfood-detected-split-plan.json  # rerun with tty
find .oat/projects/shared/live-dogfood-detected-* -maxdepth 2 -type f | sort
oat config get activeProject 2>/dev/null || true
sed -n '1,220p' .oat/projects/shared/live-dogfood-detected-workflow-friction/state.md
sed -n '1,260p' .oat/projects/shared/live-dogfood-detected-workflow-friction/references/split-plan.json
```

### Resulting Tree

```text
.oat/projects/shared/live-dogfood-detected-workflow-friction/
  discovery.md
  references/split-plan.json
  state.md
.oat/projects/shared/live-dogfood-detected-config-unset/
  discovery.md
  implementation.md
  plan.md
  state.md
.oat/projects/shared/live-dogfood-detected-quick-routing/
  discovery.md
  implementation.md
  plan.md
  state.md
.oat/projects/shared/live-dogfood-detected-staleness-threshold/
  discovery.md
  implementation.md
  plan.md
  state.md
```

Parent state:

- `oat_kind: coordination`
- `oat_phase: decomposition`
- `oat_phase_status: complete`
- `oat_workflow_mode: quick`
- `oat_children`: `live-dogfood-detected-config-unset`, `live-dogfood-detected-quick-routing`, `live-dogfood-detected-staleness-threshold`

Child state:

- all children are `oat_kind: implementation`
- all children are `oat_phase: discovery`
- all children are `oat_workflow_mode: quick`
- quick-routing has `oat_depends_on: [live-dogfood-detected-config-unset]`
- child discoveries include `oat_inherited_context_revalidated: false`

Active project after split:

```text
.oat/projects/shared/live-dogfood-detected-config-unset
```

### Limitations / Friction Observed

- Installed `oat` was stale for this worktree: `oat project split evaluate-signals ...` failed with `error: unknown command 'split'`; the skill's local-development fallback was required.
- `pnpm run cli -- project split run --help` and `pnpm run cli -- project split validate-plan --help` failed in `packages/cli/scripts/bundle-assets.sh` because bundled asset files were missing during the copy step. Direct `pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts ...` reached the command code.
- The detected discovery flow creates or uses an active quick project before split confirmation, but `oat project split run` treats an existing parent path as a resumable coordination parent only. When the parent existed as a quick implementation project, the interactive split run failed with `Split resume requires a coordination parent`.
- The non-interactive detected run failed fast as intended with `Detected split requires interactive confirmation; recommendation recorded.`, but that branch expects the prior discovery file to exist.
- To complete the live split, the pre-split quick parent was preserved outside the repo under `/tmp/oat-live-dogfood-backups/` and the TTY split command was rerun so the orchestrator could create the coordination parent and child tree.
- The successful split command printed only `Split completed.`; the skill's advertised progress indicators were not emitted by the CLI boundary used in this run.
