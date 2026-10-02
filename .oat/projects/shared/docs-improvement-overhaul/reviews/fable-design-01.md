# Fable lightweight-design review

Reviewer: Fable 5.1, resumed Claude session `3483d7f2-3893-40d6-96b6-0a84dc51d773`, via user-approved peer messaging. Received 2026-10-01. Source is the peer's direct message; this is not a configured OAT gate result.

Direction accepted with four must-fix findings:

1. Folder labels need the same frontmatter-title authority as leaves, not parent Contents labels. Resolved: child index title owns folder label; mismatch validation covers section entries.
2. Extra ownership keys in meta.json lack demonstrated MDX schema compatibility. Resolved: use ignored sidecar ownership manifest with hashes; metadata contains supported Fumadocs fields only.
3. Catalog storage/build order unspecified. Resolved: commit generated catalog block, check it before nav generation, include it in bundled docs; builds do not rewrite committed output.
4. Catalog phase hides substantial authoring/applicability work. Resolved: separate mapping task, non-author evidence-based audit of every included skill, then minimum owner sections, then generation/checks. Explicit required/optional/none definitions cover project-entry skills.

Recommendations incorporated: dispatch evidence-layers stays Advanced; source validation is the fresh-checkout CI guarantee; enumerate nav-command skill/template consumers; theme-neutral SVG; useful not-found entrypoints; phase 1 temporarily follows existing Contents order. Actual GitHub acceptance requires an authorized publication, not a planning-time push.

Root self-check: no template placeholders; consistent label and generated-output ownership; no implementation or unsupported distribution expansion; remaining ambiguities resolved through explicit applicability, output ordering and no-alias boundaries. The forthcoming plan review also checks these corrections against the final design.
