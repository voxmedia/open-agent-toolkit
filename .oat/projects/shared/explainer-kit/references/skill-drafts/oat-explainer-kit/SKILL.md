---
name: oat-explainer-kit
description: Use inside an OAT repo to produce and publish a team-facing visual explainer set for a project. Thin wrapper — reads the `explainers` block from `.oat/config.json` (+ `.oat/config.local.json` overlay), maps it to EXPLAINER_* vars, and invokes the `explainer-kit` engine. This is what OAT wave-close / program-close calls, usually also handing in a pre-reconciled fact base.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill
user-invocable: true
version: 1.0.0
---

# OAT Explainer Kit

Thin OAT-repo wrapper around the destination-blind **`explainer-kit`** engine. It sources the publish destination from repo config, maps it to the engine's environment contract, then hands off. **All the real work — fact-base reconciliation, drafting, build, render QA, publish — lives in `explainer-kit`.** Read that skill for the engine steps and the full `EXPLAINER_*` contract.

## When to use

- Producing a visual explainer set for a project **from within an OAT repo** that carries an `explainers` config block.
- Called by **OAT wave-close / program-close** to publish the closing explainer set — those flows typically also pass a pre-reconciled fact base (`EXPLAINER_FACT_BASE`), so the engine skips re-federation and runs a light verification pass.

For a run **outside** an OAT repo, or with no config block, use `personal-explainer-kit` instead.

## Config schema — `.oat/config.json`

Read via **plain file reads — never shell out to `oat`.** Read `.oat/config.json`, then overlay `.oat/config.local.json` if present (local keys win). Take the `explainers` block:

```json
{
  "explainers": {
    "artifactsRoot": "/abs/path/to/artifacts",
    "publish": {
      "s3Bucket": "my-bucket",
      "s3Prefix": "explainers",
      "publicBaseUrl": "https://example.net",
      "auth": "sso"
    },
    "lanes": ["companion-notes", "gdocs"],
    "gdocsAccount": "you@example.com"
  }
}
```

`publish`, `lanes`, and `gdocsAccount` are optional. Omit `publish` for a build-only run (engine skips Step 8). Include `gdocsAccount` only when `lanes` contains `gdocs`.

## Workflow

### Step 1 — Load config

Read `.oat/config.json` (+ `.oat/config.local.json` overlay) with plain file reads. Extract the `explainers` block.

**If the file or the `explainers` block is missing:** tell the user exactly what to add — show the JSON snippet above — and **offer to fall back to `personal-explainer-kit`** (which needs no repo config). Do not invent a destination.

### Step 2 — Map to the environment contract

| Config path                        | Env var                     |
| ---------------------------------- | --------------------------- |
| `explainers.artifactsRoot`         | `EXPLAINER_ARTIFACTS_ROOT`  |
| `explainers.publish.s3Bucket`      | `EXPLAINER_S3_BUCKET`       |
| `explainers.publish.s3Prefix`      | `EXPLAINER_S3_PREFIX`       |
| `explainers.publish.publicBaseUrl` | `EXPLAINER_PUBLIC_BASE_URL` |
| `explainers.publish.auth`          | `EXPLAINER_AUTH`            |
| `explainers.lanes` (comma-join)    | `EXPLAINER_LANES`           |
| `explainers.gdocsAccount`          | `EXPLAINER_GDOCS_ACCOUNT`   |

`EXPLAINER_SLUG` is proposed + confirmed during the run (Step 1 of the engine), not read from config. Pass `EXPLAINER_FACT_BASE` when the caller (wave/program close) supplies a reconciled fact base.

### Step 3 — Invoke the engine

Export the mapped vars and invoke the **`explainer-kit`** skill. Everything downstream is the engine's guided, draft-first, gated conversation.

## Notes

- **Never edit provider skill copies or `oat`-managed state to change config** — the destination lives in `.oat/config.json` / `.oat/config.local.json` only.
- Old `oat-explainer-kit` invocations keep working **only inside repos that carry the `explainers` config block**; the run-anywhere behavior moved to `personal-explainer-kit`.
