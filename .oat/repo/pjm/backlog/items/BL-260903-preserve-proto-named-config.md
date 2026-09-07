---
id: BL-260903-preserve-proto-named-config
title: Preserve __proto__-named config keys through jsonc parsing
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - config
  - forward-compatibility
  - parser
assignee: null
created: 2026-09-03T15:55:01.416Z
updated: 2026-09-04T03:55:32Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-03-preserve-proto-named-config-keys.md
---

## Description

Found during the cross-model final gate review of the tool-pack-scope-provider-truthfulness project. Pre-existing on `origin/main`, not introduced by that branch, and deliberately not fixed there because it changes shared config-parsing behavior for every OAT config read.

A JSON key literally named `__proto__` under any config subtree is silently dropped at parse time. `parseJsonConfig` uses `jsonc-parser`, which builds objects by assignment, so the legacy prototype setter swallows the key before any normalization runs:

```
jsonc-parser projects keys : ["root","constructor"]
JSON.parse   projects keys : ["root","__proto__","constructor"]
```

The write path was corrected during that project — `normalizeOatConfig` now builds preserved siblings with `Object.fromEntries`, so an in-memory config carrying an own `__proto__` survives `writeOatConfig`. The disk round-trip still loses it, one layer earlier.

Practical impact is very low: `__proto__` is a pathological config key, `constructor` is unaffected, and known keys cannot be shadowed. It is recorded because FR10-style forward-compatibility guarantees promise unknown sibling preservation, and this is the one shape where that promise does not hold end to end.

Closing it means deciding whether `parseJsonConfig` should use a null-prototype construction (or `JSON.parse` with a reviver) for all OAT config reads, then adding a disk round-trip regression. That decision is repo-wide, which is why it is filed rather than patched inline.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
