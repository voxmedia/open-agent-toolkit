# Evidence and Refresh Policy

```yaml
guidance_version: 2026-07-21
last_verified: 2026-07-21
review_after: 2026-09-04
stale_after: 2026-10-19
```

This file governs dated provider examples. It does not override a live catalog,
current user or repository instructions, a supplied task-class floor, or an
authorization boundary.

## Guidance States

- `fresh`: verified within 45 days and no material provider or harness change is known.
- `review-required`: older than 45 days, a newer family is observed, or a material control, price, tool, context, alias, or harness change is detected.
- `stale`: older than 90 days, named models are unavailable or deprecated, or the launching surface can no longer express the recorded controls.

Provider mappings in this package become review-required on 2026-09-04 and
stale on 2026-10-19 unless re-verified earlier.

## Immediate Review Triggers

Review before dispatch when:

- the live catalog exposes a newer model family or unknown effort;
- a recommended selector is missing;
- alias resolution, native nesting, context handling, or tool support changed;
- provider safeguards materially change refusal behavior;
- relevant independent benchmark evidence contradicts the incumbent;
- a `-fast`, priority, or pro-like control has unclear semantics;
- the dispatch is consequential and the evidence is not current.

## Candidate Qualification

A newer candidate replaces an incumbent only when evidence shows that it:

1. satisfies the task-class capability contract;
2. is exactly selectable in the launching harness;
3. has understood provider-native effort and service-tier semantics;
4. does not materially regress on a relevant harness or task benchmark;
5. fits the route's cost and latency posture;
6. has suitable tool-use and long-context behavior;
7. has operationally acceptable safeguard and refusal behavior;
8. is not contradicted by available internal evaluations.

Use primary provider documentation for controls and availability. Prefer
harness-specific evidence for harness routes, contamination-conscious coding
benchmarks for software work, and realistic trajectory benchmarks for tools.
When evidence is incomplete, retain the incumbent or route one class up.

## Evidence Priorities

1. Current user and repository instructions.
2. Live launching-surface catalog and schema.
3. Official provider documentation for model and control semantics.
4. Relevant harness-specific benchmark.
5. Independent cross-model benchmark with disclosed effort and harness.
6. Reputable practitioner reports, used only as supporting evidence.

Do not use aggregate leaderboard rank as a universal model order.

## Current Evidence Summary

- OpenAI positions GPT-5.6 Sol as frontier, Terra as balanced, and Luna as
  high-volume. Official guidance starts at medium generally, but independent
  coding-agent data shows meaningful Luna/Terra quality cliffs below high for
  repository work. The dated mechanical Codex floor is therefore Luna high.
- Anthropic positions Sonnet 5 as the speed/intelligence workhorse, Opus 4.8 as
  a complex coding and enterprise model, and Fable 5 as the most capable widely
  released model. Their effort defaults and recommendations differ by model.
- CursorBench supports Composer 2.5 as an economical bounded coding worker.
  Cursor explicitly documents Composer fast as the same intelligence at a
  higher latency tier price.
- OpenAI's long-context evidence disqualifies Luna for some very large-context
  work even when Luna's nominal context window accepts the input.
- Anthropic documents benign false positives from Fable's stronger cyber
  classifier. This is operational evidence to consider when routing
  cyber-sensitive work, not a capability weakness or a reason to invert the
  general Opus-first policy.
- Cursor disclosed that Cursor repository data entered Grok 4.5's training
  mixture. Its CursorBench ranking is evidence of competitiveness, not proof
  of superiority over nearby frontier models. Practical use supports Grok 4.5
  medium/high as primary alternatives for intelligent recon, general
  implementation, and hard-reasoning economy routes, with cross-family review
  retained for consequential conclusions.

## Reverification Record

When updating a provider reference, record:

```yaml
verified_at: RFC3339 timestamp
provider: claude | codex | cursor
harness_context: exact launching surface
catalog_source: tool schema | CLI list | API catalog | UI snapshot
models_considered: exact selectors
controls_verified: effort, service tier, reasoning mode, context, tools
sources: official docs and relevant benchmarks
incumbent_changes: additions, replacements, removals, or none
reason: scheduled review or trigger
```
