---
oat_generated: true
oat_generated_at: 2026-07-25T00:57:30Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/opus-5-model-guidance
oat_gate_headless: true
oat_gate_run_id: 73821c55-661d-40a0-9d36-96c80f18762b
oat_gate_target: cursor-gpt-5-6-sol-max
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-max
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-25T00:57:30Z
**Scope:** Quick-workflow implementation plan readiness and alignment with discovery
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The plan is not ready to implement unchanged. It would label six unprobed Cursor mappings as mapping-specific G01 approvals, and its reverification output is both gitignored and absent from the final-PR workflow; these are blocking findings.

Findings: 1 critical, 1 important, 1 medium, 1 minor

## Dispatch Audit

- Gate route: inline (runtime=cursor, cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/opus-model)
- Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
- Gate-configured invocation is recorded verbatim in frontmatter; it is independent of the project-policy compatibility stamp above.

## Findings

### Critical

- **Do not turn unverified Cursor pins into approved G01 mappings** (`.oat/projects/shared/opus-5-model-guidance/plan.md:314`)
  - Issue: Discovery explicitly says the six bracket-form pins were not verified by a live probe and that thinking-mode resolution is assumed (`discovery.md:274-280`), but p02-t01 adds them to `APPROVED_G01_MAPPINGS` and constructs them with `approvedMapping(...)` (`plan.md:314-336`). The shipped contract requires mapping-specific native-launch evidence (`apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md:301-309`), while the materializer trusts the asserted `gateEvidence` fields as approval (`packages/cli/src/providers/cursor/codec/materialize.ts:39-47`). Implementing this plan would therefore fabricate six approvals and materialize twelve roles whose pins may silently fall back, including consequential-review routes.
  - Fix: Add a precondition/task that performs and records a mapping-specific Cursor IDE G01 probe for each new flat-ID/bracket-form pair, including the observed `subagent_model`, launch identifiers, and terminal status. Add only mappings whose observed normalized model matches. If those probes cannot be run, defer catalog/materialization or explicitly redesign the evidence contract; documenting an assumption is not approval evidence.
  - Requirement: Five Opus 5 pins and one Opus 4.8 cyber pin must be exactly materializable.

### Important

- **Put the reverification record on a durable path that the PR workflow consumes** (`.oat/projects/shared/opus-5-model-guidance/plan.md:659`)
  - Issue: p03-t05 writes `.oat/projects/shared/opus-5-model-guidance/pr/reverification.md`, but `.gitignore:74` excludes every `.oat/**/pr/` file, so the declared `git add` cannot create the promised commit. `oat-project-pr-final` reads only the standard project artifacts (`.agents/skills/oat-project-pr-final/SKILL.md:228-237`) and has no reverification input or PR-body section. The plan's claim that the skill can lift this file verbatim is unsupported, so discovery's requirement that the record appear in the PR description remains unmet. Its `rg -c` check also counts matching lines rather than proving every schema key exists.
  - Fix: Either revise the requirement to a tracked record, or store the record in a tracked path and add an explicit, tested PR-final consumption path that includes it in the GitHub body. Replace the count-only check with validation that asserts each required key and both provider entries independently.

### Medium

- **Derive the backlog item path from the CLI result instead of a local-date literal** (`.oat/projects/shared/opus-5-model-guidance/plan.md:551`)
  - Issue: The task declares and later verifies `BL-260724-*`, but `oat backlog new` generates its ID from the current UTC date (`packages/cli/src/commands/backlog/new.ts:130-133`; `packages/cli/src/commands/backlog/shared/generate-id.ts:4-8`). The current UTC date is already 2026-07-25, so the command will create `BL-260725-*` and the task's verification glob will miss its output.
  - Fix: Run the creation command with `--json`, capture its returned `filePath`/ID, and reuse that exact value for content edits and verification. Do not encode the operator's local calendar date in the expected filename.

### Minor

- **Avoid repository-wide staging in the validation-only task** (`.oat/projects/shared/opus-5-model-guidance/plan.md:649`)
  - Issue: `git add -A` can absorb unrelated or generated files after full-repository checks, despite the plan's otherwise exact per-task staging contract.
  - Suggestion: Inspect the formatter-produced diff and stage only the intended paths, assigning fix-ups to their owning task scope where practical.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, the Cursor pin materialization contract and tests, the backlog ID implementation, `.gitignore`, and `oat-project-pr-final`. No spec or design artifact exists, which is valid for this quick workflow.

### Requirements Coverage

| Requirement                                                                       | Status  | Notes                                                                                            |
| --------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| Adopt Opus 5 in canonical Claude and Cursor guidance                              | covered | Phase 1 provides bounded edits, preserved policy language, tests, and commits.                   |
| Materialize five Opus 5 pins and one Opus 4.8 cyber pin                           | blocked | The plan asserts G01 approval without the required mapping-specific launch evidence.             |
| Rebalance the Cursor recommendation with 17 catalogued and 16 recommended targets | covered | Counts, asymmetry, generated mirror, and focused tests are explicit.                             |
| Preserve the task-class ladder and Opus-first policy                              | covered | The revised consequential row and exceptional Fable escalation are aligned with discovery.       |
| Emit a schema-complete reverification record in the PR description                | missing | The proposed file is ignored and the PR-final workflow does not consume it.                      |
| Capture deferred tier questions in the backlog                                    | partial | Content and metadata are specified, but the hardcoded date makes output verification unreliable. |
| Satisfy sync, lockstep-version, and release-validation contracts                  | covered | Generated roles, five package versions, full checks, and `release:validate` are mapped.          |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after revising the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/opus-5-model-guidance/plan.md .oat/projects/shared/opus-5-model-guidance/discovery.md
rg -n "G01|subagent_model|reverification|project-pr|--json|filePath" .oat/projects/shared/opus-5-model-guidance/plan.md
! rg -n "pr/reverification\.md|BL-260724" .oat/projects/shared/opus-5-model-guidance/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan tasks.
