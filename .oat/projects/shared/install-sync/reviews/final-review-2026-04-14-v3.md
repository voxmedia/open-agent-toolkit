---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync
---

# Code Review: final (re-review, narrowed to p03-t01 fix)

**Reviewed:** 2026-04-14
**Scope:** Re-review of the `p03-t01` review-fix commit `7f0dbac7` against the Important finding from `reviews/final-review-2026-04-14-v2.md`.
**Files reviewed:** 2
**Commits:** 1 (`7f0dbac7^..7f0dbac7`)

## Summary

The `p03-t01` fix does not close the Important finding from the v2 review. The new no-op guard only triggers when `existingConfigContent === null`; the exact variant the prior review called out — existing user `.codex/config.toml` plus a skills-only canonical scope with zero desired Codex roles — still flows through to `mergeCodexConfig` and produces an `update` operation that scaffolds `agents = { }` and `[features].multi_agent = true` into the user's existing config. Direct reproduction in this review session confirms the bug. The new regression test covers only the null-config case and therefore passes with a partial fix.

No regression to the existing unrelated-managed-roles partial-sync behavior was observed, and the rest of the targeted suite is green. Because scope is `final`, the deferred findings ledger is explicitly trivially empty (0 Medium, 0 Minor carried forward).

**Verdict:** fail (blocker open).

## Findings

### Critical

None.

### Important

- **Skills-only partial sync still mutates an existing user Codex config** (`packages/cli/src/providers/codex/codec/sync-extension.ts:215`)
  - Issue: The new guard added in `7f0dbac7` is gated on `isPartialSync && desiredRoles.length === 0 && existingConfigContent === null`. When the user already has a `.codex/config.toml` and the install-triggered scope yields zero Codex-managed roles (for example `oat tools install docs` whose scope only contains skills), execution still falls through to `mergeCodexConfig` at `packages/cli/src/providers/codex/codec/sync-extension.ts:287`. `mergeCodexConfig` at `packages/cli/src/providers/codex/codec/config-merge.ts:64` unconditionally sets `features.multi_agent = true` and normalizes an `agents` table even when `desiredRoles` is empty and no stale managed roles exist, so the planner emits an `update` op that rewrites the user's existing config. Direct reproduction: seeding `.codex/config.toml` with only `model = "gpt-5"` and calling `computeCodexProjectExtensionPlan(root, [], ['.agents/skills/oat-docs-analyze'])` returned one `update` operation for `.codex/config.toml` with `managedRoles: []` and content `model = "gpt-5"\nagents = { }\n\n[features]\nmulti_agent = true\n`. This is exactly the failure mode v2 called out.
  - Fix: Extend the guard to cover the existing-config case with no reconcilable managed state. Concretely, treat partial sync as a no-op when `isPartialSync && desiredRoles.length === 0` and either (a) there is no existing config, or (b) the existing config has no OAT-managed agent entries that `collectStaleManagedRoles` would reconcile. One simple shape: when `isPartialSync && desiredRoles.length === 0`, run a lightweight "managed-state present?" probe against `existingConfigContent` (reuse `parseConfigAgentTable` plus `isOatManagedCodexRoleFile`) and return the empty-plan no-op when no managed state would be reconciled. This preserves the existing "unrelated managed roles stay untouched" rule while stopping zero-role partial syncs from forcing `multi_agent = true` or synthesizing an `agents` table into the user's config.
  - Regression: Update `sync-extension.test.ts` with a case that seeds `.codex/config.toml` containing a non-managed key (for example `model = "gpt-5"`), calls `computeCodexProjectExtensionPlan(root, [], ['.agents/skills/<some-skill>'])`, and asserts `operations` is empty (or all `skip`) and the on-disk config is not rewritten. The current test `is a no-op for partial sync scopes with no codex-managed agent content` only exercises the null-config path and would still pass under a partial fix.
  - Requirement: Discovery success criteria "`.codex/config.toml` does not gain unrelated agents during docs-pack install" and Key Decision 2 "Install-triggered Codex extension updates must also respect the same canonical path scope".

### Medium

None.

### Minor

None.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `reviews/final-review-2026-04-14-v2.md`, and the `7f0dbac7` diff. Quick-mode project; `spec.md` and `design.md` are not required for this mode.

### Requirements Coverage

| Requirement                                                                                             | Status      | Notes                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Install-triggered sync only mutates provider artifacts for canonical paths explicitly passed by install | partial     | Planner-level scoping is solid; the Codex extension planner still scaffolds `agents = { }` / `features.multi_agent = true` for zero-role partial sync when a user config already exists.                                       |
| Running `oat tools install docs` only syncs docs-pack canonical content                                 | partial     | Provider-view planning is scoped; Codex config planning still has the existing-config zero-role gap.                                                                                                                           |
| Unrelated provider views are not added during install-triggered auto-sync                               | implemented | `computeSyncPlan` scoping verified by existing tests; no regression observed.                                                                                                                                                  |
| `.codex/config.toml` does not gain unrelated content during docs-pack install                           | partial     | Fresh-config zero-role scoping is fixed. Existing-config zero-role scoping still writes managed-state scaffolding.                                                                                                             |
| Regression tests fail before the fix and pass after                                                     | partial     | New test covers the null-config case only. A test for the existing-config + zero-role variant is missing, and the v2 review explicitly asked for one.                                                                          |
| Release validation for shipped CLI behavior                                                             | implemented | Not re-run in this narrowed re-review; v2 review recorded `pnpm release:validate` green for the 5 lockstep packages at `0.0.37`. No package files changed in `7f0dbac7`, so the release contract is unaffected by this commit. |

### Extra Work (not in declared requirements)

None. The commit is a narrow two-file change scoped to the Codex extension planner and its tests.

### Deferred Findings Ledger Disposition (final scope)

- Carried-forward Medium: 0 — nothing to disposition.
- Carried-forward Minor: 0 — nothing to disposition.
- Source: `implementation.md` "Review Received: final" note ("No Medium or Minor findings were deferred in this review-receive run.").

## Verification Commands

Commands actually run in this re-review:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/engine/compute-plan.test.ts
```

Result: 4 files, 37 tests passed. These tests do not exercise the existing-config zero-role variant, so passing does not disprove the remaining gap.

Direct reproduction used to confirm the gap:

```bash
pnpm --filter @open-agent-toolkit/cli run build
node - <<'EOF'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeCodexProjectExtensionPlan } from './packages/cli/dist/providers/codex/codec/sync-extension.js';

const root = await mkdtemp(join(tmpdir(), 'oat-repro-'));
await mkdir(join(root, '.codex'), { recursive: true });
await writeFile(join(root, '.codex', 'config.toml'), 'model = "gpt-5"\n', 'utf8');

const plan = await computeCodexProjectExtensionPlan(
  root,
  [],
  ['.agents/skills/oat-docs-analyze'],
);
console.log(JSON.stringify(plan, null, 2));
EOF
```

Observed output: one `update` operation on `.codex/config.toml` with content `model = "gpt-5"\nagents = { }\n\n[features]\nmulti_agent = true\n` and `managedRoles: []`.

Commands intentionally not run in this narrowed re-review:

- `pnpm release:validate` — no package/version/bundled-asset files changed in `7f0dbac7`, and v2 already recorded this green. Re-running is optional per scope description and would not change the verdict for the open finding.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the remaining Important finding into a review-fix task. Keep the fix scoped to `computeCodexProjectExtensionPlan` so the existing unrelated-managed-roles preservation behavior is unchanged.
