---
id: BL-260903-populate-provider-reachability
title: Populate provider reachability evidence across pack and lifecycle surfaces
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - tool-packs
  - providers
  - evidence
  - seam-gap
  - fr1
  - fr3
assignee: null
created: 2026-09-03T15:19:40.186Z
updated: 2026-09-04T03:55:32Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-03-populate-provider-reachability-evidence.md
---

## Description

Found by the cross-model final gate review of the tool-pack-scope-provider-truthfulness project (Cursor `gpt-5.6-sol-xhigh`), after twelve same-model review rounds had marked FR1 and FR3 implemented. Deferred by operator decision so the project could merge; the gap is real and recorded here rather than hidden.

Provider reachability is defined as a type but never populated. `ProviderReachabilityEvidence` exists, and `design.md:123-130` and `:453-482` require each record to carry source-qualified activation, capability, projection mode, materialization, visibility and recovery. In production the type instead requires only provider, scope, content kind and assets, and permits arbitrary extra fields through an index signature.

`projectPackEvidence()` makes providers optional and defaults them to `[]`, and every production caller omits provider evidence. The install, update and remove auto-sync paths explicitly construct successful lifecycle output with `status: "complete"` and `providers: []` (`commands/init/tools/index.ts:1584`, `:1638`, `:1860`; `commands/tools/update/index.ts:370-391`; `commands/tools/remove/index.ts:336-364`). A successful user-scope installation therefore reports complete with no provider evidence at all.

Direct `oat sync` does produce per-operation and extension materialization evidence at `commands/sync/apply.ts:347-492`, but auto-sync discards it because `AutoSyncDependencies.runSync` returns `Promise<void>`. Status, doctor, list and info all consume `projectRenderablePackEvidence()`, which never injects provider records, so the fallback materialization diagnostic names only "the active provider set" rather than the responsible provider.

This is a Phase 2 to Phase 3 seam gap: Phase 2 built the aggregate evidence model, Phase 3 built sync operation evidence, and nothing joins them. Per-phase review could not see it because each round only reviewed its own diff.

Consequences for the shipped requirements: FR1's rule that absence of evidence is never rendered as success is not met; FR3's requirement that lifecycle surfaces agree on provider reachability is not met; FR4 and NFR3 are partial. The project's spec and implementation artifacts have been corrected to say so.

What would close it: replace the permissive provider interface with the closed structure the design specifies; add a mapper joining registry activation and capability, core sync operation results, extension materialization results, manifest/static materialization state, and refresh/restart policy; make auto-sync return normalized provider evidence, preferably by invoking a shared sync service rather than parsing human subprocess output; feed the resulting records through install, update, remove, list, info, status and doctor; emit one diagnostic per affected provider or an explicit provider collection; and add human and JSON tests for supported/current, unsupported, failed, unknown and refresh-required states.

Medium priority rather than low: unlike the other residue items from this project, this one leaves two shipped requirements unmet rather than merely narrowing scope.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
