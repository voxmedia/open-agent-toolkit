---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: p05
oat_review_type: code
oat_project: .oat/projects/shared/aws-profile
---

# Code Review: p05 (docs + lockstep release validation)

**Reviewed:** 2026-04-28
**Scope:** Phase 5 — p05-t01 (docs) and p05-t02 (lockstep version bump)
**Files reviewed:** 8
**Commits:** 0d11d304..6421d5a5 (2 commits)

## Verdict

**PASS.** Phase 5 implements docs and the lockstep bump cleanly. All five publishable packages and the bundled asset are aligned at 0.0.53, the new `archive.awsProfile` / `archive.awsRegion` keys and the `--profile` / `--region` flags are documented accurately with a precedence section, the raw-access-key out-of-scope decision is preserved verbatim, and there is no drift outside the declared file set. The patch-vs-minor choice matches repo precedent for the 0.0.x series.

## Summary

The two commits do exactly what the plan called for and nothing else:

- `0d11d304` adds the new keys, examples, and a "Credential resolution" precedence subsection to `configuration.md`, and appends the two keys plus a one-paragraph forward-pointer to `config-and-local-state.md`.
- `6421d5a5` bumps `cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms` from 0.0.52 to 0.0.53 and updates `packages/cli/assets/public-package-versions.json` accordingly. (As an incidental win, this commit also closes a pre-existing minor drift where the asset file had been one patch behind the package.json files at 0.0.51 vs 0.0.52; both now agree at 0.0.53.)

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

- **Asset file omits `control-plane` (intentional, but worth noting)** (`packages/cli/assets/public-package-versions.json:1`)
  - Observation: The asset only carries `cli`, `docs-config`, `docs-theme`, `docs-transforms` — not `control-plane`. This is intentional (the asset feeds `OAT_DEP_PACKAGES` in `packages/cli/src/commands/docs/init/scaffold.ts:108-113`, which is the docs-scaffolder's dependency list, not the lockstep release set), and `release:validate` whitelists this file via the version-policy ignore (`packages/cli/src/release/public-package-contract.test.ts:228`).
  - Suggestion: No change required for this PR. If a future reviewer spends time wondering why control-plane is missing, a one-line comment in the asset file (e.g., a sibling `_comment` key, or a doc reference) would shorten the next investigation.

## Requirements / Plan Alignment

**Evidence sources used:** `discovery.md`, `plan.md` (quick mode — no `spec.md` / `design.md` per workflow_mode).

### Task Coverage

| Task    | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p05-t01 | implemented | Both files updated. Configuration.md adds the two keys to the archive list (lines 86-87), the `oat config set` example (lines 106-107), the inheritance behavior bullet (line 117), and a full "Credential resolution" subsection (lines 119-137). config-and-local-state.md adds the keys (lines 60-61) and a one-paragraph summary of forwarding + precedence + raw-key out-of-scope decision (line 63). |
| p05-t02 | implemented | All five package.json files at 0.0.53. `public-package-versions.json` updated to match. Patch bump matches repo precedent (e.g., `bc5daa56` shipped `feat: add oat-docs-bootstrap` as 0.0.38 patch; `cb33c0fd` shipped `feat: move project completion state mutation into cli` as a patch; the entire 0.0.x series uses patches for both feat and chore commits).                                          |

### Discovery Decisions Honored

- **Decision #1 (Auth model: profile-based only, raw keys out of scope):** Captured explicitly in both docs files. configuration.md line 137: "Raw access keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and friends) remain a shell-environment concern. OAT does not expose config keys for them …". config-and-local-state.md line 63 has the same point in shorter form.
- **Decision #3 (Precedence flag > shell env > config):** Documented identically in both files. configuration.md "Credential resolution" subsection lists the exact ordering (lines 121-125). config-and-local-state.md line 63 inlines "(flag > shell env > config)".
- **Decision #5 (Per-invocation flags only on `archive sync`, not `oat-project-complete`):** Documented at configuration.md line 135: "`oat-project-complete` does not accept per-invocation flags. Set the shared config (or your shell env) ahead of time …".
- **Constraint (lockstep release):** All five public packages bumped together; release:validate green per implementer report.

### Extra Work (not in declared requirements)

None. The diff is exactly the eight files declared in the scope, with no ancillary edits.

## Implementation Quality Notes

- **Docs accuracy vs implementation:** The flag names documented (`--profile <profile>`, `--region <region>`) match the actual `Command.option` definitions in `packages/cli/src/commands/project/archive/index.ts:320-321`. The list of `aws` subcommands cited (`aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync`) matches the spawn surface the env is forwarded to.
- **Tone / style:** Edits follow the existing documentation voice and code-fence conventions in both files. The new "Credential resolution" subsection uses an h3, consistent with sibling sections.
- **Version harmony:** Pre-bump state showed asset at 0.0.51 while package.jsons were at 0.0.52 — a pre-existing one-patch lag tolerated by release-validate's ignore list. The bump commit cleanly resolves both to 0.0.53; no follow-up needed.
- **Patch vs minor:** Plan p05-t02 Step 1 suggested `minor` for new public CLI flags + config keys, but the implementer chose `patch` citing 0.0.x repo precedent. Verified: feature-bearing 0.0.x bumps in this repo (e.g., 0.0.38 docs-bootstrap, 0.0.32 cli entrypoint repair w/ feat preceding it, 0.0.29 wrap-up skill release) all used patches. The argument holds; no finding.

## Verification Commands

Run these to verify the implementation:

```bash
# Confirm version harmony across the five lockstep packages and asset
grep -E '"version"' packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
cat packages/cli/assets/public-package-versions.json

# Confirm new docs surface
grep -nE '(awsProfile|awsRegion|--profile|--region)' apps/oat-docs/docs/cli-utilities/configuration.md
grep -nE '(awsProfile|awsRegion|--profile|--region)' apps/oat-docs/docs/cli-utilities/config-and-local-state.md

# Build docs (catches broken anchors/links)
pnpm --filter @open-agent-toolkit/oat-docs build

# Release validation (lockstep + asset alignment)
pnpm release:validate
```

## Recommended Next Step

Run the `oat-project-review-receive` skill. There are no Critical / Important / Medium findings to convert into plan tasks — the single Minor item is informational and does not require a follow-up task in this project.
