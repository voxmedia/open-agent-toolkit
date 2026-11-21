import { DOCS_FENCES } from '@open-agent-toolkit/docs-transforms';

import type { Report } from './check.types';
import type { CheckTarget } from './files';
import type { ParsedPage } from './markdown';

const DOCS_FENCE_PREFIX = 'docs-';

/**
 * Fumadocs apps turn `docs-*` fences into figure components, and the build
 * fails on a name the transform does not know. Report it here first, with its
 * line and the known names. MkDocs and plain Markdown render the fences as
 * ordinary code, so they are not checked.
 */
export function checkDocsFences(
  target: CheckTarget,
  pages: ParsedPage[],
  report: Report,
): void {
  if (target.framework !== 'fumadocs') return;
  const known = Object.keys(DOCS_FENCES).join(', ');
  for (const page of pages)
    for (const node of page.nodes) {
      const lang = node.lang;
      if (
        node.type !== 'code' ||
        !lang?.startsWith(DOCS_FENCE_PREFIX) ||
        Object.hasOwn(DOCS_FENCES, lang)
      )
        continue;
      report(
        'docs-fences',
        'error',
        page.path,
        `Unknown docs fence \`${lang}\`. Known docs fences: ${known}.`,
        node.position?.start.line,
      );
    }
}
