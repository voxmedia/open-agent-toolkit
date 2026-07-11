# Subagent Catalog & Selection Findings (Live Session Evidence)

> Findings gathered live in the Cursor IDE harness on 2026-07-11 during
> quick-start discovery for `oat-project-fixture`, plus the dispatch-selection
> contract converged with the user during the brainstorm.

## Three Catalogs, Three Granularities (Cursor)

1. **Native Task tool (IDE harness, this session):** a curated list of ~11
   slugs delivered in the agent's tool spec (e.g. `gpt-5.6-terra-medium`,
   `gpt-5.6-sol-high-fast`, `composer-2.5-fast`, `claude-sonnet-5-thinking-high`,
   `grok-4.5-fast-xhigh`). No luna variants; efforts baked into slugs; no
   free parameterization. Omitting the model **inherits the parent model** —
   inheritance is always available and unconstrained by the curated list.
2. **`cursor-agent --list-models` / `cursor-agent models` (CLI):** the full
   account catalog — sol/terra/luna each at none/low/medium/high/xhigh/max
   (+ fast variants), plus parameterized bracket overrides
   (`claude-opus-4-8[context=1m,effort=high,fast=false]`).
3. **Cursor UI settings:** per-subagent-role model dropdowns (e.g. the Explore
   subagent) with "Inherit from parent" and "Disable" as first-class options,
   and an "Edit" affordance suggesting the curated set may be
   user-configurable. **Unverified:** whether users can add arbitrary tiers
   (e.g. terra-high, luna) to the native subagent catalog via settings.

**There is no CLI command that lists the native-subagent curated catalog.**
`cursor-agent models` lists the account's full model catalog, which is a
different (much larger) set. The native catalog is knowable only from inside
the harness runtime (agent tool spec) or the UI. Consequence: OAT preflight
cannot shell out to enumerate what a Cursor root agent can natively pin; the
coordinator agent itself is the authority at dispatch time.

## Live Positive Control: Exact Task-Model Acceptance Works in the IDE Harness

This session dispatched three native Task subagents explicitly pinned to
`gpt-5.6-terra-medium`. All three launches were accepted and all three
completed successfully. Per the three-layer evidence model (policy /
launcher-owned invocation / runtime identity), this is configured-invocation
evidence that exact Task-model selection works in the Cursor IDE harness.
The earlier headless `cursor-agent` probe failures (10 s timeouts, prose
responses, no Task events even for controls) likely reflect the headless
protocol, not the model catalog. Runtime identity remains `not-reported`, as
expected.

## Model Family Ordering

GPT-5.6 family capability/cost ordering: **sol > terra > luna.** A terra
candidate is above a luna target, not below it. (Corrected during session —
early analysis had this backwards.)

## Converged Dispatch-Selection Contract (for discovery)

Desired cost-tiered topology example:

```text
root:            sol xhigh
phase subagent:  terra high   (fairly complex coordination)
task workers:    luna high    (simple tasks) / terra high (complex task)
```

Contract converged with the user:

1. **Ceiling = budget maximum, not a selection.** Project/phase policy names a
   maximum permitted tier. Below it, the coordinating agent exercises
   judgment per task.
2. **The coordinator selects with full information.** It knows the ceiling,
   the configured candidate ladder, and its own harness-native catalog (from
   its tool spec). Selection = intersect native catalog with at-or-below
   ceiling, then judge fit per task complexity. By construction there is no
   pick-then-miss.
3. **CLI dispatch is a deliberate pre-start selection, never a fallback.** If
   the intersection contains nothing satisfactory (e.g. Cursor native lacks a
   luna-tier candidate and spending terra on a trivial task offends budget),
   the coordinator may choose the provider CLI for exact fidelity — decided
   before any launch, recorded with reason (e.g.
   `native-catalog-unsatisfying`) and candidates considered, in the
   launcher-owned dispatch record. Compatible with the max-depth rule:
   external children only on explicit pre-start grounds, never after an
   accepted/ambiguous native attempt.
4. **Downward substitution never happens** — there is no substitution step;
   the choice is made once, from real options.
5. **Acceptable degradations (user-stated):** phase coordinator may inherit
   from root when its exact preferred tier is not natively pinnable. The
   forbidden outcome is a task worker silently inheriting an expensive root
   model (e.g. sol) when a cheaper tier would do.
6. **Cross-harness consistency matters:** uniform selection semantics with
   harness-specific resolution; avoid divergent mechanisms per harness where
   possible.
7. **Codex/Cursor asymmetry stays explicit:** Codex's "catalog" is
   OAT-materialized roles (OAT controls the intersection); Cursor's is
   harness-curated (coordinator reads it at dispatch time); Claude uses named
   subagents/model arguments.
