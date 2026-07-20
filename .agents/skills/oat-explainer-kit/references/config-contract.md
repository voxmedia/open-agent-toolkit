# OAT Explainer Configuration Contract

`oat-explainer-kit` is the OAT-aware boundary around the config-blind
`explainer-kit` core. The adapter reads each supported stored value with
`oat config get <key> --json` and preserves its `source` metadata while
constructing an `explainer-kit.run-request/v1`.

## Supported keys

| Key                                    | Stored scopes       | Built-in default |
| -------------------------------------- | ------------------- | ---------------- |
| `explainers.defaults.style`            | local, shared, user | `clean-neutral`  |
| `explainers.defaults.palette`          | local, shared, user | unset            |
| `explainers.defaults.visualProfile`    | local, shared, user | unset            |
| `explainers.defaults.themeBundlePath`  | local, shared       | unset            |
| `explainers.publish.provider`          | shared              | unset            |
| `explainers.publish.s3Uri`             | shared              | unset            |
| `explainers.publish.publicBaseUrl`     | shared              | unset            |
| `explainers.publish.awsRegion`         | shared              | unset            |
| `explainers.publish.awsProfile`        | local, user         | unset            |
| `workflow.explainers.projectExplainer` | local, shared, user | `ask`            |
| `workflow.explainers.projectRecap`     | local, shared, user | `ask`            |

Explicit runtime inputs may override these eleven keys for one invocation. They
do not write config. Recipe, slug, fact-base path, output root, per-run art
direction, and private wrapper lanes are invocation inputs rather than config
keys and are rejected from the runtime config-override map.

## Source-sensitive paths

A shared theme bundle path is repository-relative and must remain inside the
canonical repository root after resolving symlink ancestors. A local relative
path follows the same repository confinement; a local absolute path may point
outside the repository. Runtime paths follow the local rule. User config cannot
set a theme bundle path.

The four curated styles are `clean-neutral`, `business-corporate`,
`navy-ocean`, and `dark-edgy`. A theme bundle path has highest precedence,
followed by an explicit style. Legacy palette and visual-profile fields remain
accepted as an advanced compatibility path and produce deprecation warnings.
When no source explicitly configures any selection, the adapter leaves the
request theme empty so the core records its visible `clean-neutral` fallback
warning. The adapter passes a resolved bundle as `theme.suppliedBundlePath`.

## Publish block

No provider means build-only operation, even if unused destination fields are
present. When `provider` is `s3-static`, `s3Uri`, `publicBaseUrl`, and
`awsRegion` are all required. `awsProfile` is optional and uses the normal AWS
credential chain when absent. Destination roots are normalized without trailing
slashes. Lifecycle callers must explicitly select publish durability; config
alone never starts publishing.

## Canonical output roots

- Active project: `<resolved-project-path>/explainers/`, for both shared and
  local projects.
- Non-project OAT run: `.oat/repo/reference/explainers/`.
- Direct core caller: an explicit `outputRoot`; the OAT adapter does not infer
  one.

Derived OAT roots reject traversal and must remain inside their canonical root
after symlink resolution. The adapter validates all config and paths before the
core creates output.

## Run-request translation

The adapter emits `explainer-kit.run-request/v1` with the requested recipe,
slug, fact-base binding, mode, derived output root, resolved theme selection,
privacy choice, and explicit durability strategy. Publish durability adds a
complete `explainer-kit.publish-request/v1` whose `siteRoot` and
`manifestPath` point inside `<outputRoot>/<slug>/`.
