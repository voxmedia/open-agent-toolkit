---
id: BL-260903-close-manual-only-agents-md
title: Close manual-only AGENTS.md refresh loop
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - agents-md
  - guidance
  - fail-closed
  - residue
assignee: null
created: 2026-09-03T00:56:30.158Z
updated: 2026-09-08T00:32:59.000Z
associated_issues: []
external_plans: []
---

## Description

Residue from BL-260828, closed by the tool-pack-scope-provider-truthfulness project. Project-level AGENTS.md guidance ships and works, with a single owner and absolute content preservation, but the Phase 5 fail-closed redesign left an operator-visible cost the original criteria did not anticipate.

OAT never modifies an existing `AGENTS.md`. It creates the file when absent via exclusive creation, and for any existing file returns a deterministic zero-write manual patch plus a non-zero exit code. In a repository that already has an `AGENTS.md` — which is most established repositories, including this one — guidance is therefore never actually installed by OAT, and the `manual-required` result plus exit 1 recurs on every run until an operator pastes the patch by hand.

That was a deliberate operator decision after review reproduced a filesystem race in which replacing an existing file could destroy user content, and it is encoded in spec.md FR6. Closing the gap properly needs an identity-bound conditional replacement primitive that Node does not currently expose, which is the same missing `openat`/`renameat`/`linkat` class of primitive that limits BL-260724.

Smaller items from the same assessment: `oat init --project-guidance` is silently dropped without `--setup` on a non-fresh repository, with no guided setup offered. Criterion 1's explanation that project guidance is independent of pack scope and PJM adoption lives only in docs and in guidance reason strings; the non-interactive `not-requested` path gives the opt-in command but never states the independence. `tool-packs.md:538` implies every install command offers guidance when only the `workflows` leaf does. And `init/tools/workflows/index.ts:116-300` is a dead-in-production duplicate applier with a different realized-pack derivation, whose ten tests guard a legacy adapter only.

Raised to medium on 2026-09-08: on a brand-new repository `oat init` creates `AGENTS.md` and `oat pjm init`, run seconds later, already finds an existing file and falls back to the manual patch for blocks that are simply absent — the operator hit this immediately. Appending an absent managed block is not the replacement case the fail-closed decision covers: an append-only write (`O_APPEND`, with the trailing-newline check) never touches existing bytes, so there is nothing for a concurrent writer to lose. Proposed contract: block absent in an existing file → append it and report `appended` (exit 0); block present and identical → no-op; block present but different → today's zero-write manual patch and non-zero exit; file absent → exclusive create as today. Separately, `oat pjm init` prints the guidance result once per writer (project-management and decisions), so the identical combined patch appears twice — print it once.

## Acceptance Criteria

- [ ] `oat pjm init` (and every other `AGENTS.md` guidance writer) appends an absent managed block to an existing `AGENTS.md` with an append-only write and reports `appended` with exit 0; a present-but-different block still yields the manual patch and non-zero exit; a present-and-identical block is a no-op; an absent file is still created exclusively
- [ ] A negative control proves the append path cannot rewrite existing bytes (the pre-fix manual-patch state, the post-fix append, and a concurrent-edit fixture whose user content survives byte-for-byte)
- [ ] The brand-new-repo sequence `oat init` → `oat pjm init` ends with both managed blocks in `AGENTS.md` and no manual action
- [ ] The guidance result is printed once per command, not once per writer
- [ ] Docs and the `oat pjm init` next-step message describe the append behavior
