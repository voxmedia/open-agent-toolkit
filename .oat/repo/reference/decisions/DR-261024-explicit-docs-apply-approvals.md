---
id: DR-261024-explicit-docs-apply-approvals
title: Explicit docs apply approvals
date: 2026-10-24
status: accepted
legacy_id: null
---

# Explicit docs apply approvals

## Context

The BL-260911 front-door scope and E12 correction needed a single bootstrap/analyze/apply handoff that could not let blanket or unattended approval authorize tooling changes or other explicit recommendations. Approved brief G4 defines this boundary.

## Decision

Use the analysis artifact plus approved recommendation IDs as apply input, marking each recommendation approval explicit or default. Explicit recommendations require individual approval and are skipped with reasons under blanket/unattended approval. An approved tooling update is limited to docs dependencies, supported content migration and build verification.

## Consequences

Apply reports applied, skipped-with-reason and failed IDs. Unsupported scaffold, app and host changes remain manual. Offline package drift supplies bounded guidance and may safely remain unverified, including the approved hoisted-only resolution limitation. Evidence: docs-skills-ia-367 plan.md G4 and accepted p03/p09, implementation.md Outcome 5.

## Amended

Amended on 2026-10-25 by DR-261025-approved-docs-tooling-updates. An
individually approved tooling update may also bump the docs app's own
`@open-agent-toolkit/cli` dependency to the bundled version, in its declared
dependency section, and regenerate the app's generated manifest with that
upgraded CLI. Explicit approval, blanket and unattended skipping, and manual
scaffold changes are unchanged.
