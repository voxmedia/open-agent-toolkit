---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-07
oat_current_task_id: p02-t01
oat_generated: false
---

# Implementation: multi-family-dispatch

**Started:** 2026-07-06
**Last Updated:** 2026-07-07

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 3     | 3/3       |
| Phase 2 | pending   | 4     | 0/4       |

**Total:** 3/25 tasks completed

---

## Phase 1: Kickoff Revalidation and Blocking Experiments

**Status:** completed
**Started:** 2026-07-06

### Phase Summary

**Outcome (what changed):**

- Reconfirmed the shipped dispatch surfaces before building on the design.
- Ran the blocking live Cursor behavior experiment and updated stamp-confidence
  rules: invalid Cursor `--model` values hard-error, so OAT-pinned Cursor
  declarations can be high-confidence.
- Resolved the producer-stamp grammar and declaration path for later
  implementation phases.

**Key files touched:**

- `.oat/projects/shared/multi-family-dispatch/design.md` - recorded updated
  Cursor confidence rules, the Dispatch Notes grammar, and launcher declaration
  decision.
- `.oat/projects/shared/multi-family-dispatch/implementation.md` - recorded
  task outcomes, command evidence, and verification results.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass (p01-t01)
- Run: live `cursor-agent` experiment commands listed under p01-t02
- Result: pass (valid slug exit 0; invalid slug exit 1 hard error; display name
  exit 0; `models` catalog exit 0 with API key; `--list-models` exit 1 under
  locked keychain)
- Run: `grep -n "producer=" .oat/projects/shared/multi-family-dispatch/design.md`
- Result: pass (exit code 0; grammar appears in the design)

**Notes / Decisions:**

- Stamp grammar is a single-line `Dispatch:` key=value record with required
  `producer=<slug|unknown> provenance=declared|observed|inferred|unknown
role=implementer|fix|reviewer`.
- Launcher declaration is available for OAT-owned dispatches from the actual
  dispatch payload; no new ambient `OAT_CURRENT_TARGET` environment variable is
  introduced in this slice.

### Task p01-t01: Re-confirm shipped dispatch surfaces against merged main

**Status:** completed
**Commit:** 3b367095

**Outcome (required when completed):**

- Reconfirmed the shipped dispatch-policy surfaces in the merged worktree before
  running any Cursor behavior experiments.
- No design drift was found that contradicts the phase plan. The design remains
  grounded in shipped reality: policy state is still `dispatchPolicy { mode,
policy }` plus legacy `dispatchCeiling.providers.{codex,claude}`, gate
  avoidance is still `same-runtime | none`, and no producer-identity stamp is
  present in shipped source.

**Files changed:**

- `.oat/projects/shared/multi-family-dispatch/implementation.md` - recorded the
  kickoff revalidation results.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass (tsc completed with exit code 0)

**Notes / Decisions:**

- `packages/cli/src/config/oat-config.ts` still defines
  `WorkflowDispatchPolicy` as `mode: managed|inherit` with
  `policy: economy|balanced|high|frontier|uncapped`; the legacy ceiling provider
  shape still accepts only `codex` and `claude`.
- `GateAvoid` and the gate command's local `CrossProviderAvoid` still accept
  only `same-runtime | none`; `parseCrossProviderAvoid` still defaults to
  `same-runtime`.
- `BUILTIN_EXEC_TARGETS` still includes `cursor-default` as
  `['cursor-agent', '-p']` with no pinned `--model`, matching the design's
  inherited-Cursor gate concern.
- `packages/cli/src/providers/ceiling/registry.ts` still registers only Codex
  and Claude adapters. Unknown providers, including Cursor, fall back to
  `supportsCeiling: false` / `mechanism: none`.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` still emits the
  additive resolver shape with `providers.<provider>.dispatchArgs`,
  `verifyOnDispatch`, and `selection`; unsupported providers remain advisory or
  unsupported rather than enforced.
- A source search for producer/stamp terminology found no shipped producer
  stamp implementation. Existing "Dispatch:" lines are skill/log convention
  only and do not carry resolved identity.

**Issues Encountered:**

- None.

---

### Task p01-t02: {Task Name}

**Status:** completed
**Commit:** bad77fec

**Outcome (required when completed):**

- Characterized the live Cursor invalid-model behavior. Invalid model values
  hard-error before dispatch with exit code 1; they do not silently fall back to
  the default model.
- Confirmed a valid slug dispatch succeeds and the stream-json init event echoes
  the display model (`"Composer 2.5"`).
- Confirmed the display name `"Composer 2.5"` is also accepted by `--model`.
- Confirmed `cursor-agent models` is the usable live catalog surface on this
  machine when `--api-key "$CURSOR_API_KEY"` is supplied, while `--list-models`
  still fails against the locked login keychain.

**Files changed:**

- `.oat/projects/shared/multi-family-dispatch/implementation.md` - recorded the
  live experiment commands, output shape, and exit codes.
- `.oat/projects/shared/multi-family-dispatch/design.md` - updated Cursor stamp
  confidence and invalid-model error handling rules.

**Verification:**

- Run:
  - `cursor-agent --api-key "$CURSOR_API_KEY" models`
  - `cursor-agent --api-key "$CURSOR_API_KEY" --list-models`
  - `cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model composer-2.5 "Reply exactly OK."`
  - `cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model definitely-not-a-model "Reply exactly OK."`
  - `cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model "Composer 2.5" "Reply exactly OK."`
- Result: pass. Required behaviors recorded with exit codes below.

**Command results:**

1. Auth/keychain context:

```text
command -v cursor-agent
/Users/tstang/.local/bin/cursor-agent

cursor-agent status
✓ Logged in as thomas.stang@voxmedia.com
__EXIT_CODE__=0

cursor-agent models
Error: Your macOS login keychain is locked.
Run security unlock-keychain and try again.
__EXIT_CODE__=1
```

2. Catalog surface:

```text
cursor-agent --api-key "$CURSOR_API_KEY" models
Available models

auto - Auto
gpt-5.3-codex-low - Codex 5.3 Low
gpt-5.3-codex-low-fast - Codex 5.3 Low Fast
gpt-5.3-codex - Codex 5.3
gpt-5.3-codex-fast - Codex 5.3 Fast
gpt-5.3-codex-high - Codex 5.3 High
gpt-5.3-codex-high-fast - Codex 5.3 High Fast
gpt-5.3-codex-xhigh - Codex 5.3 Extra High
gpt-5.3-codex-xhigh-fast - Codex 5.3 Extra High Fast
...
composer-2.5 - Composer 2.5 (current)
...
composer-2.5-fast - Composer 2.5 Fast (default)
...
glm-5.2-high - GLM 5.2
glm-5.2-max - GLM 5.2 Max

Tip: use --model <id> (or /model <id> in interactive mode) to switch. Parameterized models also accept quoted overrides, e.g. --model 'claude-opus-4-8[context=1m,effort=high,fast=false]'.
__EXIT_CODE__=0
```

```text
cursor-agent --api-key "$CURSOR_API_KEY" --list-models
Error: Your macOS login keychain is locked.
Run security unlock-keychain and try again.
__EXIT_CODE__=1
```

3. Valid slug dispatch and init-event model echo:

```text
cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model composer-2.5 "Reply exactly OK."
{"type":"system","subtype":"init","apiKeySource":"flag","cwd":"/Users/tstang/orca/workspaces/open-agent-toolkit/multi-family-dispatch","session_id":"21fabfe9-6375-4424-909c-f902d39d5e50","model":"Composer 2.5","permissionMode":"default"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"OK"}]},"session_id":"21fabfe9-6375-4424-909c-f902d39d5e50","timestamp_ms":1783428022711}
{"type":"result","subtype":"success","duration_ms":10416,"duration_api_ms":10416,"is_error":false,"result":"OK","session_id":"21fabfe9-6375-4424-909c-f902d39d5e50","request_id":"fe4fa8c9-cc26-4f04-b3f8-4f60164ff2d7","usage":{"inputTokens":31,"outputTokens":45,"cacheReadTokens":18222,"cacheWriteTokens":0}}
__EXIT_CODE__=0
```

4. Invalid slug behavior:

```text
cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model definitely-not-a-model "Reply exactly OK."
Cannot use this model: definitely-not-a-model. Available models: auto, gpt-5.3-codex-low, gpt-5.3-codex-low-fast, gpt-5.3-codex, gpt-5.3-codex-fast, gpt-5.3-codex-high, ... glm-5.2-high, glm-5.2-max
__EXIT_CODE__=1
```

5. Display-name acceptance:

```text
cursor-agent --api-key "$CURSOR_API_KEY" -p --mode ask --trust --output-format stream-json --model "Composer 2.5" "Reply exactly OK."
{"type":"system","subtype":"init","apiKeySource":"flag","cwd":"/Users/tstang/orca/workspaces/open-agent-toolkit/multi-family-dispatch","session_id":"bd71d7f4-6319-463a-9350-eb5ea3715fd2","model":"Composer 2.5","permissionMode":"default"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"OK"}]},"session_id":"bd71d7f4-6319-463a-9350-eb5ea3715fd2"}
{"type":"result","subtype":"success","duration_ms":4784,"duration_api_ms":4784,"is_error":false,"result":"OK","session_id":"bd71d7f4-6319-463a-9350-eb5ea3715fd2","request_id":"92d4814e-c770-4282-b22d-8288bfccc8fb","usage":{"inputTokens":12280,"outputTokens":33,"cacheReadTokens":5943,"cacheWriteTokens":0}}
__EXIT_CODE__=0
```

**Notes / Decisions:**

- Design confidence rule changed: Cursor `declared` stamps from OAT-pinned
  `--model` dispatches qualify as high-confidence without mandatory
  corroboration because invalid values hard-error. `observed` init-event echoes
  remain useful for mismatch detection.
- Matrix/config values should still prefer slugs even though display names are
  accepted, because `cursor-agent models` exposes stable slug/display pairs and
  display names are more likely to drift.
- `--list-models` is not the most reliable catalog path in this environment:
  it failed with the login keychain locked even when `--api-key` was supplied.
  `cursor-agent --api-key "$CURSOR_API_KEY" models` succeeded and exposed both
  `(current)` and `(default)` markers.

---

### Task p01-t03: Decide stamp record format and declaration path

**Status:** completed
**Commit:** e8af2821

**Outcome (required when completed):**

- Resolved the formalized Dispatch Notes grammar as one line of parseable
  `key=value` fields:
  `Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>`.
- Chose the launcher declaration path: OAT-owned dispatches stamp producer
  identity from the same concrete dispatch payload sent to the harness
  (`cursor-agent --model`, Claude Task `model`, Codex pinned variant and/or
  `codex exec --model`). Probe-only identity remains a fallback/corroboration
  path and is not a high-confidence declaration.

**Files changed:**

- `.oat/projects/shared/multi-family-dispatch/design.md` - resolved the two
  remaining open questions and updated the revalidation checklist.
- `.oat/projects/shared/multi-family-dispatch/implementation.md` - recorded the
  p01-t03 outcome and phase summary.

**Verification:**

- Run: `grep -n "producer=" .oat/projects/shared/multi-family-dispatch/design.md`
- Result: pass:

```text
138:Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>
144:only on exact match, otherwise they degrade to `producer=unknown
146:`producer=unknown provenance=unknown`. Legacy `Dispatch:` lines without these fields are
360:  (`producer=<slug|unknown> provenance=<declared|observed|inferred|unknown>
__EXIT_CODE__=0
```

**Notes / Decisions:**

- Values are single tokens. Display-name-only Cursor observations must map
  exactly through the live catalog before being written as `producer=<slug>`;
  otherwise they degrade to `producer=unknown`.
- Legacy `Dispatch:` lines without producer fields remain best-effort parseable
  as `provenance=unknown`.

**Issues Encountered:**

- None.

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-07 07:59

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p01   | DONE_WITH_CONCERNS | pass   | 1/2            | completed   |

#### Parallel Groups

- p01: sequential.

#### Dispatch Notes

- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p01 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented                                                                          | Actual / Accepted                                                                                  | Reason                                                    | Source of Truth          | Follow-up                                                   |
| ------------- | --------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| p01-t02       | design.md       | Cursor declared stamps were medium confidence until invalid-model behavior was characterized. | Cursor invalid `--model` values hard-error; OAT-pinned Cursor declarations can be high confidence. | Live binary experiment resolved the blocking uncertainty. | design.md updated in p01 | Implement p02/p04 confidence logic from the updated design. |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-07

**Session Start:** p01 implementation

- [x] p01-t01: Re-confirm shipped dispatch surfaces against merged main - 3b367095
- [x] p01-t02: Characterize Cursor invalid-model behavior - bad77fec
- [x] p01-t03: Decide stamp record format and declaration path - e8af2821

**What changed (high level):**

- Revalidated the shipped dispatch-policy, ceiling adapter, resolver, and gate
  avoidance surfaces against the merged worktree.
- Ran live Cursor model probes with the local `cursor-agent` binary and recorded
  the valid, invalid, display-name, `models`, and `--list-models` behavior.
- Resolved the producer-stamp grammar and declaration path for the later
  identity reader/writer implementation.

**Decisions:**

- No design update was needed for p01-t01; shipped reality matches the design's
  grounding closely enough to continue to the blocking Cursor experiment.
- Cursor invalid `--model` values hard-error, so declared Cursor stamps for
  OAT-pinned dispatches can be high-confidence without mandatory observed
  corroboration. Slugs remain the preferred config/matrix representation.
- Producer stamps use `producer`, `provenance`, and `role` fields on
  single-line Dispatch Notes; OAT-owned launcher dispatch args are the
  declaration source.

**Follow-ups / TODO:**

- Run the p01 external phase review gate, then continue with p02-t01.

**Blockers:**

- None.

**Session End:** 2026-07-07 - p01 implementation complete

---

### 2026-07-06

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                   | Passed | Failed | Coverage |
| ----- | ----------------------------------------------------------- | ------ | ------ | -------- |
| 1     | type-check; live cursor-agent probes; grep producer grammar | yes    | 0      | n/a      |
| 2     | -                                                           | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
