# Recon Profiles

Profiles define assurance topology, not a model tier. The controller sizes
adaptive lanes from a mechanical source inventory, shows exact counts before
approval, and never exceeds the approved hard cap. Every wave remains
homogeneous, but each wave has an independently selected and approved exact
target. A harder wave never raises unrelated evidence waves' targets.

## quick

Use for bounded orientation where independently checked locators and supported
claims are sufficient.

- Required: one mapping wave, one or more non-overlapping gather lanes, one
  compile lane, deterministic schema and locator validation, and rendering.
- Adaptive evidence lanes: 1–4 `gather` lanes; hard cap 4. The required `map`
  and `compile` waves are fixed at exactly one lane each, so the total maximum
  is 6 lanes.
- Maximum concurrency: 4.
- Assurance ceiling: `supported`; a quick packet is never `verified`.
- Conditional work: no semantic, adversarial, or coverage worker is implied.
- Consumer boundary: quick is an evidence packet for an intelligent consumer;
  it has no independent semantic pass by design, and the caller judges
  sufficiency and conclusions.

## standard

Use for load-bearing evidence that needs independent semantic challenge.

- Required: quick topology plus selectively blind semantic verification,
  adversarial review, coverage review, and reconciliation.
- Adaptive evidence lanes: `gather`, `semantic-verification`, `adversarial`,
  `coverage`, and any predeclared `contradiction-resolution`; hard cap 10
  across those counted modes. Required `map`, `compile`, and terminal
  `reconciliation` waves are fixed at exactly one lane each, so the total
  maximum is 13 lanes.
- Maximum concurrency: 6.
- Assurance ceiling: `verified` only after exact locator validation, affirmative
  independent semantic review, no unresolved material challenge, and adequate
  coverage.
- Conditional work: at most one predeclared `contradiction-resolution`
  evidence wave for a material challenge, followed when triggered or not by
  the same one mandatory terminal reconciliation.

## thorough

Use when expensive failure or correlated blind spots justify redundant source
reopening and verification.

- Required: standard topology plus redundant independent gathering and
  redundant verification for load-bearing claims.
- Adaptive evidence lanes: the standard counted modes plus `redundant-gather`
  and `redundant-verification`; hard cap 20 across those counted modes.
  Required `map`, `compile`, and terminal `reconciliation` waves are fixed at
  exactly one lane each, so the total maximum is 23 lanes.
- Maximum concurrency: 8.
- Assurance ceiling: `verified` only for claims affirmed by the required
  independent passes and left without unresolved material challenge.
- Conditional work: optionally predeclare up to two condition-bound
  `contradiction-resolution` evidence waves within the manifest's hard cap.
  Each runs only when its approved predicate triggers; both branches feed
  exactly one mandatory terminal reconciliation.

## Planning Rules

1. Partition by source or question so lane inputs and outputs never overlap.
2. Classify required and conditional waves before target preparation.
3. Classify the actual bounded assignment. Citation reopening, explicit
   inventory comparison, counterexample search, and mechanical dossier
   compilation can remain economical; judgment-bearing interpretation or
   reconciliation may require a stronger independently approved wave.
4. Resolve and explain each wave's exact provider-native target and unsupported
   controls without cross-harness normalization.
5. Reduce lanes when scope is small; never invent work to fill a profile cap.
6. If runtime limits prevent the requested topology, prepare a different
   profile for approval or publish an honest partial after an accepted failure.
7. Never add a lane, retry, replacement, or target change beyond the approved
   envelope.
