---
id: DR-260831-cause-specific-fail-closed
title: Cause-specific fail-closed runtime terminal
date: 2026-08-31
status: accepted
legacy_id: null
---

# Cause-specific fail-closed runtime terminal

## Context

A clean accepted review child that produced no artifact was previously reported as a targeting correlation failure even though no artifact existed to correlate.

## Decision

Return artifact_missing and review_completed_artifact_missing for clean accepted child completion without an artifact, while reserving targeting_correlation_failed for observed artifacts that do not match the expected run, project, or invocation.

## Consequences

Automation receives a precise recovery branch, while both outcomes remain non-receive-eligible and authorize neither same-run remediation nor replacement of an accepted launch.
