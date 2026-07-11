# Claude Dispatch Verification — 2026-07-11T20:11:20Z

> **Run status: PILOT / NONCANONICAL.** This session had already read the
> provider-neutral draft, all three harness drafts, the execution log, and the
> live peer (Codex) critique before probing — it is not the fresh session the
> protocol requires for promotion-grade evidence. Purpose of this run:
> (a) answer the Claude nesting open question, (b) stress-test the
> verification protocol and result schema against a real execution.
> A fresh-session canonical run should follow the revised protocol.

## Provenance

- repository commit: `e7b63f0246c6be9be164a0df84317b1cf93f0519`
- input file hashes (sha256):
  - `dispatching-subagents-draft.md`: `7502071f5da8…0661b7f8da6`
  - `dispatching-subagents-claude-draft.md`: `5d50fad0692c…7811ac3c57d0`
  - `dispatching-subagents-verification.md`: `bf4f97435708…145bfdd6facb3`
- fresh session: **no** (see run status)
- probe budget note: two coordinator-level launches were made (C1 role probe,
  C2 generic probe). C1 returned zero schema evidence by role-contract design;
  C2 was launched under the revised budget already agreed with the peer
  session (one coordinator probe + optional depth-2 leaf sentinel + one CLI
  control). Recorded as a deliberate, documented deviation from the original
  "at most one nested sentinel" wording.

## Runtime

- harness: Claude Code (interactive root session)
- root model: Opus 4.8 — `claude-opus-4-8[1m]` (self-reported in system prompt)
- working directory: `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture`
- relevant versions: Claude Code CLI `2.1.207`; harness = desktop/CLI session

## Root Native Catalog

- enumeration source: live `Agent` tool JSON schema of this root invocation
  (snapshot taken 2026-07-11T20:11Z; treat as dated snapshot, not mechanism)
- exact model values (`model` parameter enum, verbatim):
  `"sonnet" | "opus" | "haiku" | "fable"`
  — **tier aliases, not exact model IDs.** No effort parameter exists on this
  surface.
- agent types (role axis, separate from model axis): `claude`,
  `claude-code-guide`, `codex:codex-rescue`,
  `consensus:consensus-section-runner`, `Explore`, `general-purpose`,
  `oat-codebase-mapper`, `oat-phase-implementer`, `oat-reviewer`, `Plan`,
  `skeptical-evaluator`, `statusline-setup`
- inheritance option (mechanism, schema-documented): three-level resolution —
  explicit call `model` → agent-definition frontmatter `model` → parent
  inheritance. The middle level (named-agent default) is a distinct route the
  draft contract does not currently name.

## Nested Native Catalog

- coordinator role/model: probe C2 = `general-purpose` pinned `model: sonnet`
  (probe C1 = `oat-phase-implementer` pinned `sonnet`; see Native Sentinel)
- nested tool available: **yes** — full `Agent` tool present in the child
- exact roles/models: model enum `["sonnet", "opus", "haiku", "fable"]` and
  the same 12 agent types as the root — **nested catalog identical to root**
  in this session (snapshot fact). This is unlike Cursor, where the nested
  catalog collapsed to a single model.
- differs from root: no (this session)
- timing nuance: the child observed its agent-type list (system-reminder)
  only _after_ making its nested call, not before — nested-catalog
  enumeration may lag the tool schema within a child invocation.

## Native Sentinel

Probe C1 — named coordinator role probe:

- requested payload: `subagent_type: oat-phase-implementer`,
  `model: sonnet`, read-only schema-transcription instructions
- accepted: **yes** (launch accepted, child executed and returned)
- result: `NEEDS_CONTEXT` — the agent's operating contract only accepts
  `Phase Scope`/`Task Scope` dispatches; it explicitly declined to transcribe
  tool schemas or launch subagents outside a verified task dispatch, and
  stated it performed no reads/writes/shell/nested launches.
- classification: **acceptance ≠ cooperation.** Launch acceptance is
  launcher-owned evidence; a named OAT agent's role contract independently
  governs what the child will do. Desirable safety behavior; breaks the
  verification protocol as written (see Contract Corrections).

Probe C2 — generic coordinator probe + depth-2 leaf sentinel:

- requested payload (coordinator): `subagent_type: general-purpose`,
  `model: sonnet`, same read-only instructions
- accepted: yes; child self-reported "Sonnet 5 / `claude-sonnet-5`,"
  corroborating the explicit pin
- nested leaf payload (reported verbatim by coordinator):
  `subagent_type: "general-purpose"`, `model: "haiku"`,
  `run_in_background: false`, sentinel echo prompt
- nested leaf accepted: yes
- result: `OAT_CLAUDE_NESTED_SENTINEL_OK` — **depth-2 native nesting works**
- configured-invocation evidence: harness-appended per-child records — agent
  id handles (`agentId: aa8309768523f303b` coordinator,
  `a47365883e67060f5` leaf) and usage blocks
  (`subagent_tokens`, `tool_uses`, `duration_ms` per child)
- runtime-identity evidence: children self-report model name and exact model
  ID from their system prompt (optional diagnostic layer — present on Claude)
- continuation: returned agent ids are continuable via `SendMessage` — an
  accepted child is resumable, a route the contract's terminality language
  does not currently classify.

## CLI Surface

- help/model enumeration commands: `claude --help` — `--model <model>`
  accepts "an alias for the latest model (e.g. 'fable', 'opus', or 'sonnet')"
  or a full model name; `-p/--print` for non-interactive runs. No separate
  effort flag observed.
- exact model controls: full exact model IDs accepted (stronger than the
  native surface's tier aliases)
- read-only sentinel requested payload:
  `claude -p --model claude-haiku-4-5-20251001 --output-format json '<echo prompt>'`
- accepted: yes (exit success, `is_error: false`)
- result: `OAT_CLAUDE_CLI_SENTINEL_OK`; JSON evidence includes
  `modelUsage` keyed by exact model ID `claude-haiku-4-5-20251001`,
  `session_id`, cost, token, and duration fields — **launcher-owned runtime
  identity corroboration exists on the CLI route** (per-model usage keying),
  beyond mere acceptance.

## Claim Verdicts

Claims numbered per `dispatching-subagents-claude-draft.md` §Claims for
Concurrent Claude Verification. `probe_status: executed` unless noted.

| #   | Claim                                                       | Verdict                                      | Evidence                                                                                                                                                                  |
| --- | ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Enumerate root Task exact explicit model choices            | **confirmed** (with correction)              | Enum is `sonnet\|opus\|haiku\|fable` — tier aliases, not exact model IDs; exactness on the native surface means "tier alias passed unchanged"                             |
| 2   | Omit-model inheritance behavior                             | **confirmed (mechanism, schema-documented)** | Schema states explicit model → agent-definition frontmatter model → parent inherit; live omit-model launch not run (`probe_status: not_run` for behavioral corroboration) |
| 3   | Coordinator has nested Task tool                            | **confirmed**                                | C2 child had the full `Agent` tool; caveat: named OAT coordinator (`oat-phase-implementer`) refuses schema transcription by role contract (C1)                            |
| 4   | Nested explicit model choices                               | **confirmed (snapshot)**                     | Identical to root enum + agent types this session                                                                                                                         |
| 5   | Bounded nested sentinel with exact model                    | **confirmed**                                | `OAT_CLAUDE_NESTED_SENTINEL_OK` at depth 2, `model: haiku` explicit                                                                                                       |
| 6   | Complete Task payload + acceptance evidence                 | **confirmed**                                | Payloads recorded verbatim in evidence.json; acceptance + usage blocks are launcher-appended                                                                              |
| 7   | Runtime identity observable separately from requested model | **confirmed**                                | Children self-report model name + exact ID; CLI JSON `modelUsage` keyed by exact model ID                                                                                 |
| 8   | `claude -p` model controls + one exact-model probe          | **confirmed**                                | `--model` accepts alias or full ID; probe with full ID succeeded; JSON evidence captured                                                                                  |
| 9   | Named agent instructions + per-call model combinable        | **confirmed**                                | Both C1 (`oat-phase-implementer`+`sonnet`) and C2 (`general-purpose`+`sonnet`) accepted with explicit model; note acceptance ≠ cooperation (C1)                           |
| 10  | Classify every claim                                        | **confirmed**                                | This table                                                                                                                                                                |

## Contract Corrections

1. **Model axis granularity differs by surface.** Native Agent dispatch pins
   tier aliases (4 values); the CLI pins exact model IDs. The contract's
   "exact target" definition holds (payload passed unchanged) but the Claude
   reference must state the two surfaces' different granularity.
2. **Three-route model resolution.** Explicit pin / named-agent frontmatter
   default / parent inheritance. The named-agent default is neither "exact"
   nor "inherited" in the draft's vocabulary and is precisely the route that
   could unintentionally satisfy or violate "never silently inherit."
3. **Coordinator sentinels must use a generic agent type on Claude.** The
   named coordinator role (`oat-phase-implementer`) rejects non-scoped
   dispatches with `NEEDS_CONTEXT` by contract. The protocol's "launch a
   phase coordinator sentinel and ask for its nested catalog" cannot be
   executed against the real coordinator role. (This is good production
   behavior — keep it — but the verification protocol must route topology
   probes through `general-purpose` or equivalent.)
4. **Acceptance ≠ cooperation.** A launch can be accepted and still yield a
   contract refusal. Evidence records should carry both `launch_status` and
   a distinct `child_outcome`.
5. **Children are continuable (`SendMessage` agent ids).** Terminality
   language should classify continuation-of-an-accepted-child as distinct
   from a forbidden second launch.
6. **Runtime identity is available on Claude** (self-report + CLI
   `modelUsage`). The three-layer evidence model's `not-reported` default is
   too pessimistic for this harness; the Claude reference should say which
   fields exist.
7. **Effort axis (out-of-scope observation).** The native Agent surface has
   no effort parameter (draft's `effort_axis=not-applicable` holds there).
   The root session's `Workflow` surface exposes `agent(…, {effort, model,
agentType})` with `effort: low|medium|high|xhigh|max` and agent types
   "resolved from the same registry as the Agent tool" (schema text). Whether
   OAT sanctions Workflow as a dispatch surface is a p04 design decision;
   the Claude reference should not claim Claude has no effort control.
8. **Per-child usage accounting exists** (`subagent_tokens`, `tool_uses`,
   `duration_ms`) — usable as launcher-owned dispatch-evidence fields.

## Coverage / Non-Coverage

Covered: root catalog transcription; named-role + generic coordinator
launches; depth-2 nested sentinel; CLI help + exact-model CLI sentinel;
runtime-identity observation.

Not covered (out of scope for this probe): review-routing behavior (planning
inherit / implementation at-ceiling / gate targets — p05 live-smoke scope);
live omit-model inheritance behavior; background (`run_in_background: true`)
dispatch; Workflow-surface dispatch of named OAT roles; nesting beyond
depth 2; catalog stability across sessions.

## Recommended Harness Topology

Native-first, nesting-capable:

```text
Claude root
  → Agent(subagent_type=oat-phase-implementer, model=<explicit tier>)  [phase coordinator]
      → Agent(subagent_type=<task role>, model=<explicit tier>)        [task worker, depth 2 confirmed]
  → Agent(subagent_type=oat-reviewer, model=<ceiling tier>)            [implementation reviewer]
```

- Depth-2 native coordinator→worker nesting is **supported** (answers the
  design open question positively).
- Model pins are tier aliases; when a configured ladder names exact Claude
  model IDs, the native surface cannot express them — that is the Claude
  form of catalog mismatch, and the `claude -p --model <exact-id>` CLI route
  is the recorded pre-start alternative for exact-ID pinning.
- Role contracts (`NEEDS_CONTEXT`) are enforced by the OAT agent definitions
  independent of launch acceptance — dispatch records should capture child
  outcome separately.
