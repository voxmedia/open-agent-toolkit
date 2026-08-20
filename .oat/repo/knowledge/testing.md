---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

<!--
Vendored from: https://github.com/glittercowboy/get-shit-done
License: MIT
Original: agents/gsd-codebase-mapper.md (embedded template)
Modified: 2026-01-27 - Adapted for OAT (added frontmatter)
-->

# Testing Patterns

**Analysis Date:** 2026-08-19

## Test Framework

**Runner:**

- Vitest is declared at `^4.0.18` in `packages/cli/package.json:55-62`, `packages/control-plane/package.json:48-55`, `packages/docs-config/package.json:56-63`, and `packages/docs-transforms/package.json:49-56`.
- CLI tests use `packages/cli/vitest.config.ts`, which includes `src/**/*.test.ts` and configures package aliases in `packages/cli/vitest.config.ts:1-30`.
- Docs package configs include `src/**/*.test.ts` and set `passWithNoTests: true` in `packages/docs-config/vitest.config.ts:1-8` and `packages/docs-transforms/vitest.config.ts:1-8`. No `packages/control-plane/vitest.config.ts` is present in the repository file inventory; its package manifest still invokes `vitest run` in `packages/control-plane/package.json:31-39`.

**Assertion Library:**

- Assertions use Vitest's `expect`, including object matching, promise assertions, inline snapshots, and `expectTypeOf`, as shown in `packages/cli/src/commands/backlog/new.test.ts:68-116`, `packages/cli/src/providers/shared/materialization-extension.test.ts:1-100`, and `packages/cli/src/commands/help-snapshots.test.ts:114-169`.

**Run Commands:**

```bash
pnpm test                         # Root suite: Turbo package tests plus smoke, skills, and release Node tests (`package.json:24-31`)
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli test:watch
pnpm --filter @open-agent-toolkit/cli test:coverage
node --test tools/smoke/*/*.test.mjs tools/smoke/*/*/*.test.mjs
node --test .agents/skills/*/tests/*.test.mjs
```

The package scripts defining Vitest run, watch, and coverage commands are in `packages/cli/package.json:32-48`; root smoke/skills/release commands are in `package.json:24-31`.

## Test File Organization

**Location:**

- Tests are predominantly co-located with implementation under `src`, for example `packages/cli/src/commands/backlog/new.ts` and `packages/cli/src/commands/backlog/new.test.ts`, plus `packages/control-plane/src/state/parser.ts` and `packages/control-plane/src/state/parser.test.ts`.
- Cross-cutting suites have explicit `__tests__`, `__integration__`, `integration`, or `e2e` directories, including `packages/cli/src/commands/project/split/__tests__/` and `packages/cli/src/review-remote/__integration__/`.

**Naming:**

- Unit and integration files use the `.test.ts` suffix; integration and end-to-end intent is also encoded in names such as `cleanup.integration.test.ts`, `e2e-pipeline.test.ts`, and `workflow.test.ts` in `packages/cli/src/commands/cleanup/`, `packages/cli/src/commands/docs/`, and `packages/cli/src/e2e/`.

**Structure:**

```text
packages/cli/src/<domain>/<module>.test.ts
packages/cli/src/<domain>/__tests__/<scenario>.test.ts
packages/cli/src/<domain>/__integration__/<rail>/<scenario>.test.ts
packages/control-plane/src/<module>.test.ts
packages/docs-config/src/<module>.test.ts
packages/docs-transforms/src/<module>.test.ts
```

These patterns are represented by `packages/cli/src/commands/shared/frontmatter.test.ts`, `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`, and `packages/cli/src/review-remote/__integration__/project/project-rail.test.ts`.

## Test Structure

**Suite Organization:**

```typescript
describe('frontmatter', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  describe('parseGeneratedTime', () => {
    it('treats a bare date as UTC midnight', () => {
      expect(parseGeneratedTime('2026-07-05')).toBe(
        Date.parse('2026-07-05T00:00:00Z'),
      );
    });
  });
});
```

This nested `describe`/`it` organization and cleanup pattern is from `packages/cli/src/commands/shared/frontmatter.test.ts:20-66`.

**Patterns:**

- Suites use `describe` for the module/feature, nested `describe` for related cases, and descriptive `it` strings, as in `packages/docs-transforms/src/remark-tabs.test.ts:43-73`.
- Tests isolate filesystem behavior with `mkdtemp`, track created directories, and remove them in `afterEach`, as in `packages/control-plane/src/project.test.ts:9-25` and `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts:110-120`.
- Assertions favor exact structured results (`toEqual`, `toMatchObject`), semantic containment (`toContain`), and explicit async resolution/rejection assertions, as in `packages/cli/src/commands/backlog/new.test.ts:68-116` and `packages/cli/src/commands/backlog/new.test.ts:210-235`.

## Mocking

**Framework:** Vitest's `vi.mock`, `vi.hoisted`, `vi.fn`, `vi.mocked`, and `vi.spyOn`.

**Patterns:**

```typescript
const mdxMocks = vi.hoisted(() => {
  const withMDX = vi.fn((config: Record<string, unknown>) => ({
    ...config,
    mdxWrapped: true,
  }));
  const createMDX = vi.fn(() => withMDX);
  return { createMDX, withMDX };
});

vi.mock('fumadocs-mdx/next', () => ({
  createMDX: mdxMocks.createMDX,
}));
```

The module-mocking pattern and `beforeEach` mock reset are in `packages/docs-config/src/next-config.test.ts:1-22`; process I/O spying is used in `packages/cli/src/ui/logger.test.ts:10-86`.

**What to Mock:**

- External modules, prompts, process I/O, and unstable boundaries are mocked, including `fumadocs-mdx/next` in `packages/docs-config/src/next-config.test.ts:13-15`, `@inquirer/prompts` in `packages/cli/src/e2e/workflow.test.ts:20-23`, and `ora` in `packages/cli/src/ui/spinner.test.ts:1-28`.
- Internal filesystem, network, and command behavior is often replaced through explicit dependency overrides rather than module mocks, as in `packages/cli/src/commands/backlog/new.ts:41-49` and the harness in `packages/cli/src/commands/repo/archive/index.test.ts:28-83`.

**What NOT to Mock:**

- Pure parsers, normalizers, renderers, and domain transformations are exercised directly with inline input, as in `packages/cli/src/commands/shared/frontmatter.test.ts:30-112`, `packages/control-plane/src/shared/utils/normalize.test.ts:1-80`, and `packages/docs-transforms/src/remark-tabs.test.ts:20-73`.

## Fixtures and Factories

**Test Data:**

```typescript
const root = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
tempDirs.push(root);
await seedTemplates(root);
const document = documentFor('declared');
```

Filesystem fixture construction and cleanup are defined in `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts:31-56` and `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts:110-128`.

**Location:**

- Reusable command test helpers live in `packages/cli/src/commands/__tests__/helpers.ts:1-49`; skill-flow fixture builders live in `packages/cli/src/__tests__/skills/split-flow-fixtures.ts`.
- Most data is declared inline in each test; temporary Markdown/YAML, project trees, and provider directories are created beneath the OS temp directory, as in `packages/cli/src/commands/shared/frontmatter.test.ts:114-216`.

## Coverage

**Requirements:** No repository-wide numeric coverage threshold or coverage configuration is detected. The CLI exposes a coverage command in `packages/cli/package.json:44-48`, while `packages/cli/vitest.config.ts:25-30` contains no coverage section.

**View Coverage:**

```bash
pnpm --filter @open-agent-toolkit/cli test:coverage
```

The command is defined in `packages/cli/package.json:44-48`; equivalent coverage scripts are not present in the control-plane or docs package manifests (`packages/control-plane/package.json:31-39`, `packages/docs-config/package.json:33-42`, and `packages/docs-transforms/package.json:28-37`).

## Test Types

**Unit Tests:**

- Pure parsing, normalization, configuration, provider codec, and command helper behavior is tested directly, for example `packages/control-plane/src/state/parser.test.ts`, `packages/control-plane/src/shared/utils/normalize.test.ts`, and `packages/cli/src/providers/codex/codec/config-merge.test.ts`.

**Integration Tests:**

- Suites exercise real temporary project/filesystem state and multiple modules, including `packages/control-plane/src/project.test.ts`, `packages/cli/src/engine/engine.integration.test.ts`, and `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`.

**E2E Tests:**

- The CLI has a Vitest-driven command workflow suite in `packages/cli/src/e2e/workflow.test.ts`; smoke-level server/process checks live in `packages/cli/src/integration/visual-companion-smoke.test.ts`.
- Root-level smoke, skill, and release suites use Node's built-in test runner through commands in `package.json:27-31`.

## Common Patterns

**Async Testing:**

```typescript
it('returns null when SKILL.md is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'oat-skill-'));
  tempDirs.push(dir);
  await expect(getSkillVersion(dir)).resolves.toBeNull();
});
```

Async setup and `resolves` assertions follow `packages/cli/src/commands/shared/frontmatter.test.ts:182-187`; async transformations use `await processor.run(tree)` in `packages/docs-transforms/src/remark-tabs.test.ts:20-25`.

**Error Testing:**

```typescript
await expect(
  createBacklogItem({
    backlogRoot,
    assetsRoot: BUNDLED_ASSETS_ROOT,
    title: 'Demo',
    priority: 'critical',
  }),
).rejects.toThrow();
```

Rejected promises are asserted with `rejects.toThrow` in `packages/cli/src/commands/backlog/new.test.ts:210-235`; synchronous validation uses `expect(() => ...).toThrow(...)` in `packages/cli/src/validation/project-state.test.ts:116-118`.

Inline snapshots are used for stable CLI/report output in `packages/cli/src/commands/help-snapshots.test.ts:114-169` and `packages/cli/src/providers/identity/dispatch-report.test.ts:616-711`.

---

_Testing analysis: 2026-08-19_
