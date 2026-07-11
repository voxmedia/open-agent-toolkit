---
name: oat-project-implement
version: 2.0.36
description: Use when plan.md is ready for execution. Dispatches phase coordinators that select one exact target-pinned worker per task; supports bounded fix loops and plan-declared worktree-isolated parallel phases.
oat_gateable: true
argument-hint: '[--retry-limit <N>] [--dry-run]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run the `oat-project-plan` skill first.

## Mode Assertion

**OAT MODE: Implementation**

**Purpose:** Execute plan tasks with TDD discipline, track progress, handle blockers.

**CRITICAL — Bookkeeping commits are mandatory, not optional.**
After every code commit and after every phase/review-fix completion, you MUST commit the OAT tracking files (project: `implementation.md`, `state.md`, `plan.md`) as a separate bookkeeping commit. Refresh the repo dashboard with `oat state refresh` before staging when available, but do not stage `.oat/state.md`; it is generated dashboard state and is normally gitignored. Do not defer, batch, or skip these commits under the reasoning that they "aren't related to the implementation." Skipping a bookkeeping commit is the primary cause of cross-session state drift and will cause the next implementation run to fail bookkeeping cross-checks. If bookkeeping commits feel frequent, that is the intended design — they are cheap and they prevent drift.

**CRITICAL — Review boundaries require a committed artifact baseline.**
Do not enter checkpoint review, final review, revise, or PR-final handoff with dirty core project artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`). If one of those boundaries is next and artifact bookkeeping is still uncommitted, stop and create the bookkeeping commit first.

**CRITICAL — Intentional artifact divergence must be recorded.**
If implementation intentionally diverges from `spec.md`, `design.md`, or `plan.md`, record the delta in `implementation.md` before the next phase/review boundary. Include what diverged, why it diverged, whether the implementation or original artifact is now source of truth, and any follow-up artifact updates or explicit deferral. Do not leave accepted design drift only in chat, a review artifact, or code comments; final summary generation depends on `implementation.md` preserving the delta.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ IMPLEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- For each task, announce a compact header before doing work:
  - `OAT ▸ IMPLEMENT {task_id}: {task_name}`
- Before multi-step "bookkeeping" work (updating artifacts/state, verification, committing, dashboard refresh), print 2–5 short step indicators, e.g.:
  - `[1/4] Updating implementation.md + state.md…`
  - `[2/4] Running verification…`
  - `[3/4] Committing…`
  - `[4/4] Refreshing dashboard…`
- For long-running operations (tests/lint/type-check/build, reviews, large diffs), print a start line and a completion line (duration optional).
- Keep it concise; don't print a line for every shell command.

**BLOCKED Activities:**

- No skipping tasks
- No changing plan structure
- No scope expansion

**ALLOWED Activities:**

- Executing tasks in order
- Making minor adaptations within task scope
- Logging decisions and issues
- Marking blockers for user review

**Self-Correction Protocol:**
If you catch yourself:

- Skipping ahead in tasks → STOP (execute in order)
- Expanding scope → STOP (log as "deferred")
- Changing plan structure → STOP (update plan.md first)

**Recovery:**

1. Acknowledge the deviation
2. Return to current task
3. Document in implementation.md

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 0.5: Capability Detection and Tier Selection

**Mandatory target-first order:** Complete Dispatch Policy Preflight and resolve
the concrete managed Codex target before probing generic agent availability or
locking Tier 1/Tier 2. A concrete target takes precedence over tier selection:
first send the exact registered role through native dispatch. Only a native
role-selection rejection permits an explicitly pinned fresh Codex child. If
neither exact route is possible, inline execution is allowed only with verified
equivalent current-host model and effort controls; otherwise block before work
starts. Explicit inherit/default and documented managed-uncapped reviewer
behavior remain the only base-role exceptions.

For a concrete managed Codex role, first send the resolver-returned Codex
variant through the native spawn API as `agent_type`. Spawn acceptance plus the
constructed launcher payload is configured invocation evidence; independent
runtime telemetry or agent self-report is not required. Launch a fresh Codex
child pinned to the resolver-returned model and effort with canonical role
instructions only after a native role-selection rejection as defined below. If
that fresh child cannot be launched, fail closed and block; never substitute
the coordinator or base role.

Use base `oat-phase-implementer` only for the allowed exceptions above:
explicit inherit/default behavior. It is never a managed task-worker fallback.

Detect whether native subagent dispatch is available. The detection logic follows the same pattern used by `oat-project-review-provide` but produces a two-tier outcome (no fresh-session tier — this skill runs autonomously and cannot block on user-initiated fresh sessions mid-run).

Detection logic:

- If the host is Claude Code, check Task-tool availability with `subagent_type: "oat-phase-implementer"` and `subagent_type: "oat-reviewer"`. Available → Tier 1.
- If the host is Cursor, use Cursor-native invocation. Available → Tier 1.
- If the host is Codex multi-agent, verify `[features] multi_agent = true` and whether `spawn_agent` requires explicit authorization.
  - Codex Tier 1 dispatches for `oat-phase-implementer` and `oat-reviewer` must use self-contained scope packets and fresh context. Do not rely on forked full-thread context when pinning a specialized OAT role.
  - Available without auth → Tier 1.
  - Available with auth required → fail closed. You MUST ask the user once at skill start before selecting Tier 2 or starting implementation work:

    ```
    This OAT implementation skill normally delegates phase implementation and review to subagents. Authorize subagent delegation for this run?

    Yes authorizes both oat-phase-implementer and oat-reviewer across every phase in this run.
    ```

    - Approved → Tier 1.
    - Declined → Tier 2.

- If the host does not resolve either generic agent, first attempt the exact
  registered role natively for any concrete managed target. Use the explicitly
  pinned fresh-child route only after a native role-selection rejection. Select
  Tier 2 only when inline execution is allowed by the target-first rule above.

**Approval scope rule:** this Tier selection applies to both phase implementation and checkpoint review. Do not infer a mixed mode from conversational emphasis on review checkpoints. If the user has not explicitly approved Tier 1 for the run, stay Tier 2 throughout. Mixed mode is only valid when the user explicitly requests it.

**Codex fail-closed rule:** after this skill is invoked, "user did not separately ask for subagents" is not a valid Tier 2 reason. If Codex can spawn agents but requires explicit user authorization, the implementation MUST NOT continue until the delegation question above is answered. Tier 2 is allowed only when:

- `user declined delegation`
- `spawn_agent unavailable`
- `required agent role unresolved`

Report the selected tier to the user:

```
[preflight] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: {available | authorization required | not resolved}
  → Selected: Tier {1 | 2} — {Subagents | Inline}
  → Reason: {authorized | available without auth | user declined delegation | spawn_agent unavailable | required agent role unresolved}
```

Do not print `[0/N]` for this preflight step. The implementation denominator is not established by capability detection; use the literal `[preflight]` label above.

**Hard pre-work guard:** before any code edit, test run, or implementation commit, print the selected tier and reason. If Tier 2 is selected, the reason must be one of the three allowed Tier 2 reasons above. Do not run tests, edit files, or create implementation commits until Step 0.5 has completed and the tier report has been printed.

**Tier is locked for the remainder of the run only after the dispatch target is resolved.** Subsequent coordinator, task-worker, fix, and review dispatches use the same tier. Tier controls mechanics only: every managed task worker still resolves its own exact target beneath the recorded project or phase named maximum. No mid-run downgrade is allowed.

**Recovery if Step 0.5 was skipped:** If implementation work has already started inline before completing Step 0.5, STOP immediately. Preserve any work in progress, complete or revert to a clean task boundary, and re-run Step 0.5 before continuing. Do not silently continue in Tier 2.

**Codex authorization example:**

```
User invokes: $oat-project-implement
Detected: Codex multi-agent support available; explicit authorization required.
Expected: ask "This OAT implementation skill normally delegates phase implementation and review to subagents. Authorize subagent delegation for this run?"
If approved: Selected: Tier 1 — Subagents
Forbidden: Selected: Tier 2 — Inline because the user did not separately mention subagents.
```

**Native role-selection rejection:** This means the native host explicitly
reports that the requested `agent_type` is unsupported, unknown, unregistered,
or rejected before the child or agent starts. Missing runtime telemetry,
missing agent self-report, a timeout after spawn acceptance, or any terminal
result from an accepted child — including `BLOCKED` — is not role
unavailability and is not a native role-selection rejection. Self-report is
optional diagnostic data and cannot populate or overwrite launcher-owned
`target`, `model_axis`, or `effort_axis` fields. An accepted child cannot
trigger the fresh pinned-child or CLI fallback. If an accepted native reviewer
later times out, retry the same already-selected native `agent_type` route. The
fresh pinned-child route is eligible only when the original native attempt
received explicit pre-start role-selection rejection; a timeout after native
spawn acceptance never changes routes.

**Legacy state migration:** If `state.md` contains `oat_execution_mode: subagent-driven`, silently ignore it. On the next bookkeeping write, remove that key. Do not redirect to `oat-project-subagent-implement` — that skill is deprecated.

### Dispatch Policy Preflight

Before any phase work, resolve and print the OAT dispatch policy. This is a
preflight gate, not a mid-run question.

Use the CLI resolver as the source of truth. The command name remains
`dispatch-ceiling` for compatibility, but the returned contract is dispatch
policy:

```bash
oat project dispatch-ceiling resolve --provider <active-provider> --preflight --report-scope implementation-preflight --report-action implementation --json
```

If `oat` is not in PATH, use:

```bash
pnpm run cli -- project dispatch-ceiling resolve --provider <active-provider> --preflight --report-scope implementation-preflight --report-action implementation --json
```

Resolution order:

1. Config keys `workflow.dispatchPolicy.mode` / `workflow.dispatchPolicy.policy` (local > shared > user)
2. Compatibility config keys `workflow.dispatchCeiling.providers.<provider>` (local > shared > user)
3. Project `state.md` frontmatter key `oat_dispatch_policy`
4. Legacy project `state.md` frontmatter key `oat_dispatch_ceiling`
5. Interactive implementation preflight prompt (below)
6. Non-interactive unresolved: block before work starts

**JSON response shape** (from `--json`):

```json
{
  "status": "resolved",
  "provider": "codex",
  "value": "high",
  "policyMode": "managed",
  "policy": "balanced",
  "source": "project-state",
  "preset": "balanced",
  "unresolved": false,
  "providerDefaultEffort": "medium",
  "providers": {
    "codex": {
      "value": "high",
      "mode": "enforced",
      "mechanism": "pinned-variant",
      "dispatchArgs": {
        "variant": "oat-phase-implementer-gpt-5-6-terra-high"
      },
      "verifyOnDispatch": false,
      "selection": {
        "role": "implementer",
        "preferredValue": null,
        "selectedValue": "high",
        "capped": false,
        "selectionMode": "capped",
        "policyMode": "managed",
        "policy": "balanced"
      }
    }
  }
}
```

Read `providers.<active-provider>` for the concrete dispatch controls. The
`dispatchArgs` field carries the provider-specific argument to pass through
(Codex: `variant` name; Claude: `model` string). For implementer/fix dispatch,
pass `--preferred <preferred-effort>` and use `selection.selectedValue` as the
selected axis value when it is present. Never re-derive these from the policy
label or a ceiling-only variant - the resolver is the single compilation/join
point.

Print before phase work:

```text
OAT Dispatch Tier: balanced (codex, managed capped — pinned-variant)
Resolved cap: high
Source: project state
Provider default effort: medium
Note: OAT will use resolver-returned materialized Codex role names up to high. Base/unpinned roles resolve through the provider default only for explicit inherit/default behavior or the documented managed-uncapped reviewer exception.
```

If no policy resolves and the session is interactive, present the dispatch
policy prompt once before starting work:

Print the unresolved-policy heading, then generate the choice text from
canonical CLI metadata immediately before presenting it:

```bash
oat project dispatch-ceiling choices --format markdown
```

Do not hand-type the dispatch policy menu or omit canonical choices. If the CLI
is unavailable in this environment, derive the same labels and descriptions from
`packages/cli/src/config/dispatch-policy-options.ts`; include every managed
policy returned by `VALID_MANAGED_DISPATCH_POLICIES` plus `Uncapped`, `Inherit
Host Defaults`, and `Leave Unresolved`.

At minimum, preserve these semantics in any fallback text:

- `Uncapped`: OAT still manages dispatch selection, but stores no maximum cap.
  It is not host/default behavior and must not be represented by absent policy
  state.
- `Inherit Host Defaults`: OAT does not choose model or effort controls; the
  executing host/provider owns implementation, fix, and review defaults.
- `Leave Unresolved`: planning/preflight deferral only. It records no runtime
  policy and is not a runnable implementation setting. Implementation preflight
  must block until a policy resolves.

OAT applies managed policies where the provider exposes a reliable mechanism
(Codex: pinned variants; Claude: Task model parameter). Other providers may
treat managed policies as advisory.

**Managed capped policy selection** persists only `mode: managed`, the named
maximum `policy`, and `source`. The named maximum leaves lower configured
candidates eligible; do not copy compiled provider/model targets into project
state. On selection, print the named maximum before proceeding.

**Uncapped** persists explicit managed uncapped state. OAT still manages
dispatch selection. It does not write provider caps, and it must not be
represented by leaving dispatch policy state absent.

**Inherit Host Defaults** persists explicit inherit/default state. Use this only
when the user wants OAT to leave implementation, fix, and review model/effort
controls to the executing host/provider. OAT does not choose model or effort in
this mode.

**Leave Unresolved** records no runtime policy for implementation. Stop before
phase work and report the unresolved state; Implementation preflight must block
until a policy resolves.

Persist in project `state.md` frontmatter using the normalized shape:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: balanced
  source: project-state
```

For `Uncapped`:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: uncapped
  source: project-state
```

For `Inherit Host Defaults`:

```yaml
oat_dispatch_policy:
  mode: inherit
  source: project-state
```

If no policy resolves and `OAT_NON_INTERACTIVE=1` or no user-response channel
exists, rerun the resolver with non-interactive behavior and stop before work
starts if it blocks:

```bash
oat project dispatch-ceiling resolve --provider <active-provider> --preflight --non-interactive --report-scope implementation-preflight --report-action implementation
```

```text
BLOCKED: Codex dispatch policy is unresolved in non-interactive mode.
Set workflow.dispatchPolicy.mode/workflow.dispatchPolicy.policy, workflow.dispatchCeiling.providers.codex, oat_dispatch_policy, or legacy oat_dispatch_ceiling.
```

Dry-run mode must report the unresolved policy and planned behavior without
modifying project state.

### Runtime dispatch selection

Before coordinator bootstrap and before each task-worker, fix, or review
dispatch, choose and log runtime controls. Resolve these controls before
applying Tier 1/Tier 2 mechanics. A coordinator target never becomes a task
target: managed tasks use an exact resolver candidate beneath the recorded
project or phase named ceiling. Inline execution must preserve equivalent
controls or use a documented exception.

Use these inputs:

- resolved dispatch policy, source, and provider-specific selection
- phase ID and the current bounded task scope
- optional `## Dispatch Profile` row in `plan.md`
- host-exposed provider controls, by axis
- prior outcomes for the phase, including review results and failed retries

Route selection is part of runtime dispatch selection when the resolver returns
an ordered matrix route:

- Start every implementation/fix scope at route level `0` unless the plan's
  `## Dispatch Profile` names a different starting route level for that
  phase/task. Level `0` is the route floor.
- Pass `--escalation-level <route-level>` on implementer/fix resolver calls.
  Single-axis providers ignore this flag and keep their normal capped `min()`
  behavior.
- Read `providers.<provider>.target` and `providers.<provider>.selection.target`
  from resolver JSON when present. A target with `crossHarness: true` is an
  explicit deferred cross-harness target: log it as advisory and do not invent a
  same-harness fallback.
- On repeated review failure or retry-loop escalation, advance by one route
  entry before retrying, up to the last available route entry and within
  `oat_orchestration_retry_limit`.

#### Dispatch Report V1 contract

Every implementation, fix, and review resolver invocation MUST pass explicit
report context:

- implementation: `--report-scope <phase-or-task> --report-action implementation`
- fix: `--report-scope <phase-or-task> --report-action fix`
- review: `--report-scope <phase-or-review-scope> --report-action review`

Require `dispatchReport.schemaVersion: 1` in the completed resolver JSON before
dispatch. Consume the report as the human/audit source: render the versioned
block with `formatDispatchReport(dispatchReport)` semantics, and derive the
formal compatibility line only through
`formatDispatchStamp(dispatchReport)` / `toDispatchStampRecord(dispatchReport)`.
Never hand-assemble a second `Dispatch:` schema from policy labels, role names,
candidate strings, or target names.

The exact provider invocation remains authoritative in
`providers.<provider>.dispatchArgs` and `providers.<provider>.selection.target`;
the report does not replace or weaken target-pinned dispatch. Add independently
observed runtime identity to `dispatchReport.runtimeIdentity` only when such an
observation exists. Requested/configured controls are not runtime observation.
For gate-originated review, keep `dispatchReport.gateInvocation`, existing
work-producer `diversity`, and reviewer `runtimeIdentity` as three distinct
facts; producer stamps or self-report never overwrite configured invocation.

Axis states:

- `selected:<value>` - host exposes the axis and the orchestrator chose a value.
- `provider-default` - Codex base/unpinned role follows configured/provider default effort.
- `inherited` - host/API explicitly inherits the parent setting and OAT can trust that behavior.
- `not-applicable` - this host/API has no meaningful per-dispatch concept for that axis.
- `host-auto` - exceptional; the host uses that axis internally but OAT cannot read or pin it.

Codex rules:

**Managed Codex execution invariant:** When the resolver returns a model+effort
target, the resolver-returned Codex variant from
`providers.codex.dispatchArgs.variant` must first be sent through the native
spawn API as `agent_type`. Spawn acceptance plus the launcher payload is
configured invocation evidence with launcher-selected/config-declared
provenance. If and only if the host returns a native role-selection rejection,
launch a fresh Codex child with the resolver target's explicit model, reasoning
effort, and canonical role instructions from
`.agents/agents/oat-phase-implementer.md` or
`.agents/agents/oat-reviewer.md`. Missing runtime telemetry or agent self-report
is not role unavailability, and an accepted child result such as `BLOCKED`
cannot trigger fallback. Workflow correctness must not require provider restart
or hot reload. A managed base role is forbidden when a concrete target was
requested; never silently downgrade to it. Base roles remain valid only for
explicit inherit/default behavior and the documented managed-uncapped reviewer
fallback.

1. Codex effort order is `low < medium < high < xhigh < max`.
2. Classify preferred effort from scope:
   - `low`: trivial docs-only, narrow single-file, or mechanical changes
   - `medium`: normal multi-file implementation and moderate integration risk
   - `high`: broad architecture, security/auth/redaction boundaries, subtle state behavior, or repeated substantive review failures
   - `xhigh`: highest-risk work that requires a capped policy to allow xhigh or a managed `Uncapped` policy to select it
   - `max`: exceptional frontier work whose risk or cross-cutting scope justifies the first-class maximum reasoning control
3. For capped managed implementer/fix work, selected effort is `min(preferred, resolved_cap)`.
4. For managed `Uncapped` implementer/fix work, selected effort is the preferred effort with no cap.
5. For inherit/default mode, the resolver returns no selected dispatch args. Use the base/unpinned Codex role, log `Selected effort: provider-default`, display provider default effort when known, and do not describe this as managed uncapped behavior.
6. For managed capped task-worker/fix dispatch, choose an exact configured candidate. For implementation, call `oat project dispatch-ceiling resolve --provider codex --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --candidate-effort <effort> --escalation-level <route-level> --report-scope <task-id> --report-action implementation --json`. For a bounded fix, use `oat project dispatch-ceiling resolve --provider codex --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --candidate-effort <effort> --escalation-level <route-level> --report-scope <task-id> --report-action fix --json`. Read `providers.codex.dispatchArgs.variant` and `providers.codex.selection.target`; never reuse the coordinator role or a cap-only variant. `--preferred` remains compatibility behavior outside the exact task-worker path.
7. For review dispatch: call `oat project dispatch-ceiling resolve --provider codex --role reviewer --report-scope <phase-or-review-scope> --report-action review --json`; read `providers.codex.dispatchArgs.variant` and `providers.codex.selection.target`.
   - Capped managed policy: reviewer targets the configured cap for deterministic quality gate behavior.
   - Managed `Uncapped`: no reviewer target exists; use base/unpinned reviewer fallback and log `selectionMode=no-review-target`, `selectedValue=null`, and `effort_axis=provider-default`.
   - Inherit/default: no reviewer target exists; use base/unpinned reviewer fallback and log `selectionMode=inherit-default`, `selectedValue=null`, and `effort_axis=provider-default`.
8. Codex payload-first assertion applies whenever the resolver returns a materialized model+effort target. If `providers.codex.dispatchArgs.variant` is present, the actual `spawn_agent` payload MUST first use it as native `agent_type`; when that variant came from a Codex model+effort target, log `model_axis=selected:<model>` and `effort_axis=selected:<effort>` from resolver output and the constructed launcher payload. Spawn acceptance is sufficient configured invocation evidence. Missing telemetry or self-report does not make the variant unusable. If native role selection explicitly rejects the variant, use the explicitly pinned fresh-child route or block. Use the base role and log provider-default only for explicit inherit/default behavior or the documented managed-uncapped reviewer exception. Always derive `model_axis` and `effort_axis` from resolver output, not from legacy role-name parsing or agent self-report.
9. Do not use top-level per-call `reasoning_effort` as the standard OAT selected-effort path; dogfooding showed that path can be inconsistent.

Claude rules:

- Claude policy selection is model-based: `haiku < sonnet < opus < fable`.
- Implementer/fix dispatch: classify the preferred model (`haiku`, `sonnet`, `opus`, or `fable`) and pass it to the resolver as `--preferred <preferred-model>`.
  - Capped managed policy: the resolver selects `min(preferred, resolved_cap)`.
  - Managed `Uncapped`: the resolver selects the preferred model with no cap.
  - Inherit/default: the resolver returns no selected model; omit `model` so Claude Code inherits host/default behavior.
- Review dispatch:
  - Capped managed policy: target the configured policy cap directly.
  - Managed `Uncapped` or inherit/default: no reviewer target exists; omit `model` and log inherited/default model behavior.
- For managed capped task-worker/fix dispatch, call `oat project dispatch-ceiling resolve --provider claude --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --orchestrator-tier <current-orchestrator-tier> --escalation-level <route-level> --report-scope <task-id> --report-action implementation --json` for implementation. For a bounded fix, call `oat project dispatch-ceiling resolve --provider claude --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --orchestrator-tier <current-orchestrator-tier> --escalation-level <route-level> --report-scope <task-id> --report-action fix --json`. For review dispatch, call the resolver with `--role reviewer --report-scope <phase-or-review-scope> --report-action review --json` and no candidate flags. Read `providers.claude.dispatchArgs.model` and pass it exactly on the actual Task invocation.
- Pass `model: "<value>"` when `model_axis=selected:<value>` on the Task tool call.
- Keep `effort_axis=not-applicable`; Claude Code has no separate per-dispatch effort axis.

Cursor rules:

- Treat every configured Cursor candidate string as opaque. Do not normalize it
  or infer capability from its spelling.
- For managed capped task-worker/fix dispatch, call
  `oat project dispatch-ceiling resolve --provider cursor --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <opaque-model> --report-scope <task-id> --report-action implementation --json`
  for implementation. For a bounded fix, call
  `oat project dispatch-ceiling resolve --provider cursor --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <opaque-model> --report-scope <task-id> --report-action fix --json`.
- Require `providers.cursor.dispatchArgs.model` and pass that exact byte-for-byte
  string as the actual Cursor invocation model. If the host cannot apply it,
  fail closed.

Payload-first invariant:

- Build the actual host dispatch argument map before logging.
- Do not emit `selected:<value>` unless the host invocation contains the corresponding role/model selection.
- For every coordinator, task-worker, fix, and review launch, record `target`,
  `model_axis`, and `effort_axis` from resolver output and the actual launcher
  payload after payload construction.
- Those fields are launcher-owned. Agent self-report cannot populate or
  overwrite them; it may only be retained separately as optional diagnostics.
- Derive `Dispatch target` and `Effort axis` / `Model axis` from the payload.
- After the payload is built, append the compatibility stamp returned from
  `formatDispatchStamp(dispatchReport)` to Dispatch Notes for every
  implementation, fix, and review dispatch. The derived line retains the p01
  grammar exactly:
  `Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>`.
  Populate the report from the completed resolver and actual host arguments.
  Only independently observed or otherwise supported runtime evidence may
  populate runtime producer identity. Codex materialized model+effort variants
  retain selected model/effort controls while keeping runtime identity
  not-reported unless evidence exists. Do not write prose-only, hand-built, or
  legacy comma-separated stamp forms.

Human-facing dispatch display rules:

- Lead with route, OAT dispatch tier, requested controls, configured defaults, and runtime confirmation. These are the fields humans use to understand what OAT asked for and what the host appears to be running.
- Do not headline `producer=unknown` or `provenance=unknown`. Those values are
  audit fields for the formal stamp, not the primary status. Put unknown
  producer/provenance only in `Dispatch stamp:` or in a low-priority note after
  the route and runtime confirmation.
- Separate requested controls from configured defaults. For example, a Codex
  materialized role may request `model_axis=selected:<model>` and
  `effort_axis=selected:<effort>` while the provider default effort remains a
  separate fallback/default fact.
- Separate configured policy/cap from runtime confirmation. A resolver payload
  can declare a target before the host has confirmed it; an observed mismatch
  must be called out as `Runtime confirmation: mismatch:<detail>` and handled as
  an orchestration deviation.
- Keep the `Dispatch stamp: Dispatch: ...` line parseable and grammar-stable.
  Do not move display-only prose into the formal stamp.

Structured dispatch log:

```text
OAT Dispatch: Phase {phase_id} {implementation | fix | review}
Host: {Claude Code | Codex | Cursor | other host}
Route: {route label or target path | none}; level={0 | 1 | ... | none}
Requested controls: {model=<value|none>, effort=<value|none>, target=<value|unknown>}
Configured defaults: {provider default effort/model | unknown | not-applicable}
Runtime confirmation: {observed:<slug> | declared:<slug> | not-observable | mismatch:<detail>}
Preferred effort: {low | medium | high | xhigh | max | provider-default | not-applicable}
OAT Dispatch Tier: {economy | balanced | high | frontier | uncapped | inherit host defaults | legacy capped}
Resolved cap: {resolved cap value | none}
Selected effort: {low | medium | high | xhigh | max | provider-default | not-applicable}
Policy source: {repo config | project state | preflight prompt}
Provider default effort: {value | unknown | not-applicable}
Selection mode: {capped | uncapped | review-target | no-review-target | inherit-default}
Route level: {0 | 1 | ... | none}
Model axis: { selected:<value> | inherited | not-applicable | host-auto }
Effort axis: { selected:<value> | provider-default | inherited | not-applicable | host-auto }
Dispatch target: {host-specific subagent/role/tool target}
Dispatch stamp: Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>
Rationale: {short rationale grounded in phase scope and any policy cap/uncapped/default behavior}
```

Codex capped example:

```text
OAT Dispatch: Phase p02 implementation
Host: Codex
Route: codex/implementer/gpt-5.6-sol/medium; level=0
Requested controls: model=gpt-5.6-sol, effort=medium, target=oat-phase-implementer-gpt-5-6-sol-medium
Configured defaults: provider default effort=high
Runtime confirmation: declared:gpt-5.6-sol/medium
Preferred effort: high
OAT Dispatch Tier: economy
Resolved cap: medium
Selected effort: medium
Policy source: repo config
Provider default effort: high
Selection mode: capped
Model axis: selected:gpt-5.6-sol
Effort axis: selected:medium
Dispatch target: oat-phase-implementer-gpt-5-6-sol-medium
Rationale: normal multi-file implementation; high preferred due to integration risk, capped by configured policy.
```

Codex uncapped implementer example:

```text
OAT Dispatch: Phase p02 implementation
Host: Codex
Route: codex/implementer/gpt-5.6-terra/xhigh; level=0
Requested controls: model=gpt-5.6-terra, effort=xhigh, target=oat-phase-implementer-gpt-5-6-terra-xhigh
Configured defaults: provider default effort=medium
Runtime confirmation: declared:gpt-5.6-terra/xhigh
Preferred effort: xhigh
OAT Dispatch Tier: uncapped
Resolved cap: none
Selected effort: xhigh
Policy source: project state
Provider default effort: medium
Selection mode: uncapped
Model axis: selected:gpt-5.6-terra
Effort axis: selected:xhigh
Dispatch target: oat-phase-implementer-gpt-5-6-terra-xhigh
Rationale: high-risk phase; managed uncapped policy allows the preferred pinned variant. Actual host support for upward effort selection must be verified by the dispatching host.
```

Codex capped reviewer example:

```text
OAT Dispatch: Phase p02 review
Host: Codex
Route: codex/reviewer/gpt-5.6-terra/xhigh; level=0
Requested controls: model=gpt-5.6-terra, effort=xhigh, target=oat-reviewer-gpt-5-6-terra-xhigh
Configured defaults: provider default effort=medium
Runtime confirmation: declared:gpt-5.6-terra/xhigh
Preferred effort: high
OAT Dispatch Tier: high
Resolved cap: xhigh
Selected effort: xhigh
Policy source: project state
Provider default effort: medium
Selection mode: review-target
Model axis: selected:gpt-5.6-terra
Effort axis: selected:xhigh
Dispatch target: oat-reviewer-gpt-5-6-terra-xhigh
Rationale: reviewer runs at the configured policy cap for deterministic quality gate behavior.
```

Codex inherit/default fallback example:

```text
OAT Dispatch: Phase p02 review
Host: Codex
Route: none; level=none
Requested controls: model=none, effort=provider-default, target=oat-reviewer
Configured defaults: provider default effort=medium
Runtime confirmation: not-observable
Preferred effort: provider-default
OAT Dispatch Tier: inherit host defaults
Resolved cap: none
Selected effort: provider-default
Policy source: project state
Provider default effort: medium
Selection mode: inherit-default
Model axis: inherited
Effort axis: provider-default
Dispatch target: oat-reviewer
Rationale: explicit inherit/default policy; base unpinned role follows Codex provider default.
```

Generic sidecar/explorer dispatch:

- Built-in or generic sidecars such as `explorer` are not OAT-managed implementer, reviewer, or fix roles.
- If a sidecar spawn payload does not explicitly pin a reliable effort/model control, log `Preferred effort: provider-default`, `Selected effort: provider-default`, and `Effort axis: provider-default`.
- Do not classify a generic sidecar as `Preferred effort: low|medium|high|xhigh|max` unless the actual host invocation contains the corresponding reliable selection. If the host has no reliable effort control for that sidecar, use provider-default wording instead.
- Sidecar outputs are advisory context only. Implementation work and review/fix gates still follow the OAT-managed dispatch rules above.

Codex generic explorer example:

```text
OAT Dispatch: p02-t10 sidecar exploration
Host: Codex
Route: sidecar/explorer; level=none
Requested controls: model=none, effort=provider-default, target=explorer
Configured defaults: provider default effort=xhigh
Runtime confirmation: not-observable
Preferred effort: provider-default
OAT Dispatch Tier: high
Resolved cap: xhigh
Selected effort: provider-default
Policy source: project state
Provider default effort: xhigh
Model axis: inherited
Effort axis: provider-default
Dispatch target: explorer
Rationale: read-only sidecar exploration; generic explorer payload does not pin an OAT-managed effort variant.
```

Include resolved dispatch context in scope packets when known:

```yaml
model_axis: { selected:<value> | inherited | not-applicable | host-auto }
effort_axis:
  {
    selected:<value> | provider-default | inherited | not-applicable | host-auto,
  }
dispatch_ceiling: { resolved ceiling value }
dispatch_policy:
  {
    economy | balanced | high | frontier | uncapped | inherit host defaults | legacy capped,
  }
ceiling_source: { repo config | project state | preflight prompt }
policy_source: { repo config | project state | preflight prompt }
provider_default_effort: { value | unknown | not-applicable }
dispatch_route_level:
  { integer route level; omit when no ordered route is in play }
dispatch_target:
  { resolver target or host-specific dispatch target; omit if unknown }
dispatch_stamp: { exact `Dispatch: ...` line written to Dispatch Notes }
dispatch_rationale: { short rationale }
```

### Dispatch Policy Enforcement Log

After each phase dispatch (implementation, fix, or review), append one enforcement
log line. The log reflects the `mode` and `mechanism` returned by
`oat project dispatch-ceiling resolve` — do not compute these yourself.

**Three-state log format:**

```text
Dispatch policy: {policy}; selected={selected value | none}; cap={value | none} ({provider}, {mode} — {mechanism detail})
```

**Log examples (matching resolver output):**

```text
Dispatch policy: balanced; selected=xhigh; cap=xhigh (codex, enforced — variant oat-phase-implementer-gpt-5-6-terra-xhigh)
Dispatch policy: high; selected=high; cap=high (codex, enforced — variant oat-reviewer-gpt-5-6-sol-high)
Dispatch policy: frontier; selected=max; cap=max (codex, enforced — variant oat-reviewer-gpt-5-6-sol-max)
Dispatch policy: uncapped; selected=xhigh; cap=none (codex, enforced — variant oat-phase-implementer-gpt-5-6-terra-xhigh)
Dispatch policy: inherit host defaults; selected=none; cap=none (codex, advisory — base role follows provider default)
Dispatch policy: balanced; selected=sonnet; cap=sonnet (claude, enforced — Task model arg)
Dispatch policy: frontier; selected=fable; cap=fable (claude, enforced — Task model arg)
Cursor opaque model-string example: Dispatch policy: frontier; selected=gpt-5.6-sol-max; cap=gpt-5.6-sol-max (cursor, enforced — model arg gpt-5.6-sol-max)
Dispatch policy: unresolved; selected=none; cap=none (codex, advisory — policy set but no value resolved)
```

**Verify-on-upgrade (`verifyOnDispatch: true`):**

When the resolver returns `providers.<provider>.verifyOnDispatch: true`, the
requested tier is above the orchestrator tier (an upgrade request). Before
logging `enforced`, confirm the actual model/tier used by the dispatched agent.
If the provider honored the request, log `enforced`. If it did not:

```text
Dispatch policy: high; selected=opus; cap=opus (claude, advisory — provider did not honor upgrade; ran sonnet)
```

**`enforced`** — the adapter compiled concrete dispatch args and the provider
accepted them. Log value + provider + mechanism detail (variant name or "Task
model arg").

**`advisory`** — the adapter supports the policy but no concrete value resolved,
the policy intentionally inherits provider defaults, or the provider is known
but could not be verified. Log with note "policy set but no value resolved",
"base role follows provider default", or "provider did not honor upgrade; ran
\<tier\>".

**`unsupported`** — the provider has no registered adapter. Log with note "no
adapter; informational". Never block on unsupported — dispatch follows provider
defaults.

### Dry-Run Mode

When the skill is invoked with `--dry-run`:

1. Perform Steps 0–2 fully (resolve project, capability detection, read plan, validate metadata, build schedule).
2. Skip all phase dispatches, merges, and artifact writes.
3. Output the execution plan:

   ```
   OAT ▸ IMPLEMENT (dry-run)

   Project:   {PROJECT_PATH}
   Tier:      {1 | 2}
   Retry:     {N}

   Schedule:
     [1] p01 (sequential)
     [2] p02, p03 (parallel group, worktrees)
     [3] p04 (sequential)

   Worktrees that would be created:
     - {project-name}/p02
     - {project-name}/p03

   No commits, no artifact writes.
   ```

4. Exit without modifying any files.

### Step 1: Check Plan Complete

```bash
cat "$PROJECT_PATH/plan.md" | head -10 | grep "oat_status:"
```

**Required frontmatter:**

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`

**If not complete:** Block and ask user to finish plan first.

### Step 1.5: Resumption Detection

If `{PROJECT_PATH}/implementation.md` already contains orchestration run entries, we may be resuming an interrupted run.

1. Read `implementation.md` and find the most recent `### Run N` entry.
2. Compare its phases-passed / phases-failed / phases-stopped counts against the plan's phase list.
3. If there are phases in the plan that are not yet covered by any run entry, those are the resume targets.
4. Read `state.md` for `oat_current_task` to cross-check the expected resume point.
5. Read `git log` to verify the most recent bookkeeping commit matches the last reported state.

**Detected state reconciliation:**

- If there is an in-flight phase (implementer committed but no review verdict in implementation.md), re-dispatch the reviewer for that phase's current HEAD.
- If there are un-cleaned worktrees from a prior parallel group, list them and ask the user whether to resume or clean up:

  ```
  Found un-cleaned worktrees from a prior run:
    - ../worktrees/{name}/p02 — verdict was: excluded
    - ../worktrees/{name}/p03 — verdict was: pass, not merged

  Resume (merge pending verdicts into orchestration branch) or clean up?
  ```

6. Once resume target is identified, continue from that phase with the normal per-phase flow.

**On first-ever invocation** (no prior run entries), skip resumption detection and proceed to Step 2.

### Step 2: Read Plan Document

Read `"$PROJECT_PATH/plan.md"` completely to understand:

- All phases and tasks
- File changes per task
- Verification commands
- Commit messages

### Step 2.1: Validate Parallelism Metadata

Invoke the CLI validator to check plan.md parallelism metadata:

```bash
oat project validate-plan --project-path "${PROJECT_PATH}"
```

(If `oat` is not in PATH, use: `pnpm run cli -- project validate-plan --project-path "${PROJECT_PATH}"`)

The command validates:

- `oat_plan_parallel_groups` is either missing / empty (meaning fully sequential, no check needed) or a nested array of phase ID strings.
- Every referenced phase ID exists in the plan.
- No phase ID appears in more than one group.
- No singleton groups (each group must contain at least 2 phases).

**Reactions:**

- Exit code 0 → validation passed; continue to Step 2.2.
- Non-zero exit code → STOP immediately. Surface the validator's stderr output to the user. Do not silently fall back to sequential — the plan must be fixed first.

The validation contract is enforced by the CLI command and unit-tested there; the skill is just the consumer.

### Step 2.2: Build Execution Schedule

From the phase list and the validated parallel groups, build an execution schedule:

- Phases not listed in any group form singleton entries (run sequentially).
- Each parallel group forms a multi-phase entry (run concurrently in worktrees).
- Schedule entries execute in plan order.

Example:

- Plan phases: p01, p02, p03, p04, p05
- `oat_plan_parallel_groups: [["p02", "p03"], ["p04", "p05"]]`
- Schedule: `[p01]` → `[p02, p03]` (group) → `[p04, p05]` (group)

### Step 2.5: Confirm Plan HiLL Checkpoints

Read `oat_plan_hill_phases` from `"$PROJECT_PATH/plan.md"` frontmatter when present and validate it.

- **Valid format:** JSON-like array of phase IDs (e.g., `["p01","p03"]`)
- **Allowed pre-confirmation state:** field missing entirely on the first implementation run
- **Invalid format examples:** scalar string, malformed array, unknown phase IDs

Determine whether this is a first implementation run:

- If `"$PROJECT_PATH/implementation.md"` does not exist, treat as first run.
- If it exists but still has template placeholders and no completed task evidence, treat as first run.

#### Workflow preference check (before prompting)

Before presenting the checkpoint prompt to the user, check if a workflow preference has been configured:

```bash
HILL_DEFAULT=$(oat config get workflow.hillCheckpointDefault 2>/dev/null || true)
```

- **If `HILL_DEFAULT` is `every`:** Skip the prompt. Write `oat_plan_hill_phases: []` to plan.md frontmatter. Print: `HiLL checkpoints: every phase (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If `HILL_DEFAULT` is `final`:** Skip the prompt. Determine the final phase ID from plan.md (e.g., `p05`) and write `oat_plan_hill_phases: ["<final_phase_id>"]` to plan.md frontmatter. Print: `HiLL checkpoints: final phase only (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If unset, empty, or invalid:** Fall through to the standard prompt behavior below.

This preference check only applies on first runs — resuming implementations should trust the existing `oat_plan_hill_phases` value in plan.md (or repair as bookkeeping drift).

Prompt behavior:

- **If first run:** always present a complete phase-by-phase summary and confirm checkpoint phases before any task execution. A missing `oat_plan_hill_phases` value is the normal unconfirmed state; if a value is already present, treat it as a provisional value to confirm rather than as final.
- **If resuming and `oat_plan_hill_phases` is valid:** do not re-ask; print active checkpoint config and continue.
- **If resuming and `oat_plan_hill_phases` is missing/invalid:** treat this as bookkeeping drift, because implementation should already have written the confirmed value before prior task execution. Ask the user to repair the checkpoint configuration before continuing.

Required prompt shape for first-run confirmation:

1. Open with plan framing:
   - `This plan has {phase_count} phases. Final phase: {final_phase_id}.`
2. Briefly summarize every plan phase in order:
   - `p01 — {short phase summary}`
   - `p02 — {short phase summary}`
   - ...
   - Never omit this summary, even if the plan has only one phase or `oat_plan_hill_phases` already contains a provisional value.
3. Ask the checkpoint question using exactly three options:
   - `Which checkpoint behavior do you want?`
   - `1. Stop after each phase (default)`
   - `2. Stop after specific phases, e.g. p02, p05`
   - `3. Stop only after the final phase is completed`
4. Map the options to stored values:
   - `1` -> `[]`
   - `2` -> user-specified array such as `["p02","p05"]`
   - `3` -> `["p07"]` (replace `p07` with the actual final phase ID for this plan)
5. If a provisional `oat_plan_hill_phases` value already exists, mention it after presenting the three options, but still require the user to choose or confirm one of them.

When user confirms/changes:

- Update `"$PROJECT_PATH/plan.md"` frontmatter `oat_plan_hill_phases` to the confirmed value before executing tasks.
- Keep the value stable for the rest of the run unless the user explicitly requests a change.

#### Auto-Review at HiLL Checkpoints (Touchpoint A)

After checkpoint behavior is confirmed, resolve auto-review preference:

1. Read `workflow.autoReviewAtHillCheckpoints` via `oat config get workflow.autoReviewAtHillCheckpoints`. This uses local > shared > user resolution and falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when the workflow key is unset.
2. **If config explicitly `true`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: true` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: enabled (from workflow.autoReviewAtHillCheckpoints)."
3. **If config explicitly `false`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: false` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: disabled (from workflow.autoReviewAtHillCheckpoints)."
4. **If config is unset:** Add one question after the checkpoint choice:
   ```
   4. Auto-review at HiLL checkpoints?
      - yes: automatically run the lifecycle review when a HiLL checkpoint phase completes
      - no (default): manual lifecycle review triggering
   ```
5. Write `oat_auto_review_at_hill_checkpoints: true|false` to plan.md frontmatter alongside `oat_plan_hill_phases`.

This setting controls only the extra `oat-project-review-provide` lifecycle review at HiLL checkpoints. It does not control Tier 1 phase gate reviews; Tier 1 always runs `oat-reviewer` after each phase.

**On resume:** If `oat_auto_review_at_hill_checkpoints` is already present in plan.md frontmatter, skip Touchpoint A entirely — do not re-ask, do not re-read config, do not print the auto-review note. The stored value is authoritative. If only legacy `oat_auto_review_at_checkpoints` is present, treat it as authoritative for this run and write the new `oat_auto_review_at_hill_checkpoints` key on the next plan frontmatter update.

### Step 2.6: Validate Optional Phase Review Gate

Read `oat_phase_review_gate` from `"$PROJECT_PATH/plan.md"` frontmatter when present.

This is the plan-level `phaseReviewGate` setting: an optional, non-pausing external lifecycle review gate that runs after a phase's standard per-phase self-review passes. It uses the existing `oat gate review` target configuration to run a cross-provider review, then maps the produced review artifact to a blocking/non-blocking gate result.

Valid shape:

```yaml
oat_phase_review_gate:
  enabled: true
  phases: [] # empty or omitted = every implementation phase
  review_type: code
  exit_nonzero_on: important
```

Validation rules:

- Missing, `null`, or `enabled: false` means disabled.
- `enabled: true` activates the gate.
- `phases` is optional. If missing or empty (`[]`), run after every implementation phase. If populated, every value must be a known plan phase ID.
- `review_type` is optional and defaults to `code`. This skill only supports `code` phase gates; any other value is invalid for implementation phase execution.
- `exit_nonzero_on` is optional and defaults to `important`. Allowed values: `critical`, `important`, `medium`, `minor`.

If the setting is invalid, stop before task execution and ask the user to repair `plan.md`. Do not silently disable a malformed gate.

This setting is independent from HiLL checkpoints:

- It does not pause when the gate passes.
- It does not append to `oat_hill_completed`.
- It does not alter `oat_plan_hill_phases` or `oat_auto_review_at_hill_checkpoints`.
- It uses the existing gate target config; do not hardcode `--target` in reusable plan execution unless the user explicitly asks for manual/debug routing.

### Step 3: Check Implementation State

Check if implementation already started:

```bash
cat "$PROJECT_PATH/implementation.md" 2>/dev/null | head -20
```

**If exists and has progress:**

- Read `oat_current_task_id` from frontmatter (e.g., "p01-t03" or "prev1-t01")
- **Revision task recognition:** `p-revN` phases and `prevN-tNN` task IDs are treated identically to standard `pNN` phases and `pNN-tNN` tasks for execution purposes. The implement skill does not need special handling — it just follows the plan sequentially.
- Validate the task pointer:
  - If `oat_current_task_id` points at a task already marked `completed` in the body, advance to the **next incomplete** task (first `pending` / `in_progress` / `blocked` entry).
  - If all tasks are completed, skip ahead to finalization (Step 11+).
- **Always resume** from the resolved task. Print `Resuming from {task_id}.` Do not prompt.
- **Fresh start is an explicit override only.** If the user invoked the skill with `fresh=true` (argument), warn `Starting fresh — this will overwrite implementation.md. Any draft logs will be lost.` and proceed with fresh initialization. Do not offer fresh start interactively; it is a rare edge case reserved for corrupt state or deliberate plan rewrites.

**Stale-state reconciliation (approval required):**

- Before executing tasks, cross-check `plan.md` Reviews status with `implementation.md` + `state.md`.
- If `plan.md` shows a scope as `passed` but `implementation.md` / `state.md` still says "awaiting re-review" (or leaves `oat_current_task_id` / `oat_current_task` as `null` while future plan tasks are still incomplete), treat this as bookkeeping drift.
- Resolve the next task from plan order (first incomplete non-review task after the passed scope), then ask:
  - "Detected bookkeeping drift: review is passed in plan.md, but state artifacts still show awaiting re-review. Update artifacts and continue from {next_task_id}?"
- Only if the user approves:
  - Update `implementation.md` frontmatter `oat_current_task_id: {next_task_id}`
  - Update `state.md` frontmatter `oat_current_task: {next_task_id}` and refresh stale "awaiting re-review" wording
  - Update implementation review notes "Next" guidance to continue implementation (not re-review)
- If the user declines:
  - Do not auto-edit bookkeeping; pause and ask whether to proceed manually or stop.

**If doesn't exist:**

- Initialize from template (Step 4)

**Important:** Never overwrite an existing `implementation.md` without explicit user confirmation (and warn that draft logs will be lost).

### Step 4: Initialize Implementation Document

Copy template: `.oat/templates/implementation.md` → `"$PROJECT_PATH/implementation.md"`

Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: p01-t01 # Stable task ID from plan
---
```

Initialize project state so other skills (e.g., `oat-project-progress`) reflect that implementation has started:

- In `"$PROJECT_PATH/state.md"` frontmatter:
  - `oat_phase: implement`
  - `oat_phase_status: in_progress`
  - `oat_current_task: p01-t01`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 5: Per-Phase Execution

For each phase `pNN` in the plan (or each phase in a plan-declared parallel
worktree group), dispatch exactly one phase coordinator. The coordinator reads
the phase once and dispatches one exact task worker per task. It must not
implement ordinary plan tasks in its own context.

#### Resolve the Task Maximum

Before coordinator dispatch, read the project named ceiling from
`state.md:oat_dispatch_policy.policy`. Then inspect the optional plan
`## Dispatch Profile` row for this phase:

1. An explicit phase `economy`, `balanced`, `high`, or `frontier` narrows the
   project maximum and sets `task_ceiling_source: phase`.
2. Blank, absent, or `auto` uses the project maximum and sets
   `task_ceiling_source: project`.
3. Reject an unknown tier or a phase tier above the project tier.
4. `uncapped` and explicit inherit/default retain their existing policy
   semantics and have no named `--ceiling-tier`; never synthesize one.

The project or phase named ceiling is a maximum, not the coordinator target or
an exact family preference. Under High, lower configured Economy, Balanced, and
High candidates remain available for different tasks.

#### Build and Dispatch Phase Scope

```yaml
project: {PROJECT_PATH}
phase: {pNN}
mode: implement
artifact_paths:
  plan: {PROJECT_PATH}/plan.md
  design: {PROJECT_PATH}/design.md
  spec: {PROJECT_PATH}/spec.md
  implementation: {PROJECT_PATH}/implementation.md
  discovery: {PROJECT_PATH}/discovery.md
workflow_mode: {spec-driven|quick|import}
active_provider: {codex|claude|cursor|other}
project_ceiling_tier: {named project maximum; omit when none}
phase_ceiling_tier: {explicit narrower phase maximum; omit for auto/blank}
task_ceiling_tier: {effective project or phase named ceiling}
task_ceiling_source: {project|phase}
commit_convention: {from plan.md}
coordinator_target: {resolver-selected coordinator target}
```

Tier 1 uses the already resolved exact coordinator role/model payload and sends
the Phase Scope. A concrete Codex coordinator uses
`providers.codex.dispatchArgs.variant` first as native `agent_type`. After the
host accepts the spawn, record the coordinator `target`, `model_axis`, and
`effort_axis` from resolver output and that constructed launcher payload; do not
wait for or accept a coordinator self-report as proof. Only an actual native
role-selection rejection permits the fresh child pinned to the resolver's model
and effort with canonical coordinator instructions. An accepted coordinator
that later returns `BLOCKED` has produced a coordinator outcome and cannot
trigger fallback. Claude and Cursor coordinator calls pass their exact resolver
model argument.

Tier 2 may run the coordinator instructions in the current context only when
that context can still dispatch every exact task worker. Tier 2 never permits
the coordinator to edit ordinary task files. If no exact worker route exists,
block before phase work.

#### Per-Task Coordinator Contract

For each task in dependency order, the coordinator must:

1. Classify only that bounded task and choose one configured candidate at or
   below `task_ceiling_tier`.
2. Call the exact candidate resolver with the invocation-only named maximum:

   ```bash
   oat project dispatch-ceiling resolve \
     --provider <active-provider> \
     --role implementer \
     --ceiling-tier <project-or-phase-named-tier> \
     --candidate-model <exact-model> \
     --report-scope <task-id> \
     --report-action implementation \
     --project-path "$PROJECT_PATH" \
     --json
   ```

   Codex also passes `--candidate-effort <exact-effort>`. The returned top-level
   `source` must be `invocation`; `providers.<provider>.cellSource` continues to
   identify the config layer that owns the candidate definition. This command
   is read-only and must never persist its override.

3. Build the actual provider invocation before logging:
   - Codex first uses `providers.codex.dispatchArgs.variant` as native
     `agent_type`. Spawn acceptance establishes the configured invocation; only
     a native role-selection rejection permits the exact fresh pinned-child
     model/effort route.
   - Claude passes `providers.claude.dispatchArgs.model` as the actual Task
     `model`.
   - Cursor passes `providers.cursor.dispatchArgs.model` byte-for-byte as the
     actual invocation model. Treat the string as opaque and never normalize or
     infer capability from it.
   - After construction, record the task-worker `target`, `model_axis`, and
     `effort_axis` from resolver output and the launcher payload. Missing worker
     telemetry or self-report is not unavailability, and self-report cannot
     replace those launcher-owned values.
4. Send one bounded Task Scope, never the full phase task list:

   ```yaml
   mode: task-worker
   task_id: { one pNN-tNN ID }
   task_name: { task title }
   task_plan: { only this task's steps }
   file_boundary: { only this task's files }
   verification: { only this task's verification commands }
   commit_convention: { exact expected task commit }
   ceiling_tier: { effective named maximum }
   ceiling_source: { project|phase }
   dispatch_target: { resolver-returned exact target }
   dispatch_args: { complete actual provider payload }
   ```

5. Dispatch one exact task worker and wait for its terminal result before the
   next task. Workers in the same worktree run serially; task fan-out is
   forbidden. Parallelism remains limited to plan-declared phase/worktree
   groups.
6. Verify the worker's task ID, result, tests, file boundary, clean worktree,
   and reported commit against `git rev-parse HEAD` and the pre-task HEAD. A
   worker must contribute exactly one verified task commit.
7. Record each task's exact target, result, and commit in the returned **Task
   Dispatch Summary**, then perform phase-wide verification and integration
   self-review without editing ordinary task files.

If a candidate is missing or absent, exceeds or is above the named ceiling, or
cannot be invoked with exact controls, fail closed and block the phase. Never
fall back or downgrade to the coordinator target, base role, or inferred
provider default. A transient retry reuses the same complete provider payload;
a substantive escalation re-resolves within the same named maximum and bounded
retry limit.

#### Handling Coordinator Status

- **DONE:** verify the Task Dispatch Summary, then proceed to phase review.
- **DONE_WITH_CONCERNS:** correctness concerns require a new bounded exact fix
  worker before review; advisory concerns are recorded.
- **NEEDS_CONTEXT:** supply only the missing context and retry within the bound.
- **BLOCKED:** stop and surface the phase, task, exact target, and reason. Do not
  proceed to later phases.

### Per-Phase Review

After the implementer returns DONE (or DONE_WITH_CONCERNS without correctness concerns), dispatch the reviewer for the phase.

**Dispatch:**

- Use the same tier that was selected at start.
- For Codex with a capped managed policy, first dispatch the materialized reviewer role returned in `providers.codex.dispatchArgs.variant` as native `agent_type` for deterministic quality gates. After spawn acceptance, record the review `target`, `model_axis`, and `effort_axis` from resolver output and the constructed launcher payload; reviewer self-report cannot populate or overwrite them.
- Only if the exact registered reviewer role receives a native role-selection rejection may the launcher start a fresh Codex child with explicit model, reasoning effort, and canonical role instructions from `.agents/agents/oat-reviewer.md`; never substitute the managed base role and never require restart/hot reload. Missing reviewer telemetry or self-report is not a rejection, and an accepted reviewer that later returns `BLOCKED` cannot trigger fallback.
- For Codex with managed `Uncapped` or inherit/default mode, no reviewer target exists; use base `oat-reviewer`, log `effort_axis=provider-default`, and explain that the base role follows the provider default.
- For Claude Code with a capped managed policy, require `providers.claude.dispatchArgs.model` and pass that exact value as the review `model`; managed `Uncapped` or inherit/default mode omits `model` because no reviewer target exists. Always keep `effort_axis=not-applicable`.
- For Cursor with a concrete managed reviewer target, require `providers.cursor.dispatchArgs.model` and pass that exact opaque, unnormalized string as the actual review invocation's `model` argument.
- Build the actual provider invocation before logging the reviewer target. If the host cannot apply the required Claude or Cursor model argument, fail closed or block unless inline execution has verified equivalent current-host controls.
- Tier 1: dispatch the selected reviewer target via provider-native subagent mechanism with Review Scope:

  ```
  project: {PROJECT_PATH}
  type: code
  scope: {pNN}
  commits: {base_sha}..{head_sha}
  files_changed: {optional hint from implementer's report}
  workflow_mode: {from state.md}
  artifact_paths: {same as Phase Scope}
  tasks_in_scope: {list of pNN-tNN IDs in the phase}
  dispatch_policy: {economy | balanced | high | frontier | uncapped | inherit host defaults | legacy capped}
  dispatch_ceiling: {resolved cap value | null}
  policy_source: {repo config | project state | preflight prompt}
  ceiling_source: {repo config | project state | preflight prompt} # compatibility alias for policy_source
  provider_default_effort: {value | unknown | not-applicable}
  model_axis: { selected:<value> | inherited | not-applicable | host-auto }
  effort_axis: {selected:<Codex value> | provider-default | not-applicable}
  dispatch_rationale: {capped reviewer target | uncapped/inherit reviewer fallback}
  ```

  - For Codex Tier 1 dispatches, send the Review Scope block as a self-contained packet and keep fresh context (`fork_context: false`). The reviewer is expected to reconstruct context from git state and the OAT artifacts listed above.
  - For Codex Tier 1 review dispatches, use the materialized Codex role name from `providers.codex.dispatchArgs.variant` only when the resolver returns a reviewer variant for a capped managed policy. A Codex materialized reviewer role selected from a model+effort target must carry `model_axis=selected:<model>` and `effort_axis=selected:<effort>` from resolver output. Use base `oat-reviewer` only when the resolver returns no `dispatchArgs.variant` for managed `Uncapped`, inherit/default mode, or provider-default fallback, and log `effort_axis=provider-default`. For Claude Code, pass `model: providers.claude.dispatchArgs.model` for a concrete managed reviewer and never pass a per-review effort override. For Cursor, pass `model: providers.cursor.dispatchArgs.model` byte-for-byte for a concrete managed reviewer.
  - Treat the commit range as authoritative for review scope. `files_changed` is optional orientation metadata only.
  - If a reviewer does not return a terminal result on the first wait, poll once more. If it still has not concluded, send one concise nudge to return immediately with current findings. If the reviewer still does not conclude, treat the target-preserving review dispatch as failed for this phase. When the original native reviewer spawn was accepted, retry the same already-selected native `agent_type` route within the retry bound; do not switch that timed-out reviewer to a fresh pinned child. The fresh pinned-child route is eligible only when the original native attempt received explicit pre-start role-selection rejection. Retry an already-selected pinned fresh-child route or complete Claude/Cursor invocation payload without changing routes, preserving the exact model argument; never downgrade a timed-out managed reviewer to unpinned inline execution.

- Tier 2: read `.agents/agents/oat-reviewer.md` and review inline only with verified equivalent current-host model and effort controls, explicit inherit/default behavior, or the documented managed-uncapped reviewer behavior. Otherwise block.

**Verdict outcomes:**

Parse the reviewer's confirmation for verdict + finding severities. Map to pass / fail:

- **pass:** zero Critical and zero Important findings.
- **fail:** one or more Critical or Important findings.
- **blocked:** An accepted reviewer `BLOCKED` terminal blocks this phase review.
  It does not invoke fallback and must not be interpreted as a pass due to
  absent findings. Stop and surface the review target and blocker reason.

Medium / Minor findings do not block the phase but are recorded.

#### Bounded Fix Loop

On reviewer verdict `fail`, run a bounded fix loop.

1. Read `oat_orchestration_retry_limit` from `state.md` frontmatter (default: `2`, range 0–5).
2. For each retry (up to the limit):
   a. Convert Critical/Important findings into bounded fix scopes associated with one planned task/file boundary at a time. Do not hand one worker the full phase finding list.
   b. Reuse the phase coordinator in `fix` mode. It selects an exact candidate under the same project or phase named ceiling with `--ceiling-tier`, then emits one Task Scope per bounded fix. Codex first uses `providers.codex.dispatchArgs.variant` as native `agent_type`; only a native role-selection rejection permits the exact fresh-child fallback. Claude and Cursor pass their exact `providers.<provider>.dispatchArgs.model` value on the actual invocation. After constructing the launcher payload, record the fix `target`, `model_axis`, and `effort_axis` from that payload and resolver output. Missing fix-worker telemetry or self-report is not unavailability, and an accepted fix worker — including one that returns `BLOCKED` — cannot trigger fallback. Every fix worker writes the formal `Dispatch: scope=<phase-or-task> action=fix role=fix producer=<slug|unknown> provenance=<declared|observed|inferred|unknown> model_axis=<axis> effort_axis=<axis> dispatch_policy=<policy|unknown> dispatch_ceiling=<value|none> target=<target|unknown>` stamp before execution.
   c. Receive and verify each fix result and commit. The coordinator must not apply fixes itself, and Tier 2 does not authorize inline task edits.
   d. Re-dispatch the reviewer with the updated commit range.
   e. Parse the new verdict.
   f. If pass → exit the loop successfully.
   g. If fail and retries remain → continue.
   h. If fail and retries exhausted → exit the loop with terminal verdict `failed`.

**Terminal `failed` handling:**

- **Sequential mode:** STOP the run. Surface to user with phase ID, unresolved findings, review artifact path. Do not proceed to subsequent phases.
- **Parallel group mode:** mark the phase `excluded`. Do not merge its worktree. Continue the remaining phases in the group. Report in Outstanding Items after the group completes.

### Optional External Phase Review Gate

After the standard per-phase reviewer passes and after the required phase bookkeeping commit is cleanly recorded, check `oat_phase_review_gate`.

If the gate is enabled and the current phase is selected:

1. Run the gate from the orchestration branch with the active project path:

   ```bash
   oat --json gate review \
     --project "$PROJECT_PATH" \
     --review-type code \
     --review-scope "{pNN}" \
     --exit-nonzero-on "{threshold}" \
     '$oat-project-review-provide code {pNN}'
   ```

   - `{threshold}` comes from `oat_phase_review_gate.exit_nonzero_on` (default: `important`).
   - `{pNN}` is the completed phase ID.
   - Do not pass `--target` in normal execution; the existing gate config selects the cross-provider target.
   - The gate CLI injects gate context into the review prompt. The produced review artifact must use `oat_review_invocation: gate`.

2. Parse the JSON result. Before invoking review-receive, all three receive-eligibility conditions must hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and `handoff` is non-null. A missing or contradictory field is an operational failure even when `artifactPath` is present. The gate verdict (`exit_nonzero_on: {threshold}`) decides whether the phase **stops**; it does not decide whether sub-threshold findings are ignored. Once eligibility is established, the produced artifact must be **consumed** — passing gate artifacts are not left unprocessed at the top level of `reviews/`.
   - With eligibility established, `status: "ok"` / exit code `0` means the phase gate passed at the configured threshold, so the phase does not stop. Run `oat-project-review-receive` for the reported artifact path in non-pausing **judgment-sweep** mode (pass gate-passed context so receive selects sweep disposition). The sweep makes a per-finding judgment for each Medium/Minor — defer to final (default), address now (small/contained/low-risk fixes only), or reject with rationale — writes those durable dispositions into `implementation.md`, and archives the artifact. Then continue without pausing. Address-now fixes from a passing gate do **not** re-trigger the standard reviewer or re-gate the phase.
   - With eligibility established, `status: "blocked"` / non-zero exit due to review findings means blocking findings exist. Run `oat-project-review-receive` for the reported artifact path (blocking disposition) before treating the gate review as consumed.
   - Any other status, or a non-zero exit caused by target execution failure, artifact validation failure, or missing review artifact, is an operational failure. Stop and surface the gate output; do not continue as if the gate passed.

3. If `oat-project-review-receive` adds fix tasks (blocking gate, or a sweep address-now fix that revealed a Critical/Important concern):
   - Return to task execution for the newly added review-fix tasks.
   - After fixes land, re-run the standard per-phase reviewer and this external phase gate for the same phase.
   - Continue only after both the standard reviewer and the external phase gate pass.
   - Bound these gate block → fix → re-gate rounds by `oat_orchestration_retry_limit` (from `state.md`, default `2`). If the limit is exhausted with the gate still blocking, apply the same terminal handling as the standard bounded fix loop: **sequential mode** stops the run and surfaces the phase ID, unresolved findings, and artifact path; **parallel group mode** marks the phase `excluded` and reports it in Outstanding Items.

4. If the judgment sweep (passing gate) records only deferrals/rejections and no blocking fix tasks, record the receive result and continue.

For a parallel group, run selected phase gates after fan-in and bookkeeping, one gate per successfully merged phase in plan order. If a phase gate blocks, stop the schedule and process that gate's review before starting later schedule entries.

### Parallel Group Execution

When the current schedule entry is a multi-phase group, execute as follows.

**Tier 2 degradation:** If Tier 2 was selected at skill start, Tier 2 cannot run concurrent subagents. Degrade the group to sequential target-preserving execution on the orchestration branch. Do not create worktrees. For every phase, retain the exact role or pinned fresh child; inline is permitted only by the verified-equivalent-controls or documented-exception guard. Proceed through the per-phase loop in plan order.

**Tier 1 parallel execution:**

1.  **Bootstrap worktrees:** for each phase in the group, invoke `oat-worktree-bootstrap-auto` with branch name `{project-name}/{pNN}` and base = orchestration branch.

    > ⚠️ **CRITICAL — DO NOT substitute host-native worktree primitives.** Bootstrap MUST go through `oat-worktree-bootstrap-auto` with an explicit `--base` set to the current orchestration branch HEAD (capture `EXPECTED_HEAD=$(git rev-parse HEAD)` from the orchestration cwd before dispatching). Do not use Claude Code's `Agent({ isolation: "worktree" })`, Cursor's equivalent, or any other host-native isolation primitive in lieu of this skill — those mechanisms may use the primary repo's checkout (often `main`) as the base regardless of the orchestrator's current branch, silently producing a worktree that cannot see prior phase commits and forcing the entire group to degrade to sequential.
    - If **any** bootstrap fails, cancel any worktrees that bootstrapped successfully for this group and degrade the whole group to sequential target-preserving execution. Log the degradation reason to `implementation.md` Outstanding Items.

2.  **Verify worktree HEAD before dispatch (base-mismatch gate):** After bootstrap, verify each worktree is at the expected orchestration HEAD. From the orchestration cwd, capture `EXPECTED_HEAD=$(git rev-parse HEAD)` _before_ invoking bootstrap. After bootstrap, for each new worktree path, run `git -C {worktree-path} rev-parse HEAD` and confirm it matches `EXPECTED_HEAD`, or run `git -C {worktree-path} merge-base --is-ancestor "$EXPECTED_HEAD" HEAD` and confirm it succeeds (exit 0). If either check fails for any phase, treat the bootstrap as failed for that phase, cancel any successful sibling worktrees in this group, and degrade the entire group to sequential target-preserving execution — same mechanism as a primary bootstrap failure. Log the mismatch to `implementation.md` Outstanding Items, including the observed and expected SHAs (`expected={EXPECTED_HEAD}, observed={observed-head-sha}, phase={pNN}, worktree={path}`).

3.  **Concurrent phase dispatch:** for each successfully bootstrapped worktree (passing the base-mismatch gate above), dispatch one `oat-phase-implementer` coordinator with the worktree as its working directory. Coordinators may run concurrently across these plan-declared phase worktrees, but every coordinator dispatches its own task workers serially in that one worktree. The outer orchestration loop retains review and bounded-fix handling.

4.  **Wait for all phases:** do not proceed until every phase in the group reports a terminal verdict (pass or excluded).

5.  **Fan-in reconciliation (merge back in plan order):**

    For each phase in the group, in plan order (p02 before p03, etc.), if its verdict is pass:

    a. Attempt `git merge --no-ff {project-name}/{pNN} -m "merge({pNN}): {summary from implementer}"`.
    b. If merge produces conflicts, abort the merge and attempt cherry-pick of the phase's commits.
    c. If cherry-pick also produces conflicts, dispatch an inline conflict-resolution subagent via the Task tool. The orchestrator MUST NOT read the conflicted files itself — delegate to the subagent. Use this dispatch shape:

        ```
        Task (general-purpose subagent):
          description: "Resolve merge conflict for phase {pNN}"
          prompt: |
            You are resolving a git merge conflict during parallel-phase fan-in.

            Phase: {pNN}
            Orchestration branch: {orchestration-branch}
            Worktree: {worktree-path}
            Conflicted files: {list from git status}
            Project artifacts:
              plan:   {PROJECT_PATH}/plan.md
              design: {PROJECT_PATH}/design.md
              spec:   {PROJECT_PATH}/spec.md

            Steps:
            1. Read each conflicted file. Parse conflict markers (<<<<<<<, =======, >>>>>>>).
            2. Read the project artifacts to understand intent from both sides.
            3. Apply a resolution that preserves intent from both sides where possible.
            4. Remove conflict markers. Save files.
            5. Stage resolved files with `git add <files>`.
            6. Run integration verification: `pnpm test && pnpm lint && pnpm type-check`.
            7. If all pass: commit with `merge({pNN}): resolved conflict during fan-in`.
            8. If any step fails: do NOT commit. Return with the appropriate status.

            Return format (end of response):
              status: RESOLVED | UNRESOLVABLE | VERIFICATION_FAILED
              reasoning: <2-4 sentence summary of what you did or why you stopped>
              commit: <sha if RESOLVED, else null>
        ```

    d. Parse the subagent's return status: - `RESOLVED` → subagent has committed the merge; orchestrator proceeds to integration verification (Step 6) and the next phase in the group. - `UNRESOLVABLE` or `VERIFICATION_FAILED` → STOP the run. Surface to user with phase ID, conflicting files, worktree path, subagent's reasoning summary. Do not merge remaining phases.

    **Tier 2 conflict exception:** In Tier 2 runs, parallel groups already degrade to sequential, so fan-in conflicts do not arise from this code path. If a conflict surfaces from another operation, inline resolution is allowed only when the current-host controls satisfy the same verified-equivalence or documented-exception guard; otherwise stop for a target-preserving route.

6.  **Integration verification after each merge:**

    After each successful merge, run project verification (tests, lint, type-check). If verification fails:
    - Attempt a tractable fix (missing import, trivial type error). If the fix succeeds and verification passes, commit the fix.
    - If the fix is not tractable → revert the merge, STOP the run. Surface to user.

7.  **Worktree cleanup:**

    For phases that merged successfully and passed integration verification, clean up the worktree using the existing worktree cleanup mechanism (e.g., `git worktree remove`).

    For phases that were excluded (fix-loop exhausted), preserve the worktree and log its path in `implementation.md` Outstanding Items.

8.  **Bookkeeping commit** after the group completes. Then run any selected external phase review gates. After those gates pass, perform the HiLL checkpoint check.

### Step 7: Artifact Updates After Each Phase (or Group)

After each phase (sequential) or each parallel group (multi-phase) completes, update the tracking artifacts before moving on.

**`implementation.md`:**

Append a new entry to the `## Orchestration Runs` section between the `<!-- orchestration-runs-start -->` and `<!-- orchestration-runs-end -->` markers. Format:

```markdown
### Run {N} — {YYYY-MM-DD HH:MM}

**Branch:** {orchestration-branch}
**Tier:** {1 | 2}
**Policy:** merge-strategy=merge, retry-limit={N}
**Phases:** {N} executed, {N} passed, {N} failed, {N} stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- | ------- | -------- | -------- |
| pNN   | {status}    | {pass  | fail}          | N/{limit}   | {merged | excluded | stopped} |

#### Parallel Groups

- Group {N} [{phase list}]: worktree-based, merged in order
- {singleton phases}: sequential

#### Dispatch Notes

- Dispatch stamps: {formal `Dispatch: ...` records, plus route level and escalation rationale when applicable}

#### Outstanding Items

- {None | list of excluded phases with review paths and worktree paths}

#### Artifact / Design Deltas

Run-scoped snapshot only. The durable record is `## Deviations from Plan / Design`; consolidate any non-`None` entries there at the next phase boundary.

| Task / Review                 | Source Artifact                     | Planned / Documented            | Actual / Accepted                      | Reason                       | Source of Truth           | Follow-up                                   |
| ----------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------- | ---------------------------- | ------------------------- | ------------------------------------------- |
| {task_id/review_id or `None`} | {spec.md/design.md/plan.md section} | {planned behavior/taxonomy/API} | {actual shipped behavior/taxonomy/API} | {why divergence is accepted} | {implementation/artifact} | {artifact update task or explicit deferral} |
```

Append only — never overwrite prior run entries.

**`plan.md` review table:**

For each phase that completed:

- Pass on first try → set phase row to `passed` with date + review artifact path.
- Pass after fixes → set to `fixes_added` → `fixes_completed` → `passed` (match existing lifecycle).
- Fix-loop exhausted → leave at `fixes_added` with "excluded" note in the artifact link.
- `final` review row is never touched by this skill.

**`state.md`:**

- Update `oat_current_task` to the next un-run task ID (or the final task if run complete).
- Update `oat_last_commit` to the bookkeeping commit SHA about to be made.
- Update `oat_project_state_updated` to current ISO 8601 UTC timestamp.
- If `oat_execution_mode: subagent-driven` is present, remove the key.
- If the user supplied a `--retry-limit` override, persist as `oat_orchestration_retry_limit`.

**Bookkeeping commit (mandatory):**

```bash
oat state refresh
git add {PROJECT_PATH}/implementation.md {PROJECT_PATH}/state.md {PROJECT_PATH}/plan.md
git commit -m "chore(oat): bookkeeping after {pNN} {pass|fail}"
```

Then run the optional external phase review gate for the completed phase when `oat_phase_review_gate` selects it. After the gate passes or is skipped, check the HiLL checkpoint. A non-final checkpoint pauses at this boundary; defer a final-phase checkpoint to **Final HiLL Closeout Sequence** after final verification, final review, and any configured pre-approval steps succeed.

### Step 8: Check Plan Phase Completion

When all tasks in current plan phase complete (e.g., all p01-\* tasks done):

**Update frontmatter:**

```yaml
oat_current_task_id: { first_task_of_next_phase } # e.g., p02-t01
```

**Plan phase checkpoint:**
At the end of each plan phase (p01, p02, etc.), check `oat_plan_hill_phases` in plan.md to decide whether to pause:

- **If `oat_plan_hill_phases` is empty (`[]`):** Pause after every phase (default behavior after confirmation).
- **If `oat_plan_hill_phases` has values:** Pause only after completing a listed phase.
  - Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.
  - Example: `["p03"]` where p03 is the last phase → run all phases without pausing, then pause after p03 (end of implementation).
- **If `oat_plan_hill_phases` is missing at a phase boundary:** treat this as bookkeeping drift and stop to repair it before continuing, because the confirmation should already have been written during the first implementation run.

**Key semantic: listed phases are where you stop AFTER completing them, not before.** `["p03"]` means "complete p03, then pause" — not "pause before starting p03."

**Auto-review at HiLL checkpoints (Touchpoint B):**

Before pausing at a checkpoint, check if auto-review is enabled:

1. Read `oat_auto_review_at_hill_checkpoints` from plan.md frontmatter. If not present, fall back to legacy `oat_auto_review_at_checkpoints`. If neither is present, fall back to `oat config get workflow.autoReviewAtHillCheckpoints` (which itself falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when unset).

2. If enabled and this is a checkpoint phase:
   a. **Determine review scope:** Find the highest completed implementation phase already covered by a **`passed`** code-review row in plan.md Reviews table. Count only whole-phase scopes: `pNN` or `pNN-pMM`. Ignore task scopes (`pNN-tNN`) and rows with `fixes_added` or `fixes_completed` because those reviews did not pass and must be re-covered. Scope = every implementation phase after that passed coverage through the current phase, inclusive. If no earlier passed whole-phase review exists, start from the first implementation phase. Use `pNN-pMM` when the scope spans multiple phases. If this is the final implementation phase checkpoint, run `oat-project-review-provide code final`; use scope `final` and do not run a duplicate final phase-only lifecycle review, because Tier 1 already runs the standard per-phase reviewer before the final checkpoint branch.
   - Example: prior passed row `p01`, current checkpoint `p03` → review `p02-p03`
   - Example: no prior passed whole-phase review, current checkpoint `p03` → review `p01-p03`
   - Example: current checkpoint is the last implementation phase → review `final`
     b. **Spawn subagent review:** `oat-project-review-provide code {scope}` — instruct it to include `oat_review_invocation: auto` in the review artifact frontmatter.
     c. **Auto-invoke review-receive:** `oat-project-review-receive` — operates in auto-disposition mode when `oat_review_invocation: auto` is present:
   - Critical/Important/Medium: convert to fix tasks (same as manual)
   - Minor: auto-convert to fix tasks unless clearly out of scope
   - No user prompts for disposition
     d. **If fix tasks added:** continue implementing automatically (no checkpoint pause — return to Step 5 for the new fix tasks)
     e. **If scope passed:** proceed to the checkpoint pause below

3. If disabled: skip directly to the checkpoint pause.

When pausing at a non-final checkpoint:

- Output phase summary (tasks completed, commits made)
- Ask user: "Phase {N} ({phase_name}) complete. Continue to next phase?"
- Wait for user approval before proceeding to next plan phase

**Final checkpoint deferral:** If the current phase is the final implementation
phase and it is configured as a HiLL checkpoint, do not ask the generic
"Continue to next phase?" question. Final checkpoint auto-review above still
runs exactly as written, including `oat-project-review-provide code final` and
its no-duplicate-final-review rule. Then continue through Steps 9–14. Final
approval occurs only in **Final HiLL Closeout Sequence**, after final review and
the stored pre-approval sequence complete.

**Restart safety (required):**

- At the end of each task and at each phase boundary, ensure `implementation.md` is persisted and internally consistent:
  - `oat_current_task_id` points at the next task to do (or `null` when complete)
  - Phase status sections match the progress overview table
  - The implementation log reflects what was actually completed

**Phase summaries (required):**

- When a plan phase completes (p01, p02, etc.), update the "Phase Summary" section in `implementation.md` for that phase:
  - Outcome (behavior-level)
  - Key files touched (paths)
  - Verification run
  - Notable decisions/deviations

**Design/artifact deltas (required when present):**

- If a completed task intentionally diverged from `spec.md`, `design.md`, or `plan.md`, update the `## Deviations from Plan / Design` table in `implementation.md`.
- For existing project artifacts, treat any `## Deviations...` heading as the deviations section; migrate to the preferred `## Deviations from Plan / Design` heading and table shape when already touching the section.
- Each delta must include: the affected source artifact/section, the planned/documented expectation, the actual shipped implementation, the reason the divergence is accepted, the current source of truth, and any follow-up artifact update task or explicit deferral.
- If the implementation is now source of truth and the design/spec/plan is stale, write that directly. Do not treat the stale artifact as a no-op just because code is correct.
- If no deltas exist for the phase, do not invent one; leave the table unchanged.

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After phase summary and task pointer advancement, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for {phase} completion"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

**Note on HiLL types:**

- **Workflow HiLL** (`oat_hill_checkpoints` in state.md): Gates between workflow phases (discovery → spec → design → plan → implement). Checked by oat-project-progress router.
- **Plan phase checkpoints** (`oat_plan_hill_phases` in plan.md): Gates at plan phase boundaries during implementation. `[]` means pause after every phase; a populated array pauses only after listed phases. The field may be absent only before the first implementation-run confirmation. Listed phases are where you stop AFTER completing them. A checkpoint on the final implementation phase is deferred to final closeout so final verification, final review, and configured pre-approval work finish before explicit approval.
- **Phase review gate** (`oat_phase_review_gate` in plan.md): Optional non-pausing external review gate after a completed phase passes the standard reviewer. Missing/disabled means skip; `phases: []` means gate every implementation phase. Passing gates continue automatically; blocking gates are received/fixed before execution proceeds.

**Revision phase completion handling:**

When all tasks in a `p-revN` phase complete (revision phases created by `oat-project-revise`):

1. Set `oat_phase_status: pr_open` (not `complete` — the PR is still open for further review)
2. Set `oat_current_task: null`
3. Invoke `oat-project-summary` to update summary.md if it exists (implement owns summary re-generation at revision phase completion, not the revise skill)
4. Update next milestone: "Revision complete. Push changes to update PR. Run `oat-project-revise` for more feedback or `oat-project-complete` when approved."
5. Push changes to update the PR branch

This is different from regular phase completion — revision phases return to `pr_open` instead of continuing to the next phase, because the user needs to decide whether more revisions are needed.

### Step 9: Repeat Until Complete

Continue Steps 5-8 until all plan phases complete.

**Batch execution:**

- Default: Execute tasks one at a time
- If user requests: Execute N tasks before checking in
- Stop at configured plan phase boundaries for review

### Step 10: Handle Blockers

If a task cannot be completed:

**Mark as blocked:**

```yaml
oat_blockers:
  - task_id: { task_id } # e.g., p01-t03
    reason: '{description}'
    since: { date }
```

**Update task status:**

```markdown
### Task {task_id}: {Task Name}

**Status:** blocked
**Blocker:** {description}
```

**Notify user:**

```
Task {task_id} blocked: {reason}

Options:
1. Resolve blocker and continue
2. Skip task (mark as deferred)
3. Modify plan to address blocker
```

### Step 11: Mark Implementation Complete

When all plan tasks are complete (i.e., there is no next incomplete `pNN-tNN` task):

**Update "Final Summary" (required):**

- Before requesting final review / running `oat-project-pr-final`, update the `## Final Summary (for PR/docs)` section in `"$PROJECT_PATH/implementation.md"`:
  - What shipped (capabilities, behavior-level)
  - Key files/modules touched
  - Verification performed (tests/lint/typecheck/build/manual)
  - Design deltas (if any)
- This should reflect **what was actually implemented**, including any deviations from design and any review-fix work.

Update frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: null
---
```

**Important:** `oat_current_task_id` should never point at an already-completed task. If all tasks are done, set it to `null` and proceed to the final review gate.

### Step 12: Update Project State

Update `"$PROJECT_PATH/state.md"` so other skills reflect task completion and review gating:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: in_progress` (until final review passes)
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"implement"` is in `oat_hill_checkpoints`: append `"implement"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate.

Update content:

```markdown
## Current Phase

Implementation - Tasks complete; awaiting final review.

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ✓ Implementation tasks complete
- ⧗ Awaiting final review
```

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After updating state.md to reflect implementation completion, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for implementation complete"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

### Step 13: Final Verification

Run project-wide verification:

```bash
# Run tests
pnpm test

# Run lint
pnpm lint

# Run type check
pnpm type-check

# Run build
pnpm build
```

All must pass before proceeding.

### Step 14: Trigger Final Review

**At the final plan phase boundary, a code review is required before PR.**

An accepted reviewer `BLOCKED` terminal blocks final review. It does not invoke
fallback and must not be interpreted as a pass due to absent findings. Stop and
surface the review target and blocker reason.

Before requesting final review, ensure the latest project-artifact bookkeeping is already committed. Review should evaluate the implementation state as it actually stands on the branch, not a half-tracked working tree.

Check if final review already completed (preferred source of truth: plan.md Reviews table):

```bash
FINAL_ROW=$(grep -E "^\\|\\s*final\\s*\\|" "$PROJECT_PATH/plan.md" 2>/dev/null | head -1)
echo "$FINAL_ROW"
```

**If final review row exists and status is `passed`:**

- Example row:
  - `| final | code | passed | 2026-01-28 | reviews/final-review-2026-01-28T140322Z.md |`
- Check:
  ```bash
  echo "$FINAL_ROW" | grep -qE "^\\|\\s*final\\s*\\|.*\\|\\s*passed\\s*\\|" && echo "passed"
  ```

  - Continue to Step 15 (final closeout)

**If final review is not marked `passed`:**

- Tell user: "All tasks complete. Final review required before PR."

**Workflow preference check (before prompting):**

First resolve the final reviewer target with the same target-first contract as
per-phase review. A concrete managed Codex target must first send its exact
registered reviewer as native `agent_type`; only a native role-selection
rejection permits an explicitly pinned fresh child. Spawn acceptance plus the
launcher payload supplies configured invocation evidence, so missing telemetry,
missing self-report, or a later `BLOCKED` result cannot trigger fallback. Record
the final review `target`, `model_axis`, and `effort_axis` from resolver output
and the constructed launcher payload, never from reviewer self-report. A
concrete managed Claude or Cursor target must put
`providers.claude.dispatchArgs.model` or
`providers.cursor.dispatchArgs.model` respectively into the actual provider
invocation as the exact `model` argument; Cursor strings remain opaque. On
timeout or retry, preserve the already-selected route as well as its complete
invocation payload: an accepted native reviewer retries the same native
`agent_type`, while a fresh pinned-child route is eligible only when the
original native attempt received explicit pre-start role-selection rejection.
Preserve the exact model argument. If the host cannot apply the required role or
model argument, fail closed or block unless verified equivalent current-host
controls permit inline execution. The preference below chooses only among
routes that preserve that target; it cannot authorize generic inline or base
execution. Inline remains available only with verified equivalent current-host
controls or an allowed explicit inherit/default or managed-uncapped reviewer
base-role exception.

```bash
REVIEW_MODEL=$(oat config get workflow.reviewExecutionModel 2>/dev/null || true)
```

- **If `REVIEW_MODEL` is `subagent`:** Print `Review execution: subagent (from workflow.reviewExecutionModel).` Dispatch the review subagent directly via the Task tool. No prompt.
- **If `REVIEW_MODEL` is `inline`:** Honor it only when the inline route satisfies the verified-equivalent-controls or documented-exception guard. Otherwise use the exact/pinned route or block. When allowed, print `Review execution: inline (from workflow.reviewExecutionModel).` and run the review in-context per `oat-project-review-provide`.
- **If `REVIEW_MODEL` is `fresh-session`:** This is a **soft preference with escape hatch** because the agent cannot run the review in a fresh session on the user's behalf. Print the guidance block below, then handle the user's response per the three outcomes listed after it.
- **If unset or invalid:** Fall through to the standard 3-tier prompt below.

**Fresh-session guidance block (print when `REVIEW_MODEL` is `fresh-session`):**

```
Per your config (workflow.reviewExecutionModel: fresh-session), your
preference is to run the review in a fresh session.

Run `oat-project-review-provide code final` in a separate session, then
resume this session when the review is complete.

If you'd like to review here instead:
  1) subagent
  2) inline

Enter 1 or 2 to run the review here, or press Enter to wait.
```

**Fresh-session response outcomes:**

- User enters `1` → dispatch the subagent review (same behavior as `REVIEW_MODEL=subagent`).
- User enters `2` → apply the same guarded inline behavior as `REVIEW_MODEL=inline`; this choice does not waive managed target controls.
- User presses Enter (or equivalent no-input confirmation) → pause the session and wait for the fresh-session review to complete before continuing.

**Standard prompt (when preference is unset):**

Offer review options (3-tier capability model):

```
Implementation complete. Final review required.

Review options:
1. Run review in this session via a subagent (recommended if provider supported)
2. Run review in a fresh session and return to this session to receive review
3. Run review inline when current-host controls are verified equivalent

To run in a separate session use: oat-project-review-provide code final
```

**After user chooses:**

- If subagent (option 1): Agent spawns the review via Task tool — no command needed from user
- If fresh session (option 2): User runs `oat-project-review-provide code final` in a separate session, then returns here
- If inline (option 3): Agent first verifies equivalent current-host controls or an allowed exception, then executes the review per `oat-project-review-provide`; otherwise it uses the exact/pinned route or blocks
- After review: User runs `oat-project-review-receive` to process findings
- If Critical/Important findings: Fix tasks added, re-run the `oat-project-implement` skill
- Loop until final review passes (max 3 cycles per oat-project-review-receive)

**After final review is marked `passed`:**

- Record the passed final review and keep the project in implementation closeout.
- Do not append `"implement"` to `oat_hill_completed`, set
  `oat_phase_status: complete`, or offer the normal next-step prompt yet.
- Continue to **Final HiLL Closeout Sequence**.

### Step 15: Final HiLL Closeout Sequence

The final-closeout orchestrator owns this sequence after the rebased phase
coordinator has finished. Do not move lifecycle sequencing into task workers or
weaken exact target selection for child dispatches.

Identify the final implementation phase from the plan. A final HiLL checkpoint
exists only when that phase ID is present in `oat_plan_hill_phases`. Defer only
a checkpoint on the final implementation phase; non-final checkpoint behavior
remains unchanged.

Run final verification (Step 13). Final review must be `passed` before any
pre-approval dispatch. If final checkpoint auto-review is enabled, Step 8 has
already run `oat-project-review-provide code final`; do not run a duplicate
final review here.

Read the effective `workflow.postImplementSequence` once. For a configured
legacy or structured preference, normalize legacy values before snapshotting:
`wait` → `{ preApproval: [], postApproval: [] }`, `summary` →
`{ preApproval: ["summary"], postApproval: [] }`, `pr` → `{ preApproval:
["summary", "pr"], postApproval: [] }`, and `docs-pr` → `{ preApproval:
["summary", "document", "pr"], postApproval: [] }`.

Persist this immutable state before dispatching a child:

```yaml
oat_post_implement_sequence:
  status: pre_approval # pre_approval | awaiting_approval | post_approval | failed | complete
  final_phase: pNN
  pre_approval: [summary, document, pr]
  pre_approval_completed: []
  approval: pending # pending | approved | not_required
  post_approval: []
  post_approval_completed: []
  failure: null
```

The snapshot is immutable for this closeout: never re-resolve
`workflow.postImplementSequence` while it is incomplete. Iterate
`pre_approval` and `post_approval` in their stored array order; do not sort or
substitute a vocabulary order. Resume from the first incomplete stored step,
including a partially completed noncanonical order.

For every pending `summary`, `document`, or `pr`, dispatch respectively
`oat-project-summary`, `oat-project-document`, or `oat-project-pr-final`.
Every `summary`, `document`, and `pr` child receives the authoritative snapshot
and must merge state updates without replacing `oat_post_implement_sequence`.
Re-read and verify the snapshot after every child returns before recording step
success. If a child removed or altered it, restore the authoritative snapshot,
record that step as failed, and stop with the boundary, failed step, and exact
resume command: `oat-project-implement`.

Commit each completed step before dispatching the next step. On failure, persist
`status: failed`, the boundary, the failed step, and concise recovery context.
A pre-approval failure leaves `approval: pending`; a post-approval failure
retains `approval: approved`. Fail fast with the boundary, failed step, and
exact resume command: `oat-project-implement`.

1. Dispatch incomplete `pre_approval` steps in stored order.
2. When they succeed and a final checkpoint exists, commit `status:
awaiting_approval` with `approval: pending` before asking for final HiLL
   approval.
3. Record explicit approval as `approval: approved` and `status: post_approval`
   before any post-approval dispatch. Then dispatch incomplete `post_approval`
   steps in stored order.
4. A decline or defer keeps `status: awaiting_approval` and `approval: pending`;
   record neither approval nor failure and run no post-approval step. State the
   boundary and exact resume command: `oat-project-implement`.
5. If no final checkpoint exists, commit `approval: not_required` before
   post-approval dispatch. `approval: not_required` is valid only when no final
   checkpoint exists.
6. After all stored steps finish, commit `status: complete`. Only then complete
   implementation state, append the configured final HiLL completion, and
   continue to the existing next-step behavior.

If the preference is unset, do not create a sequence snapshot. When the
preference is unset, retain the existing next-step prompt only after final
approval when a final checkpoint is configured.

### Step 16: Prompt for Next Steps

Run this prompt only when `workflow.postImplementSequence` was unset and no
sequence snapshot was created. It occurs after final approval when a final
checkpoint is configured. A configured legacy or structured preference has
already completed through **Final HiLL Closeout Sequence**; do not re-dispatch
its steps here. For configured `wait`, print `Post-implementation: wait (from
workflow.postImplementSequence). Run follow-up skills manually when ready.` and
exit without auto-chaining.

**Standard prompt (when preference is unset):**

```
Final review passed for {project-name}.

All tasks complete and verified. Next steps:

1. Generate project summary (oat-project-summary)
2. Sync documentation (oat-project-document) — if applicable
3. Create final PR (oat-project-pr-final)

Options:
a. Run all three in sequence now
b. Run summary + PR only (skip docs)
c. Exit (run individually later)

Choose:
```

**If user chooses sequence (a or b):**

1. Invoke `oat-project-summary` to generate summary.md
2. If docs selected: invoke `oat-project-document`
3. Invoke `oat-project-pr-final` — this sets `oat_phase_status: pr_open` and guides to revise/complete

Do not route directly to `oat-project-complete`. The `pr_open` status set by pr-final is the proper entry to the revision/completion flow.

**If user chooses exit (c):**

Tell user: "Run the skills individually when ready: oat-project-summary → oat-project-document → oat-project-pr-final"

### Step 17: Output Summary

```
Implementation complete for {project-name}.

Summary:
- Phases: {N} completed
- Tasks: {N} completed
- Commits: {N} created

Final verification:
- Tests: ✓ passing
- Lint: ✓ clean
- Types: ✓ valid
- Build: ✓ success

Final review:
- Status: ✓ passed
- Artifact: reviews/final-review-{timestamp}.md

Next: Create PR or run the oat-project-pr-final skill (when available)
```

### Gate Execution

Before reporting this skill as complete, run the configured gate as the final step:

1. Resolve the gate for this skill:

   ```bash
   oat gate resolve <this-skill> --json
   ```

   If the command returns JSON `null`, no gate is configured; the skill is complete.

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes `oat gate review`, the configured review command must already include `--project "$PROJECT_PATH"` and must not include `--target <id>`. A valid reusable shape is `oat gate review --project "$PROJECT_PATH" ...`. If the declaration is missing, stop and migrate the stored gate command; do not inject or append arguments at execution time.

3. Execute the resolved command exactly as configured. Capture stdout, stderr, the exit code, and the structured JSON result. A zero exit code means the review passed its threshold, but it does not by itself authorize artifact receipt or complete the handoff.

4. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and a non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present. Never receive `targeting_correlation_failed`; correct the project/run routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is corrected and the gate successfully revalidates it. Treat `review_failed`, unknown statuses, null handoffs, and contradictory eligibility fields as operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still requires durable receive disposition. Route by structured status and eligibility, not by exit code.

5. If the command exits nonzero, use `description` to orient the next steps and handle `onFailure`:
   - `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`). If attempts are exhausted, escalate to the human with accumulated feedback and append that feedback to `implementation.md`. Treat a launch failure, missing CLI, or no eligible runtime as escalation-biased and do not spend it as a remediation attempt.
   - `prompt`: surface the gate failure and ask the human how to proceed.
   - `warn`: record the gate failure and continue.

6. Runtime selection note (V1): the step runs the gate `command` as-is and reads no OAT runtime env var. By default, `oat gate review` and `oat gate cross-provider-exec` resolve the current host from built-in `hostDetectionCommand`s and avoid the same runtime when no exact target is supplied. Reusable lifecycle skill-gate commands must not include `--target <id>` so independent review stays provider-neutral. Use explicit targets only for manual/debug commands or deliberate local/user-specific overrides; do not hardcode provider/model targets in bundled skill guidance or shared lifecycle gate examples.

## Success Criteria

- One exact target-pinned worker executed each task in dependency order
- The phase coordinator did not implement ordinary task work in its own context
- Same-worktree task workers ran serially; only plan-declared phase worktrees ran in parallel
- TDD discipline followed
- Each task result and commit was verified against HEAD and its file boundary
- Implementation.md tracks all progress
- Final verification passes
- Final review passes (no Critical/Important findings)
- No unresolved blockers
