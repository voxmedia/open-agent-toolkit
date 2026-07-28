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

Every case has four inputs:

| File                          | Contract                                           |
| ----------------------------- | -------------------------------------------------- |
| `descriptor.json`             | Portable paths to the other case files             |
| `source-input.json`           | Stable claims, sources, topology, reader questions |
| `rubric.json`                 | Required machine-readable quality checks           |
| `personal-kit-reference.json` | Checked-in comparison outputs and rubric evidence  |

Generated runtime evidence may be added beneath the same case directory in the
golden execution phase. Hand-edited generated output is not accepted as passing
evidence.

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

Each check declares the retained machine-readable evidence paths that a golden
run must produce. A passing set includes the adaptive minimum, preserves source
meaning and topology, has catalog-to-manifest parity, and reaches a passing
terminal review after zero or one correction.

## Comparison evidence

`explainer-kit.personal-reference/v1` records the reference artifact set and one
observation for every rubric field. `producerVersion` pins the workflow oracle
used for comparison. `pixelIdentityRequired` is always `false`; reviewers judge
clarity, representation, behavior, and evidence rather than visual identity.

The reference files are durable inputs, not executable dependencies. Runtime
tests must not load an operator plugin, home directory, active project, or
moving branch.

## Portability rules

- Descriptor paths are relative to their case and cannot escape it.
- Committed JSON cannot contain home-directory or `file://` locators.
- Stable repository-relative locators and pinned revisions are allowed.
- Every claim and required topology edge is present in the committed source
  input so later runs do not need the original workstation.
