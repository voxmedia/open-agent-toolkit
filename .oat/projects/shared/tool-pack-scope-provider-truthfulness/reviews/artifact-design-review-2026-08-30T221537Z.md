---
oat_generated: true
oat_generated_at: 2026-08-30T22:15:37Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/tool-pack-scope-provider-truthfulness
---

# Artifact Review: design

**Reviewed:** 2026-08-30
**Scope:** design.md (upstream: spec.md)
**Files reviewed:** 2

## Summary

The design is complete, internally consistent, and ready to proceed to
planning after small revisions. It covers all fifteen spec requirements with
matching verification methods, resolves seven of the spec's nine open
questions, and its claims about existing repository code (adapters,
`DispatchReportV1`, `getConfigAwareAdapters`, manifest V1, the generic
dispatch record schema, the `tools`/`workflows` AGENTS.md section keys, and
the project-scope-only `providers set` command) were all verified accurate
against source. The one Important gap is that FR7's real-world restart advice
depends on refresh-policy provenance sourcing that no phase schedules.

Findings: 0 critical, 1 important, 2 medium, 3 minor

## Findings

### Critical

None

### Important

- **FR7 restart advice depends on unscheduled refresh-policy provenance
  sourcing** (`design.md:770`)
  - Issue: The initial provider registry table (design.md:770-784) marks every
    catalog-refresh row `unknown pending sourced provider-version evidence`,
    and the `ProviderCatalogRefreshPolicy` contract (design.md:186-199,
    246-250) correctly requires sourced provenance before `manual-refresh` or
    `restart-required` may be declared. However, no phase contains a task to
    establish that provenance for any real provider — Phase 2's task list
    (design.md:1417-1424) only says "Add restart/refresh adviser and
    documentation." With all rows `unknown`, shipped restart advice can never
    fire in production, so FR7's core deliverable ("distinguish
    missing/unsupported provider views from a materialized catalog that
    requires provider restart or refresh", spec.md:177-188) is satisfiable
    only vacuously via `unknown`. Tests will pass because fixtures can inject
    policies, masking the gap.
  - Fix: Add an explicit Phase 2 task to source and record refresh-policy
    provenance (official contract, validated local behavior, or repository
    decision) for at least the providers with documented reload semantics; or
    state explicitly in design.md that the first release intentionally ships
    all-`unknown` refresh rows and record that as an accepted FR7 limitation
    so planning and HiLL review can weigh it.

### Medium

- **Load-bearing schema types are referenced but never defined**
  (`design.md:529`)
  - Issue: Several new types appear in interfaces but are neither defined in
    design.md nor present in the repository (verified by search):
    `CollectionIdentityProof` (design.md:529), `OatDispatchEvidenceEvent`
    (design.md:671), `PackEvidenceDiagnostic` (design.md:296, 971),
    `ProviderActivationEvidence` (design.md:221), `ProviderCatalogObservation`
    (design.md:469), `CandidateMiss` (design.md:885), `ExactTargetRef`
    (design.md:905), `RedactedPath` (design.md:219 and elsewhere), and a
    TypeScript `GenericDispatchRecord` (design.md:660) that today exists only
    as the markdown schema in
    `.agents/skills/oat-dispatch-subagents/references/record-schema.md`.
    `CollectionIdentityProof` and `OatDispatchEvidenceEvent` are the two
    safety-critical ones: the first carries the exact-adoption proof that
    FR5's entire safety story rests on, and the second carries the dispatch
    evidence transitions FR8 validates. Surrounding prose constrains their
    behavior, but a plan author cannot derive their field-level shape.
  - Fix: Define at least `CollectionIdentityProof`, `OatDispatchEvidenceEvent`,
    and `PackEvidenceDiagnostic` in the Data Models section (fields plus
    validation rules), and add one sentence stating that the remaining small
    types (`RedactedPath`, `CandidateMiss`, `ExactTargetRef`,
    `ProviderActivationEvidence`, `ProviderCatalogObservation`, TS
    `GenericDispatchRecord`) are defined during planning/implementation from
    the constraints already given.

- **Ambiguous "untracked" adopted-alias disablement semantics**
  (`design.md:545`)
  - Issue: The design decision "Existing user-created exact aliases are
    untracked but left in place when a provider is disabled"
    (design.md:545-547) conflicts with `ManifestCollectionEntry.ownership:
'oat-created' | 'adopted-exact'` (design.md:821), which records adopted
    aliases in the manifest. Two readings are possible: (a) disablement
    removes the manifest collection record while leaving the link on disk, or
    (b) adopted aliases keep their manifest record but are never unlinked.
    Disablement behavior is safety-relevant (FR5 acceptance requires
    deterministic provider disablement, spec.md:157-158), so this wording
    could mislead planning.
  - Fix: Replace "untracked" with the intended semantics, e.g. "On provider
    disablement, adopted-exact collection records are removed from (or
    retained in) the manifest and the on-disk link is never unlinked; only
    unchanged `oat-created` aliases may be removed as links."

### Minor

- **Unredacted machine-specific home path in References** (`design.md:1604`)
  - Issue: The reference
    `/Users/thomas.stang/orca/workspaces/open-agent-toolkit/scope-adoption-diagnostics/...`
    is a user-specific absolute path from another machine, in a durable
    artifact. It will not resolve for other collaborators and sits awkwardly
    beside the design's own NFR1 redaction posture (home paths render as `~`).
  - Suggestion: Cite the sibling project by repository-relative identity
    (project slug plus `.oat/projects/shared/scope-adoption-diagnostics/plan.md`
    on that machine's clone) or a symbolic "laptop clone" label with the
    observed head, without the literal home path.

- **`adviseProviderRefresh` weakens the visibility source union**
  (`design.md:466`)
  - Issue: `adviseProviderRefresh` returns
    `EvidenceFact<ProviderVisibilityState, string>` (design.md:466-470), while
    `ProviderReachabilityEvidence.visibility` constrains the source to
    `'provider-policy' | 'runtime-catalog-probe' | 'not-reported'`
    (design.md:453-456). The untyped `string` invites source values the
    matrix cannot represent.
  - Suggestion: Reuse the same source union in the return type.

- **`unknown` versus `not-reported` visibility states not delineated**
  (`design.md:427`)
  - Issue: `ProviderVisibilityState` includes both `unknown` and
    `not-reported` (design.md:427-433), and the error-handling section says
    "Report `unknown` or `not-reported`" (design.md:1157-1158) without a rule
    for which applies when. FR9 uses `not-reported` for absent transcript
    fields, suggesting an intent that is not stated for the visibility layer.
  - Suggestion: Add one sentence, e.g. "`not-reported` means the evidence
    channel exists but returned nothing; `unknown` means no channel or policy
    can establish the state."

## Spec/Design Alignment

**Evidence sources used:** design.md (artifact under review), spec.md
(upstream requirements), discovery.md (context), state.md (phase state), plus
repository source verification of design claims (`packages/cli/src/...`,
`.agents/skills/oat-dispatch-subagents/references/record-schema.md`).

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                                                                                           |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | covered | `EvidenceFact`, `ToolPackEvidence`, `ProviderReachabilityEvidence`; human output rendered from the JSON model (design.md:109-125, 705-745)                                                      |
| FR2         | covered | Lifecycle Selection and Outcome Projector; additive semantics, stale-intent exclusion, fail-closed unknown scopes, issue-#228 e2e scenarios (design.md:330-398, 1196-1197, 1237-1238)           |
| FR3         | covered | Single pack evidence projector consumed by picker/list/info/status/doctor; duplicate scope via `realizedPlacement: 'both'`; PR #240 semantics preserved (design.md:253-329, 976-990)            |
| FR4         | partial | Registry, capability matrix, activation precedence, Claude user roles all covered (design.md:158-251, 747-784); FR7-adjacent gap: refresh rows all `unknown` with no sourcing task (finding I1) |
| FR5         | covered | Collection Alias Reconciler with exact-identity proof, apply-time revalidation, recoverable transaction, first-release real-directory exclusion (design.md:492-562, 826-845)                    |
| FR6         | covered | Project Guidance Reconciler; opt-in flags, decline default, symlink validation, legacy `workflows` section handling (design.md:564-629, 1013-1025); section keys verified in repo source        |
| FR7         | partial | Truthfulness contract fully covered (visibility defaults unknown, no restart advice for failed materialization); real-world delivery blocked on unsourced refresh provenance (finding I1)       |
| FR8         | covered | Namespaced augmentation of the canonical generic record; pre-start-rejection-only fallback; immutable configured evidence; launch attestation (design.md:631-703, 866-955)                      |
| FR9         | covered | `RuntimeObservation` metadata-only schema, `not-reported` default, non-authority rule, strict sensitive-content rejection (design.md:915-928, 951-952)                                          |
| FR10        | covered | Legacy `placement` compatibility release, PR #227 sibling-field preservation, PR #240 inventory invariants, PR #242 native-first order (design.md:23-27, 321-325, 992-997, 1361)                |
| NFR1        | covered | No delete/recreate fallback, fail-closed path classes, redaction rules, threat mitigations (design.md:1090-1106); one hygiene lapse in the artifact's own References (finding m1)               |
| NFR2        | covered | Idempotence, partial-failure preservation, atomic collection/manifest/record transactions, recovery identifying the failed layer (design.md:551-562, 841-845, 1146-1175)                        |
| NFR3        | covered | Source-qualified `EvidenceFact` everywhere; approximation labeling for fallback; explicit unknown/unsupported states (design.md:705-745, 904, 1207)                                             |
| NFR4        | covered | Compatibility release windows, migration steps, lockstep version advancement, full gate sequence (design.md:992-997, 1268-1291, 1320-1344)                                                      |
| NFR5        | covered | No provider launch or network in static inventory; probes/observations separate and capability-gated (design.md:477-479, 1140-1144, 1210)                                                       |

Verification methods in the design's Requirement-to-Test Mapping
(design.md:1192-1210) match the spec's Requirement Index (spec.md:390-408)
for all fifteen rows.

Of the spec's nine open questions (spec.md:410-431), seven are resolved in
the design; the two left open (predecessor landing SHA, release grouping) are
explicitly surfaced in design.md:1366-1375 and match the two HiLL decisions
state.md already flags — this is intentional, not a defect.

### Extra Work (not in requirements)

None of substance. Three design elaborations go beyond the spec's literal
text but are traceable: extending `oat providers set` to user scope
(design.md:1004-1008) is required by FR4's configured-authority acceptance at
user scope (verified: the current command is project-scope-only in
`packages/cli/src/commands/providers/set/index.ts`); Manifest V2
(design.md:786-847) realizes FR5's "explicit manifest ownership"; and the
`oat project dispatch record` CLI (design.md:1036-1055) is the persistence
mechanism FR8's provenance requires.

## Verification Commands

```bash
# Re-check that the flagged undefined types remain undefined in design and repo
rg -n 'CollectionIdentityProof|OatDispatchEvidenceEvent|PackEvidenceDiagnostic|ExactTargetRef|CandidateMiss' \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md packages/cli/src

# Re-check the ambiguous adopted-alias wording and refresh-provenance gap
rg -n 'untracked|unknown pending sourced' \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md

# Re-check the unredacted absolute path
rg -n '/Users/' .oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md

# Re-verify requirement ID coverage parity between spec and design
rg -n '^\| (FR|NFR)[0-9]+' \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/spec.md \
  .oat/projects/shared/tool-pack-scope-provider-truthfulness/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
