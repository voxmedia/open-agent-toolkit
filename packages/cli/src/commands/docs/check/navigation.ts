import { syncFumadocsNavigation } from '@commands/docs/nav/fumadocs';
import {
  compareFumadocsMembership,
  compareMkDocsMembership,
} from '@commands/docs/nav/membership';
import { syncDocsNavigation } from '@commands/docs/nav/sync';

import type { Report } from './check.types';
import type { CheckTarget } from './files';

/**
 * `navOwner: nav-sync` keeps strict generated freshness. Hand-authored and
 * undeclared navigation gets the membership-and-order comparison (issue #367
 * P21/G5): separators, labels, links, rest entries and borrowed pages are the
 * author's presentation, never generator output to match.
 */
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
      if (generated) {
        for (const file of result.metaFiles)
          if (file.changed)
            report(
              'navigation',
              'error',
              file.path,
              'Generated navigation is stale; run oat docs nav sync.',
            );
      } else {
        for (const issue of await compareFumadocsMembership(
          target.contentRoot,
          result.metaFiles,
        ))
          report('navigation', 'error', issue.path, issue.message, issue.line);
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
      for (const issue of await compareMkDocsMembership({
        appRoot: target.appRoot,
        docsRoot: target.contentRoot,
        nonReaderPaths,
      }))
        report('navigation', 'error', issue.path, issue.message, issue.line);
    }
  } catch (error) {
    report('navigation', 'error', 'index.md', (error as Error).message);
  }
}
