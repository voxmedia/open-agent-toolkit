# Dispatch And Dry Run

This reference preserves the route-specific implementation contract. Load it only when the entry skill routes execution here.

The shared dispatch engine (`oat-dispatch-subagents`) and the project adapter
(`oat-project-dispatch-subagents`) own capability probing, catalog
observation, route selection, accepted-launch terminality, continuation,
recovery, and the structured dispatch record. This reference adds only the
implement-workflow specifics: tier selection, dispatch-policy preflight,
resolver invocation shapes, and the logs this workflow must emit. Where this
reference and the shared skills appear to overlap, the shared skills are
canonical.

### Step 0.5: Capability Detection and Tier Selection

**Mandatory target-first order:** Complete Dispatch Policy Preflight and
resolve the concrete managed target before probing generic agent availability
or locking Tier 1/Tier 2. A concrete target takes precedence over tier
selection: first send the exact registered role through native dispatch. For
Codex, the resolver-returned Codex variant must first be sent through the
native spawn API as native `agent_type`; spawn acceptance plus the constructed
launcher payload is configured invocation evidence, and independent runtime
telemetry or agent self-report is not required. Launch a fresh Codex child
pinned to the resolver target's explicit model, reasoning effort, and
canonical role instructions from `.agents/agents/oat-phase-implementer.md` or
`.agents/agents/oat-reviewer.md` only after a native role-selection rejection
as defined below.
If that fresh child cannot be launched, fail closed and block; never
substitute a base or coordinator role for a managed phase target. Inline
execution is allowed only with verified equivalent current-host model and
effort controls. Explicit inherit/default behavior and the documented
managed-uncapped reviewer fallback remain the only base-role exceptions.

Use base `oat-phase-implementer` only for the allowed exceptions above:
explicit inherit/default behavior. It is never a managed phase-target
fallback.

Detection logic (two-tier outcome — this skill runs autonomously and cannot
block on user-initiated fresh sessions mid-run):

- Claude Code: check Task-tool availability with
  `subagent_type: "oat-phase-implementer"` and
  `subagent_type: "oat-reviewer"`. Available → Tier 1.
- Cursor: use Cursor-native invocation. Available → Tier 1.
- Codex multi-agent: verify `[features] multi_agent = true` and whether
  `spawn_agent` requires explicit authorization. Root→phase dispatch requires
  depth 1 only; nested depth matters only when an optional child is actually
  launched. Tier 1 dispatches must use self-contained scope packets and fresh
  context; do not rely on forked full-thread context when pinning a
  specialized OAT role.
  - Available without auth → Tier 1.
  - Available with auth required:
    - If `OAT_AUTONOMOUS=1`, gate `IMPLEMENT-08` authorizes delegation once
      for this run, covering only `oat-phase-implementer` and `oat-reviewer`
      within the plan's bounded phase/review scopes. Record the authorization
      scope in the dispatch record, re-probe, and use Tier 1 when the host
      accepts it. If the host requires an out-of-band grant that the current
      run cannot supply, stop at a reported authorization boundary.
    - Otherwise, fail closed and ask the user once at skill start before
      selecting Tier 2 or starting implementation work:

      ```
      This OAT implementation skill normally delegates phase implementation and review to subagents. Authorize subagent delegation for this run?

      Yes authorizes both oat-phase-implementer and oat-reviewer across every phase in this run.
      ```

      Approved → Tier 1. Declined → Tier 2.

- If the host does not resolve either generic agent, first attempt the exact
  registered role natively for any concrete managed target. Use the explicitly
  pinned fresh-child route only after a native role-selection rejection.
  Select Tier 2 only when inline execution is allowed by the target-first rule
  above.

**Approval scope rule:** this Tier selection applies to both phase
implementation and checkpoint review. Do not infer a mixed mode from
conversational emphasis on review checkpoints. If the user has not explicitly
approved Tier 1 for the run, and gate `IMPLEMENT-08` has not supplied the
bounded autonomous run authorization above, stay Tier 2 throughout. Mixed mode
is only valid when the user explicitly requests it.

**Codex fail-closed rule:** after this skill is invoked, "user did not
separately ask for subagents" is not a valid Tier 2 reason. If Codex can spawn
agents but requires explicit user authorization, the implementation MUST NOT
continue until the delegation question above is answered. Tier 2 is allowed
only when:

- `user declined delegation`
- `spawn_agent unavailable`
- `required agent role unresolved`

**Hard pre-work guard:** report the selected tier before any code edit, test
run, or implementation commit. If Tier 2 is selected, the reason must be one
of the three allowed Tier 2 reasons above:

```
[preflight] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: {available | authorization required | not resolved}
  → Selected: Tier {1 | 2} — {Subagents | Inline}
  → Reason: {authorized | available without auth | user declined delegation | spawn_agent unavailable | required agent role unresolved}
```

Do not print `[0/N]` for this preflight step. The implementation denominator
is not established by capability detection; use the literal `[preflight]`
label above.

**Tier lock:** tier is locked for the remainder of the run only after the
dispatch target is resolved. Subsequent phase-implementer, optional nested,
fix-continuation, and review dispatches use the same tier. Tier controls
mechanics only: every managed phase implementer resolves one exact target
beneath the recorded project or phase named maximum. No mid-run downgrade is
allowed.

**Recovery if Step 0.5 was skipped:** if implementation work has already
started inline before completing Step 0.5, STOP immediately. Preserve any work
in progress, complete or revert to a clean task boundary, and re-run Step 0.5
before continuing. Do not silently continue in Tier 2.

**Native role-selection rejection:** the native host explicitly reports that
the requested `agent_type` is unsupported, unknown, unregistered, or rejected
before the child or agent starts. Missing runtime telemetry, missing agent
self-report, a timeout after spawn acceptance, or any terminal result from an
accepted child — including `BLOCKED` — is not role unavailability and is not a
native role-selection rejection. If an accepted native reviewer remains
active, poll, nudge, or continue only through its existing handle; a
terminal timeout records review failure and stops or escalates
without another launch.
Accepted-launch terminality and recovery semantics are owned by the shared
dispatch engine. A new launch is eligible only when the original attempt
received explicit pre-start rejection before any child started. Self-report is
optional diagnostic data and cannot populate or overwrite launcher-owned
`target`, `model_axis`, or `effort_axis` fields.

**Legacy state migration:** if `state.md` contains
`oat_execution_mode: subagent-driven`, silently ignore it and remove the key
on the next bookkeeping write. Do not redirect to
`oat-project-subagent-implement` — that skill is deprecated.

### Dispatch Policy Preflight

Before any phase work, resolve and print the OAT dispatch policy. This is a
preflight gate, not a mid-run question.

Use the CLI resolver as the source of truth. The command name remains
`dispatch-ceiling` for compatibility, but the returned contract is dispatch
policy:

```bash
oat project dispatch-ceiling resolve --provider <active-provider> --preflight --report-scope implementation-preflight --report-action implementation --json
```

If `oat` is not in PATH, run the same command through
`pnpm run cli -- project dispatch-ceiling resolve …` with identical flags.

Resolution order:

1. Config keys `workflow.dispatchPolicy.mode` / `workflow.dispatchPolicy.policy` (local > shared > user)
2. Compatibility config keys `workflow.dispatchCeiling.providers.<provider>` (local > shared > user)
3. Project `state.md` frontmatter key `oat_dispatch_policy`
4. Legacy project `state.md` frontmatter key `oat_dispatch_ceiling`
5. Interactive implementation preflight prompt (below)
6. Non-interactive unresolved: block before work starts

Read `providers.<active-provider>` from the `--json` response for the concrete
dispatch controls. `dispatchArgs` carries the provider-specific argument to
pass through (Codex: `variant` name; Claude: `model` string; Cursor: opaque
`model` string). `selection` carries `role`, `selectedValue`, `capped`,
`selectionMode`, and policy fields; `selection.target` and an optional
`providers.<provider>.target` carry route data. For implementer/fix dispatch,
use exactly one of two mutually exclusive selection paths:

1. **Preferred-selection branch:** pass `--preferred <preferred-value>` when
   asking the resolver to choose from a preference under an uncapped or other
   preference-driven policy. Do not include `--candidate-model` or
   `--candidate-effort`.
2. **Exact-candidate branch:** pass `--candidate-model` and, when applicable,
   `--candidate-effort` after selecting a concrete configured candidate for a
   managed-capped route. This branch must not include `--preferred`.

Use `selection.selectedValue` as the selected axis value when it is present.
Never re-derive these controls from the policy label or a ceiling-only variant
— the resolver is the single compilation/join point.

Print before phase work:

```text
OAT Dispatch Tier: balanced (codex, managed capped — pinned-variant)
Resolved cap: high
Source: project state
Provider default effort: medium
Note: OAT will use resolver-returned materialized Codex role names up to high. Base/unpinned roles resolve through the provider default only for explicit inherit/default behavior or the documented managed-uncapped reviewer exception.
```

If no policy resolves and the session is interactive, present the dispatch
policy prompt once before starting work. Print the unresolved-policy heading,
then generate the choice text from canonical CLI metadata immediately before
presenting it:

```bash
oat project dispatch-ceiling choices --format markdown
```

Do not hand-type the dispatch policy menu or omit canonical choices. If the
CLI is unavailable in this environment, derive the same labels and
descriptions from `packages/cli/src/config/dispatch-policy-options.ts`;
include every managed policy returned by `VALID_MANAGED_DISPATCH_POLICIES`
plus `Uncapped`, `Inherit Host Defaults`, and `Leave Unresolved`.

At minimum, preserve these semantics in any fallback text:

- `Uncapped`: OAT still manages dispatch selection, but stores no maximum cap.
  It is not host/default behavior and must not be represented by absent policy
  state.
- `Inherit Host Defaults`: OAT does not choose model or effort controls; the
  executing host/provider owns implementation, fix, and review defaults.
- `Leave Unresolved`: planning/preflight deferral only. It records no runtime
  policy and is not a runnable implementation setting.
  Implementation preflight must block until a policy resolves.

OAT applies managed policies where the provider exposes a reliable mechanism
(Codex: pinned variants; Claude: Task model parameter). Other providers may
treat managed policies as advisory.

**Managed capped policy selection** persists only `mode: managed`, the named
maximum `policy`, and `source`. The named maximum leaves lower configured
candidates eligible; do not copy compiled provider/model targets into project
state. On selection, print the named maximum before proceeding.

Persist in project `state.md` frontmatter using the normalized shape:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: balanced
  source: project-state
```

For `Uncapped`, persist `policy: uncapped` in the same shape — OAT still
manages dispatch selection with no stored cap; never represent uncapped by
leaving policy state absent. For `Inherit Host Defaults`, persist
`mode: inherit` with `source` and no `policy` key — OAT does not choose model
or effort in this mode. `Leave Unresolved` records no runtime policy: stop
before phase work and report the unresolved state.

If no policy resolves and `OAT_NON_INTERACTIVE=1` or no user-response channel
exists, rerun the resolver with `--non-interactive` and stop before work
starts if it blocks:

```text
BLOCKED: Codex dispatch policy is unresolved in non-interactive mode.
Set workflow.dispatchPolicy.mode/workflow.dispatchPolicy.policy, workflow.dispatchCeiling.providers.codex, oat_dispatch_policy, or legacy oat_dispatch_ceiling.
```

Dry-run mode must report the unresolved policy and planned behavior without
modifying project state.

### Runtime dispatch selection

Before each phase-implementer, optional nested, fix-continuation, or review
dispatch, choose and log runtime controls. Resolve these controls before
applying Tier 1/Tier 2 mechanics. A phase target applies to the phase
implementer, which directly owns its planned tasks. Optional children resolve
their own exact bounded target beneath the phase ceiling. Inline execution
must preserve equivalent controls or use a documented exception.

Inputs: the resolved dispatch policy, source, and provider-specific
selection; the phase ID and current bounded phase or optional-child scope; any
`## Dispatch Profile` row in `plan.md`; host-exposed provider controls by
axis; and prior phase outcomes, including review results and failed retries.

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

- implementation: `--report-scope <phase> --report-action implementation`
- optional nested work: `--report-scope <phase-or-bounded-child> --report-action implementation`
- fix: `--report-scope <phase-or-bounded-fix> --report-action fix`
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

The Step 0.5 target-first order is the managed Codex execution invariant:
send the resolver-returned variant first through the native spawn API as
native `agent_type` — spawn acceptance plus the constructed launcher payload
is configured invocation evidence with launcher-selected/config-declared
provenance, without independent runtime telemetry or agent self-report.
If and only if the host returns a native role-selection rejection,
launch a fresh Codex child with the resolver target's explicit
model, reasoning effort, and canonical role instructions; otherwise fail
closed and block. Missing runtime telemetry or agent self-report is not role
unavailability, and an accepted child result such as `BLOCKED` cannot trigger
fallback. A managed base role is forbidden when a concrete target was
requested; never silently downgrade to it.

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
6. For managed capped phase-implementer/fix dispatch, choose an exact
   configured candidate and use the exact-candidate branch, not the
   preferred-selection branch. For implementation, call
   `oat project dispatch-ceiling resolve --provider codex --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --candidate-effort <effort> --escalation-level <route-level> --report-scope <phase-id> --report-action implementation --json`.
   For a bounded fix, use the same phase target with
   `--report-scope <phase-or-fix-scope> --report-action fix`. Read
   `providers.codex.dispatchArgs.variant` and
   `providers.codex.selection.target`; never reuse a cap-only variant.
   Optional children resolve only when actually launched.
7. For review dispatch: call `oat project dispatch-ceiling resolve --provider codex --role reviewer --report-scope <phase-or-review-scope> --report-action review --json`; read `providers.codex.dispatchArgs.variant` and `providers.codex.selection.target`.
   - Capped managed policy: reviewer targets the configured cap for deterministic quality gate behavior.
   - Managed `Uncapped`: no reviewer target exists; use base/unpinned reviewer fallback and log `selectionMode=no-review-target`, `selectedValue=null`, and `effort_axis=provider-default`.
   - Inherit/default: no reviewer target exists; use base/unpinned reviewer fallback and log `selectionMode=inherit-default`, `selectedValue=null`, and `effort_axis=provider-default`.
8. When `providers.codex.dispatchArgs.variant` is present, the actual
   `spawn_agent` payload MUST first use it as native `agent_type`; when that
   variant came from a Codex model+effort target, log
   `model_axis=selected:<model>` and `effort_axis=selected:<effort>` from
   resolver output and the constructed launcher payload. Materialized
   model+effort variants retain selected controls while keeping runtime
   identity not-reported unless independent evidence exists. Always
   derive `model_axis` and `effort_axis` from resolver output, not from
   legacy role-name parsing or agent self-report.
9. Do not use top-level per-call `reasoning_effort` as the standard OAT selected-effort path; dogfooding showed that path can be inconsistent.

Claude rules:

- Claude policy selection is model-based: `haiku < sonnet < opus < fable`.
- Implementer/fix dispatch chooses one selection branch:
  - Managed `Uncapped`: use the preferred-selection branch with
    `--preferred <preferred-model>` so the resolver selects the classified
    model with no cap.
  - Capped managed policy: use the exact-candidate branch below. The
    `--candidate-model` call replaces the preferred-selection call and must not
    include `--preferred`.
  - Inherit/default: use neither selection branch; the resolver returns no
    selected model, so omit `model` and inherit host/default behavior.
- Review dispatch:
  - Capped managed policy: target the configured policy cap directly.
  - Managed `Uncapped` or inherit/default: no reviewer target exists; omit `model` and log inherited/default model behavior.
- For managed capped phase-implementer/fix dispatch, call
  `oat project dispatch-ceiling resolve --provider claude --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <model> --orchestrator-tier <current-orchestrator-tier> --escalation-level <route-level> --report-scope <phase-id> --report-action implementation --json`.
  For bounded fixes, reuse the exact phase target with a bounded fix scope.
  For review dispatch, call the resolver with
  `--role reviewer --report-scope <phase-or-review-scope> --report-action review --json`
  and no candidate flags. Read `providers.claude.dispatchArgs.model` and pass it
  exactly on the actual Task invocation.
- Pass `model: "<value>"` when `model_axis=selected:<value>` on the Task tool call.
- Keep `effort_axis=not-applicable`; Claude Code has no separate per-dispatch effort axis.

Cursor rules:

- Treat every configured Cursor candidate string as opaque. Do not normalize it
  or infer capability from its spelling.
- For managed capped phase-implementer/fix dispatch, call
  `oat project dispatch-ceiling resolve --provider cursor --role implementer --ceiling-tier <project-or-phase-tier> --candidate-model <opaque-model> --report-scope <phase-id> --report-action implementation --json`.
  For bounded fixes, reuse the exact phase target with a bounded fix scope.
- Require `providers.cursor.dispatchArgs.model` and pass that exact byte-for-byte
  string as the actual Cursor invocation model. If the host cannot apply it,
  fail closed.

Payload-first invariant:

- Build the actual host dispatch argument map before logging.
- Do not emit `selected:<value>` unless the host invocation contains the corresponding role/model selection.
- For every phase-implementer, optional nested, fix, and review launch, record
  `target`,
  `model_axis`, and `effort_axis` from resolver output and the actual launcher
  payload after payload construction.
- Record `selection_reason` and `candidates_considered` beside those axes.
  Allowed reasons are `native-catalog`, `native-catalog-unsatisfying`,
  `pre-start-rejection`, `inherit`, and `gate-target`. Derive the values from
  the shared selection decision and Dispatch Report; never reconstruct them
  from a child self-report.
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
  populate runtime producer identity. Do not write prose-only, hand-built, or
  legacy comma-separated stamp forms.

Human-facing dispatch display rules:

- Lead with route, OAT dispatch tier, requested controls, configured defaults, and runtime confirmation. These are the fields humans use to understand what OAT asked for and what the host appears to be running.
- Do not headline `producer=unknown` or `provenance=unknown`. Those values are
  audit fields for the formal stamp, not the primary status. Put unknown
  producer/provenance only in `Dispatch stamp:` or in a low-priority note after
  the route and runtime confirmation.
- Separate requested controls from configured defaults, and configured
  policy/cap from runtime confirmation. A resolver payload can declare a
  target before the host has confirmed it; an observed mismatch must be called
  out as `Runtime confirmation: mismatch:<detail>` and handled as an
  orchestration deviation.
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

For an explicit inherit/default fallback (for example a base `oat-reviewer`
under inherit policy), the log reads `Route: none; level=none`,
`Runtime confirmation: not-observable`, `Selection mode: inherit-default`,
`Model axis: inherited`, and `Effort axis: provider-default`, with requested
controls empty and the provider default effort shown as a separate fact.

Generic sidecar/explorer dispatch: built-in sidecars such as `explorer` are
not OAT-managed implementer, reviewer, or fix roles, and their outputs are
advisory context only. Unless the actual spawn payload pins a reliable
effort/model control, log `Preferred effort: provider-default`,
`Selected effort: provider-default`, and `Effort axis: provider-default` —
never a classified effort level the host invocation does not contain.

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
Dispatch policy: inherit host defaults; selected=none; cap=none (codex, advisory — base role follows provider default)
Dispatch policy: balanced; selected=sonnet; cap=sonnet (claude, enforced — Task model arg)
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
