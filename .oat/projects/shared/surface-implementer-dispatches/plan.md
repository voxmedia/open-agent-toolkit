---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: surface-implementer-dispatches

> Execute this plan using `oat-project-implement`.

**Goal:** Warn when managed-capped implementation/fix dispatch skips exact
candidate selection, persist classification in Dispatch Report V1, and disclose
terminal reviewer access/retention constraints.

**Architecture:** Extend the existing resolver after selection with additive
classification and structured notices. Preserve selection behavior, resolution
status, exit codes, and compatibility stamps.

**Tech Stack:** TypeScript ESM, Commander CLI, Vitest, OAT skill/docs Markdown.

**Commit Convention:** `{type}({scope}): {description}`

## Planning Checklist

- [x] Lightweight design approved
- [x] Evaluated phase-level parallelism
- [x] Stable task IDs assigned
- [ ] Plan artifact review passed
- [ ] Dispatch policy and optional phase gate resolved

## Parallelism

The plan is sequential. Phase 1 establishes Dispatch Report and resolver
contracts. Phase 2 reuses those types and touches the same resolver while adding
disclosures. Phase 3 packages and archives the completed work. Parallel
worktrees would overlap core files or run release/closeout before behavior is
final.

---

## Phase 1: Enforce Selection Provenance

### Task p01-t01: Extend Dispatch Report V1 with classification and notices

**Files:**

- Modify: `packages/cli/src/providers/identity/dispatch-report.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`
- Modify as required: `packages/cli/src/commands/gate/index.ts`
- Modify as required: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write failing contract tests**

Add tests for:

- additive top-level classification with null/`not-reported` defaults;
- ordered `notices` serialization;
- human formatting of classification and notices;
- compatibility for existing gate report producers;
- byte-for-byte unchanged compatibility stamp output.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/gate/index.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement the report contract**

- Add the provider-neutral task-class union, classification shape, and structured
  notice shape.
- Extend `DispatchReportV1`, input types, builders, ordered serializer, and human
  formatter.
- Default legacy producers to null/`not-reported` classification and `[]`
  notices.
- Keep `formatDispatchStamp()` unchanged.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/providers/identity/dispatch-report.ts" \
  "packages/cli/src/providers/identity/dispatch-report.test.ts" \
  "packages/cli/src/commands/gate/index.ts" \
  "packages/cli/src/commands/gate/index.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: focused tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-report.ts \
  packages/cli/src/providers/identity/dispatch-report.test.ts \
  packages/cli/src/commands/gate/index.ts \
  packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(cli): add dispatch classification report fields"
```

---

### Task p01-t02: Add classification inputs and managed-cap warnings

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write failing command tests**

Cover:

- `--task-class` and Codex `--preferred-effort` parsing and validation;
- rejection for invalid classes, provider-inapplicable effort, reviewer action,
  and conflicting controls;
- no candidate on actual managed named-cap implementation/fix producing
  `managed-capped-selection-skipped`;
- candidate without task class producing
  `managed-capped-classification-missing`;
- deliberate at-cap and below-cap candidates preserving classification without
  warning;
- unchanged above-cap error;
- no false warning for policy preflight, reviewer, inherit, uncapped, or
  unresolved paths;
- matching human and JSON notices.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/commands/commands.integration.test.ts \
  src/commands/help-snapshots.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement classification and notice derivation**

- Add CLI options and normalization without overloading `--preferred`.
- Thread classification into Dispatch Report V1.
- Derive skipped-selection and classification-missing notices only after the
  existing resolver returns, using policy, role/action, preflight, and selection
  context.
- Preserve `status: resolved`, exit code `0`, and selection behavior.
- Render human notices from the same structured data returned in JSON.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/commands/project/dispatch-ceiling/index.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.test.ts" \
  "packages/cli/src/commands/commands.integration.test.ts" \
  "packages/cli/src/commands/help-snapshots.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/commands/commands.integration.test.ts \
  src/commands/help-snapshots.test.ts \
  src/providers/identity/dispatch-report.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: command, integration, report, help, and type checks pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.test.ts \
  packages/cli/src/commands/commands.integration.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(cli): warn on unclassified capped dispatches"
```

---

## Phase 2: Expose Terminal Reviewer Constraints

### Task p02-t01: Add shared terminal-reviewer disclosures

**Files:**

- Create: `packages/cli/src/config/dispatch-notices.ts`
- Create: `packages/cli/src/config/dispatch-notices.test.ts`
- Modify: `packages/cli/src/config/dispatch-policy-options.ts`
- Modify: `packages/cli/src/config/dispatch-policy-options.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write failing disclosure tests**

Cover:

- recommendation adoption/choice output naming the configured terminal reviewer
  conditionally;
- human and JSON adoption output carrying the same coded advisory;
- preserved explicit Frontier cells not being misrepresented by version alone;
- runtime preflight/reviewer resolution disclosing the actual effective Fable
  target;
- no disclosure for High or custom non-Fable Frontier targets.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/dispatch-notices.test.ts \
  src/config/dispatch-policy-options.test.ts \
  src/commands/config/index.test.ts \
  src/commands/project/dispatch-ceiling/index.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement shared disclosure metadata**

- Centralize terminal-reviewer notice metadata and matching.
- Add conditional disclosure to adoption and policy choices.
- Derive runtime disclosure from the effective resolved target, not the
  recommendation version.
- Reuse the structured notice shape from Phase 1.
- Keep the advisory informational; do not infer access or organizational
  retention policy.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/config/dispatch-notices.ts" \
  "packages/cli/src/config/dispatch-notices.test.ts" \
  "packages/cli/src/config/dispatch-policy-options.ts" \
  "packages/cli/src/config/dispatch-policy-options.test.ts" \
  "packages/cli/src/commands/config/index.ts" \
  "packages/cli/src/commands/config/index.test.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/dispatch-notices.test.ts \
  src/config/dispatch-policy-options.test.ts \
  src/commands/config/index.test.ts \
  src/commands/project/dispatch-ceiling/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: disclosure tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/dispatch-notices.ts \
  packages/cli/src/config/dispatch-notices.test.ts \
  packages/cli/src/config/dispatch-policy-options.ts \
  packages/cli/src/config/dispatch-policy-options.test.ts \
  packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "feat(cli): disclose terminal reviewer constraints"
```

---

### Task p02-t02: Update implementation guidance and documentation

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify:
  `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify:
  `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Write failing contract tests**

Require implementation/fix command examples to pass task classification and
require the workflow to surface resolver notices before launch. Pin the
access-versus-retention wording and corrected recommendation/catalog counts.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
```

Expected: new contract assertions fail before guidance changes.

**Step 2: Update skills and docs**

- Bump `oat-project-implement` once for this PR.
- Update managed-capped implementation/fix examples with classification flags.
- Require human-facing notice display before implementation or reviewer launch.
- Explain terminal reviewer access and retention-policy responsibility.
- Correct stale Cursor recommendation/catalog counts in configuration docs.
- Do not edit generated `apps/oat-docs/index.md`.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  ".agents/skills/oat-project-implement/SKILL.md" \
  ".agents/skills/oat-project-implement/references/dispatch-and-dry-run.md" \
  "packages/cli/src/validation/skills.test.ts" \
  "apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md" \
  "apps/oat-docs/docs/cli-utilities/configuration.md"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
pnpm lint
pnpm format
pnpm --filter oat-docs check
pnpm build:docs
```

Expected: skill contracts, formatting, lint, and docs build pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md \
  packages/cli/src/validation/skills.test.ts \
  apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md \
  apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(oat): document dispatch notices and reviewer constraints"
```

---

## Phase 3: Release and Backlog Closeout

### Task p03-t01: Bump lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Update release metadata**

Bump all five public packages from `0.2.24` to `0.2.25` and update the bundled
public-package inventory.

**Step 2: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/package.json" \
  "packages/control-plane/package.json" \
  "packages/docs-config/package.json" \
  "packages/docs-theme/package.json" \
  "packages/docs-transforms/package.json" \
  "packages/cli/assets/public-package-versions.json"
```

**Step 3: Verify**

```bash
pnpm release:validate
```

Expected: all five publishable packages validate at `0.2.25`.

**Step 4: Commit**

```bash
git add packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
git commit -m "chore(release): bump public packages for dispatch notices"
```

---

### Task p03-t02: Archive the completed backlog item and run final verification

**Files:**

- Move:
  `.oat/repo/pjm/backlog/items/BL-260727-surface-implementer-dispatches.md`
  to `.oat/repo/pjm/backlog/archived/`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Archive the backlog item**

```bash
oat backlog archive BL-260727-surface-implementer-dispatches \
  --summary "Added structured warnings and classification provenance for managed-capped implementation/fix dispatches, plus terminal reviewer constraint disclosures."
```

Expected: the item is closed, moved to `archived/`, added to the completed
ledger, and removed from the active index.

**Step 2: Format**

```bash
pnpm exec oxfmt --write \
  ".oat/repo/pjm/backlog/archived/BL-260727-surface-implementer-dispatches.md" \
  ".oat/repo/pjm/backlog/completed.md" \
  ".oat/repo/pjm/backlog/index.md"
```

**Step 3: Run definition-of-done verification**

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
oat pjm doctor
git diff --check
```

Expected: all required checks pass and PJM state is consistent.

**Step 4: Commit**

```bash
git add .oat/repo/pjm/backlog
git commit -m "chore(backlog): close implementer dispatch visibility"
```

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Dispatch report schema, classification inputs, and warnings
- Phase 2: 2 tasks - Terminal reviewer disclosures, skills, and docs
- Phase 3: 2 tasks - Public release metadata and backlog closeout

**Total: 6 tasks**

Ready for implementation after plan review and dispatch setup.

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog:
  `.oat/repo/pjm/backlog/items/BL-260727-surface-implementer-dispatches.md`
- Resolver:
  `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Dispatch Report:
  `packages/cli/src/providers/identity/dispatch-report.ts`
