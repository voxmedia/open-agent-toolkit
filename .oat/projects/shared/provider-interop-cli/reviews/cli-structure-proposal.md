---
oat_generated: false
oat_review_scope: design
oat_review_type: guidance
oat_project: .oat/projects/shared/provider-interop-cli
oat_last_updated: 2026-02-13
---

# CLI Structure Proposal: provider-interop-cli

## Scope

This proposal is intentionally limited to CLI organization and tool usage patterns. It does not prescribe provider-sync business logic.

Reference inputs:
- `/Users/thomas.stang/Code/work-chronicler/src/cli`
- `/Users/thomas.stang/Code/vox/dwp-cli/src`

## Recommended Structure

Adopt a command-factory layout with a thin root entrypoint, following the shared pattern from both references.

```text
packages/cli/src/
  index.ts
  app/
    create-program.ts
    command-context.ts
  commands/
    index.ts
    sync/
      index.ts
      apply.ts
      dry-run.ts
      sync.types.ts
      sync.utils.ts
    status/
      index.ts
    providers/
      index.ts
      list.ts
      inspect.ts
      providers.types.ts
    doctor/
      index.ts
  providers/
    claude/
      adapter.ts
      paths.ts
    cursor/
      adapter.ts
      paths.ts
    codex/
      adapter.ts
      paths.ts
    shared/
      adapter.types.ts
      adapter.utils.ts
  config/
    env.ts
    runtime.ts
  shared/
    prompts.ts
    types.ts
    utils.ts
  ui/
    output.ts
    spinner.ts
  validation/
    parse.ts
  fs/
    io.ts
    paths.ts
  errors/
    cli-error.ts
```

## Command Organization Rules

1. Root `index.ts` does only bootstrap + registration.
2. Every top-level command exports `createXCommand(): Command`.
3. Parent commands register subcommands in `commands/<name>/index.ts`.
4. If a command needs prompts/types/utils, it lives in a directory.
5. Keep single-file commands only for trivial read-only operations.
6. Prompt placement:
   - command-specific prompts live with the command
   - for larger commands, use `<command>.prompts.ts` inside that command folder
   - `shared/prompts.ts` is reserved for shared prompt primitives only
7. Validation placement:
   - command/domain validation lives with the command/domain in `*.types.ts`
   - provider adapter validation lives with provider/shared adapter modules
   - `shared/types.ts` is for truly cross-cutting primitives only
8. Utility placement:
   - start with `shared/utils.ts` for small cross-cutting helpers
   - if it grows, split by concern under `shared/utils/` (for example `shared/utils/path.ts`, `shared/utils/text.ts`)
   - keep domain-specific utilities in the owning command/provider module

Example root wiring:

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { createSyncCommand } from '@commands/sync';
import { createStatusCommand } from '@commands/status';
import { createProvidersCommand } from '@commands/providers';
import { createDoctorCommand } from '@commands/doctor';

export function main(): void {
  const program = new Command().name('oat').description('Open Agent Toolkit');
  program.addCommand(createSyncCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createProvidersCommand());
  program.addCommand(createDoctorCommand());
  program.parse();
}
```

## Tool Usage Contract

Use the existing dependency set with explicit ownership:

- `commander`: command graph, options parsing, help output, subcommand registration.
- `@inquirer/prompts`: interactive fallback for missing required args and confirmations.
- `chalk`: semantic output (`info`, `warn`, `error`, `success`) via centralized formatter.
- `ora`: spinner for longer I/O operations only; disable automatically in non-TTY or `--json` mode.
- `zod`: validation boundary for env, user input, adapter config, and disk-loaded documents. Prefer domain-local validation in `*.types.ts` over global schema files.
- `dotenv` (optional): load env from project/user config paths when enabled by runtime policy.
- `gray-matter` + `yaml` (optional): parse frontmatter/config docs only where needed.
- `vitest` (dev dependency): unit + integration test runner for CLI modules and command dispatch behavior.

## Logging Architecture

`dwp-cli` is a strong example of **specialized CLI logging utilities**, especially for HTTP diagnostics:
- `/Users/thomas.stang/Code/vox/dwp-cli/src/utils/log.ts`
- `/Users/thomas.stang/Code/vox/dwp-cli/src/utils/http.ts`

Recommended OAT approach:

1. Create `src/ui/logger.ts` as the single output API for commands.
2. Keep `chalk` formatting centralized in logger methods, not scattered through commands.
3. Add specialized helpers (like `dwp-cli`):
   - `logHttpRequest(...)`
   - `logHttpResponse(...)`
   - `logCurlEquivalent(...)`
   - `highlightPayload(...)`
4. Support output modes:
   - human mode (colors, spacing, spinner integration)
   - json mode (no color/spinner, structured output only)
5. Add level semantics:
   - `debug`, `info`, `warn`, `error`, `success`
6. Add context metadata for verbose/debug mode:
   - command name, provider, path scope, elapsed ms

Suggested logger contract:

```ts
export interface CliLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  json(payload: unknown): void;
  logCurlEquivalent(curl: string): void;
}
```

Important improvement over `dwp-cli`:
- `dwp-cli` has useful shared log helpers, but still many direct `console.log`/`console.error` calls across commands.
- For OAT, enforce “no direct console usage in commands” (except CLI bootstrap fatal fallback) so output remains consistent and testable.

## Prompt Organization Contract

Prompt modules follow command ownership first:

1. Keep prompts in the command folder whenever they are command/domain-specific.
2. Use `*.prompts.ts` naming for larger commands (`sync.prompts.ts`, `providers.prompts.ts`).
3. `src/shared/prompts.ts` should contain only shared, generic wrappers:
   - `confirmAction(...)`
   - `selectWithAbort(...)`
   - `inputRequired(...)`
4. Shared prompt wrappers must not include provider-interop business wording.

## Cross-Cutting Conventions

1. Create path aliases and avoid cross-module `../` imports.
2. All exported functions/classes require concise JSDoc.
3. Use object params for functions with 3+ inputs.
4. Keep command handlers thin; move logic into `providers/*`, domain-local `*.types.ts` (schemas + inferred types), and `fs/*`.
5. Centralize error formatting in `errors/cli-error.ts` and exit mapping in one place.
6. Shared utilities must stay generic; if a helper includes provider-specific logic, move it to that provider module.

## Runtime and UX Conventions

1. Startup order: load runtime config -> validate env with zod -> build command context -> register commands.
2. Add global flags early (`--json`, `--verbose`, `--cwd`).
3. `--json` mode must suppress spinners/colors and print structured output only.
4. Prompts only run when flags are missing and stdin is interactive.
5. Non-interactive mode returns actionable errors with remediation text.

## Testing Shape (Structure-Focused)

Use `vitest` as the default test framework.

1. Unit tests for command factory wiring (`createXCommand` composition).
2. Unit tests for domain-local validation/type modules (`*.types.ts`) and parse helpers.
3. Integration tests for CLI parsing and command dispatch (`oat <cmd> --help`, option handling).
4. Snapshot tests for stable help output on root and key parent commands.
5. Contract tests for adapter interface conformance (one suite reused across providers).
6. Logger behavior tests (human mode vs `--json` mode, color/spinner suppression behavior).

Recommended test layout:

```text
packages/cli/src/
  commands/
    sync/
      index.test.ts
      sync.types.test.ts
    providers/
      providers.types.test.ts
  ui/
    logger.test.ts
  providers/
    shared/
      adapter-contract.test.ts
      adapter.types.test.ts
```

Suggested scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Phased Adoption

1. Scaffold folders and command factories with placeholder handlers.
2. Introduce shared `command-context`, `output`, `spinner`, and `env` modules.
3. Migrate root entrypoint to factory registration.
4. Add provider adapters behind shared interfaces.
5. Enforce import and command-layout conventions in review checklist.

## Why This Matches Your References

- From `work-chronicler`: thin entrypoint, explicit command directory conventions, prompt/util/type modularity.
- From `dwp-cli`: `createXCommand()` factory pattern and domain-based grouping.
- Combined outcome: scalable CLI structure that supports growth without rewriting command wiring.
