---
oat_generated: false
oat_review_scope: spec
oat_review_type: artifact
oat_project: .oat/projects/shared/provider-interop-cli
oat_last_updated: 2026-02-13
---

# Spec Review: provider-interop-cli

## Status

Approved for handoff to design.

## Resolution Summary

1. User-level subagent scope drift resolved: user-level scope is now skills-only in v1.
2. Cursor user-level agent path issue resolved: removed from v1 adapter requirements and deferred.
3. Provider CLI dependency ambiguity resolved: CLIs clarified as optional for richer diagnostics.
4. Status model granularity resolved: `drifted` now includes sub-reasons (`modified`, `broken`, `replaced`).
5. Symlink scope clarified: v1 compatibility now requires directory symlinks only.

## Remaining Notes (Non-blocking)

1. Consider tightening wording in the open questions section so it doesn’t imply already-decided project-level Cursor agent behavior is still undecided.

## Recommendation

Proceed to `/oat:design`.
