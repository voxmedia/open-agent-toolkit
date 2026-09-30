---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-30
oat_generated: false
oat_template: false
---

# Design: Markdown Docs Bootstrap

## Design Review Status

Lightweight design in collaborative mode. The saved selective preference maps to collaborative for quick mode. Overview is drafted and awaiting confirmation; Architecture, Component Design, and Testing Strategy follow after confirmation. No specification artifact is required for this quick project.

## Overview

Add Markdown to the existing bootstrap workflow, with `docs/` as the default root. A fresh setup creates an authored index with useful context and a Contents map, contributing guidance, and the relevant agent instructions. It records `documentation.tooling: "markdown"` and uses the authored root index as the configured entrypoint. Markdown verification checks files and structure without requiring an app package or site build.

For existing docs, bootstrap establishes config and guidance while preserving content. Missing or inconsistent documentation structure goes through the existing analyze/apply workflow for approved repairs. Authored indexes remain the source of context and navigation; an optional generated manifest uses an explicit output outside the source tree. Package drift and approval-policy changes remain follow-up work.

## References

- [Discovery](discovery.md)
- [Source backlog item](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md)
