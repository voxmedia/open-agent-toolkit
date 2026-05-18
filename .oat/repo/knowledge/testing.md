---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Testing Patterns

**Analysis Date:** 2026-05-17

## Test Framework

**Runner:**

- Vitest (via `vitest run` for single pass, `vitest watch` for development)
- Configuration files:
  - `packages/cli/vitest.config.ts` (CLI package with path aliases)
  - `packages/docs-config/vitest.config.ts` (simpler config)
  - `packages/docs-transforms/vitest.config.ts` (simpler config)
  - `packages/control-plane/` also uses vitest (inferred from test files)
- Default behavior: `passWithNoTests: true` (tests are optional, not required)

**Assertion Library:**

- Vitest built-in assertions: `expect()` API
- No separate assertion library (vitest provides `expect` directly)
- Examples: `expect(value).toBe(...)`, `expect(fn).toHaveBeenCalled()`, `expect(...).toThrow()`

**Run Commands:**

```bash
pnpm --filter @open-agent-toolkit/cli test          # Run all CLI tests
pnpm test                                           # Run all workspace tests
pnpm --filter @open-agent-toolkit/cli test --watch  # Watch mode (not shown in standard config but supported by vitest)
```

## Test File Organization

**Location:**

- Colocated: test files live in the same directory as source files
- Naming: `<module>.test.ts` (example: `logger.ts` → `logger.test.ts`)
- Both in `src/` directory (not a separate `test/` or `__tests__/` folder for colocated tests)
- Shared test helpers in `src/__tests__/` subdirectory:
  - `packages/cli/src/commands/__tests__/helpers.ts` (shared test utilities)
  - `packages/cli/src/engine/test-helpers.ts` (engine-specific test factories)

Evidence:

- `packages/cli/src/ui/logger.test.ts` colocated with `packages/cli/src/ui/logger.ts`
- `packages/cli/src/ui/spinner.test.ts` colocated with `packages/cli/src/ui/spinner.ts`
- `packages/cli/src/errors/cli-error.test.ts` colocated with `packages/cli/src/errors/cli-error.ts`

**Naming:**

- Test files: `<module>.test.ts`
- Test suites: `describe('ClassName or FunctionName', () => { ... })`
- Test cases: `it('should do X', () => { ... })` (BDD-style)
- Descriptive test names focusing on behavior: `'info() writes to stdout in human mode'`, `'json() outputs single JSON document to stdout'`

**Structure:**

```
packages/cli/src/
  ui/
    logger.ts
    logger.test.ts      ← colocated
    spinner.ts
    spinner.test.ts     ← colocated
  commands/
    __tests__/
      helpers.ts        ← shared test utilities
    config/
      index.ts
      index.test.ts     ← colocated
    project/
      archive/
        index.ts
        index.test.ts   ← colocated
        archive-utils.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CliLogger', () => {
  // Setup fixtures if needed
  let testValue: string;

  beforeEach(() => {
    testValue = 'initial';
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up spies/mocks after each test
  });

  it('info() writes to stdout in human mode', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger({ json: false, verbose: false });

    logger.info('hello');

    expect(stdout).toHaveBeenCalled();
    expect(String(stdout.mock.calls[0]?.[0])).toContain('hello');
  });

  // Additional tests...
});
```

Source: `packages/cli/src/ui/logger.test.ts` (99 lines)

**Patterns:**

- Setup with `beforeEach()`: initialize mocks, spies, temporary directories
- Teardown with `afterEach()`: clean up mocks, restore stubs, delete temp files
- Assertion pattern: `expect(actualValue).toBe(expectedValue)` or `expect(mockFn).toHaveBeenCalled()`
- Spy/mock creation with `vi.spyOn()` or `vi.fn()`
- Cleanup: `vi.restoreAllMocks()` at end of test suite (see `packages/cli/src/ui/logger.test.ts:6-8`)

## Mocking

**Framework:** Vitest's `vi` module

**Patterns:**

Spying on existing functions:

```typescript
const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
logger.info('hello');
expect(stdout).toHaveBeenCalled();
```

(from `packages/cli/src/ui/logger.test.ts`)

Mocking external modules:

```typescript
const { oraMock } = vi.hoisted(() => ({
  oraMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: oraMock,
}));

import { createSpinner } from './spinner';

// Use oraMock in tests
oraMock.mockReturnValue(oraInstance);
```

(from `packages/cli/src/ui/spinner.test.ts`)

Function mocks with vi.fn():

```typescript
const resolveProjectRoot = vi.fn(async () => options.cwd);

const command = createConfigCommand({
  resolveProjectRoot,
  // ...
});
```

(from `packages/cli/src/commands/config/index.test.ts`)

**What to Mock:**

- External dependencies (modules, APIs): `vi.mock('ora')`
- System calls: `vi.spyOn(process.stdout, 'write')`
- File system operations when testing logic (use real temp dirs for integration tests)
- Network calls
- Clock/time-dependent code: `vi.useFakeTimers()` (not used in shown examples)

**What NOT to Mock:**

- Internal application logic under test
- Helper functions in the same module (test them through public API)
- Fixtures and test data (see Fixtures section)
- Core Node.js APIs like path, fs (unless testing error paths)

## Fixtures and Factories

**Test Data:**

```typescript
function createTestAdapter(
  overrides: Partial<ProviderAdapter> = {},
): ProviderAdapter {
  return {
    name: 'claude',
    displayName: 'Claude Code',
    defaultStrategy: 'symlink',
    projectMappings: [
      {
        contentType: 'skill',
        canonicalDir: '.agents/skills',
        providerDir: '.claude/skills',
        nativeRead: false,
      },
      // ...
    ],
    ...overrides,
  };
}
```

(from `packages/cli/src/engine/test-helpers.ts`)

Logger capture fixture:

```typescript
export function createLoggerCapture(): LoggerCapture {
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];
  const success: string[] = [];
  const debug: string[] = [];
  const jsonPayloads: unknown[] = [];

  return {
    info,
    warn,
    error,
    success,
    debug,
    jsonPayloads,
    logger: {
      debug(message) {
        debug.push(message);
      },
      info(message) {
        info.push(message);
      },
      // ... other methods
    },
  };
}
```

(from `packages/cli/src/commands/__tests__/helpers.ts`)

**Location:**

- Test helpers exported from `packages/cli/src/<domain>/__tests__/helpers.ts` or `packages/cli/src/<domain>/test-helpers.ts`
- Factories return default instances with optional overrides
- Captured loggers/spies collect output for assertions

## Coverage

**Requirements:** None enforced

- No coverage target mandated by tooling
- Coverage is encouraged but not automated
- Focus on meaningful tests rather than percentage targets

**View Coverage:**

```bash
pnpm --filter @open-agent-toolkit/cli test --coverage
```

(Note: vitest supports coverage with optional provider, no provider specified in shown configs)

## Test Types

**Unit Tests:**

- Scope: Single module or small function
- Approach: Mock external dependencies, test pure logic
- Examples:
  - `packages/cli/src/ui/logger.test.ts` - Tests CliLogger in isolation, mocks stdout/stderr
  - `packages/cli/src/ui/spinner.test.ts` - Tests spinner wrapper logic, mocks `ora` module
  - `packages/cli/src/errors/cli-error.test.ts` - Tests CliError class properties

**Integration Tests:**

- Scope: Multiple modules working together; often includes real file I/O
- Approach: Use temporary directories, real filesystem operations, minimal mocking
- Examples:
  - `packages/cli/src/commands/config/index.test.ts` - Tests config command with real temp dirs and JSON files
  - `packages/control-plane/src/project.test.ts` - Tests project state assembly with real markdown files and directories
  - `packages/cli/src/engine/engine.integration.test.ts` - Tests engine execution with real file operations
  - `packages/cli/src/manifest/manager.test.ts` - Tests manifest loading/saving

Temp directory pattern (from `packages/cli/src/commands/config/index.test.ts`):

```typescript
async function createRepoRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-config-command-'));
  tempDirs.push(root);
  await mkdir(join(root, '.oat'), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs.length = 0;
});
```

**E2E Tests:**

- Framework: Playwright (`@playwright/test` v1.51.1+)
- Usage: Smoke tests for visual companion server
- Example: `packages/cli/src/integration/visual-companion-smoke.test.ts`

## Common Patterns

**Async Testing:**

```typescript
it('assembles a full ProjectState for a project directory', async () => {
  const repoRoot = await createDir('oat-control-plane-project-');
  const projectDir = join(repoRoot, '.oat', 'projects', 'shared', 'demo');

  await mkdir(join(repoRoot, '.oat'), { recursive: true });
  await mkdir(projectDir, { recursive: true });

  await Promise.all([
    writeFile(join(repoRoot, '.oat', 'config.json'), '...', 'utf8'),
    writeFile(join(projectDir, 'state.md'), '...', 'utf8'),
  ]);

  const result = await getProjectState(repoRoot);
  expect(result).toBeDefined();
});
```

(from `packages/control-plane/src/project.test.ts`)

- Test function marked `async`
- `await` used for async operations
- Vitest automatically handles promise rejection
- Cleanup happens in `afterEach()`, not test body

**Error Testing:**

```typescript
it('returns exit code 1 for unknown get keys', async () => {
  const root = await createRepoRoot();
  const { command, capture } = createHarness({ cwd: root });

  await runCommand(command, ['get', 'unknown.key']);

  expect(capture.error[0]).toContain('Unknown config key: unknown.key');
  expect(process.exitCode).toBe(1);
});
```

Or for thrown errors:

```typescript
it('throws CliError for invalid configuration', () => {
  expect(() => {
    someFunction();
  }).toThrow(CliError);
});
```

Catch and inspect errors:

```typescript
it('error() emits structured JSON to stderr in json mode', () => {
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const logger = createLogger({ json: true, verbose: false });

  logger.error('bad', { code: 'E_TEST' });

  const raw = String(stderr.mock.calls[0]?.[0]);
  expect(() => JSON.parse(raw)).not.toThrow();
  const parsed = JSON.parse(raw);
  expect(parsed).toMatchObject({
    type: 'error',
    message: 'bad',
    meta: { code: 'E_TEST' },
  });
});
```

(from `packages/cli/src/ui/logger.test.ts`)

## Test Execution Evidence

From `pnpm --filter @open-agent-toolkit/cli test --run`:

- Total of 550+ tests across CLI package
- Tests organized by module/feature
- Test execution time ranges from 5ms to 2.8s per file (indicating some integration tests are slower)
- All tests currently passing

Test files by size (large tests cover integration scenarios):

- `packages/cli/src/commands/init/index.test.ts` - 1486 lines
- `packages/cli/src/commands/config/index.test.ts` - 1342 lines
- `packages/cli/src/commands/init/tools/index.test.ts` - 1228 lines
- `packages/cli/src/validation/skills.test.ts` - 1067 lines
- Smaller unit tests: 30-200 lines (logger, spinner, error handling)

---

_Testing analysis: 2026-05-17_
