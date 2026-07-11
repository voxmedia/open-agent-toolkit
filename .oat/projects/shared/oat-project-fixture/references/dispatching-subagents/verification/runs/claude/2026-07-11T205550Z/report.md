# Claude Dispatch Verification — Canonical Run 2026-07-11T205550Z

## 1. Run Identity and Input Provenance

| Field             | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Run ID            | `claude-2026-07-11T205550Z`                                                  |
| Run type          | `canonical`                                                                  |
| Scope             | `combined-capability` (native + CLI, declared independent before any launch) |
| Harness           | `claude` (flavor: `not-applicable`, Claude Code 2.1.207)                     |
| Fresh session     | yes — first turn of a new session was the verification prompt                |
| Captured at       | 2026-07-11T20:55:50Z                                                         |
| Working directory | `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`       |
| Repository commit | `3111442a0831c3e5f1305968313f16fde7f2be40`                                   |
| Root model        | `claude-opus-4-8[1m]` — self-reported as "Opus 4.8 (1M context)"             |

The session began with a local `/model` command that set the root model to Opus 4.8
(1M context). No prior run packets, execution logs, or Codex/Cursor drafts were read,
and no Codex or Cursor behavior is inferred anywhere in this report.

Immutable input hashes (sha256):

| File                | sha256                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `claims.md`         | `d2b47c872dcfc5558bddc25f93843ef83daf82f232e680a0fec767423d4dc781` |
| `protocol.md`       | `5efecc56a386331b771d0519ff5ed6ed20b125d1323b4c2678fbf572b750cfb7` |
| `provider-draft.md` | `5d50fad0692c35b5df4b526624f34472c887cfff9a3d118e267a7811ac3c57d0` |

## 2. Coverage and Excluded Behavior

Covered (verdict rows returned): `CLA-M01`, `CLA-M02`, `CLA-M04`, `CLA-M05`,
`CLA-M08`, `CLA-M10`, `CLA-M11`, `CLA-S01`, `CLA-M07`, and shared `U-M01`, `U-M02`,
`U-M03`, `U-P05`, `U-P06`, `U-P09`. `CLA-M08`, `U-M02`, `U-M03`, `U-P06`, and `U-P09`
are deduplicated across the native and CLI scopes per the combined-scope rule.

Supplementary rows (not part of the canonical required set, marked as such):
`CLA-M06` (executed, schema-only observation — no Workflow launch), `CLA-M03` and
`CLA-M09` (pilot-covered, deliberately not re-probed this run).

Explicitly **not covered** by this run, and not settled by it:

- `CLA-P01` — which Claude dispatch surface OAT sanctions for coordinators, workers,
  and reviewers. This is a p04 design decision; provider capability does not settle it.
- `CLA-P02` — actual production coordinator-to-worker behavior. A generic topology
  probe is not a substitute; p05 live smoke owns this.
- `U-P08` — phase-scoped review routing. Outside the bounded capability protocol;
  p04 contract tests and p05 live evidence own its disposition.
- Everything under protocol.md "Outside this protocol": planning self-review
  inheritance, implementation self-review ceiling enforcement, gate independence,
  write-capable worker permissions, full coordinator-to-worker workflow behavior,
  production-role cooperation with diagnostic prompts, and catalog stability across
  accounts, sessions, or provider releases.

For `U-P06` and `U-P09` this report records **run adherence only**, not mechanism
truth, as instructed.

## 3. Root Control Surfaces and Catalog Snapshots

### 3.1 Root native `Agent` tool (snapshot `root-native-1`, tool-schema, 2026-07-11T20:56:20Z)

The root native dispatch tool is named **`Agent`**, not `Task`. Transcribed verbatim
from the live root schema:

- **`model` parameter — allowed values (exact strings and casing):**
  `"sonnet"`, `"opus"`, `"haiku"`, `"fable"`
- **`model` description, verbatim:** "Optional model override for this agent. Takes
  precedence over the agent definition's model frontmatter. If omitted, uses the agent
  definition's model, or inherits from the parent. Ignored for subagent_type: \"fork\"
  — forks always inherit the parent model."
- **`subagent_type` parameter:** type `string` with **no enum in the schema**.
  Verbatim description: "The type of specialized agent to use for this task". The tool
  description states: "Available agent types are listed in `<system-reminder>` messages
  in the conversation."
- **Effort parameter:** **none exists** on the `Agent` tool. The tool description
  states, verbatim: "Each agent type's model, reasoning effort, and tools come from its
  definition (`.claude/agents/*.md` frontmatter or SDK `agents`)."
- **Other parameters:** `description`, `prompt`, `isolation` (`"worktree"`,
  `"remote"`), `run_in_background`.
- **Documented model-resolution order:** explicit call `model` → agent-definition
  `model` frontmatter → parent inheritance. Verbatim: "Takes precedence over the agent
  definition's model frontmatter. If omitted, uses the agent definition's model, or
  inherits from the parent."
- **Continuation, verbatim:** "Use SendMessage with the agent's ID or name to continue
  a previously spawned agent with its context intact; a new Agent call starts fresh."

Root agent-type catalog, verbatim selector strings, present in the root context
**before** any dispatch: `claude`, `claude-code-guide`, `codex:codex-rescue`,
`consensus:consensus-section-runner`, `Explore`, `general-purpose`,
`oat-codebase-mapper`, `oat-phase-implementer`, `oat-reviewer`, `Plan`,
`skeptical-evaluator`, `statusline-setup`.

Diagnostic: the value `fork` is referenced inside the `model` parameter description
("Ignored for subagent_type: \"fork\"") but does **not** appear in the advertised
agent-type catalog at either depth.

### 3.2 Nested native `Agent` tool (snapshot `nested-native-1`, child-reported tool-schema)

The generic topology probe reported a nested `Agent` tool with the **same** `model`
enum (`"sonnet"`, `"opus"`, `"haiku"`, `"fable"`), the **same** verbatim `model`
description, **no** effort parameter, and the **same** twelve agent-type selector
strings listed in §3.1.

Critically, the nested agent-type catalog was **`visible-only-after-first-nested-call`**.
Before its first nested dispatch the child had the `Agent` tool schema (whose
`subagent_type` carries no enum, only the pointer text) but **no agent-type catalog
anywhere in context**. The catalog arrived as a system message beginning "Available
agent types for the Agent tool:" appended alongside the first tool result. The launcher
therefore advertises the tool as callable while withholding the selectable-type
enumeration until a call has already been made.

### 3.3 `Workflow` tool (snapshot `root-workflow-1`, tool-schema — observed, not launched)

`Workflow`'s `agent()` hook exposes, verbatim from the live schema:

- `opts.model` — "overrides the model for this agent call. Default to omitting it — the
  agent inherits the main-loop model (the resolved session model), which is almost
  always correct." No closed model enum is given.
- `opts.effort` — "overrides the reasoning effort for this agent call
  ('low' | 'medium' | 'high' | 'xhigh' | 'max') — omit to inherit the session effort".
- `opts.agentType` — "uses a custom subagent type (e.g. 'general-purpose',
  'code-reviewer') instead of the default workflow subagent — **resolved from the same
  registry as the Agent tool**".

No Workflow launch was performed; this run did not carry that supplementary authorization.

### 3.4 `claude` CLI (snapshot `cli-1`, cli-help, Claude Code 2.1.207)

- `--model <model>` — "Model for the current session. Provide an alias for the latest
  model (e.g. 'fable', 'opus', or 'sonnet') or a model's full name (e.g.
  'claude-fable-5')." This is an **open selector, not a closed enum**: aliases and full
  dated model IDs are both accepted.
- `--effort <level>` — "Effort level for the current session (low, medium, high, xhigh,
  max)." An effort axis **does** exist on the CLI surface.
- `--output-format <format>` — "text" (default), "json", "stream-json" (with `--print`).
- `--fallback-model <model>`, `--agents <json>` also present.

## 4. Generic Topology Probe and Leaf Sentinel (native scope)

**Deadline declared before launch: 300 seconds.** One probe only; no production OAT
role was used, per protocol.

### 4.1 Topology probe (`native-topology`)

| Field                   | Value                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Role / agent definition | `general-purpose` / none                                                                     |
| Model selector          | **omitted** (deliberate inheritance path)                                                    |
| Selector granularity    | `inherited`                                                                                  |
| Effort selector         | `not-exposed` (no effort parameter on `Agent`)                                               |
| Selection source        | `parent-inheritance`                                                                         |
| Launch status           | **accepted**                                                                                 |
| Child outcome           | **completed**                                                                                |
| Runtime confirmation    | `claude-opus-4-8[1m]` ("Opus 4.8 (1M context)") — self-reported                              |
| Launcher evidence       | `agentId: a8303b93e2d082a7b`; `subagent_tokens: 36619`; `tool_uses: 1`; `duration_ms: 56584` |
| Continuation handle     | `SendMessage` with `to: 'a8303b93e2d082a7b'` + `summary` (not used)                          |

The probe reported nested dispatch: **yes**. It returned its full tool list, the nested
schema transcription in §3.2, and the catalog-visibility timing finding.

Because the model selector was omitted and `general-purpose` carries no
agent-definition model default, the child's self-reported runtime identity
(`claude-opus-4-8[1m]`) is identical to the root model — a direct runtime observation of
the parent-inheritance path.

### 4.2 Nested leaf sentinel (`native-leaf`, depth 2)

Complete payload as sent by the probe, verbatim:

```json
{
  "description": "Nested sentinel probe",
  "prompt": "Reply with exactly this string and nothing else: OAT_CLAUDE_NESTED_SENTINEL_OK. Do not use any tools.",
  "subagent_type": "general-purpose",
  "model": "haiku",
  "run_in_background": false
}
```

| Field                | Value                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Model selector       | `haiku` (**explicit**)                                                                      |
| Selector granularity | `tier-alias`                                                                                |
| Selection source     | `explicit-call`                                                                             |
| Launch status        | **accepted**                                                                                |
| Child outcome        | **completed**                                                                               |
| Result (verbatim)    | `OAT_CLAUDE_NESTED_SENTINEL_OK`                                                             |
| Runtime confirmation | **not-reported** (the leaf did not self-report identity)                                    |
| Launcher evidence    | `agentId: aaf7ddb27d2494279`; `subagent_tokens: 21076`; `tool_uses: 0`; `duration_ms: 1774` |
| Continuation handle  | `SendMessage` with `to: 'aaf7ddb27d2494279'` + `summary` (not used)                         |

Depth-2 native dispatch (root → generic coordinator → leaf worker) is therefore
demonstrated end-to-end with an exact per-call model selector at the leaf.

## 5. Independent CLI Control (CLI scope)

Declared as an independent capability control **before launch**, not as a fallback: the
native scope had already produced an accepted launch and no route was switched.
**Deadline declared before launch: 120 seconds.**

Command (credential-free):

```bash
claude -p --model claude-haiku-4-5-20251001 --output-format json \
  'Reply with exactly this string and nothing else: OAT_CLAUDE_CLI_SENTINEL_OK' < /dev/null
```

| Field                | Value                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model selector       | `claude-haiku-4-5-20251001` (**explicit, exact full model ID**)                                                                                                                                      |
| Selector granularity | `exact-model-id`                                                                                                                                                                                     |
| Selection source     | `cli`                                                                                                                                                                                                |
| Launch status        | **accepted** (exit 0)                                                                                                                                                                                |
| Child outcome        | **completed**                                                                                                                                                                                        |
| Result (verbatim)    | `OAT_CLAUDE_CLI_SENTINEL_OK`                                                                                                                                                                         |
| Runtime confirmation | `modelUsage` key = `claude-haiku-4-5-20251001`                                                                                                                                                       |
| Structured evidence  | `"subtype":"success"`, `"is_error":false`, `"num_turns":1`, `"stop_reason":"end_turn"`, `"terminal_reason":"completed"`, `"duration_ms":2331`, `"session_id":"01ea8adc-e811-48ed-9ead-1393e6221852"` |

The `modelUsage` object is keyed by the exact model ID that was requested, and reports
`contextWindow: 200000`, `maxOutputTokens: 32000`. Requested selector and
runtime-observed identity agree, and they are carried in **separate** fields of the
launcher's structured output.

**Honest procedural note.** The first attempt at this sentinel wrapped the command in
`timeout 120 …`, which failed with `command not found: timeout` (exit 127) on macOS —
the `claude` binary never executed. That is a shell-level failure to launch, **not** a
rejected launch and **not** an accepted-launch outcome, so re-issuing the identical
route (same model, same prompt, same flags) is not a fallback and does not violate the
one-sentinel rule. Exactly one CLI child was ever dispatched.

## 6. Claim Verdict Table

| Claim ID  | Kind      | Probe status | Verdict      | Evidence mode  | Basis                                                                                                                                              |
| --------- | --------- | ------------ | ------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLA-M01` | mechanism | executed     | confirmed    | schema         | Root `Agent` exposes `subagent_type` (named-agent) + `model` enum `sonnet\|opus\|haiku\|fable`.                                                    |
| `CLA-M02` | mechanism | executed     | confirmed    | schema         | Verbatim precedence text: explicit call → agent-definition frontmatter → parent inheritance.                                                       |
| `CLA-M04` | mechanism | executed     | confirmed    | launch         | Generic probe materialized a nested `Agent` tool and enumerated its model enum + agent-type catalog.                                               |
| `CLA-M05` | mechanism | executed     | confirmed    | launch         | Depth-2 leaf, explicit `model: "haiku"`, accepted, returned `OAT_CLAUDE_NESTED_SENTINEL_OK`.                                                       |
| `CLA-M08` | mechanism | executed     | confirmed    | runtime-report | Configured selector and runtime identity stayed separable at all three launches (see §4, §5).                                                      |
| `CLA-M10` | mechanism | executed     | confirmed    | launch         | Launcher returned `agentId` + documented `SendMessage` resume for both native children.                                                            |
| `CLA-M11` | mechanism | executed     | confirmed    | runtime-report | Omitted model on `general-purpose` (no definition default) → child self-reported `claude-opus-4-8[1m]` = root.                                     |
| `CLA-S01` | snapshot  | executed     | confirmed    | schema         | Root, nested, Workflow, and CLI catalogs captured verbatim and timestamped (§3).                                                                   |
| `CLA-M07` | mechanism | executed     | confirmed    | help + launch  | `claude --help` documents `--model` alias/full-name; sentinel accepted an exact dated model ID.                                                    |
| `U-M01`   | mechanism | executed     | confirmed    | schema         | Root catalog was pre-call visible; nested catalog only post-first-call — independent observations.                                                 |
| `U-M02`   | mechanism | executed     | confirmed    | launch         | All three launches carried launcher-side acceptance evidence (agentIds/usage; CLI exit 0 + JSON).                                                  |
| `U-M03`   | mechanism | executed     | confirmed    | runtime-report | Leaf reported no identity yet launched and returned its fixed string; absence ≠ unavailability.                                                    |
| `U-P06`   | policy    | executed     | confirmed    | launch         | Run adherence: no route, role, or model was retried after any accepted launch.                                                                     |
| `U-P09`   | policy    | executed     | confirmed    | launch         | Run adherence: continuation handles recorded, none used; no replacement route launched.                                                            |
| `U-P05`   | policy    | executed     | confirmed    | help           | Run adherence: CLI declared an independent pre-start scope, not a post-native fallback.                                                            |
| `CLA-M06` | mechanism | executed     | confirmed    | schema         | _Supplementary._ `Workflow.agent()` exposes `model` + `effort` and resolves `agentType` from the same registry as `Agent`. Schema only; no launch. |
| `CLA-M03` | mechanism | not_run      | inconclusive | schema         | _Supplementary._ Pilot-covered; deliberately not re-probed this run.                                                                               |
| `CLA-M09` | mechanism | not_run      | inconclusive | schema         | _Supplementary._ Pilot-covered; deliberately not re-probed this run.                                                                               |

`CLA-P01`, `CLA-P02`, and `U-P08` are reported under non-coverage (§2) and receive no
verdict row.

## 7. Contradictions and Contract Corrections

Four corrections to `dispatching-subagents-claude-draft.md`. Each is evidence-backed.

**7.1 — "Keep `effort_axis=not-applicable`" is wrong as a global rule (draft
Selection Rule 4, and the prose "Claude's OAT-managed dispatch axis is model, not a
separate reasoning-effort axis").** The claim holds _only_ for the native `Agent` tool,
which genuinely has no effort parameter. It is **contradicted** on the other two
surfaces: `claude --effort <low|medium|high|xhigh|max>` exists on the CLI, and
`Workflow.agent()` accepts `opts.effort` with the same five values. The rule must be
scoped per-surface: `effort_axis=not-applicable` for native `Agent`;
`effort_axis=applicable` for `claude -p` and for Workflow dispatch.

**7.2 — Native model selection is tier-alias granularity only; exact dated model IDs
are a CLI-only capability.** Draft Selection Rule 1 says "Resolve an exact model
candidate under the named maximum" and Rule 3 says "Pass the resolver-returned model
exactly on native Task invocation." But the native enum is exactly
`["sonnet","opus","haiku","fable"]` — four tier aliases, no dated IDs. A resolver that
returns `claude-haiku-4-5-20251001` **cannot** be passed through native dispatch; only
the CLI accepts it (verified: `modelUsage` keyed by that exact ID). "Exact" must be
defined per-surface, or the resolver must emit a tier alias for native routes and a
full ID for CLI routes.

**7.3 — A nested dispatcher cannot snapshot its agent-type catalog before its first
dispatch.** Draft Selection Rule 2 (and neutral policy `U-P01`) says to snapshot the
current dispatcher's native catalog _before_ selection. That is achievable at the root,
where the catalog is present pre-call, and it is achievable for the **model** enum at
any depth, since that lives in the tool schema. It is **not** achievable for the nested
**agent-type** catalog: the topology probe confirmed
`visible-only-after-first-nested-call`. Any coordinator-side selection policy that
depends on enumerating agent types before its first dispatch is unimplementable as
written. The policy should split the model catalog (schema-available at every depth)
from the agent-type catalog (root: pre-call; nested: post-first-call only).

**7.4 — The tool is named `Agent`, not `Task` (cosmetic only — see correction below).**
The draft's control-surface table and selection rules refer throughout to a "Native Task
tool". The live root and nested tool is `Agent`. The advertised `oat-phase-implementer`
agent type likewise declares its tools as "Read, Write, Edit, Bash, Grep, Glob, **Task**"
(`.agents/agents/oat-phase-implementer.md:5`).

> **Correction, added 2026-07-11T21:06:29Z.** This section originally speculated that the
> `oat-phase-implementer` tool grant "may not resolve." **That speculation was wrong and
> is withdrawn.** It has since been probed directly (supplementary packet
> `claude-2026-07-11T210629Z`): a `Task` grant **does** resolve, materializing the
> dispatch tool that the child then sees under its live name `Agent`. Controls confirm
> the result — a `["Read"]`-only grant yields a `Read`-only child (so the grant is
> genuinely enforced), and a bogus tool name is silently dropped (so a surviving name was
> recognized, not echoed). `oat-phase-implementer` receives a working dispatch tool.
> What survives from 7.4 is only naming drift worth tidying for readability, not a
> functional defect. Residual, unprobed: because unknown tool names are dropped _without
> error_, if the `Task` alias were ever removed the grant would fail silently. Migrating
> it to `Agent` is cheap insurance, not a bug fix.

Two draft **Open Questions** are now partially answered. "Is native nesting supported?"
— yes, at least for generic agent types, to depth 2, with per-call model pinning at the
leaf. "Which launcher fields provide configured-invocation evidence?" — natively,
`agentId` plus a `<usage>` block (`subagent_tokens`, `tool_uses`, `duration_ms`); on the
CLI, the full result JSON, with `modelUsage` keys carrying runtime identity. The
questions about per-role nested catalog variance and CLI-vs-native catalog equivalence
remain open — this run probed one generic role only.

## 8. Recommended Harness Topology

Native depth-2 dispatch is confirmed viable, so the draft's _candidate_ topology (root →
phase coordinator → task worker, all native) is supported for generic agent types and no
longer needs the CLI-worker fallback diagram on capability grounds. Recommended:

- **Coordinator:** native `Agent`, model omitted for deliberate inheritance when the
  root is suitable, or an explicit tier alias when it is not. Inheritance is now a
  runtime-verified path, not an assumption.
- **Leaf worker:** native `Agent` with an **explicit** tier alias (`haiku`/`sonnet`/
  `opus`/`fable`). Never omit the model at the leaf — omission silently inherits an
  expensive root, exactly the failure the draft's Rule 7 warns about, and that
  inheritance is now confirmed to actually occur.
- **Reviewer:** native `Agent` with an explicit tier alias at or above the ceiling.
- **Escalate to `claude -p` pre-start** only when the task genuinely needs something
  native dispatch cannot express: an exact dated model ID (§7.2) or an explicit effort
  level (§7.1). This is a selection, not a fallback.
- **Caveat carried forward:** production-role behavior (`oat-phase-implementer`,
  `oat-reviewer`) was deliberately not probed. This run establishes provider capability
  with a generic agent; `CLA-P02`/p05 still owns whether the production roles actually
  behave this way, and §7.4 flags a concrete reason to check.

## 9. Redaction Statement and Raw-Evidence Manifest

No credentials, tokens, API keys, or unrelated configuration appear in this packet.
Retained identifiers are non-sensitive launcher artifacts: subagent `agentId`s, a CLI
`session_id`/`uuid`, token counts, durations, and a cost figure. Redaction status:
**reviewed**.

Manifest:

- `report.md` — this file.
- `evidence.json` — structured evidence, `schemaVersion: 1`.
- `raw/cli-sentinel.json` — verbatim stdout of the single CLI sentinel (§5).

Native schema and probe evidence is transcribed inline in §3 and §4 rather than
captured to `raw/`, since it originates from live tool schemas and a subagent report
rather than from a redirectable process.
