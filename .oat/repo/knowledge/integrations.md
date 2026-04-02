---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 539d8ac2b1ba2d2315bac69753ded87509967c6b
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**Developer Tool Ecosystem:**

- Claude, Cursor, Codex, Copilot, and Gemini provider surfaces are supported as filesystem-based integration targets rather than hosted API integrations.
  - SDK/Client: none at runtime in this repo for those providers
  - Auth: handled externally by the installed tools, not by OAT itself

**Documentation Tooling:**

- Fumadocs - used to build the reference docs app and scaffold similar apps
  - SDK/Client: `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`
  - Auth: none

## Data Storage

**Databases:**

- None

**File Storage:**

- Local filesystem only
- Repo-owned state is stored under `.oat/`, provider directories, and generated assets in `packages/cli/assets/`

**Caching:**

- Turborepo local cache via `.turbo/`
- No dedicated application cache service

## Authentication & Identity

**Auth Provider:**

- None managed by the application itself
  - Implementation: users authenticate with external AI tools or GitHub/npm outside this repo

## Monitoring & Observability

**Error Tracking:**

- None built into the repo

**Logs:**

- CLI logger output to terminal
- CI logs via GitHub Actions

## CI/CD & Deployment

**Hosting:**

- Docs site targets GitHub Pages via `apps/oat-docs`

**CI Pipeline:**

- GitHub Actions CI in `.github/workflows/ci.yml`
- GitHub Actions docs deployment in `.github/workflows/deploy-docs.yml`

## Environment Configuration

**Required env vars:**

- No globally required runtime env vars for core local development
- Common optional vars include:
  - `GIT_HOOKS` for hook setup control
  - `OAT_ASSETS_DIR` for docs/CLI scaffold tests and asset overrides
  - `OAT_PROJECTS_ROOT` for project root overrides

**Secrets location:**

- No active secret-backed runtime integration in the current repo
- npm publishing now targets GitHub OIDC trusted publishing after a one-time
  manual bootstrap under `@open-agent-toolkit/*`

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None at runtime

## Integration Notes

- The CLI integrates primarily with repository layout and local tool installations rather than hosted APIs.
- The docs libraries are conventional npm-style code libraries with framework integrations, not service clients.
- Public package publishing is partially configured: GitHub release workflows
  exist, but the first live publish still requires manual npm bootstrap and
  post-bootstrap trust setup.

---

_Integration audit: 2026-03-24_
