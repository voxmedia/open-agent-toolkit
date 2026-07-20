# Explainer-kit v1 promotion decision

> Historical acceptance record: this approval applies only to the immutable
> `0.2.3` RC identified below. Reconciliation with newer `main` inputs in
> `dfe4b527` advanced the release set to `0.2.6`. Post-merge RC
> `sha256:7fea9e53033608ec1e7bf3d07d6124e32f5f7b9e91af61fd3e2799cfae501903`
> is frozen and awaiting rerun of both external gates; it is not yet approved
> by this record.

**Decision:** approved for promotion
**Recorded:** 2026-07-19

## Frozen identity

- RC ID:
  `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`
- Source commit: `da1e7a713adac4743368addf206aa780a94871ba`
- Exact CLI tarball:
  `sha256:dc1f2d82885f21d2aa649330c6b6f75962e79e689f47138aafb539caae5793b1`
- Core `explainer-kit` subtree:
  `sha256:ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a`
- `oat-explainer-kit` subtree:
  `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`

No candidate input changed between freeze, private-wrapper acceptance, packaged
publish acceptance, and this promotion decision.

## External acceptance

- Private wrapper: passed all six operator-owned gates through packaged
  `scripts/run.mjs`; the validator confirms `built-durable` with a bound
  post-run publish receipt.
- S3/CDN smoke: passed through packaged `scripts/publish.mjs`; one declared
  artifact was published, its public bytes matched the manifest hash, the
  run-unique sentinel was verified and deleted, and no undeclared object was
  overwritten or deleted.
- Combined validator:
  `validate-explainer-acceptance.mjs --gate all` passed both gates against the
  same frozen RC.

## Repository gates

The final chained command completed with exit code 0:

```bash
node tools/release/validate-explainer-acceptance.mjs \
  .oat/repo/reference/explainer-kit-acceptance/v1 --gate all &&
pnpm release:validate &&
pnpm test
```

- All five public `0.2.3` package archives passed release validation.
- Browser-backed explainer visual validation passed with 65 measurements.
- Tests passed across all six workspace packages.
- The root smoke suite passed 129/129 tests with zero failures, skips, or
  cancellations.

## Recorded deviations

- Cross-machine rebuilding produced ordering-only differences in three
  generated declaration files. All explainer surfaces and runtime bytes
  matched; acceptance consumed the exact retained CLI archive rather than a
  substitute rebuild.
- The first wrapper publish attempt exposed a missing operator IAM
  `s3:DeleteObject` permission required for sentinel cleanup. The permission was
  granted, orphaned sentinels were removed, and the unchanged RC passed.
- The planned packaged-publish command omitted required `--artifacts-dir` and
  `--confirm-publish` arguments. The plan and retained execution record now show
  the successful explicit invocation.

## Promotion

The v1 acceptance contract is satisfied. The frozen RC above may be promoted
unchanged; any change to its package, skill, schema, recipe, or bundle-input
identity requires a new RC and rerun of both external gates.
