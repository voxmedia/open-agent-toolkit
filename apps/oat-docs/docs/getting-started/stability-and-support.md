---
title: Stability and Support
description: 'How stable OAT is, how to get support, and what OAT does not set out to do.'
---

# Stability and Support

This page is the owner's statement on how stable Open Agent Toolkit (OAT) is,
what support to expect, and what it does not try to do. For the version
number, license and release notes, see
[Project status](index.md#project-status).

## Stability

OAT is pretty stable at this point. Breaking changes are possible, though
until there are many users the owner would limit breaking changes.

Before you update, read
[Upgrading from an earlier CLI](tool-packs.md#upgrading-from-an-earlier-cli),
which lists defaults and exit codes that changed between releases.

## Support

Support is best effort through GitHub issues. Report problems and requests on
the [issue tracker](https://github.com/voxmedia/open-agent-toolkit/issues).

## Non-goals

- **Not an agent runtime.** OAT works through the coding agents you already
  use.
- **Not all-or-nothing.** Provider sync, skills, tracked workflows and docs
  tooling each work on their own. See
  [Core Concepts](concepts.md).
- **Not two-way sync.** `.agents/` is the source of truth. Provider views are
  derived from it, and `oat sync` overwrites edits made directly in provider
  folders. See
  [Manifest and Drift](../provider-sync/manifest-and-drift.md#quick-look).
- **Not a guarantee of which model runs.** OAT records the model it asked a
  provider to use, and some providers can run a different one. See
  [Known limits](index.md#known-limits).
