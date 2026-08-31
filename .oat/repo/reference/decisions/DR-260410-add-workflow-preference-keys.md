---
id: DR-260410-add-workflow-preference-keys
title: Add `workflow.*` preference keys with 3-layer resolution and
  per-repo-vs-personal surface guidance
date: 2026-04-10
status: accepted
legacy_id: ADR-016
---

### ADR-016: Add `workflow.*` preference keys with 3-layer resolution and per-repo-vs-personal surface guidance

- **Date:** 2026-04-10
- **Status:** accepted
- **Drivers:** Reduce friction for power users who always make the same choices in repetitive workflow prompts. Eat the dogfood: validate that the `resolveEffectiveConfig()` infrastructure from ADR-015 composes cleanly with new per-key preferences. Close the cross-agent bookkeeping drift gap discovered during discovery.
- **Related:**
  - `.oat/projects/shared/workflow-friction/`
  - `packages/cli/src/config/oat-config.ts` (`OatWorkflowConfig` type)
  - `packages/cli/src/config/resolve.ts` (reused; `DEFAULT_WORKFLOW_CONFIG` added)
  - `packages/cli/src/commands/config/index.ts` (`getConfigValue()` refactor, `--shared`/`--local`/`--user` flags)
  - `apps/oat-docs/docs/cli-utilities/configuration.md` (Workflow preferences section + Choosing the right surface subsection)
  - `bl-af93` (follow-up: `oat config unset` command)

#### Context

Several workflow skills ask repetitive confirmation questions that power users almost always answer the same way: HiLL checkpoint behavior, archive on complete, open a PR on complete, post-implementation chaining sequence, final review execution model, and re-review scope narrowing. Each interactive prompt is cheap individually but accumulates into significant workflow friction, especially in long sessions or when chaining multiple projects.

Meanwhile, the control-plane project (ADR-015) introduced `resolveEffectiveConfig()` — a generic 3-layer resolution utility that already reads from `.oat/config.local.json`, `.oat/config.json`, and `~/.oat/config.json` with per-key source attribution. We had a clean place to plug new preference keys without building parallel resolution machinery.

Separately, during discovery we surfaced a drift gap: `oat-project-review-receive` and `oat-project-review-receive-remote` were modifying `plan.md`, `implementation.md`, and `state.md` but had no required commit step. When a subagent ran a receive skill in isolation, it left the original agent's checkout dirty on return — the primary cause of cross-agent state drift.

#### Options Considered

1. **One-off hardcoded keys per skill.** Each skill adds its own config read and its own key. Fast but fragmented; no shared schema; hard to document; no reuse of resolution infrastructure.
2. **Dedicated `workflow.*` namespace with generic resolution.** Add a typed `OatWorkflowConfig` to `OatConfig`/`OatLocalConfig`/`UserConfig`, register the keys in the existing CLI catalog, and plug into `resolveEffectiveConfig()`. Every key benefits from 3-layer precedence automatically. (Chosen.)
3. **Per-project overrides only (via `plan.md` frontmatter).** Considered but deferred; covers the same need only within a project scope and doesn't help cross-project power users who want a single durable default.

We chose option 2 because it composes cleanly with ADR-015, leverages existing CLI infrastructure, and scales to additional preferences without special-casing each one.

#### Decision

1. **Introduce `workflow.*` as a dedicated preference namespace** with six keys shipped in this project: `hillCheckpointDefault`, `archiveOnComplete`, `createPrOnComplete`, `postImplementSequence`, `reviewExecutionModel`, `autoNarrowReReviewScope`. Later dogfooding moved the checkpoint lifecycle review preference into the same namespace as `autoReviewAtHillCheckpoints`, with legacy fallback from top-level `autoReviewAtCheckpoints`.

2. **Refactor `getConfigValue()` to delegate to `resolveEffectiveConfig()`** for all keys, not just workflow keys. This deletes ~150 lines of duplicated per-key if-else resolution and gives every existing key the 3-layer precedence model. Source labels change from `config.json`/`config.local.json` to `shared`/`local`/`user` for consistency with `oat config dump`.

3. **Add `--shared`/`--local`/`--user` surface flags to `oat config set`** with per-key restrictions: structural keys remain shared-only; state keys remain local-only except `activeIdea` which also accepts user; workflow keys accept all three surfaces. Top-level `autoReviewAtCheckpoints` is retained only as a compatibility fallback for `workflow.autoReviewAtHillCheckpoints`.

4. **Establish a "correct surface" rule for workflow preferences:** if a preference's correctness depends on other per-repo settings (e.g., `postImplementSequence: docs-pr` depends on `documentation.requireForProjectCompletion`), the preference belongs at shared scope. Pure personal preferences (e.g., `hillCheckpointDefault` for interruption tolerance) belong at user scope. Document this explicitly in the configuration guide so other users don't hit the cross-repo foot-gun.

5. **Fix the cross-agent drift root cause** by adding required bookkeeping commit steps to `oat-project-review-receive` (new Step 7.6) and `oat-project-review-receive-remote` (new Step 6.5). These commits are CRITICAL / DO NOT SKIP, scoped to the project's tracking files and `reviews/` directory, and handle the Step 7.5 archive move so the worktree isn't left dirty. `oat-project-implement` gets matching CRITICAL callouts on all four of its existing bookkeeping commit points.

6. **Drop `workflow.createPrOnComplete` from the repo's own configuration** after a dogfood-driven discovery: the `oat_pr_status: open` short-circuit in `oat-project-complete` makes the key a no-op in the normal flow, and setting it at user level creates a cross-repo foot-gun. Keep the key in the schema (so users can opt into it for specific edge cases) but don't set it at the OAT repo level. Document the redundancy and the foot-gun in the "Choosing the right surface" subsection.

#### Consequences

- Positive:
  - Power users can set their preferences once and run a full project lifecycle without any interactive prompts.
  - The getConfigValue refactor removes significant duplicated code and aligns source labels with `oat config dump`.
  - Cross-agent bookkeeping drift is closed at the root cause, not worked around with a preference (`workflow.autoFixBookkeepingDrift` was dropped from the plan precisely because fixing the drift source made it redundant).
  - Establishes a reusable pattern: "skill reads preference, falls through to prompt if unset" is the template for any future workflow preference keys.
- Trade-offs:
  - Source label rename in `oat config get --json` / `oat config list` is a minor user-facing breaking change for scripts that parse the `source` field. Documented in the configuration guide's Source labels subsection and in the p01-t03 commit message.
  - Workflow preference correctness depends on per-repo settings in several cases, which creates a surface-selection trap. Mitigated by the "Choosing the right surface" documentation but still requires user judgment.
  - No `oat config unset` command yet — tracked as `bl-af93`. Until shipped, users who want to change their mind on a preference value must hand-edit JSON or set a new value (which doesn't work for enum unsetting).

---
