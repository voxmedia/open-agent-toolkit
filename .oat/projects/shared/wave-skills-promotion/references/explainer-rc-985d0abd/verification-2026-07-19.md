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
