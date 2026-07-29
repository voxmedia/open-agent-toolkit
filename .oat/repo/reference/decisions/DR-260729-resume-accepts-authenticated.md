---
id: DR-260729-resume-accepts-authenticated
title: Resume accepts authenticated current tokens only
date: 2026-07-29
status: accepted
legacy_id: null
---

# Resume accepts authenticated current tokens only

## Context

Legacy eligibility and cross-checks among mutable retained records allowed coordinated downgrade, request mutation, output-root relocation, and symlink-retarget attacks.

## Decision

Accept only authenticated ekrt2 resume tokens that bind the complete canonical request and original canonical output root to external approval state.

## Consequences

Transparent legacy ekrt1 resume compatibility is removed; current resumes fail closed when retained request bytes, policy, paths, or roots differ.
