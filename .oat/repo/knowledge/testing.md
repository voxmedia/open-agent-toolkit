---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Testing Patterns

**Analysis Date:** 2026-08-30

## Test Framework

**Runner:**

- Vitest `^4.0.18` runs TypeScript package tests in `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, and `packages/docs-transforms/package.json`.
- `packages/cli/vitest.config.ts`, `packages/docs-config/vitest.config.ts`, and `packages/docs-transforms/vitest.config.ts` include `src/**/*.test.ts` and set `passWithNoTests: true`; the CLI config also resolves its TypeScript aliases and clears `OAT_ASSETS_DIR` for the suite.
- Node's built-in `node:test` runs the root smoke, skill, and release suites through `tools/smoke/**/*.test.mjs`, `.agents/skills/*/tests/*.test.mjs`, and the named release files in `package.json`; `tools/smoke/evidence/collect.test.mjs` is an example.

**Assertion Library:**

- Vitest assertions (`expect`) and mocking utilities (`vi`) are imported from `vitest`, for example `packages/cli/src/fs/io.test.ts`.
- Node-run suites use `node:assert/strict`, as in `tools/smoke/evidence/collect.test.mjs`.

**Run Commands:**

```bash
pnpm test                                      # Workspace Vitest, smoke, skill, and release suites
pnpm --filter @open-agent-toolkit/cli test     # CLI package Vitest suite
pnpm --filter @open-agent-toolkit/cli test:watch # CLI watch mode
pnpm --filter @open-agent-toolkit/cli test:coverage # CLI coverage report
pnpm test:smoke                                # Node built-in smoke suites
pnpm test:skills                               # Node built-in skill suites
pnpm test:release                              # Node built-in release suites
```

## Test File Organization

**Location:**

- Most Vitest suites are co-located with implementation, such as `packages/cli/src/fs/io.ts` and `packages/cli/src/fs/io.test.ts`.
- Cross-module groups use scoped directories: `packages/cli/src/__tests__/`, `packages/cli/src/commands/project/split/__tests__/`, `packages/cli/src/review-remote/__integration__/`, and `packages/cli/src/e2e/`.
- Node smoke tests live under `tools/smoke/`; skill tests are located under their respective `.agents/skills/<skill>/tests/` directories when present, as targeted by root `package.json`.

**Naming:**

- Unit tests use `*.test.ts`; tests that specify a broader behavior use suffixes such as `*.integration.test.ts` and `*.readdir-order.test.ts`, for example `packages/cli/src/commands/docs/init/integration.test.ts` and `packages/cli/src/commands/backlog/regenerate-index.readdir-order.test.ts`.

**Structure:**

```text
packages/cli/src/
  fs/io.ts
  fs/io.test.ts
  commands/<area>/<operation>.ts
  commands/<area>/<operation>.integration.test.ts
  e2e/workflow.test.ts
tools/smoke/<area>/*.test.mjs
```

## Test Structure

**Suite Organization:**

```typescript
describe('fs/io', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('copyDirectory recursively copies all files', async () => {
    // Arrange, execute, and assert filesystem behavior.
  });
});
```

The source pattern is `packages/cli/src/fs/io.test.ts`.

**Patterns:**

- Suites use `describe` and behavior-oriented `it` labels; async behavior is awaited directly and checked with `await expect(...).resolves` or `.rejects`, as in `packages/cli/src/fs/io.test.ts`.
- Temporary directories are created with `mkdtemp`, recorded in an array, then removed in `afterEach`; this occurs in `packages/cli/src/fs/io.test.ts`, `packages/cli/src/config/resolve.test.ts`, and `packages/cli/src/e2e/workflow.test.ts`.
- Tests inject dependencies where supported instead of requiring global process state. `packages/cli/src/config/resolve.test.ts` passes fake `readOatConfig`, `readOatLocalConfig`, and `readUserConfig` implementations.

## Mocking

**Framework:** Vitest `vi`.

**Patterns:**

```typescript
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsp>();
  return { ...actual, readdir: vi.fn().mockImplementation(actual.readdir) };
});

const mockedReaddir = vi.mocked(fsp.readdir);
mockedReaddir.mockRejectedValueOnce(eaccesError);
```

This partial-module mocking pattern is implemented in `packages/cli/src/engine/edge-cases.test.ts`.

**What to Mock:**

- Mock narrow failure seams or observable collaborators, such as `node:fs/promises` failure behavior in `packages/cli/src/engine/edge-cases.test.ts` and dependency callbacks in `packages/cli/src/config/resolve.test.ts`.
- Restore patched global/mock state in teardown; `packages/cli/src/app/command-context.test.ts` resets `process.stdin.isTTY` and calls `vi.restoreAllMocks()` in `afterEach`.

**What NOT to Mock:**

- Filesystem behavior is often exercised against real temporary directories rather than mocked. `packages/cli/src/fs/io.test.ts` creates files, directories, and symlinks to verify copy and write behavior.
- Integration tests run real asset bundling and read scaffolded output, as in `packages/cli/src/commands/docs/init/integration.test.ts`.

## Fixtures and Factories

**Test Data:**

```typescript
const root = await mkdtemp(join(tmpdir(), 'oat-config-resolve-'));
tempDirs.push(root);
await mkdir(join(root, '.oat'), { recursive: true });
```

`packages/cli/src/config/resolve.test.ts` builds isolated temporary repositories; it also uses a `createResolvedConfig` helper for typed defaults.

**Location:**

- Shared CLI helpers live in `packages/cli/src/__tests__/`; feature fixtures are co-located under `packages/cli/src/commands/cleanup/__fixtures__/`, `packages/cli/src/commands/gate/__fixtures__/`, and `packages/cli/src/commands/docs/migrate/fixtures/`.
- Smoke fixtures and golden data are stored under `tools/smoke/fixture/` and `tools/smoke/evidence/golden/`, exercised by `tools/smoke/evidence/collect.test.mjs`.

## Coverage

**Requirements:** No repository coverage percentage or threshold configuration was detected. The root composite `pnpm test` command in `package.json` does not invoke coverage.

**View Coverage:**

```bash
pnpm --filter @open-agent-toolkit/cli test:coverage
```

The CLI coverage command is defined in `packages/cli/package.json`; no matching coverage script was detected in the other package manifests.

## Test Types

**Unit Tests:**

- The dominant pattern is co-located Vitest unit tests for modules and command helpers, such as `packages/cli/src/fs/io.test.ts` and `packages/cli/src/config/resolve.test.ts`.

**Integration Tests:**

- Integration suites use real filesystem/process behavior and explicit `*.integration.test.ts` names, including `packages/cli/src/commands/docs/init/integration.test.ts` and `packages/cli/src/commands/cleanup/cleanup.integration.test.ts`.

**E2E Tests:**

- Workflow-level tests use Vitest and temporary workspaces in `packages/cli/src/e2e/workflow.test.ts`; browser E2E test configuration was not detected.

## Common Patterns

**Async Testing:**

```typescript
await expect(fileExists(join(root, 'missing.txt'))).resolves.toBe(false);
await expect(readFile(`${output}.tmp`, 'utf8')).rejects.toThrow();
```

Both patterns appear in `packages/cli/src/fs/io.test.ts`.

**Error Testing:**

```typescript
await expect(loadManifest(manifestPath)).rejects.toThrow(CliError);
await expect(loadManifest(manifestPath)).rejects.toThrow(
  /Delete or repair the file and re-run oat sync\./,
);
```

This verifies both structured error type and actionable message in `packages/cli/src/engine/edge-cases.test.ts`.

---

_Testing analysis: 2026-08-30_
