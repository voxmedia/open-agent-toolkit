---
id: DR-260729-unattended-recap-publication
title: Unattended recap publication requires trusted browser review
date: 2026-07-29
status: accepted
legacy_id: null
---

# Unattended recap publication requires trusted browser review

## Context

Mechanically valid artifacts and caller assertions did not prove that rendered output was legible, cohesive, or produced by a trusted browser runtime.

## Decision

Require retained real-Chromium evidence and independent whole-set visual criticism before unattended adaptive recaps can finalize, publish, become durable, or enter archives.

## Consequences

Missing or invalid browser-review evidence terminates as built-needs-review for manual recovery, while interactive and deterministic modes retain their explicit mode-aware contracts.
