---
title: Verifying Explainer Kit
description: 'Maintainer runbook for semantic golden cases, temporary real-Chromium evidence, and release validation.'
---

# Verifying Explainer Kit

Explainer Kit uses portable behavioral goldens and a real-browser release gate.
The goal is not pixel identity: output may change markup, spacing, and
composition when it preserves the same meaning, topology, interactions, and
evidence quality.

## Golden cases

The suite under
`.agents/skills/explainer-kit/tests/fixtures/golden/` contains three
portable semantic cases:

| Case                           | What it proves                                             |
| ------------------------------ | ---------------------------------------------------------- |
| `simple`                       | Viewport-sized lead evidence and a cohesive baseline recap |
| `non-linear`                   | Exact branch, fan-in, and cycle preservation               |
| `explainer-authoring-redesign` | Archive-only rebuild from a dense completed project record |

Every case retains only its descriptor, source input, and content-addressed
source record. The three cases share one rubric. Generated artifacts, browser
evidence, screenshots, manifests, catalogs, and review results stay in a
temporary test directory and are never committed. Paths are
repository-relative; machine roots, home-relative paths, `file://` URLs,
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
- a passing terminal review without correction.

The focused integration suites below separately exercise the one-correction
ceiling.

The suite recomputes semantic-input hashes, grounds every claim in retained
source evidence, and evaluates the shared rubric against live runtime output.
A prose claim or status label without runtime proof does not pass.

## Inspect generated evidence

The suite materializes each case's runtime package under its temporary working
directory, validates it, and removes it at test completion. Add a local
debugger breakpoint or temporarily disable cleanup when diagnosing a failure;
do not add generated runtime output to the fixture directories.

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
