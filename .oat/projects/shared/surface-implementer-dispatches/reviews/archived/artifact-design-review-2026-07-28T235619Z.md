---
oat_generated: true
oat_generated_at: 2026-07-28T23:56:19Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/surface-implementer-dispatches
---

# Artifact Review: design

**Reviewed:** 2026-07-28T23:56:19Z
**Scope:** `design.md` for `surface-implementer-dispatches` (quick mode; validated against `discovery.md` and `BL-260727-surface-implementer-dispatches`)
**Files reviewed:** 2 in scope, plus 5 verification sources
**Commits:** none — artifact review

## Summary

The design is coherent, internally consistent, and mostly implementable. Its three
load-bearing claims about existing code all hold: the task-class vocabulary matches
the canonical `record-schema.md` list exactly, the compatibility stamp genuinely
does not read any of the proposed new fields, and Dispatch Report V1 can absorb
additive nullable fields through a single builder. The one material defect is that
the notice exclusion list omits the legacy `--preferred` route, which is the exact
false-positive that `discovery.md` names as its highest-ranked risk and encodes as a
constraint; the resolver reports `selectionMode: 'capped'` on that route too, so the
skipped-selection warning would fire with a factually wrong message on a supported
path.

Findings: 0 critical, 1 important, 3 medium, 3 minor

## Findings

### Critical

None.

### Important

- **Notice exclusion list omits the legacy `--preferred` route, the false positive discovery ranked highest** (`.oat/projects/shared/surface-implementer-dispatches/design.md:129`)
  - Issue: The exclusion list is "preflight, reviewer-only, inherit, uncapped,
    unresolved, and non-applicable" (`design.md:129-130`), repeated as the testing
    matrix at `design.md:247-248` and as the error-handling carve-out at
    `design.md:231`, which mentions preflight only. Legacy `--preferred` appears in
    none of them. But a managed named-cap **implementer** dispatch that passes
    `--preferred` also returns `selectionMode: 'capped'`: see
    `packages/cli/src/commands/project/dispatch-ceiling/index.ts:1723` and
    `:1740`, both reached only when `role === 'implementer'` and
    `preferredValue !== null`. On that path `selectedValue` is
    `order[min(preferredIndex, ceilingIndex)]` (`index.ts:1729-1730`, with the
    Codex-specific `min()` also applied at `index.ts:2454-2480`), so a
    `--preferred medium` dispatch under a `high` cap resolves to `medium` while
    still reporting `capped`. The notice specified at `design.md:205-206` —
    "no exact candidate; resolver selected the cap" — is then simply false: no
    candidate was requested, but the resolver did not select the cap and the root
    did not skip classification.

    This is not an inferred edge case. `discovery.md:135-137` names it directly:
    "legacy preferred paths and policy-only preflight can also resolve without an
    exact candidate," Likelihood Medium / Impact Medium. `discovery.md:69-70`
    raises it to a constraint: "Preserve policy-only preflight, reviewer, uncapped,
    inherit, and **legacy compatibility behavior** without false skipped-selection
    warnings." `discovery.md:41-42` confirms `--preferred` is a live selection
    control, not dead surface: "Legacy `--preferred` remains a selection control and
    is not overloaded as provenance." The design carried the preflight half of the
    discovery risk forward and dropped the legacy-preferred half.

    The gap has already propagated: `plan.md:165` says "Add CLI options and
    normalization without overloading `--preferred`" but no plan task adds a
    legacy-preferred exclusion or its regression test.

    Note that `selectionMode` alone cannot carry this predicate. Beyond the
    preferred path, `index.ts:1689-1700` assigns `'capped'` when
    `policy.value === null` and no target exists, and that branch is evaluated
    _before_ the reviewer check at `index.ts:1702` — so even a reviewer route can
    report `capped`. Every exclusion in this design must be gated on resolver
    `role` plus selection state, never on `selectionMode`.

  - Fix: Make the skipped-selection predicate explicit and complete in
    `design.md:125-130` and `design.md:205-206`. State the positive condition in
    terms the implementer can code directly against `DispatchSelection`
    (`index.ts:193-210`): emit `managed-capped-selection-skipped` only when
    `selection.role === 'implementer'`, the policy is managed and named-cap,
    `selection.requestedCandidate === null`, `selection.selectedValue !== null`,
    **and** `selection.preferredValue === null`. Decide and record explicitly what
    a `--preferred` dispatch that lands exactly on the cap should do — either stay
    silent (simplest, consistent with treating `--preferred` as a real selection
    control) or emit a distinct third code such as
    `managed-capped-preferred-at-cap`; do not let it fall through to the
    skipped-selection message. Add the matching row to the testing matrix at
    `design.md:247-248`: "legacy `--preferred` below cap and `--preferred` at cap on
    a managed named-cap implementer route emit no skipped-selection warning."

### Medium

- **Dispatch Report V1 gains classification and notices but no preferred value, so the exclusion decision is not auditable** (`.oat/projects/shared/surface-implementer-dispatches/design.md:180`)
  - Issue: The data model at `design.md:180-184` adds `classification` and
    `notices` to `DispatchReportV1` and nothing else. But
    `DispatchReportSelectionInput` and the report's `selection` block
    (`packages/cli/src/providers/identity/dispatch-report.ts:63-75` and
    `:106-117`) carry no `preferredValue` field — a repo-wide search for
    `preferredValue` under `packages/cli/src/providers/identity` returns nothing.
    `selection.preferredValue` exists in the resolver
    (`index.ts:198`, populated at `index.ts:1706`, `:1719`, `:1736`) but is dropped
    at the report boundary. Consequence: after Finding I1 is fixed, a bare capped
    dispatch and a `--preferred`-at-cap dispatch serialize to byte-identical
    reports — same `selectionMode: 'capped'`, same `selectedValue`, same
    `requestedCandidate: null` — differing only in whether a notice happens to be
    present. A reviewer auditing a dispatch log cannot confirm the suppression was
    correct rather than a bug, which undercuts `discovery.md:57-58` ("carry them
    into Dispatch Report output beside the selected candidate and ceiling") and the
    backlog's goal of making at-cap dispatch "evaluated after the fact rather than
    merely identified" (`BL-260727-surface-implementer-dispatches.md:84-86`).
  - Fix: Add `preferredValue: string | null` to the report `selection` block in
    `design.md:180-184`, sourced from `selection.preferredValue`. It is additive
    and nullable like the other new fields, so it costs nothing beyond one
    `orderedReport` line (`dispatch-report.ts:200-218`) and does not touch
    `toDispatchStampRecord` (`dispatch-report.ts:448-464`). Extend the ordered
    serialization test at `design.md:253` to cover it.

- **The `choices` disclosure has no specified delivery surface and no access to configuration** (`.oat/projects/shared/surface-implementer-dispatches/design.md:26`)
  - Issue: `design.md:26-27` and `design.md:164` state that "recommendation
    adoption and policy choices disclose the configured terminal reviewer," and
    `design.md:209-210` defines `terminal-reviewer-eligibility` as a notice code.
    Two problems. First, delivery: notices live on `DispatchReportV1`
    (`design.md:183`), but `runDispatchCeilingChoices`
    (`index.ts:2765-2788`) emits `{ status: 'ok', choices }` and never builds a
    report — `buildResolutionReport` returns `null` unless both `--report-scope`
    and `--report-action` are supplied (`index.ts:2663-2672`). `design.md:188-190`
    only hedges that "resolver and configuration envelopes **may** reuse
    `DispatchNotice`," which is a permission, not a contract an implementer can
    build to. Second, content: `getDispatchPolicyChoices()` is context-free —
    `packages/cli/src/config/dispatch-policy-options.ts` contains no reviewer or
    terminal-target concept and the command reads no config — so "the _configured_
    terminal reviewer" is not knowable on that path. `discovery.md:93-94` uses the
    same loose wording, so the ambiguity is inherited rather than introduced, but
    the design is the artifact that must resolve it.
  - Fix: In `design.md:216-221`, state the delivery surface for each disclosure
    path explicitly: adoption emits through the config command's existing output,
    `choices` emits through a named field on the choices envelope, and runtime
    emits through `DispatchReportV1.notices`. Then disambiguate the content: on the
    `choices` path the only knowable target is the **recommendation's** terminal
    reviewer (`frontier` → `fable`, per
    `packages/cli/config/dispatch-matrix-recommendation.json:97-98`), not the
    user's configured one. Either say so, or drop `choices` from the disclosure
    scope and keep it on adoption and runtime, where real configuration is in hand.
    Add the corresponding assertion to `design.md:260-264`.

- **`--preferred-effort` collides with the existing `--preferred` flag and its conflict matrix is unspecified** (`.oat/projects/shared/surface-implementer-dispatches/design.md:197`)
  - Issue: The design adds `--preferred-effort` for "Codex classification
    provenance, separate from candidate selection" (`design.md:197-198`) to a
    command that already has `--preferred`, defined as the "legacy preferred
    implementer/fix value before applying the resolved policy"
    (`index.ts:2835-2837`). Two near-identical flag names with opposite semantics —
    one selects, one only records — on the same subcommand is a durable
    misuse hazard, and it is the same conflation `discovery.md:40-42` set out to
    avoid. The design also says only "reject ... conflicting controls"
    (`design.md:97-98`) without enumerating which pairs conflict. The existing rule
    is concrete — `--preferred` with either candidate flag throws
    (`index.ts:1543-1547`) — and the new flag's interaction with `--preferred`,
    `--candidate-effort`, and `--role reviewer` is left to the implementer to
    invent.
  - Fix: Rename the classification flag so it cannot be mistaken for the selection
    control — `--classified-effort` or `--task-effort` reads correctly against
    `--task-class` and does not shadow `--preferred`. Then replace
    `design.md:97-98` with an explicit conflict table: which flag pairs error,
    which are independent, and what happens under `--role reviewer`. State
    directly that the classification flags never participate in
    `normalizeRequestedCandidate` (`index.ts:1532-1591`) so they cannot satisfy the
    exact-candidate requirement.

### Minor

- **"Reject ... reviewer classification" is ambiguous** (`.oat/projects/shared/surface-implementer-dispatches/design.md:97`)
  - Issue: `design.md:97-98` lists "reviewer classification" among rejected inputs,
    and `design.md:200-201` repeats that classification flags "are invalid for
    reviewers." But `DispatchTaskClass` (`design.md:105-110`) has no reviewer
    member, so there is no such value to reject. The intent is presumably to reject
    `--task-class` when `--role reviewer` is set, matching the existing pattern at
    `index.ts:1548-1552` and `:1523-1527`.
  - Suggestion: Reword to "reject `--task-class` and the effort-classification flag
    when `--role reviewer` is set" and cite the existing reviewer-rejection errors
    as the precedent for message shape.

- **`preferredEffort` has no declared value domain** (`.oat/projects/shared/surface-implementer-dispatches/design.md:114`)
  - Issue: `DispatchClassification.preferredEffort` and
    `DispatchReportClassification.preferredEffort` are typed `string | null`
    (`design.md:114`, `design.md:176`) while `taskClass` gets a closed union. The
    design says to reject "provider-inapplicable effort" (`design.md:97`) but never
    says what the applicable domain is. Codex efforts are a validated enum
    (`CODEX_VALUES`, checked at `index.ts:1568-1572`), and
    `dispatch-and-dry-run.md:359` fixes the order as
    `low < medium < high < xhigh < max`.
  - Suggestion: State that `preferredEffort` is validated against `CODEX_VALUES`
    and is `null` for every non-Codex provider, mirroring how `effortAxis` already
    resolves to `not-applicable` off Codex (`index.ts:1888-1891`).

- **"Fable" and "Frontier" are used without definition or a pointer to their source** (`.oat/projects/shared/surface-implementer-dispatches/design.md:221`)
  - Issue: `design.md:221` reads "High and custom non-Fable Frontier targets do not
    receive the Fable disclosure," and `design.md:264` repeats it as a test. Neither
    term is defined anywhere in the design, and the References block
    (`design.md:295-305`) does not point at the mapping. The facts exist —
    `packages/cli/config/dispatch-matrix-recommendation.json:97-98` maps Claude's
    `frontier` tier to `fable`, and `dispatch-and-dry-run.md:395` gives the ordering
    `haiku < sonnet < opus < fable` — but the implementer has to go find them.
  - Suggestion: Add one sentence naming `frontier` as the tier and `fable` as its
    Claude terminal target, and add
    `packages/cli/config/dispatch-matrix-recommendation.json` to the References
    block.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (upstream, quick mode),
`BL-260727-surface-implementer-dispatches.md` (backlog scope statement),
`design.md` (under review). `plan.md` consulted for downstream consistency only.
Verification sources:
`packages/cli/src/commands/project/dispatch-ceiling/index.ts`,
`packages/cli/src/providers/identity/dispatch-report.ts`,
`packages/cli/src/commands/config/index.ts`,
`packages/cli/config/dispatch-matrix-recommendation.json`,
`.agents/skills/oat-dispatch-subagents/references/record-schema.md`,
`.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`.
`spec.md` is absent, which is correct for quick mode and is not reported as a gap.

### Verified Code Claims

| Design claim                                                                                               | Status                   | Evidence                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DispatchTaskClass` matches the canonical `task_class` vocabulary                                          | confirmed                | `design.md:105-110` is character-identical to `record-schema.md:64-65` and to the log contract at `dispatch-and-dry-run.md:508`. No second taxonomy introduced.                                                                                                                                                                                        |
| Compatibility `Dispatch:` stamp can remain unchanged                                                       | confirmed                | `toDispatchStampRecord` (`dispatch-report.ts:448-464`) reads only `route`, `runtimeIdentity`, `requestedControls`, `policy.name/mode`, and `selection.ceilingTarget`. Adding `classification` and `notices` touches none of them.                                                                                                                      |
| Dispatch Report V1 permits additive nullable fields                                                        | confirmed                | `buildDispatchReport` (`dispatch-report.ts:329`) is the sole builder; `runtimeIdentity` already demonstrates the optional-input-with-default pattern (`dispatch-report.ts:132`, `:141-147`, `:380-382`). Additions require updating `orderedReport` (`:185-255`) and `formatDispatchReport` (`:390-446`), which `design.md:254-255` already schedules. |
| Recommendation version alone is not authoritative for the runtime target                                   | confirmed                | Adoption preserves explicit existing cells — see the compatibility flag description at `config/index.ts:2719` — so `design.md:166-167` and `discovery.md:44-46` are correct to derive runtime disclosure from the effective resolved target.                                                                                                           |
| `selectionMode=capped` is mechanically invalid only for actual managed named-cap implementation/fix routes | **contradicted in part** | `capped` is also emitted on the legacy `--preferred` implementer path (`index.ts:1723`, `:1740`) and, via the `policy.value === null` branch evaluated ahead of the reviewer check, on reviewer routes (`index.ts:1689-1702`). The reviewer case is covered by the design's reviewer exclusion; the `--preferred` case is not. See Finding I1.         |

### Discovery Coverage

| Discovery element                                                                                     | Status               | Notes                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD1 enforcement scope (all managed named-cap implementer/fix, not Cursor alone)                       | addressed            | `design.md:125-127` is provider-neutral.                                                                                                                                                                                                                                                        |
| KD2 diagnostic behavior (coded, JSON + human, not logger-only)                                        | addressed            | `design.md:212-214`, `design.md:233`.                                                                                                                                                                                                                                                           |
| KD3 classification provenance (separate nullable inputs into the report)                              | addressed            | `design.md:112-116`, `design.md:174-184`. Placing `classification` at top level rather than inside `selection` is a defensible reading of the `discovery.md:71-72` constraint, not drift.                                                                                                       |
| KD4 judgment boundary (require a recorded class, never validate correctness)                          | addressed            | Honored consistently — `design.md:27-28`, `:168-170`. The notice fires on _missing_ classification (`design.md:207-208`), never on a class judged wrong, and the reviewer notice states a confirmation requirement rather than asserting eligibility (`design.md:209-210`). No violation found. |
| KD5 Fable disclosure (ladder unchanged, match resolved target at runtime)                             | addressed            | `design.md:164-170`; terminology undefined, see finding m3.                                                                                                                                                                                                                                     |
| Constraint: preserve resolver status and exit semantics                                               | addressed            | `design.md:20-21`, `design.md:228-229`.                                                                                                                                                                                                                                                         |
| Constraint: no false warnings on preflight / reviewer / uncapped / inherit / **legacy compatibility** | **partial**          | Every listed route except legacy `--preferred` is excluded. See Finding I1.                                                                                                                                                                                                                     |
| Constraint: classification distinct from ceiling, requested candidate, selected candidate             | addressed            | `design.md:99-100`, `design.md:187-188`.                                                                                                                                                                                                                                                        |
| Constraint: `Dispatch:` stamp grammar unchanged                                                       | addressed            | `design.md:155`, `design.md:256`; verified above.                                                                                                                                                                                                                                               |
| Constraint: additive, backward-compatible report evolution                                            | addressed            | `design.md:152-154`; verified above.                                                                                                                                                                                                                                                            |
| Constraint: Cursor candidate strings remain opaque                                                    | addressed            | No design element parses candidate strings.                                                                                                                                                                                                                                                     |
| Constraints: skill version bump and five-package lockstep                                             | addressed downstream | Release mechanics correctly sit in `plan.md:375-419`; `design.md:292` runs `pnpm release:validate`. Not a design gap.                                                                                                                                                                           |
| SC: coded diagnostic in human and JSON                                                                | addressed            | `design.md:212-214`.                                                                                                                                                                                                                                                                            |
| SC: exact candidates at/below cap report `selectionMode=candidate`                                    | addressed            | `design.md:243-244`; confirmed reachable at `index.ts:1659`.                                                                                                                                                                                                                                    |
| SC: classification survives into the report                                                           | addressed            | `design.md:152`, `design.md:253`.                                                                                                                                                                                                                                                               |
| SC: preflight and non-applicable routes do not warn                                                   | addressed            | `design.md:231`, `design.md:247-248`.                                                                                                                                                                                                                                                           |
| SC: tests cover skipped / at-cap / below-cap / above-cap / preflight / serialization                  | addressed            | `design.md:240-248`, `design.md:250-256`. Missing only the legacy-`--preferred` row from Finding I1.                                                                                                                                                                                            |
| SC: adoption/choice explains reviewer target; runtime discloses actual target                         | partial              | Runtime path is specified; the `choices` path is not implementable as written (Finding M2).                                                                                                                                                                                                     |
| SC: docs distinguish access from retention eligibility                                                | addressed            | `design.md:271`.                                                                                                                                                                                                                                                                                |
| SC: CLI, docs, skill, build, release commands pass                                                    | addressed            | `design.md:275-293`.                                                                                                                                                                                                                                                                            |

### Backlog Coverage

All four acceptance criteria in `BL-260727-surface-implementer-dispatches.md:75-88`
are covered: warn-not-block on capped implementer/fix (`design.md:205-206`,
`design.md:228-229`), provider-shaped recorded classification
(`design.md:95-96`, `design.md:112-116`), classification stored beside the selected
candidate (`design.md:174-184`), and below-ceiling regression coverage
(`design.md:243-244`).

### Extra Work (not in discovery or the backlog)

None. The Fable/terminal-reviewer disclosure is absent from the backlog item but is
explicitly authorized by `discovery.md:22-24` as an agreed companion scope, so it is
in bounds.

### Testability Assessment

The Testing Strategy (`design.md:236-271`) is specific enough to implement directly:
each bullet names a behavior with an observable output, and the verification block
(`design.md:275-293`) names concrete existing test files that already cover the
touched modules. Coverage maps cleanly onto the Success Criteria with two gaps, both
already filed above: no legacy-`--preferred` exclusion case (Finding I1) and no
assertion pinning the `choices` disclosure surface (Finding M2).

## Verification Commands

Confirm the `--preferred` capped-path claim underlying Finding I1:

```bash
cd /Users/tstang/orca/workspaces/open-agent-toolkit/opus-model
sed -n '1700,1745p' packages/cli/src/commands/project/dispatch-ceiling/index.ts
rg -n "selectionMode: 'capped'" packages/cli/src/commands/project/dispatch-ceiling/index.ts
```

Confirm the report cannot distinguish preferred from bare (Finding M1):

```bash
rg -n "preferredValue" packages/cli/src/providers/identity/
rg -n "preferredValue|selectionMode" packages/cli/src/providers/identity/dispatch-report.ts
```

Confirm the `choices` path builds no report and reads no config (Finding M2):

```bash
sed -n '2660,2680p;2765,2790p' packages/cli/src/commands/project/dispatch-ceiling/index.ts
rg -n "reviewer|terminal" packages/cli/src/config/dispatch-policy-options.ts
```

Confirm the task-class vocabulary match (no defect; regression guard):

```bash
rg -n "mechanical-recon|intelligent-recon|default-implementation|hard-reasoning|consequential" \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .oat/projects/shared/surface-implementer-dispatches/design.md
```

After design edits land:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/providers/identity/dispatch-report.test.ts
pnpm format
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
Finding I1 should be resolved in `design.md` before `plan.md` phase p01 begins, since
the notice predicate it defines is the input to the parsing and validation task at
`plan.md:138`.
