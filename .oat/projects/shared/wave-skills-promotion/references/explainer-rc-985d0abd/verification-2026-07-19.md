# Final RC 985d0abd verification (Mini-side, 2026-07-19)

Protocol: pristine temp worktree at frozen commit `da1e7a71` →
`pnpm install --frozen-lockfile && pnpm build` →
`node tools/release/build-explainer-rc.mjs` (node v22.17.0, pnpm 10.13.1).

| Check                                                    | Result                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| rc.json self-consistency (record-minus-rcId hash)        | PASS — reproduces `985d0abd…`                                         |
| Frozen commit object present                             | PASS (`da1e7a71` fetched via origin/tkstang/explainer-kit @ 296bd775) |
| 4/5 non-CLI package tarballs                             | PASS — byte-identical hashes                                          |
| skills (2), schemas (8), recipes (4 incl. program-recap) | PASS — all recorded hashes match                                      |
| **oat-explainer-kit subtree (required)**                 | **PASS — `2cf98952…b654` exactly**                                    |
| CLI whole-tarball                                        | **MISMATCH** — recorded `dc1f2d82…93b1`, Mini rebuild `62b0da50…37e1` |
| Mini rebuild determinism                                 | STABLE (two identical runs)                                           |

Same signature as the f212d round: divergence is confined to the CLI tarball,
outside every explainer-relevant surface. NOT waived — cross-machine diff
inputs tracked here (`cli-final-tar-entries.txt`, 1257 entries;
`cli-final-content-manifest.txt`, per-file sha256, manifest self-hash
6fe25b3b8db6d11b…). Sol produces the counterparts from the recorded
`dc1f2d82` tarball; the per-file diff isolates the environment-dependent
content.

## Resolution (2026-07-19, explainer-side counterpart diff)

DISPOSITION: **BENIGN — ordering-only declaration-emit nondeterminism.**
Explainer-side re-extraction of the recorded `dc1f2d82` tarball vs the Mini
raw `.txt` copies: 1257/1257 entry paths match; 1254/1257 file hashes match;
all three deltas are ordering-only text in generated `.d.ts`
(`CANONICAL_REPO_REFERENCE_PATHS` union order, `ManifestSchema` inferred
property order, `SUPPORTED_CODEX_ROLE_TARGETS` effort union order).
Toolchains identical (TS 5.9.3, pnpm 10.13.1, node 22.17.0). No runtime or
type-set semantic delta. Final RC unchanged (`985d0abd` / `da1e7a71` /
CLI `dc1f2d82` / subtree `2cf98952`). Acceptance GO — consuming the exact
recorded laptop tarball bytes, not a local rebuild.
