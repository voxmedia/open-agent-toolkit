---
id: bl-dc12
title: 'Add research, analysis, verification, and synthesis skill suite'
status: closed
priority: high
scope: initiative
scope_estimate: XL
labels: ['skills', 'research']
assignee: null
created: '2026-03-12T00:00:00Z'
updated: '2026-03-15T00:00:00Z'
associated_issues: []
---

## Description

Delivered the installable OAT research suite: `deep-research`, `analyze`, `compare`, `skeptic`, and `synthesize`, along with the `skeptical-evaluator` sub-agent and supporting schema/artifact contracts.

Key outcomes:

- Added the five research-oriented skills and supporting sub-agent workflow.
- Introduced shared schema templates for technical, comparative, conceptual, architectural, and analysis outputs.
- Added multi-agent coordination conventions and a research tool pack for `oat tools install research`.

Links:

- Skills: `.agents/skills/deep-research/`, `.agents/skills/analyze/`, `.agents/skills/compare/`, `.agents/skills/skeptic/`, `.agents/skills/synthesize/`
- Sub-agent: `.agents/agents/skeptical-evaluator.md`
- Project: `.oat/projects/archived/deep-research/`
- PR: `#75`

## Acceptance Criteria

- Added the `deep-research`, `analyze`, `compare`, `skeptic`, and `synthesize` skills.
- Added the `skeptical-evaluator` sub-agent for adversarial evidence gathering.
- Added shared schema templates under `.agents/skills/deep-research/references/`.
- Added research-pack installation support.
