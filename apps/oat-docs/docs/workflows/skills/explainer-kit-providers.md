---
title: Explainer Provider Integration
description: 'Provider-neutral planner, author, browser-session, and visual-critic contracts for Explainer Kit integrators.'
---

# Explainer Provider Integration

Explainer Kit keeps model and browser providers outside its retained request
contracts. Integrators supply executable seams in process or through validated
module exports; the core owns schemas, evidence binding, and terminal outcomes.

For recipes, authoring behavior, themes, and lifecycle policy, start with
[Explainer Kit](explainer-kit.md).

## Provider boundaries

Use exactly one form for each required role:

| Role               | Direct input     | Module-path input          | Required export                     |
| ------------------ | ---------------- | -------------------------- | ----------------------------------- |
| Set planning       | `planSet`        | `planSetModulePath`        | `planSet` function                  |
| Artifact authoring | `author`         | `authorModulePath`         | `author` function                   |
| Browser evidence   | `browserSession` | `browserSessionModulePath` | branded `browserSession` descriptor |
| Whole-set review   | `visualCritic`   | `visualCriticModulePath`   | `visualCritic` function             |

`project-recap` requires all four roles. Other recipes require the author and
use their recipe-specific planning behavior. Direct-plus-module conflicts,
missing files, and invalid exports fail at the adapter boundary before core
execution.

Do not place browser or visual-review providers in `coreOptions`. Executable
callbacks, descriptors, and module paths are transient and never enter
`ExplainerRunRequestV1`, `run-request.json`, or immutable package hashes.

## Set planner

The provider-neutral `planSet` callback runs once after fact reconciliation and
before any author callback. It returns the complete portfolio and one shared
claim ledger.

For a project recap, the portfolio must contain the required hub, architecture
view, and deck. Optional entries must use a recipe-licensed profile, remain
inside recipe and per-profile limits, and carry source-backed justification.
Duplicate identities, undeclared sources, conflicting shared terms, and
unjustified optionals fail validation.

Every author request receives the immutable set context and its matching planned
artifact. Authors cannot add, remove, replace, or rename portfolio entries.

## Artifact author

The core invokes `author` once per planned artifact with
`explainer-kit.author-request/v2`. The request contains:

- artifact identity, type, and authoring path;
- the versioned brief and bundled medium-specific guidance;
- reconciled facts and the shared set context;
- the matching planned artifact;
- the resolved theme; and
- the bundled shell for artistic HTML.

Return `explainer-kit.author-result/v2` with exactly one of
`content.markdown` or `content.html` and non-secret provenance. The core
validates source overlap, path ownership, script identity, and structural
contracts after the callback returns.

The author, fact critic, browser probe, and visual critic must have distinct
callback identities. One provider implementation may back multiple roles, but
the adapter still requires separate executable boundaries.

## Trusted browser session

Create a direct session with the compatible core:

```js
const browserSession = await core.createBrowserProbeSession();

try {
  await runOatExplainer(request, {
    planSet,
    author,
    browserSession,
    visualCritic,
  });
} finally {
  await browserSession.close();
}
```

The factory launches Chromium and derives the runtime name and version from the
actual browser instance. A private in-memory brand prevents a plain object with
caller-authored `{name, version}` metadata from impersonating a trusted
session. Module providers export the already branded descriptor as
`browserSession`, not a bare callback.

For unattended project recaps, the core chooses 320, 768, and 1440 widths and
requires default-scenario PNGs. It validates the PNG signature, decoded
dimensions, and pixel payload, then writes paired
`explainer-kit.browser-evidence/v2` metrics. Every record retains:

- launched Chromium name and version;
- fixed capture settings;
- one derived capture identity;
- viewport and scenario;
- screenshot path and byte binding; and
- measured overflow, clipping, readability, motion, keyboard, deck, and theme
  behavior.

All records in one review chain must carry the same runtime and capture
identity. Deterministic fixture sessions are explicit test helpers and are
rejected by unattended production recap paths.

## Whole-set visual critic

The `visualCritic` receives one
`explainer-kit.visual-review-request/v1` plus a confined evidence reader. The
request binds:

- every rendered artifact and its exact content hash;
- every viewport-matched screenshot and metrics hash;
- cohesion observations from the shared ledger; and
- the trusted browser runtime and capture identity.

Return `explainer-kit.visual-review-result/v1` with the exact request identity,
all reviewed artifact IDs, structured findings, and one disposition:

- `pass` completes the review gate;
- `correct` requests one bounded correction and one final review; or
- `fail` terminates the gate.

The critic must not mutate rendered files or evidence. The core revalidates all
bound bytes after each callback.

## Terminal behavior

There is never a second correction or third review. Missing, malformed, forged,
stale, cross-record-mismatched, or mutated evidence; a thrown callback; a
`fail`; or an unresolved correction produces `built-needs-review`.

That outcome retains available artifacts and review evidence for diagnosis, but
invokes neither durability nor publication. It cannot be finalized, archived,
attested, or pushed as a successful recap.

See [Troubleshooting](../../reference/troubleshooting.md) for recovery steps.
