# Narrow table-formatting conservation proposal

**Status:** Evidence only; source and helper writes are held. Existing normalization has not changed. Root must authorize and independently review this exception before implementation or t02 commit.

The required `pnpm --filter oat-docs docs:format` (exit 0) changes exactly one of 816 protected units: `reference/cli-reference.md::Command Groups::1`, one GFM table. A temporary explicitly guard-neutralized diagnostic sweep reports all other units matching their hashes. This sweep is not a preservation pass. The unchanged real verifier exits 1, recorded in `/tmp/docs-p02-t02-conservation-04-error.log`.

`p02-table-formatting-proposal.json` binds baseline, current approved map, href-only expected page and formatted page hashes, all 15 changed third-column cell-edge spans, and the third-column delimiter dash run. Real remark-parse/remark-gfm trees agree after approved href edits; all raw cell payload bytes agree, not merely rendered/semantic text. No other authored unit needs an exception. The formatter also widens the separator dash run, so ASCII cell padding alone is insufficient.

## Proposed bounded algorithm

1. Bind the single source page/unit/table and exact baseline/map hashes. Derive the href-only expected unit solely by its already-approved destination-token rewrites. Do not format or trim the expected unit.
2. Parse expected and actual GFM tables with the existing parser. Require identical row/column topology, alignment and cell child structure. Use parser offsets to identify cell payloads and outer prefixes/suffixes; never split blindly on pipes because code and escaped pipes remain payload.
3. Normalize only the exact inventoried third-column edge ASCII-space spans and delimiter dash-run width to their before bytes. Require raw internal cell payload bytes, pipes/colons, other delimiter characters and all bytes outside those spans to remain exact after existing URL-identity normalization. No newline, paragraph, emphasis, code, escaped-pipe or internal-space exemption. Hash the resulting complete unit against its original normalized hash.
4. Fail closed for another page/table/cell, changed topology/alignment, an unlisted padding span, changed delimiter syntax or any payload mutation. Record exact spans and from/to bytes as applied evidence rather than hiding a broad formatter round trip.

## Capable controls required after authorization

- Valid current formatted table and approved href-only control both pass, reaching all 816 protected units.
- Mutate a raw internal space, code/emphasis byte, escaped pipe or newline in the actual table: reject without allowing payload/AST equivalence to substitute for bytes.
- Mutate topology, alignment colon, pipe, delimiter syntax or an unlisted table-edge span: reject.
- Neutralize the new exact-span guard in an isolated control and show the payload mutation is accepted there but rejected by the guarded implementation; restore and rerun valid control. No live source mutation and no permanent project-artifact dependency.

This prevents a formatting-induced false failure without weakening the preservation contract. No table/capability content is rewritten, and no post-commit recovery is involved.
