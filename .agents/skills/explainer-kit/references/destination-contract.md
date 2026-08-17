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

## How the two roots compose

`s3Uri` and `publicBaseUrl` are each normalized without trailing slashes. For a
path `P` relative to `siteRoot`, the connector writes `<s3Uri>/P` and verifies
`<publicBaseUrl>/P`. That composition is the whole of the relationship.

**No relational validation is performed between the two roots, by design.** The
mapping from an S3 key to a public URL is underdetermined by these two strings:
it lives in CDN configuration the connector cannot read. Both of these are
legitimate, and they disagree structurally:

| Shape | `s3Uri`                      | `publicBaseUrl`               |
| ----- | ---------------------------- | ----------------------------- |
| A     | `s3://bucket/repositories/x` | `https://host/repositories/x` |
| B     | `s3://bucket/explainers`     | `https://host`                |

B is an ordinary CloudFront **Origin Path** deployment, where a bucket prefix is
mapped to the distribution root. Requiring the public path to equal the S3 key
prefix rejects it. Suffix-containment does not rescue the rule either — an empty
public path is a suffix of everything, so B would pass vacuously while
path-rewriting deployments (CloudFront Functions, Lambda@Edge, custom origins)
still produce false rejections.

Divergence between the two paths is therefore reported as a **non-blocking
warning**, never a failure. Correctness of an advertised URL is established by
verification, not by string shape — which is also why `publicAccess: protected`,
where no anonymous fetch happens, cannot establish it at all.

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
The destination must serve the uploaded bytes at the composed public path. That
is a requirement on the deployment, not something the connector validates from
the two root strings; see below.

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
Input, authorization, metadata, and public-verification failures are not
retried. A failed publish preserves the local package.

Public roots must be credential-free HTTPS URLs with no username, password,
query, or fragment. Three further rejections apply, all before any AWS or HTTP
operation, and none of them are ever persisted in receipts:

- **Control characters.** Any codepoint in `0x00`–`0x1f` or `0x7f`–`0x9f`, and
  any backslash, in either root. These otherwise reach S3 object keys, composed
  public URLs, the catalog, the receipt and `aws` argv; `0x9b` is the 8-bit CSI.
- **Non-public addresses.** Loopback, link-local (`169.254.0.0/16`, `fe80::/10`,
  including the `169.254.169.254` instance-metadata address), unique-local
  (`fc00::/7`) and RFC 1918 private hosts, in both literal IPv4 and IPv6 forms
  including IPv4-mapped spellings. Public verification issues an outbound GET
  against whatever the root names, so an unconstrained root is a request
  primitive aimed at internal addresses. Set
  `EXPLAINER_KIT_ALLOW_PRIVATE_PUBLIC_ROOT=1` to opt back in for a genuinely
  internal mirror. The policy is address-literal only: a hostname that happens
  to resolve inward is not detected.
- **Redirects.** Public verification uses `redirect: 'error'`. A canonical
  artifact URL is uploaded to a known key and should never legitimately
  redirect, so any redirecting destination is a hard verification failure rather
  than something to follow. A destination that requires redirects is
  incompatible with this connector and will report as such rather than failing
  opaquely later.

## The generated initiative catalog

The connector generates one auxiliary artifact the manifest does not declare: an
initiative catalog at `site/initiatives/<slug>/catalog.json`, uploaded alongside
the declared artifacts and recorded in the receipt as
`source: { kind: 'auxiliary', name: 'catalog' }`.

A third-party connector must reproduce it **byte for byte**, because
`recordDurability` rebuilds it from the manifest and compares hashes; a mismatch
rejects the publication with `cross-record-mismatch`. Build it with
`catalogFromManifest(manifest, publicBaseUrl, { publicAccess })` and serialize
with `serializeInitiativeCatalog`, rather than constructing it by hand.

Two properties matter most:

- The `{ publicAccess }` option is **required**. Omitting it raises a
  `TypeError` rather than defaulting, because the policy selects a field inside
  the serialized bytes and therefore changes the hash. Pass
  `{ publicAccess: undefined }` for `publish-request/v1`, which has no such
  field and is public by definition.
- `publicVerification` carries **policy, never outcome**: `"required"` for
  public destinations and `"skipped-by-policy"` for protected ones. The catalog
  is serialized and hashed before the first upload and long before any
  per-artifact verification runs, so it cannot carry a verification result
  without invalidating its own hash. The authoritative outcome lives in the
  publish receipt, which the catalog's `runId` identifies. Never write
  `"verified"` into a catalog.

Publishability is gated by `assertManifestPublishable`, which raises
`E_PUBLISH_OUTCOME` for a manifest that is not eligible; see the intermediate
`incomplete` state described above.
