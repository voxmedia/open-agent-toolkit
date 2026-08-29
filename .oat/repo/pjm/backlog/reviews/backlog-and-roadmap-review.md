# Backlog & Roadmap Review

<!-- markdownlint-disable MD013 -->

**Date:** 2026-08-29 (America/Chicago)
**Scope:** All 55 active records under `.oat/repo/pjm/backlog/items/`
**Roadmap:** `.oat/repo/pjm/roadmap.md` (included after the interactive
scope prompt selected the recommended inclusive option)
**Codebase baseline:** HEAD `3ca99ba0` (tag `v0.2.38`); `origin/main`
`8cc1b382` (PR #226)
**Purpose:** Reconcile the active backlog with current repository evidence,
triage value against effort, expose dependencies and ownership lanes, and
recommend a practical sequence. This document is a living review, not an
authorization to change item priorities or execute the proposed work.

## Adoption and preflight

`oat pjm doctor --json` completed the canonical-file and backlog-specific
checks with adoption state `inferred-legacy`. The command returned a warning
exit status because of pre-existing repository-layout warnings (unknown
top-level PJM entries, a legacy monolith, loose reference files, and duplicate
active files under reference); those warnings did not block this review.

The preflight confirms the current backlog is being read from the canonical
item directory and that the review output belongs at
`.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`. No item
priority, status, estimate, roadmap entry, or `priority-alignment.md` row was
changed by this review.

## 1. Executive summary

The active backlog has **55 records**: 30 tasks and 25 features. The current
recorded priority distribution is 2 urgent, 16 high, 30 medium, and 7 low.
The review classifies the records into 1 Quick Win, 16 Strategic, 23 Fill-in,
and 15 Avoid / Defer candidates.

| Theme                                              | Count | Triage conclusion                                                                                                                    |
| -------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------ |
| Review, gate, lifecycle, and dispatch integrity    |    20 | Complete the ReviewPlan and gate-provenance foundation before adding more broad review machinery.                                    |
| Tool packs, providers, skills, and distribution    |    14 | The scope/provider/dispatch truthfulness problem is now the most consequential active product gap.                                   |
| Docs, release, Explainer Kit, and test reliability |    21 | Several small fixes are independently useful; browser, publication, and broad authoring work should remain demand- or trigger-gated. |

### Recommended order of attention

1. **Finish [BL-260729-implement-reviewplan-first — Implement
   ReviewPlan-first reviewer workflow](../items/BL-260729-implement-reviewplan-first.md).**
   PR #190 is still open, draft, and dirty, so this is the current capacity
   constraint and should be reconciled with the project state before starting
   another large review initiative.
2. **Make [BL-260829-make-tool-pack-scope-selection — Make tool-pack scope,
   provider reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md)
   the next urgent product lane.** It consolidates the newly observed
   project-plus-user scope picker error, user-scope agent invisibility,
   provider-aware diagnostics, folder-level symlink preference, restart
   guidance, and native-role fallback provenance. It should consume the
   boundaries from [BL-260827-correct-scope-and-adoption — Correct scope and
   adoption diagnostics](../items/BL-260827-correct-scope-and-adoption.md) and
   [BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and
   config contracts](../items/BL-260827-clean-up-tool-pack-lifecycle.md), not
   be treated as an isolated picker-only fix.
3. **Sequence [BL-260820-bind-each-gate-review — Bind each gate review
   disposition to its exact received ledger event](../items/BL-260820-bind-each-gate-review.md)
   before [BL-260820-emit-source-qualified — Emit source-qualified provenance
   envelopes for review and gate receipts](../items/BL-260820-emit-source-qualified.md)
   and [BL-260711-skip-re-review-for-bookkeeping — Skip re-review for
   bookkeeping-only review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md).**
   The first item establishes an honest event identity; provenance then makes
   the distinction observable; only then should bookkeeping-only fixes be
   recognized as non-blocking to progress.

### Immediate conclusion

The backlog is large enough that organization is more valuable than adding
another undifferentiated priority list. The high-value path has three
interlocking foundations:

- a truthful scope/provider/content-type model for installation, sync, and
  dispatch;
- an honest review-event and receipt model that does not burn cycles on ledger
  corrections; and
- a finished ReviewPlan implementation that makes broad review work bounded.

The roadmap currently under-represents that path, while several closed items
and stale project states still make the repository look less current than it
is. The recommended action is to update roadmap/project bookkeeping in a
separate operator-approved pass after this review, not to silently rewrite it
here.

## 2. Evidence and freshness findings

### Repository and GitHub baseline

- `origin/main` was fetched before the review and is at PR #226, which merged
  the packaged sibling-skill reference portability fix.
- PR #190, **ReviewPlan Stage A compatibility release**, remains open, draft,
  and dirty. The associated project state still says discovery is in progress,
  so its external and local lifecycle records need reconciliation.
- PR #217, **warn on manifest/CLI version skew before any mutation**, merged
  on 2026-08-26.
- PR #219, **honor OAT_ASSETS_DIR and isolate package-coverage smoke assets**,
  merged on 2026-08-27.
- PR #222, **route codex-skill through provider guidance and make repo-check
  bypass conditional**, merged on 2026-08-27.
- PR #226, **make packaged sibling-skill references portable**, merged on
  2026-08-28.

The backlog and several project files still contain pre-merge descriptions,
open/implementation states, or roadmap references for that work. This is
evidence for reconciliation, not evidence that the corresponding code is
missing.

### Active-record quality

- **19** active records still contain placeholder acceptance text such as
  `{Outcome 1}` or `{Outcome 2}`. These should be normalized before relying
  on acceptance criteria for automated planning.
- **3** active records have no recorded `scope_estimate`: [BL-260718-fix-oat-docs-generate-index
  — Fix oat docs generate-index cwd-relative defaults in monorepos](../items/BL-260718-fix-oat-docs-generate-index.md),
  [BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in oat docs nav
  sync (currently MkDocs-only)](../items/BL-260718-support-fumadocs-in-oat-docs.md),
  and [BL-260726-validate-structured-output — Validate structured-output
  contract in gate skill commands](../items/BL-260726-validate-structured-output.md).
- **2** active records contain duplicate `## Acceptance Criteria` headings:
  [BL-260818-extend-guarded-prose-contract — Extend guarded-prose contract
  tests to docs-app mirrors](../items/BL-260818-extend-guarded-prose-contract.md)
  and [BL-260818-require-repo-wide-call-site — Require repo-wide call-site
  sweeps for cross-cutting options in acceptance criteria](../items/BL-260818-require-repo-wide-call-site.md).
- The older living review was dated 2026-08-19, claimed 44 active records, and
  omitted 16 currently active records while retaining several closed or
  otherwise stale references. This review replaces that stale coverage.

### Scope/provider evidence

The issue #228 transcript and its linked comment provide a concrete repro:
all four answers that were presented as “User scope” for ideas, utility,
research, and brainstorm landed as **project + user**, and the picker displayed
`(installed: project + user)` before any project installation had occurred.
The same investigation found that a user-scope manifest can project skills
without projecting agents, while the provider catalog can still lack managed
roles. That creates a gap between canonical installation, provider visibility,
and dispatch availability.

The current implementation seams explain why this needs a cross-cutting item:

- init/install inventory derives placement from declared or realized scope and
  uses that state in picker annotations;
- the shared content-type model permits user-scope skills but not user-scope
  agents;
- plan computation skips user-scope agent entries;
- Claude advertises an agents directory mapping, but generic user sync cannot
  materialize those agent roles;
- managed-role exceptions can hide missing Claude roles from diagnostics; and
- dispatch guidance distinguishes native role selection from a generic child
  supplied with role instructions, but the resulting records do not preserve
  enough provenance to make that distinction durable.

This is why “the pack is installed” and “the active provider can use the
pack” must become separate reported states.

### Roadmap evidence

The roadmap has **22 unique backlog references**: 20 still active and 2 now
closed. Therefore **35 active items are roadmap orphans**. The two stale
roadmap references are [BL-260718-remove-post-w6-reviews-row — Remove post-W6
reviews-row restore watch](../items/../archived/BL-260718-remove-post-w6-reviews-row.md)
and [BL-260817-let-resolveassetsroot-honor — Let resolveAssetsRoot honor
OAT_ASSETS_DIR and make smoke asset reads hermetic](../items/../archived/BL-260817-let-resolveassetsroot-honor.md).

The roadmap is useful as a directional grouping, but it is not currently a
complete active-backlog index. The proposed alignment in section 7 is
deliberately advisory until a separate roadmap-edit decision.

## 3. Review method

Each active record was read from its canonical item file. The table below
preserves the current priority and recorded estimate, then adds a review
value, a review effort, a quadrant, and a concrete rationale.

- **Value** measures user impact, correctness, risk reduction, and leverage.
- **Review effort** is the expected implementation/reconciliation cost for
  sequencing, not a replacement for the record's estimate. Missing source
  estimates are marked `missing` and receive a provisional review effort.
- **Quick Win** means high value and low effort.
- **Strategic** means high value with medium or high effort.
- **Fill-in** means useful but bounded or lower-leverage work that can run in an
  available lane.
- **Avoid / Defer** means low current value, trigger-gated work, unresolved
  overlap, or high effort without a current consumer. It does not mean the
  idea is permanently rejected.

## 4. Active-item catalog and triage

The B-numbers are local review references only. Every B-number maps to the
full backlog ID and title in this table; compact B-numbers are used only in
the dependency graph and lane shorthand below.

| Ref | Backlog item                                                                                                                | Current priority / recorded estimate | Review value / effort | Quadrant      | Rationale and dependencies                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01 | **BL-260706-front-load-recurring-gate — Front-load recurring gate-finding classes into implementer briefs**                 | medium / L                           | medium / high         | Avoid / Defer | Valuable once recurring findings are stable, but broad and dependent on the ReviewPlan and honest receipt foundations; defer until B26, B37, and B38 have settled the evidence contract.                                           |
| B02 | **BL-260708-verify-cursor-gpt-5-6-subagent — Verify Cursor GPT-5.6 subagent model slugs**                                   | medium / S                           | low / low             | Fill-in       | A small compatibility check with value only for Cursor users; schedule when Cursor model routing is otherwise active and pair with B22.                                                                                            |
| B03 | **BL-260711-add-activity-aware-gate — Add activity-aware gate timeouts**                                                    | high / M                             | high / medium         | Strategic     | Reduces false timeout conclusions in active gate work; sequence after B26's bounded review contract and coordinate with B13 and B43.                                                                                               |
| B04 | **BL-260711-add-root-owned-dispatch-broker — Add root-owned dispatch broker for exact OAT subagent launches**               | high / M                             | medium / high         | Avoid / Defer | The exact-launch goal matters, but a new broker overlaps native-role discovery, provider reachability, and existing dispatch constraints; wait for B44 and B55 to establish the real failure boundary.                             |
| B05 | **BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings**                          | urgent / L                           | high / high           | Strategic     | Highest-priority review-efficiency fix: ledger corrections should be repaired without triggering another quality review; depends on B37's event binding and B38's provenance classification.                                       |
| B06 | **BL-260712-per-project-override — Per-project override to disable configured external gates**                              | medium / M                           | medium / medium       | Fill-in       | Useful operator control with bounded scope; validate the structured-output and gate-command contract in B23 before expanding override behavior.                                                                                    |
| B07 | **BL-260713-root-agent-judgment-logging — Root-agent judgment logging responsibility for project log**                      | medium / S                           | medium / low          | Fill-in       | Low-cost clarity for who records judgments; implement alongside the B26 artifact contract rather than as a standalone logging convention.                                                                                          |
| B08 | **BL-260714-executable-backstops — Executable backstops for contract claims — authoring guidance**                          | medium / S                           | medium / low          | Fill-in       | Practical authoring improvement with independent value; pair with B33 and B34 so prose claims have executable coverage and repo-wide call-site evidence.                                                                           |
| B09 | **BL-260718-add-generated-runbook — Add generated-runbook verification command pass**                                       | medium / M                           | medium / high         | Avoid / Defer | Useful only when a concrete runbook consumer exists; do not add another generated artifact until current project and roadmap state is reconciled.                                                                                  |
| B10 | **BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command family**                                        | high / L                             | medium / high         | Avoid / Defer | A large surface with an unclear second consumer; first clarify the stable execution-program contract in B11 and the trigger for the wave lifecycle.                                                                                |
| B11 | **BL-260718-document-execution-program — Document execution-program artifact as stable OAT contract**                       | medium / M                           | low / medium          | Avoid / Defer | Documentation can help, but current demand is weaker than the scope/provider and receipt gaps; resolve whether B10 still has a live consumer before investing.                                                                     |
| B12 | **BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index cwd-relative defaults in monorepos**                  | medium / missing                     | medium / medium       | Fill-in       | A bounded docs CLI correctness fix; the missing source estimate should be normalized, then it can run independently of the larger lanes.                                                                                           |
| B13 | **BL-260718-harden-full-surface-gate — Harden full-surface gate reviews against budget and recursive dispatch**             | high / M                             | high / medium         | Strategic     | High leverage for review cost and recursion safety; make B43's headless no-yield behavior and B26's ReviewPlan constraints prerequisites.                                                                                          |
| B14 | **BL-260718-mandatory-skill-load-clause — Mandatory skill-load clause for lifecycle steps that name skills**                | high / S                             | high / low            | Quick Win     | Clear, bounded workflow-integrity improvement; start immediately and use it to reduce future runs that claim a skill was followed without loading it.                                                                              |
| B15 | **BL-260718-rewrite-worktree-bootstrap — Rewrite worktree bootstrap-group as tested TypeScript command**                    | medium / M                           | low / medium          | Avoid / Defer | A broad rewrite with no immediate relationship to the highest-risk findings; revisit after B10/B11 establish a live wave-workflow consumer.                                                                                        |
| B16 | **BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in oat docs nav sync (currently MkDocs-only)**                  | medium / missing                     | low / medium          | Avoid / Defer | The repository already has a Fumadocs docs app, but the backlog item has no estimate and its demand/contract is unclear; resolve or archive the obsolete framing before implementation.                                            |
| B17 | **BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable orchestration**                                  | medium / M                           | medium / high         | Avoid / Defer | Reusable pinned agents could help, but current provider catalog visibility is itself unreliable; wait for B44 and B55 so the new roles would be discoverable and truthful.                                                         |
| B18 | **BL-260719-evaluate-broader-final-gate — Evaluate broader final-gate freshness policy after narrow optimization**          | low / M                              | low / medium          | Avoid / Defer | Explicitly post-optimization and therefore not a current starting point; revisit after B37–B39 and B26 produce evidence about remaining freshness failures.                                                                        |
| B19 | **BL-260720-add-oat-project-complete-auto — Add oat-project-complete-auto companion skill for autonomous closeouts**        | high / M                             | high / medium         | Strategic     | Useful for autonomous closeout reliability, but it must consume the fail-closed snapshot contract in B27 and the receipt freshness evidence in B39.                                                                                |
| B20 | **BL-260724-support-provider-directory — Support provider directory symlinks as full collection sync**                      | high / M                             | high / high           | Strategic     | Directly addresses folder-level symlink preference and lower git churn; coordinate its provider directory semantics with B55 rather than implementing per-provider exceptions.                                                     |
| B21 | **BL-260725-classify-general-sync-owned — Classify general sync-owned dirt in project-start preflight**                     | low / M                              | low / high            | Avoid / Defer | Useful diagnosis but overlaps B47 and the new B55 scope model; merge its surviving cases into those items rather than maintaining a separate high-cost lane.                                                                       |
| B22 | **BL-260726-validate-cursor-pin-effort — Validate Cursor pin effort rungs at sync time**                                    | medium / S                           | medium / medium       | Fill-in       | A focused provider validation; depend on B02's model-slug evidence and keep it separate from general provider reachability.                                                                                                        |
| B23 | **BL-260726-validate-structured-output — Validate structured-output contract in gate skill commands**                       | medium / missing                     | medium / low          | Fill-in       | Small contract hardening with direct gate value; normalize the missing estimate and use it as a prerequisite for B06 and related gate automation.                                                                                  |
| B24 | **BL-260727-make-explainer-run-durability — Make explainer run durability survive ephemeral environments**                  | high / M                             | high / high           | Strategic     | Meaningful reliability work, but it is an independent protected lane; retain high priority and schedule after the currently merged asset-root fixes are reconciled.                                                                |
| B25 | **BL-260728-additional-visual-workflows — Additional visual workflows**                                                     | low / L                              | low / high            | Avoid / Defer | Demand-gated capability expansion; defer until a specific workflow and consumer justify the large effort.                                                                                                                          |
| B26 | **BL-260729-implement-reviewplan-first — Implement ReviewPlan-first reviewer workflow**                                     | high / L                             | high / high           | Strategic     | Current execution bottleneck: PR #190 is open/draft/dirty and the project state is stale; finish or explicitly re-scope before launching another broad review effort.                                                              |
| B27 | **BL-260806-fail-closed-when-configured — Fail closed when configured closeout snapshot is absent**                         | high / M                             | high / medium         | Strategic     | Important autonomous closeout safety boundary; complete before B19 and coordinate its durable snapshot with B39.                                                                                                                   |
| B28 | **BL-260817-decide-and-pin-the-system — Decide and pin the system-Chromium requirement introduced by test:skills**          | medium / S                           | medium / low          | Fill-in       | A small decision that unlocks or rejects browser CI work; resolve before B30 rather than letting browser assumptions remain implicit.                                                                                              |
| B29 | **BL-260817-drop-explainer-kit-publish — Drop explainer-kit publish-request/v1 in a future minor**                          | medium / S                           | low / medium          | Avoid / Defer | A future breaking-contract cleanup; defer to a release window with explicit consumer confirmation.                                                                                                                                 |
| B30 | **BL-260817-run-the-rc-explainer-end — Run the RC explainer end-to-end test in CI with a provisioned browser**              | medium / M                           | medium / medium       | Fill-in       | Valuable release evidence once B28 pins the browser requirement and provisioning is available; do not treat local browser availability as CI proof.                                                                                |
| B31 | **BL-260817-verify-protected-mode-public — Verify protected-mode public URLs with an authenticated end-to-end GET**         | medium / M                           | medium / high         | Avoid / Defer | High setup cost and environment dependence; trigger only when protected-mode publication is on the release path.                                                                                                                   |
| B32 | **BL-260818-distinguish-operator-directed — Distinguish operator-directed review rounds from failed fix cycles in the**     | medium / M                           | medium / medium       | Fill-in       | Improves lifecycle truthfulness and pairs naturally with B37/B38; keep scope narrow so it does not become another ReviewPlan redesign.                                                                                             |
| B33 | **BL-260818-extend-guarded-prose-contract — Extend guarded-prose contract tests to docs-app mirrors**                       | medium / S                           | medium / low          | Fill-in       | Bounded test coverage with immediate value; first remove the duplicate acceptance heading and then pair with B34.                                                                                                                  |
| B34 | **BL-260818-require-repo-wide-call-site — Require repo-wide call-site sweeps for cross-cutting options in**                 | medium / S                           | medium / low          | Fill-in       | Low-cost guard against partial option changes; useful as a reusable review/backstop rule and should align with B08 and B53.                                                                                                        |
| B35 | **BL-260819-classify-canonical-skills-by — Classify canonical skills by distribution, lifecycle, and tenant scope**         | medium / M                           | medium / high         | Avoid / Defer | Taxonomy is useful for long-term governance, but the immediate provider/scope defect needs a concrete matrix first; defer broad classification until B55 exposes the required dimensions.                                          |
| B36 | **BL-260819-repair-verified-bundled-skill — Repair verified bundled skill contract drift**                                  | medium / M                           | medium / medium       | Fill-in       | A bounded release-quality batch; verify residual drift after merged PR #226 and coordinate with B50 before opening overlapping fixes.                                                                                              |
| B37 | **BL-260820-bind-each-gate-review — Bind each gate review disposition to its exact received ledger event**                  | high / M                             | high / medium         | Strategic     | Foundational event identity for honest gate state; sequence immediately after or alongside B26 and before B38/B05.                                                                                                                 |
| B38 | **BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes for review and gate receipts**               | high / M                             | high / medium         | Strategic     | Makes provider, source, fallback, and receipt origin inspectable; depends on B37 and enables B39, B05, and B32.                                                                                                                    |
| B39 | **BL-260820-track-pr-closeout-evidence — Track PR-closeout evidence freshness against the current head**                    | high / L                             | high / high           | Strategic     | High-value closeout integrity, but it needs the event/provenance model from B37/B38; use merged PR evidence to avoid re-reviewing unchanged history.                                                                               |
| B40 | **BL-260826-decide-whether-test-only-paths — Decide whether test-only paths under packages/cli/src count as publishable**   | low / S                              | low / low             | Avoid / Defer | A useful release-policy decision but not a current critical path; resolve when a package-coverage change makes the ambiguity operational.                                                                                          |
| B41 | **BL-260826-deterministic-smoke-tier-leaks — Deterministic smoke tier leaks worktrees on interrupted runs**                 | medium / S                           | medium / low          | Fill-in       | Focused reliability fix with a clear failure mode; good independent quick maintenance once the smoke harness is available.                                                                                                         |
| B42 | **BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the dispatch-ceiling resolver**                     | low / XS                             | low / low             | Fill-in       | Small observability improvement; pair with B44 and B38 so a stamp carries meaningful native/fallback provenance rather than just another opaque field.                                                                             |
| B43 | **BL-260826-gate-targets-must-not-yield — Gate targets must not yield on background work in headless mode**                 | high / M                             | high / medium         | Strategic     | Direct headless correctness boundary; make it a prerequisite for B13 and a verification point in B26.                                                                                                                              |
| B44 | **BL-260826-populate-native-subagent — Populate native subagent runtime identity from provider transcript metadata**        | high / M                             | high / medium         | Strategic     | Addresses the current native-role/fallback ambiguity; coordinate with B55's provider visibility and preserve exact fallback provenance.                                                                                            |
| B45 | **BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps outside sync**                                   | medium / S                           | medium / low          | Fill-in       | Small integrity warning with direct operator value; merged version-skew behavior should be checked before extending it.                                                                                                            |
| B46 | **BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and config contracts**                              | medium / S                           | medium / low          | Fill-in       | Useful baseline cleanup for declared versus installed state; complete the boundary audit before B55 consumes its state model.                                                                                                      |
| B47 | **BL-260827-correct-scope-and-adoption — Correct scope and adoption diagnostics**                                           | medium / M                           | high / medium         | Strategic     | Existing diagnostic foundation, but it must expand from canonical installation to provider visibility and content-type reachability under B55.                                                                                     |
| B48 | **BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only OAT_ASSETS_DIR bundles**                    | medium / S                           | medium / low          | Fill-in       | Focused release safety fix; pair with B51 and verify that merged PR #219 did not already close the same acceptance surface.                                                                                                        |
| B49 | **BL-260827-harden-the-codex-skill-below-floor — Harden the codex-skill below-floor guard against paraphrase and anaphora** | low / XS                             | low / low             | Fill-in       | Narrow contract hardening; schedule opportunistically with the skill test lane and do not let it block provider-scope work.                                                                                                        |
| B50 | **BL-260827-make-packaged-skill-references — Make packaged skill references scope-portable**                                | medium / M                           | medium / medium       | Fill-in       | PR #226 merged this area; first verify the active item and project state against `origin/main`, then close/archive or record only residual work.                                                                                   |
| B51 | **BL-260827-override-aware-remedy-text — Override-aware remedy text in assets-root fail-closed errors**                     | low / XS                             | low / low             | Fill-in       | Small polish after B48's fail-closed behavior is settled; do not create a separate broad release lane for it.                                                                                                                      |
| B52 | **BL-260827-refresh-provider-codex-md — Refresh provider-codex.md for the ultra effort tier, the GPT-5.4**                  | medium / S                           | medium / low          | Fill-in       | Documentation/configuration refresh with bounded value; align it with the live provider reference and B55's provider matrix.                                                                                                       |
| B53 | **BL-260827-span-based-prose-guards — Span-based prose guards, anchored probe records, and a shared probe**                 | medium / S                           | medium / low          | Fill-in       | Useful contract-test infrastructure; pair with B34 and B08, but keep the probes bounded and independently diagnosable.                                                                                                             |
| B54 | **BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance prompt during init and workflow installation**  | high / M                             | high / medium         | Strategic     | Directly addresses the init/install expectation that project-level AGENTS.md guidance is missing; coordinate its notice/question behavior with B55 and preserve user choice at user scope.                                         |
| B55 | **BL-260829-make-tool-pack-scope-selection — Make tool-pack scope, provider reachability, and dispatch state truthful**     | urgent / L                           | high / high           | Strategic     | New highest-leverage product item: fix scope picker truthfulness, prefer collection symlinks until divergence, expose provider/content-type gaps, explain restart needs, and record native-role rejection versus generic fallback. |

## 5. Dependency map

The arrows below are sequencing hypotheses for implementation and reconciliation.
They are not claims that the current code enforces these dependencies.

```text
B26 ──▶ B37 ──▶ B38 ──▶ B39
 │       │       ├─ -▶ B05
 │       │       └─ -▶ B32
 ├─ - -▶ B03 ──▶ B13
 └─ - -▶ B43 ──▶ B13
B44 ──▶ B42

B46 ──▶ B47 ──▶ B55
B20 ── - - - - -▶ B55
B54 ── - - - - -▶ B55
B35 ── - - - - -▶ B55
B55 ──▶ B44

B27 ──▶ B19
B23 ──▶ B06
B02 ──▶ B22
B28 ──▶ B30
B11 ──▶ B10 ──▶ B15
B33 ──▶ B53 ──▶ B34
B48 ──▶ B51
B50 ──▶ B36
```

Key interpretation:

- B26, B37, B38, and B39 form the review-integrity spine. B05 should not
  trigger another quality round for a finding that is only a ledger repair.
- B46, B47, B20, B54, and B55 are one scope/provider adoption cluster.
  B55 is the user-visible umbrella; B47 supplies diagnostics, B20 supplies
  collection-level provider projection, B46 supplies lifecycle semantics, and
  B54 supplies project-level guidance.
- B44 and B42 are the dispatch-observability branch. A generic child with role
  instructions is a fallback, not a native managed-role success; B38 should
  carry that distinction into receipts.
- B10/B11/B15 and B28/B30 are separate trigger-gated clusters and should not
  compete with the two urgent foundations.

## 6. Parallel lanes

These are ownership-oriented lanes, not commitments. A lane can be staffed
only when its prerequisites and current consumer are clear.

### Lane A — Review, gate, lifecycle, and dispatch integrity

Contains [BL-260706-front-load-recurring-gate — Front-load recurring gate-finding
classes into implementer briefs](../items/BL-260706-front-load-recurring-gate.md),
[BL-260711-add-activity-aware-gate — Add activity-aware gate timeouts](../items/BL-260711-add-activity-aware-gate.md),
[BL-260711-add-root-owned-dispatch-broker — Add root-owned dispatch broker for
exact OAT subagent launches](../items/BL-260711-add-root-owned-dispatch-broker.md),
[BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only
review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md),
[BL-260712-per-project-override — Per-project override to disable configured
external gates](../items/BL-260712-per-project-override.md),
[BL-260713-root-agent-judgment-logging — Root-agent judgment logging
responsibility for project log](../items/BL-260713-root-agent-judgment-logging.md),
[BL-260718-harden-full-surface-gate — Harden full-surface gate reviews against
budget and recursive dispatch](../items/BL-260718-harden-full-surface-gate.md),
[BL-260718-mandatory-skill-load-clause — Mandatory skill-load clause for
lifecycle steps that name skills](../items/BL-260718-mandatory-skill-load-clause.md),
[BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable
orchestration](../items/BL-260719-add-pinned-recon-agents.md),
[BL-260719-evaluate-broader-final-gate — Evaluate broader final-gate freshness
policy after narrow optimization](../items/BL-260719-evaluate-broader-final-gate.md),
[BL-260720-add-oat-project-complete-auto — Add oat-project-complete-auto
companion skill for autonomous closeouts](../items/BL-260720-add-oat-project-complete-auto.md),
[BL-260729-implement-reviewplan-first — Implement ReviewPlan-first reviewer
workflow](../items/BL-260729-implement-reviewplan-first.md),
[BL-260806-fail-closed-when-configured — Fail closed when configured closeout
snapshot is absent](../items/BL-260806-fail-closed-when-configured.md),
[BL-260818-distinguish-operator-directed — Distinguish operator-directed review
rounds from failed fix cycles in the](../items/BL-260818-distinguish-operator-directed.md),
[BL-260820-bind-each-gate-review — Bind each gate review disposition to its
exact received ledger event](../items/BL-260820-bind-each-gate-review.md),
[BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes
for review and gate receipts](../items/BL-260820-emit-source-qualified.md),
[BL-260820-track-pr-closeout-evidence — Track PR-closeout evidence freshness
against the current head](../items/BL-260820-track-pr-closeout-evidence.md),
[BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the
dispatch-ceiling resolver](../items/BL-260826-emit-the-dispatch-stamp-from.md),
[BL-260826-gate-targets-must-not-yield — Gate targets must not yield on
background work in headless mode](../items/BL-260826-gate-targets-must-not-yield.md),
and [BL-260826-populate-native-subagent — Populate native subagent runtime
identity from provider transcript metadata](../items/BL-260826-populate-native-subagent.md).

Guardrail: finish the ReviewPlan and event identity before expanding dispatch
architecture. B14 is independently ready; B05 is strategically urgent but
should consume the event classification rather than guess at it.

### Lane B — Tool packs, providers, skills, and distribution

Contains [BL-260708-verify-cursor-gpt-5-6-subagent — Verify Cursor GPT-5.6
subagent model slugs](../items/BL-260708-verify-cursor-gpt-5-6-subagent.md),
[BL-260724-support-provider-directory — Support provider directory symlinks as
full collection sync](../items/BL-260724-support-provider-directory.md),
[BL-260725-classify-general-sync-owned — Classify general sync-owned dirt in
project-start preflight](../items/BL-260725-classify-general-sync-owned.md),
[BL-260726-validate-cursor-pin-effort — Validate Cursor pin effort rungs at
sync time](../items/BL-260726-validate-cursor-pin-effort.md),
[BL-260819-classify-canonical-skills-by — Classify canonical skills by
distribution, lifecycle, and tenant scope](../items/BL-260819-classify-canonical-skills-by.md),
[BL-260819-repair-verified-bundled-skill — Repair verified bundled skill
contract drift](../items/BL-260819-repair-verified-bundled-skill.md),
[BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps
outside sync](../items/BL-260826-warn-on-silent-oatversion.md),
[BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and
config contracts](../items/BL-260827-clean-up-tool-pack-lifecycle.md),
[BL-260827-correct-scope-and-adoption — Correct scope and adoption
diagnostics](../items/BL-260827-correct-scope-and-adoption.md),
[BL-260827-make-packaged-skill-references — Make packaged skill references
scope-portable](../items/BL-260827-make-packaged-skill-references.md),
[BL-260827-refresh-provider-codex-md — Refresh provider-codex.md for the ultra
effort tier, the GPT-5.4](../items/BL-260827-refresh-provider-codex-md.md),
[BL-260827-span-based-prose-guards — Span-based prose guards, anchored probe
records, and a shared probe](../items/BL-260827-span-based-prose-guards.md),
[BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance
prompt during init and workflow installation](../items/BL-260828-add-project-level-oat-guidance.md),
and [BL-260829-make-tool-pack-scope-selection — Make tool-pack scope, provider
reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md).

Guardrail: treat canonical installation, provider projection, provider
visibility, and dispatch eligibility as separate states. Prefer a whole
skills-directory symlink while source and destination collections are aligned;
fall back to per-file links only after a real divergence is detected and
reported.

### Lane C — Release, assets, smoke, and Explainer Kit

Contains [BL-260727-make-explainer-run-durability — Make explainer run
durability survive ephemeral environments](../items/BL-260727-make-explainer-run-durability.md),
[BL-260728-additional-visual-workflows — Additional visual workflows](../items/BL-260728-additional-visual-workflows.md),
[BL-260817-decide-and-pin-the-system — Decide and pin the system-Chromium
requirement introduced by test:skills](../items/BL-260817-decide-and-pin-the-system.md),
[BL-260817-drop-explainer-kit-publish — Drop explainer-kit
publish-request/v1 in a future minor](../items/BL-260817-drop-explainer-kit-publish.md),
[BL-260817-run-the-rc-explainer-end — Run the RC explainer end-to-end test in
CI with a provisioned browser](../items/BL-260817-run-the-rc-explainer-end.md),
[BL-260817-verify-protected-mode-public — Verify protected-mode public URLs
with an authenticated end-to-end GET](../items/BL-260817-verify-protected-mode-public.md),
[BL-260826-decide-whether-test-only-paths — Decide whether test-only paths under
packages/cli/src count as publishable](../items/BL-260826-decide-whether-test-only-paths.md),
[BL-260826-deterministic-smoke-tier-leaks — Deterministic smoke tier leaks
worktrees on interrupted runs](../items/BL-260826-deterministic-smoke-tier-leaks.md),
[BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only
OAT_ASSETS_DIR bundles](../items/BL-260827-fail-closed-on-partial-or.md),
and [BL-260827-override-aware-remedy-text — Override-aware remedy text in
assets-root fail-closed errors](../items/BL-260827-override-aware-remedy-text.md).

Guardrail: keep browser/protected-public work trigger-gated and verify merged
asset-root work before reopening duplicate scope.

### Lane D — Docs, wave authoring, and contract maintenance

Contains [BL-260714-executable-backstops — Executable backstops for contract
claims — authoring guidance](../items/BL-260714-executable-backstops.md),
[BL-260718-add-generated-runbook — Add generated-runbook verification command
pass](../items/BL-260718-add-generated-runbook.md),
[BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command
family](../items/BL-260718-add-oat-wave-lifecycle-cli.md),
[BL-260718-document-execution-program — Document execution-program artifact as
stable OAT contract](../items/BL-260718-document-execution-program.md),
[BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index
cwd-relative defaults in monorepos](../items/BL-260718-fix-oat-docs-generate-index.md),
[BL-260718-rewrite-worktree-bootstrap — Rewrite worktree bootstrap-group as
tested TypeScript command](../items/BL-260718-rewrite-worktree-bootstrap.md),
[BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in oat docs nav
sync (currently MkDocs-only)](../items/BL-260718-support-fumadocs-in-oat-docs.md),
[BL-260726-validate-structured-output — Validate structured-output contract in
gate skill commands](../items/BL-260726-validate-structured-output.md),
[BL-260818-extend-guarded-prose-contract — Extend guarded-prose contract tests
to docs-app mirrors](../items/BL-260818-extend-guarded-prose-contract.md),
[BL-260818-require-repo-wide-call-site — Require repo-wide call-site sweeps
for cross-cutting options in](../items/BL-260818-require-repo-wide-call-site.md),
and [BL-260827-harden-the-codex-skill-below — Harden the codex-skill below-floor
guard against paraphrase and anaphora](../items/BL-260827-harden-the-codex-skill-below.md).

Guardrail: normalize placeholders and duplicate headings before using these
records as machine-readable plan inputs. Keep B10/B11/B15 trigger-gated as a
cluster.

## 7. Recommended waves

These waves are a proposed order, not a silent roadmap mutation.

### Finish and reconcile first

- Finish or explicitly re-scope [BL-260729-implement-reviewplan-first —
  Implement ReviewPlan-first reviewer workflow](../items/BL-260729-implement-reviewplan-first.md)
  against PR #190.
- Reconcile merged PR #226 with [BL-260827-make-packaged-skill-references —
  Make packaged skill references scope-portable](../items/BL-260827-make-packaged-skill-references.md);
  close/archive the item if no residual acceptance work remains.
- Reconcile project states for merged PRs #217, #219, #222, and #226 before
  using them as active capacity.

### Wave 0 — Backlog hygiene and boundary checks

- Normalize the 19 placeholder acceptance sections and add estimates to
  [BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index
  cwd-relative defaults in monorepos](../items/BL-260718-fix-oat-docs-generate-index.md),
  [BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in oat docs nav
  sync (currently MkDocs-only)](../items/BL-260718-support-fumadocs-in-oat-docs.md),
  and [BL-260726-validate-structured-output — Validate structured-output
  contract in gate skill commands](../items/BL-260726-validate-structured-output.md).
- Remove the duplicate acceptance headings in [BL-260818-extend-guarded-prose
  contract — Extend guarded-prose contract tests to docs-app mirrors](../items/BL-260818-extend-guarded-prose-contract.md)
  and [BL-260818-require-repo-wide-call-site — Require repo-wide call-site
  sweeps for cross-cutting options in](../items/BL-260818-require-repo-wide-call-site.md).
- Decide whether [BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in
  oat docs nav sync (currently MkDocs-only)](../items/BL-260718-support-fumadocs-in-oat-docs.md)
  and [BL-260725-classify-general-sync-owned — Classify general sync-owned
  dirt in project-start preflight](../items/BL-260725-classify-general-sync-owned.md)
  remain standalone items or should be merged into the owning contracts.
- Remove the two closed roadmap references for [BL-260718-remove-post-W6-reviews-row
  — Remove post-W6 reviews-row restore watch](../archived/BL-260718-remove-post-w6-reviews-row.md)
  and [BL-260817-let-resolveassetsroot-honor — Let resolveAssetsRoot honor
  OAT_ASSETS_DIR and make smoke asset reads hermetic](../archived/BL-260817-let-resolveassetsroot-honor.md)
  in a separate roadmap edit.

### Wave 1 — Truthful scope and review foundations

Start [BL-260829-make-tool-pack-scope-selection — Make tool-pack scope,
provider reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md)
with the existing diagnostics and lifecycle boundaries:

- [BL-260827-correct-scope-and-adoption — Correct scope and adoption
  diagnostics](../items/BL-260827-correct-scope-and-adoption.md)
- [BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and
  config contracts](../items/BL-260827-clean-up-tool-pack-lifecycle.md)
- [BL-260724-support-provider-directory — Support provider directory symlinks
  as full collection sync](../items/BL-260724-support-provider-directory.md)
- [BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance
  prompt during init and workflow installation](../items/BL-260828-add-project-level-oat-guidance.md)

In parallel, start the bounded [BL-260718-mandatory-skill-load-clause —
Mandatory skill-load clause for lifecycle steps that name skills](../items/BL-260718-mandatory-skill-load-clause.md),
[BL-260820-bind-each-gate-review — Bind each gate review disposition to its
exact received ledger event](../items/BL-260820-bind-each-gate-review.md),
[BL-260826-gate-targets-must-not-yield — Gate targets must not yield on
background work in headless mode](../items/BL-260826-gate-targets-must-not-yield.md),
and [BL-260826-populate-native-subagent — Populate native subagent runtime
identity from provider transcript metadata](../items/BL-260826-populate-native-subagent.md)
work where capacity allows.

### Wave 2 — Receipts, no-re-review policy, and closeout

After B37 has a stable event identity, sequence [BL-260820-emit-source-qualified
— Emit source-qualified provenance envelopes for review and gate receipts](../items/BL-260820-emit-source-qualified.md),
[BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only
review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md),
[BL-260820-track-pr-closeout-evidence — Track PR-closeout evidence freshness
against the current head](../items/BL-260820-track-pr-closeout-evidence.md),
and [BL-260806-fail-closed-when-configured — Fail closed when configured
closeout snapshot is absent](../items/BL-260806-fail-closed-when-configured.md).
Then complete [BL-260720-add-oat-project-complete-auto — Add
oat-project-complete-auto companion skill for autonomous closeouts](../items/BL-260720-add-oat-project-complete-auto.md),
and apply [BL-260711-add-activity-aware-gate — Add activity-aware gate
timeouts](../items/BL-260711-add-activity-aware-gate.md) and
[BL-260718-harden-full-surface-gate — Harden full-surface gate reviews against
budget and recursive dispatch](../items/BL-260718-harden-full-surface-gate.md)
using the now-observable evidence.

### Wave 3 — Independent reliability and contract maintenance

Use spare capacity for [BL-260826-deterministic-smoke-tier-leaks —
Deterministic smoke tier leaks worktrees on interrupted runs](../items/BL-260826-deterministic-smoke-tier-leaks.md),
[BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only
OAT_ASSETS_DIR bundles](../items/BL-260827-fail-closed-on-partial-or.md),
[BL-260827-override-aware-remedy-text — Override-aware remedy text in
assets-root fail-closed errors](../items/BL-260827-override-aware-remedy-text.md),
[BL-260726-validate-structured-output — Validate structured-output contract in
gate skill commands](../items/BL-260726-validate-structured-output.md),
[BL-260708-verify-cursor-gpt-5-6-subagent — Verify Cursor GPT-5.6 subagent
model slugs](../items/BL-260708-verify-cursor-gpt-5-6-subagent.md),
[BL-260726-validate-cursor-pin-effort — Validate Cursor pin effort rungs at
sync time](../items/BL-260726-validate-cursor-pin-effort.md),
[BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the
dispatch-ceiling resolver](../items/BL-260826-emit-the-dispatch-stamp-from.md),
[BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps
outside sync](../items/BL-260826-warn-on-silent-oatversion.md),
[BL-260827-harden-the-codex-skill-below — Harden the codex-skill below-floor
guard against paraphrase and anaphora](../items/BL-260827-harden-the-codex-skill-below.md),
[BL-260827-refresh-provider-codex-md — Refresh provider-codex.md for the ultra
effort tier, the GPT-5.4](../items/BL-260827-refresh-provider-codex-md.md),
[BL-260827-span-based-prose-guards — Span-based prose guards, anchored probe
records, and a shared probe](../items/BL-260827-span-based-prose-guards.md),
[BL-260818-extend-guarded-prose-contract — Extend guarded-prose contract tests
to docs-app mirrors](../items/BL-260818-extend-guarded-prose-contract.md),
and [BL-260818-require-repo-wide-call-site — Require repo-wide call-site
sweeps for cross-cutting options in](../items/BL-260818-require-repo-wide-call-site.md).

The browser and publication sublane begins only after [BL-260817-decide-and-pin
the-system — Decide and pin the system-Chromium requirement introduced by
test:skills](../items/BL-260817-decide-and-pin-the-system.md) resolves the
system requirement; then [BL-260817-run-the-rc-explainer-end — Run the RC
explainer end-to-end test in CI with a provisioned browser](../items/BL-260817-run-the-rc-explainer-end.md)
can be considered.

### Wave 4 — Trigger-gated expansion

Keep these behind a concrete consumer, release trigger, or capacity decision:

- [BL-260711-add-root-owned-dispatch-broker — Add root-owned dispatch broker
  for exact OAT subagent launches](../items/BL-260711-add-root-owned-dispatch-broker.md)
- [BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable
  orchestration](../items/BL-260719-add-pinned-recon-agents.md)
- [BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command
  family](../items/BL-260718-add-oat-wave-lifecycle-cli.md)
- [BL-260718-document-execution-program — Document execution-program artifact
  as stable OAT contract](../items/BL-260718-document-execution-program.md)
- [BL-260718-rewrite-worktree-bootstrap — Rewrite worktree bootstrap-group as
  tested TypeScript command](../items/BL-260718-rewrite-worktree-bootstrap.md)
- [BL-260718-add-generated-runbook — Add generated-runbook verification command
  pass](../items/BL-260718-add-generated-runbook.md)
- [BL-260727-make-explainer-run-durability — Make explainer run durability
  survive ephemeral environments](../items/BL-260727-make-explainer-run-durability.md)
- [BL-260728-additional-visual-workflows — Additional visual workflows](../items/BL-260728-additional-visual-workflows.md)
- [BL-260817-drop-explainer-kit-publish — Drop explainer-kit publish-request/v1 in
  a future minor](../items/BL-260817-drop-explainer-kit-publish.md)
- [BL-260817-verify-protected-mode-public — Verify protected-mode public URLs
  with an authenticated end-to-end GET](../items/BL-260817-verify-protected-mode-public.md)
- [BL-260719-evaluate-broader-final-gate — Evaluate broader final-gate
  freshness policy after narrow optimization](../items/BL-260719-evaluate-broader-final-gate.md)
- [BL-260706-front-load-recurring-gate — Front-load recurring gate-finding
  classes into implementer briefs](../items/BL-260706-front-load-recurring-gate.md)

## 8. Roadmap alignment

This section recommends alignment; it does not edit `.oat/repo/pjm/roadmap.md`.

### Current roadmap “Now” candidates

Retain [BL-260711-add-activity-aware-gate — Add activity-aware gate
timeouts](../items/BL-260711-add-activity-aware-gate.md) as a credible active
item, but make its trigger and relationship to B26/B43 explicit. Add
[BL-260729-implement-reviewplan-first — Implement ReviewPlan-first reviewer
workflow](../items/BL-260729-implement-reviewplan-first.md) because PR #190 is
the current capacity constraint, and add [BL-260829-make-tool-pack-scope-selection
— Make tool-pack scope, provider reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md)
because the issue #228 evidence shows an active user-facing correctness gap.

### Current roadmap “Next” candidates

The existing next grouping contains [BL-260827-make-packaged-skill-references
— Make packaged skill references scope-portable](../items/BL-260827-make-packaged-skill-references.md),
[BL-260827-correct-scope-and-adoption — Correct scope and adoption
diagnostics](../items/BL-260827-correct-scope-and-adoption.md),
[BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and
config contracts](../items/BL-260827-clean-up-tool-pack-lifecycle.md),
[BL-260806-fail-closed-when-configured — Fail closed when configured closeout
snapshot is absent](../items/BL-260806-fail-closed-when-configured.md),
[BL-260718-mandatory-skill-load-clause — Mandatory skill-load clause for
lifecycle steps that name skills](../items/BL-260718-mandatory-skill-load-clause.md),
[BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command
family](../items/BL-260718-add-oat-wave-lifecycle-cli.md),
[BL-260718-document-execution-program — Document execution-program artifact as
stable OAT contract](../items/BL-260718-document-execution-program.md),
[BL-260718-rewrite-worktree-bootstrap — Rewrite worktree bootstrap-group as
tested TypeScript command](../items/BL-260718-rewrite-worktree-bootstrap.md),
[BL-260817-run-the-rc-explainer-end — Run the RC explainer end-to-end test in
CI with a provisioned browser](../items/BL-260817-run-the-rc-explainer-end.md),
[BL-260817-decide-and-pin-the-system — Decide and pin the system-Chromium
requirement introduced by test:skills](../items/BL-260817-decide-and-pin-the-system.md),
[BL-260817-drop-explainer-kit-publish — Drop explainer-kit
publish-request/v1 in a future minor](../items/BL-260817-drop-explainer-kit-publish.md),
[BL-260817-verify-protected-mode-public — Verify protected-mode public URLs
with an authenticated end-to-end GET](../items/BL-260817-verify-protected-mode-public.md),
[BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only
review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md),
and [BL-260712-per-project-override — Per-project override to disable
configured external gates](../items/BL-260712-per-project-override.md).

Promote [BL-260820-bind-each-gate-review — Bind each gate review disposition to
its exact received ledger event](../items/BL-260820-bind-each-gate-review.md),
[BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes
for review and gate receipts](../items/BL-260820-emit-source-qualified.md),
[BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance
prompt during init and workflow installation](../items/BL-260828-add-project-level-oat-guidance.md),
and [BL-260724-support-provider-directory — Support provider directory symlinks
as full collection sync](../items/BL-260724-support-provider-directory.md) into
the same next grouping if B55 is accepted as the owning umbrella.

### Current roadmap “Later” candidates

Keep [BL-260706-front-load-recurring-gate — Front-load recurring gate-finding
classes into implementer briefs](../items/BL-260706-front-load-recurring-gate.md),
[BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable
orchestration](../items/BL-260719-add-pinned-recon-agents.md), and
[BL-260728-additional-visual-workflows — Additional visual workflows](../items/BL-260728-additional-visual-workflows.md)
later until their prerequisites or consumers are real.

### Roadmap orphans

The following active records are not represented in the current roadmap and
should be added only after their lane and trigger are accepted:

- Add to the scope/provider and review-foundation groups:
  [BL-260713-root-agent-judgment-logging — Root-agent judgment logging
  responsibility for project log](../items/BL-260713-root-agent-judgment-logging.md),
  [BL-260718-harden-full-surface-gate — Harden full-surface gate reviews
  against budget and recursive dispatch](../items/BL-260718-harden-full-surface-gate.md),
  [BL-260820-track-pr-closeout-evidence — Track PR-closeout evidence freshness
  against the current head](../items/BL-260820-track-pr-closeout-evidence.md),
  [BL-260826-gate-targets-must-not-yield — Gate targets must not yield on
  background work in headless mode](../items/BL-260826-gate-targets-must-not-yield.md),
  [BL-260826-populate-native-subagent — Populate native subagent runtime
  identity from provider transcript metadata](../items/BL-260826-populate-native-subagent.md),
  [BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance
  prompt during init and workflow installation](../items/BL-260828-add-project-level-oat-guidance.md),
  and [BL-260829-make-tool-pack-scope-selection — Make tool-pack scope,
  provider reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md).
- Keep as standalone bounded maintenance:
  [BL-260726-validate-cursor-pin-effort — Validate Cursor pin effort rungs at
  sync time](../items/BL-260726-validate-cursor-pin-effort.md),
  [BL-260726-validate-structured-output — Validate structured-output contract
  in gate skill commands](../items/BL-260726-validate-structured-output.md),
  [BL-260826-deterministic-smoke-tier-leaks — Deterministic smoke tier leaks
  worktrees on interrupted runs](../items/BL-260826-deterministic-smoke-tier-leaks.md),
  [BL-260826-emit-the-dispatch-stamp-from — Emit the dispatch stamp from the
  dispatch-ceiling resolver](../items/BL-260826-emit-the-dispatch-stamp-from.md),
  [BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps
  outside sync](../items/BL-260826-warn-on-silent-oatversion.md),
  [BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only
  OAT_ASSETS_DIR bundles](../items/BL-260827-fail-closed-on-partial-or.md),
  [BL-260827-override-aware-remedy-text — Override-aware remedy text in
  assets-root fail-closed errors](../items/BL-260827-override-aware-remedy-text.md),
  and [BL-260827-span-based-prose-guards — Span-based prose guards, anchored
  probe records, and a shared probe](../items/BL-260827-span-based-prose-guards.md).
- Promote only when a consumer is confirmed:
  [BL-260711-add-root-owned-dispatch-broker — Add root-owned dispatch broker
  for exact OAT subagent launches](../items/BL-260711-add-root-owned-dispatch-broker.md),
  [BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable
  orchestration](../items/BL-260719-add-pinned-recon-agents.md),
  [BL-260819-classify-canonical-skills-by — Classify canonical skills by
  distribution, lifecycle, and tenant scope](../items/BL-260819-classify-canonical-skills-by.md),
  [BL-260727-make-explainer-run-durability — Make explainer run durability
  survive ephemeral environments](../items/BL-260727-make-explainer-run-durability.md),
  and [BL-260718-add-generated-runbook — Add generated-runbook verification
  command pass](../items/BL-260718-add-generated-runbook.md).
- Merge, rewrite, or archive after owner confirmation:
  [BL-260725-classify-general-sync-owned — Classify general sync-owned dirt in
  project-start preflight](../items/BL-260725-classify-general-sync-owned.md),
  [BL-260718-support-fumadocs-in-oat-docs — Support Fumadocs in oat docs nav
  sync (currently MkDocs-only)](../items/BL-260718-support-fumadocs-in-oat-docs.md),
  [BL-260718-fix-oat-docs-generate-index — Fix oat docs generate-index
  cwd-relative defaults in monorepos](../items/BL-260718-fix-oat-docs-generate-index.md),
  and [BL-260827-make-packaged-skill-references — Make packaged skill
  references scope-portable](../items/BL-260827-make-packaged-skill-references.md)
  after verifying PR #226.

The orphan list is intentionally not a second priority system. It records
where roadmap coverage is incomplete so the operator can decide whether to
promote, group, merge, or leave an item outside the roadmap.

## 9. Risks and sequencing constraints

1. **Declared intent can be mistaken for physical placement.** Picker labels
   must distinguish declared scope, installed scope, projected scope, and
   provider-visible scope.
2. **Provider mappings can overpromise.** A path mapping alone does not prove
   that the provider can consume every content type at that scope.
3. **Hidden managed roles create false health.** Diagnostics must report
   missing Claude roles rather than treating bundled-role exceptions as
   proof of availability.
4. **Folder-level symlinks have a real divergence boundary.** They should be
   preferred while canonical and provider collections are aligned, but sync
   must detect and explain a stray or user-owned destination entry before
   falling back to per-file links.
5. **Native-role fallback can be misreported as success.** A generic child
   supplied with the canonical role instructions is behaviorally useful but
   is not evidence that the provider accepted the requested native role.
6. **Review bookkeeping can consume the quality budget.** Ledger-only
   corrections should be repaired and recorded without launching a new review
   cycle; B37/B38/B05 must make this classification durable.
7. **Merged code and stale projects can cause duplicate implementation.**
   Reconcile PR #217, #219, #222, and #226 before dispatching their associated
   backlog projects again.
8. **Lockstep release gates remain relevant.** Any implementation that changes
   CLI behavior, bundled assets, skills, agents, templates, scripts, or docs
   must follow the repository's package-version and release-validation rules.

## 10. Quick wins and explicit deferrals

### Good independent quick wins

- [BL-260718-mandatory-skill-load-clause — Mandatory skill-load clause for
  lifecycle steps that name skills](../items/BL-260718-mandatory-skill-load-clause.md)
- [BL-260826-deterministic-smoke-tier-leaks — Deterministic smoke tier leaks
  worktrees on interrupted runs](../items/BL-260826-deterministic-smoke-tier-leaks.md)
- [BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only
  OAT_ASSETS_DIR bundles](../items/BL-260827-fail-closed-on-partial-or.md)
- [BL-260827-override-aware-remedy-text — Override-aware remedy text in
  assets-root fail-closed errors](../items/BL-260827-override-aware-remedy-text.md)
- [BL-260826-warn-on-silent-oatversion — Warn on silent oatVersion restamps
  outside sync](../items/BL-260826-warn-on-silent-oatversion.md)

These should not be allowed to displace the urgent B55 scope/provider item or
the B26/B37 review-integrity spine if capacity is constrained.

### Explicitly defer or trigger-gate

Keep [BL-260711-add-root-owned-dispatch-broker — Add root-owned dispatch broker
for exact OAT subagent launches](../items/BL-260711-add-root-owned-dispatch-broker.md),
[BL-260719-add-pinned-recon-agents — Add pinned recon agents for reusable
orchestration](../items/BL-260719-add-pinned-recon-agents.md),
[BL-260719-evaluate-broader-final-gate — Evaluate broader final-gate freshness
policy after narrow optimization](../items/BL-260719-evaluate-broader-final-gate.md),
[BL-260718-add-generated-runbook — Add generated-runbook verification command
pass](../items/BL-260718-add-generated-runbook.md),
[BL-260718-add-oat-wave-lifecycle-cli — Add oat wave lifecycle CLI command
family](../items/BL-260718-add-oat-wave-lifecycle-cli.md),
[BL-260728-additional-visual-workflows — Additional visual workflows](../items/BL-260728-additional-visual-workflows.md),
and [BL-260817-verify-protected-mode-public — Verify protected-mode public URLs
with an authenticated end-to-end GET](../items/BL-260817-verify-protected-mode-public.md)
behind a concrete consumer, trigger, or release decision.

## 11. Follow-up decisions

This review is complete and does not silently modify the companion
priority-alignment review. The next optional step is a collaborative
walkthrough of `.oat/repo/pjm/backlog/reviews/priority-alignment.md` to decide:

- whether [BL-260829-make-tool-pack-scope-selection — Make tool-pack scope,
  provider reachability, and dispatch state truthful](../items/BL-260829-make-tool-pack-scope-selection.md)
  becomes the top active implementation item after PR #190;
- whether [BL-260724-support-provider-directory — Support provider directory
  symlinks as full collection sync](../items/BL-260724-support-provider-directory.md),
  [BL-260827-correct-scope-and-adoption — Correct scope and adoption
  diagnostics](../items/BL-260827-correct-scope-and-adoption.md),
  [BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and
  config contracts](../items/BL-260827-clean-up-tool-pack-lifecycle.md), and
  [BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance
  prompt during init and workflow installation](../items/BL-260828-add-project-level-oat-guidance.md)
  should be represented as one initiative or a sequenced set;
- whether the B26/B37/B38/B05 review spine should run in parallel with B55 or
  remain strictly serialized; and
- whether any roadmap orphan should be promoted, merged, or deliberately left
  outside roadmap grouping.

Only after that walkthrough should an external implementation-plan artifact be
generated from this review.
