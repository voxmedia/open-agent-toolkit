# Provider Interop CLI Overview

The provider interop CLI lives in `packages/cli` and manages canonical agent assets under `.agents/`.

## v1 intent

- Canonical source: `.agents/skills` and `.agents/agents`
- Sync managed provider views where required
- Detect drift and strays
- Keep operations safe and explicit (dry-run by default)

## Command surface

- `oat init`
- `oat status`
- `oat sync`
- `oat providers list`
- `oat providers inspect`
- `oat doctor`
