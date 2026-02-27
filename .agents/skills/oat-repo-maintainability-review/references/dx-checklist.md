# DX Checklist

Use this checklist during analysis. Include relevant checks in repo and directory scopes.

## Setup and Tooling

- Are setup steps documented and reproducible?
- Are required runtime/tool versions explicit?
- Are onboarding commands current and verifiable?

## Feedback Loops

- Is lint/type/test feedback fast enough for iterative work?
- Are failures actionable and clear?
- Are common workflows scriptable and discoverable?

## Developer Friction

- Are repetitive manual steps still required?
- Are local/dev workflows consistent across packages?
- Are debugging and tracing paths documented?

## Reliability of DX Signals

- Do tests/lint/type-check cover common change paths?
- Are flaky or non-deterministic workflows identified?
- Are confidence notes included when evidence is weak?

## Verification Runbook

- Validate repo scope run includes all required sections and scoring summary.
- Validate directory scope run remains constrained to the requested target.
- Validate inline mode returns complete summary fields without file writes.
