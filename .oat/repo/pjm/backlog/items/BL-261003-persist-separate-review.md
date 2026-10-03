---
id: BL-261003-persist-separate-review
title: Persist separate review artifacts and validate plain-file ledger references
status: open
priority: medium
scope: bug
scope_estimate: M
labels: []
assignee: null
created: 2026-10-03T19:13:37.806Z
updated: 2026-10-03T19:13:37.806Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/345
external_plans: []
---

## Description

Source: [GitHub #345](https://github.com/voxmedia/open-agent-toolkit/issues/345).

**Confirmed but narrower than reported.** Verbatim PRFINAL-05 guard rejects implementation.md#plan-review despite an existing implementation.md; plain path and placeholder pass. Canonical artifact-mode reviewer writes reviews/{filename}.md; plan auto-review updates a row but does not define an inline evidence Artifact representation. A canonical writer emitting anchors was not publicly verified.

Captured by the approved [2026-10-02 triage ledger](../../triage/2026-10-02-untriaged-issues.md). This item is ready for planning; implementation requires its normal plan approval.

## Acceptance Criteria

- Persist standalone durable review files under reviews/ and reference them with plain file paths, including planning reviews that return structured findings in memory.
- Align planning writers, templates, review ledger and PR-final guard.
- Validate file existence and allowed-path containment; do not silently strip anchors or invent evidence.
- Legacy inline references require explicit treatment during planning, with missing evidence remaining blocked.
- Persist each planning review attempt with its producer, output mode, reviewed target and attempt identity.
- Faithful parent persistence may support the originating planning-review consumer, but cannot upgrade that evidence to gate/code/final eligibility.

## Source evidence

Baseline: `be168345ef4f586731c13fe849da03eb87b526ec`.

.agents/skills/oat-project-pr-final/SKILL.md:423,583,665; .agents/skills/oat-project-plan-writing/SKILL.md:540,556; .agents/skills/oat-project-review-provide/SKILL.md:1138. Guard extracted verbatim and run only in disposable fixture.
