# Golden conformance contract

Golden conformance runs the unattended project-recap workflow from portable
semantic inputs and validates its live output in real Chromium. It is a
behavioral oracle, not a pixel snapshot: output may change markup, spacing, or
composition when it clears the same quality bar.

## Cases

Each case directory under `tests/fixtures/golden/` contains:

- `simple` checks viewport-sized lead evidence and a cohesive baseline recap.
- `non-linear` checks branch, fan-in, and cycle preservation.
- `explainer-authoring-redesign` checks an archive-only rebuild from a dense
  completed project record.

| Path                          | Contract                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `descriptor.json`             | Case identity plus paths and SHA-256 hashes for semantic inputs |
| `source-input.json`           | Source-grounded claims, topology, and reader questions          |
| `evidence/source-record.json` | Retained source claims, upstream repository hash, and topology  |

All cases share `tests/fixtures/golden/rubric.json`. Generated HTML, browser
captures, measurements, manifests, catalogs, and review records are temporary
test output and must not be committed.

The descriptor's retained-file set is case-relative and content addressed. The
loader recomputes each hash, resolves source records, and rejects missing,
changed, duplicate, non-portable, or ungrounded input.
`sharedRubricPath` resolves from `tests/fixtures/golden/`, and
`sharedRubricSha256` content-addresses that common contract.

## Required rubric

The shared `explainer-kit.golden-rubric/v1` `checks` object has exactly these
required fields:

1. `adaptiveMinimumSet`
2. `firstViewport`
3. `hierarchy`
4. `representationChoice`
5. `legibility`
6. `cohesion`
7. `sourceCoverage`
8. `interactions`
9. `topologyPreservation`
10. `catalogParity`
11. `boundedCorrection`

The benchmark enforces every field against live runtime evidence. A passing set
contains exactly the project recap, architecture, and deck; preserves source
meaning and topology; has catalog-to-manifest parity; includes real browser
captures and measurements; and reaches a passing terminal review without a
correction. Integration suites separately exercise the one-correction ceiling.

## Runtime evidence

The suite generates one complete recap package per case in a temporary
directory. It validates artifact membership, claim markers, exact topology,
catalog parity, independent visual review, real Chromium identity, viewport
dimensions, lead-content presence, heading order, capture identity, overflow,
keyboard and deck-arrow behavior, and bounded review. The temporary package is
removed when the test completes.

Claims are accepted only when their source ID exists and their text exactly
matches a claim in the retained source record. Repository-backed records also
pin the upstream repository file and prove every retained claim occurs there.
Runtime tests must not load an operator plugin, home directory, active project,
or moving branch.

## Portability rules

- Retained descriptor paths are relative to their case and cannot escape it;
  the shared rubric path is relative to the golden fixture root.
- POSIX roots, Windows drive paths, UNC paths, home-relative paths, and
  `file://` locators are rejected wherever they occur in committed inputs.
- Repository-relative paths and supported `https://` source URLs are allowed.
- Every claim, topology node, and topology edge resolves to retained,
  hash-verified source input, so later runs do not need the original
  workstation.
