# Golden conformance contract

Golden conformance compares the rebuilt unattended project-recap workflow with
a checked-in personal-kit workflow and quality reference. It is a behavioral
oracle, not a pixel snapshot: the rebuilt output may use different markup,
spacing, or composition when it clears the same quality bar.

## Cases

Each directory under `tests/fixtures/golden/` is self-contained:

- `simple` checks first-viewport clarity and a cohesive baseline recap.
- `non-linear` checks branch, fan-in, and cycle preservation.
- `explainer-authoring-redesign` checks an archive-only rebuild from a dense
  completed project record.

Every case retains the complete oracle:

| Path                             | Contract                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| `descriptor.json`                | Producer metadata plus the path and SHA-256 of every file      |
| `source-input.json`              | Source-grounded claims, topology, and reader questions         |
| `rubric.json`                    | Required checks and resolvable JSON evidence pointers          |
| `personal-kit-reference.json`    | Exact hub/architecture/deck membership and artifact hashes     |
| `evidence/source-record.json`    | Retained source claims, upstream repository hash, and topology |
| `evidence/browser-evidence.json` | Chromium metadata, measurements, review, manifest, and catalog |
| `evidence/screenshots/*.png`     | Desktop, tablet, and mobile captures of the reference hub      |
| `artifacts/*.html`               | Representative personal-kit hub, architecture, and deck        |

The descriptor's retained-file set is repository-relative and content
addressed. The loader recomputes every hash, resolves each source record and
rubric pointer, and rejects a missing or changed file. A status label or prose
summary without those retained outputs does not satisfy the contract.

## Required rubric

The `explainer-kit.golden-rubric/v1` `checks` object has exactly these required
fields:

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

Each check declares JSON pointers into retained machine-readable evidence. A
passing set contains exactly the hub, architecture, and deck; preserves source
meaning and topology; has catalog-to-manifest parity; includes real browser
captures and measurements; and reaches a passing terminal review after zero or
one correction.

## Comparison evidence

`explainer-kit.personal-reference/v1` records each reference artifact's path,
SHA-256, source IDs, and claim IDs plus one resolvable evidence-pointer set for
every rubric field. The producer object pins the personal-kit version and
generation time. `pixelIdentityRequired` is always `false`; reviewers judge
clarity, representation, behavior, and evidence rather than visual identity.

Claims are accepted only when their source ID exists and their text exactly
matches a claim in the retained source record. Repository-backed records also
pin the upstream repository file and prove every retained claim occurs there.
Architecture output must enumerate every input node and edge, and retained
browser evidence must carry Chromium version, viewport, capture time,
screenshot hash, overflow, readability, keyboard, and link results.

The reference files are durable inputs, not executable dependencies. Runtime
tests must not load an operator plugin, home directory, active project, or
moving branch.

## Portability rules

- Descriptor paths are relative to their case and cannot escape it.
- POSIX roots, Windows drive paths, UNC paths, home-relative paths, and
  `file://` locators are rejected wherever they occur in committed evidence.
- Repository-relative paths and supported `https://` source URLs are allowed.
- Every claim, topology node, and topology edge resolves to retained,
  hash-verified evidence, so later runs do not need the original workstation.
