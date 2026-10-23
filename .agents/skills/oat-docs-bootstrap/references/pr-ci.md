# Pull-request docs checks

Load this recipe during bootstrap config inspection, including Markdown setup.
Present the exact workflow diff for the selected repo and get approval before
writing it. Preserve existing triggers, jobs, permissions and steps. Existing-app
repair remains analyze/apply work; this recipe does not authorize scaffold or CI
replacement, deployment, or publication.

## Resolve the concrete inputs

Read the actual shared config and package scripts, then substitute these values
in the existing PR workflow (or propose a new docs job if none exists):

- `DOCS_ROOT`: configured repository-relative documentation root.
- `DOCS_CONTENT`: literal root for Markdown; actual framework content directory.
- `DOCS_TOOLING`: `markdown`, `fumadocs` or `mkdocs`.
- `DOCS_BUILD_SCRIPT`: actual app build script (`build` for Fumadocs,
  `docs:build` for the starter MkDocs app); empty for Markdown.
- `DOCS_MANIFEST`: only an explicitly configured **generated Markdown inventory**,
  such as a Fumadocs app-root `index.md`. Leave empty for Markdown unless the
  user separately configured an external inventory. An authored Markdown index
  or MkDocs YAML is not a generated Markdown inventory.

Use Node >=22.17 and the repo's package-manager pin. Provision the selected CLI
version through the repo's existing dependency installation; framework starters
declare it in their app package. Add the app's `node_modules/.bin` to `GITHUB_PATH`
when the binary is installed there. A Markdown-only repo uses its existing approved
CLI provision; do not introduce an app, dependency install or build just for this
recipe. For MkDocs use the selected Python environment and the existing pinned
requirements/setup script. Do not upgrade framework or Python packages implicitly.
In a workspace install from the workspace root; for a nested standalone app,
install in that app. Keep existing unrelated setup steps. For Fumadocs, first
inspect the approved effective-root `pnpm-workspace.yaml` compatibility override
(`mdast-util-to-markdown: 2.1.2`) from Step4a; verify actual resolution and retain
the lockfile. Do not use member-only policy, silently merge a conflicting root
setting or claim an unconstrained install. A pending/declined root edit leaves
setup unverified.

Checkout needs full history so the read-only diagram comparison can use
`origin/main` (or the configured `documentation.check.diagramBaseRef`). For a
custom base fetch that ref explicitly. A missing base leaves static checks active
but reports diagram freshness unverified; do not label that result verified.

## Verification steps

This concrete example uses a Fumadocs root `docs-site`. Substitute every env value
from the inspected repo, retaining the same checker → build → configured-manifest
order. The `oat` binary must be on PATH from the provision above. Generated manifests
are committed; the freshness step rejects an untracked output too.

```yaml
- uses: actions/checkout@v5
  with:
    fetch-depth: 0
# Keep the repo's Node/package-manager/dependency setup here.
- name: Verify documentation
  env:
    DOCS_ROOT: docs-site
    DOCS_CONTENT: docs-site/docs
    DOCS_TOOLING: fumadocs
    DOCS_BUILD_SCRIPT: build
    DOCS_MANIFEST: docs-site/index.md
  shell: bash
  run: |
    set -euo pipefail
    oat docs check --target-dir "$DOCS_ROOT"
    if [ "$DOCS_TOOLING" != markdown ]; then
      (cd "$DOCS_ROOT" && pnpm run "$DOCS_BUILD_SCRIPT")
    fi
    if [ -n "$DOCS_MANIFEST" ]; then
      git ls-files --error-unmatch -- "$DOCS_MANIFEST"
      oat docs generate-index --docs-dir "$DOCS_CONTENT" --output "$DOCS_MANIFEST"
      git diff --exit-code -- "$DOCS_MANIFEST"
    fi
```

Run those exact commands locally from the repository root after installation,
with the same concrete inputs and PATH. Record checker, real framework build and
freshness exits separately. A seeded missing description must fail the checker;
a stale committed configured manifest must fail the final diff. Restore fixtures
after each control. A command-order stub is not a framework build. Markdown uses
empty build/manifest inputs and runs only the checker.

If a check fails, repair the authored metadata/maps/links or explicitly sync owned
navigation; never remove the check, silently regenerate a hand-authored sidebar,
or add a blanket exclusion. Review warnings and narrow reason-bearing exceptions.
A build that regenerates an inventory does not prove committed freshness: keep
the final Git diff after the build. Report unverified or declined CI changes in
the bootstrap exit summary rather than claiming CI is wired.
