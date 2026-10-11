---
id: BL-261011-add-brief-to-the-legacy
title: Add brief to the legacy generate-oat-state.sh mode table
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - brief-goal-workflow-modes
  - follow-up
  - scripts
assignee: null
created: 2026-10-11T06:34:53.162Z
updated: 2026-10-11T06:34:53.162Z
associated_issues: []
external_plans: []
---

## Description

The bundled .oat/scripts/generate-oat-state.sh still routes only spec-driven, quick, and import modes (its mode table at ~:277-282 and its entry list at ~:396-397 omit lite, brief and goal; goal added at p12-t04). Caller check run on 2026-10-11 for p08-t05: grep -rn generate-oat-state over _.ts, _.mjs, _.md, _.sh outside node_modules finds 25 hits, all packaging and tests (pack-manifest.ts, bundle-inputs.mjs, public-package-contract.ts and their tests, skill-script-references.test.ts, update/remove/install tool tests) plus the script itself and archived plan references; no skill and no CLI runtime path invokes it, because oat state refresh generates the dashboard in TypeScript (commands/state/generate.ts). Either add lite, brief and goal rows mirroring generate.ts or retire the script with its packaging and test references.

## Acceptance Criteria

- The script routes lite, brief and goal the way commands/state/generate.ts does, or the script and its packaging and test references are removed
- The pack-manifest and public-package contract tests stay green
