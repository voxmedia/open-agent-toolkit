---
title: Verifying Explainer Kit
description: 'Maintainer runbook for golden recap cases, real-Chromium evidence, fixture regeneration, and release validation.'
---

# Verifying Explainer Kit

Explainer Kit uses portable behavioral goldens and a real-browser release gate.
The goal is not pixel identity: output may change markup, spacing, and
composition when it preserves the same meaning, topology, interactions, and
evidence quality.

## Golden cases

The suite under
`.agents/skills/explainer-kit/tests/fixtures/golden/` contains three
self-contained cases:

| Case                           | What it proves                                             |
| ------------------------------ | ---------------------------------------------------------- |
| `simple`                       | First-viewport clarity and a cohesive baseline recap       |
| `non-linear`                   | Exact branch, fan-in, and cycle preservation               |
| `explainer-authoring-redesign` | Archive-only rebuild from a dense completed project record |

Every case retains source claims, topology, rubric pointers, personal-kit
reference artifacts, browser evidence, screenshots, and content hashes. Paths
are repository-relative; machine roots, home-relative paths, `file://` URLs,
Windows drive paths, and UNC paths are rejected.

## Prerequisites

- Install workspace dependencies.
- Ensure the repository-supported Chromium runtime is installed and launchable.
- Run from the repository root.

The end-to-end benchmarks require an actual launched Chromium session. A
deterministic fixture session is valid only for bounded unit/integration tests
and cannot satisfy a golden production path.

## Run the golden suite

```bash
node --test \
  .agents/skills/explainer-kit/tests/golden-conformance.test.mjs
```

A passing run proves:

- one planner-owned hub, architecture view, and deck;
- source and terminology cohesion;
- exact topology and catalog parity;
- mobile, tablet, and desktop Chromium evidence;
- one independent critic invocation; and
- zero or one bounded correction before a passing terminal review.

The suite recomputes retained hashes and JSON evidence pointers. A prose claim
or status label without the referenced bytes does not pass.

## Regenerate one case

Generated runtime outputs are products of the rebuilt runtime. Do not hand-edit
files under a case's `runtime/` directory.

Set `UPDATE_GOLDEN_CASE` to exactly one case ID:

```bash
UPDATE_GOLDEN_CASE=simple \
  node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs

UPDATE_GOLDEN_CASE=non-linear \
  node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs

UPDATE_GOLDEN_CASE=explainer-authoring-redesign \
  node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs
```

The command still runs every test, but only the matching case replaces retained
runtime evidence. Review the complete generated diff, confirm the browser
runtime and capture identity are consistent across records, and rerun the suite
without the environment variable.

## Focused integrity suites

Use these when changing browser identity, immutable evidence, resume, or archive
contracts:

```bash
node --test \
  .agents/skills/explainer-kit/tests/records.test.mjs \
  .agents/skills/explainer-kit/tests/run.integration.test.mjs

node --test \
  .agents/skills/explainer-kit/tests/browser-runtime.test.mjs \
  .agents/skills/explainer-kit/tests/qa.test.mjs \
  .agents/skills/explainer-kit/tests/contracts.test.mjs \
  .agents/skills/explainer-kit/tests/durability.test.mjs \
  .agents/skills/explainer-kit/tests/rebuildability.test.mjs

pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/archive/archive-utils.test.ts \
  src/release/public-package-contract.test.ts

node --test tools/smoke/explainer-kit/*.test.mjs
```

## Release gate

The required publishable-package gate is:

```bash
pnpm release:validate
```

It validates all five lockstep public package tarballs and then runs the bounded
curated-style/template matrix in real Chromium. The visual gate retains 65
machine-readable viewport, clipping, motion, keyboard, no-JavaScript, and print
measurements. Missing Chromium or untrusted retained evidence fails closed.

For the full repository closeout, also run the standard checks documented in
the root `AGENTS.md`:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
git diff --check
```

Do not treat an isolated transient timeout as a product pass or failure without
reproducing the failing test. Preserve the exact-head successful rerun evidence
used for release closure.
