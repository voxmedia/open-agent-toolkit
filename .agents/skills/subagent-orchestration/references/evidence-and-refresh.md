# Evidence and Refresh Policy

```yaml
guidance_version: 2026-07-25
last_verified: 2026-07-25
review_after: 2026-09-08
stale_after: 2026-10-23
```

This file governs dated provider examples. It does not override a live catalog,
current user or repository instructions, a supplied task-class floor, or an
authorization boundary.

## Guidance States

- `fresh`: verified within 45 days and no material provider or harness change is known.
- `review-required`: older than 45 days, a newer family is observed, or a material control, price, tool, context, alias, or harness change is detected.
- `stale`: older than 90 days, named models are unavailable or deprecated, or the launching surface can no longer express the recorded controls.

Provider mappings in this package become review-required on 2026-09-08 and
stale on 2026-10-23 unless re-verified earlier, or on the earlier date a
reference states in its own header. `provider-cursor.md` carries an earlier
2026-09-04 review date because its catalog was not re-verified in the
2026-07-25 refresh.

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

## Comparable-Rung Analysis

For cross-provider analysis, show same-labelled effort rungs first when they
exist, then show empirically interesting practical substitutions as a separate
view. Label the model, effort, service tier, harness, benchmark version, and
retrieval date for every row.

Same-labelled rungs are comparable observations, not equivalent controls.
CursorBench, provider-native coding-agent harnesses, and common-agent harnesses
produce different Opus-to-Sol relationships. Preserve that disagreement; never
publish a provider-independent effort conversion.

## Current Evidence Summary

- OpenAI positions GPT-5.6 Sol as frontier, Terra as balanced, and Luna as
  high-volume. Official guidance starts at medium generally, but independent
  coding-agent data shows meaningful Luna/Terra quality cliffs below high for
  repository work. The dated mechanical Codex floor is therefore Luna high.
- Post-release Opus 5 evidence supports medium for normal substantive Claude
  work and high for hard reasoning. Use xhigh for a reasoning-depth bottleneck
  or evaluated long-horizon gain; max is selective and requires an effort
  sweep. Consequence adds independent review rather than automatically raising
  effort.
- Sonnet 5 is a conditional route when measured latency, throughput, access,
  rate limits, or end-to-end workload economics win. Fable 5 is an
  eligibility-gated specialist; its missing-domain-concept or long-horizon
  reviewer instantiation remains provisional, and zero-data-retention
  requirements exclude the current route.
- CursorBench supports Composer 2.5 as an economical bounded coding worker.
  Cursor explicitly documents Composer fast as the same intelligence at a
  higher latency tier price.
- Mechanical reconnaissance remains harness-specific: Luna high in Codex,
  Haiku 4.5 in Claude, and Composer 2.5 in Cursor. Direct API mini or nano
  routes are limited to strict extraction, classification, or similarly
  mechanically verified work.
- OpenAI's long-context evidence disqualifies Luna for some very large-context
  work even when Luna's nominal context window accepts the input. Sol's current
  direct-API requests above 272K input tokens carry a 2× input and 1.5× output
  price step.
- Sol's measured advantage is trajectory efficiency, not universal list-price
  leadership. Opus output token pricing can be lower while Sol costs less per
  completed task through fewer tokens, steps, turns, or recoveries.
- Artificial Analysis Coding Agent Index (xhigh 67, max 66) and Frontier-Bench
  (xhigh 44.4%, max 43.3%) are the two non-monotonic top-end Opus effort
  results in the accepted packet. Frontier-Bench is vendor-operated and the
  packet carries one self-reported row with no independently verified row, so
  weight it below the Coding Agent Index rather than treating the two as equal
  evidence. CursorBench is monotonic from xhigh to max, 69.3% to 70.0%; its
  contribution is economic, with marginal cost per score point roughly 3.75x
  worse above high than below it.
- Cyber-sensitive and valid dual-use work should start on Opus 5 with
  documented fallback handling where safeguards block the workflow. Opus 4.8
  remains a compatibility fallback, not the universal primary.
- Cursor disclosed that Cursor repository data entered Grok 4.5's training
  mixture. Its CursorBench ranking is evidence of competitiveness, not proof
  of superiority over nearby frontier models. Practical use supports Grok 4.5
  medium/high as primary alternatives for intelligent recon, general
  implementation, and hard-reasoning economy routes, with cross-family review
  retained for consequential conclusions.

## Speed and Wall-Clock Contract

Speed evidence must distinguish:

- time to first token and, when measurable, first useful action;
- output rate;
- active agent runtime;
- total user-observed elapsed time;
- input, cached-input, and output tokens;
- steps, turns, and tool calls;
- retries, recoveries, refusals, and operator interventions;
- completion rate and variance;
- service tier, rate limits, and agent-slot occupancy;
- cost per attempted and completed task.

Do not relabel active agent runtime as total elapsed time. Tokens, steps, or
turns are trajectory measures and cannot substitute for measured latency.
Compare pricing separately from total trajectory cost.

Every load-bearing quantitative claim requires claim-level provenance:

- a direct result locator, retrieval date, and stable source identity;
- exact model selector, effort, reasoning mode, service tier, harness, and
  benchmark version;
- metric definition, aggregation basis, exclusions, and extraction method;
- absolute input values before any derived ratio or delta;
- the formula and units for each derived value;
- cache, fallback, refusal, retry, and completion treatment;
- unresolved source gaps stated explicitly rather than inferred away.

The Coding Agent Index time measure is average active agent wall time per task.
It excludes environment startup and verifier or judge time, and must not be
relabeled as total user-observed elapsed time. AA-Briefcase time remains
definition-unverified and must not be compared directly with it. Mutable
leaderboards require row-level locators; a homepage or aggregate rank is not a
sufficient source.

This file records reconciled conclusions and the values that drive a rule. It
is not the ledger. Full benchmark rows, source URLs, extraction methods, and
arithmetic live in the dated evidence packet that produced them, which is the
locator for every figure quoted here. Cite that packet rather than restating a
leaderboard.

## Research Independence and Acceptance

A policy refresh requires:

1. a neutral research brief and isolated independent author lanes;
2. a source ledger with claim-level provenance for each lane;
3. reciprocal or independent review that did not author the claim under review;
4. fact reconciliation before routing synthesis;
5. a cross-model synthesis that preserves contradictions and uncertainty;
6. explicit human acceptance of the update scope;
7. canonical-first application;
8. downstream parity verification by read-back.

The author and reviewer may use the same evidence, but reviewer output must be
independently produced. Agreement is not proof. Record disagreements and their
resolution; do not collapse them into an unsupported consensus.

## Live-Catalog and Downstream Gates

Before adding or changing a selector, verify the live launching surface,
resolved identity, effort or thinking control, service tier, and absence of
silent fallback. Direct-provider evidence can nominate a harness candidate but
cannot prove its alias. Cursor Opus 5 selectors remain deferred until a live
probe verifies those controls.

After canonical changes:

1. inventory exact mirrors, wrappers, generated views, and application-specific
   consumers before synchronization;
2. use each consumer's supported sync or bundle mechanism;
3. read back every consumer, including each machine where user-scope copies
   exist;
4. require byte-for-byte equality for mirrors and documented semantic parity
   for intentional wrappers;
5. search live prompts, rules, code, and configuration for copied historical
   selectors or effort defaults;
6. record intentional exceptions and fail the gate while unexplained
   divergence remains.

## Reverification Record

When updating a provider reference, record:

```yaml
verified_at: RFC3339 timestamp
provider: claude | codex | cursor
harness_context: exact launching surface
catalog_source: tool schema | CLI list | API catalog | UI snapshot
models_considered: exact selectors
controls_verified: effort, service tier, reasoning mode, context, tools
eligibility_verified: retention, access, pricing thresholds, safeguards
sources: direct locators for official docs and relevant benchmark rows
claim_provenance: selector, effort, harness, metric, locator, retrieval date
independent_author: identity and model family
independent_reviewer: identity and model family
incumbent_changes: additions, replacements, removals, or none
reason: scheduled review or trigger
downstream_consumers: mirrors, wrappers, generated views, applications
downstream_parity: hashes or documented semantic comparison
unresolved_items: gaps, provisional routes, and deferred probes
```
