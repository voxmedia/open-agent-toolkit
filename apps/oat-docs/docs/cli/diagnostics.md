---
title: Diagnostics
description: ""
---

# Diagnostics

This page covers cross-cutting CLI diagnostics that validate environment setup, canonical structures, and operational health.

## `oat doctor`

Purpose:

- Run environment diagnostics with pass/warn/fail outcomes and fix guidance

Key behavior:

- Checks runtime prerequisites (for example, Node/pnpm and canonical directory setup)
- Includes per-scope `skill_versions` diagnostics (for example, `project:skill_versions` / `user:skill_versions`) that compare installed OAT skills to bundled versions
- Warns on outdated installed skills and recommends `oat tools update` for remediation
- Complements `oat status`/`oat sync` by surfacing setup and version issues before sync drift becomes confusing

Related docs:

- Tool packs and installed assets (`oat tools ...`): `tool-packs-and-assets.md`
- Provider interop (`oat status`, `oat sync`, `oat providers ...`): `provider-interop/index.md`
- Troubleshooting recipes: `../reference/troubleshooting.md`
