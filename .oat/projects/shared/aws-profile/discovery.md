---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-28
oat_generated: false
---

# Discovery: aws-profile

## Initial Request

Support switching AWS profiles (and optionally region) for the S3 sync that runs during `oat-project-complete` and `oat project archive sync`. Today, AWS auth flows through whatever ambient env vars / default profile the user has, with no way to declare per-repo or per-invocation overrides.

## Solution Space

The pre-OAT scoping conversation produced two tiers:

- **Tier A** — Profile switching only. Add `archive.awsProfile` (and `archive.awsRegion`) config keys, plumb them into the AWS spawn env, expose `--profile` on `archive sync`. Safe and predictable; reuses existing `~/.aws/credentials` / SSO / role assumption.
- **Tier B** — Tier A plus raw access-key overrides. Either local-only config keys with a write-scope guard, or transient CLI flags. Higher risk (credential leakage into tracked config) and lower value than profiles for typical SSO/role workflows.

**Chosen direction:** Tier A. User validated: yes. Tier B deferred — for now, raw access keys remain a "set them in your shell env" pattern that already works via inherited `processEnv`.

## Key Decisions

1. **Auth model:** Profile-based only. Defer raw access-key plumbing to a future project if real demand surfaces.
2. **Plumbing point:** Merge `AWS_PROFILE` (and `AWS_REGION` when set) into the env passed to `execFile('aws', …)` at the helper boundary in `archive-utils.ts`, rather than threading `--profile` flags through every callsite. Keeps the surface area small and consistent for `aws s3 sync`, `aws s3 ls`, `aws sts get-caller-identity`, and `aws --version`.
3. **Precedence:** CLI flag (per-invocation) > caller's existing env (`AWS_PROFILE` already set in the shell) > config (`archive.awsProfile`). Config does not clobber an explicit shell env or flag.
4. **Region as a sibling:** Add `archive.awsRegion` alongside `archive.awsProfile`. Same plumbing pattern. Cheap to ship together and avoids a follow-up PR.
5. **Per-invocation override on `archive sync` only:** Add `--profile` (and `--region`) flags to the `oat project archive sync` command. The `oat-project-complete` flow does not get a flag — it always uses the resolved env from config + ambient env. Rationale: completion is non-interactive bookkeeping; if a user needs a different profile they should set it in config or shell env beforehand.
6. **No new auth concept in the skill:** `oat-project-complete` SKILL.md stays unchanged at the auth layer (the skill already delegates archive to CLI helpers). Only doc-side changes describe the new keys.

## Constraints

- Lockstep release guardrail (AGENTS.md): any change under `packages/cli/src` requires version bumps for all five public packages (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) plus passing `pnpm release:validate`.
- Config command surface (`packages/cli/src/commands/config/index.ts`) requires updates to the keys whitelist, descriptors, and set handler — these must stay in lockstep with `OatArchiveConfig`.
- All AWS spawns must continue to inherit the parent process env so users who already set `AWS_PROFILE`/`AWS_REGION` in their shell are not silently overridden.

## Success Criteria

- `archive.awsProfile` and `archive.awsRegion` can be set via `oat config set` and round-trip through read/normalize/write.
- Both `oat-project-complete` (via `archiveProjectOnCompletion`) and `oat project archive sync` honor the configured profile/region for every `aws` invocation, including the preflight `aws sts get-caller-identity`.
- `oat project archive sync --profile X` (and `--region Y`) overrides config for that single run.
- Shell-level `AWS_PROFILE` / `AWS_REGION` already set by the user are not overwritten by config; flags still win over both.
- Docs (`apps/oat-docs/docs/cli-utilities/configuration.md` and `config-and-local-state.md`) describe the new keys.
- Tests in `archive-utils.test.ts`, `oat-config.test.ts`, `resolve.test.ts`, and `commands/config/index.test.ts` cover the new fields and precedence rules.

## Out of Scope

- Raw `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` config keys or CLI flags (Tier B).
- Multiple named credential profiles per project or per task.
- AWS endpoint URL / custom S3-compatible backends.
- Any change to what the S3 archive contains (`S3_ARCHIVE_SYNC_EXCLUDES` is unchanged).
- Skill-level prompt asking the user which profile to use at completion time.

## Open Questions

- **Empty-string vs unset:** `oat config set archive.awsProfile ""` — should that delete the key or store the empty string? Existing `archive.s3Uri` handler trims and sets; we should mirror "trim to empty → unset" to keep the surface predictable. Confirm during plan.
- **Region default:** Do we want any default region behavior, or leave entirely to the AWS CLI's own resolution? Default: leave to AWS CLI; we only forward what the user provided.

## References

- `packages/cli/src/commands/project/archive/archive-utils.ts` — `archiveProjectOnCompletion`, `ensureS3ArchiveAccess`, all `execFile('aws', …)` callsites
- `packages/cli/src/commands/project/archive/index.ts` — `oat project archive sync` command
- `packages/cli/src/config/oat-config.ts` — `OatArchiveConfig` interface and normalizer
- `packages/cli/src/commands/config/index.ts` — `archive.s3Uri`/`archive.s3SyncOnComplete` already wired here as the pattern to follow
- `apps/oat-docs/docs/cli-utilities/configuration.md` and `config-and-local-state.md` — docs to update

## Next Steps

Quick mode → straight to plan. Scope is clear, the architecture is "add two optional fields and forward them as env vars," and there are no component boundary questions. No lightweight design needed.
