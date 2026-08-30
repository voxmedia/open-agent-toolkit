# Roadmap

This file records prioritized direction and lives under `pjm/` (the operational
layer). To reduce cross-worktree conflicts, prefer adding or moving single
bullet lines over rewriting whole sections. Backlog references include the ID
and title so this map remains readable without a board lookup.

## Now (Active / Committed)

<!-- Add active work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260708-verify-cursor-gpt-5-6-subagent: Verify Cursor GPT-5.6 subagent model slugs** — Re-run structured controls after a Cursor client rollout exposes Task in headless mode or support confirms the private requests; review by 2026-08-08. Current recommended candidates remain configured but unvalidated.
- **BL-260711-add-root-owned-dispatch-broker: Add root-owned dispatch broker for exact OAT subagent launches** — Preserve phase coordination and exact target provenance without nested provider initialization or broad coordinator permissions.
- **BL-260711-add-activity-aware-gate: Add activity-aware gate timeouts** — Build adaptive idle-kill and early-artifact semantics on the shipped scope-aware hard budgets, transcript liveness evidence, and correlated timeout recovery.
- **BL-260729-implement-reviewplan-first: Implement ReviewPlan-first reviewer workflow** — Finish QA/dogfood and reconcile draft PR #190 before opening another broad review implementation lane. Project: review-plan-workflow.
- **BL-260711-skip-re-review-for-bookkeeping: Skip re-review for bookkeeping-only review findings** — Highest-priority review-efficiency safety net; repair ledger-only findings without spending another quality-review cycle. Project: review-gate-integrity.
- **BL-260829-unified-agent-provider-root: Unified AGENT_PROVIDER_ROOT binding for portable skill and agent references** — Implementation and all repository/review gates are complete on the project branch; keep active until merge, then archive the backlog item. Project: agent-provider-root.

## Next (Planned)

<!-- Add planned work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260829-make-tool-pack-scope-selection: Make tool-pack scope, provider reachability, and dispatch state truthful** — Implement the urgent state/provider contract after the agent-root design boundary is agreed; include provider × scope × content-type reachability, folder-level symlink preference, AGENTS.md guidance, restart notices, and fallback provenance. Project: tool-pack-scope-provider-truthfulness.
- **BL-260827-correct-scope-and-adoption: Correct scope and adoption diagnostics** — Align PJM migration eligibility, provider-aware user-agent materialization, shared-owner attribution, and failure rendering as a bounded diagnostic slice of the scope/provider project. Project: scope-adoption-diagnostics.
- **BL-260827-clean-up-tool-pack-lifecycle: Clean up tool-pack lifecycle and config contracts** — Add content-accurate inventory, explicit adoption reporting, supported config state, and corrected per-pack CLI help. Project: tool-pack-lifecycle-config-cleanup.
- **BL-260724-support-provider-directory: Support provider directory symlinks as full collection sync** — Prefer collection-level links until real divergence, then fall back safely to per-entry sync. Project: tool-pack-scope-provider-truthfulness.
- **BL-260828-add-project-level-oat-guidance: Add project-level OAT guidance prompt during init and workflow installation** — Add the explicit project-adoption prompt and managed AGENTS.md section without coupling it to user-scope pack placement. Project: tool-pack-scope-provider-truthfulness.
- **BL-260829-order-phase-bookkeeping-before: Order phase bookkeeping before per-phase review dispatch** — Prevent stale implementation/state ledgers from generating repeat Important findings before review dispatch. Project: review-gate-integrity.
- **BL-260806-fail-closed-when-configured: Fail closed when configured closeout snapshot is absent** — Persist the normalized closeout sequence before child dispatch and prevent terminal completion until every configured child is durably recorded.
- **BL-260820-bind-each-gate-review: Bind each gate review disposition to its exact received ledger event** — Establish event identity before provenance and no-re-review behavior. Project: review-gate-integrity.
- **BL-260820-emit-source-qualified: Emit source-qualified provenance envelopes for review and gate receipts** — Make review, gate, and fallback outcomes auditable after event identity is stable. Project: review-gate-integrity.
- **BL-260718-mandatory-skill-load-clause: Mandatory skill-load clause for lifecycle steps that name skills** — High-priority workflow-integrity fix: lifecycle text naming a skill as a step must require loading it; evidence from the wave-skills-promotion closeout. Project: wave-skills-promotion follow-up.
- **Wave-workflow follow-ups (grouped)** — **BL-260718-add-oat-wave-lifecycle-cli** + **BL-260718-document-execution-program** (CLI family + stable artifact contract, trigger: second consumer / post-W6 prioritization); **BL-260718-rewrite-worktree-bootstrap** (tested TS bootstrap-group); **BL-260718-remove-post-w6-reviews-row** (closes on stoa W6 observation). Project: wave-skills-promotion.
- **Explainer publication-hardening follow-ups (grouped)** — **BL-260817-let-resolveassetsroot-honor** (reader-side `OAT_ASSETS_DIR`, closes the residual smoke race); **BL-260817-run-the-rc-explainer-end** + **BL-260817-decide-and-pin-the-system** (CI browser provisioning decisions); **BL-260817-drop-explainer-kit-publish** (remove `publish-request/v1` in a future minor); **BL-260817-verify-protected-mode-public** (authenticated end-to-end URL verification for protected mode). Project: explainer-improvements-v2.
- **BL-260711-skip-re-review-for-bookkeeping: Skip re-review for bookkeeping-only review findings** — Avoid redundant reviewer dispatch after narrowly classified, deterministically validated bookkeeping fixes across direct/subagent and gate-originated review flows.
- **BL-260712-per-project-override: Per-project override to disable configured external gates** — Skip configured gates for one project without mutating shared user configuration.

## Later (Directional Intent)

<!-- Add directional work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260706-front-load-recurring-gate: Front-load recurring gate-finding classes into implementer briefs** — Reduce repeated review/fix loops by carrying stable gate expectations into implementation prompts.
- **BL-260719-add-pinned-recon-agents: Add pinned recon agents for reusable orchestration** — Define provider-neutral, read-only pinned recon roles that dispatch by task-class floor across review and non-review workflows without recursively reusing full reviewers.
- **BL-260728-additional-visual-workflows: Additional visual workflows** — Evaluate diff review, plan review, fact-check, dashboard, complex table, and richer composition workflows now that golden unattended recap quality is restored.

## Sequencing map (2026-08-29)

This is the current execution model after PR #231 merged. It separates project
boundaries from implementation order: discovery and design can overlap, while
shared skill, ratchet, and review-artifact files should not be changed by
parallel implementation lanes.

### Recommended sequence

1. Finish/dogfood **BL-260729-implement-reviewplan-first** (Implement
   ReviewPlan-first reviewer workflow) and reconcile PR #190 with current main.
2. Merge **BL-260829-unified-agent-provider-root** (Unified AGENT_PROVIDER_ROOT
   binding for portable skill and agent references) after final HiLL and PR
   review; its implementation and repository gates are complete.
3. Let
   **BL-260829-make-tool-pack-scope-selection** (Make tool-pack scope, provider
   reachability, and dispatch state truthful) consume that contract for
   canonical fallback provenance. The scope/provider project may continue
   discovery/design while the root project is in design, but implementation
   should coordinate through the shared agent/ratchet surfaces.
4. Within the review/gate lane, implement **BL-260829-order-phase-bookkeeping-before**
   (Order phase bookkeeping before per-phase review dispatch) before
   **BL-260711-skip-re-review-for-bookkeeping** (Skip re-review for
   bookkeeping-only review findings). The former prevents avoidable findings;
   the latter remains the highest-priority safety net for unavoidable ledger
   repairs and other lifecycle-only findings.
5. After the scope/provider state model is stable, run
   **BL-260724-support-provider-directory** (Support provider directory
   symlinks as full collection sync) and **BL-260828-add-project-level-oat-guidance**
   (Add project-level OAT guidance prompt during init and workflow installation)
   as parallel subtracks where file ownership permits.
6. After ReviewPlan/event identity, sequence
   **BL-260820-emit-source-qualified** (Emit source-qualified provenance
   envelopes for review and gate receipts), then
   **BL-260820-track-pr-closeout-evidence** (Track PR-closeout evidence
   freshness against the current head) and
   **BL-260806-fail-closed-when-configured** (Fail closed when configured
   closeout snapshot is absent). Only then advance the autonomous-completion
   and broader gate-expansion work.

### Visual dependency tree

```mermaid
flowchart TD
  RP["review-plan-workflow\nBL-260729"] --> EI["exact review-event identity\nBL-260820-bind-each-gate-review"]
  EI --> PE["receipt provenance\nBL-260820-emit-source-qualified"]
  PE --> CF["closeout freshness / fail-closed\nBL-260820-track-pr-closeout-evidence + BL-260806"]
  PB["prevent stale phase bookkeeping\nBL-260829-order-phase-bookkeeping-before"] --> NR["no re-review for bookkeeping\nBL-260711-skip-re-review-for-bookkeeping"]
  EI --> NR
  AR["agent-provider-root\nBL-260829-unified-agent-provider-root"] -. "canonical fallback contract" .-> SP["scope/provider truthfulness\nBL-260829-make-tool-pack-scope-selection"]
  SP --> SY["collection symlink adoption\nBL-260724-support-provider-directory"]
  SP --> AG["project OAT guidance\nBL-260828-add-project-level-oat-guidance"]
  RP -. "shared review surfaces" .-> HG["headless no-yield + structured output\nquick projects"]
  CF --> AC["autonomous completion\nBL-260720-add-oat-project-complete-auto"]
```

Legend: **BL-260729** is **BL-260729-implement-reviewplan-first — Implement
ReviewPlan-first reviewer workflow**; **BL-260820-bind-each-gate-review** is
**Bind each gate review disposition to its exact received ledger event**;
**BL-260820-emit-source-qualified** is **Emit source-qualified provenance
envelopes for review and gate receipts**; **BL-260820-track-pr-closeout-evidence**
is **Track PR-closeout evidence freshness against the current head**;
**BL-260806** is **BL-260806-fail-closed-when-configured — Fail closed when
configured closeout snapshot is absent**; **BL-260829-order-phase-bookkeeping-before**
is **Order phase bookkeeping before per-phase review dispatch**; **BL-260711**
is **BL-260711-skip-re-review-for-bookkeeping — Skip re-review for
bookkeeping-only review findings**; **BL-260829-unified-agent-provider-root** is
**Unified AGENT_PROVIDER_ROOT binding for portable skill and agent references**;
**BL-260829-make-tool-pack-scope-selection** is **Make tool-pack scope,
provider reachability, and dispatch state truthful**; **BL-260724** is **BL-260724-support-provider-directory — Support provider directory symlinks as full collection sync**; **BL-260828** is **BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance prompt during init and workflow installation**; and **BL-260720** is **BL-260720-add-oat-project-complete-auto — Add oat-project-complete-auto companion skill for autonomous closeouts**.

## Project grouping and workflow modes (2026-08-29)

This is a current planning view of the OAT reliability and distribution cluster,
not an exhaustive project catalog. Revalidate the grouping, ownership, and mode
recommendations after PR #190 is reconciled, the PR #231 follow-up design is
reviewed, and the first implementation plans are written. A solid edge below
means primary backlog ownership. A dashed edge means a supporting relationship
or shared surface; it does not transfer ownership.

| Project                                 | Current / recommended mode                                          | Primary backlog items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Why this mode and boundary                                                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-provider-root`                   | **Spec-driven** (promoted)                                          | **BL-260829-unified-agent-provider-root — Unified AGENT_PROVIDER_ROOT binding for portable skill and agent references**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Architectural contract spanning skill-to-agent references, dependency binding, loaded-tier eligibility, and ratchet tests. It must settle the canonical root representation before the provider/materialization project consumes it.                                          |
| `tool-pack-scope-provider-truthfulness` | **Spec-driven**                                                     | **BL-260829-make-tool-pack-scope-selection — Make tool-pack scope, provider reachability, and dispatch state truthful**; **BL-260724-support-provider-directory — Support provider directory symlinks as full collection sync**; **BL-260826-populate-native-subagent — Populate native subagent runtime identity from provider transcript metadata**; **BL-260828-add-project-level-oat-guidance — Add project-level OAT guidance prompt during init and workflow installation**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cross-cutting scope/provider/content-type state, collection symlink adoption, AGENTS.md behavior, restart visibility, picker truthfulness, and fallback provenance. The umbrella owns integration; diagnostics and lifecycle cleanup remain separate bounded projects.        |
| `scope-adoption-diagnostics`            | **Quick start** (existing)                                          | **BL-260827-correct-scope-and-adoption — Correct scope and adoption diagnostics**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A bounded diagnostic slice with a complete quick-workflow plan. It feeds the scope/provider state model but should not absorb provider materialization or agent-root implementation.                                                                                          |
| `tool-pack-lifecycle-config-cleanup`    | **Quick start** (existing)                                          | **BL-260827-clean-up-tool-pack-lifecycle — Clean up tool-pack lifecycle and config contracts**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | A bounded inventory/config-contract cleanup with an existing plan. Keep it separate so lifecycle semantics can be corrected without reopening the larger provider matrix.                                                                                                     |
| `review-plan-workflow`                  | **Spec-driven recommended; currently quick-origin and in progress** | **BL-260729-implement-reviewplan-first — Implement ReviewPlan-first reviewer workflow**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The implementation is already tied to PR #190, so do not reset it midstream. Its cross-cutting review artifact and dispatch contract merits spec-driven treatment if it is resumed as a new project or promoted at a safe reconciliation boundary.                            |
| `review-gate-integrity`                 | **Spec-driven**                                                     | **BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings**; **BL-260829-order-phase-bookkeeping-before — Order phase bookkeeping before per-phase review dispatch**; **BL-260820-bind-each-gate-review — Bind each gate review disposition to its exact received ledger event**; **BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes for review and gate receipts**; **BL-260820-track-pr-closeout-evidence — Track PR-closeout evidence freshness against the current head**; **BL-260806-fail-closed-when-configured — Fail closed when configured closeout snapshot is absent**; **BL-260718-harden-full-surface-gate — Harden full-surface gate reviews against budget and recursive dispatch**; **BL-260711-add-activity-aware-gate — Add activity-aware gate timeouts**; **BL-260720-add-oat-project-complete-auto — Add oat-project-complete-auto companion skill for autonomous closeouts** | These items share review ledgers, lifecycle state, provenance, closeout freshness, dispatch budgets, and gate policy. They should be designed as one integrity model, with bookkeeping-before-review and exact event identity ordered ahead of no-re-review and receipt work. |
| `gate-headless-no-yield`                | **Quick start**                                                     | **BL-260826-gate-targets-must-not-yield — Gate targets must not yield on background work in headless mode**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | An isolated headless execution contract with a narrow acceptance surface. It supports the review projects but does not need their full lifecycle redesign.                                                                                                                    |
| `gate-structured-output-contract`       | **Quick start**                                                     | **BL-260726-validate-structured-output — Validate structured-output contract in gate skill commands**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | A small command/validation contract. Normalize its missing estimate, then execute independently while preserving its supporting relationship to gate and ReviewPlan work.                                                                                                     |

### Grouping tree

```mermaid
flowchart TD
  ROOT["OAT reliability and distribution cluster"]

  ROOT --> AR["agent-provider-root\nSPEC-DRIVEN"]
  AR --> B56["BL-260829-unified-agent-provider-root"]

  ROOT --> SP["tool-pack-scope-provider-truthfulness\nSPEC-DRIVEN"]
  SP --> B55["BL-260829-make-tool-pack-scope-selection"]
  SP --> B20["BL-260724-support-provider-directory"]
  SP --> B44["BL-260826-populate-native-subagent"]
  SP --> B54["BL-260828-add-project-level-oat-guidance"]
  AR -. "canonical reference contract" .-> SP

  SP -. "bounded diagnostic input" .-> SAD["scope-adoption-diagnostics\nQUICK START"]
  SAD --> B47["BL-260827-correct-scope-and-adoption"]
  SP -. "bounded lifecycle input" .-> TLC["tool-pack-lifecycle-config-cleanup\nQUICK START"]
  TLC --> B46["BL-260827-clean-up-tool-pack-lifecycle"]

  ROOT --> RP["review-plan-workflow\nSPEC-DRIVEN RECOMMENDED\nquick-origin in progress"]
  RP --> B26["BL-260729-implement-reviewplan-first"]

  ROOT --> RG["review-gate-integrity\nSPEC-DRIVEN"]
  RG --> B57["BL-260829-order-phase-bookkeeping-before"]
  RG --> B37["BL-260820-bind-each-gate-review"]
  RG --> B38["BL-260820-emit-source-qualified"]
  RG --> B05["BL-260711-skip-re-review-for-bookkeeping"]
  RG --> B39["BL-260820-track-pr-closeout-evidence"]
  RG --> B27["BL-260806-fail-closed-when-configured"]
  RG --> B13["BL-260718-harden-full-surface-gate"]
  RG --> B03["BL-260711-add-activity-aware-gate"]
  RG --> B19["BL-260720-add-oat-project-complete-auto"]
  RP -. "shared review surfaces" .-> RG

  RG -. "supporting standalone contract" .-> HY["gate-headless-no-yield\nQUICK START"]
  HY --> B43["BL-260826-gate-targets-must-not-yield"]
  RG -. "supporting standalone contract" .-> SO["gate-structured-output-contract\nQUICK START"]
  SO --> B23["BL-260726-validate-structured-output"]
```

The intended implementation shape is therefore four substantial tracks plus
four bounded companions: (1) the agent-root contract, (2) the scope/provider
truth umbrella, (3) the review-plan workflow, and (4) review/gate integrity;
the diagnostics, lifecycle-cleanup, headless, and structured-output projects
are the bounded companions. The first two substantial tracks are sequential at
implementation time but can overlap during discovery/design; the bounded
companions can proceed in parallel when they do not touch shared artifacts.
