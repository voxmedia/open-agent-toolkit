# Lifecycle intent contract

The OAT adapter resolves `projectExplainer` and `projectRecap` intent before it
prepares a bundle. Lifecycle callers pass explicit inputs to
`resolveIntent(...)` and persist only the returned `record`, when present.

## Resolution

Precedence is:

1. lifecycle mode policy;
2. valid project state;
3. `workflow.explainers.*` preference;
4. the built-in `ask` default.

`resolveIntent({ product, mode, state, preference, kickoffRequest, answer,
now })` is pure. Its result contains the effective `decision`, the
`resolutionSource`, whether a prompt is needed, an optional state `record`, and
warnings.

In autonomous mode, `projectRecap` resolves to `generate` with source
`autonomous_policy`. Autonomous `projectExplainer` resolves to `generate` only
when the kickoff prompt explicitly requested it; otherwise it resolves to
`skip` without writing an invalid prompt-source record.

In interactive mode, a valid project record prevents another prompt.
Preferences `always` and `never` resolve directly but are not copied into
project state. An unresolved `ask` prompts once. Either answer produces an
`interactive` record that later lifecycle gates reuse.

## State records

Records normally retain the three-field state contract. The sole extension is
`projectRecap` `skip/failed_attempt`, which requires one project-relative
`failed_attempt_evidence` locator:

```yaml
oat_project_explainer:
  decision: generate
  source: kickoff_prompt
  decided_at: '2026-07-18T02:30:00Z'
oat_project_recap:
  decision: skip
  source: failed_attempt
  decided_at: '2026-07-18T02:30:00Z'
  failed_attempt_evidence: explainers/failed-run/failure.json
```

Allowed decision/source pairs are:

| Product            | Allowed pairs                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `projectExplainer` | `generate/interactive`, `skip/interactive`, `generate/kickoff_prompt`                                                    |
| `projectRecap`     | `generate/interactive`, `skip/interactive`, `generate/autonomous_policy`, `skip/failed_attempt`, `skip/capability_probe` |

`skip/capability_probe` is a read-only legacy pair. Readers continue to accept
an already persisted record, but lifecycle callers must not write a new one.
After an actual failed generation, persist `skip/failed_attempt` only when the
terminal guard can read either a failed or incomplete `manifest.json` or the
flow's `failure.json`. Store that proof only as
`explainers/<run-slug>/manifest.json` or
`explainers/<run-slug>/failure.json`; no other decision/source pair may carry
the field.

The pair is product-scoped but not mode-scoped. A resumed completion honors any
valid persisted skip without prompting, bundling, or authoring again. The
deployed consumer resolves only an explicitly persisted failed-attempt locator,
requires its canonical real path to remain inside the declared project run,
requires a regular file, and validates it through the terminal guard's own
failed-attempt contract. It never enumerates explainer runs for a skip.

## Safe persistence

`hashStateContent(content)` creates the optimistic concurrency token used by
`persistIntent(...)`. A caller reads `state.md`, resolves intent, and supplies
that content hash with the chosen record. Persistence:

- accepts only a regular `state.md` file and rejects symlinks;
- validates the closed record and product-specific source matrix;
- rejects a changed file with `E_INTENT_STALE_WRITE`;
- replaces only the selected top-level intent block while preserving unrelated
  frontmatter fields and the Markdown body; and
- writes a same-directory temporary file and atomically renames it.

On a stale-write conflict, re-read state and resolve precedence again. Do not
retry the old record blindly.

## Generate and consume

After a `generate` decision, follow `oat-explainer-kit` § Generate:

1. verify the installed core;
2. resolve the approved input set, theme defaults, and output root;
3. run `bundle.mjs`;
4. let the host agent author `site/index.html` from the recipe brief and
   `references/recap-authoring.md`;
5. run `verify.mjs` at the highest available browser rung; and
6. run `record.mjs`.

Read the terminal outcome from `manifest.json` and the rung and reason from
`qa/result.json`. The vocabulary is:

- `built`: generation is satisfied;
- `built-needs-review`: generation is satisfied and the artifact needs a
  human look;
- `failed`: generation is not satisfied; show the sanitized cause and require
  retry or skip; and
- `incomplete`: generation is not satisfied; require retry or skip.

If the flow stops before recording, read `failure.json` instead. A completion
resume must re-read the persisted intent before inspecting or creating a run.
A persisted skip suppresses bundle and authoring work and reaches
`check-terminal-outcome.mjs` with its recorded source as `--skip-reason`.

Project-recap lifecycle calls use `mode: unattended` and never prompt during
generation. Project-explainer failures are reported with the run path and do not
roll back an approved plan.

## Output roots and archive handoff

- Active project runs write below
  `<resolved-project-path>/explainers/<slug>/`.
- Program runs write below
  `.oat/repo/reference/explainers/<slug>/`.
- Direct core callers provide an explicit parent output root.

At project completion, pass only a selected satisfied `project-recap` run to
`oat project archive --project-recap-run`. Consume
`projectRecapExport.sourceRunRoot`, `projectRecapExport.exportRoot`, and
`projectRecapExport.manifest.relativePath` from the archive JSON response. Do
not infer the dated export path. The archive export is the durable copy.

Project-explainer runs remain active-project working artifacts and are never
exported as completion reference products. Local-scope projects do not export a
tracked recap or pass `--project-recap-run`.
