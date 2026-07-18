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

1. Build and retain the packaged RC; record its immutable RC identity.
2. Run packaged direct-core and OAT-adapter build-only smoke tests.
3. Migrate the real private wrapper against that exact RC.
4. Run the operator-owned wrapper E2E with the private request held outside the
   repository. Verify preset resolution, vault/Stoa output, Google Docs sync,
   personal destination links, manifest consumption, and durability evidence.
5. Run the live S3/CDN acceptance against the same unchanged RC.
6. Promote only when both retained acceptance records pass and reference the
   same RC identity.

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
