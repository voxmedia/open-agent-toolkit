---
oat_retro_project: agent-provider-root
oat_retro_generated: 2026-08-30T20:24:18Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: gate-receipts
    status: used
  - source: git-history
    status: used
  - source: github-pr-checks
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: session-transcript
    status: unavailable
oat_retro_promotions: none
oat_retro_filing: none
oat_generated: true
oat_template: false
---

# Project Retrospective: agent-provider-root

## Executive Summary

The project shipped a provider-aware canonical role-instruction contract without changing native provider dispatch, model, effort, or variant selection. Exact-target fixtures, a zero-executable-agent ratchet, seven migrated reads, and release/package updates were verified by focused tests, an uncached HOME-isolated run, the repository Definition of Done, and independent reviews. Two late Bugbot findings exposed review-ledger completeness and ordering defects; both were repaired and independently reviewed without changing product code.

The main reusable lesson is that canonical instruction identity and native dispatch identity are related but separate contracts. A second lesson is that an append-oriented evidence ledger also needs explicit current-event semantics when readers select the last matching row.

## Evidence and Review Method

Durable evidence was read in this order: `project-log.md`; lifecycle artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, and `summary.md`); archived artifact, phase, final, and remote-review Markdown; the configured gate receipt; and the branch commit history. Live GitHub status confirmed that CI, release dry-run, and Cursor Bugbot were green on head `386379940a81a511168d0da71649b257d4e3b7b6` before completion began.

No `oat-execution-learnings.md` exists. A dedicated original session transcript was unavailable, so chronology and operator choices are sourced from committed implementation receipts and the append-only project log rather than reconstructed from current-run context. Claims below are confirmed by those durable sources unless explicitly qualified.

## Outcome Snapshot

| Area              | Generation-time outcome                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Product contract  | Safe `loaded -> user -> project` canonical role resolution with exact same-scope identity checks                                                |
| Dispatch boundary | Native provider/model/effort/variant/route selection unchanged                                                                                  |
| Migration         | Seven live canonical reviewer and implementer reads ported with independent dependency roots                                                    |
| Prevention        | Typed `skill`/`agent` classifier and zero executable-agent baseline across both scan scopes                                                     |
| Verification      | Mutation proof, 4,525 uncached HOME-isolated CLI tests, focused suites, full Definition of Done, and bounded reviews passed                     |
| Release           | Canonical skill bumps and five-package lockstep version `0.2.47` validated                                                                      |
| PR                | PR #242 was open, mergeable, and fully green at generation time                                                                                 |
| Lifecycle caveat  | The prior full exit gate passed; after two bookkeeping-only fixes, the operator explicitly skipped a full rerun and preserved the gate as stale |

## Current State

- **Promotions:** None; no RP apply-items exist.
- **Filing:** None; no RP file-items or UP items exist.
- **Unsettled items:** None.

## What Went Well

- The project kept the user's regression concern as an explicit invariant: provider-root resolution supplies canonical Markdown only and cannot reinterpret the already selected native dispatch target. The configured Fable High gate and all implementation reviews preserved that boundary.
- The provider fixtures modeled real Claude, Cursor, and Codex layouts. Accepting only the exact unsuffixed canonical file or its same-scope symlink made unsafe copies, variants, TOML transforms, and broken or escaping links deterministic candidate misses.
- The ratchet was proved against the real canonical skill tree with an intentional mutation, exact `source -> target` evidence, byte-exact restoration, and a clean rerun. The historical six-entry cross-skill baseline stayed byte-identical.
- Evidence quality was treated as part of correctness. The implementation distinguished Turborepo cache replay from actual execution and recorded an isolated, forced, uncached test run plus explicit gate exit codes.
- Remote review found two lifecycle-evidence defects after the feature itself was complete. Both were converted into bounded tasks, reviewed independently, and resolved before completion.

## Challenges and Struggles

The central design tension was whether a loaded provider directory could safely supply canonical instructions without interfering with model-specific provider behavior. Provider layouts are heterogeneous: Claude and Cursor expose canonical unsuffixed symlinks, Cursor also materializes suffixed variants, and Codex emits transformed TOML. The response was exact same-scope canonical identity validation with miss-and-continue behavior. This preserved the useful loaded tier while preventing transformed or stale views from becoming instruction sources.

The first final review found that a line-wide provider-example exemption could hide an executable bare agent read on the same line. That false negative weakened the zero-baseline ratchet even though current consumers were migrated. Task `p03-t03` narrowed the exemption to the paired same-role occurrence and added a red/green regression; the final re-review and configured gate then reported zero findings.

After merging `origin/main`, Bugbot found that the Reviews ledger omitted the initial final-review event. The first repair restored the event but appended it after newer passing events, which regressed readers that treat the last matching `final | code` row as current. Tasks `p03-t04` and `p03-t05` restored both the complete event multiset and chronological latest-event semantics. This was a bookkeeping failure class, not a provider-root runtime defect.

## Decision Register

- **Dependency-owned provider roots:** each dependency binds and validates its own root; durable record `DR-260830-dependency-owned-provider`.
- **Exact canonical identity for loaded targets:** only the same-scope canonical Markdown file or an exact resolving symlink qualifies; durable record `DR-260830-exact-canonical-identity`.
- **Native exact role dispatch precedes fallback:** canonical instruction fallback cannot change the selected provider target; durable record `DR-260711-native-exact-role-dispatch`.
- **Typed portability classifier:** one parser emits typed skill and agent evidence while two independent scan scopes remain; durable record `DR-260830-typed-portability-classifier`.

## Rejected or Superseded Alternatives

- A global environment variable or ambient singleton was rejected because roots belong to consuming dependencies and must remain isolated.
- Byte-identical provider copies, suffixed Cursor variants, and Codex TOML were rejected as canonical inputs because representation or content equality does not prove source identity.
- Moving all role reads behind dispatch was rejected as a broader behavioral API change; bounded source-of-truth and fresh-child fallback reads remain direct.
- A single shared root for simultaneous packs was rejected because one installed dependency could silently satisfy another dependency's missing role.

## Where We Changed Course

- Discovery initially questioned whether provider roots should start only at user/project canonical tiers. Revalidation of real provider layouts showed that a loaded tier was safe when exact-target identity was enforced, so the final design admitted verified Claude/Cursor canonical symlinks while rejecting transformed views.
- The planned line-level provider-example exemption was narrowed after final review reproduced a mixed executable/descriptive false negative. The result is occurrence-scoped matching.
- The first Bugbot repair optimized for event preservation; the second finding made last-event reader semantics explicit, so the row was moved into chronological position without altering its values.

## New Architecture Patterns and Approaches

The reusable pattern is a dependency-local capability binding with ordered candidates and exact identity validation. A loaded provider view may accelerate or localize access, but it is only eligible when it proves identity with the canonical same-scope source. Candidate failure is nonfatal until all canonical tiers miss; terminal failure then reports pack-aware recovery before any fallback child launches.

The classifier pattern is likewise reusable: typed findings allow one parser to serve several policy scans while each scan retains its own baseline and coverage contract.

## Domain Learnings

- Provider-native role selection and canonical role-instruction reads are separate layers. Preserving the first requires making the second incapable of selecting or reinterpreting model, effort, variant, or route.
- Symlink presence is not sufficient; the resolved target must equal the exact canonical file for the same scope.
- Evidence ledgers need both history preservation and current-state selection rules. If readers use the last matching event, chronological ordering is part of the data contract.
- A green cached suite is weaker evidence than a forced uncached run when the change affects bundled assets, generated views, or HOME-sensitive resolution.

## Gotchas for Humans

- Do not treat `.codex/agents/*.toml` or suffixed Cursor files as canonical Markdown, even when they represent the same conceptual role.
- When multiple packs are involved, use dependency-qualified root bindings; `${AGENT_PROVIDER_ROOT}` is only appropriate for one owning pack.
- When repairing a review ledger, verify uniqueness, the full row multiset, chronological order, and the reader-selected last event.
- Fetch `origin/main` before release-version checks and use the repository CLI; a stale global CLI or saved checkout can present the wrong project lifecycle.

## Gotchas for Autonomous Agents

- Resolve provider roots independently and fail closed; never let one resolved pack silently satisfy another dependency.
- Treat broken, escaping, copied, transformed, or suffixed loaded targets as misses and continue to user/project canonical roots.
- Preserve native dispatch first. Fresh-child composition is allowed only after a recorded pre-start native-role rejection.
- Capture direct exit codes and inspect cache behavior before describing a verification run as evidence-grade.
- Do not ingest a fourth automated remote-review cycle after the recorded three-cycle cap without explicit operator override.

## Repo Improvements (Promotion Register)

No repo improvements identified beyond the fixes already completed in tasks `p03-t03` through `p03-t05`.

## OAT Upstream Feedback (Upstream Register)

No upstream feedback identified.

## Remaining Boundaries and Follow-Ups

At generation time, `tool-pack-scope-provider-truthfulness` remained the owner of provider materialization, catalog visibility, reachability diagnostics, restart guidance, and scope-selection truthfulness. Its discovery can consume this project's canonical fallback contract without reopening the native dispatch boundary.

PR #242 was still open and unmerged at generation time. The full configured exit gate remained intentionally stale after the bookkeeping-only fixes because the operator declined a rerun; the bounded reviews and final PR checks were green.

## Reflections

The strongest part of this run was treating a narrow portability repair as a boundary-preservation problem rather than a path-substitution exercise. Exact identity, independent ownership, and negative provider fixtures made the design safe for model-specific dispatch. The late ledger findings also showed why lifecycle evidence deserves the same invariant-driven testing as runtime code: preserving every fact is not enough when ordering determines what consumers believe is current.
