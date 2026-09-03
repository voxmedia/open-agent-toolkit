---
id: BL-260903-close-manual-only-agents-md
title: Close manual-only AGENTS.md refresh loop
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - agents-md
  - guidance
  - fail-closed
  - residue
assignee: null
created: 2026-09-03T00:56:30.158Z
updated: 2026-09-03T00:56:30.158Z
associated_issues: []
external_plans: []
---

## Description

Residue from BL-260828, closed by the tool-pack-scope-provider-truthfulness project. Project-level AGENTS.md guidance ships and works, with a single owner and absolute content preservation, but the Phase 5 fail-closed redesign left an operator-visible cost the original criteria did not anticipate.

OAT never modifies an existing `AGENTS.md`. It creates the file when absent via exclusive creation, and for any existing file returns a deterministic zero-write manual patch plus a non-zero exit code. In a repository that already has an `AGENTS.md` — which is most established repositories, including this one — guidance is therefore never actually installed by OAT, and the `manual-required` result plus exit 1 recurs on every run until an operator pastes the patch by hand.

That was a deliberate operator decision after review reproduced a filesystem race in which replacing an existing file could destroy user content, and it is encoded in spec.md FR6. Closing the gap properly needs an identity-bound conditional replacement primitive that Node does not currently expose, which is the same missing `openat`/`renameat`/`linkat` class of primitive that limits BL-260724.

Smaller items from the same assessment: `oat init --project-guidance` is silently dropped without `--setup` on a non-fresh repository, with no guided setup offered. Criterion 1's explanation that project guidance is independent of pack scope and PJM adoption lives only in docs and in guidance reason strings; the non-interactive `not-requested` path gives the opt-in command but never states the independence. `tool-packs.md:538` implies every install command offers guidance when only the `workflows` leaf does. And `init/tools/workflows/index.ts:116-300` is a dead-in-production duplicate applier with a different realized-pack derivation, whose ten tests guard a legacy adapter only.

Low priority. Reopen only if the manual-patch loop becomes a recurring irritation in practice.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
