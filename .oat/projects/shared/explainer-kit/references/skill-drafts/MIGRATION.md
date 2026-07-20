# Migration runbook — `oat-explainer-kit` 0.4.1 → the three-skill split

Laptop-session runbook for retiring the monolithic `oat-explainer-kit` 0.4.1 and installing the refactored trio: **`explainer-kit`** (destination-blind engine) + **`oat-explainer-kit`** (OAT-repo wrapper) + **`personal-explainer-kit`** (run-anywhere wrapper). These drafts live in this `skills-draft/` dir; final installation happens on the laptop.

## What changed

- The whole engine — fact-base reconciliation, drafting, build, render QA, publish — moved into **`explainer-kit`**, which reads **no config**. It takes everything as `EXPLAINER_*` environment variables. Unset publish vars ⇒ build-only run.
- The two old hardcoded destinations (voxops bucket, personal vault) became **wrappers** that resolve the vars and call the engine: `oat-explainer-kit` from `.oat/config.json`, `personal-explainer-kit` from interactive presets.

## Step 1 — Back up the current skill

Before touching anything, snapshot the live 0.4.1:

```bash
cp -R ~/.agents/skills/oat-explainer-kit ~/oat-explainer-kit-0.4.1.bak
# (also wherever the OAT pack copy lives, if applicable)
```

Confirm the backup has `SKILL.md` (version 0.4.1), `scripts/`, `references/`, `templates/`.

## Step 2 — Install the three drafts

Copy each draft into place. **Placement:**

| Skill                    | Scope            | Destination                                                                       |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------- |
| `explainer-kit`          | **user**         | `~/.agents/skills/explainer-kit/`                                                 |
| `personal-explainer-kit` | **user**         | `~/.agents/skills/personal-explainer-kit/`                                        |
| `oat-explainer-kit`      | OAT pack (later) | staged for the OAT project-management pack; do **not** hand-edit installed copies |

```bash
cp -R skills-draft/explainer-kit ~/.agents/skills/explainer-kit
cp -R skills-draft/personal-explainer-kit ~/.agents/skills/personal-explainer-kit
# oat-explainer-kit: land it in the OAT pack source, then let the pack tooling distribute it.
```

Then refresh provider views (`oat sync --scope all`, or `pnpm run skills:user-install` for the user-scoped pair). Remove the old monolithic `oat-explainer-kit` **only after** the new `oat-explainer-kit` wrapper is in place, so repos that call it keep resolving.

### Personal presets

`personal-explainer-kit` ships `presets.example.json`. On the laptop, copy it to `presets.json` (gitless, personal) and fill in real values — especially the `personal-oat` preset's `publicBaseUrl` placeholder (`https://PLACEHOLDER.cloudfront.net`):

```bash
cd ~/.agents/skills/personal-explainer-kit
cp presets.example.json presets.json   # then edit; keep presets.json out of git
```

## Step 3 — Smoke-test each (build-only is the cheap test)

A **build-only run** — publish vars unset — builds + verifies locally and publishes nothing. Use it as the cheap end-to-end check for all three.

1. **`explainer-kit` directly:** set only `EXPLAINER_SLUG` + `EXPLAINER_ARTIFACTS_ROOT` (leave `EXPLAINER_S3_BUCKET` / `EXPLAINER_PUBLIC_BASE_URL` / `EXPLAINER_AUTH` unset), invoke it, confirm it builds into the artifacts dir and **stops before Step 8** (no publish). Also dry-run the scripts:
   ```bash
   EXPLAINER_ARTIFACTS_ROOT=/tmp/xk-smoke CHECK_ONLY=1 ~/.agents/skills/explainer-kit/scripts/render-qa.sh
   ```
2. **`personal-explainer-kit`:** run it, pick a preset (or "custom"), leave publish fields blank → confirm it maps vars and reaches the engine in build-only mode. Then try the `work-voxops` preset to confirm it reproduces the **old run-anywhere behavior**.
3. **`oat-explainer-kit`:** run it inside a repo that has an `explainers` block in `.oat/config.json` → confirm it reads the block (plain file read, no `oat` shell-out), maps vars, invokes the engine. In a repo **without** the block, confirm it prints the JSON snippet to add and offers the `personal-explainer-kit` fallback.

## Step 4 — Behavior notes to verify

- **Old `oat-explainer-kit` invocations keep working only inside repos that carry the `explainers` config block.** A bare repo with no block now prompts for config instead of publishing to voxops by default.
- **The old run-anywhere default** (publish to the voxops bucket from anywhere) is now the **`work-voxops` preset** in `personal-explainer-kit`, not a hardcoded default.
- The bundled templates (`house-style.html`, `deck-shell.html`, `workflow-build-verify.js`) still carry example `open-agent-toolkit.voxops.net` URLs — intentional worked starting points; the publish destination itself is fully parameterized via `EXPLAINER_PUBLIC_BASE_URL`.

## Rollback

If anything misbehaves, restore `~/oat-explainer-kit-0.4.1.bak` over `~/.agents/skills/oat-explainer-kit`, remove the two new user-scope skills, and re-run `oat sync --scope all`.
