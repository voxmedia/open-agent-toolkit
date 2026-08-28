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

# External Integrations

**Analysis Date:** 2026-08-19

## APIs & External Services

**GitHub:**

- GitHub GraphQL API - collects merged pull-request review comments and pagination data (`packages/cli/src/commands/repo/pr-comments/collect/graphql-queries.ts`, `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`).
  - SDK/Client: GitHub CLI `gh api graphql`, invoked through Node `execFile` (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`).
  - Auth: delegated to the local `gh` authentication; no application token variable is read in the collector (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`).
- GitHub Actions, Releases, and Pages - CI gates, npm release automation, GitHub Release creation, and docs hosting (`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/deploy-docs.yml`).
  - SDK/Client: GitHub Actions and first-party/marketplace actions (`.github/workflows/release.yml`, `.github/workflows/deploy-docs.yml`).
  - Auth: workflow `contents`, `pages`, and OIDC permissions (`.github/workflows/release.yml`, `.github/workflows/deploy-docs.yml`).

**npm:**

- npm registry - interactive CLI update checks request the latest published CLI version (`packages/cli/src/app/update-notifier.ts`).
  - SDK/Client: Node global `fetch` with a 1.5-second timeout (`packages/cli/src/app/update-notifier.ts`).
  - Auth: no credential; the endpoint is the public registry URL in source (`packages/cli/src/app/update-notifier.ts`).
- npm publish - release workflow checks package versions and publishes public tarballs (`.github/workflows/release.yml`, `packages/*/package.json`).
  - SDK/Client: `npm view`, `npm publish`, and pnpm pack (`.github/workflows/release.yml`).
  - Auth: npm trusted publishing through GitHub OIDC (`.github/workflows/release.yml`).

**HTTP documentation targets:**

- Documentation link checker - crawls the deployed docs URL and optionally checks external links with HTTP `HEAD`/`GET` requests (`tools/docs/check-links.ts`).
  - SDK/Client: Node global `fetch`, with Playwright available for the link-checking toolchain (`tools/docs/check-links.ts`, `package.json`).
  - Auth: no credential is configured; requests use the `oat-link-checker/1.0` user-agent (`tools/docs/check-links.ts`).

**AWS S3:**

- S3 archive storage - optional project archive synchronization and completion-time upload (`.oat/config.json`, `scripts/sync-archived-projects-from-s3.sh`, `packages/cli/src/commands/project/archive/archive-utils.ts`).
  - SDK/Client: AWS CLI `aws s3 sync` and `aws sts get-caller-identity`, spawned by Node or Bash (`scripts/sync-archived-projects-from-s3.sh`, `packages/cli/src/commands/project/archive/archive-utils.ts`).
  - Auth: `archive.awsProfile`/`archive.awsRegion` map to `AWS_PROFILE`/`AWS_REGION`; credentials remain in the AWS CLI environment (`packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/project/archive/archive-utils.ts`).
- Explainer static publishing - supported `s3-static` provider, S3 destination, public base URL, and access-mode configuration (`packages/cli/src/commands/config/index.ts`, `tools/release/validate-explainer-acceptance.mjs`).
  - SDK/Client: Not detected for the explainer publisher in this repository; the configuration and acceptance validator identify the provider contract (`packages/cli/src/commands/config/index.ts`, `tools/release/validate-explainer-acceptance.mjs`).
  - Auth: local or user AWS profile configuration is defined for the publishing contract (`packages/cli/src/commands/config/index.ts`).

**Agent Provider Runtimes:**

- Codex, Claude, Cursor IDE, and Cursor CLI - smoke harnesses launch provider executables for workflow verification (`tools/smoke/runner/drive.mjs`, `tools/smoke/runner/preflight.mjs`).
  - SDK/Client: provider command-line executables, with deterministic Node provider as a local alternative (`tools/smoke/runner/drive.mjs`, `tools/smoke/deterministic/provider.mjs`).
  - Auth: provider-local authentication; Cursor isolated runs use `CURSOR_API_KEY` through a filesystem credential broker (`tools/smoke/runner/cursor-broker-launch.mjs`, `tools/smoke/runner/cursor-broker-client.mjs`).

## Data Storage

**Databases:**

- Not detected. The package manifests list filesystem/config parsers and no database driver or ORM (`packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`).

**File Storage:**

- Local filesystem - `.oat` project state, generated docs, provider assets, smoke reports, and update-notifier cache are written/read locally (`.oat/config.json`, `packages/cli/src/fs`, `tools/smoke/reports`, `packages/cli/src/app/update-notifier.ts`).
- Amazon S3 - optional remote archive and explainer artifact destination (`.oat/config.json`, `scripts/sync-archived-projects-from-s3.sh`, `packages/cli/src/commands/project/archive/archive-utils.ts`).

**Caching:**

- Update-check cache - local JSON cache with 24-hour check and 72-hour notice TTLs (`packages/cli/src/app/update-notifier.ts`).
- Static docs search - build-time/static FlexSearch integration, not a remote cache (`packages/docs-config/src/search-config.ts`, `apps/oat-docs/app/api/search/route.ts`).

## Authentication & Identity

**Auth Provider:**

- Provider-specific/local authentication rather than an application identity service - `gh` supplies GitHub auth, AWS CLI supplies S3 auth, and provider CLIs supply agent-runtime auth (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, `packages/cli/src/commands/project/archive/archive-utils.ts`, `tools/smoke/runner/preflight.mjs`).
- Cursor smoke credential broker - parent process reads `CURSOR_API_KEY`, removes it from the driven process, and injects it only into `cursor-agent` children (`tools/smoke/runner/cursor-broker-launch.mjs`).

## Monitoring & Observability

**Error Tracking:**

- Not detected. No hosted error-tracking SDK appears in the package manifests; failures are handled through thrown errors, warnings, and test assertions (`package.json`, `packages/cli/package.json`, `packages/cli/src/commands/project/archive/archive-utils.ts`).

**Logs:**

- CLI command logs use the OAT logger and optional JSON output (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, `packages/cli/src/ui/logger.ts`).
- CI and release diagnostics use GitHub Actions step output; smoke harnesses persist JSON/Markdown evidence under repository report directories (`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `tools/smoke/reports`).

## CI/CD & Deployment

**Hosting:**

- GitHub Pages hosts the built `apps/oat-docs` site (`.github/workflows/deploy-docs.yml`, `apps/oat-docs/next.config.js`).
- npm hosts the five public `@open-agent-toolkit/*` package artifacts (`.github/workflows/release.yml`, `packages/cli/package.json`, `packages/control-plane/package.json`).
- S3 is a configured but optional archive/explainer destination (`.oat/config.json`, `packages/cli/src/commands/config/index.ts`).

**CI Pipeline:**

- GitHub Actions runs install, check, type-check, test, build, skill/package validation, release validation, and docs build (`.github/workflows/ci.yml`).
- Release workflow creates tags, publishes npm packages in lockstep, and creates GitHub Releases (`.github/workflows/release.yml`).
- Docs workflow builds and deploys the Pages artifact on relevant main-branch changes (`.github/workflows/deploy-docs.yml`).

## Environment Configuration

**Required env vars:**

- `CURSOR_API_KEY` is required only when the Cursor credential broker is used (`tools/smoke/runner/cursor-broker-launch.mjs`).
- `OAT_SMOKE_CURSOR_BROKER_DIRECTORY` is set for brokered child processes (`tools/smoke/runner/cursor-broker-launch.mjs`, `tools/smoke/runner/cursor-broker-client.mjs`).
- `AWS_PROFILE` and `AWS_REGION` are conditional archive/publish overrides; configured OAT values are forwarded into them (`packages/cli/src/commands/project/archive/archive-utils.ts`, `packages/cli/src/commands/config/index.ts`).
- `CI`, `NO_UPDATE_NOTIFIER`, and provider-specific runtime variables control update-notifier eligibility and smoke behavior (`packages/cli/src/app/update-notifier.ts`, `tools/smoke/runner/preflight.mjs`).

**Secrets location:**

- GitHub Actions uses workflow identity/OIDC permissions for Pages and npm trusted publishing (`.github/workflows/deploy-docs.yml`, `.github/workflows/release.yml`).
- Local GitHub, AWS, and provider credentials are delegated to the corresponding CLI/environment; no credential values are checked into repository configuration (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, `packages/cli/src/commands/project/archive/archive-utils.ts`, `tools/smoke/runner/cursor-broker-launch.mjs`).

## Webhooks & Callbacks

**Incoming:**

- No inbound webhook endpoint detected. The only application route is a static Fumadocs search GET route (`apps/oat-docs/app/api/search/route.ts`).

**Outgoing:**

- GitHub GraphQL requests, npm registry fetches, AWS CLI S3/STS calls, and provider CLI subprocesses are initiated by local commands or CI (`packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`, `packages/cli/src/app/update-notifier.ts`, `packages/cli/src/commands/project/archive/archive-utils.ts`, `.github/workflows/release.yml`).

---

_Integration audit: 2026-08-19_
