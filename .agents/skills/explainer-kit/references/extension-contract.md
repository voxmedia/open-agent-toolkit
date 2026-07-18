# Wrapper extension contract

V1 freezes one destination-neutral extension seam:

1. **Pre-resolution:** the caller resolves presets, private source systems,
   accounts, and destination topology without exposing them as public config.
2. **`ExplainerRunRequestV1`:** the caller translates only the inputs required
   by `explainer-kit.run-request/v1`.
3. **Core run:** the caller invokes `runExplainer(request, options)` once. The
   core owns validation, fact-base processing, content, theme, render, QA, and
   run records.
4. **Manifest consumption:** the caller accepts only
   `explainer-kit.manifest/v1`, verifies its run, recipe, and slug identity, and
   reads built artifact paths from the manifest.
5. **Post-run linking:** the caller may create companion notes, synchronize
   external documents, or maintain private links from manifest and optional
   publish-receipt data.

Private wrappers may retain presets, vault conventions, Google Docs behavior,
and personal destinations around this seam. Those values are wrapper-owned;
they are not OAT config keys and must not be discovered by the core.

## Frozen v1 boundary

The versioned request, artifact package, manifest, build record, durability
request, publish request, and publish receipt are the public boundary. V1 has
no plugin registry and no mid-pipeline callback API for private destinations.
Provider-neutral callbacks already documented by the core remain explicit run
options; they do not transfer stage ownership to a wrapper.

V1 readers reject unsupported contract majors and identity mismatches rather
than guessing. Wrappers should preserve unknown future versions for diagnosis,
stop before post-processing, and migrate deliberately.

The compatibility smoke fixture at
`tools/smoke/explainer-kit/wrapper-compatibility.test.mjs` proves this sequence
with the actual core. It uses sanitized private-wrapper inputs and is not a
substitute for the operator-owned release-candidate gate.

Release-candidate execution requires the retained tarball directory explicitly:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest /path/to/acceptance/rc.json \
  --artifacts-dir /path/to/retained/explainer-kit-rc \
  --entry scripts/run.mjs \
  --record /path/to/acceptance/private-wrapper-execution.json \
  --receipt /path/to/acceptance/private-wrapper-publish-receipt.json \
  -- --request /path/to/private/request.json
```

When the wrapper creates receipt evidence after the core invocation, it
declares that path with the runner's top-level `--receipt`; the option is not
forwarded to the packaged core. The sanitized execution record stores canonical
request, manifest, and optional receipt hashes plus the core run ID. It does not
store request paths, argument values, credentials, or private content.
Acceptance rejects evidence from a different request or run even when its RC ID
is valid.
