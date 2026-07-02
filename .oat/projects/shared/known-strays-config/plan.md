---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-02
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p03"]
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: known-strays-config

> Execute this plan using `oat-project-implement`.

**Goal:** Add configurable known provider strays so intentional provider-local
files can be ignored by OAT stray status and adoption prompts.

**Architecture:** Extend sync/user config normalization with `knownStrays`,
resolve project and user entries into one exact-match set, and apply the shared
filter before status/init surfaces report or prompt for strays.

**Tech Stack:** TypeScript, Commander, Vitest, Zod, OAT provider sync.

**Commit Convention:** `{type}({scope}): {description}` - e.g.,
`feat(p01-t01): add known strays config model`

## Planning Checklist

- [x] Confirmed quick workflow with user
- [x] Confirmed dispatch ceiling: maximum (Codex `xhigh`, Claude `opus`)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

This plan is intentionally sequential. Phase 1 defines the config schema and
resolution helper that Phase 2 consumes in `status` and `init`; Phase 3 updates
docs, package versions, and release validation after the behavioral surface is
settled. Running these phases concurrently would create avoidable conflicts in
shared config and test files.

---

## Phase 1: Config Model and Resolution

### Task p01-t01: Add known strays config schema

**Files:**

- Modify: `packages/cli/src/config/sync-config.ts`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/sync-config.test.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

Add tests proving:

- `loadSyncConfig` accepts and normalizes `knownStrays` from
  `.oat/sync/config.json`.
- user config normalization accepts `knownStrays` under `~/.oat/config.json`.
- invalid/non-string entries are rejected or filtered according to the existing
  config-validation pattern.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/config/resolve.test.ts
```

Expected: New expectations fail before implementation.

**Step 2: Implement (GREEN)**

Add `knownStrays: string[]` support to sync config and user config types,
defaults, normalization, and persistence. Use normalized POSIX provider paths
and de-duplicate entries.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/config/resolve.test.ts
```

Expected: Tests pass.

**Step 3: Refactor**

Keep the config shape minimal. Do not add glob semantics unless existing path
helpers make that clearly low-risk during implementation.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add packages/cli/src/config/sync-config.ts packages/cli/src/config/oat-config.ts packages/cli/src/config/sync-config.test.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t01): add known strays config model"
```

---

### Task p01-t02: Add shared known stray resolution helper

**Files:**

- Create: `packages/cli/src/drift/known-strays.ts`
- Create or modify: `packages/cli/src/drift/known-strays.test.ts`
- Modify: `packages/cli/src/drift/index.ts`

**Step 1: Write test (RED)**

Add tests proving the helper:

- merges project and user `knownStrays`;
- suppresses exact provider-path matches;
- does not suppress sibling paths such as
  `.cursor/skills/cloud-environment-setup-extra`;
- handles empty/missing config as no suppressions.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift/known-strays.test.ts
```

Expected: Test file fails before helper implementation.

**Step 2: Implement (GREEN)**

Implement a small exported helper that accepts detected stray reports and
resolved known-stray path entries, returning filtered reports and candidates.
Use exact normalized provider-path matching first.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift/known-strays.test.ts
```

Expected: Tests pass.

**Step 3: Refactor**

Keep command code free of ad hoc string matching by routing all suppression
through this helper.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
```

Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add packages/cli/src/drift/known-strays.ts packages/cli/src/drift/known-strays.test.ts packages/cli/src/drift/index.ts
git commit -m "feat(p01-t02): resolve known provider strays"
```

---

## Phase 2: Status and Init Behavior

### Task p02-t01: Suppress known strays in `oat status`

**Files:**

- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Write test (RED)**

Add status tests proving:

- a project-level known stray is absent from table/JSON summaries and does not
  trigger remediation;
- a user-level known stray is absent from table/JSON summaries and prompts;
- an unconfigured stray in the same scan still reports and remains adoptable;
- `--hook` mode does not emit stray info when only known strays exist.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts
```

Expected: New expectations fail before filtering is wired into status.

**Step 2: Implement (GREEN)**

Load/resolve known-stray config in `collectScopeReports` or a nearby shared
path, then filter detected regular strays and Codex role strays before reports
and adoption candidates are appended.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts
```

Expected: Tests pass.

**Step 3: Refactor**

Avoid changing drift/missing semantics. Known strays apply only to stray reports.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/drift/known-strays.test.ts src/commands/status/index.test.ts
```

Expected: Tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts
git commit -m "feat(p02-t01): suppress known strays in status"
```

---

### Task p02-t02: Suppress known strays in `oat init`

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

Add init tests proving:

- known strays are not offered for adoption during init;
- mixed known and unknown strays still prompt only for unknown entries;
- both project-level and user-level config can suppress the representative
  `.cursor/skills/cloud-environment-setup` path.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts
```

Expected: New expectations fail before filtering is wired into init.

**Step 2: Implement (GREEN)**

Resolve known-stray config before `collectStraysDefault` results are presented
for adoption, or pass the resolved filter into the collection dependency so
tests can assert it cleanly.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts
```

Expected: Tests pass.

**Step 3: Refactor**

Keep init and status behavior consistent by reusing the same helper and config
resolution path.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/status/index.test.ts src/drift/known-strays.test.ts
```

Expected: Tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/index.ts packages/cli/src/commands/init/index.test.ts
git commit -m "feat(p02-t02): suppress known strays during init"
```

---

## Phase 3: Documentation, Versions, and Validation

### Task p03-t01: Document known strays and bump shipped package versions

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/config.md`
- Modify: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify if needed: lockfile/version metadata

**Step 1: Write test (RED)**

Run release validation before version bumps to confirm the guardrail catches the
shipped CLI/docs change if required.

```bash
pnpm release:validate
```

Expected: Version validation may fail before package bumps.

**Step 2: Implement (GREEN)**

Document:

- `knownStrays` exact provider-path matching;
- project-level example in `.oat/sync/config.json`;
- user-level example in `~/.oat/config.json`;
- the representative Cursor-only skill use case.

Bump all five public packages from `0.1.21` to the next lockstep patch version.

Run:

```bash
pnpm release:validate
```

Expected: Release validation passes.

**Step 3: Refactor**

Keep docs concise and avoid duplicating full schemas in AGENTS.md.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/sync-config.test.ts src/drift/known-strays.test.ts src/commands/status/index.test.ts src/commands/init/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
pnpm release:validate
```

Expected: All commands pass.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/config.md apps/oat-docs/docs/provider-sync/manifest-and-drift.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "docs(p03-t01): document known strays config"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact |
| ------ | -------- | ------- | ---------- | -------- |
| p01    | code     | passed  | 2026-07-02 | reviews/p01-review-2026-07-02.md |
| p02    | code     | passed  | 2026-07-02 | reviews/p02-review-2026-07-02.md |
| p03    | code     | pending | -          | -        |
| final  | code     | pending | -          | -        |
| spec   | artifact | pending | -          | -        |
| design | artifact | pending | -          | -        |
| plan   | artifact | passed  | 2026-07-02 | inline structured review |

**Status values:** `pending` -> `received` -> `fixes_added` ->
`fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Config schema and shared known-stray resolution
- Phase 2: 2 tasks - Status and init command behavior
- Phase 3: 1 task - Documentation, package versions, and release validation

**Total: 5 tasks**

Ready for implementation.

---

## References

- Discovery: `discovery.md`
