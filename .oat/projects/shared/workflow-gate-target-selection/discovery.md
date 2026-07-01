---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-01
oat_generated: false
---

# Discovery: workflow-gate-target-selection

## Initial Request

The recently merged workflow-gate follow-up still has dogfood feedback to address.
During `oat-project-quick-start` in another repo, the configured gate selected a
hardcoded Codex target from a Codex-hosted workflow and then failed because
`codex exec` received multiple prompt positionals. The user selected the quick
workflow and asked to run it through the full workflow process.

## Clarifying Context

The user clarified a durable rule:

> The skills definitely should never be hardcoding targets.

That means reusable lifecycle skill-gate commands and docs examples should not
teach exact provider/model pins such as `--target codex-5.5-xhigh` as the default
pattern. Gate-aware skills should resolve and run configured gates; independent
reviewer selection should come from the target registry, runtime avoidance, and
target priority. Exact targets remain useful for manual dispatch, debugging, or
explicit local/user preference.

The user also asked to verify that the commands work with the CLI for Cursor,
Claude, and Codex.

## Solution Space

The chosen direction is a focused V1 repair, not a same-target V2 expansion.

### Approach 1: Repair V1 Defaults And Prompt Assembly (Selected)

Update the review-gate command path so review metadata and user prompt are
delivered as one provider prompt, remove exact target pins from lifecycle gate
examples and live user-level gates, and verify the behavior through CLI-level
provider shims for Codex, Claude, and Cursor.

This is the right scope because it fixes the observed regression while preserving
the existing V1 model: runtime-level independence by default, explicit target
registry configuration, and no same-target/model detection.

### Approach 2: Force Claude For Codex-Hosted Lifecycle Gates

Change lifecycle gate commands to pin a Claude target whenever Codex is the
orchestrator. This would fix the immediate Codex-on-Codex dogfood failure, but
it would reintroduce provider-specific policy into reusable skill-gate commands.

### Approach 3: Implement Gates V2 Same-Target Policy Now

Add target preferences, target-level identity, and same-target avoidance. This
is larger than the feedback requires and is already tracked separately as the
Gates V2 backlog lane.

## Key Decisions

1. **Lifecycle gate commands stay unpinned by default:** The recommended
   `workflow.gates.skills.<skill>.command` shape for gate-aware lifecycle skills
   should omit `--target`, allowing `oat gate review` to avoid the current runtime
   and choose the highest-priority eligible target.
2. **Exact targets are an escape hatch:** Docs may still show `--target <id>` for
   manual dispatch, debugging, or intentionally fixed local preferences, but not
   as the reusable lifecycle skill-gate example.
3. **Review gate prompts are single provider prompts:** `oat gate review` should
   assemble its gate metadata, project path, review hints, and user prompt into
   one prompt string before appending it to provider base commands.
4. **Provider verification must be CLI-level:** Unit tests should cover command
   assembly, and smoke checks should run the actual CLI against `codex`,
   `claude`, and `cursor-agent` shims so argument behavior is verified without
   invoking real providers.
5. **All gate-aware lifecycle skills must be checked:** `oat-project-plan`,
   `oat-project-quick-start`, `oat-project-import-plan`, and
   `oat-project-implement` need consistent Gate Execution guidance.

## Constraints

- Do not broaden into Gates V2 same-target detection or target preferences.
- Preserve `cross-provider-exec` as the generic child-status executor.
- Preserve stateful `oat gate review` behavior: review artifacts and receive
  handoff remain expected.
- Canonical skill edits require version bumps.
- Changes to CLI behavior, docs, and bundled skills require the lockstep public
  package version bump and `pnpm release:validate`.
- Update the live user-level gates on both the mini and laptop so dogfooding
  stops using pinned Codex targets.

## Success Criteria

- All four gate-aware lifecycle skills guide agents away from hardcoded exact
  targets in reusable skill-gate commands.
- Workflow-gate docs and reference notes show unpinned lifecycle gate commands
  as the default.
- `oat gate review` passes exactly one assembled provider prompt to Codex,
  Claude, and Cursor targets.
- CLI-level smoke checks prove `oat gate review --target codex-default`,
  `--target claude-default`, and `--target cursor-default` can run through the
  target registry and parse clean gate review artifacts.
- Mini and laptop user-level gates for quick-start, plan, import-plan, and
  implement no longer contain `--target codex-5.5-xhigh`.
- Focused tests, skill validation, type-check/build, docs build, and
  release validation pass before completion.

## Out of Scope

- Implementing same-target/model-level gate dispatch.
- Changing built-in target defaults to include dangerous permission bypass flags.
- Replacing stateful review gates with read-only console checks.
- Reworking dispatch ceilings or phase implementation review routing.

## Risks

- **Prompt assembly drift:** Joining prompt segments could lose context if
  separators are unclear.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Use explicit blank-line separators and test that all metadata
    and user prompt content survive in the single prompt.
- **Provider smoke side effects:** Real provider CLIs could write files or spend
  tokens.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Use temporary PATH shims named `codex`, `claude`, and
    `cursor-agent` for CLI smoke tests.
- **Release bookkeeping drift:** Skill/docs changes can fail release guardrails
  if versions are not bumped together.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Include a dedicated release bookkeeping task and run
    `pnpm release:validate`.

## Next Steps

Proceed straight to a quick-mode `plan.md`; no lightweight design is needed.
