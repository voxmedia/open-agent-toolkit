# Quickstart

## Prerequisites

- Node.js 22.17.0+
- pnpm 10.13.1+

## Setup

```bash
pnpm install
pnpm run cli -- --help
```

## Sync provider views

```bash
pnpm run cli -- sync --scope all --apply
```

## Typical workflow

1. Open/check active project: `oat-open-project` or `oat-progress`
2. Create/update artifacts through lifecycle skills
3. Implement with `oat-implement`
4. Review via `oat-request-review` and `oat-receive-review`
5. Create PR with `oat-pr-project`
6. Complete lifecycle with `oat-complete-project`
