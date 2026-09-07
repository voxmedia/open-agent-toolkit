---
id: BL-260904-add-recap-seam-config-keys
title: Add recap seam config keys
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - explainer
  - config
  - cli
assignee: null
created: 2026-09-04T23:21:01.028Z
updated: 2026-09-04T23:21:01Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/230
external_plans: []
---

## Description

Split from the autonomous-recap plan (BL-260902-make-autonomous-project-recap, GitHub issue #230) so that plan shares no config seam with other wave lanes. Add workflow.explainers.recapSeams.{authorModulePath,criticModulePath,browserSessionModulePath,visualCriticModulePath} to packages/cli/src/config/oat-config.ts, resolve.ts defaults, the oat config set/get/unset key catalog, the explainer-kit config-contract reference, and apps/oat-docs/docs/cli-utilities/configuration.md, so a host can opt in to unattended recaps by naming seam modules; readable via oat config get so the completion skill's shell path stays consistent with the resolver.

## Acceptance Criteria

- The four `workflow.explainers.recapSeams.*ModulePath` keys parse, default to unset, and round-trip through `oat config set`, `get`, and (once shipped) `unset`.
- The explainer-kit adapter resolves seam modules from those keys before falling back to the autonomous skip recorded by the recap plan's capability probe.
- `config-contract.md` and `cli-utilities/configuration.md` document the keys; focused config tests cover per-scope normalization and unset defaults.
