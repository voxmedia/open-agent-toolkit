# Dispatch Verification — Canned Session Prompts (v2)

> **Status:** validation draft, companion to `protocol.md` v2 and `claims.md`.
> One copy-paste prompt per harness target — Claude, Codex, Cursor IDE, and
> Cursor CLI (the two Cursor flavors verifiably behave differently and are
> separate targets, per discovery Decision #8). Prompts are self-contained by
> design, so input paths appear inline in each prompt.

## Operator Checklist (before pasting)

1. Confirm the target session is **fresh** — it has not read any
   dispatch-contract material this conversation. If it is not fresh, the run
   MUST be labeled `pilot/noncanonical` and the prompt's `run_type` line
   edited accordingly.
2. Open the session in the intended verification worktree. Confirm that
   `pwd` identifies that worktree, the worktree is clean, and note
   `git rev-parse HEAD`.
3. Choose the declared scope (`native-capability`, `cli-capability`, or
   `combined-capability`) and edit the prompt's `scope` line if not using the
   default (`combined-capability`).
4. After the run, verify the packet landed under
   `verification/runs/<harness>/<timestamp>/` and its input hashes match the
   files as committed.

## Path Maintenance

Every prompt resolves the repository from the fresh session's current working
directory and requires every probe to use that same worktree. Until the
flat-to-hierarchical move lands, the authoritative provider drafts are the flat
`references/dispatching-subagents-*-draft.md` files, and that is what the
prompts below reference. **The move commit MUST rewrite the `Read:` block in
all four prompts atomically** (four occurrences; search for
`dispatching-subagents-` in this file).

## Sentinel Strings

`protocol.md` names the nested leaf strings. The CLI sentinel strings are
defined here, symmetrically:

| Harness | Nested leaf sentinel            | CLI sentinel                 |
| ------- | ------------------------------- | ---------------------------- |
| Claude  | `OAT_CLAUDE_NESTED_SENTINEL_OK` | `OAT_CLAUDE_CLI_SENTINEL_OK` |
| Codex   | `OAT_CODEX_NESTED_SENTINEL_OK`  | `OAT_CODEX_CLI_SENTINEL_OK`  |
| Cursor  | `OAT_CURSOR_NESTED_SENTINEL_OK` | `OAT_CURSOR_CLI_SENTINEL_OK` |

## Ledger Dispositions

The prompts encode these final dispositions:

- `CLA-M02` (model-resolution precedence): verified in `evidenceMode: schema`
  from the live schema.
- `CLA-M11` (omit-model runtime inheritance): verified behaviorally by omitting
  the generic topology probe's model selector.
- `CLA-M03` (named agent + explicit model combined): reported as
  supplementary, standing on the noncanonical pilot's evidence — v2 forbids
  production-role probes and the budget contains no other named-role launch.

---

## Claude Verification Prompt

Copy into a fresh Claude Code root session:

```text
You are performing a read-only dispatch verification for the active OAT
project. This is evidence gathering, not implementation and not project work.

run_type: canonical            # pilot/noncanonical if this session is not fresh
scope: combined-capability     # native-capability | cli-capability | combined-capability
harness: claude

Repository:
Use this fresh session's current working directory as the repository root.
Record its absolute `pwd` before reading inputs. Run every native and CLI probe
from that same root; do not switch to or record a different checkout.

Read (in this order, nothing else from references/):
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/claims.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/protocol.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-claude-draft.md
Do NOT read the Codex or Cursor drafts, the execution log, or prior run
packets; do not infer Codex or Cursor behavior.

Provenance (record before any probe):
- git rev-parse HEAD; sha256 of each input file read above
- UTC timestamp; claude CLI version; your own root model as self-reported

Native scope (order matters; declare a deadline in seconds before each launch):
1. Transcribe your root Agent/Task tool schema verbatim and timestamp the
   snapshot: the model parameter's exact allowed values and casing; the
   available agent types; whether any effort parameter exists; the
   schema-documented model-resolution order (explicit call model,
   agent-definition default, parent inheritance). This is claim CLA-M01 and,
   in schema evidence mode only, CLA-M02.
2. Launch exactly ONE generic topology probe: subagent_type "general-purpose"
   with the model selector OMITTED, exercising parent inheritance (CLA-M11).
   Have the child report its runtime model identity if available. Do NOT use a production OAT
   role (oat-phase-implementer, oat-reviewer, oat-codebase-mapper) — their
   contracts correctly refuse probe work. Instruct the probe (read-only, no
   file/shell/repo access): report its available tools; whether it has a
   nested Agent/Task tool; that tool's exact model enum and agent types; WHEN
   its agent-type list became visible (before or after its first nested
   call); and, if nested dispatch exists, launch exactly ONE nested leaf
   sentinel — subagent_type "general-purpose", EXPLICIT model "haiku",
   prompt: 'Reply with exactly this string and nothing else:
   OAT_CLAUDE_NESTED_SENTINEL_OK. Do not use any tools.' The probe reports
   the leaf's complete payload, launch status, and verbatim result
   (CLA-M04, CLA-M05, CLA-M11).
3. Record for every launch, separately: launch_status, child_outcome, the
   complete payload, launcher-appended evidence (agent ids, subagent_tokens,
   tool_uses, duration_ms), and runtime identity if self-reported
   (CLA-M08). Record any continuation handle (SendMessage agent id) as
   CLA-M10 evidence; do not launch a continuation.
4. Observe (do NOT launch) the Workflow tool schema if present: its agent()
   model, effort, and agentType controls, and whether agent types resolve
   from the same registry as the Agent tool (CLA-M06, schema mode).
5. After an accepted launch, do not attempt another role, model, or route
   for that probe. Missing self-reported identity is not launch rejection.

CLI scope (independent; declare it before launching):
6. Capture `claude --help` model controls. Launch at most ONE read-only CLI
   sentinel: claude -p --model <exact full model ID> --output-format json
   'Reply with exactly this string and nothing else:
   OAT_CLAUDE_CLI_SENTINEL_OK'
   Record the JSON evidence, especially modelUsage keys (CLA-M07, CLA-M08).

Report CLA-M03 and CLA-M09 as supplementary (pilot-covered, not re-probed);
report CLA-P01/CLA-P02 and U-P08 under non-coverage. For U-P06/U-P09 record
adherence, not mechanism truth.

Deliverables — write exactly two files (plus optional raw/) to a new
directory named with the run's UTC timestamp:
.oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/runs/claude/<YYYY-MM-DDTHHMMSSZ>/
- report.md following protocol.md "Report Contract"
- evidence.json following protocol.md "Evidence Schema" (schemaVersion 1),
  with one claims[] row for every in-scope claim ID from claims.md
  (Claude native: CLA-M01, CLA-M02, CLA-M04, CLA-M05, CLA-M08, CLA-M10,
  CLA-M11, CLA-S01 + shared U-M01, U-M02, U-M03, U-P06, U-P09; CLI:
  CLA-M07, CLA-M08 + shared U-M02, U-M03, U-P05, U-P06, U-P09;
  deduplicate in combined scope).
Never include credentials or tokens. Do not modify any other file.
```

---

## Codex Verification Prompt

Copy into a fresh Codex root session:

```text
You are performing a read-only dispatch verification for the active OAT
project. This is evidence gathering, not implementation and not project work.

run_type: canonical            # pilot/noncanonical if this session is not fresh
scope: combined-capability     # native-capability | cli-capability | combined-capability
harness: codex

Repository:
Use this fresh session's current working directory as the repository root.
Record its absolute `pwd` before reading inputs. Run every native and CLI probe
from that same root; do not switch to or record a different checkout.

Read (in this order, nothing else from references/):
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/claims.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/protocol.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-codex-draft.md
Do NOT read the Claude or Cursor drafts, the execution log, or prior run
packets; do not infer Claude or Cursor behavior.

Provenance (record before any probe):
- git rev-parse HEAD; sha256 of each input file read above
- UTC timestamp; codex CLI version; your own root model/effort as reported

Native scope (order matters; declare a deadline in seconds before each launch):
1. Transcribe your root native spawn surface verbatim and timestamp the
   snapshot: the spawn/collaboration tool's selectable agent types as your
   live tool schema or materialized configuration exposes them (distinguish
   those two sources explicitly); any model, effort, or inheritance controls
   visible at the root (COD-M01, COD-S01).
2. Record effective agents.max_depth and where the value comes from, without
   changing it (COD-M03).
3. Launch exactly ONE generic topology probe: a read-only coordinator child
   using the most generic available agent type, one explicit model/effort pair,
   and the self-contained `fork_turns: none` mode required by the live schema
   for exact overrides (COD-M08) — do NOT use a production OAT
   task/reviewer role for probe work. Instruct it (read-only, no file/shell
   writes): report its available tools; whether it has a nested spawn tool;
   that tool's exact selectable agent types/models/efforts; and, if nested
   spawn exists, launch exactly ONE depth-2 leaf sentinel with an exact
   selector, prompt: 'Reply with exactly this string and nothing else:
   OAT_CODEX_NESTED_SENTINEL_OK. Do not use any tools.' The probe reports
   the leaf's complete payload, launch status, and verbatim result
   (COD-M02, COD-M04).
4. Record for every launch, separately: launch_status, child_outcome, the
   complete payload, and launcher-owned evidence. Missing child
   self-reported identity is not launch rejection (COD-M06). Record any
   continuation handle if one exists; do not launch a continuation.
5. Inspect (do NOT exercise) the sandbox/filesystem controls relevant to
   write authority, enough to state whether native depth and write authority
   are independent controls (COD-M05, config evidence mode only).
6. After an accepted launch, do not attempt another role, model, or route
   for that probe.

CLI scope (independent; declare it before launching):
7. Capture current `codex exec --help` model and reasoning-effort controls.
   Launch at most ONE read-only CLI sentinel with explicit model and effort:
   codex exec --ephemeral --ignore-rules --sandbox read-only --json
   --model <exact-model> -c 'model_reasoning_effort="<effort>"'
   'Reply with exactly this string and nothing else:
   OAT_CODEX_CLI_SENTINEL_OK' < /dev/null
   Record the invocation, acceptance, and result (COD-M07).

Report U-P08 under non-coverage. For U-P06/U-P09 record adherence, not
mechanism truth.

Deliverables — write exactly two files (plus optional raw/) to a new
directory named with the run's UTC timestamp:
.oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/runs/codex/<YYYY-MM-DDTHHMMSSZ>/
- report.md following protocol.md "Report Contract"
- evidence.json following protocol.md "Evidence Schema" (schemaVersion 1),
  with one claims[] row for every in-scope claim ID from claims.md
  (Codex native: COD-M01, COD-M02, COD-M03, COD-M04, COD-M05, COD-M06,
  COD-M08, COD-S01 + shared U-M01, U-M02, U-M03, U-P06, U-P09; CLI:
  COD-M07 + shared U-M02, U-M03, U-P05, U-P06, U-P09; deduplicate in
  combined scope).
Never include credentials or tokens. Do not modify any other file.
```

---

## Cursor IDE Verification Prompt

Copy into a fresh Cursor IDE root session:

```text
You are performing a read-only dispatch verification for the active OAT
project. This is evidence gathering, not implementation and not project work.

run_type: canonical            # pilot/noncanonical if this session is not fresh
scope: combined-capability     # native-capability | cli-capability | combined-capability
harness: cursor
flavor: ide                    # record this value in evidence.json run.flavor

Repository:
Use this fresh session's current working directory as the repository root.
Record its absolute `pwd` before reading inputs. Run every native and CLI probe
from that same root; do not switch to or record a different checkout.

Read (in this order, nothing else from references/):
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/claims.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/protocol.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-cursor-draft.md
Do NOT read the Claude or Codex drafts, the execution log, or prior run
packets; do not infer Claude or Codex behavior.

Provenance (record before any probe):
- git rev-parse HEAD; sha256 of each input file read above
- UTC timestamp; Cursor version; your own root model as reported

Native scope (order matters; declare a deadline in seconds before each launch):
1. Transcribe your root native Task/Subagent tool schema verbatim and
   timestamp the snapshot: the exact model selector values byte-for-byte
   (treat every slug as opaque; never normalize), available agent/role
   types, and the documented omit-model behavior (CUR-M01, CUR-M02,
   CUR-M03 schema mode, CUR-S01).
2. Launch exactly ONE generic read-only topology probe child with an
   EXPLICIT model selector taken byte-for-byte from your current root
   catalog (CUR-M04). Do NOT use a production OAT role. Instruct it
   (read-only, no file/shell access): report whether it has a nested
   Task/Subagent tool; that tool's exact model selector values
   byte-for-byte; and, if a nested selector exists, launch exactly ONE
   nested leaf sentinel with an exact selector from ITS OWN nested catalog,
   prompt: 'Reply with exactly this string and nothing else:
   OAT_CURSOR_NESTED_SENTINEL_OK. Do not use any tools.' If the nested
   catalog has no selector compatible with a bounded sentinel, record that
   and do not force a launch. The probe reports the leaf's complete payload,
   launch status, and verbatim result.
3. Record for every launch, separately: launch_status, child_outcome, the
   complete payload, and any launcher-owned evidence. Runtime identity is
   expected to be absent; record `not-reported` (CUR-M07). Note the snapshot
   time of every catalog read — root and nested catalogs are independent,
   per-invocation observations and may differ or drift (U-M01).
4. After an accepted launch, do not attempt another role, model, or route
   for that probe.

CLI scope (independent; declare it before launching):
5. Enumerate the account catalog: `cursor-agent --list-models` (or the
   current equivalent). Launch at most ONE read-only CLI sentinel with an
   explicit opaque model: cursor-agent --print --output-format json
   --model '<exact-opaque-model>' 'Reply with exactly this string and
   nothing else: OAT_CURSOR_CLI_SENTINEL_OK'
   Record whether any structured Task/selection events are observable; if
   none are, mark CLI Task observability inconclusive — process completion
   alone does not confirm Task selection (CUR-M05, CUR-M06).

Report CUR-P01 and CUR-P02 under non-coverage (p04 contract tests and p05 smoke
own them). For U-P06/U-P09 record adherence, not mechanism truth.

Deliverables — write exactly two files (plus optional raw/) to a new
directory named with the run's UTC timestamp:
.oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/runs/cursor-ide/<YYYY-MM-DDTHHMMSSZ>/
- report.md following protocol.md "Report Contract"
- evidence.json following protocol.md "Evidence Schema" (schemaVersion 1),
  with "flavor": "ide" added to the run object, and one claims[] row for
  every in-scope claim ID from claims.md
  (Cursor native: CUR-M01, CUR-M02, CUR-M03, CUR-M04, CUR-M07, CUR-S01 +
  shared U-M01, U-M02, U-M03, U-P06, U-P09; CLI: CUR-M05, CUR-M06,
  CUR-M07, CUR-S01 + shared U-M02, U-M03, U-P05, U-P06, U-P09;
  deduplicate in combined scope).
Never include credentials or tokens. Do not modify any other file.
```

---

## Cursor CLI Verification Prompt

Copy into a fresh `cursor-agent` (headless CLI) root session. This flavor is
a separate harness target: prior structured probes observed zero native Task
events here even for positive controls, so this run either produces the
first structured native evidence for the CLI flavor or documents its actual
sanctioned surface. `inconclusive` with `probe_status: executed` is a valid,
expected outcome — do not force agreement with IDE results.

```text
You are performing a read-only dispatch verification for the active OAT
project. This is evidence gathering, not implementation and not project work.

run_type: canonical            # pilot/noncanonical if this session is not fresh
scope: combined-capability     # native-capability | cli-capability | combined-capability
harness: cursor
flavor: cli                    # record this value in evidence.json run.flavor

Repository:
Use this fresh session's current working directory as the repository root.
Record its absolute `pwd` before reading inputs. Run every native and CLI probe
from that same root; do not switch to or record a different checkout.

Read (in this order, nothing else from references/):
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/claims.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/protocol.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-cursor-draft.md
Do NOT read the Claude or Codex drafts, the execution log, or prior run
packets; do not infer Claude, Codex, or Cursor IDE behavior.

Provenance (record before any probe):
- git rev-parse HEAD; sha256 of each input file read above
- UTC timestamp; cursor-agent version; your own root model as reported

Native scope (order matters; declare a deadline in seconds before each launch):
1. State whether your live tool schema exposes a native Task/Subagent tool
   AT ALL in this headless flavor. If yes, transcribe it verbatim and
   timestamp the snapshot: exact model selector values byte-for-byte (treat
   every slug as opaque; never normalize), available agent/role types, and
   documented omit-model behavior (CUR-M01, CUR-M02, CUR-M03 schema mode,
   CUR-S01). If no such tool exists, record probe_status: blocked for the
   launch-dependent native claims with the schema absence as evidence, and
   skip to the CLI scope.
2. If the tool exists, launch exactly ONE generic read-only topology probe
   child with an EXPLICIT model selector taken byte-for-byte from your
   current catalog (CUR-M04). Do NOT use a production OAT role. Instruct it
   (read-only, no file/shell access): report whether it has a nested
   Task/Subagent tool; that tool's exact selector values byte-for-byte;
   and, if a nested selector exists, launch exactly ONE nested leaf
   sentinel with an exact selector from ITS OWN nested catalog, prompt:
   'Reply with exactly this string and nothing else:
   OAT_CURSOR_NESTED_SENTINEL_OK. Do not use any tools.' If the nested
   catalog has no selector compatible with a bounded sentinel, record that
   and do not force a launch.
3. Capture every structured event your runtime emits for these launches
   (Task/selection events, JSON stream records). Whether structured
   native-dispatch evidence is observable in this flavor is itself a
   primary claim (CUR-M06): if a launch appears to run but emits no
   structured selection evidence, record the claim verdicts as
   inconclusive with probe_status: executed — process completion alone
   does not confirm Task selection.
4. Record for every launch, separately: launch_status, child_outcome, the
   complete payload, and any launcher-owned evidence. Runtime identity is
   expected to be absent; record `not-reported` (CUR-M07). Timestamp every
   catalog read (U-M01). After an accepted launch, do not attempt another
   role, model, or route for that probe.

CLI scope (independent; declare it before launching):
5. Enumerate the account catalog: `cursor-agent --list-models` (or the
   current equivalent). Launch at most ONE read-only sentinel as a FRESH
   child process with an explicit opaque model. Workspace trust for this
   verification worktree has been explicitly approved by the operator:
   cursor-agent --trust --print --output-format json
   --model '<exact-opaque-model>' 'Reply with exactly this string and
   nothing else: OAT_CURSOR_CLI_SENTINEL_OK'
   This is a separate process, not your own session (CUR-M05). If your
   environment forbids spawning a child process, record probe_status:
   blocked with the refusal as evidence.

Report CUR-P01 and CUR-P02 under non-coverage (p04 contract tests and p05 smoke
own them). For U-P06/U-P09 record adherence, not mechanism truth.

Deliverables — write exactly two files (plus optional raw/) to a new
directory named with the run's UTC timestamp:
.oat/projects/shared/oat-project-fixture/references/dispatching-subagents/verification/runs/cursor-cli/<YYYY-MM-DDTHHMMSSZ>/
- report.md following protocol.md "Report Contract"
- evidence.json following protocol.md "Evidence Schema" (schemaVersion 1),
  with "flavor": "cli" added to the run object, and one claims[] row for
  every in-scope claim ID from claims.md
  (Cursor native: CUR-M01, CUR-M02, CUR-M03, CUR-M04, CUR-M06, CUR-M07,
  CUR-S01 + shared U-M01, U-M02, U-M03, U-P06, U-P09; CLI: CUR-M05,
  CUR-M06, CUR-M07, CUR-S01 + shared U-M02, U-M03, U-P05, U-P06, U-P09;
  deduplicate in combined scope).
Never include credentials or tokens. Do not modify any other file.
```
