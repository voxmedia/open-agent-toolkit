---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-05
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-1-execution

**Started:** 2026-09-05
**Last Updated:** 2026-09-05

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)

**What shipped:**

- `oat docs generate-index` resolves its docs directory and output from `documentation.root` (app root canonical, `<root>/docs` as compatibility precedence), defaults output to the app-root manifest, never overwrites the scaffold's authored `docs/index.md` or `mkdocs.yml`, refuses unsafe outputs before writing (canonical-path containment with symlink resolution), and updates `documentation.index` only for the Fumadocs bootstrap transition; `docs init` seeds the Fumadocs index at the app root.
- `documentation.excludes` / `--exclude` prune docs-index generation with a bounded root-anchored glob grammar backed by a ReDoS-safe matcher; malformed values are repairable through `oat config set`.
- `validateAssetsBundle` fails closed on a partial or malformed bundle (seven required directories, exit 2, deterministic first offender, errno-bearing unreadable diagnosis), and every asset error remedy is source-aware (`OAT_ASSETS_DIR` failures never advise a rebuild or reinstall).

**Behavioral changes (user-facing):**

- Bare `oat docs generate-index` no longer writes a stray root `index.md` or rewrites config from the invoking directory.
- Docs-index output refusals exit 1 (actionable), unusable configuration exits 2 (repair command); previously the refusal set did not exist.
- Metadata-only or truncated asset bundles exit 2 instead of resolving as empty installations.
- New config key `documentation.excludes` (JSON array) and `oat config set|get|unset documentation.excludes`.

**Key files / modules:**

- `packages/cli/src/commands/docs/index-generate/{index,generator}.ts` (+tests) - configuration-first resolution, safety guards, exclusions
- `packages/cli/src/commands/docs/init/scaffold.ts` (+tests) - Fumadocs seed
- `packages/cli/src/fs/assets.ts` (+tests) - structural validation and source-aware remedies
- `packages/cli/src/config/oat-config.ts`, `packages/cli/src/commands/config/index.ts` (+tests) - `documentation.excludes`
- `apps/oat-docs/docs/{docs-tooling/commands,cli-utilities/configuration,reference/oat-directory-structure}.md` - contracts and grammar

**Verification performed:**

- Per lane: focused suites, `pnpm check`, `pnpm type-check`, `pnpm run check:skill-bumps`, uncached CLI suite; Codex read-only cross-model review; root-owned reviews with adversarial probes (p01 two rounds).
- Per group fan-in: full eight-gate definition-of-done sequence with an uncached test run and a config-integrity check; lockstep 0.2.55 → 0.2.56 once at the group-1 fan-in.
- Negative controls recorded for every P0 clause (pre-fix reproduction, guard neutralizations, matcher oracle and ReDoS timing, mutation controls).

**Design deltas (if any):**

- The docs-index plan's `## Current state` negative clause (never write config when `documentation.config` is set) contradicted its Outcome and step 1 for Fumadocs; the implementation follows Outcome/step 1 (Fumadocs transition keeps updating `documentation.index`), recorded as a non-narrowing reconciliation; plan amendment queued for wave-close.
- Refusal exit codes use 1 rather than the plan-unmandated 2 (reviewer ruling per `packages/cli/AGENTS.md`).
- `AssetsRootSource` is exported (declaration emit) though the plan called it internal; the `fs` barrel is unchanged.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
