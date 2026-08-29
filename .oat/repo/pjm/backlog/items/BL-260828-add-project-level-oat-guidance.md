---
id: BL-260828-add-project-level-oat-guidance
title: Add project-level OAT guidance prompt during init and workflow installation
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - cli
  - init
  - agents
  - docs
  - workflows
assignee: null
created: 2026-08-28T23:45:20.125Z
updated: 2026-08-28T23:45:20.125Z
associated_issues: []
external_plans: []
---

## Description

When OAT capabilities are installed at user scope, repositories can receive no project-level AGENTS.md guidance even though the user may still want repository-local instructions about OAT and its workflows. Add an explicit notice and confirmation path during oat init, and make standalone aggregate workflow-pack installation offer the same project guidance update, while preserving user-owned AGENTS.md content and keeping capability installation separate from project adoption.

## Acceptance Criteria

- `oat init` and explicit guided setup clearly notify users when selected OAT
  packs are installed at user scope and explain that project-level
  `AGENTS.md` guidance is an independent, repository-local choice.
- Interactive `oat init` offers an explicit yes/no question to add or refresh
  the managed OAT guidance section in the repository-root `AGENTS.md`,
  including creating the file when it does not exist; declining leaves the
  existing file and repository content unchanged.
- Standalone `oat tools install workflows` offers the same project-guidance
  choice after installation, regardless of whether the workflow capability
  itself was installed at user or project scope; the choice does not change
  pack placement or imply PJM adoption.
- The managed section is idempotent, preserves user-authored `AGENTS.md`
  content, and has one clearly defined owner so init, guided setup, and
  standalone workflow installation cannot produce duplicate or conflicting
  OAT guidance.
- Non-interactive and declined flows provide an actionable notice without
  silently creating or modifying project `AGENTS.md`; any opt-in automation
  path is explicit and documented.
- Focused tests cover missing and existing `AGENTS.md`, user-scope and
  project-scope installs, repeated runs, declined prompts, standalone
  workflow installation, and preservation of unrelated user content.
- CLI and bootstrap/tool-pack documentation explain capability scope versus
  project guidance, the prompt behavior, and the explicit adoption boundary.
