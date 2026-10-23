import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { buildDocsNavTree } from '@commands/docs/nav/contents';
import { syncFumadocsNavigation } from '@commands/docs/nav/fumadocs';
import { syncDocsNavigation } from '@commands/docs/nav/sync';
import YAML from 'yaml';

import type { Report } from './check.types';
import type { CheckTarget } from './files';

function pageIdentity(item: string): string {
  // Hand-authored collision links can use their own display labels.
  return item.replace(/^\[[^\]]*\]\((.*)\)$/, '[]($1)').replace(/^\.\//, '');
}
function navIdentity(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (typeof item !== 'object' || item === null) return item;
    const entry = Object.entries(item)[0];
    if (!entry) return item;
    // Section and page labels are presentation; explicit group separators retain their labels.
    return Array.isArray(entry[1])
      ? {
          [typeof entry[1][0] === 'string' ? '$section' : entry[0]]:
            navIdentity(entry[1]),
        }
      : entry[1];
  });
}
export async function checkNavigation(
  target: CheckTarget,
  report: Report,
): Promise<void> {
  if (target.framework === 'markdown') return;
  try {
    const generated = target.documentation.navOwner === 'nav-sync';
    const nonReaderPaths = target.documentation.nonReaderPaths;
    if (target.framework === 'fumadocs') {
      const result = await syncFumadocsNavigation({
        docsRoot: target.contentRoot,
        check: true,
        nonReaderPaths,
      });
      for (const file of result.metaFiles) {
        let stale = file.changed;
        if (!generated) {
          const actual = JSON.parse(
            await readFile(join(target.contentRoot, file.path), 'utf8'),
          ) as { pages?: unknown };
          stale =
            !Array.isArray(actual.pages) ||
            !isDeepStrictEqual(
              actual.pages.map((p) =>
                typeof p === 'string' ? pageIdentity(p) : p,
              ),
              file.meta.pages.map(pageIdentity),
            );
        }
        if (stale)
          report(
            'navigation',
            'error',
            file.path,
            generated
              ? 'Generated navigation is stale; run oat docs nav sync.'
              : 'Navigation membership/order differs from authored Contents; update pages or Contents.',
          );
      }
      for (const path of result.unlisted)
        report(
          'navigation',
          'error',
          path,
          'Reader page/folder is unlisted in authored Contents and would be hidden from navigation.',
        );
    } else if (generated) {
      const result = await syncDocsNavigation({
        appRoot: target.appRoot,
        check: true,
        nonReaderPaths,
      });
      for (const path of result.stale)
        report(
          'navigation',
          'error',
          path,
          'Generated navigation is stale; run oat docs nav sync.',
        );
    } else {
      const expected = await buildDocsNavTree({
        docsRoot: target.contentRoot,
        nonReaderPaths,
      });
      const actual = YAML.parse(
        await readFile(join(target.appRoot, 'mkdocs.yml'), 'utf8'),
      ) as { nav?: unknown };
      if (!isDeepStrictEqual(navIdentity(actual.nav), navIdentity(expected)))
        report(
          'navigation',
          'error',
          'mkdocs.yml',
          'Navigation membership/order differs from authored Contents; update nav or Contents.',
        );
    }
  } catch (error) {
    report('navigation', 'error', 'index.md', (error as Error).message);
  }
}
