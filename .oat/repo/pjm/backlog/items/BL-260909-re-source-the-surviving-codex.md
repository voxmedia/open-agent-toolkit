---
id: BL-260909-re-source-the-surviving-codex
title: Re-source the surviving Codex provider claims and repair the dead
  provider-reference URLs
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - docs
  - skills
  - wave-7-followup
assignee: null
created: 2026-09-09T09:25:12.329Z
updated: 2026-09-09T09:25:12.329Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p19 (2026-09-08-correct-skill-authoring-facts.md) corrected the description-specific Codex claims and left, by scope discipline, three provider claims without a source: skills-guide.md's Codex-specific bullet "name: <= 100 chars, single line" and create-agnostic-skill/SKILL.md's "(Codex allows 100, but 64 is the spec limit)" — the live page https://learn.chatgpt.com/docs/build-skills.md (refetched 2026-09-09) states no name limit and no single-line rule — plus the emitted template's undated Claude Code description-budget bullets (~16,000 characters; 60+ skills truncation). Separately, .agents/docs/provider-reference.md carries 12 dead developers.openai.com/codex/\* URLs the plan deferred. Re-source each claim against the live provider page (keep it, date it, or delete it), give each surviving claim a citation and verification date per DR-260906, and repoint or remove the dead URLs; bump the touched skills' metadata.version.

## Acceptance Criteria

- Every Codex claim in the two authoring skills and `skills-guide.md` either quotes the live page with a verification date or is gone.
- The Claude Code description-budget bullets in the emitted template carry a source and date or are removed.
- `provider-reference.md` has zero dead `developers.openai.com/codex/*` URLs (checked with a fetch loop, exit codes recorded).
