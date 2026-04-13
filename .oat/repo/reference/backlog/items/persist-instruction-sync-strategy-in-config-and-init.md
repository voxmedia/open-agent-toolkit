---
id: bl-28ce
title: 'Persist instruction sync strategy in config and expose it in init'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels:
  - provider-sync
  - instructions
  - config
  - onboarding
assignee: null
created: '2026-04-13T22:45:46Z'
updated: '2026-04-13T22:45:46Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

`oat instructions validate` and `oat instructions sync` currently accept `--strategy pointer|symlink|copy`, but they do not persist a default instruction strategy anywhere in config. The implementation falls back to a hardcoded default (`pointer`), so users who prefer `symlink` or `copy` have to repeat the flag every time.

We should add a persisted default for instruction sync and expose it during guided setup so the behavior is discoverable and matches user expectations. This should be implemented as an instruction-specific setting, not by reusing the existing provider-sync `sync.defaultStrategy` key. Provider sync supports `auto|symlink|copy`, while instruction sync needs `pointer|symlink|copy`, so conflating the two would blur two different behaviors and strategy domains.

Recommended direction:

- Add a dedicated config key such as `sync.instructions.defaultStrategy` or `instructions.defaultStrategy`.
- Define precedence as `CLI flag > persisted instruction config > hardcoded default`.
- Add guided setup support so `oat init` can prompt for the instruction sync default when setting up project behavior.
- Keep this separate from provider adapter strategy config.

## Acceptance Criteria

- A dedicated persisted config key exists for instruction sync strategy and supports `pointer|symlink|copy`.
- `oat instructions validate` and `oat instructions sync` resolve strategy using clear precedence: explicit `--strategy`, then config, then fallback default.
- `oat init` or guided setup exposes the instruction sync default so users can configure it interactively.
- Documentation explains the new config key, command precedence, and how it differs from provider-sync `defaultStrategy`.
- The implementation does not repurpose provider-sync `sync.defaultStrategy` for instruction sync semantics.
