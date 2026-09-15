---
name: oat-explainer-kit
description: Use when building project explainers or recaps from OAT configuration, state, and lifecycle artifacts.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, AskUserQuestion
metadata:
  version: 1.0.10
---

# OAT Explainer Kit

Adapt OAT project and program context into the agent-authored flow provided by
the canonical `explainer-kit` core.

## Responsibilities

- Require a compatible installed `explainer-kit` core.
- Resolve explainer defaults and preserve their source attribution.
- Derive canonical project or repository output roots with
  `scripts/resolve-paths.mjs`.
- Bind OAT lifecycle artifacts to generic recipe source roles.
- Resolve and persist project-explainer and project-recap intent.
- Run the core's bundle, agent-authoring, verification, and recording stages.
- Return the terminal outcome and run path to the lifecycle caller.

Before reading OAT config or preparing a bundle, call
`scripts/check-core.mjs#checkCoreCompatibility` with this installed skill
directory and the exported `MINIMUM_CORE_VERSION`. Continue only when it returns
`ok: true`.

- Missing core: stop and show
  `oat tools install utility --scope user`.
- Incompatible core: stop and show
  `oat tools update --pack utility --scope user`.
- Never search a repository checkout or another noncanonical path as fallback.

## Asset Resolution

Resolve adapter scripts and references relative to this installed skill
directory. Resolve the core only from its installed canonical skill path. Never
fall back to a repository source checkout.

## Generate

Use this flow for `project-recap`, `program-recap`, or `project-explainer`.
Lifecycle callers use `mode: unattended` and never prompt.

1. Check the installed core as described above.
2. Resolve intent with `scripts/resolve-intent.mjs`. Persist a returned record
   with `scripts/persist-intent.mjs` before generation. A persisted `skip`
   ends the flow without bundling or authoring.
3. Resolve only the `explainers.defaults.*` theme values with
   `scripts/resolve-config.mjs`.
4. Resolve the parent output root with
   `scripts/resolve-paths.mjs#resolveExplainerOutputRoot`.
5. Resolve approved inputs with
   `scripts/bind-project-sources.mjs`. `project-explainer` uses `plan.md`,
   `design.md`, `spec.md`, and optional `discovery.md`. `project-recap` also
   uses completion, summary, project-log, and optional orchestration material.
   `program-recap` uses the program record and its reconciled summaries.
6. Run the installed core's `scripts/bundle.mjs` with the selected recipe,
   input mode, resolved theme JSON, and run root. If it reports `reuse: true`,
   return that satisfied run without authoring or recording again.
7. The host agent reads the recipe's `briefRef`, the core's
   `references/recap-authoring.md`, `source/fact-base.json`,
   `source/ledger.json`, and `theme.resolved.json`, then authors exactly one
   `site/index.html` from the recipe shell.
8. Run `scripts/verify.mjs`. Use the first available rung: host browser capture
   and inspection at 320, 768, and 1440 pixels; the Playwright probe; or the
   browser-free `none` rung. Browser-free checks always run.
9. Run `scripts/record.mjs` with the recipe, slug, `mode: unattended`, and
   resolved theme. Do not write into the run root after recording.
10. Return the run path, `runId`, and outcome from
    `explainer-kit.manifest/v2`. `built` and `built-needs-review` satisfy a
    `generate` intent; `failed` and `incomplete` do not.

On `failed` or `incomplete`, show the sanitized cause and require retry or an
explicit skip. A skip after an attempted run must be persisted as
`skip/failed_attempt` with `failed_attempt_evidence` set to the project-relative
`explainers/<run-slug>/manifest.json`, or to that run's `failure.json` when
recording never occurred. The deployed completion consumer validates canonical
project/run containment and the terminal evidence contract before returning
the trusted path to `scripts/check-terminal-outcome.mjs`.
`skip/capability_probe` remains readable only for an existing legacy intent and
must not be newly written.

## Progress Indicators (User-Facing)

For interactive runs, show a concise banner and adapter stage updates:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ EXPLAINER KIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report compatibility, intent, source binding, bundle, authoring, verification,
recording, and outcome stages. Lifecycle-triggered unattended runs must not
prompt.
