# Private-wrapper migration

This runbook migrates the externally owned private wrapper from the monolithic
`oat-explainer-kit` 0.4.1 workflow to the frozen v1 pre/core/post seam. Keep the
0.4.1 installation and its private configuration available until one unchanged
release candidate passes every acceptance gate.

## Prepare the private wrapper

1. Back up the installed 0.4.1 skill, private presets, Stoa configuration, and
   Google Docs settings. Confirm the backup contains `SKILL.md`, scripts,
   references, and templates.
2. Install the candidate `explainer-kit` at user scope and verify that the
   wrapper resolves that installed copy, never a source checkout.
3. Change wrapper pre-resolution to produce one
   `explainer-kit.run-request/v1`. Keep preset selection, vault/Stoa paths,
   Google account data, authentication choices, and personal destination
   topology in private wrapper configuration.
4. Invoke the core once, consume only `explainer-kit.manifest/v1` and the
   optional publish receipt, then perform Stoa notes, Google Docs sync, and
   private link maintenance as post-run work.

Do not add a plugin, inject private work between core stages, or add private
lanes to public OAT config.

### Private `presets.example.json`

The private wrapper's `personal-oat` example should carry the confirmed public
root:

```json
{
  "presets": {
    "personal-oat": {
      "publicBaseUrl": "https://dy4vzrzaexuy5.cloudfront.net"
    }
  }
}
```

Copy `presets.example.json` to an untracked `presets.json` before adding
accounts or authentication details.

### Private Stoa configuration

The eventual private Stoa configuration may use the same confirmed public root
to create manifest-derived links:

```json
{
  "explainerLinks": {
    "publicBaseUrl": "https://dy4vzrzaexuy5.cloudfront.net",
    "source": "explainer-kit.manifest/v1"
  }
}
```

This is private-wrapper migration/config context, not a public core default or
neutral fixture.

## Release-candidate sequence

1. Build and retain the packaged RC in a dedicated builder-owned directory;
   record its immutable RC identity:

   ```bash
   node tools/release/build-explainer-rc.mjs \
     --output dist/explainer-kit-rc \
     --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.json
   ```

   The builder rejects repository/source roots, symlinks, and unowned existing
   directories. Reuse only an output carrying its ownership marker.

2. Run packaged direct-core and OAT-adapter build-only smoke tests.
3. Migrate the real private wrapper against that exact RC.
4. Run the operator-owned wrapper E2E as an executable pre/core/post sequence:
   resolve the private preset and external request; invoke the packaged core;
   then publish the manifest, retain its complete receipt, and perform
   vault/Stoa, Google Docs, and personal-link work. Verify all post-run evidence
   against the immutable core execution record.
5. Run the live S3/CDN acceptance against the same unchanged RC.
6. Promote only when both retained acceptance records pass and reference the
   same RC identity.

Every packaged invocation supplies the retained artifacts explicitly; there is
no current-working-directory fallback. The wrapper core stage does not declare
post-run receipt evidence:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  --artifacts-dir dist/explainer-kit-rc \
  --entry scripts/run.mjs \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-execution.json \
  -- \
  --request /path/to/private/run-request.json
```

The packaged CLI emits exactly one complete JSON result document; pretty
printing across lines is valid and progress text is not. After that command
returns, the private wrapper publishes and links the core manifest. Retain
`private-wrapper-manifest.json`,
`private-wrapper-publish-receipt.json`, and
`private-wrapper-result.json` beside the RC identity. Wrapper acceptance reads
and validates the full receipt as a separate post-run stage and rejects a
foreign run ID, sentinel, artifact set, or manifest hash even when caller-owned
files repeat the same receipt hash.

The live connector stage is a separate packaged invocation:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  --artifacts-dir dist/explainer-kit-rc \
  --entry scripts/publish.mjs \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json \
  -- \
  --request .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json \
  --receipt .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json \
  --confirm-publish
```

Retain the execution record produced by that command. Acceptance binds it to
the canonical request, manifest, receipt, and core run ID and rejects stale
cross-run evidence.

The in-repository compatibility fixture is a development guard. It does not
satisfy the operator-owned real-wrapper gate.

## Rollback

If migration or acceptance fails, do not promote the candidate:

1. Preserve the failed candidate's sanitized diagnostics and issue a new RC
   only after correcting the public seam or private wrapper.
2. Restore the backed-up 0.4.1 skill and private configuration.
3. Remove the candidate user-scope core and refresh provider views with
   `oat sync --scope all`.
4. Verify one known-good 0.4.1 build before resuming normal wrapper use.

Do not retire the backup until the unchanged promoted RC has passed the
operator-owned wrapper and live-publish gates.
