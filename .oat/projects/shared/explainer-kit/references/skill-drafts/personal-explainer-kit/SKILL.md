---
name: personal-explainer-kit
description: Use anywhere — no repo, no OAT required — to produce and publish a team-facing visual explainer set. Thin interactive wrapper around the `explainer-kit` engine — pick a saved destination preset (or answer a few questions for a custom one), then invoke the engine. Maintains named presets in this skill dir.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, AskUserQuestion
user-invocable: true
version: 1.0.0
---

# Personal Explainer Kit

Thin **run-anywhere** wrapper around the destination-blind **`explainer-kit`** engine. No repo and no OAT config needed — it maintains named destination presets and asks for anything missing, then hands off. **All the real work — fact-base reconciliation, drafting, build, render QA, publish — lives in `explainer-kit`.** Read that skill for the engine steps and the full `EXPLAINER_*` contract.

## When to use

- Producing a visual explainer set **outside an OAT repo**, or on a machine with no `.oat/config.json`.
- The old run-anywhere behavior of the previous `oat-explainer-kit` — covered here via the `work-voxops` preset.

Inside an OAT repo with an `explainers` config block, prefer `oat-explainer-kit`.

## Presets

Presets live in **`presets.json`** in this skill dir — a **personal, gitless** file (do not commit it). Ship reference: **`presets.example.json`** (copy it to `presets.json` and edit). Each preset is a full `EXPLAINER_*` var set keyed by name:

- `artifactsRoot` · `s3Bucket` · `s3Prefix` · `publicBaseUrl` · `auth` · `lanes` (array) · `gdocsAccount`

`artifactsRoot` is commonly left empty and asked per-run. `EXPLAINER_SLUG` and `EXPLAINER_FACT_BASE` are **always per-run**, never stored in a preset. The example ships two illustrative presets: `work-voxops` (voxops bucket, SSO, companion-notes + gdocs lanes) and `personal-oat` (personal bucket + `explainers` prefix, profile auth, no lanes).

## Workflow

### Step 1 — Pick a preset

Read `presets.json` (fall back to `presets.example.json` if it doesn't exist yet, and tell the user to save their own). **List the presets** and ask the user to pick one or choose **"custom"** (use `AskUserQuestion`).

### Step 2 — Fill in the vars

- **Preset chosen:** load its fields. Ask only for anything empty/required (usually `artifactsRoot`).
- **Custom:** ask the questions — artifacts root? publish where (bucket / prefix / public base URL / auth `sso`|`profile[:name]`)? which lanes (`companion-notes`, `gdocs`)? gdocs account (only if the `gdocs` lane is on)? Leave the publish fields blank for a **build-only run**.
- Then **offer to save the answers as a new named preset** in `presets.json`.

### Step 3 — Map to the environment contract

| Preset field         | Env var                     |
| -------------------- | --------------------------- |
| `artifactsRoot`      | `EXPLAINER_ARTIFACTS_ROOT`  |
| `s3Bucket`           | `EXPLAINER_S3_BUCKET`       |
| `s3Prefix`           | `EXPLAINER_S3_PREFIX`       |
| `publicBaseUrl`      | `EXPLAINER_PUBLIC_BASE_URL` |
| `auth`               | `EXPLAINER_AUTH`            |
| `lanes` (comma-join) | `EXPLAINER_LANES`           |
| `gdocsAccount`       | `EXPLAINER_GDOCS_ACCOUNT`   |

`EXPLAINER_SLUG` is proposed + confirmed during the run; `EXPLAINER_FACT_BASE` is passed only if you already have a reconciled fact base to hand in.

### Step 4 — Invoke the engine

Export the mapped vars and invoke the **`explainer-kit`** skill. Everything downstream is the engine's guided, draft-first, gated conversation.

## Notes

- Leaving `s3Bucket` / `publicBaseUrl` / `auth` unset ⇒ a **build-only run** (artifacts built + verified locally, nothing published) — the cheapest smoke test.
- Keep `presets.json` out of version control; it holds personal destinations + accounts.
