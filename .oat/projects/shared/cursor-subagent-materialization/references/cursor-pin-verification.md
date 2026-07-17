# Cursor Pin Verification (Gate g01)

status: complete

## Outcome

All 15 current shippable mapping entries have mapping-specific Cursor IDE hook evidence and are approved. Earlier failed or fallback launches are retained below as superseded diagnostic history; they are not current dispositions.

`CURSOR_CONVERSATION_ID` is not used because it is undocumented. Cursor hook payloads, including top-level `sessionStart.model_id` / `model_params` and mapping-specific `subagentStart.subagent_model`, are the evidence source.

### First-round observations

- GPT definitions using `effort=` normalized to provider-default `medium`; all seven GPT probes now use `reasoning=`.
- `composer-2.5[]` normalized to `composer-2.5-fast`, so the empty-bracket proposal is excluded. The `composer-2.5` ladder probe now requests explicit `[fast=true]`.
- `composer-2.5[fast=true]` produced `composer-2.5-fast` and is approved for its own mapping entry.
- `composer-2.5[fast=false]` is retained only as a diagnostic probe and is not shippable unless independently verified.
- `grok-4.5[effort=high,fast=true]` / prior `cursor-grok-4.5[...]` form produced `cursor-grok-4.5-high-fast` in the first round.
- The non-fast Grok diagnostic requests `grok-4.5[effort=high,fast=false]`.
- `claude-sonnet-5[effort=high]` produced normalized model `claude-sonnet-5-thinking-high`; keep the pin.
- Fable decomposition is resolved: `claude-fable-5[effort=xhigh]` produced `claude-fable-5-thinking-xhigh`. `thinking` and `context=300k` are implicit Fable defaults, so the corrected probes use base `claude-fable-5` with only `effort=high|xhigh`.
- The two prior Fable failures used the invalid `claude-fable-5-thinking` base and do not count against the corrected pins.

### Correction-round observations (2026-07-17)

Parent conversation `6a0d7829-c016-4f2e-816f-f986f22b4b75` (`cursor_version` `3.12.10`):

- `sessionStart.model` = `cursor-grok-4.5-high-fast`
- `sessionStart.model_id` = `grok-4.5`
- `sessionStart.model_params` = `effort=high`, `fast=true`

Probes launched in this session: all GPT, all Composer (including non-fast diagnostic), Claude Sonnet. Not launched here: any Grok probe, either Fable probe.

- All seven GPT `reasoning=` pins produced the matching flat ladder `subagent_model` values.
- `composer-2.5[fast=true]` (both `composer-2.5` and `composer-2.5-fast` probes) produced `composer-2.5-fast`.
- Diagnostic `composer-2.5[fast=false]` produced `composer-2.5`.
- `claude-sonnet-5[effort=high]` again produced `claude-sonnet-5-thinking-high`.

Separate conversation `732a020e-5954-4997-809e-34429c61d44c` first observed fallback results for the Grok probes, then successfully reran the corrected `grok-4.5` base pins. The earlier fallback results are superseded diagnostic history.

Conversation `64f65057-f29c-4768-b3f1-95235a2c2496` successfully launched both corrected Fable mappings from base `claude-fable-5`. The observed normalized models confirm that thinking and 300k context are implicit Fable defaults.

### Runtime boundary

| Runtime                                                           | Project hooks load | `subagentStart` / `subagentStop` on Task | Notes                                     |
| ----------------------------------------------------------------- | ------------------ | ---------------------------------------- | ----------------------------------------- |
| Cursor IDE Agent Chat (`cursor_version` 3.12.10)                  | Yes                | **Yes**                                  | Required runtime for fresh-session probes |
| `cursor-agent` / Superengineering terminal (`2026.07.16-899851b`) | Partial            | **No**                                   | Insufficient for pin proof                |

**Mapping count:** 15

**Additional diagnostic probes:** 1 (`oat-pin-probe-composer-2-5-non-fast`)

**Disposition totals:** 15 approved, 0 excluded, 0 inconclusive

## Mapping-Specific Evidence

Each row stands alone; no result authorizes another mapping.

Correction-round parent for GPT / Composer / Sonnet rows: `6a0d7829-c016-4f2e-816f-f986f22b4b75`.

| flat ladder ID                | exact bracket-form frontmatter value | probe name                                  | `subagent_model`                | `subagent_id`                                                                          | `parent_conversation_id`               | `tool_call_id`                                                                         | stop status / transcript path                                                | disposition | notes                                                                                                                                            |
| ----------------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| composer-2.5                  | `composer-2.5[fast=true]`            | oat-pin-probe-composer-2-5                  | `composer-2.5-fast`             | `32\nfc_osXxjuh-6SkKZu-fcfcb596-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `32\nfc_osXxjuh-6SkKZu-fcfcb596-aws_ue1_0`                                             | `completed` (`duration_ms` 4566); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected mapping-specific probe: frontmatter `composer-2.5[fast=true]` → `subagent_model` `composer-2.5-fast`.                                  |
| composer-2.5-fast             | `composer-2.5[fast=true]`            | oat-pin-probe-composer-2-5-fast             | `composer-2.5-fast`             | `34\nfc_osXxqW3-6SkKZu-bb33edf3-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `34\nfc_osXxqW3-6SkKZu-bb33edf3-aws_ue1_0`                                             | `completed` (`duration_ms` 5268); parent transcript `.../6a0d7829-...jsonl`  | approved    | Correction-round reconfirm: `subagent_model` `composer-2.5-fast`.                                                                                |
| claude-sonnet-5-high          | `claude-sonnet-5[effort=high]`       | oat-pin-probe-claude-sonnet-5-high          | `claude-sonnet-5-thinking-high` | `39\nfc_osXy6Wp-6SkKZu-728ded1c-aws_ue1_1`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `39\nfc_osXy6Wp-6SkKZu-728ded1c-aws_ue1_1`                                             | `completed` (`duration_ms` 6555); parent transcript `.../6a0d7829-...jsonl`  | approved    | Correction-round reconfirm: normalized model is `claude-sonnet-5-thinking-high`.                                                                 |
| gpt-5.6-luna-high             | `gpt-5.6-luna[reasoning=high]`       | oat-pin-probe-gpt-5-6-luna-high             | `gpt-5.6-luna-high`             | `17\nfc_osXwn2Z-6SkKZu-dbba4850-aws_ue1_1`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `17\nfc_osXwn2Z-6SkKZu-dbba4850-aws_ue1_1`                                             | `completed` (`duration_ms` 4503); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=high` pin matches flat ladder `subagent_model`.                                                                             |
| gpt-5.6-luna-xhigh            | `gpt-5.6-luna[reasoning=xhigh]`      | oat-pin-probe-gpt-5-6-luna-xhigh            | `gpt-5.6-luna-xhigh`            | `19\nfc_osXwyQa-6SkKZu-e8791b96-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `19\nfc_osXwyQa-6SkKZu-e8791b96-aws_ue1_0`                                             | `completed` (`duration_ms` 4379); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=xhigh` pin matches flat ladder `subagent_model`.                                                                            |
| cursor-grok-4.5-high          | `grok-4.5[effort=high,fast=false]`   | oat-pin-probe-cursor-grok-4-5-high          | `cursor-grok-4.5-high`          | `call_T122RYFllBubL3Zd9YQsnYtV\nfc_0c27eb93443c0377016a5ab173d25c819394854050d63f28f5` | `732a020e-5954-4997-809e-34429c61d44c` | `call_T122RYFllBubL3Zd9YQsnYtV\nfc_0c27eb93443c0377016a5ab173d25c819394854050d63f28f5` | `completed` (`duration_ms` 7145); parent transcript `.../732a020e-...jsonl`  | approved    | Corrected-base rerun: `grok-4.5[effort=high,fast=false]` produced `cursor-grok-4.5-high`. Earlier fallback is superseded diagnostic history.     |
| cursor-grok-4.5-high-fast     | `grok-4.5[effort=high,fast=true]`    | oat-pin-probe-cursor-grok-4-5-high-fast     | `cursor-grok-4.5-high-fast`     | `call_gZKjMR6UgLvzHpAbUcxXerGQ\nfc_0c27eb93443c0377016a5ab15d52588193b3e4d87e3797e03c` | `732a020e-5954-4997-809e-34429c61d44c` | `call_gZKjMR6UgLvzHpAbUcxXerGQ\nfc_0c27eb93443c0377016a5ab15d52588193b3e4d87e3797e03c` | `completed` (`duration_ms` 4681); parent transcript `.../732a020e-...jsonl`  | approved    | Corrected-base rerun: `grok-4.5[effort=high,fast=true]` produced `cursor-grok-4.5-high-fast`. Earlier fallback is superseded diagnostic history. |
| gpt-5.6-terra-high            | `gpt-5.6-terra[reasoning=high]`      | oat-pin-probe-gpt-5-6-terra-high            | `gpt-5.6-terra-high`            | `21\nfc_osXxApi-6SkKZu-b9c931a8-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `21\nfc_osXxApi-6SkKZu-b9c931a8-aws_ue1_0`                                             | `completed` (`duration_ms` 1841); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=high` pin matches flat ladder `subagent_model`.                                                                             |
| gpt-5.6-sol-medium            | `gpt-5.6-sol[reasoning=medium]`      | oat-pin-probe-gpt-5-6-sol-medium            | `gpt-5.6-sol-medium`            | `23\nfc_osXxGtz-6SkKZu-6e3c3959-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `23\nfc_osXxGtz-6SkKZu-6e3c3959-aws_ue1_0`                                             | `completed` (`duration_ms` 2338); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=medium` pin matches flat ladder `subagent_model` under mapping-specific launch.                                             |
| gpt-5.6-sol-high              | `gpt-5.6-sol[reasoning=high]`        | oat-pin-probe-gpt-5-6-sol-high              | `gpt-5.6-sol-high`              | `25\nfc_osXxSTD-6SkKZu-b8a6f3d8-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `25\nfc_osXxSTD-6SkKZu-b8a6f3d8-aws_ue1_0`                                             | `completed` (`duration_ms` 2138); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=high` pin matches flat ladder `subagent_model`.                                                                             |
| claude-fable-5-thinking-high  | `claude-fable-5[effort=high]`        | oat-pin-probe-claude-fable-5-thinking-high  | `claude-fable-5-thinking-high`  | `toolu_vrtx_011UeKp9XDnpw4upTf3nLaQw`                                                  | `64f65057-f29c-4768-b3f1-95235a2c2496` | `toolu_vrtx_011UeKp9XDnpw4upTf3nLaQw`                                                  | `completed` (`duration_ms` 10449); parent transcript `.../64f65057-...jsonl` | approved    | Corrected base `claude-fable-5` with `effort=high` produced normalized Fable thinking-high; thinking and 300k context are implicit.              |
| claude-fable-5-thinking-xhigh | `claude-fable-5[effort=xhigh]`       | oat-pin-probe-claude-fable-5-thinking-xhigh | `claude-fable-5-thinking-xhigh` | `toolu_vrtx_017pEgZND7sjGbAKUyAEYnVv`                                                  | `64f65057-f29c-4768-b3f1-95235a2c2496` | `toolu_vrtx_017pEgZND7sjGbAKUyAEYnVv`                                                  | `completed` (`duration_ms` 13647); parent transcript `.../64f65057-...jsonl` | approved    | Corrected base `claude-fable-5` with `effort=xhigh` produced normalized Fable thinking-xhigh; thinking and 300k context are implicit.            |
| claude-fable-5-xhigh          | `claude-fable-5[effort=xhigh]`       | oat-pin-probe-claude-fable-5-xhigh          | `claude-fable-5-thinking-xhigh` | `call_OG0asWkDZmsxFEXoWd6rSyeg\nfc_0a38e764f3cc4569016a5ab242f848819681eeda2863a64d3d` | `732a020e-5954-4997-809e-34429c61d44c` | `call_OG0asWkDZmsxFEXoWd6rSyeg\nfc_0a38e764f3cc4569016a5ab242f848819681eeda2863a64d3d` | `completed`; parent transcript `.../732a020e-...jsonl`                       | approved    | Mapping-specific evidence proves base `claude-fable-5` with `effort=xhigh`; thinking and 300k context are implicit defaults.                     |
| gpt-5.6-sol-xhigh             | `gpt-5.6-sol[reasoning=xhigh]`       | oat-pin-probe-gpt-5-6-sol-xhigh             | `gpt-5.6-sol-xhigh`             | `27\nfc_osXxYkE-6SkKZu-d694c022-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `27\nfc_osXxYkE-6SkKZu-d694c022-aws_ue1_0`                                             | `completed` (`duration_ms` 3365); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=xhigh` pin matches flat ladder `subagent_model`.                                                                            |
| gpt-5.6-sol-max               | `gpt-5.6-sol[reasoning=max]`         | oat-pin-probe-gpt-5-6-sol-max               | `gpt-5.6-sol-max`               | `29\nfc_osXxdcA-6SkKZu-d17ffe35-aws_ue1_0`                                             | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `29\nfc_osXxdcA-6SkKZu-d17ffe35-aws_ue1_0`                                             | `completed` (`duration_ms` 5422); parent transcript `.../6a0d7829-...jsonl`  | approved    | Corrected `reasoning=max` pin matches flat ladder `subagent_model`.                                                                              |

## Diagnostic-Only Probe

| probe name                          | frontmatter value          | `subagent_model` | `subagent_id`                              | `parent_conversation_id`               | stop status                      | shipping rule                                                                                                       |
| ----------------------------------- | -------------------------- | ---------------- | ------------------------------------------ | -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| oat-pin-probe-composer-2-5-non-fast | `composer-2.5[fast=false]` | `composer-2.5`   | `36\nfc_osXxyay-6SkKZu-87c19380-aws_ue1_0` | `6a0d7829-c016-4f2e-816f-f986f22b4b75` | `completed` (`duration_ms` 5732) | Mapping-specific hook proof captured (`composer-2.5`). Still diagnostic-only until an operator adds a registry row. |

## Hook Diagnostic Evidence

**Evidence rule:** Model chat claims are not authoritative. Prefer Cursor Hooks Output / `cursor.hooks*.log`. JSONL side-effects from project hook commands are valid when they contain real Cursor stdin payloads.

### A) `cursor-agent` / Superengineering terminal (insufficient for pin proof)

Conversation `0d3713e5-499a-420c-b4e0-03a130f84ae6` (`cursor_version` `2026.07.16-899851b`):

- `sessionStart` / `preToolUse` ran
- Task spawned `oat-pin-probe-composer-2-5`
- No `subagentStart` / `subagentStop` command executions

### B) Cursor IDE Agent Chat — first round

Conversation `649648e7-33db-496b-97ac-a7c9f319ff9b` (`cursor_version` `3.12.10`), JSONL lines 11–14:

1. `preToolUse` Task — `subagent_type: oat-pin-probe-composer-2-5`
2. `subagentStart` — `subagent_model: composer-2.5-fast`, `subagent_type: oat-pin-probe-composer-2-5`, ids as in evidence table
3. `subagentStop` — `status: completed`
4. IDE hooks log also present under `.../window1_wb9/.../cursor.hooks.workspaceId-2ad54cc25537fa8f5c1be64b7cb09c9f.log`

### C) Cursor IDE Agent Chat — correction round (GPT / Composer / Sonnet)

Conversation `6a0d7829-c016-4f2e-816f-f986f22b4b75` (`cursor_version` `3.12.10`):

- `sessionStart` captured with `model_id=grok-4.5`, `model_params=[{effort:high},{fast:true}]`
- Eleven selected probes produced paired `subagentStart` / `subagentStop` events in `.cursor/subagent-probe-events.jsonl`
- Evidence rows above quote verbatim `subagent_model`, ids, parent, and stop status

## Finalization

- Every current shippable row is independently approved.
- `composer-2.5[fast=false]` remains verified diagnostic-only and is not a substitute registry row.
- Temporary probes, hooks, logs, and the probe canvas were removed after recording evidence.

## Gate Consequence

Gate g01 is complete with 15 approved registry mappings. Earlier failures remain in the verbatim appendix as superseded diagnostics. p02 has not started.

## Correction-Round Verification (verbatim)

### Session `6a0d7829-c016-4f2e-816f-f986f22b4b75` (this operator session)

#### `oat-pin-probe-gpt-5-6-luna-high`

```json
{
  "frontmatter_model": "gpt-5.6-luna[reasoning=high]",
  "subagentStart.subagent_model": "gpt-5.6-luna-high",
  "subagent_id": "17\nfc_osXwn2Z-6SkKZu-dbba4850-aws_ue1_1",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-luna-xhigh`

```json
{
  "frontmatter_model": "gpt-5.6-luna[reasoning=xhigh]",
  "subagentStart.subagent_model": "gpt-5.6-luna-xhigh",
  "subagent_id": "19\nfc_osXwyQa-6SkKZu-e8791b96-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-terra-high`

```json
{
  "frontmatter_model": "gpt-5.6-terra[reasoning=high]",
  "subagentStart.subagent_model": "gpt-5.6-terra-high",
  "subagent_id": "21\nfc_osXxApi-6SkKZu-b9c931a8-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-sol-medium`

```json
{
  "frontmatter_model": "gpt-5.6-sol[reasoning=medium]",
  "subagentStart.subagent_model": "gpt-5.6-sol-medium",
  "subagent_id": "23\nfc_osXxGtz-6SkKZu-6e3c3959-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-sol-high`

```json
{
  "frontmatter_model": "gpt-5.6-sol[reasoning=high]",
  "subagentStart.subagent_model": "gpt-5.6-sol-high",
  "subagent_id": "25\nfc_osXxSTD-6SkKZu-b8a6f3d8-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-sol-xhigh`

```json
{
  "frontmatter_model": "gpt-5.6-sol[reasoning=xhigh]",
  "subagentStart.subagent_model": "gpt-5.6-sol-xhigh",
  "subagent_id": "27\nfc_osXxYkE-6SkKZu-d694c022-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-gpt-5-6-sol-max`

```json
{
  "frontmatter_model": "gpt-5.6-sol[reasoning=max]",
  "subagentStart.subagent_model": "gpt-5.6-sol-max",
  "subagent_id": "29\nfc_osXxdcA-6SkKZu-d17ffe35-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-composer-2-5`

```json
{
  "frontmatter_model": "composer-2.5[fast=true]",
  "subagentStart.subagent_model": "composer-2.5-fast",
  "subagent_id": "32\nfc_osXxjuh-6SkKZu-fcfcb596-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-composer-2-5-fast`

```json
{
  "frontmatter_model": "composer-2.5[fast=true]",
  "subagentStart.subagent_model": "composer-2.5-fast",
  "subagent_id": "34\nfc_osXxqW3-6SkKZu-bb33edf3-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-composer-2-5-non-fast`

```json
{
  "frontmatter_model": "composer-2.5[fast=false]",
  "subagentStart.subagent_model": "composer-2.5",
  "subagent_id": "36\nfc_osXxyay-6SkKZu-87c19380-aws_ue1_0",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-claude-sonnet-5-high`

```json
{
  "frontmatter_model": "claude-sonnet-5[effort=high]",
  "subagentStart.subagent_model": "claude-sonnet-5-thinking-high",
  "subagent_id": "39\nfc_osXy6Wp-6SkKZu-728ded1c-aws_ue1_1",
  "parent_conversation_id": "6a0d7829-c016-4f2e-816f-f986f22b4b75",
  "subagentStop.status": "completed"
}
```

### Session `732a020e-5954-4997-809e-34429c61d44c` (Grok probes only; unfavorable; not run here)

#### `oat-pin-probe-cursor-grok-4-5-high-fast`

```json
{
  "subagentStart.subagent_model": "gpt-5.6-terra-medium",
  "subagent_id": "call_4oaooJkX3tgWSlcMqttVQGVV\nfc_0bc3d01fd78fbf51016a5aaec770788197a2d559c39645f0f2",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_4oaooJkX3tgWSlcMqttVQGVV\nfc_0bc3d01fd78fbf51016a5aaec770788197a2d559c39645f0f2",
  "subagentStop.status": "completed"
}
```

#### `oat-pin-probe-cursor-grok-4-5-high`

```json
{
  "subagentStart.subagent_model": "gpt-5.6-terra-medium",
  "subagent_id": "call_VV1IfQnG5DHxi6sVc8d9YuZA\nfc_0bc3d01fd78fbf51016a5aaf0a030881978fb24e7fb63f0e87",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_VV1IfQnG5DHxi6sVc8d9YuZA\nfc_0bc3d01fd78fbf51016a5aaf0a030881978fb24e7fb63f0e87",
  "subagentStop.status": "completed"
}
```

### Rerun: `oat-pin-probe-cursor-grok-4-5-high-fast`

```json
{
  "subagentStart.subagent_model": "cursor-grok-4.5-high-fast",
  "subagent_id": "call_gZKjMR6UgLvzHpAbUcxXerGQ\nfc_0c27eb93443c0377016a5ab15d52588193b3e4d87e3797e03c",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_gZKjMR6UgLvzHpAbUcxXerGQ\nfc_0c27eb93443c0377016a5ab15d52588193b3e4d87e3797e03c",
  "subagentStop.status": "completed"
}
```

### Rerun: `oat-pin-probe-cursor-grok-4-5-high`

```json
{
  "subagentStart.subagent_model": "cursor-grok-4.5-high",
  "subagent_id": "call_T122RYFllBubL3Zd9YQsnYtV\nfc_0c27eb93443c0377016a5ab173d25c819394854050d63f28f5",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_T122RYFllBubL3Zd9YQsnYtV\nfc_0c27eb93443c0377016a5ab173d25c819394854050d63f28f5",
  "subagentStop.status": "completed"
}
```

### `oat-pin-probe-claude-fable-5-thinking-high`

```json
{
  "frontmatter.model": "claude-fable-5-thinking[effort=high]",
  "subagentStart.subagent_model": "gpt-5.6-terra-medium",
  "subagent_id": "call_EvHqjoiNwyGUQHY6VKmaqqdF\nfc_0a38e764f3cc4569016a5ab20917e08196985267c4a81b8815",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_EvHqjoiNwyGUQHY6VKmaqqdF\nfc_0a38e764f3cc4569016a5ab20917e08196985267c4a81b8815",
  "subagentStop.status": "completed"
}
```

### `oat-pin-probe-claude-fable-5-thinking-xhigh`

```json
{
  "frontmatter.model": "claude-fable-5-thinking[effort=xhigh]",
  "subagentStart.subagent_model": "gpt-5.6-terra-medium",
  "subagent_id": "call_AQSCFDqBntBFFaXduJEf1NPA\nfc_0a38e764f3cc4569016a5ab22500d081968211ce22293717f7",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_AQSCFDqBntBFFaXduJEf1NPA\nfc_0a38e764f3cc4569016a5ab22500d081968211ce22293717f7",
  "subagentStop.status": "completed"
}
```

### `oat-pin-probe-claude-fable-5-xhigh`

```json
{
  "frontmatter.model": "claude-fable-5[effort=xhigh]",
  "subagentStart.subagent_model": "claude-fable-5-thinking-xhigh",
  "subagent_id": "call_OG0asWkDZmsxFEXoWd6rSyeg\nfc_0a38e764f3cc4569016a5ab242f848819681eeda2863a64d3d",
  "parent_conversation_id": "732a020e-5954-4997-809e-34429c61d44c",
  "tool_call_id": "call_OG0asWkDZmsxFEXoWd6rSyeg\nfc_0a38e764f3cc4569016a5ab242f848819681eeda2863a64d3d",
  "subagentStop.status": "completed"
}
```
