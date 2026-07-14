# Cursor Cloud Mechanics

Load this reference only when Cursor-specific model-family identity, dispatch
catalog evidence, or degraded review provenance is needed. It supplies context
to the dispatch substrate; it does not define launch or recovery mechanics.

## Deterministic Producer Family

Never ask a model to identify its own family. Self-report is not dispatch
evidence.

Resolve identity in this order:

1. Call the `cursor-cloud` MCP `run-info` tool for the current run.
2. Read `originalModelName` from the returned run metadata.
3. Preserve the exact slug as producer identity evidence.
4. Normalize a lowercase copy only for family classification.
5. Map the normalized value with the ordered rules below.

| Match, in order                                                       | Family     |
| --------------------------------------------------------------------- | ---------- |
| contains `claude` or `anthropic`                                      | `claude`   |
| contains `gpt`, `openai`, `codex`, or an OpenAI reasoning-series slug | `openai`   |
| contains `grok` or `xai`                                              | `xai`      |
| contains `composer`                                                   | `composer` |
| contains `glm`                                                        | `glm`      |
| no rule matches                                                       | `unknown`  |

Match Grok/xAI before interpreting any generic `cursor-` prefix. For example,
`cursor-grok-4.5-high` is family `xai`, not family `cursor` or `unknown`.

If `run-info` is unavailable or omits `originalModelName`, record producer
family as `unknown` with the missing evidence. Do not substitute conversational
self-report, a guessed family, or a model name observed in a different run.
Blocking cross-family review must fail closed when the owning review contract
cannot preserve its independence requirement.

Use `environment-info` for environment/version provenance and repository setup,
not as a replacement for current-run model identity unless it explicitly
contains the same authoritative run field.

## Per-Surface Catalog Rule

Treat every Cursor dispatch surface as a distinct curated catalog with its own
names and availability:

1. Cursor Cloud native Task/subagent surface.
2. Cursor IDE native agent surface.
3. Cursor CLI subagent model enum.
4. Cursor CLI full model list.

These catalogs cross-cut; they do not form nested supersets. A model available
on one surface is not evidence that another surface accepts the same slug.
Aliases and effort suffixes are opaque per surface.

Verified snapshot on 2026-07-13:

- the Cursor Cloud native surface included a Sol `xhigh` selector and did not
  expose the corresponding Sol `max` selector;
- the Cursor CLI subagent enum exposed the Sol `max` selector and not that
  native `xhigh` selector.

This snapshot documents the divergence; it is not a permanent allowlist.
Provisioning the CLI adds a differently shaped surface so cloud-native and CLI
routes together can reach their union. It does not make either individual
catalog authoritative for the other.

Before every dispatch:

1. Identify the exact surface that will accept the launch.
2. Snapshot that surface's current catalog from its own tool schema, enum, or
   list command.
3. Record source, observation time, and exact candidate strings.
4. Intersect only that snapshot with the already-resolved policy candidates.
5. Pass the resulting context to `oat-dispatch-subagents`.

Do not:

- reuse a catalog snapshot from another surface;
- assume a successful main-agent selector is accepted by a subagent enum;
- rewrite, trim, or translate an opaque model slug;
- select from a stale design-time list when current catalog evidence exists;
- fall through to another surface after a launch has been accepted.

## Dispatch Ownership

After identity and catalog context are captured, read and follow
`oat-dispatch-subagents/references/provider-cursor.md` from the user-first asset
source selected by the orientation skill.

That provider reference owns Cursor launch, acceptance, continuation, retry,
and recovery mechanics. `oat-project-dispatch-subagents` owns lifecycle scope
and policy adaptation. Do not duplicate those contracts here.

## Degraded Route Evidence

Degradation is a pre-launch selection outcome, not a post-accept fallback.
Record it in the canonical dispatch record plus project learnings.

Use this shape for the Cursor-specific evidence supplied to the generic record:

```yaml
producer_identity:
  source: cursor-cloud.run-info.originalModelName
  exact_model: gpt-5.6-sol-xhigh
  family: openai
dispatch_surface:
  name: cursor-cloud-native
  catalog_snapshot:
    source: tool-schema
    observed_at: 2026-07-13T21:00:00Z
    candidates:
      - exact-opaque-selector
selection:
  selection_source: policy-resolved
  selection_reason: cross-family-candidate-available
  selected_target: exact-opaque-selector
independence:
  achieved: cross-family-and-context
  producer_family: openai
  reviewer_family: claude
  family_independent: true
  context_independent: true
degradation:
  present: false
  reason: null
dispatch_record: dispatch-unique-id
learnings_entry: null
```

Allowed `independence.achieved` values:

- `cross-family-and-context`;
- `same-family-context-independent`;
- `context-only`;
- `none`.

When no second family is dispatchable but the owning non-blocking review
contract allows same-family review:

```yaml
selection:
  selection_source: policy-resolved
  selection_reason: no-cross-family-candidate-on-selected-surface
independence:
  achieved: same-family-context-independent
  family_independent: false
  context_independent: true
degradation:
  present: true
  reason: catalog-contained-one-dispatchable-family
learnings_entry: oat-execution-learnings.md#<entry>
```

Include the exact configured invocation evidence required by the generic record
schema. Keep runtime confirmation separate and non-authoritative. Never record
credentials or secret values.

For a blocking review, `none` is not an acceptable achieved independence level.
If no route meets the owning contract, emit a boundary record rather than
claiming degraded success.

## Accepted-Launch Terminality

Catalog divergence is resolved before launch. Once a launch is accepted, that
route is terminal:

- continue or retry only through the accepted handle and identical payload as
  permitted by the dispatch engine;
- after bounded recovery, record the terminal blocker;
- never reinterpret another catalog as a runtime fallback;
- never launch a cheaper or differently shaped target to replace an accepted
  route.
