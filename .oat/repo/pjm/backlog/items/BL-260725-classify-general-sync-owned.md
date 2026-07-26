---
id: BL-260725-classify-general-sync-owned
title: Classify general sync-owned dirt in project-start preflight
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - oat-workflow
  - preflight
  - sync
  - deferred-design
assignee: null
created: 2026-07-25T21:32:04.951Z
updated: 2026-07-25T21:32:04.951Z
associated_issues: []
external_plans: []
---

## Description

Project-start preflights (oat-project-new, oat-project-quick-start, oat-project-import-plan) auto-commit a modified .oat/sync/manifest.json and prompt for every other dirty path. Extending that to general sync-ownership classification was designed in detail during the generated-artifact-gate-hygiene project and deliberately cut: every hard case in the design is one where prompting is the correct answer anyway. Revisit only if non-manifest sync dirt becomes a recurring annoyance in practice.

## Acceptance Criteria

- A project-start preflight auto-commits a dirty working tree when every path in it is provably owned by `oat sync`, and prompts otherwise.
- Provable ownership covers the cases the sync manifest under-reports: materialization-extension outputs, directory-copy descendants, and untracked files from a first sync.
- Any deletion, rename, or unmerged path prompts. None of these auto-commit.
- The three project-start skills share one decision core, with workflow-specific autonomy provenance kept outside it.
- The prompt-site hash inventory in `.agents/docs/autonomy-contract.md` is updated for any changed preflight prose.

## Design Notes

Detailed design and three plan reviews were produced under
`.oat/projects/shared/generated-artifact-gate-hygiene/` and removed once the
scope was cut; recover them from git history at commit `13155512` if this is
picked up. The traps that killed the original design, in the order they were
found:

- **The manifest under-reports ownership.** Matching dirty paths against
  `.oat/sync/manifest.json` misses provider materialization extensions, whose
  ownership is proven by markers in file content rather than by a manifest
  entry, and misses descendants of copied directories.
- **Deletions cannot be attributed.** `compute-plan.ts` detaches ownership when
  a provider path is already missing, so an OAT-initiated removal and a user's
  deletion are indistinguishable after the fact. Every mechanism explored for
  proving deletion ownership (committed baseline manifests, reading `HEAD`
  blobs for extension markers) was defeated by this. Prompting on all deletions
  is safe by construction and is why the classifier collapsed.
- **Porcelain output hides first syncs.** `git status --porcelain` reports a new
  directory (`?? .cursor/`) rather than its files; `--untracked-files=all` is
  required or a legitimate first sync prompts.
- **The three preflights are not byte-identical.** `oat-project-quick-start`
  carries an autonomy branch recording gate `QS-01` that must not leak into the
  other two, so any parity contract applies to a shared decision core, not to
  the whole block.

Before building anything here, confirm the case is real: the shipped
manifest-only rule already covers the only dirt observed in practice, and the
cheapest correct answer for anything else is the existing prompt.
