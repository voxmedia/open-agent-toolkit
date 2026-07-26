---
id: DR-260726-explainer-render-qa-is-opt
title: Explainer render QA is opt-in and never self-launching
date: 2026-07-26
status: accepted
legacy_id: null
---

# Explainer render QA is opt-in and never self-launching

## Context

Render QA began as a layout-checking stage and became the subsystem's center of gravity. It owned a browser dependency and a disproportionate share of the test surface in order to verify layout for artifacts published to a private bucket. An auto-resolving runtime made it worse in two concrete ways: the published CLI did not ship the browser driver the runtime dynamically imported, so installed skills reported a missing driver while monorepo tests passed, and the adapter accepted an arbitrary probe-module path that was imported before QA ran.

## Decision

The core never launches a browser. Render QA runs only when a caller injects a probe; otherwise the stage records a single render-qa-skipped-no-probe warning and the run continues. The agent generating the explainer reviews the output in a browser when one is available, which is the intended review mechanism. The auto-resolving runtime, the --browser-probe-module CLI flag, the adapter probe-module passthrough, and the EXPLAINER_KIT_HEADLESS_PROBE opt-out are removed. The pre-existing repo-wide visual release gate is unaffected and keeps its own browser runtime in the shared browser-runtime module.

## Consequences

Installed CLI runs never execute layout probes, by design rather than by defect. The unshipped-driver and arbitrary-module-import concerns disappear along with the runtime that needed them. Layout regressions are caught by the release visual gate and by agent review rather than by per-run automation, so a layout defect in a generated artifact can reach a reader if no one looks at it. Six tests covering auto-resolution were removed with the behavior they described; two pre-existing skip-path tests were restored rather than deleted.
