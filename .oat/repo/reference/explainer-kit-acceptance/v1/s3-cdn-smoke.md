# Live S3/CDN smoke test (p05-t03)

Live publish of a frozen-RC artifact through the packaged connector, executed
2026-07-19 against the operator-approved date-scoped acceptance roots.

## Execution

- Runner: `node tools/release/run-explainer-rc.mjs --rc-manifest
.oat/repo/reference/explainer-kit-acceptance/v1/rc.json --artifacts-dir
dist/explainer-kit-rc --entry scripts/publish.mjs --record
.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json --
--request .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json
--receipt .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json
--confirm-publish`
- The runner verified all five retained package tarballs against `rc.json`
  (CLI `sha256:dc1f2d82…93b1`), verified both packaged skill subtree hashes,
  extracted the verified CLI tarball to a temporary root, and executed the
  packaged `scripts/publish.mjs` — no source-tree fallback. Credentials came
  only from the standard AWS chain (profile via environment); the committed
  request is credential-free with repo-relative `siteRoot`/`manifestPath`.
- Published input: the accepted private-wrapper run
  (`run-7dec5351-5b79-4268-817d-478e669acb56`); its retained manifest is the
  committed `private-wrapper-manifest.json` and its site bytes were staged
  unmodified at the repo-relative ignored path `dist/live-smoke/acceptance-run/site`
  (artifact hash re-verified byte-identical before publish).

## Result

- Receipt: `publish-receipt.json` — one artifact,
  `site/initiatives/acceptance-run/index.html`
  (`sha256:4f59d3d2502da483376ce4ae40942f2e980cdb66bb370d5de15c7e49fb3edcce`),
  HTTP 200, `text/html; charset=utf-8`, destinations matching the request
  roots exactly.
- Sentinel: run-unique unguessable suffix
  (`…run-7dec5351…-81c1c015f73008c1b6e8d4ff5075cf32.txt`), uploaded, publicly
  verified, deleted.
- Execution record: `live-publish-result.json` — packaged entry
  `scripts/publish.mjs`, exit 0, bound to the request/manifest/receipt
  canonical hashes and `coreRunId` above.

## Independent verification (outside the connector)

- `curl` of the receipt's public URL: HTTP 200, `text/html; charset=utf-8`,
  downloaded bytes hash `4f59d3d2…edcce` — exact match with the manifest
  artifact hash.
- `s3api head-object` on the sentinel key: 404 Not Found (deletion confirmed
  server-side).
- Recursive listing of the acceptance prefix: exactly one object (the declared
  artifact); no undeclared objects created, overwritten, or deleted.
- Validator: `node tools/release/validate-explainer-acceptance.mjs
.oat/repo/reference/explainer-kit-acceptance/v1 --gate publish` → `passed`
  (artifactCount 1; sentinel upload/public/deleted all true; 0 undeclared
  overwrites/deletes) referencing exactly the frozen RC
  `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`.

## Deviation

The plan's Step 1 command omits two required arguments: the runner's mandatory
`--artifacts-dir` and the connector's mandatory human-approval
`--confirm-publish` entry flag (without it the packaged entry exits 1 with
`E_PUBLISH_APPROVAL`; the runner discards entry output on failure, so the
first attempt surfaced only `E_ENTRY_EXIT`). Both were added; the live publish
was explicitly authorized by the coordinator and uses the operator-approved
date-scoped roots. No other deviation.
