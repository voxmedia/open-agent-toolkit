---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Testing Patterns

**Analysis Date:** 2026-02-16

## Test Framework

**Runner:**

- Vitest 4.0.18
- Config: `packages/cli/vitest.config.ts`
- ESM-native with TypeScript support

**Assertion Library:**

- Vitest's built-in `expect()` assertions (Chai-style)
- No additional assertion library needed

**Run Commands:**

```bash
pnpm test              # Run all tests (from repo root)
pnpm test:watch       # Watch mode (re-run on changes)
pnpm test:coverage    # Generate coverage report
vitest run            # Run from package directory
vitest                # Watch mode from package directory
```

## Test File Organization

**Location:**

- Co-located with source files in same directory
- Convention: `<module>.test.ts` pairs with `<module>.ts`
- Example: `src/ui/logger.ts` paired with `src/ui/logger.test.ts`

**Naming:**

- Test files use `.test.ts` suffix (e.g., `logger.test.ts`, `manifest.test.ts`)
- Vitest configuration includes glob: `src/**/*.test.ts`
- Test files excluded from TypeScript compilation (tsconfig)

**Structure:**

```
packages/cli/src/
├── ui/
│   ├── logger.ts
│   ├── logger.test.ts
│   ├── spinner.ts
│   ├── spinner.test.ts
│   └── index.ts
├── manifest/
│   ├── manager.ts
│   ├── manager.test.ts
│   ├── hash.ts
│   ├── hash.test.ts
│   └── index.ts
└── ...
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

describe('CliLogger', () => {
  // Setup (optional)
  beforeEach(() => {
    // Initialize test state
  });

  // Cleanup
  afterEach(() => {
    // Clean up resources
    vi.restoreAllMocks();
  });

  // Individual test case
  it('info() writes to stdout in human mode', () => {
    const logger = createLogger({ json: false, verbose: false });
    logger.info('hello');
    expect(stdout).toHaveBeenCalled();
  });

  // Grouped sub-suites
  describe('loadManifest', () => {
    it('loads valid manifest from disk', async () => {
      /* ... */
    });
    it('returns empty manifest when file does not exist', async () => {
      /* ... */
    });
  });
});
```

**Patterns:**

- Setup: Use `beforeEach()` to initialize shared state (temp directories, mocks)
- Teardown: Use `afterEach()` to clean up resources; always restore mocks with `vi.restoreAllMocks()`
- Assertion pattern: Assert on direct observable behavior, not implementation
- Nested describe blocks: Group related tests by functionality (e.g., describe per exported function)

## Mocking

**Framework:** Vitest's `vi` module

**Patterns:**

1. **Module mocking with vi.mock():**

```typescript
const { oraMock } = vi.hoisted(() => ({
  oraMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: oraMock,
}));

import { createSpinner } from './spinner';

describe('createSpinner', () => {
  beforeEach(() => {
    oraMock.mockReset();
  });

  it('returns ora instance in TTY mode', () => {
    const oraInstance = { start: vi.fn(), stop: vi.fn() };
    oraMock.mockReturnValue(oraInstance);
    const spinner = createSpinner('Loading', {
      json: false,
      interactive: true,
    });
    expect(spinner).toBe(oraInstance);
  });
});
```

2. **Spy pattern (spyOn):**

```typescript
import { vi } from 'vitest';

it('info() writes to stdout', () => {
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const logger = createLogger({ json: false, verbose: false });
  logger.info('hello');
  expect(stdout).toHaveBeenCalled();
  expect(String(stdout.mock.calls[0]?.[0])).toContain('hello');
});
```

3. **Mock function creation:**

```typescript
const detect = vi.fn(async () => true);
const adapter: ProviderAdapter = {
  name: 'claude',
  detect,
  // ... other fields
};
```

**What to Mock:**

- External modules (e.g., `ora`, file system when not testing filesystem)
- Third-party library dependencies
- Global objects/processes (e.g., `process.stdout`, `process.stderr`)
- Functions whose behavior is non-deterministic or slow

**What NOT to Mock:**

- Internal application code being tested
- Schemas/validators (test real validation)
- Zod types (they're lightweight)
- Error handling paths (test actual error classes)
- File system operations when testing file-based functionality (use temp directories instead)

## Fixtures and Factories

**Test Data:**

1. **Factory function pattern:**

```typescript
function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: new Date().toISOString(),
    ...overrides,
  };
}
```

2. **Hardcoded fixtures:**

```typescript
const validManifest = {
  version: 1,
  oatVersion: '0.1.0',
  entries: [
    {
      canonicalPath: '.agents/skills/example',
      providerPath: '.claude/skills/example',
      provider: 'claude',
      contentType: 'skill',
      strategy: 'symlink',
      contentHash: null,
      lastSynced: '2026-02-13T00:00:00.000Z',
    },
  ],
  lastUpdated: '2026-02-13T00:00:00.000Z',
};
```

3. **Async test data generation (filesystem):**

```typescript
async function seedSkill(root: string, relativePath: string): Promise<void> {
  const skillDir = join(root, relativePath);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# skill\n', 'utf8');
}
```

**Location:**

- Inline factories defined at test file scope (not shared across files)
- Temporary directories created per-test with `mkdtemp()` from `node:os`
- Cleaned up in `afterEach()` with `rm(dir, { recursive: true, force: true })`

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**

```bash
pnpm test:coverage
```

- Generates coverage reports in project's coverage directory
- oxlint linting ensures code quality (preferred over pure coverage metrics)

## Test Types

**Unit Tests:**

- Scope: Single function/module in isolation
- Approach: Test observable behavior, use mocks for dependencies
- Example: `logger.test.ts` tests `createLogger()` by mocking stdout/stderr
- Assertions: Verify return values, side effects (spied calls), error behavior

**Integration Tests:**

- Scope: Multiple modules working together
- Approach: Test real file system, schemas, error propagation
- Example: `manifest/manager.test.ts` tests loading/saving to temp directories
- No mocking of core system modules; test real behavior

**E2E Tests:**

- Framework: Not used (CLI tested via command integration)
- Alternative: Commands tested through API surface (see `commands/*.test.ts`)

## Common Patterns

**Async Testing:**

```typescript
it('returns defaults when no config file exists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-config-'));
  tempDirs.push(root);
  const configPath = join(root, '.oat', 'sync', 'config.json');

  const config = await loadSyncConfig(configPath);

  expect(config).toEqual(DEFAULT_SYNC_CONFIG);
});

// With error assertion
it('rejects invalid config with CliError', async () => {
  // ... setup
  await expect(loadSyncConfig(configPath)).rejects.toBeInstanceOf(CliError);
});
```

**Error Testing:**

```typescript
it('throws CliError on corrupt JSON', async () => {
  await mkdir(join(workDir, '.agents'), { recursive: true });
  await writeFile(manifestPath, '{"bad":', 'utf8');

  await expect(loadManifest(manifestPath)).rejects.toBeInstanceOf(CliError);
});

// With message matching
it('throws CliError on schema validation failure', async () => {
  // ... setup invalid data
  await expect(loadManifest(manifestPath)).rejects.toMatchObject({
    message: expect.stringContaining('version'),
  });
});

// Testing error conditions with spies
it('handles error during file operations', () => {
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {
    throw new Error('Write failed');
  });
  // test error handling
  expect(spy).toHaveBeenCalled();
});
```

**Temp Directory Management:**

```typescript
describe('test suite', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('uses temp directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'oat-test-'));
    tempDirs.push(dir);
    // test with directory
  });
});
```

---

_Testing analysis: 2026-02-16_
