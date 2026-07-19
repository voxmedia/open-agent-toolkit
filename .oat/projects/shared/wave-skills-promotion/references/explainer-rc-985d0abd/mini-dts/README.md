# Mini-side divergent declaration files (CLI tarball provenance)

Per Sol's counterpart manifest diff (2026-07-19): tar entry lists are
byte-identical (1257/1257); content differs in exactly these three generated
`.d.ts` files and nowhere else (JS + declaration maps match). These are the
Mini rebuild's copies, extracted from the deterministic `62b0da50…` CLI
tarball built at frozen commit `da1e7a71`:

| File                                   | Mini sha256 (this copy) | Recorded (laptop) |
| -------------------------------------- | ----------------------- | ----------------- |
| dist/commands/pjm/init.d.ts            | e678bdc9…               | 6d401e1c…         |
| dist/manifest/manifest.types.d.ts      | 85a93068…               | 7ff2e6a6…         |
| dist/providers/codex/codec/shared.d.ts | 78751e48…               | f1455725…         |

Laptop `TURBO_FORCE=true` rebuild reproduces the recorded hash, so this is
cross-machine tsc declaration-emit divergence, not build-cache reuse. Sol
compares exact text and decides: fix declaration reproducibility or
re-freeze/distribute exact bytes. Acceptance HELD until that decision.
