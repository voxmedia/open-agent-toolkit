---
id: BL-260819-refresh-codex-skill-model
title: Refresh codex-skill model routing and repository-check policy
status: closed
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - codex
  - model-routing
  - safety
assignee: null
created: 2026-08-19T23:15:06.285Z
updated: '2026-08-27T06:11:33Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-19-refresh-codex-skill-routing.md
---

## Description

The verified corpus audit found that the repo-only codex-skill offers only GPT-5.3 Codex and GPT-5.4 even though current repository policy routes new work through GPT-5.6 task classes. Its blanket instruction to use the Git-repository-check bypass is permission-gated but broader than necessary, so the model-selection and safety contracts should be updated together.

## Acceptance Criteria

- `codex-skill` resolves model and effort choices through the current Codex
  provider-selection guidance and live eligible catalog rather than offering a
  fixed two-model list that is already relegated to compatibility use.
- Normal invocations inside a Git repository preserve the repository check;
  `--skip-git-repo-check` is used only when the target is outside a repository
  or another documented need applies, and the skill obtains the required user
  authorization before using it.
- Initial-run, cross-directory, and resume examples agree with the revised
  model-selection and repository-check policy and do not silently reintroduce
  the blanket bypass.
- Focused contract coverage guards the routing and authorization language from
  drifting, and the canonical skill plus public-package versions are bumped as
  required by repository release policy.
