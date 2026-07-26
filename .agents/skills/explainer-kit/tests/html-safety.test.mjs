import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  coreScriptHashes,
  validateHtmlSafety,
} from '../scripts/lib/html-safety.mjs';

const templates = new Map();
for (const name of ['deck-shell', 'diagram-shell', 'engineer-tour']) {
  templates.set(
    name,
    await readFile(
      new URL(`../templates/${name}.html`, import.meta.url),
      'utf8',
    ),
  );
}

function validate(name, html = templates.get(name)) {
  return validateHtmlSafety({
    html,
    shell: templates.get(name),
    shellName: name,
  });
}

function deckScripts() {
  return [
    ...templates
      .get('deck-shell')
      .matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi),
  ].map((match) => match[0]);
}

test('all bundled artistic shells pass unchanged', () => {
  for (const name of templates.keys()) {
    assert.deepEqual(validate(name), {
      valid: true,
      errors: [],
      warnings: [],
    });
  }
});

test('core script hashes preserve shell order and exact bytes', () => {
  const deck = templates.get('deck-shell');
  const scripts = deckScripts();
  const hashes = coreScriptHashes(deck);

  assert.equal(hashes.length, 2);
  assert.notEqual(hashes[0], hashes[1]);
  assert.deepEqual(
    hashes,
    scripts.map((script) => coreScriptHashes(script)[0]),
  );
  assert.notEqual(
    coreScriptHashes(scripts[0])[0],
    coreScriptHashes(scripts[0].replace('\n', '\n '))[0],
  );
});

test('deck script deletion and insertion hard-fail', () => {
  const deck = templates.get('deck-shell');
  const [, second] = deckScripts();
  const deleted = deck.replace(second, '');
  const inserted = deck.replace(
    second,
    `${second}\n<script>globalThis.authored = true;</script>`,
  );

  assert.equal(validate('deck-shell', deleted).valid, false);
  assert.ok(
    validate('deck-shell', deleted).errors.includes(
      'core-script-count-mismatch',
    ),
  );
  assert.equal(validate('deck-shell', inserted).valid, false);
  assert.ok(
    validate('deck-shell', inserted).errors.includes(
      'core-script-count-mismatch',
    ),
  );
});

test('deck script duplication, reordering, and substitution hard-fail', () => {
  const deck = templates.get('deck-shell');
  const [first, second] = deckScripts();
  const duplicated = deck.replace(first, `${first}\n${first}`);
  const reordered = deck
    .replace(first, '__FIRST__')
    .replace(second, first)
    .replace('__FIRST__', second);
  const substituted = deck.replace(second, first);

  for (const html of [duplicated, reordered, substituted]) {
    const result = validate('deck-shell', html);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.includes('core-script-count-mismatch') ||
        result.errors.some((error) =>
          error.startsWith('core-script-hash-mismatch:'),
        ),
    );
  }
});

test('any exact-byte mutation of a core script hard-fails', () => {
  const deck = templates.get('deck-shell');
  const mutated = deck.replace(
    "document.documentElement.classList.add('js');",
    "document.documentElement.classList.add('js'); ",
  );
  const result = validate('deck-shell', mutated);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('core-script-hash-mismatch:0'));
});

test('inline event handlers and external active content hard-fail', () => {
  const deck = templates.get('deck-shell');
  const eventHandler = deck.replace(
    '<main class="deck"',
    '<main class="deck" onclick="alert(1)"',
  );
  const externalFrame = deck.replace(
    '<main class="deck"',
    '<iframe src="https://example.com/embed"></iframe><main class="deck"',
  );
  const externalCss = deck.replace(
    '{{THEME_CSS}}',
    '@import "https://example.com/author.css";',
  );

  assert.ok(
    validate('deck-shell', eventHandler).errors.includes(
      'inline-event-handler',
    ),
  );
  assert.ok(
    validate('deck-shell', externalFrame).errors.includes(
      'external-active-content',
    ),
  );
  assert.ok(
    validate('deck-shell', externalCss).errors.includes(
      'external-active-content',
    ),
  );
});

test('encoded active URL schemes are rejected after tokenization', () => {
  const diagram = templates.get('diagram-shell');
  const authored = diagram.replace(
    '<header>',
    '<header><a href="java&#x73;cript:alert(1)">Unsafe link</a>',
  );
  const result = validate('diagram-shell', authored);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('external-active-content'));
});

test('event handlers without attribute whitespace are still rejected', () => {
  const diagram = templates.get('diagram-shell');
  const authored = diagram.replace(
    '<main>',
    '<main><svg/onload="alert(1)"></svg>',
  );
  const result = validate('diagram-shell', authored);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('inline-event-handler'));
});

test('rich non-script elaboration within the DOM allowlist passes', () => {
  const tour = templates.get('engineer-tour');
  const authored = tour.replace(
    '{{CONTENT}}',
    `<article>
      <section id="orientation">
        <h2>Orientation</h2>
        <blockquote><p>A concrete system story.</p></blockquote>
        <details>
          <summary>Evidence</summary>
          <pre><code>node --test tests/*.test.mjs</code></pre>
        </details>
        <figure>
          <svg viewBox="0 0 100 40" role="img" aria-label="Request flow">
            <defs><marker id="arrow"><path d="M0 0L4 2L0 4Z" /></marker></defs>
            <rect x="2" y="2" width="30" height="20" />
            <line x1="32" y1="12" x2="70" y2="12" marker-end="url(#arrow)" />
          </svg>
          <figcaption>Request to result.</figcaption>
        </figure>
      </section>
    </article>`,
  );

  assert.deepEqual(validate('engineer-tour', authored), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test('missing theme declarations and required anchors warn without failing', () => {
  const diagram = templates.get('diagram-shell');
  const authored = diagram
    .replace(/\s*--accent:[^;]+;/, '')
    .replace('class="diagram-viewport"', 'class="authored-viewport"');
  const result = validate('diagram-shell', authored);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.includes('missing-theme-token:--accent'));
  assert.ok(
    result.warnings.includes('missing-required-anchor:diagram-viewport'),
  );
});

test('unknown elements and malformed tags fail the DOM allowlist', () => {
  const diagram = templates.get('diagram-shell');
  const unknown = diagram.replace('<main>', '<main><author-widget>');
  const malformed = diagram.replace('<main>', '<main><div title="broken>');

  assert.ok(
    validate('diagram-shell', unknown).errors.includes(
      'disallowed-element:author-widget',
    ),
  );
  assert.ok(
    validate('diagram-shell', malformed).errors.includes('malformed-html'),
  );
});
