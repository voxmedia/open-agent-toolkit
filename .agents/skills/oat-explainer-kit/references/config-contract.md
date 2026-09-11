# OAT Explainer Configuration Contract

`oat-explainer-kit` is the OAT-aware boundary around the config-blind
`explainer-kit` core. The adapter reads each supported stored value with
`oat config get <key> --json` and preserves its `source` metadata while
resolving the theme used by `bundle.mjs`.

## Supported explainer defaults

| Key                                   | Stored scopes       | Built-in default |
| ------------------------------------- | ------------------- | ---------------- |
| `explainers.defaults.style`           | local, shared, user | `clean-neutral`  |
| `explainers.defaults.palette`         | local, shared, user | unset            |
| `explainers.defaults.visualProfile`   | local, shared, user | unset            |
| `explainers.defaults.themeBundlePath` | local, shared       | unset            |

Explicit runtime inputs may override these four keys for one invocation. They
do not write config. Recipe, slug, fact-base path, output root, and art
direction are invocation inputs rather than config keys and are rejected from
the runtime config-override map.

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
When no source explicitly configures a selection, the core records its visible
`clean-neutral` fallback.

## Canonical output roots

- Active project: `<resolved-project-path>/explainers/`.
- Program or repository run: `.oat/repo/reference/explainers/`.
- Direct core caller: an explicit parent output root.

Derived OAT roots reject traversal and remain inside their canonical root after
symlink resolution. The adapter validates config and paths before the core
creates output.
