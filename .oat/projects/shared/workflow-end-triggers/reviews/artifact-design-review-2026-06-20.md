---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-end-triggers
---

# Artifact Review: design

**Reviewed:** 2026-06-20
**Scope:** Quick-mode design artifact, checked against discovery and current repo structure
**Files reviewed:** 10
**Commits:** N/A (artifact review)

## Summary

The design captures the core gate mechanism well: per-skill config, gate-aware skill opt-in, process exit-code semantics, and bounded `onFailure` handling are aligned with discovery. I found two Important readiness gaps before implementation: the design does not provide a workable config write/setup surface for `workflow.gates`, and it routes skill eligibility validation through the canonical agent parser instead of the existing skill validation surface. There is also a small quick-mode reference drift to clean up.

## Findings

### Critical

None

### Important

- **Gate configuration has no usable CLI write path** (`.oat/projects/shared/workflow-end-triggers/design.md:37`)
  - Issue: The design adds `workflow.gates` to config normalization/resolution, but it never accounts for the existing fixed-key `oat config set` surface. Today `ConfigKey` is a closed union and `runSet` rejects unknown keys before writing, so keys such as `workflow.gates.oat-project-plan.command` or structured gate objects would be rejected (`packages/cli/src/commands/config/index.ts:31`, `packages/cli/src/commands/config/index.ts:674`, `packages/cli/src/commands/config/index.ts:1274`). Since discovery says gates live in all config layers and user config is the expected primary home for cross-model gates, users need a defined setup path.
  - Fix: Add an explicit gate configuration write surface to the design. Good options are a dedicated `oat gate set/unset <skill>` command that writes a full `GateConfig | null`, or a documented decision that gates are edited manually in JSON plus validation/doctor support. If using `oat config set`, specify the required `ConfigKey`/parser changes and tests for command, description, onFailure, maxAttempts, and null-disable.

- **Eligibility validation points at the agent parser instead of the skill validation path** (`.oat/projects/shared/workflow-end-triggers/design.md:41`)
  - Issue: Component 5 says configured gates are validated by parsing skill frontmatter via `agents/canonical/parse.ts`, but canonical skills are currently validated through `packages/cli/src/validation/skills.ts`, which scans `.agents/skills/*/SKILL.md` and applies skill-specific rules (`packages/cli/src/validation/skills.ts:314`, `packages/cli/src/validation/skills.ts:332`). The `agents/canonical` parser models `.agents/agents/*.md` style documents (`packages/cli/src/agents/canonical/types.ts:3`, `packages/cli/src/agents/canonical/parse.ts:146`). Implementing the design literally risks putting gateability checks in the wrong subsystem and missing the existing `validate-oat-skills`/doctor flow.
  - Fix: Move the eligibility validation design to the skills validation surface. Specify a small shared helper for reading skill frontmatter, then add gateability checks to `validateOatSkills` and doctor/internal validation, with tests for a configured gate targeting a skill with `oat_gateable: true`, a skill without the marker, and an unknown/missing skill.

### Medium

None

### Minor

- **Quick-mode design still references a missing spec artifact** (`.oat/projects/shared/workflow-end-triggers/design.md:199`)
  - Issue: This project is quick-mode and `spec.md` does not exist. The design correctly uses discovery as its upstream source, but the References section lists `Specification: spec.md`, which can mislead the next reviewer or implementer into treating a missing optional artifact as expected.
  - Suggestion: Replace the spec reference with `Discovery: discovery.md` or mark spec as not applicable for quick mode.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, `packages/cli/src/config/oat-config.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/validation/skills.ts`, `packages/cli/src/agents/canonical/parse.ts`.

### Requirements Coverage

| Requirement                                                   | Status  | Notes                                                                                                         |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Per-skill gate runs before done                               | partial | Design defines gate-aware skill final step, but eligibility validation needs to land in the skills subsystem. |
| Generic command + exit-code contract                          | covered | Design keeps the command generic and uses exit code as the pass/fail signal.                                  |
| `onFailure` block/prompt/warn behavior                        | covered | Design captures bounded remediation, prompting, and warning behavior.                                         |
| Existing OAT state/skill context reuse                        | covered | Design avoids bespoke context-passing for the OAT-native review case.                                         |
| Config in all layers with most-specific-wins and null-disable | partial | Resolver semantics are described, but setup/write surface for `workflow.gates` is missing.                    |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after addressing the design findings:

```bash
pnpm --filter @open-agent-toolkit/cli test -- config/index.test.ts config/resolve.test.ts validation/skills.test.ts
pnpm run cli -- config list --details
pnpm run cli -- gate resolve oat-project-plan --json
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan/artifact alignment work.
