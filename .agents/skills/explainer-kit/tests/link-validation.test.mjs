import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateInternalReferences } from '../scripts/lib/internal-references.mjs';

function site(overrides = {}) {
  return {
    artifacts: [
      {
        artifactId: 'hub',
        renderedPath: 'site/initiatives/demo/index.html',
        html: `
          <main id="overview">
            <a href="../../diagrams/demo/system/index.html#flow">System</a>
            <a href="#overview">Overview</a>
            <img src="data:image/png;base64,iVBORw0KGgo=" alt="" />
            <img srcset="data:image/png;base64,iVBORw0KGgo= 1x, data:image/png;base64,AAAA 2x" alt="" />
            <source srcset="../../diagrams/demo/system/index.html 1x,../../diagrams/demo/system/index.html 2x" />
            <svg><use href="#overview"></use></svg>
          </main>
        `,
      },
      {
        artifactId: 'system',
        renderedPath: 'site/diagrams/demo/system/index.html',
        html: '<main id="flow"><a href="../../../initiatives/demo/index.html">Hub</a></main>',
      },
    ],
    manifestPaths: [
      'site/initiatives/demo/index.html',
      'site/diagrams/demo/system/index.html',
    ],
    ...overrides,
  };
}

test('accepts explicit files, relative paths, fragments, srcset, and safe embedded references', () => {
  assert.deepEqual(validateInternalReferences(site()), {
    valid: true,
    errors: [],
  });
});

test('allows unused duplicate diagram IDs and resolves only unambiguous fragments', () => {
  const valid = site();
  valid.artifacts[0].html = `
    <main>
      <svg><defs><clipPath id="diagram-clip"></clipPath></defs></svg>
      <svg><defs><clipPath id="diagram-clip"></clipPath></defs></svg>
      <section id="unique-target"></section>
      <a href="#unique-target">Unique target</a>
    </main>
  `;
  assert.deepEqual(validateInternalReferences(valid), {
    valid: true,
    errors: [],
  });

  const ambiguous = site();
  ambiguous.artifacts[0].html = `
    <main>
      <svg id="diagram-root"></svg>
      <svg id="diagram-root"></svg>
      <a href="#diagram-root">Ambiguous target</a>
    </main>
  `;
  const result = validateInternalReferences(ambiguous);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(({ code }) => code === 'ambiguous-fragment'),
    JSON.stringify(result.errors),
  );
});

test('rejects directory links, traversal, missing files and fragments', () => {
  for (const [reference, code] of [
    ['../../diagrams/demo/system/', 'directory-reference'],
    ['../../../../outside/index.html', 'site-root-escape'],
    ['../../diagrams/demo/missing/index.html', 'missing-target'],
    ['../../diagrams/demo/system/index.html#missing', 'missing-fragment'],
  ]) {
    const fixture = site();
    fixture.artifacts[0].html = `<a href="${reference}">broken</a>`;
    const result = validateInternalReferences(fixture);
    assert.equal(result.valid, false, reference);
    assert.ok(
      result.errors.some((error) => error.code === code),
      `${reference}: ${JSON.stringify(result.errors)}`,
    );
  }
});

test('rejects the exact broken hub links from the Cyclone case study', () => {
  // The handoff asks for "the broken links from this case" by name. These are
  // the literal hrefs the production hub shipped: bare directory references to
  // sibling artifacts, which resolve to no manifest-declared file.
  for (const reference of ['../architecture/', '../deck/']) {
    const fixture = site();
    fixture.artifacts[0].html = `<a href="${reference}">${reference}</a>`;
    const result = validateInternalReferences(fixture);
    assert.equal(result.valid, false, reference);
    assert.ok(
      result.errors.some(({ code }) => code === 'directory-reference'),
      `${reference}: ${JSON.stringify(result.errors)}`,
    );
  }

  // Both together, as the hub actually carried them.
  const fixture = site();
  fixture.artifacts[0].html = `
    <nav>
      <a href="../architecture/">Architecture</a>
      <a href="../deck/">Deck</a>
    </nav>
  `;
  const result = validateInternalReferences(fixture);
  assert.equal(result.valid, false);
  assert.equal(
    result.errors.filter(({ code }) => code === 'directory-reference').length,
    2,
    JSON.stringify(result.errors),
  );
});

test('fails closed on malformed, encoded-ambiguous, unsafe, and undeclared references', () => {
  for (const [html, code] of [
    ['<a href="../bad', 'malformed-html'],
    ['<a href="https://[invalid">bad</a>', 'malformed-reference'],
    ['<a href="../../%2e%2e/secret/index.html">bad</a>', 'unsafe-reference'],
    ['<img src="javascript:alert(1)">', 'unsafe-scheme'],
    ['<img src="https://cdn.example.com/image.png">', 'external-resource'],
    ['<img srcset="one.png 1q, two.png 2x">', 'malformed-srcset'],
    [
      '<a href="../../diagrams/demo/system/index.html?draft=1">bad</a>',
      'query-reference',
    ],
  ]) {
    const fixture = site();
    fixture.artifacts[0].html = html;
    const result = validateInternalReferences(fixture);
    assert.equal(result.valid, false, html);
    assert.ok(
      result.errors.some((error) => error.code === code),
      `${code}: ${JSON.stringify(result.errors)}`,
    );
  }
});

test('rejects duplicate site paths and bounds oversized input', () => {
  const duplicate = site({
    manifestPaths: [
      'site/initiatives/demo/index.html',
      'site/initiatives/demo/index.html',
    ],
  });
  assert.ok(
    validateInternalReferences(duplicate).errors.some(
      ({ code }) => code === 'invalid-site-tree',
    ),
  );

  const oversized = site();
  oversized.artifacts[0].html = 'x'.repeat(1_000_001);
  assert.ok(
    validateInternalReferences(oversized).errors.some(
      ({ code }) => code === 'validation-bound',
    ),
  );
});
