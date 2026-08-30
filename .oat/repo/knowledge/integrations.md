---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# External Integrations

**Analysis Date:** 2026-08-30

## APIs & External Services

**Agent-provider command-line clients:**

- OpenAI Codex CLI — OAT selects `codex exec` as its built-in default execution target in `packages/cli/src/config/oat-config.ts` and probes `codex` availability/model support in `packages/cli/src/providers/identity/availability.ts`.
  - SDK/Client: local `codex` executable; no OpenAI HTTP SDK appears in `packages/cli/package.json`.
  - Auth: inherited Codex CLI session/environment identity (`CODEX_THREAD_ID` or `CODEX_SESSION_ID`) recognized in `packages/cli/src/commands/gate/route.ts`; credentials are not persisted by OAT in that source.
- Anthropic Claude Code — OAT selects `claude -p` as a built-in execution target in `packages/cli/src/config/oat-config.ts` and detects the provider's project surface in `packages/cli/src/providers/claude/adapter.ts`.
  - SDK/Client: local `claude` executable; no Anthropic HTTP SDK appears in `packages/cli/package.json`.
  - Auth: runtime detection uses `CLAUDECODE` in `packages/cli/src/config/oat-config.ts` and `packages/cli/src/commands/gate/route.ts`; credentials are not persisted by OAT in that source.
- Cursor Agent — OAT uses `cursor-agent -p` as a built-in target in `packages/cli/src/config/oat-config.ts`; model validation runs the executable in `packages/cli/src/providers/identity/availability.ts`.
  - SDK/Client: local `cursor-agent` executable.
  - Auth: optional `CURSOR_API_KEY` is passed as `--api-key` only for cursor-agent catalog/task probing in `packages/cli/src/providers/identity/availability.ts`; the smoke broker also requires its presence in `tools/smoke/runner/cursor-broker-launch.mjs`.

**GitHub:**

- GitHub CLI and GraphQL API — PR-comment collection invokes `gh api graphql` in `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`; project link refresh invokes `gh pr view` and `gh pr edit` in `packages/cli/src/commands/project/links/refresh.ts`.
  - SDK/Client: local `gh` executable, with no GitHub SDK package listed in `packages/cli/package.json`.
  - Auth: delegated to the installed/authenticated GitHub CLI; no repository `GITHUB_TOKEN` read is detected in `packages/cli/src/**`.
- GitHub Actions and Pages — CI is defined in `.github/workflows/ci.yml`; the static docs site is uploaded and deployed through GitHub Pages in `.github/workflows/deploy-docs.yml`.

**npm registry:**

- npm registry — the CLI's interactive update notifier fetches `https://registry.npmjs.org/@open-agent-toolkit%2fcli/latest` with a 1.5-second timeout in `packages/cli/src/app/update-notifier.ts`.
  - SDK/Client: Node built-in `fetch` in `packages/cli/src/app/update-notifier.ts`.
  - Auth: none for the public latest-version lookup; update checks can be disabled by user configuration as evaluated in `packages/cli/src/app/update-notifier.ts`.
- npm publishing — public package tarballs are published by `npm publish` in `.github/workflows/release.yml` using GitHub OIDC permissions (`id-token: write`), not a named repository token.

**AWS archival storage:**

- Amazon S3 through the AWS CLI — project archive operations construct `aws s3 sync` calls in `packages/cli/src/commands/project/archive/archive-utils.ts`; explicit archive syncing runs AWS preflight and sync commands in `packages/cli/src/commands/project/archive/sync-runner.ts`.
  - SDK/Client: local `aws` executable; no AWS SDK package is declared in `packages/cli/package.json`.
  - Auth: AWS CLI credential resolution; `archive.awsProfile` and `archive.awsRegion` become `AWS_PROFILE` and `AWS_REGION` for archive subprocesses in `packages/cli/src/commands/project/archive/archive-utils.ts`.

## Data Storage

**Databases:**

- Not detected. No database client/ORM dependency is declared in root `package.json` or any `packages/*/package.json`; runtime state is read and written as local files by modules such as `packages/cli/src/fs/io.ts` and `packages/cli/src/config/oat-config.ts`.

**File Storage:**

- Local filesystem — CLI configuration and update-check cache reside under the user's `.oat` directory; the cache path is built as `~/.oat/update-check.json` in `packages/cli/src/app/update-notifier.ts`.
- Optional Amazon S3 archival storage — archive configuration and S3 URI construction are implemented in `packages/cli/src/commands/project/archive/archive-utils.ts`.

**Caching:**

- Filesystem cache — update-notification metadata is stored in `~/.oat/update-check.json` with 24-hour check and 72-hour notification TTLs in `packages/cli/src/app/update-notifier.ts`.
- Build cache — Turborepo task caching is configured in `turbo.json`; GitHub Actions caches the pnpm store in `.github/actions/setup-pnpm/action.yml`.

## Authentication & Identity

**Auth Provider:**

- Provider-native CLI authentication — Codex, Claude Code, Cursor Agent, GitHub CLI, and AWS CLI own their respective authentication flows. OAT invokes/probes their local executables in `packages/cli/src/providers/identity/availability.ts`, `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, and `packages/cli/src/commands/project/archive/archive-utils.ts`.
  - Implementation: OAT passes process environment to child processes and records provider runtime signals in `packages/cli/src/config/oat-config.ts` and `packages/cli/src/commands/gate/route.ts`; no OAT-hosted login service or custom user database is detected.

## Monitoring & Observability

**Error Tracking:**

- Not detected. No error-tracking SDK is declared in `package.json`, `packages/*/package.json`, or `apps/oat-docs/package.json`.

**Logs:**

- CLI console/JSON logging is supplied through command context and logger types used by `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`; the repository does not declare an external log ingestion client in its package manifests.
- GitHub Actions retains workflow execution output for CI, docs deployment, and release through `.github/workflows/ci.yml`, `.github/workflows/deploy-docs.yml`, and `.github/workflows/release.yml`.

## CI/CD & Deployment

**Hosting:**

- GitHub Pages — `apps/oat-docs` is a static export via `packages/docs-config/src/next-config.ts`, and `.github/workflows/deploy-docs.yml` uploads `apps/oat-docs/out` to the Pages deployment action.

**CI Pipeline:**

- GitHub Actions — `.github/workflows/ci.yml` runs install, check, type-check, test, build, release validation, and docs build on `main` pushes and pull requests.
- npm release pipeline — `.github/workflows/release-dry-run.yml` verifies package tarballs and npm version availability; `.github/workflows/release.yml` tags, publishes lockstep packages, and creates a GitHub Release.

## Environment Configuration

**Required env vars:**

- No universally required application environment variable is detected in `packages/cli/src/**` or `apps/oat-docs/**`; core configuration is file-backed by `packages/cli/src/config/oat-config.ts`.
- Optional integration variables are `CURSOR_API_KEY` for Cursor agent probing (`packages/cli/src/providers/identity/availability.ts`), `AWS_PROFILE`/`AWS_REGION` for AWS archive subprocesses (`packages/cli/src/commands/project/archive/archive-utils.ts`), and `OAT_ASSETS_DIR` for a bundled-assets override (`packages/cli/src/fs/assets.ts`).

**Secrets location:**

- Not stored in tracked repository configuration. `.mcp.json` is ignored by `.gitignore`, and `.claude/settings.local.json` is ignored by the configured global Git excludes file in this checkout.
- AWS raw credentials remain the responsibility of the AWS CLI environment, while OAT only forwards profile/region selection in `packages/cli/src/commands/project/archive/archive-utils.ts`.

## Webhooks & Callbacks

**Incoming:**

- Not detected. The only application route found is the static Fumadocs search route in `apps/oat-docs/app/api/search/route.ts`; it exports a generated GET handler and does not process external webhook payloads.

**Outgoing:**

- Not detected for generic webhooks. Explicit outbound mechanisms are npm-registry `fetch` in `packages/cli/src/app/update-notifier.ts`, `gh`/GitHub API calls in `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, and AWS CLI archive commands in `packages/cli/src/commands/project/archive/archive-utils.ts`.

---

_Integration audit: 2026-08-30_
