---
id: BL-261002-enforce-remote-planning
title: Enforce remote planning approval caps, storage scope, and binding locations
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - pjm
  - safety
  - config
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:00.699Z
updated: 2026-10-02T18:41:00.699Z
associated_issues: []
external_plans: []
---

## Description

Remote planning (`oat pjm remote`) does not enforce several approval and
storage rules the design and docs describe:

- **Replace-mode updates are not capped.** The `user-approved` hard floor for
  complete description replacement is applied only when a binding is created
  (`remote/service.ts:2719-2724`, `prepareCreate`). The update path
  (`prepareMutation`, `service.ts:3088-3093`) omits the flag and uses the
  configured `update-fields` authority, then writes
  `projection.description = local.description` (`:5678-5679`). With
  `update-fields: user-authorized` or `autonomous`, a full-body replacement is
  sent with no preview approval.
- **Shared storage is not rejected for local projects.** The only production
  store is fixed to `{kind:'backlog', scope:'shared'}`
  (`service.ts:6508-6531`; `pjm/doctor.ts:601-606`), so the local-project
  rejection in `storage-locator.ts:48-62` is never reached.
- **Bindings are always written under `.oat/repo/pjm/remote/bindings/`**,
  including a local-scope project's (`store.ts:166,187,205,217`;
  `service.ts:2412-2475` accepts local projects as publish targets), and OAT
  does not gitignore that path (`init/gitignore.ts:17-25`), so local-project
  binding metadata is committed.
- **Storage mode can be changed by hand edit.** `oat config set
pjm.remote.storage.state shared` is refused (`config/index.ts:2115-2127`), but
  a hand edit of `.oat/config.json` is read as-is (`service.ts:6511-6512`;
  reproduced: `config get` then printed `shared`).

Why it matters: these are assurance boundaries. A remote issue body can be
overwritten without the approval the docs promise, and content from a project
the user chose to keep local can be committed and shared.

Confirmed by reading source; the hand-edit case was reproduced; no live
provider operation was run. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/E-pjm-remote-backlog.verify.md`.

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry C5.

## Acceptance Criteria

- Every complete description replacement (create and update) requires a
  fresh `user-approved` preview approval regardless of configured authority;
  a negative control shows the pre-fix update path is now refused and a
  valid approved update still succeeds.
- Bindings and remote state for local-scope projects are written to a
  gitignored local store (or remote operations are refused for local projects),
  and shared storage is refused for local projects in production code, with
  tests through the production store constructor.
- A hand-edited `pjm.remote.storage.state: shared` without the approved
  storage transition is detected and refused (or reported by
  `oat pjm doctor`).
- The warnings on the docs branch `docs-overhaul-readme-visual`
  (`workflows/backlog-and-planning/remote-project-management.md:184-189` and
  `:203-205`, and the replace-mode cap note) are removed once fixed.
