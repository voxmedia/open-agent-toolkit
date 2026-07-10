---
oat_generated: true
oat_generated_at: 2026-07-10T20:09:42Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/dispatch-schema-matrix-infrastructure
---

# Artifact Review: design

**Reviewed:** 2026-07-10T20:09:42Z
**Scope:** `design.md` completeness, clarity, internal consistency, and alignment with `discovery.md` (quick workflow mode; no spec.md expected)
**Files reviewed:** 2 (`design.md`, `discovery.md`; `plan.md`, `implementation.md`, `state.md` read for context only)
**Commits:** N/A (artifact review, no diff range)

## Summary

The design is substantively complete for a quick-mode lightweight design and aligns closely with discovery: all ten discovery key decisions, all constraints, and all success criteria are traceably covered by the Overview, Component Design, Data Models, Error Handling, and Testing Strategy sections. No contradictions with discovery were found, and the design correctly builds on (rather than reimplements) the shipped candidate-ladder contract from PR #132. Remaining issues are contract-precision gaps in the new interfaces and the `DispatchReportV1` schema that should be tightened before the schema ships as version 1, plus small terminology and type-definition gaps.

Findings: 0 critical, 0 important, 2 medium, 4 minor

## Findings

### Critical

None

### Important

None

### Medium

- **`DispatchMatrixCellRef.value` semantics undefined for structured route targets** (`design.md:158`)
  - Issue: `DispatchMatrixCellRef` declares `value: string` with an optional `target?: WorkflowDispatchRouteTarget` (design.md:158-159), and the data flow says each reference retains "opaque value, and structured target when present" (design.md:99). When a candidate is a structured target (e.g., a Codex `{ harness, model, effort }` route target) rather than an opaque string, the design never says what `value` contains — a canonical serialization, the raw config text, or something else. Two adapter implementers could reasonably produce different `value` strings for the same cell, breaking the "one shared walker" consolidation goal (discovery.md:93-96) at the contract level.
  - Fix: In the Shared Dispatch Matrix Core interfaces section, state explicitly what `value` holds when `target` is present (e.g., "a deterministic canonical serialization of the target, used only for display/dedup keys; consumers must use `target` for structured access"), or make `value` optional/nullable when `target` is set and document the invariant (exactly one of the two is authoritative).

- **`selectionBranch` appears in both `route` and `selection` sections of `DispatchReportV1` with no stated authority** (`design.md:321`)
  - Issue: The schema declares `route.selectionBranch: string` (design.md:321) and `selection.selectionBranch: string` (design.md:338). The design gives no rationale for the duplication and does not say which field is authoritative or whether they can ever differ. Since `schemaVersion: 1` is mandatory and JSON key order is stable (design.md:420), this redundancy gets locked into the versioned machine contract, and discovery's report-semantics decision requires fields to stay distinct and non-overloaded (discovery.md:100-103).
  - Fix: Either remove one of the two `selectionBranch` fields before the v1 schema ships, or add a Validation Rule stating the relationship (e.g., "`route.selectionBranch` mirrors `selection.selectionBranch`; they are always equal, and `selection` is authoritative") so consumers do not treat divergence as meaningful.

### Minor

- **Config-layer terminology mismatch: "shared" config vs `repo-config` source value** (`design.md:71`)
  - Issue: The component diagram and prose describe inputs as "raw local/shared/user config" (design.md:71), but the `DispatchMatrixWalkContext.source` enum uses `'local-config' | 'repo-config' | 'user-config' | 'project-state'` (design.md:149). "Shared" and "repo" presumably name the same layer, but the design never says so, which invites inconsistent naming in adapters and provenance output.
  - Suggestion: Pick one term and use it in both the diagram and the enum, or add a one-line note that "shared config" is emitted as `repo-config` in structured provenance.

- **New result types referenced but never defined** (`design.md:227`)
  - Issue: `DispatchValidationPassContext.cursorCatalog` references `CursorCatalogResult` (design.md:227) and `validateDispatchMatrixRefs` returns `DispatchMatrixValidationResult[]` (design.md:235). Unlike `WorkflowDispatchProviderValue`/`WorkflowDispatchRouteTarget` (existing shipped types), these two appear to be new types introduced by this project, and the design gives no shape for them — in particular, how the `valid` / `unknown-value` / `unvalidated` outcomes (design.md:243, design.md:459-461) are represented structurally.
  - Suggestion: Add minimal shape sketches (fields or a status enum) for `CursorCatalogResult` and `DispatchMatrixValidationResult` in the Validation-Pass Coordinator interfaces, so the outcome vocabulary is a typed contract rather than prose.

- **`runtimeIdentity` is non-nullable in the schema but optional in the input; default synthesis unstated** (`design.md:359`)
  - Issue: `DispatchReportV1.runtimeIdentity` is a required section (design.md:359-365), while `DispatchReportInput.runtimeIdentity?` is optional (design.md:376). The design says to preserve `not-reported` states (design.md:255-256) but never states what `buildDispatchReport` emits when the input omits runtime identity (presumably all-null fields with `provenance: 'unknown'`). Note the asymmetry with `gateInvocation`, which is explicitly nullable.
  - Suggestion: Add a Validation Rule specifying the synthesized default (e.g., "when input omits `runtimeIdentity`, the report emits `producer/model/effort: null`, `provenance: 'unknown'`") so JSON output stays deterministic across implementations.

- **Relationship between `route.action` and `route.role` is ambiguous given the stated rationale** (`design.md:318`)
  - Issue: The schema enumerates `action: 'implementation' | 'fix' | 'review'` and `role: 'implementer' | 'fix' | 'reviewer'` (design.md:318-319), which read as a 1:1 mapping. Yet the API Design section justifies explicit `--report-scope`/`--report-action` options because "resolver role alone cannot distinguish implementation from fix" (design.md:439-440). If role cannot distinguish them, the two enums are not 1:1 and the derivation of `role` needs stating; if they are 1:1, one field is redundant.
  - Suggestion: State how `route.role` is populated (e.g., from the resolver's role input, which may report `implementer` for both implementation and fix actions) or collapse to a single field if they are genuinely 1:1.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (upstream requirements source for quick mode), `design.md` (artifact under review). `plan.md` and `implementation.md` are scaffolded templates (project is in the design phase awaiting approval per `state.md`), which is expected and not a finding. No `spec.md` exists, per the quick-mode contract.

### Discovery Coverage

| Discovery requirement / decision                                                                                   | Status                | Notes                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD1: Named tiers are ceilings, not exact preferences (discovery.md:87-89)                                          | implemented in design | design.md:100-103 (data flow step 3) restates named tiers bound the search                                                                                                                                                                                                         |
| KD2: Canonical input algebra through one shared core (discovery.md:90-92)                                          | implemented in design | design.md:94-96, 127-135 (normalizer responsibilities and canonicalization)                                                                                                                                                                                                        |
| KD3: One shared provenance-rich walker (discovery.md:93-96)                                                        | implemented in design | design.md:148-176 (`DispatchMatrixCellRef` carries tier, indices, path, source); see M1 for a value/target precision gap                                                                                                                                                           |
| KD4: Provider opacity (atomic Codex pairs, opaque Cursor strings) (discovery.md:97-99)                             | implemented in design | design.md:102-103, 186-188, 485-486                                                                                                                                                                                                                                                |
| KD5: Report keeps policy/ceiling/candidate/target/defaults/gate/runtime distinct (discovery.md:100-103)            | implemented in design | design.md:314-399 (`DispatchReportV1` typed sections) + validation rules 401-420; see M2 for one redundant field                                                                                                                                                                   |
| KD6: `Dispatch:` stamp derived from report, compatibility-only (discovery.md:104-105)                              | implemented in design | design.md:27-29, 264, 444-446 (`toDispatchStampRecord`, `formatDispatchStamp` retained)                                                                                                                                                                                            |
| KD7: Immutable gate provenance, runtime identity cannot overwrite (discovery.md:106-108)                           | implemented in design | design.md:270-272, 351-358 (readonly gate fields), 416-419                                                                                                                                                                                                                         |
| KD8: Shared validation pass context, catalog at most once, one probe per distinct candidate (discovery.md:109-112) | implemented in design | design.md:210-243 (Validation-Pass Coordinator), 467-474 (Performance)                                                                                                                                                                                                             |
| KD9: Live evidence — sentinel-confirmed launch definitive, catalog never proves eligibility (discovery.md:113-116) | implemented in design | design.md:241-243, 274-302 (Cursor Verification Evidence), 506-515 (Live Verification)                                                                                                                                                                                             |
| KD10: Quick mode, explicit design approval before plan (discovery.md:117-118)                                      | implemented in design | This review is part of that approval loop; `state.md` confirms plan generation is gated                                                                                                                                                                                            |
| Constraint: preserve legacy/malformed behavior via adapters (discovery.md:121-123)                                 | implemented in design | design.md:130-131, 178-184, 452-453 (structured issues + adapter-owned warn/fail policy)                                                                                                                                                                                           |
| Constraint: ladders atomic during layered flattening (discovery.md:125-126)                                        | implemented in design | design.md:133-134                                                                                                                                                                                                                                                                  |
| Constraint: provenance preserved end-to-end; sources kept distinct (discovery.md:127-132)                          | implemented in design | design.md:97-99, 207-208, 411-413                                                                                                                                                                                                                                                  |
| Constraint: exact-candidate fail-closed (discovery.md:131-132)                                                     | implemented in design | design.md:456-457                                                                                                                                                                                                                                                                  |
| Constraint: no reimplementation of shipped selection/materialization/gate behavior (discovery.md:133-135)          | implemented in design | design.md:42-53 (System Context)                                                                                                                                                                                                                                                   |
| Constraint: configured/requested vs runtime confirmation separation (discovery.md:136-138)                         | implemented in design | design.md:109-110, 416-419                                                                                                                                                                                                                                                         |
| Constraint: sanitized evidence, no credentials (discovery.md:138-139)                                              | implemented in design | design.md:281-283, 464-465                                                                                                                                                                                                                                                         |
| Constraint: base rebased onto PR #132 (discovery.md:140-142)                                                       | implemented in design | design.md:51-53                                                                                                                                                                                                                                                                    |
| Constraint: lockstep package bump + `release:validate` (discovery.md:143-144)                                      | implemented in design | design.md:522-523 (Repository Verification)                                                                                                                                                                                                                                        |
| Success criteria (discovery.md:146-170)                                                                            | implemented in design | Each criterion traces to a Testing Strategy bullet: shared normalizer/walker parity (design.md:493-496), report determinism (487-489), stamp compatibility (489-490), probe/catalog call counts (501-502), explicit outcomes (503), live evidence (506-515), repo checks (517-523) |
| Out of scope items (discovery.md:172-181)                                                                          | implemented in design | Design introduces no policy renames, no selection rebuild, no long-lived caching (design.md:240, 474), no catalog-as-eligibility (design.md:243), no spec.md                                                                                                                       |

### Extra Work (not in declared requirements)

None. Every design component (matrix core, adapters, validation-pass coordinator, report core, evidence recorder) maps to one of the four backlog items enumerated in discovery (discovery.md:13-18). No scope creep detected.

## Verification Commands

Run these to verify the fixes once the design is revised:

```bash
# M2/m4: confirm selectionBranch and role/action duplication is resolved or documented
rg -n "selectionBranch|route:|role:" .oat/projects/shared/dispatch-schema-matrix-infrastructure/design.md

# M1: confirm value/target invariant is stated in the cell-ref contract
rg -n "value: string|target\?" .oat/projects/shared/dispatch-schema-matrix-infrastructure/design.md

# m1: confirm layer terminology is consistent between diagram and enum
rg -n "shared|repo-config" .oat/projects/shared/dispatch-schema-matrix-infrastructure/design.md

# m2: confirm the new result types now have shapes
rg -n "CursorCatalogResult|DispatchMatrixValidationResult" .oat/projects/shared/dispatch-schema-matrix-infrastructure/design.md

# m3: confirm the runtimeIdentity default rule exists
rg -n "runtimeIdentity" .oat/projects/shared/dispatch-schema-matrix-infrastructure/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
