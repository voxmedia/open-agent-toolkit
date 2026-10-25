---
id: DR-261025-framework-app-contributor
title: Framework app contributor commands resolve against the app package first
date: 2026-10-25
status: accepted
legacy_id: null
---

# Framework app contributor commands resolve against the app package first

## Context

The oat docs check commands rule started every contributing code block at the repository root. A framework docs app's own contributing pages usually speak from the app directory, so app scripts such as dev were reported missing and same-named root scripts such as build passed for the wrong package. Pages written from the repository root, including this repository's own, must keep resolving.

## Decision

For a framework app target with its own package.json, each contributing code block starts in two contexts: the app root, tried first, and the repository root as fallback. Literal cd moves both contexts; -w, --dir and --filter keep their meaning. A script resolves in the first context whose package defines it (or, for pnpm shorthand, has the installed binary). A missing script names every manifest consulted, labelled app root or repository root. Literal Markdown targets keep the repository-root context only.

## Consequences

App contributing pages no longer produce false missing-script errors, and a script only the repository root defines still resolves. A script that exists only at the root is not reported even when the page meant the app; the checker verifies existence, not intent. Documented in the docs-tooling check page.
