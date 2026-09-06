---
title: Dispatch Policy
description: 'How OAT combines provider candidate ladders, project and phase named ceilings, exact phase-agent dispatch, and provider-specific enforcement.'
---

# Dispatch Policy

OAT dispatch policy separates reusable provider choices from project-specific
constraints:

- A **candidate ladder** is an ordered provider column stored in user, shared,
  or repo-local config. Each named tier contains one or more exact candidates.
- A **named ceiling** is a project or phase maximum such as `balanced` or
  `high`. It is not an enduring model-family or effort preference.
- A **phase target** is one exact configured candidate selected at invocation
  time at or below the named maximum. Optional nested work resolves separately.

The CLI command remains `oat project dispatch-ceiling resolve` for compatibility.
Legacy `workflow.dispatchCeiling.*` and `oat_dispatch_ceiling` values remain
readable, but new projects use ordered candidates plus `oat_dispatch_policy`.

For raw config keys, see [Configuration](../../cli-utilities/configuration.md).
For the root-owned phase-agent loop, see
[Implementation Execution](implementation-execution.md).

## Named Policy Choices

| Choice                  | Mode    | Named maximum | Eligible configured tiers                |
| ----------------------- | ------- | ------------- | ---------------------------------------- |
| `Economy`               | managed | `economy`     | Economy                                  |
| `Balanced`              | managed | `balanced`    | Economy, Balanced                        |
| `High`                  | managed | `high`        | Economy, Balanced, High                  |
| `Frontier`              | managed | `frontier`    | Economy, Balanced, High, Frontier        |
| `Uncapped`              | managed | none          | Any configured candidate OAT can resolve |
| `Inherit Host Defaults` | inherit | none          | OAT does not select provider controls    |

A named `High` ceiling therefore keeps configured Economy, Balanced, and High
candidates eligible and available. It does not pin Sol, `opus`, one Cursor
string, or one effort value. The project root chooses one exact candidate it
judges sufficient for the phase.

`Uncapped` is explicit managed state. It is not represented by omitted policy
state. `Unresolved` is a planning or preflight deferral and cannot begin
implementation.

## Ownership and Adoption

Adopt the complete bundled recommendation into one explicit owning scope:

```bash
# Team-owned, tracked repo configuration
oat config adopt dispatch-matrix --shared

# Checkout-specific repo configuration
oat config adopt dispatch-matrix --local

# Personal defaults across repositories
oat config adopt dispatch-matrix --user
```

Adoption fills missing provider/tier cells and records
`workflow.dispatchCeiling.recommendationVersion`; it does not replace explicit
existing cells. Planning shows the complete recommendation before asking which
scope should own it. If the resulting ladder is still missing or incomplete,
planning remains blocked rather than replacing the user's explicit values.
The recommendation version describes only the bundled recommendation. After
preserving existing cells, OAT resolves the effective ladder and uses that
effective result—not the recommendation version—for dispatch targets and
runtime disclosure.

### Upgrading to a newer recommendation version

Preservation applies to whole cells, which has a consequence worth stating
plainly: when a new recommendation version adds candidates to a tier you have
already populated, re-running adoption will not give them to you. The existing
cell is kept intact rather than merged candidate by candidate. Removals are not
propagated either.

To pick up a new version, compare your
`workflow.dispatchCeiling.recommendationVersion` against the bundled version,
then either edit the affected cells by hand or clear them and re-adopt.

Version `2026-07-27.1` is a live example. It interleaves the Cursor `high` and
`frontier` tiers so each alternates a GPT rung with a Claude rung, ending `high`
at `gpt-5.6-sol-high` and `frontier` at `claude-fable-5-thinking-high`. It also
drops `claude-opus-5-thinking-max` and `claude-fable-5-thinking-xhigh` from
`frontier`. Dropping the Opus max rung follows the non-monotonic top-end Opus
evidence recorded in `subagent-orchestration/references/evidence-and-refresh.md`,
which treats max as a route requiring justification rather than a strictly
better rung. Dropping the Fable xhigh rung is a recommendation judgment rather
than a measured finding: `subagent-orchestration/references/provider-claude.md`
permits either Fable rung for a qualified specialist case, and this ladder takes
the cheaper one absent a comparison favoring xhigh. The evidence record above
does not compare the two rungs. Both models remain in the pin catalog and stay
available to a hand-edited ladder. An adopter still on the prior version keeps their existing
Cursor tiers untouched until they take one of the actions above.

The terminal Fable target may require model access from the executing provider.
The adopting organization is responsible for confirming its applicable
retention policy. OAT does not determine model access or organizational
retention eligibility; recommendation membership and catalogue presence are
configuration data, not an eligibility decision.

The terminal entries in that version are chosen, not incidental. Because the
final candidate in a tier is the target its implementation-phase self-review
pins, reordering a tier changes who reviews it even when the membership is
untouched. Cross-family independence for the external phase gate and the
lifecycle gate comes from `gates.execTargets` instead, which is configured
separately and is not drawn from this ladder.

Curating a ladder down has a consequence in the other direction. The
`subagent-orchestration` guidance names a route per task class, and a route you
prune becomes unreachable: the guidance still recommends it while the resolver
rejects it as unconfigured. A ladder whose `economy` tier drops its mechanical
route leaves mechanical work with nowhere to go but a higher tier. Keep at least
one reachable rung for each task class the project uses, and prefer more than
one candidate per tier, since a tier holding a single entry cannot express a
choice.

Before offering adoption, planning runs `oat config list --json` once and treats
its output as the effective boundary across shared, repo-local, user, and
bundled-default precedence. A complete effective ladder skips adoption even
when the current project has not selected a policy or named ceiling. Adoption
is offered only when the resolved provider/tier cells are actually missing,
empty, malformed, or incomplete.

Ladder completeness and project-policy selection are separate checks.
`oat project dispatch-ceiling resolve --json` reports both:

- `unresolvedReason: policy | ladder | both` identifies which side is missing;
- `ladderCompleteness.complete` evaluates every supported provider/tier cell;
  and
- `ladderCompleteness.missingCells` identifies the exact cells adoption would
  fill.

The resolver preserves the merged effective `matrix` when only policy is
missing, so a missing project policy no longer looks like a missing reusable
ladder. Planning offers matrix adoption only for `ladder` or `both`, or when
`ladderCompleteness.complete` is false. With a complete ladder and only policy
unresolved, it proceeds directly to the project-specific policy choice.

The ownership boundary is deliberate:

| Source                                     | Config location                | Codex materialization output          |
| ------------------------------------------ | ------------------------------ | ------------------------------------- |
| Shared or repo-local project configuration | `.oat/config*.json`            | Tracked project `.codex` view         |
| Active-project sparse override             | Project `state.md`             | Tracked project `.codex` view         |
| User configuration                         | `~/.oat/config.json`           | User `~/.codex` view                  |
| Supported OAT catalogue                    | Bundled recommendation/catalog | Tracked project `.codex` view on sync |

Project-generated roles remain visible to version control. OAT does not
auto-ignore them. User-generated roles remain outside the repository under the
user home directory.

The reusable ladder and active project ceiling have separate ownership. A
project-specific policy or ceiling belongs in that project's `state.md`; do not
write it into user `~/.oat/config.json` merely because the reusable ladder is
user-owned.

## Config Shapes

An ordered candidate cell uses `candidates`:

```json
{
  "workflow": {
    "dispatchCeiling": {
      "providers": {
        "codex": {
          "balanced": {
            "candidates": [
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "low"
              },
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "medium"
              },
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "high"
              }
            ]
          }
        },
        "claude": {
          "balanced": { "candidates": ["sonnet"] }
        },
        "cursor": {
          "balanced": {
            "candidates": [
              "gpt-5.6-terra-low",
              "gpt-5.6-terra-medium",
              "gpt-5.6-terra-high"
            ]
          }
        }
      }
    }
  }
}
```

Each candidate can also be a fallback route. Route entries are attempted only
through the resolver's bounded escalation level; a route does not change the
named maximum.

Project state records only the active named maximum:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
```

Do not copy compiled `providers` targets into this shape. An optional plan
`## Dispatch Profile` row may narrow one phase to another named maximum at or
below the project maximum. Blank or `auto` uses the project value.

Managed uncapped and inherit/default shapes are explicit:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: uncapped
  source: project-state
```

```yaml
oat_dispatch_policy:
  mode: inherit
  source: project-state
```

## Complete Bundled Recommendation

The bundled ladder contains every supported candidate, not only the final
candidate in each tier:

- **Codex:** Luna at `low`, `medium`, `high`, and `xhigh`; Terra at `low`,
  `medium`, `high`, and `xhigh`; Sol at `low`, `medium`, `high`, `xhigh`, and
  `max`.
- **Claude:** `haiku`, `sonnet`, `opus`, and `fable` across the ordered named
  tiers.
- **Cursor:** verified multi-family flat IDs across Composer, Claude (Sonnet,
  Opus, and Fable), GPT, and Grok. Two counts apply and they differ: the
  bundled recommendation carries 14 Cursor candidates across the four tiers,
  while the materialization catalogue carries 18 flat IDs. The four extra
  entries are approved mappings deliberately kept out of the recommendation but
  still materializable. The catalogue maps each flat ladder ID to a separate
  bracket-form frontmatter model; OAT does not derive or normalize either
  value.

The final candidate in a named tier defines that tier's reviewer ceiling. Lower
reviewer selection requires a separate reviewed contract; a normal reviewer
does not use task candidate flags.

## Exact Phase Resolution

Planning and implementation preflight resolve the active policy first:

```bash
oat project dispatch-ceiling resolve \
  --provider codex \
  --preflight \
  --json
```

Before each managed capped phase or bounded fix continuation, the root requests
one exact configured candidate. It passes the recorded project or narrower
phase maximum through the
invocation-only `--ceiling-tier` option:

```bash
# Codex: exact model plus effort
oat project dispatch-ceiling resolve \
  --provider codex \
  --role implementer \
  --ceiling-tier high \
  --candidate-model gpt-5.6-terra \
  --candidate-effort medium \
  --task-class default-implementation \
  --task-effort medium \
  --report-scope p02 \
  --report-action implementation \
  --json

# Claude: exact model argument
oat project dispatch-ceiling resolve \
  --provider claude \
  --role implementer \
  --ceiling-tier high \
  --candidate-model sonnet \
  --task-class default-implementation \
  --report-scope p02 \
  --report-action implementation \
  --json

# Cursor: exact opaque configured string
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role implementer \
  --ceiling-tier high \
  --candidate-model gpt-5.6-sol-high \
  --task-class default-implementation \
  --report-scope p02 \
  --report-action implementation \
  --json
```

Use the same classification flags and `--report-action fix` for a bounded fix.
Reviewer routes use neither `--task-class` nor `--task-effort`; the CLI rejects
classification flags for reviewers.

`--ceiling-tier` accepts `economy`, `balanced`, `high`, or `frontier`. It
overrides a layered active-policy ceiling for that resolver invocation only. It
does not modify user, shared, local, or project configuration.

Successful JSON reports:

- top-level `source: invocation` for the ephemeral maximum
- `providers.<provider>.cellSource` for the config layer that owns the selected
  candidate definition
- `selection.ceilingTier`, `selection.candidateTier`, and
  `selection.requestedCandidate`
- the exact provider-specific `dispatchArgs`

The resolver rejects an above-ceiling candidate, an ambiguous route, malformed
ordering, a reviewer candidate request, or controls that cannot compile
exactly. For compatibility, omitting an exact candidate from a managed
named-cap implementation or fix still resolves successfully at the cap. When
report context is present, that path emits the coded
`managed-capped-selection-skipped` warning in human and JSON output. The root
must treat the warning as a dispatch-policy violation and select an exact
candidate before launch even though the command retains exit code `0`.

Implementer and fix resolution has two mutually exclusive selection branches:

- **Preferred selection:** pass `--preferred` for legacy scalar ceilings or
  managed `Uncapped` compatibility. Do not include `--candidate-model` or
  `--candidate-effort`.
- **Exact-candidate selection:** pass `--candidate-model` and, where applicable,
  `--candidate-effort` for a managed capped phase or fix. Do not include
  `--preferred`.

Never combine the branches in one resolver invocation. The exact-candidate
branch replaces, rather than supplements, preferred selection.

## Provider Enforcement

| Provider | Exact phase-agent or optional-child invocation                                                                                     | Failure behavior                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Codex    | Use `providers.codex.dispatchArgs.variant` as `agent_type`; otherwise launch a fresh child pinned to the returned model and effort | Block if neither exact route is usable    |
| Claude   | Pass `providers.claude.dispatchArgs.model` as the actual Task `model`                                                              | Block if the model cannot be applied      |
| Cursor   | Launch `providers.cursor.dispatchArgs.variant` as the exact native agent type first                                                | Block rather than normalize or substitute |
| Other    | Use a registered provider adapter when it can compile exact controls                                                               | Unsupported providers remain advisory     |

Materialized Codex and Cursor roles exist before phase dispatch after
project/user sync. Cursor definitions carry `supported-catalogue`,
`project-config`, or `user-config` ownership. Project and supported variants
are tracked under `.cursor/agents`; user variants live under
`~/.cursor/agents`. Cleanup stays within the current owner boundary.

Reviewers use the final candidate at the configured review ceiling. Managed
`Uncapped` and explicit inherit/default behavior retain their documented base
reviewer behavior. A timeout retry preserves the same exact role or complete
Claude model payload or Cursor native variant.

### Cursor evidence authority

Cursor selection, pin mapping, catalogue availability, and runtime identity are
separate evidence layers:

- The candidate ladder and resolver use an opaque flat ID.
- The materialized definition uses the mapping's explicit bracket-form
  frontmatter model.
- Mapping-specific native-launch evidence authorizes the shipped mapping data.
  An approved mapping may carry a probe record whose `submittedSelector` must
  equal the mapping's `frontmatterModel` and whose `resolvedModel` must equal
  its `ladderModelId`, so editing a mapping without re-probing fails its own
  test rather than inheriting an approval it was never granted. See
  [Verifying Cursor Pins](../../contributing/verifying-cursor-pins.md).
- `oat doctor` checks current flat-ID catalogue availability, which can detect
  drift but cannot prove a definition pin.
- The launcher records the selected variant and mapped model with `configured`
  provenance. Runtime identity remains `not-reported` without an independent
  observation.

Cursor can silently fallback when account, plan, or administration constraints
prevent a requested definition pin. Native variant acceptance is therefore not
runtime-model verification, and skills must not promote self-report or
catalogue presence into observed identity.

#### Unresolvable selectors also fall back silently

Entitlement is not the only trigger. Cursor does not reject a malformed pin
either; it substitutes a default for whichever selector component it cannot
resolve, with no error or warning:

- An unknown family falls back to the account default model. Probing
  `claude-opus-9[effort=high]` resolved to `cursor-grok-4.5-high-fast`.
- An unknown effort falls back to that family's default rung. Probing
  `claude-opus-5[effort=ultra]` resolved to `claude-opus-5-thinking-high`.

The default rung is family-specific and is not always `high` — Opus 4.7
defaults to `xhigh`. A typo in a pinned selector therefore ships a
working-but-wrong model that silently tracks a vendor-controlled default, so
capability can change with no corresponding change in the repository.

OAT does not currently validate effort rungs at sync time; that is tracked as
`BL-260726-validate-cursor-pin-effort`. Until it lands, the probe runbook is
the only guard.

## Phase and Optional-Worker Layers

The phase implementer directly implements the phase tasks from one Phase Scope
and:

1. reads phase artifacts once and preserves dependency order;
2. directly implements each planned task;
3. creates and verifies one bounded commit per task; and
4. runs phase-wide verification before returning to the root.

Optional nested workers or recon agents resolve their own exact candidates only
when they provide a concrete benefit. They are not required for ordinary plan
tasks and do not own phase commits or review dispatch.

Tasks run serially in the same worktree. Parallelism remains limited to
plan-declared phase worktrees unless optional work has explicitly isolated
write authority. See
[Implementation Execution](implementation-execution.md) for the full loop.

## Dispatch Report V1 and Producer Provenance

Resolver calls that pass `--report-scope` and `--report-action` include a
`dispatchReport` object in JSON output, plus the additive `dispatchStamp`
string described below. Consumers must require
`dispatchReport.schemaVersion: 1` before dispatch. The report keeps these
concerns separate:

| Report area                                                         | What it means                                                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `policy`                                                            | The resolved managed/inherit policy, its status, name, and source                             |
| `selection.ceilingTier` / `selection.ceilingTarget`                 | The maximum allowed tier and its boundary target                                              |
| `selection.requestedCandidate` / `candidateTier` / `candidateIndex` | The exact candidate requested for this bounded task and its position                          |
| `selection.preferredValue`                                          | The legacy `--preferred` selection value, or `null` when that compatibility path was not used |
| `selection.exactSelectedTarget` / `route.target`                    | The compiled provider target and actual invocation route                                      |
| `classification`                                                    | Caller-reported task class, applicable Codex preferred effort, and provenance source          |
| `notices`                                                           | Ordered coded warnings and advisories derived from the effective dispatch context             |

A named policy or ceiling is never a substitute for the requested candidate or
exact selected target. Classification is provenance only: it records the
root's judgment but does not participate in candidate normalization or let OAT
judge whether that classification was correct. `requestedControls` records
what OAT put into the host payload. `configuredDefaults` records fallback
configuration and is explicitly not a runtime observation.

Managed named-cap implementation and fix reports can include two warning codes:

- `managed-capped-selection-skipped` means no exact candidate or legacy
  preferred value was supplied, so compatibility behavior selected the cap.
- `managed-capped-classification-missing` means an exact candidate was supplied
  without `--task-class`.

Both warnings preserve resolved status and exit code `0`. They do not apply to
policy-only preflight, reviewer, inherit, uncapped, unresolved, or
legacy-preferred routes. `terminal-reviewer-eligibility` is an advisory tied to
an effective Fable reviewer target, not proof of model access or organizational
retention eligibility.

`gateInvocation` is an immutable copy of configured gate controls.
`runtimeIdentity` is separate and stays `not-reported` until independently
observed or otherwise supported runtime evidence exists. Requested controls,
configured defaults, role-name parsing, and reviewer self-identification do not
become observed runtime identity.

Human output comes from `formatDispatchReport(dispatchReport)`. Dispatch notes
also retain a parseable compatibility stamp for later review gates:

```text
Dispatch: scope=p06-t03 action=implementation role=implementer producer=gpt-5.6-sol provenance=declared model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high
```

`producer` is the runtime model slug when OAT can establish it; otherwise it is
`unknown`. `provenance` is `declared`, `observed`, `inferred`, or `unknown`.
Selected model and effort axes can remain exact even when runtime producer
identity is not reported.

Before launching an implementation, fix, or reviewer, surface the structured
notices in `dispatchReport.notices` and render the report. Structured notices
and runtime disclosure use the effective target returned by that resolver call,
never a target inferred from the bundled recommendation version.

### The additive `dispatchStamp` field

JSON responses that carry `dispatchReport` also carry `dispatchStamp`, a single
canonical string produced by the same formatter that owns the grammar above:

```json
{
  "status": "resolved",
  "dispatchReport": { "schemaVersion": 1 },
  "dispatchStamp": "Dispatch: scope=p06-t03 action=implementation role=implementer ..."
}
```

Field eligibility matches report eligibility exactly. The field is present when
and only when `dispatchReport` is present, so non-report resolver calls and
error envelopes never carry it. `DispatchReportV1`, its schema version, and the
stamp grammar are unchanged; the field is purely additive.

Eligibility tracks report presence, not dispatch authorization or exit code. A
`status: blocked` response that was asked for report context therefore carries
both `dispatchReport` and `dispatchStamp` while still exiting `1`: the stamp
records what OAT resolved, and a blocked resolution is a resolved fact about an
unusable route rather than a missing report. Only a call without report context,
or an error envelope that never built a report, omits the field.

Consumers read `dispatchStamp` directly, validate that it is a non-empty string
beginning with the canonical `Dispatch:` prefix, and copy it byte-for-byte into
dispatch and audit metadata. Reformatting the report through
`toDispatchStampRecord(dispatchReport)` and `formatDispatchStamp` is an optional
corroboration where that library is already loaded; it is never the normal path,
and no out-of-tree shim is required. Callers must not reconstruct the stamp from
policy labels, role names, candidate strings, or target names.

A stamp carrying `producer=unknown provenance=unknown` is truthful, not
degraded: the resolver reports configured invocation, and those fields stay
`unknown` until an independent runtime observation exists.

## Legacy Compatibility

The following remain readable during migration:

- `workflow.dispatchCeiling.preset`
- bare `workflow.dispatchCeiling.providers.<provider>` values
- project `oat_dispatch_ceiling`
- `--preferred` resolver selection

Legacy preset names map to managed named tiers: `cost-conscious` to Economy,
`balanced` to Balanced, and `maximum` to High. Legacy values are migration
inputs, not evidence that a new project should persist exact provider-family
pins.
