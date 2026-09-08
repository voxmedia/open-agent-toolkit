---
id: BL-260908-guard-normalized-config-maps
title: Guard normalized config maps against a preserved __proto__ key
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - config
  - security-hardening
  - wave-6-followup
assignee: null
created: 2026-09-08T01:26:10.802Z
updated: 2026-09-08T01:26:10.802Z
associated_issues: []
external_plans: []
---

## Description

Wave-6 p03 (2026-09-03-preserve-proto-named-config-keys.md) makes `config/json.ts` preserve a `__proto__` key as an own data property on plain objects. Two downstream normalizers still build a fresh `{}` and assign `next[key] = value`, so a preserved `__proto__` entry becomes that map's prototype: `normalizeRecordMap` at `packages/cli/src/config/oat-config.ts:556-568` (gate maps, used at `:862`) and the provider assignment at `packages/cli/src/config/dispatch-matrix.ts:343`. Reproduced through `readOatConfig` with `workflow.gates.skills.__proto__` set to a gate object: `'command' in skills` is true and `for...in` yields the injected keys; global `Object.prototype` is never touched, no production `for...in` exists, and the gate lookup at `config/resolve.ts:270` is `hasOwn`-guarded, so this is inert today except one unguarded user-named lookup at `packages/cli/src/commands/config/index.ts:1921` (`providers[provider]`). Remedy: the repository's existing `Object.fromEntries` pattern (`config/oat-config.ts:1828`, `commands/config/index.ts:2526`) in both normalizers, plus a `hasOwnProperty.call` guard at `:1921`. Both files were out of the p03 plan's scope (p03 review I1/M1).

## Acceptance Criteria

- [ ] `normalizeRecordMap` and the `dispatch-matrix.ts:343` provider assignment build their maps with `Object.fromEntries` (or define own keys), with a control proving a `__proto__` entry stays an own key and never becomes the map's prototype
- [ ] `commands/config/index.ts:1921` guards the user-named provider lookup with `Object.prototype.hasOwnProperty.call`, with a control
- [ ] A sweep leaves no remaining unguarded user-named lookup on a config-derived map (candidates the wave-6 final review named beyond the three sites above: `config/sync-config.ts:177-179`, `commands/providers/set/index.ts:85-93`, `commands/init/index.ts:992-993`, `commands/config/index.ts:2947-2955`; none shown reachable today because zod strips `__proto__` before `mergeProviderConfigs`)
- [ ] The wave-6 `json.test.ts` preservation tests still pass and `DR-260907-oat-config-reads-materialize` is updated to drop the residual scoping sentence
