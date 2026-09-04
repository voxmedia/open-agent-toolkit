# Recon Profiles

Profiles define assurance topology, not a model tier. The controller sizes
adaptive lanes from a mechanical source inventory, shows exact counts before
approval, and never exceeds the approved hard cap. Every wave remains
homogeneous and every pass uses the same approved model and effort.

## quick

Use for bounded orientation where independently checked locators and supported
claims are sufficient.

- Required: one mapping wave, one or more non-overlapping gather lanes, one
  compile lane, deterministic schema and locator validation, and rendering.
- Adaptive lane range: 1–4 gather lanes; hard cap 4.
- Maximum concurrency: 4.
- Assurance ceiling: `supported`; a quick packet is never `verified`.
- Conditional work: no semantic, adversarial, or coverage worker is implied.

## standard

Use for load-bearing evidence that needs independent semantic challenge.

- Required: quick topology plus selectively blind semantic verification,
  adversarial review, coverage review, and reconciliation.
- Adaptive lane range: 1–6 gather lanes and 1–3 verification lanes; hard cap 10
  total worker lanes.
- Maximum concurrency: 6.
- Assurance ceiling: `verified` only after exact locator validation, affirmative
  independent semantic review, no unresolved material challenge, and adequate
  coverage.
- Conditional work: at most one approved reconciliation lane for a material
  contradiction.

## thorough

Use when expensive failure or correlated blind spots justify redundant source
reopening and explicit contradiction resolution.

- Required: standard topology plus redundant independent gathering and
  verification for load-bearing claims and explicit contradiction resolution.
- Adaptive lane range: 2–10 gather lanes and 2–6 verification or adversarial
  lanes; hard cap 20 total worker lanes.
- Maximum concurrency: 8.
- Assurance ceiling: `verified` only for claims affirmed by the required
  independent passes and left without unresolved material challenge.
- Conditional work: up to two approved contradiction-resolution lanes within
  the manifest's hard cap.

## Planning Rules

1. Partition by source or question so lane inputs and outputs never overlap.
2. Classify required and conditional waves before target preparation.
3. Compute the run-wide maximum model-class floor from every allowed wave.
4. Reduce lanes when scope is small; never invent work to fill a profile cap.
5. If runtime limits prevent the requested topology, prepare a different
   profile for approval or publish an honest partial after an accepted failure.
6. Never add a lane, retry, or replacement beyond the approved envelope.
