# Live S3/CDN smoke test — post-merge final RC 7fea9e53

Separate packaged-connector publish gate for the post-merge final RC, executed
2026-07-19 (evening) from the authenticated operator session with the user's
explicit approval. Distinct from — and in addition to — the six-gate
personal-wrapper acceptance recorded alongside in this directory.

## Execution

- Runner and validator taken from RC record commit `35897e47`
  (`origin/tkstang/explainer-kit-rc`, read-only; that branch was not checked
  out or mutated). Runner invoked from a scratch root mirroring the RC-branch
  repo layout so every committed path is repo-relative:

  `node tools/release/run-explainer-rc.mjs --rc-manifest
.oat/repo/reference/explainer-kit-acceptance/v1/rc.json --artifacts-dir
<retained-artifacts-dir> --entry scripts/publish.mjs --record
.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json --
--request .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json
--receipt .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json
--confirm-publish`

- The runner verified all five retained 0.2.6 tarballs against `rc.json` (CLI
  `sha256:ec3ff847440b1471cd093a3f2a54175edac348d8356e248d6581a3c4b3291390`),
  verified both packaged skill subtree hashes, extracted the verified CLI
  tarball to a temporary root, and executed the packaged `scripts/publish.mjs`
  (exit 0) — exact retained artifacts, no rebuild, no source-tree fallback.
- Published input: the exact accepted artifact bytes and manifest of core run
  `run-5510b6de-ba63-41a8-b6fd-d166247f2506` (the six-gate acceptance run);
  site bytes hash-verified against the manifest before publish. The committed
  request is credential-free (credentials only via the ambient AWS chain) with
  repo-relative `siteRoot`/`manifestPath`; `manifestPath` points at the
  retained `private-wrapper-manifest.json` in this directory's layout.

## Result

- Receipt: `publish-receipt.json` — one artifact,
  `site/initiatives/acceptance-run/index.html`
  (`sha256:4f59d3d2502da483376ce4ae40942f2e980cdb66bb370d5de15c7e49fb3edcce`),
  HTTP 200, `text/html; charset=utf-8`, destinations matching the request
  roots exactly (prefix `explainers/acceptance-packaged-rc-7fea9e53`).
- Sentinel: run-unique unguessable suffix
  (`…run-5510b6de…-38818bc327d42e0aef9ee87644b1b191.txt`), uploaded, publicly
  verified, deleted.
- Execution record: `live-publish-result.json` — packaged entry
  `scripts/publish.mjs`, exit 0, bound to the request/manifest/receipt
  canonical hashes and `coreRunId run-5510b6de…`.

## Independent verification (outside the connector)

- `curl` of the receipt's public URL: HTTP 200, `text/html; charset=utf-8`,
  downloaded bytes hash `4f59d3d2…edcce` — exact match with the manifest
  artifact hash.
- `s3api head-object` on the sentinel key: 404 Not Found (deletion confirmed
  server-side).
- Recursive listing of the packaged-smoke prefix: exactly one object — the
  declared artifact. No undeclared objects created, overwritten, or deleted.
- Validator (from `35897e47`), exact command and result:

  `node tools/release/validate-explainer-acceptance.mjs
.oat/repo/reference/explainer-kit-acceptance/v1 --gate publish`
  → `{"status":"passed","gate":"publish","rcId":"sha256:7fea9e53…","gates":{"publish":{"status":"passed","packagedEntry":"scripts/publish.mjs","artifactCount":1,"sentinel":{"uploadVerified":true,"publicVerified":true,"deleted":true},"safety":{"undeclaredOverwrites":0,"undeclaredDeletes":0}}}}`

## Deviations

None. The runner command included `--confirm-publish` from the start (the
known plan-command omission from the 0.2.3 round) and the publish succeeded on
the first attempt.

## Integration note

Sol copies `live-publish-request.json`, `live-publish-result.json`,
`publish-receipt.json`, and this record into
`.oat/repo/reference/explainer-kit-acceptance/v1/` on
`tkstang/explainer-kit-rc`; the request's `manifestPath` resolves there once
the wrapper evidence (including `private-wrapper-manifest.json`) is integrated
from this same directory, after which `--gate publish` (and `--gate all`
together with the wrapper files) passes from the repo root.
