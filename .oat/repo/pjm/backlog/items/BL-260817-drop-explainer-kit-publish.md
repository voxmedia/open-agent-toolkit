---
id: BL-260817-drop-explainer-kit-publish
title: Drop explainer-kit publish-request/v1 in a future minor
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - explainer-kit
  - contracts
  - breaking
assignee: null
created: 2026-08-17T00:28:53.181Z
updated: 2026-08-17T00:28:53.181Z
associated_issues: []
external_plans: []
---

## Description

Remove `explainer-kit.publish-request/v1` acceptance now that the publication-root validation gate is version-agnostic (p07-t01 of explainer-improvements-v2).

Context: both contract documents already scope v1 to replay only (`.agents/skills/explainer-kit/references/extension-contract.md:29`, `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md:109`), but the code still accepts brand-new v1 publish requests, so the docs describe a stricter system than the one that exists. No in-repo producer emits v1 — the adapter emits v2 exclusively (`.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs:182`) — and no persisted v1 run artifacts exist in the repo.

Deferred out of explainer-improvements-v2 deliberately: that PR is a patch bump (0.2.28 -> 0.2.29), and removing a documented public contract does not belong in a patch release. Once p07-t01 lands, v1 is validated and no longer a security liability, so this is hygiene rather than urgency.

Scope when done:

- Remove the v1 branch from `schemas/run-request.schema.json` `durability.publish` oneOf.
- Delete `schemas/publish-request.v1.schema.json` and its `contracts.mjs` registry entry.
- Remove the v1 publicAccess-defaulting branch at `scripts/lib/s3-static.mjs:185`.
- Update the two contract documents to state that v1 is no longer accepted.
- Update `tools/release/run-explainer-rc.mjs` and `validate-explainer-acceptance.mjs` version lists.
- Sweep the bundled mirror under `packages/cli/assets/skills/`.
- Bump all five lockstep public packages together; use a minor, not a patch.

Keep `publish-receipt/v1` readable — `publish-summary/v1` replay depends on it.

Coordinate with the externally-owned private wrapper before removing: confirm it emits v2.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
