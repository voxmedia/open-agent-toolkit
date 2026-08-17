# S3 static destination contract

The `s3-static` connector publishes only files declared as built artifacts in a
validated manifest. Publishing is human-gated:

```bash
node scripts/publish.mjs \
  --request /path/to/publish-request.json \
  --receipt /path/to/publish-receipt.json \
  --confirm-publish
```

New requests use `explainer-kit.publish-request/v2` and explicitly declare
`publicAccess` as `public` or `protected`. V1 remains readable as public-mode
replay. Credentials come only from the standard AWS credential chain or the
request's optional profile. Never put access keys, secret keys, session tokens,
or SSO tokens in a request.

## Corresponding roots

`s3Uri` and `publicBaseUrl` must identify corresponding roots. Both are
normalized without trailing slashes. For a path `P` relative to `siteRoot`, the
connector writes `<s3Uri>/P` and verifies `<publicBaseUrl>/P`.

For example:

| Input                   | Value                                                           |
| ----------------------- | --------------------------------------------------------------- |
| `siteRoot`              | `/tmp/run/site`                                                 |
| manifest `renderedPath` | `site/initiatives/demo/index.html`                              |
| `s3Uri`                 | `s3://example-bucket/published`                                 |
| `publicBaseUrl`         | `https://cdn.example.com/published`                             |
| object                  | `s3://example-bucket/published/initiatives/demo/index.html`     |
| public URL              | `https://cdn.example.com/published/initiatives/demo/index.html` |

Use explicit `index.html` URLs. Directory redirects are not portable evidence.
The destination must serve uploaded bytes at the corresponding public path.

## The manifest a connector receives is intentionally incomplete

The core persists the manifest **before** it invokes the publisher callback, so
the file at `manifestPath` carries `outcome: "incomplete"` while the `publish`
stage is still `running`. This is a contractually intended intermediate state,
not a corrupt or half-written record, and a connector must not reject it on the
strength of `outcome` alone.

Do not decide publishability from the manifest by itself. Read the build record
named by `manifest.buildRecord.path` (resolved relative to the manifest) and
require all of:

- the manifest carries no `visual-review-required:` warning;
- the build record's own `outcome` is `incomplete`;
- its `publish` stage exists and is `running`; and
- every stage before `publish` is `passed`, `warned`, or `skipped` and carries
  no `visual-review-required:` warning.

Only that combination makes an `incomplete` manifest publishable. The one other
eligible shape is a finalized `built-durable` manifest that is not
review-flagged. Any other `incomplete` manifest, and every manifest whose run is
flagged, failed, or superseded, must be refused. The built-in connector performs
exactly this check before its first network call; third-party connectors are
required to perform an equivalent one.

The published bytes cannot diverge from the finalized manifest: the catalog
projection omits `outcome` and `warnings`, and both manifest writes share one
`finalizedAt`. After the callback returns a valid receipt, the core rewrites the
manifest with its terminal outcome.

## Safety and ordering

The connector validates the request, manifest, paths, hashes, and duplicate
site-relative paths before network access. It then:

1. uploads a sentinel whose path contains the run ID and a random 128-bit
   suffix;
2. verifies the sentinel with a service-computed SHA-256 checksum or an
   authenticated download hash;
3. for public destinations, fetches that exact sentinel anonymously through the
   public root; protected destinations skip this public fetch explicitly;
4. deletes only that sentinel;
5. uploads or idempotently skips each declared artifact;
6. verifies exact object bytes from service-computed SHA-256 evidence or an
   authenticated download hash, then additionally verifies the exact anonymous
   response bytes for public destinations; and
7. atomically writes `explainer-kit.publish-receipt/v2` with separate
   authenticated-object and anonymous-public verification facts.

If required sentinel verification fails or its verification capability is
unavailable, no artifact is uploaded. The connector attempts sentinel cleanup
and emits no successful receipt. An undeclared `401` or `403` in public mode is
a verification failure, never evidence that the destination is protected.

Publishing is additive. The implementation uses individual `put-object`,
`head-object`, and sentinel-only `delete-object` operations. It never performs
root-wide synchronization, never passes a delete flag, never walks or uploads
undeclared files, and never deletes an artifact object. Existing declared
objects with matching hash and metadata are skipped; changed declared objects
may be replaced.

## Metadata

Every upload sets metadata explicitly:

| File    | Content type                                      |
| ------- | ------------------------------------------------- |
| `.html` | `text/html; charset=utf-8`                        |
| `.json` | `application/json`                                |
| `.css`  | `text/css; charset=utf-8`                         |
| `.js`   | `text/javascript; charset=utf-8`                  |
| `.svg`  | `image/svg+xml`                                   |
| `.txt`  | `text/plain; charset=utf-8`                       |
| other   | manifest media type or `application/octet-stream` |

Artifacts use `Cache-Control: public, max-age=300`. The connector stores the
SHA-256 digest as object metadata for idempotency and supplies
`--checksum-sha256` on upload. It requests service checksum evidence with
`--checksum-mode ENABLED`; caller-authored metadata and ETags are never treated
as object-byte proof. When service SHA-256 evidence is unavailable, the
connector hashes bytes from an authenticated download. Public verification
separately hashes response bytes without text decoding, so binary artifacts and
stale wrong-byte 200 responses are covered.

## Failures and retries

Authentication and permission failures stop immediately. The connector does
not run `aws sso login`, retry with another profile, expose AWS diagnostics, or
persist credentials. Refresh credentials separately and rerun after approval.

Only transient individual object-operation failures receive bounded retries.
Input, authorization, root-correspondence, metadata, and public-verification
failures are not retried. A failed publish preserves the local package.

Public roots must be credential-free HTTPS URLs with no username, password,
query, or fragment. Invalid roots fail before AWS or HTTP operations and are
never persisted in receipts.
