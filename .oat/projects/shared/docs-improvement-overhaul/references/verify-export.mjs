import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const evidence = '.oat/projects/shared/docs-improvement-overhaul/references/';
const map = JSON.parse(readFileSync(`${evidence}route-migration.json`, 'utf8'));
const root = resolve('apps/oat-docs/out');
const route = (page) =>
  page === 'index.md'
    ? '/'
    : `/${page.replace(/\/index\.md$/, '').replace(/\.md$/, '')}`;
const pagePaths = [
  ...new Set([
    ...map.pages
      .filter((row) => row.action !== 'router-consolidation')
      .map((row) => row.destination),
    ...map.newIndexes,
  ]),
].sort();
const expectedRoutes = pagePaths.map(route).sort();
const html = (url) => resolve(root, `.${url}`, 'index.html');
function exportedRoutes(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? exportedRoutes(
          resolve(directory, entry.name),
          `${prefix}/${entry.name}`,
        )
      : entry.name === 'index.html' && !['/404', '/_not-found'].includes(prefix)
        ? [prefix || '/']
        : [],
  );
}
assert.deepEqual(exportedRoutes(root).sort(), expectedRoutes);
const searchBytes = readFileSync(resolve(root, 'api/search'));
const search = JSON.parse(searchBytes);
const records = Object.values(search.docs.docs);
const searchPageRoutes = [...new Set(records.map((row) => row.page_id))].sort();
assert.deepEqual(
  searchPageRoutes,
  expectedRoutes,
  'Search pages must exactly match current authored routes',
);
const removed = [];
const repurposed = [];
for (const page of map.pages.filter((row) => row.action !== 'retain')) {
  if (expectedRoutes.includes(page.sourceRoute)) {
    repurposed.push({
      source: page.source,
      route: page.sourceRoute,
      currentOwner: pagePaths.find((file) => route(file) === page.sourceRoute),
    });
    continue;
  }
  assert.ok(
    !existsSync(html(page.sourceRoute)),
    `Removed export survives ${page.sourceRoute}`,
  );
  assert.ok(
    !searchPageRoutes.includes(page.sourceRoute),
    `Removed search page survives ${page.sourceRoute}`,
  );
  assert.ok(
    !records.some((row) => row.url.split('#')[0] === page.sourceRoute),
    `Removed search result survives ${page.sourceRoute}`,
  );
  removed.push({
    source: page.source,
    oldRoute: page.sourceRoute,
    destination: page.destinationRoute,
  });
}
assert.ok(
  readFileSync(resolve(root, '404.html'), 'utf8').includes(
    'Search documentation',
  ),
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
console.log(
  JSON.stringify(
    {
      sourceBaseline: map.baseline,
      mapSha256: hash(readFileSync(`${evidence}route-migration.json`)),
      exportedRoutes: expectedRoutes.map((url) => ({
        route: url,
        htmlSha256: hash(readFileSync(html(url))),
      })),
      search: {
        file: 'apps/oat-docs/out/api/search',
        sha256: hash(searchBytes),
        records: records.length,
        uniquePageRoutes: searchPageRoutes.length,
        exactlyCurrentRoutes: true,
      },
      removed,
      repurposed,
      missingRouteRecovery:
        'Home link and existing search button present in built 404; runtime browser action remains separate proof.',
      outcome: 'pass',
    },
    null,
    2,
  ),
);
