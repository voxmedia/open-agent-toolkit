---
id: DR-260928-validate-recon-assignments
title: Validate recon assignments before launch in the recon skill
date: 2026-09-28
status: accepted
legacy_id: null
---

# Validate recon assignments before launch in the recon skill

## Context

Recon worker assignment envelopes were launched without deterministic validation, so malformed or over-authorized assignments reached workers (BL-260927-validate-recon-worker, GitHub #295). Review and gate rounds in backlog-wave-2 found successive authority gaps: unbounded read sources, arbitrary output schemas, mutation-capable tool names, and unbounded write paths.

## Decision

Ship recon/scripts/validate-assignment.mjs beside validate-packet.mjs, reusing its contract library, so validation ships with the pack that launches workers; oat-reviewer runs it before launch. Envelopes are kind recon.assignment, schemaVersion 1. The validator reports every invalid field, enforces one homogeneous wave per array, bounds read sources to allowed inputs and scope outside exclusions, accepts only an allowlist of read-only tools, bounds write paths to the artifact kind's packet folder, and accepts only approved output-schema references; inline output schemas are dropped because the artifact kind fixes the schema.

## Consequences

Codex workers read through their command-execution tool, which the allowlist rejects, so Codex recon lanes fall back to inline coverage until BL-260928-settle-codex-read-authority is resolved (with weaker writePath form checks, web tools without URL sources, and mode-versus-kind checks). Tool authority defaults to rejection for unknown names.
