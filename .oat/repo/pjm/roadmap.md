# Roadmap

This file records prioritized direction and lives under `pjm/` (the operational
layer). To reduce cross-worktree conflicts, prefer adding or moving single
bullet lines over rewriting whole sections, and reference backlog records by ID
(`BL-YYMMDD-slug`) rather than restating their detail here.

## Now (Active / Committed)

<!-- Add active work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260708-verify-cursor-gpt-5-6-subagent: Verify Cursor GPT-5.6 subagent model slugs** — Re-run structured controls after a Cursor client rollout exposes Task in headless mode or support confirms the private requests; review by 2026-08-08. Current recommended candidates remain configured but unvalidated.
- **BL-260711-add-root-owned-dispatch-broker: Add root-owned dispatch broker for exact OAT subagent launches** — Preserve phase coordination and exact target provenance without nested provider initialization or broad coordinator permissions.
- **BL-260711-add-activity-aware-gate: Add activity-aware gate timeouts** — Build adaptive idle-kill and early-artifact semantics on the shipped scope-aware hard budgets, transcript liveness evidence, and correlated timeout recovery.

## Next (Planned)

<!-- Add planned work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260827-make-packaged-skill-references: Make packaged skill references portable** — Replace bare sibling-skill paths with packaged resolution and strengthen the ratchet. Project: portable-skill-references.
- **BL-260827-correct-scope-and-adoption: Correct scope and adoption diagnostics** — Align PJM migration eligibility, provider-aware user-agent materialization, shared-owner attribution, and failure rendering. Project: scope-adoption-diagnostics.
- **BL-260827-clean-up-tool-pack-lifecycle: Clean up tool-pack lifecycle and config contracts** — Add content-accurate inventory, explicit adoption reporting, supported config state, and corrected per-pack CLI help. Project: tool-pack-lifecycle-config-cleanup.
- **BL-260806-fail-closed-when-configured: Fail closed when configured closeout snapshot is absent** — Persist the normalized closeout sequence before child dispatch and prevent terminal completion until every configured child is durably recorded.
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
