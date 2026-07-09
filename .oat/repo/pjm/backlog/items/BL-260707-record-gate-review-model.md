---
id: BL-260707-record-gate-review-model
title: 'Stamp gate invocation target metadata on review artifacts'
status: open # open | in_progress | closed | wont_do
priority: high
scope: feature
scope_estimate: M
labels: [reviews, workflow-gates, provenance]
assignee: null
created: '2026-07-07T05:23:03Z'
updated: '2026-07-09T14:55:19Z'
associated_issues: [BL-260707-ask-to-enable-phase-review]
---

## Description

Gate-generated review artifacts should record the configured invocation target
that ran the review. Phase review gates and other `oat gate review` runs are
dispatched through `workflow.gates.execTargets`, so OAT knows the selected
target before the model starts. That target identity should be injected into the
gate prompt and stamped into the review artifact, instead of asking the model to
self-identify or inferring identity from transcript archaeology.

Make target identity explicit in exec target config, for example:

```json
{
  "workflow": {
    "gates": {
      "execTargets": {
        "codex-5.5-xhigh": {
          "runtime": "codex",
          "baseCommand": ["codex", "exec", "--model", "gpt-5.5"],
          "invocation": {
            "model": "gpt-5.5",
            "reasoningEffort": "xhigh"
          },
          "priority": 120
        }
      }
    }
  }
}
```

Then `oat gate review` should include a prompt block such as "This is the OAT
invocation target you were dispatched with; stamp these exact values in the
review artifact." The artifact should distinguish this configured invocation
target from any optional model self-report or observed producer identity.

## Acceptance Criteria

- `workflow.gates.execTargets` supports explicit invocation metadata for model and reasoning effort, using clear provider-neutral field names.
- `oat gate review` injects the resolved target id, runtime, invocation model, invocation reasoning effort, and metadata source into the assembled review prompt after target selection.
- Review artifacts produced through `oat gate review` include frontmatter fields for the invocation target, for example `oat_gate_target`, `oat_gate_runtime`, `oat_invocation_model`, `oat_invocation_reasoning_effort`, and `oat_invocation_source`.
- The review prompt tells the reviewer to stamp the OAT-provided invocation fields exactly and not replace them with model self-identification.
- Unknown or provider-default values are explicit in both prompt copy and artifact fields; OAT does not guess when an exec target does not declare invocation metadata.
- Gate JSON output includes the same invocation target metadata so orchestrators and logs can correlate artifacts with the target that ran them.
- `oat-project-review-provide` and review artifact docs explain the difference between configured invocation target and optional self-reported or observed model identity.
- Tests cover explicit Codex model plus reasoning effort, explicit Claude model, provider-default or unknown Cursor targets, and artifact parsing compatibility.
