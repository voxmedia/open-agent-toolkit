import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

import { canonicalHash, validateContract } from '../scripts/lib/contracts.mjs';

const skillRoot = new URL('../', import.meta.url);
const templateNames = [
  'house-style.html',
  'deck-shell.html',
  'diagram-shell.html',
  'engineer-tour.html',
];
const requiredTokens = {
  'house-style.html': [
    'THEME_CSS',
    'TITLE',
    'DESCRIPTION',
    'EYEBROW',
    'NAVIGATION',
    'CONTENT',
    'FOOTER',
  ],
  'deck-shell.html': ['THEME_CSS', 'TITLE', 'DESCRIPTION', 'SLIDES'],
  'diagram-shell.html': [
    'THEME_CSS',
    'TITLE',
    'DESCRIPTION',
    'DIAGRAM',
    'LEGEND',
  ],
  'engineer-tour.html': [
    'THEME_CSS',
    'TITLE',
    'DESCRIPTION',
    'EYEBROW',
    'NAVIGATION',
    'CONTENT',
    'DIAGRAM',
    'FOOTER',
  ],
};
const forbiddenProduction = [
  /voxops/i,
  /vox media/i,
  /cyclone-docs/i,
  /open-agent-toolkit\.voxops/i,
  /cloudfront\.net/i,
  /amazonaws\.com/i,
  /github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+/i,
  /googleapis\.com/i,
  /cdn\.jsdelivr\.net/i,
  /fonts\.googleapis\.com/i,
  /#[0-9a-f]{6}/i,
];

async function template(name) {
  return readFile(new URL(`templates/${name}`, skillRoot), 'utf8');
}

test('production templates are complete neutral shells with documented tokens', async () => {
  for (const name of templateNames) {
    const html = await template(name);
    assert.match(html, /^<!doctype html>/i, name);
    assert.match(html, /<html lang="en">/i, name);
    assert.match(html, /<head>[\s\S]*<\/head>/i, name);
    assert.match(html, /<body>[\s\S]*<\/body>\s*<\/html>\s*$/i, name);
    assert.match(html, /TEMPLATE CONTRACT:/, name);

    const documented = html.match(/TEMPLATE CONTRACT: ([A-Z_, ]+)/)?.[1] ?? '';
    for (const token of requiredTokens[name]) {
      assert.match(
        documented,
        new RegExp(`(?:^|, )${token}(?:,|$)`),
        `${name}: ${token}`,
      );
      assert.match(html, new RegExp(`{{${token}}}`), `${name}: ${token}`);
    }

    for (const forbidden of forbiddenProduction)
      assert.doesNotMatch(html, forbidden, name);
    assert.doesNotMatch(
      html,
      />\s*(?:Point one|Lane A|Node A|Section A)\s*</i,
      name,
    );
  }
});

test('production templates keep every runtime asset inline', async () => {
  for (const name of templateNames) {
    const html = await template(name);
    assert.doesNotMatch(html, /<(?:link|img|iframe)\b/i, name);
    assert.doesNotMatch(html, /<(?:script|source)\b[^>]+\bsrc\s*=/i, name);
    assert.doesNotMatch(html, /@import\b|url\(\s*['"]?https?:/i, name);
    assert.match(html, /<style>[\s\S]*<\/style>/i, name);
  }
});

test('house and engineer shells preserve sticky navigation and tour interactions', async () => {
  const house = await template('house-style.html');
  const tour = await template('engineer-tour.html');

  assert.match(house, /\.toc\s*\{[^}]*position:\s*sticky/i);
  assert.match(house, /IntersectionObserver/);
  assert.match(tour, /\.toc\s*\{[^}]*position:\s*sticky/i);
  assert.match(tour, /\.diagram-rail\s*\{[^}]*position:\s*sticky/i);
  assert.match(tour, /data-active-nodes/);
  assert.match(tour, /IntersectionObserver/);
  assert.match(tour, /querySelectorAll\(['"]\.snippet-toggle['"]\)/);
  assert.match(tour, /setAttribute\(['"]aria-expanded['"]/);
});

test('diagram shell preserves an inline accessible diagram viewport', async () => {
  const html = await template('diagram-shell.html');

  assert.match(html, /class="diagram-shell"/);
  assert.match(html, /class="diagram-viewport"/);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /overflow:\s*auto/);
});

test('deck advances horizontally while containing wide inner content', async () => {
  const html = await template('deck-shell.html');

  assert.match(html, /\.deck\s*\{[^}]*display:\s*flex/i);
  assert.match(html, /\.deck\s*\{[^}]*overflow-x:\s*auto/i);
  assert.match(html, /\.deck\s*\{[^}]*scroll-snap-type:\s*x mandatory/i);
  assert.match(html, /\.slide\s*\{[^}]*flex:\s*0 0 100%/i);
  assert.match(html, /\.slide\s*\{[^}]*min-width:\s*0/i);
  assert.match(html, /\.slide__content\s*\{[^}]*max-width:\s*100%/i);
  assert.match(html, /\.slide__content\s*\{[^}]*overflow-x:\s*auto/i);
  assert.match(html, /scrollIntoView\(\{[^}]*inline:\s*['"]start['"]/i);
});

test('deck supports both arrow pairs and readable no-JS and print layouts', async () => {
  const html = await template('deck-shell.html');

  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.match(html, new RegExp(`['"]${key}['"]`), key);
  }
  assert.match(html, /<noscript>[\s\S]*vertical document[\s\S]*<\/noscript>/i);
  assert.match(html, /html:not\(\.js\) \.deck\s*\{[^}]*display:\s*block/i);
  assert.match(html, /html:not\(\.js\) \.slide\s*\{[^}]*min-height:\s*auto/i);
  assert.match(
    html,
    /html:not\(\.js\) \.slide__content\s*\{[^}]*overflow-x:\s*auto/i,
  );
  assert.match(
    html,
    /html:not\(\.js\) \.slide__content\s*\{[^}]*overflow-y:\s*visible/i,
  );
  assert.match(
    html,
    /@media print\s*\{[\s\S]*\.deck\s*\{[^}]*display:\s*block/i,
  );
  assert.match(
    html,
    /@media print\s*\{[\s\S]*\.slide\s*\{[^}]*break-after:\s*page/i,
  );
  assert.match(
    html,
    /@media print\s*\{[\s\S]*\.slide\s*\{[^}]*min-height:\s*auto/i,
  );
  assert.match(
    html,
    /@media print\s*\{[\s\S]*\.slide__content\s*\{[^}]*overflow:\s*visible/i,
  );
});

test('worked examples are quarantined under examples and use RFC 2606 domains', async () => {
  const expected = [
    'examples/project-explainer/fact-base.md',
    'examples/project-explainer/content.md',
    'examples/project-recap/fact-base.md',
    'examples/project-recap/content.md',
    'examples/theme-bundle.json',
  ];

  for (const path of expected) {
    const value = await readFile(new URL(path, skillRoot), 'utf8');
    assert.ok(value.trim().length > 40, path);
    assert.doesNotMatch(
      value,
      /https?:\/\/(?![^/\s]*\.(?:example|invalid|test)\b)[^)\s]+/i,
      path,
    );
  }

  const templateEntries = await readdir(new URL('templates/', skillRoot));
  assert.deepEqual(templateEntries.sort(), templateNames.sort());
  const allExamples = await Promise.all(
    expected.map((path) => readFile(new URL(path, skillRoot), 'utf8')),
  );
  assert.match(allExamples.join('\n'), /https:\/\/docs\.example\.com/);

  const theme = JSON.parse(
    await readFile(new URL('examples/theme-bundle.json', skillRoot), 'utf8'),
  );
  const { bundleHash, ...identity } = theme;
  assert.deepEqual(validateContract('theme', theme), {
    valid: true,
    errors: [],
  });
  assert.equal(bundleHash, canonicalHash(identity));
});
