---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-07
oat_current_task_id: p01-t03
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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 3     | 2/3       |
| Phase 2 | pending     | 4     | 0/4       |

**Total:** 2/25 tasks completed

---

## Phase 1: Kickoff Revalidation and Blocking Experiments

**Status:** in_progress
**Started:** 2026-07-06

### Phase Summary (fill when phase is complete)

**Outcome (what changed):** Pending p01-t02 and p01-t03.

**Key files touched:** Pending.

**Verification:** Pending.

**Notes / Decisions:** Pending.

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
**Commit:** pending

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

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-07

**Session Start:** p01 implementation

- [x] p01-t01: Re-confirm shipped dispatch surfaces against merged main - 3b367095
- [x] p01-t02: Characterize Cursor invalid-model behavior - commit pending
- [ ] p01-t03: Decide stamp record format and declaration path - pending

**What changed (high level):**

- Revalidated the shipped dispatch-policy, ceiling adapter, resolver, and gate
  avoidance surfaces against the merged worktree.
- Ran live Cursor model probes with the local `cursor-agent` binary and recorded
  the valid, invalid, display-name, `models`, and `--list-models` behavior.

**Decisions:**

- No design update was needed for p01-t01; shipped reality matches the design's
  grounding closely enough to continue to the blocking Cursor experiment.
- Cursor invalid `--model` values hard-error, so declared Cursor stamps for
  OAT-pinned dispatches can be high-confidence without mandatory observed
  corroboration. Slugs remain the preferred config/matrix representation.

**Follow-ups / TODO:**

- Resolve the Dispatch Notes grammar and launcher declaration path in p01-t03.

**Blockers:**

- None.

**Session End:** pending

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

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

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
