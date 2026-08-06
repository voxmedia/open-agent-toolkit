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
