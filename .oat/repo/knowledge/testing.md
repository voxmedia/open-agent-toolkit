---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**

- Vitest `^4.0.18`
- Config examples: `packages/cli/vitest.config.ts`

**Assertion Library:**

- Vitest built-in assertions (`expect`, `describe`, `it`, `vi`)

**Run Commands:**

```bash
pnpm test                           # Run workspace tests
pnpm --filter @oat/cli test         # Run CLI package tests
pnpm --filter @oat/docs-config test # Run docs-config tests
pnpm --filter @oat/docs-transforms test
```

## Test File Organization

**Location:**

- Mostly co-located with implementation files inside package `src/` directories

**Naming:**

- `*.test.ts`

**Structure:**

```text
packages/<pkg>/src/
  module.ts
  module.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
describe('feature or module', () => {
  it('handles the expected behavior', async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**

- Strong unit-test coverage around CLI commands, config helpers, sync logic, and docs transforms
- Integration-style tests exist inside the CLI package for larger command flows
- Tests often exercise filesystem fixtures and generated temp directories rather than heavy mocks

## Mocking

**Framework:** Vitest (`vi.mock`, `vi.fn`, spies)

**Patterns:**

```typescript
vi.mock('fumadocs-mdx/next', () => ({
  createMDX: () => () => ({}),
}));
```

**What to Mock:**

- External framework helpers when package-local behavior is the target
- Environment-sensitive adapters or generated outputs where isolation matters

**What NOT to Mock:**

- Core repo-owned transformation logic unless required for isolation

## Fixtures and Factories

**Test Data:**

- CLI tests use temp directories and fixture trees for real filesystem interactions.
- Docs migrate/init tests include fixture markdown and scaffold templates.

**Location:**

- Usually adjacent to tests or in nearby `fixtures` / `__fixtures__` directories

## Coverage

**Requirements:** No explicit workspace-wide numeric threshold found.

**View Coverage:**

```bash
pnpm --filter @oat/cli test:coverage
```

## Test Types

**Unit Tests:**

- Dominant pattern across CLI and docs packages

**Integration Tests:**

- Present in the CLI for command flows, docs initialization, workflow operations, and filesystem behavior

**E2E Tests:**

- Limited package-level E2E-style tests exist in the CLI package
- No separate browser E2E framework is visible for the docs app

## Common Patterns

**Async Testing:**

```typescript
await someAsyncFunction();
await expect(promise).resolves.toEqual(value);
```

**Error Testing:**

```typescript
await expect(failingCall()).rejects.toThrow();
```

## Gaps

- The docs app itself is validated mostly through build behavior rather than an app-specific test suite.
- Public-package install and publish behavior is not currently covered by automated tests.

---

_Testing analysis: 2026-03-24_
