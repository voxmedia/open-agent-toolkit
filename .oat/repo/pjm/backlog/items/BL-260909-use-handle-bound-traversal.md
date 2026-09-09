---
id: BL-260909-use-handle-bound-traversal
title: Use handle-bound traversal in the managed-copy and manifest filesystem readers
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - sync
  - drift
  - security
  - wave-7-followup
assignee: null
created: 2026-09-09T05:35:29.546Z
updated: 2026-09-09T05:35:29.546Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p15 (`2026-09-08-converge-copy-strategy-skill-projections.md`) hardened `packages/cli/src/engine/managed-copy-hash.ts` so a symlinked provider root or a symlinked `.oat-generated` sentinel is rejected, and its module header records the remaining limitation honestly: every check is path-based (`lstat` then a pathname `readFile` / `readdir`), so none survives an adversary swapping an entry between the check and the read. The same pre-existing TOCTOU class exists in `packages/cli/src/manifest/hash.ts` (`computeDirectoryHash`), `packages/cli/src/drift/detector.ts` (its own `lstat` + content hash), and `packages/cli/src/engine/compute-plan.ts` (the retirement classifier's `lstat` → hash → `remove` path, which is destructive). Close it with handle-bound traversal (open the root with `O_DIRECTORY | O_NOFOLLOW`, walk with `openat`-style file handles, hash from the handles) across those readers, with controls that race a swap between check and read. Not introduced or worsened by p15 (the hardened helper is a strict acceptance subset of the base under any interleaving); scheduled on its own merits because of the retirement path.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
