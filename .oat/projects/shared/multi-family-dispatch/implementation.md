---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-07
oat_current_task_id: null
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
| Phase 2 | completed | 4     | 4/4       |
| Phase 3 | completed | 7     | 7/7       |
| Phase 4 | completed | 4     | 4/4       |
| Phase 5 | completed | 3     | 3/3       |
| Phase 6 | completed | 4     | 4/4       |
| Phase 7 | completed | 4     | 4/4       |

**Total:** 29/29 tasks completed

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
✓ Logged in as <redacted>
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

## Phase 2: Shared Identity Foundation

**Status:** completed
**Started:** 2026-07-07

### Phase Summary

**Outcome (what changed):**

- Started the shared identity foundation with a tested model-family classifier.
- Added provenance/confidence resolution for declared, observed, inferred, and
  unknown identity records.
- Added `oat internal cursor-current-target` as the shared Cursor current-model
  probe helper.
- Added pure producer-identity stamp formatting and parsing helpers, including
  legacy Dispatch-line tolerance and grouped producer identity reads.

**Key files touched:**

- `packages/cli/src/providers/identity/family.ts` - classifies model strings
  and structured provider IDs into family buckets.
- `packages/cli/src/providers/identity/family.test.ts` - covers representative
  slugs, display names, provider IDs, unknown values, and malformed input.
- `packages/cli/src/providers/identity/provenance.ts` - resolves identity
  confidence, mismatch handling, and diversity-claimability.
- `packages/cli/src/providers/identity/provenance.test.ts` - covers
  corroboration, reject-on-invalid promotion, mismatches, low-confidence
  observations, and unknown identity.
- `packages/cli/src/commands/internal/cursor-current-target.ts` - probes Cursor
  catalog, init-event, and cli-config sources and emits JSON/text results.
- `packages/cli/src/commands/internal/cursor-current-target.test.ts` - covers
  mocked subprocess/file-read probe priority and command output.
- `packages/cli/src/commands/internal/index.ts` - registers the internal
  command.
- `packages/cli/src/providers/identity/stamp.ts` - formats and parses
  producer-identity Dispatch stamps.
- `packages/cli/src/providers/identity/stamp.test.ts` - covers round-trip
  grammar, legacy parsing, grouped reader output, and malformed-line warnings.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/family.test.ts`
- Result: pass (11 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/provenance.test.ts`
- Result: pass (6 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/internal/cursor-current-target.test.ts`
- Result: pass (8 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/stamp.test.ts`
- Result: pass (4 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass after p02-t04 follow-up type-only fix

**Notes / Decisions:**

- Structured provider IDs take precedence over model-value patterns.
- `implementation.md` is updated during p02 task commits per the phase
  dispatch instruction to keep `oat_current_task_id` and task outcomes current;
  code changes remain inside the p02 declared source/test boundaries.

### Task p02-t01: Family classifier module

**Status:** completed
**Commit:** feat(p02-t01): add model family classifier

**Outcome (required when completed):**

- Added `classifyModelFamily({ value, providerId })` with an ordered,
  extensible pattern map and `unknown` fallback.
- Covered Claude, OpenAI, Composer, and GLM slugs/display names, provider-ID
  precedence, unrecognized strings, and malformed runtime values.

**Files changed:**

- `packages/cli/src/providers/identity/family.ts`
- `packages/cli/src/providers/identity/family.test.ts`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/family.test.ts`
  failed because `./family` did not exist.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/family.test.ts`
  passed (11 tests).

**Notes / Decisions:**

- The classifier treats structured provider IDs such as `openai` and
  `anthropic` as stronger than model-name patterns.

**Issues Encountered:**

- None.

---

### Task p02-t02: Identity provenance types and corroboration rules

**Status:** completed
**Commit:** feat(p02-t02): add identity provenance model

**Outcome (required when completed):**

- Added `IdentityProvenance`, `IdentityRecord`, and
  `resolveIdentityConfidence(records)` for declared, observed, inferred, and
  unknown identity inputs.
- Implemented design rules for high-confidence corroboration, uncorroborated
  reject-on-invalid declarations, observed-wins mismatches, low-confidence
  observed/inferred records, and non-claimable unknown identity.

**Files changed:**

- `packages/cli/src/providers/identity/provenance.ts`
- `packages/cli/src/providers/identity/provenance.test.ts`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/provenance.test.ts`
  failed because `./provenance` did not exist.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/provenance.test.ts`
  passed (6 tests).

**Notes / Decisions:**

- Declared/observed mismatch resolves to the observed value, marks
  `mismatch: true`, and downgrades confidence to `low`.

**Issues Encountered:**

- None.

---

### Task p02-t03: Cursor current-model probe helper (`oat internal cursor-current-target`)

**Status:** completed
**Commit:** feat(p02-t03): add cursor current-target probe helper

**Outcome (required when completed):**

- Added the shared `probeCursorCurrentTarget` helper and
  `oat internal cursor-current-target` command.
- Implemented the updated p01/design probe priority:
  `cursor-agent models` (using `CURSOR_API_KEY` when available) first, then
  `--list-models`, then init-event model, then `~/.cursor/cli-config.json`
  `.model`, then explicit `unknown`.
- Enforced exact catalog matching for display-name values; display-name
  disagreements degrade to `unknown` instead of normalizing variants.

**Files changed:**

- `packages/cli/src/commands/internal/cursor-current-target.ts`
- `packages/cli/src/commands/internal/cursor-current-target.test.ts`
- `packages/cli/src/commands/internal/index.ts`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/internal/cursor-current-target.test.ts`
  failed because `./cursor-current-target` did not exist.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/internal/cursor-current-target.test.ts`
  passed (8 tests).

**Notes / Decisions:**

- The implementation follows the p01 finding that `cursor-agent models` with an
  API key can be the reliable live catalog path while `--list-models` may fail
  against a locked login keychain.
- Init-event and cli-config display names must map through an exact live-catalog
  slug/display match; otherwise the helper reports `value: unknown` with the
  strongest surviving inferred source.

**Issues Encountered:**

- None.

---

### Task p02-t04: Producer-identity stamp writer and reader

**Status:** completed
**Commit:** feat(p02-t04): add producer-identity stamp writer/reader

**Outcome (required when completed):**

- Added `formatDispatchStamp(record)` for the p01-t03
  `Dispatch: key=value` grammar.
- Added `parseDispatchStamps(markdown)` with best-effort legacy Dispatch-line
  support, explicit unknown identity/provenance defaults, and warning callbacks
  for skipped malformed lines.
- Added `getProducerIdentitiesByScope(markdown)` to read orchestration-run
  Dispatch Notes into per-scope producer identity records.

**Files changed:**

- `packages/cli/src/providers/identity/stamp.ts`
- `packages/cli/src/providers/identity/stamp.test.ts`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/stamp.test.ts`
  failed because `./stamp` did not exist.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/stamp.test.ts`
  passed (4 tests).
- Phase-wide type-check: initially failed on strict optional access in
  `stamp.ts`; fixed in follow-up commit and passed on rerun.

**Notes / Decisions:**

- Malformed Dispatch lines are skipped through an optional warning callback and
  never throw.
- Legacy lines without `producer`/`provenance` fields parse as
  `producer: unknown` and `provenance: unknown`.

**Issues Encountered:**

- Phase-wide type-check found two strictness errors in `stamp.ts`; fixed within
  the p02-t04 file boundary.

---

## Phase 3: Tier Matrix, Resolver, Cursor Adapter, and Validation Oracles

**Status:** completed
**Started:** 2026-07-07

### Phase Summary

**Outcome (what changed):**

- Extended dispatch-ceiling config into a layered tier matrix with sparse
  project overrides and per-cell source/provenance reporting.
- Registered Cursor as an enforceable model-arg ceiling provider while keeping
  Cursor slugs open-ended and validated through live availability oracles.
- Added set-time, doctor-time, and adopt-time validation for matrix cells.
- Added an opt-in, version-stamped recommended dispatch matrix adoption flow.

**Key files touched:**

- `packages/cli/src/config/oat-config.ts` - matrix cell config model and
  recommendation-version persistence.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - sparse
  project matrix parsing and resolver merge semantics.
- `packages/cli/src/providers/ceiling/registry.ts` - Cursor ceiling adapter.
- `packages/cli/src/providers/identity/availability.ts` - provider availability
  oracle.
- `packages/cli/src/commands/config/index.ts` - set-time validation and
  dispatch-matrix adoption.
- `packages/cli/src/commands/doctor/index.ts` - dispatch matrix drift check.
- `packages/cli/config/dispatch-matrix-recommendation.json` - canonical source
  for the recommended matrix.
- `packages/cli/assets/config/dispatch-matrix-recommendation.json` - bundled
  generated copy read by the shipped CLI.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/ceiling/registry.test.ts src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass

### Task p03-t01: Extend `workflow.dispatchCeiling.providers.*` with matrix cells

**Status:** completed
**Commit:** feat(p03-t01): add dispatch matrix config model

**Outcome (required when completed):**

- Extended the workflow dispatch-ceiling config model so
  `workflow.dispatchCeiling.providers.*` can hold bare provider values,
  per-tier matrix maps, and ordered route cells.
- Preserved legacy bare-value enum validation for `codex` and `claude` while
  allowing open-ended Cursor slugs and route target objects.
- Kept dispatch policy parsing unchanged.

**Files changed:**

- `packages/cli/src/config/oat-config.ts`
- `packages/cli/src/config/oat-config.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
  failed on the new Cursor/matrix cases because provider normalization only
  accepted `codex` and `claude` enum strings.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
  passed (65 tests).

**Notes / Decisions:**

- Unknown tier keys and unknown route-target object keys are ignored during
  normalization, matching the existing config-normalization style.
- Invalid provider shapes are dropped silently; valid siblings continue to
  normalize.

**Issues Encountered:**

- None.

---

### Task p03-t02: Sparse project-layer matrix override in state frontmatter

**Status:** completed
**Commit:** feat(p03-t02): parse sparse project matrix override

**Outcome (required when completed):**

- Parsed `oat_dispatch_policy.matrix` from project `state.md` frontmatter as a
  sparse provider/tier override using the same matrix cell shapes introduced in
  p03-t01.
- Surfaced the parsed project matrix additively in dispatch-ceiling resolution
  output for the p03-t03 merge step.
- Ignored a present but wholly malformed matrix with a warning while preserving
  normal policy and legacy ceiling resolution behavior.

**Files changed:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  failed on missing `matrix` output and malformed-matrix warning behavior.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  passed (41 tests).

**Notes / Decisions:**

- The sparse matrix is parsed and carried forward but does not alter selection
  semantics until the p03-t03 resolver deep-merge task.
- A malformed matrix does not make an otherwise valid project policy invalid.

**Issues Encountered:**

- Corrected the RED test expectation so explicit project policy still wins over
  legacy ceiling state when only the matrix override is malformed.

---

### Task p03-t03: Resolver deep-merge with per-cell source and selection provenance

**Status:** completed
**Commit:** feat(p03-t03): resolve matrix with source and selection provenance

**Outcome (required when completed):**

- Added provider/tier matrix resolution across user, repo, local, and project
  layers, with project matrix cells overriding lower layers.
- Added per-provider `cellSource` plus additive selection metadata:
  `selectionBranch` and classified `family`.
- Preserved existing `selectionMode` and legacy Codex/Claude cap behavior while
  making managed-provider holes unresolved in non-interactive preflight.

**Files changed:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  failed on missing merged matrix value/source/family metadata and missing-cell
  unresolved behavior.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  passed (44 tests).
- Type-check: `pnpm --filter @open-agent-toolkit/cli type-check` passed after
  wiring the additive metadata through the internal resolution type.

**Notes / Decisions:**

- Bare provider cells are treated as `prompt-persisted`; per-tier cells are
  treated as `matrix-pinned`. Ordered route cells currently select the floor;
  p05 owns route escalation behavior.
- Cursor and other open providers can now resolve concrete string cells even
  before an enforcement adapter is registered; without an adapter they remain
  `mode: unsupported`.

**Issues Encountered:**

- None.

---

### Task p03-t04: Cursor ceiling adapter

**Status:** completed
**Commit:** feat(p03-t04): register cursor ceiling adapter

**Outcome (required when completed):**

- Registered a Cursor ceiling adapter with `supportsCeiling: true` and
  `mechanism: model-arg`.
- Compiled opaque Cursor model strings to `{ model: '<slug>' }` for both
  implementer and reviewer roles; blank values compile to `null`.
- Kept `verifyOnDispatch` false because Cursor model choices do not form a
  total ordered tier.
- Updated resolver expectations so resolved Cursor matrix cells report
  `mode: enforced` with model dispatch args, while truly unknown providers
  still use the unsupported fallback.

**Files changed:**

- `packages/cli/src/providers/ceiling/registry.ts`
- `packages/cli/src/providers/ceiling/registry.test.ts`
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/ceiling/registry.test.ts`
  failed because Cursor still used the advisory fallback.
- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  failed because resolved Cursor cells still reported unsupported/no args.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/ceiling/registry.test.ts`
  passed (23 tests).
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
  passed (44 tests).

**Notes / Decisions:**

- Cursor `validValues` remains empty to signal "no closed enum"; validation is
  delegated to the availability oracle in p03-t05.
- The dispatch-ceiling resolver test changed only where Cursor is no longer an
  unknown provider.

**Issues Encountered:**

- None.

---

### Task p03-t05: Availability oracles and set-time validation

**Status:** completed
**Commit:** feat(p03-t05): add availability oracles and set-time validation

**Outcome (required when completed):**

- Added a provider matrix-cell availability oracle with Claude closed-tier
  checks, Codex pinned-role variant checks, and Cursor live catalog checks.
- Validated `workflow.dispatchCeiling.providers.<provider>` values at config
  set time and warned without blocking when values are unknown or cannot be
  validated.
- Preserved Codex/Claude closed enum parsing while allowing open provider
  columns such as Cursor to persist arbitrary non-empty slugs.

**Files changed:**

- `packages/cli/src/providers/identity/availability.ts`
- `packages/cli/src/providers/identity/availability.test.ts`
- `packages/cli/src/commands/config/index.ts`
- `packages/cli/src/commands/config/index.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts`
  failed because the oracle module did not exist.
- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
  failed because dynamic provider keys were not yet recognized/writable.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts`
  passed (8 tests).
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
  passed (89 tests).
- Type-check: `pnpm --filter @open-agent-toolkit/cli type-check` passed.

**Notes / Decisions:**

- Cursor validation uses `cursor-agent models` first and falls back to legacy
  `--list-models` only when the first command does not yield a usable catalog.
- Unknown providers are treated as `unvalidated`, not invalid, so new provider
  columns can be configured before an oracle exists.

**Issues Encountered:**

- None.

---

### Task p03-t06: Dispatch matrix doctor drift check

**Status:** completed
**Commit:** feat(p03-t06): add dispatch matrix doctor check

**Outcome (required when completed):**

- Added a project-scope `project:dispatch_matrix` doctor check that inspects
  configured dispatch-ceiling provider cells.
- Flattened bare provider cells, per-tier matrix cells, and ordered route target
  cells into provider/value/path references for validation.
- Warned on unknown cells and reported unvalidated cells informationally, using
  the p03-t05 availability oracle.

**Files changed:**

- `packages/cli/src/commands/doctor/index.ts`
- `packages/cli/src/commands/doctor/index.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts`
  failed because no dispatch matrix doctor check was emitted.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts`
  passed (21 tests after self-review follow-up).
- Type-check: `pnpm --filter @open-agent-toolkit/cli type-check` passed.

**Notes / Decisions:**

- Empty matrices emit a passing diagnostic (`No configured dispatch matrix cells
found`) so the doctor surface remains explicit.
- Oracle exceptions degrade to `unvalidated` rather than hard-failing doctor or
  producing a warning exit by themselves.

**Issues Encountered:**

- Self-review found the first implementation treated unvalidated-only cells as
  warning exits; fixed in a follow-up p03-t06 commit before p03-t07 work.

---

### Task p03-t07: Recommended default matrix as adopt-time template

**Status:** completed
**Commit:** feat(p03-t07): add adopt-time recommended dispatch matrix

**Outcome (required when completed):**

- Added a bundled dispatch matrix recommendation asset with version
  `2026-07-07.1`.
- Added `oat config adopt dispatch-matrix` with shared/local/user surfaces and
  explicit overwrite confirmation (`--yes` or interactive confirmation).
- Validated every adopted recommendation cell with the availability oracle,
  warning per cell without blocking adoption.
- Persisted `workflow.dispatchCeiling.recommendationVersion` so adopted configs
  remain pinned to the recommendation version until explicitly re-adopted.

**Files changed:**

- `packages/cli/config/dispatch-matrix-recommendation.json`
- `packages/cli/assets/config/dispatch-matrix-recommendation.json`
- `packages/cli/scripts/bundle-assets.sh`
- `packages/cli/src/commands/config/index.ts`
- `packages/cli/src/commands/config/index.test.ts`
- `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- `packages/cli/src/config/oat-config.ts`
- `packages/cli/src/config/oat-config.test.ts`
- `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Verification:**

- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
  failed because `config adopt` did not exist.
- RED: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
  failed because the recommendation version stamp was dropped.
- GREEN: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
  passed (159 tests).
- Type-check: `pnpm --filter @open-agent-toolkit/cli type-check` passed.

**Notes / Decisions:**

- Added typed config-model support for `recommendationVersion`; otherwise
  `writeOatConfig` would have dropped the adoption stamp on the next normalized
  write.
- p03 gate review found that direct commits under `packages/cli/assets/` are
  not canonical because `bundle-assets.sh` deletes and recreates that tree.
  The recommendation now lives at `packages/cli/config/` and is copied into
  `packages/cli/assets/config/` during the package build.
- The adoption command defaults to the local workflow surface, matching other
  workflow config writes, while tests cover the shared surface.

**Issues Encountered:**

- None.

---

## Phase 6: Skills, Docs, Assets, and Release Validation

**Status:** completed
**Started:** 2026-07-07

### Phase Summary

**Outcome (what changed):**

- Propagated matrix-aware dispatch policy guidance into lifecycle skills and the
  state template.
- Updated the docs site for matrix cells, route targets, producer provenance,
  same-family gate avoidance, `models` target expansion, and achieved-diversity
  metadata.
- Re-ran provider-view sync after the lockstep package bump so the tracked sync
  manifest now advertises OAT `0.1.44`.
- Bumped all five public packages in lockstep to `0.1.44` and kept the bundled
  public-package version asset aligned.

**Key files touched:**

- `.agents/skills/oat-project-plan/SKILL.md`
- `.agents/skills/oat-project-quick-start/SKILL.md`
- `.oat/templates/state.md`
- `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- `apps/oat-docs/docs/cli-utilities/configuration.md`
- `apps/oat-docs/index.md`
- `.oat/sync/manifest.json`
- `packages/cli/assets/public-package-versions.json`
- `packages/cli/package.json`
- `packages/control-plane/package.json`
- `packages/docs-config/package.json`
- `packages/docs-theme/package.json`
- `packages/docs-transforms/package.json`
- `packages/cli/src/validation/skills.test.ts`

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass
- Run: `pnpm run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
- Result: pass (generated 9-entry docs app index)
- Run: `pnpm build:docs`
- Result: pass
- Run: `pnpm run cli -- sync --scope all`
- Result: pass (provider views already synchronized; later rerun refreshed `.oat/sync/manifest.json` to `0.1.44`)
- Run: `pnpm run cli -- status --scope project --json`
- Result: pass (`142/142` provider views in sync)
- Run: `git diff --check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

**Notes / Decisions:**

- The original p06-t03 sync commit was intentionally empty because sync reported no
  provider-view changes at that point. After p06-t04 bumped package versions,
  repo-local sync refreshed the tracked manifest `oatVersion` to `0.1.44`.
- The docs-index verification command must target the docs app explicitly from the
  repo root: `--docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.
- Updating `packages/cli/src/validation/skills.test.ts` is accepted p06-t04
  file-list drift because changed canonical skill versions are part of the skill
  validation contract.

### Task p06-t01: Update remaining lifecycle skills and templates

**Status:** completed
**Commit:** 2a83d6d7

**Outcome (required when completed):**

- Updated the plan and quick-start lifecycle skills with matrix-aware dispatch
  policy prompt/persist guidance and route-aware preflight behavior.
- Updated the state template with sparse matrix override guidance.
- Bumped each changed canonical skill frontmatter version once in the final PR
  diff.

**Verification:**

- Run: `pnpm run oat:validate-skills`
- Result: pass

### Task p06-t02: Docs site updates

**Status:** completed
**Commit:** a27a6887

**Outcome (required when completed):**

- Documented dispatch matrix cells, ordered routes, producer provenance, and
  same-family gate behavior across the docs site.
- Regenerated the docs app index using the docs app source/output paths.

**Verification:**

- Run: `pnpm run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
- Result: pass
- Run: `pnpm build:docs`
- Result: pass

### Task p06-t03: Sync provider views and bundled assets

**Status:** completed
**Commit:** fc230617; review fix 8e68d0ec

**Outcome (required when completed):**

- Confirmed provider views were synchronized after the skill/docs updates.
- Refreshed `.oat/sync/manifest.json` to `oatVersion: "0.1.44"` after the lockstep
  public package version bump.

**Verification:**

- Run: `pnpm run cli -- sync --scope all`
- Result: pass
- Run: `pnpm run cli -- status --scope project --json`
- Result: pass (`142/142` provider views in sync)
- Run: `git diff --check`
- Result: pass

### Task p06-t04: Lockstep version bump and release validation

**Status:** completed
**Commit:** dbd87ea2

**Outcome (required when completed):**

- Bumped the five public packages in lockstep to `0.1.44`.
- Updated `packages/cli/assets/public-package-versions.json` to match the public
  package set.
- Updated the skill version validation test for the changed quick-start skill.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: pass
- Run: `pnpm --filter @open-agent-toolkit/cli lint`
- Result: pass
- Run: `pnpm release:validate`
- Result: pass

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 6 — 2026-07-07 12:06

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p06   | DONE_WITH_CONCERNS | pass   | 1/2            | completed   |

#### Parallel Groups

- p06: sequential.

#### Dispatch Notes

- Dispatch: scope=p06 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p06 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p06 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=provider-default dispatch_policy=high dispatch_ceiling=xhigh target=main-orchestrator
- Dispatch: scope=p06 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact   | Planned / Documented                                             | Actual / Accepted                                                       | Reason                                                            | Source of Truth | Follow-up |
| ------------- | ----------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------- | --------- |
| p06-t04       | plan.md file list | Five package files plus `public-package-versions.json` changed.  | `packages/cli/src/validation/skills.test.ts` also changed.              | Skill version validation tracks changed canonical skill versions. | implementation  | None.     |
| p06 review    | plan.md p06-t02   | `pnpm run cli -- docs generate-index` from repo root was listed. | The command now passes docs app `--docs-dir` and `--output` paths.      | Repo-root defaults generated the wrong index path during review.  | plan.md updated | None.     |
| p06 review    | plan.md p06-t03   | Sync ran before the p06-t04 public package version bump.         | Sync was rerun after the bump and refreshed manifest version to 0.1.44. | The version bump changes generated sync manifest metadata.        | implementation  | None.     |

### Run 5 — 2026-07-07 11:24

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p05   | DONE        | pass   | 1/2            | completed   |

#### Parallel Groups

- p05: sequential.

#### Dispatch Notes

- Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p05 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=provider-default dispatch_policy=high dispatch_ceiling=xhigh target=main-orchestrator
- Dispatch: scope=p05 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 4 — 2026-07-07 10:24

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p04   | DONE_WITH_CONCERNS | pass   | 1/2            | completed   |

#### Parallel Groups

- p04: sequential.

#### Dispatch Notes

- Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=declared model_axis=openai effort_axis=xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=declared model_axis=openai effort_axis=xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p04 action=fix role=fix producer=unknown provenance=declared model_axis=openai effort_axis=xhigh dispatch_policy=high dispatch_ceiling=xhigh target=main-orchestrator
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=declared model_axis=openai effort_axis=xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact   | Planned / Documented                          | Actual / Accepted                                                     | Reason                                                                                    | Source of Truth | Follow-up |
| ------------- | ----------------- | --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------- | --------- |
| p04-t02       | plan.md file list | The task named `oat-config.ts` and gate code. | The implementation also updated `packages/cli/src/config/resolve.ts`. | Layered exec-target resolution must preserve `ExecTarget.models` for p04-t02 to function. | implementation  | None.     |

### Run 3 — 2026-07-07 09:42

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p03   | DONE_WITH_CONCERNS | pass   | 1/2            | completed   |

#### Parallel Groups

- p03: sequential.

#### Dispatch Notes

- Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p03 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact   | Planned / Documented                                | Actual / Accepted                                                         | Reason                                                                                                                | Source of Truth | Follow-up |
| ------------- | ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------- | --------- |
| p03-t07       | plan.md file list | The task named config command/test and asset files. | The implementation also updated `oat-config.ts` and `oat-config.test.ts`. | Persisting `recommendationVersion` required config-model support so normalized writes do not drop the adoption stamp. | implementation  | None.     |
| p03 gate      | plan.md p03-t06   | The doctor check was named `dispatch:matrix`.       | The implementation registers `project:dispatch_matrix`.                   | The project-scoped name follows the existing doctor check naming convention and the check runs only in project scope. | plan.md updated | None.     |

### Run 2 — 2026-07-07 08:35

**Branch:** multi-family-dispatch
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | pass   | 1/2            | completed   |

#### Parallel Groups

- p02: sequential.

#### Dispatch Notes

- Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-xhigh
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh

#### Outstanding Items

- None.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

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

- Continue with p04-t01 after p03 gate review passes.

**Blockers:**

- None.

**Session End:** 2026-07-07 - p01 implementation complete

---

### Review Received: p01 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p01-review-2026-07-07T130154Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 2

**New tasks added:** None

**Disposition:**

- M1: Addressed now. Clarified that declared or observed Cursor display-name values map
  through the live catalog on exact match before stamping a single-token
  `producer=<slug>`.
- m1: Addressed now. Refreshed design frontmatter and changed the kickoff preface to
  past tense after the live Cursor verification.
- m2: Addressed now. Redacted the personal work email from the Cursor auth-context
  evidence while preserving the exit code and keychain behavior.

**Next:** Continue implementation with p04-t01 after p03 gate review passes.

---

### Review Received: p02 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p02-review-2026-07-07T133749Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 2
- Minor: 2

**New tasks added:** None

**Disposition:**

- M1: Addressed now. Value-less declared/observed records no longer act as
  corroboration or mismatch anchors, so a failed observation cannot clobber a valid
  declared identity.
- M2: Addressed now. `providerId` is documented as a structured model-provider id,
  `cursor` is no longer mapped to `composer`, and a regression test preserves the
  harness/family distinction.
- m1: Addressed now. Added an inline comment documenting why the short-lived helper
  uses `--api-key` argv despite local process-list visibility.
- m2: Addressed now. Recorded the accepted p02-t03 probe-order deviation in the
  deviations table below; the updated design and implementation are source of truth.

**Next:** Continue implementation with p03-t01.

---

### Review Received: p03 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p03-review-2026-07-07T150751Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 3

**New tasks added:** None

**Disposition:**

- M1: Deferred to p05/final sweep. The duplicated matrix normalization and
  cell-ref walkers are currently behaviorally covered by p03 tests, and p05 is
  the route-semantics phase that will stabilize the shared route-cell shape.
- m1: Deferred to final follow-up. Cursor catalog caching is an optimization for
  multi-cell validation passes; current behavior is correct and bounded by the
  existing per-call timeout.
- m2: Addressed now. `oat config list` now appends dynamic
  `workflow.dispatchCeiling.providers.*` keys discovered in the resolved config,
  with a JSON-mode regression test for `cursor.high`.
- m3: Addressed now. Updated p03-t06 wording in `plan.md` to the actual
  `project:dispatch_matrix` doctor check name.

**Next:** Continue implementation with p04-t01.

---

### 2026-07-07

**Session Start:** p04 implementation

- [x] p04-t01: Extend gate avoid enum with `same-family` - 588b6ab2
- [x] p04-t02: `models` dimension on exec targets and candidate expansion - 4d6fb7b3
- [x] p04-t03: Producer-anchored family filtering - d9b50ffa
- [x] p04-t04: Achieved-diversity metadata and confidence-graded logging - 2e1fe55b
- [x] p04 review fixes: align gate diversity edge cases - 826304c7

**What changed (high level):**

- Changed gate avoidance default to `same-family` while preserving explicit
  `same-runtime` and `none` modes.
- Added model-expanded exec target candidates and preserved `models` through
  layered target resolution.
- Filtered gate candidates by producer model family when the producer identity
  is claimable, and recorded achieved diversity metadata in human and JSON
  review-gate output.
- Fixed review-found edge cases so unknown producers run with
  `unknown-producer` metadata instead of synthetic same-runtime avoidance, and
  pinned `--model` commands take precedence over conflicting `models` lists.

**Decisions:**

- Pinned model arguments in `baseCommand` are the dispatch truth when they
  conflict with a configured `models` list, because execution suppresses
  appending another `--model` for pinned commands.
- Unknown or non-claimable producers do not trigger fallback same-runtime
  filtering under the default `same-family` mode. Explicit `--avoid
same-runtime` remains the runtime-avoidance path.

**Follow-ups / TODO:**

- Continue with p05-t01 after p04 gate review passes.

**Blockers:**

- None.

**Session End:** 2026-07-07 - p04 implementation complete

---

### Review Received: p04 standard review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p04-review-2026-07-07T154018Z.md

**Findings:**

- Critical: 0
- Important: 2
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- I1: Addressed now. Default `same-family` no longer synthesizes same-runtime
  filtering when producer identity is unknown or non-claimable; explicit
  `--avoid same-runtime` remains supported.
- I2: Addressed now. Pinned `--model` arguments in `baseCommand` now take
  precedence over conflicting `models` lists, so selection metadata and executed
  argv agree.

**Next:** Re-review p04.

---

### Review Received: p04 re-review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p04-review-2026-07-07T154719Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. No review-receive fixes required.

**Next:** Continue implementation with p05-t01 after p04 gate review passes.

---

### Review Received: p04 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p04-review-2026-07-07T155438Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. No gate findings required disposition.

**Next:** Continue implementation with p05-t01.

---

### 2026-07-07

**Session Start:** p05 implementation

- [x] p05-t01: Ordered-route resolution in the resolver - d05169a0
- [x] p05-t02: `(harness, model, effort)` target objects with same-harness dispatch - 302161a9
- [x] p05-t03: Wire escalation to existing retry/Dispatch Profile hooks - f599acdc
- [x] p05 review fixes: preserve route target dispatch axes - 80932b88

**What changed (high level):**

- Added ordered route resolution for matrix cells, including `--escalation-level`
  discrete route selection.
- Added same-harness route target objects with provider-specific dispatch-axis
  handling and honest cross-harness advisory behavior.
- Updated the implementation skill so retry escalation advances route entries
  and every dispatch records the p01 producer-stamp grammar.
- Fixed review-found target-axis and stamp-provenance bugs before passing p05
  re-review.

**Decisions:**

- Same-harness route objects dispatch through the target harness adapter axis:
  pinned-variant providers use `effort`, model-arg providers use `model`.
- `harness` is not a dispatch value. Harness-only route objects are explicit
  advisory targets until they carry a dispatchable axis.
- Codex pinned variants declare the effort axis only; they do not declare
  concrete producer identity without observed or inferred model evidence.

**Follow-ups / TODO:**

- Run the p05 phase review gate, then continue with p06-t01.

**Blockers:**

- None.

**Session End:** 2026-07-07 - p05 implementation complete

---

### Review Received: p05 standard review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p05-review-2026-07-07T161421Z.md

**Findings:**

- Critical: 0
- Important: 2
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- I1: Addressed now. Route target objects now resolve dispatch values through
  the target harness adapter axis, so Codex model+effort objects use `effort`
  and Cursor model objects use `model`.
- I2: Addressed now. Skill guidance now states that Codex pinned variants
  declare effort only and must not be stamped as declared producer identity.

**Next:** Re-review p05.

---

### Review Received: p05 re-review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p05-review-2026-07-07T162316Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. No review-receive fixes required.

**Next:** Run the p05 phase review gate, then continue implementation with p06-t01.

---

### Review Received: p05 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p05-review-2026-07-07T163044Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. No gate findings required disposition.

**Next:** Continue implementation with p06-t01.

---

### 2026-07-07

**Session Start:** p06 implementation

- [x] p06-t01: Update remaining lifecycle skills and templates - 2a83d6d7
- [x] p06-t02: Docs site updates - a27a6887
- [x] p06-t03: Sync provider views and bundled assets - fc230617; review fix 8e68d0ec
- [x] p06-t04: Lockstep version bump and release validation - dbd87ea2

**What changed (high level):**

- Propagated matrix-aware dispatch policy guidance into lifecycle skills and the
  state template.
- Updated the docs site for dispatch matrices, ordered routes, provenance,
  same-family gate avoidance, model-expanded targets, and achieved-diversity
  metadata.
- Confirmed provider-view sync and refreshed the sync manifest after the package
  version bump.
- Bumped all five public packages to `0.1.44` and passed release validation.

**Decisions:**

- The p06-t02 docs-index verification command now uses the docs app source/output
  path from repo root rather than relying on the CLI default.
- The p06-t03 empty sync commit is retained as the honest result at that task
  boundary; the later p06-t04 version bump required a follow-up manifest refresh.

**Follow-ups / TODO:**

- Re-run p06 standard review after the manifest, plan-command, and lifecycle
  tracking fixes.

**Blockers:**

- None.

**Session End:** 2026-07-07 - p06 task execution complete; review fixes pending

---

### Review Received: p06 standard review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p06-review-2026-07-07T165139Z.md

**Findings:**

- Critical: 0
- Important: 2
- Medium: 1
- Minor: 0

**New tasks added:** None

**Disposition:**

- I1: Addressed now. Repo-local sync refreshed `.oat/sync/manifest.json` from
  `0.1.43` to `0.1.44`, and repo-local project status reports `142/142` provider
  views in sync.
- I2: Addressed now. `implementation.md` and `state.md` now record p06 task
  completion, verification evidence, and a null current-task pointer.
- M1: Addressed now. The p06-t02 verification command now targets
  `apps/oat-docs/docs` and `apps/oat-docs/index.md` explicitly, and the corrected
  command plus `pnpm build:docs` passed.

**Next:** Re-review p06.

---

### Review Received: p06 re-review

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p06-review-2026-07-07T170507Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. Prior p06 review findings are fixed, and no new p06 findings were
  reported.

**Next:** Run the p06 external phase review gate, consume its artifact, then pause at
the configured final HiLL checkpoint.

---

### Review Received: p06 gate

**Date:** 2026-07-07
**Review artifact:** reviews/archived/p06-review-2026-07-07T171242Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**New tasks added:** None

**Disposition:**

- Passed. No gate findings required disposition.

**Next:** Pause at the configured final HiLL checkpoint before final review/PR
closeout.

---

### 2026-07-07

**Post-p06 closeout fix:** repo-local hook toolchain execution

- Added `tools/git-hooks/repo-toolchain.sh` so this repository's managed Git
  hooks load `.nvmrc` Node through nvm when available and invoke pnpm through
  Corepack.
- Updated `commit-msg`, `pre-commit`, `pre-push`, and `post-checkout` to use
  the shared hook toolchain helper.
- Updated the OAT project-status pre-commit check to invoke the repo-local
  source CLI through Corepack pnpm when the OAT source tree is present.
- Preserved the global `oat status --scope project --hook` path as a fallback
  for environments where the repo-local OAT source CLI is not present.
- User approved continuation beyond the final HiLL checkpoint and requested the
  documentation pass plus a final Claude/Fable gate review.

**Verification:**

- Run: `sh -n tools/git-hooks/{commit-msg,pre-commit,pre-push,post-checkout}`
- Result: pass
- Run: `tools/git-hooks/pre-commit`
- Result: pass (`lint-staged` reported no staged files; no stale global `oat`
  sync warning)

---

### Review Received: final

**Date:** 2026-07-07
**Review artifact:** reviews/archived/final-review-2026-07-07T200402Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 2
- Minor: 3

**New tasks added:** p07-t01, p07-t02

**Disposition:**

- M1: Deferred with tracked follow-up
  `BL-260707-consolidate-dispatch-matrix`. The duplicated matrix
  normalizers and cell-reference walkers are behaviorally consistent at HEAD
  and covered by tests. Consolidating them now would add refactor risk after
  the release-validation pass; the trigger for the backlog item is the next
  matrix cell-shape change.
- M2: Converted to p07-t01. Unknown or non-claimable producer identity under
  default `same-family` gate avoidance should preserve the previous
  same-runtime diversity floor and only fall back through the existing
  no-eligible-target path.
- m1: Deferred with tracked follow-up
  `BL-260707-cache-cursor-model-catalog`. The per-cell Cursor catalog lookup
  affects interactive maintenance surfaces only, not dispatch correctness, so
  it is accepted as a post-release optimization.
- m2: Converted to p07-t02. Closed-enum provider cells should reject invalid
  values at set time instead of warning that an inert value is being saved.
- m3: Deferred with tracked follow-up
  `BL-260707-support-producer-identity`. Final/range scope stamp aggregation
  is a larger producer-identity enhancement; p07-t01 removes the immediate
  unknown-producer independence regression.

**Deferred Findings (Medium):**

- M1 accepted defer to post-release with backlog
  `BL-260707-consolidate-dispatch-matrix`; rationale: all duplicate paths are
  green and behavior-consistent, while extracting a shared normalizer/walker
  after p05 route changes would be higher churn than warranted for this PR.

**Deferred Findings (Minor):**

- m1 accepted defer to post-release with backlog
  `BL-260707-cache-cursor-model-catalog`; rationale: adopt and doctor can pay
  a per-pass catalog cost without changing dispatch correctness.
- m3 accepted defer to post-release with backlog
  `BL-260707-support-producer-identity`; rationale: final/range producer
  aggregation should be designed with the broader producer-identity follow-up
  instead of patched into this release.

**Next:** Execute p07 fix tasks via the `oat-project-implement` skill, update the
final review row to `fixes_completed`, then re-run final review and review-receive
to reach `passed`.

---

### Review Received: final re-review (Fable)

**Date:** 2026-07-07
**Review artifact:** reviews/final-review-2026-07-07T215003Z.md

**Invocation note:**

- The direct `oat gate review` Fable invocation was attempted with a
  repo-local `claude-fable-review` target and `oat_review_invocation: gate`,
  but the provider process stalled without writing an artifact.
- The successful review used the same Claude/Fable model in a constrained
  stdout-only review packet over the p07 fix diff and final deferred ledger.

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 2

**New tasks added:** p07-t03, p07-t04

**Disposition:**

- m1: Converted to p07-t03. The direct `config set` closed-provider rejection
  should also apply to repo-controlled dispatch matrix recommendation adoption.
- m2: Converted to p07-t04. Unknown-producer fallback should warn when it
  abandons the conservative same-runtime floor.

---

### Review Received: final clean re-review (Fable)

**Date:** 2026-07-07
**Review artifact:** reviews/archived/final-review-2026-07-07T215509Z.md

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 2

**New tasks added:** None

**Disposition:**

- m1: Accepted as cosmetic wording debt. The fallback warning text says
  "different-family" even for the unknown-producer same-runtime floor path, but
  the `achieved=unknown-producer` suffix disambiguates the behavior.
- m2: Accepted and associated with existing matrix validation consolidation
  backlog `BL-260707-consolidate-dispatch-matrix`. Recommendation adoption now
  writes no incorrect state; a future validation-consolidation pass can decide
  whether to split fail-fast validation from oracle probing.

**Next:** Final review is passed. Proceed with final PR handoff.

---

## Phase 7: Final Review Fixes

**Status:** completed
**Started:** 2026-07-07

### Phase Summary

**Outcome (what changed):**

- Restored the same-runtime diversity floor when `same-family` gate avoidance
  sees an unknown or non-claimable producer identity.
- Rejected invalid closed-provider dispatch matrix values for Codex and Claude
  tier cells at config-set time, while preserving warn-and-save behavior for
  open providers such as Cursor.
- Extended closed-provider validation to dispatch matrix recommendation
  adoption.
- Added warning metadata when unknown-producer gate fallback abandons the
  same-runtime floor.

**Key files touched:**

- `packages/cli/src/commands/gate/index.ts` - unknown-producer
  `same-family` selection now conservatively applies same-runtime filtering
  before using the existing no-diverse-target fallback.
- `packages/cli/src/commands/gate/index.test.ts` - regression coverage for the
  unknown-producer floor, fallback path, and warning metadata.
- `packages/cli/src/commands/config/index.ts` - closed-provider tier cells now
  reuse fixed provider enum validation for set-time and adopt-time paths.
- `packages/cli/src/commands/config/index.test.ts` - regression coverage for
  invalid Claude tier values and recommendation cells failing before save or
  availability validation.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
- Result: pass (62 tests)
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
- Result: pass (164 tests)
- Run: `pnpm release:validate` via pnpm 10.13.1 PATH shim
- Result: pass (validated 5 public packages)

### Task p07-t01: Restore same-runtime floor for unknown-producer same-family gates

**Status:** completed
**Commit:** 4b79de1d

**Outcome:**

- `same-family` gate avoidance now falls back to same-runtime avoidance when
  the producer identity cannot claim a known model family.
- If no same-runtime-diverse candidate is eligible, the existing no-diverse
  fallback still allows execution and reports diversity honestly.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
- Result: pass (61 tests)

### Task p07-t02: Reject invalid closed-provider matrix values at set time

**Status:** completed
**Commit:** d8001058

**Outcome:**

- Dynamic tier keys such as
  `workflow.dispatchCeiling.providers.claude.high` now reject values outside
  the closed provider enum before persistence or availability-oracle calls.
- Open providers keep the prior validation-warning behavior so future provider
  model names can still be saved when the oracle cannot confirm them.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
- Result: pass (163 tests)

### Task p07-t03: Reject invalid closed-provider recommendation cells

**Status:** completed
**Commit:** 0981627a

**Outcome:**

- Dispatch matrix recommendation adoption now rejects invalid Codex and Claude
  values before availability-oracle calls or config writes.
- Open-provider recommendation cells retain the existing warn-and-save oracle
  behavior.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
- Result: pass (164 tests)

### Task p07-t04: Warn on unknown-producer gate fallback

**Status:** completed
**Commit:** 96a70098

**Outcome:**

- When `same-family` avoidance falls back after the unknown-producer
  same-runtime floor filters all available targets, review-gate diversity
  metadata now includes an explicit no-diverse-target warning.

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
- Result: pass (62 tests)

---

### 2026-07-06

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact   | Planned / Documented                                                      | Actual / Accepted                                                                                                                            | Reason                                                                                                                                                                      | Source of Truth              | Follow-up                                                                      |
| ------------- | ----------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| p02 gate      | plan.md p02-t03   | `--list-models` current marker is the first Cursor catalog/current probe. | `cursor-agent models` is first, then `--list-models`, then init-event and config fallback.                                                   | p01 live verification showed `cursor-agent models` works with API key while `--list-models` can fail against a locked keychain.                                             | design.md and implementation | No plan task added; future p02/p03 consumers should follow the updated design. |
| p03 gate      | plan.md p03-t06   | The doctor check was named `dispatch:matrix`.                             | The implementation registers `project:dispatch_matrix`.                                                                                      | The implemented name follows scoped doctor-check convention and the check only runs in project scope.                                                                       | plan.md updated              | None.                                                                          |
| p04-t02       | plan.md file list | The task named `oat-config.ts` and gate code.                             | The implementation also updated `packages/cli/src/config/resolve.ts`.                                                                        | Layered exec-target resolution must preserve `ExecTarget.models`; otherwise model candidates disappear after config merge.                                                  | implementation               | None.                                                                          |
| p06-t04       | plan.md file list | The task listed five package files plus `public-package-versions.json`.   | The implementation also updated `packages/cli/src/validation/skills.test.ts`.                                                                | Skill version validation intentionally tracks changed canonical skill frontmatter versions.                                                                                 | implementation               | None.                                                                          |
| post-p06      | plan.md           | Implementation plan ended after p06 release validation and gate review.   | Added a repo-local Git hook/toolchain fix before final documentation/review closeout.                                                        | The active repo hooks were resolving stale global/Codex-bundled tooling under mixed Node/pnpm versions.                                                                     | implementation               | None.                                                                          |
| final review  | design.md         | Final/range gates diversify against each phase producer.                  | Current stamp lookup is exact single-scope; final/range scopes degrade to unknown-producer unless an explicit producer identity is supplied. | Aggregating producer identity across ranges needs a broader producer-identity design pass, and p07-t01 addresses the immediate unknown-producer diversity-floor regression. | implementation and backlog   | `BL-260707-support-producer-identity`                                          |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                                                                                                                           | Passed | Failed | Coverage |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | type-check; live cursor-agent probes; grep producer grammar                                                                                                         | yes    | 0      | n/a      |
| 2     | family.test; provenance.test; cursor-current-target.test; stamp.test; cli type-check                                                                                | yes    | 0      | n/a      |
| 3     | oat-config.test; dispatch-ceiling/index.test; registry.test; availability.test; config/index.test; doctor/index.test; bundle-consistency.test; cli type-check       | yes    | 0      | n/a      |
| 4     | gate/index.test; oat-config.test; resolve.test; help-snapshots.test; cli type-check                                                                                 | yes    | 0      | n/a      |
| 5     | dispatch-ceiling/index.test; cli type-check; oat:validate-skills; git diff --check                                                                                  | yes    | 0      | n/a      |
| 6     | oat:validate-skills; docs generate-index; build:docs; sync --scope all; status --scope project --json; git diff --check; cli test/type-check/lint; release:validate | yes    | 0      | n/a      |
| 7     | gate/index.test; config/index.test; oat-config.test; release:validate                                                                                               | yes    | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- Multi-family dispatch matrix support across configuration, resolver, validation,
  lifecycle skills, and documentation.
- Producer identity/provenance stamping and family-aware review-gate diversity.
- Ordered implementation route resolution with same-harness dispatch targets.
- Lockstep public package version bump to `0.1.45`.

**Behavioral changes (user-facing):**

- Dispatch ceilings now accept provider/tier matrix cells and ordered route cells.
- Cursor can be selected as a model-arg dispatch provider, with live availability
  checks and hard-error confidence from the p01 binary experiment.
- Review gates default to same-family avoidance and report achieved diversity.
- Lifecycle skills describe prompt-and-persist behavior for missing matrix cells and
  route-backed escalation.

**Key files / modules:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - matrix and route
  resolution.
- `packages/cli/src/providers/ceiling/registry.ts` - Codex, Claude, and Cursor
  provider adapters.
- `packages/cli/src/providers/identity/*` - producer identity, availability, and
  stamp parsing.
- `packages/cli/src/commands/gate/index.ts` - same-family gate selection and
  achieved-diversity reporting.
- `.agents/skills/oat-project-implement/SKILL.md` - runtime dispatch selection,
  route escalation, and stamp grammar.
- `apps/oat-docs/docs/**` - public documentation for the shipped dispatch behavior.

**Verification performed:**

- Phase-local Vitest suites for config, resolver, provider registry, identity,
  gate behavior, doctor, bundle consistency, and CLI help snapshots.
- CLI type-check, lint, skill validation, docs index generation, docs build,
  provider-view sync/status checks, release validation, and live Cursor binary
  probes.

**Design deltas (if any):**

- p01 updated Cursor confidence rules after live binary experiments proved invalid
  model values hard-error.
- p03 renamed the doctor check to `project:dispatch_matrix` to match scoped doctor
  conventions.
- p06 accepted validation-test file-list drift for the changed quick-start skill
  version contract.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
