import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MarkdownSafetyError,
  parseMarkdown,
  parseMarkdownDocument,
  validateMarkdownAst,
} from '../scripts/lib/markdown.mjs';

test('parses the required CommonMark and GFM block vocabulary', () => {
  const { ast, warnings } = parseMarkdownDocument(`# Overview

Paragraph with **strong**, *emphasis*, \`code\`, and ~~removed~~ text.

| Signal | Meaning |
| --- | --- |
| green | ready |

- [x] parsed
- [ ] reviewed

1. first
2. second

> A regular blockquote.

\`\`\`js
const ready = true;
\`\`\`

![Architecture](https://example.com/architecture.svg "System map")`);

  assert.deepEqual(
    ast.children.map(({ type }) => type),
    [
      'heading',
      'paragraph',
      'table',
      'list',
      'list',
      'blockquote',
      'code',
      'paragraph',
    ],
  );
  assert.deepEqual(
    ast.children[1].children.map(({ type }) => type),
    [
      'text',
      'strong',
      'text',
      'emphasis',
      'text',
      'inlineCode',
      'text',
      'delete',
      'text',
    ],
  );
  assert.equal(ast.children[2].rows.length, 1);
  assert.equal(ast.children[3].task, true);
  assert.deepEqual(
    ast.children[3].children.map(({ checked }) => checked),
    [true, false],
  );
  assert.equal(ast.children[4].ordered, true);
  assert.equal(ast.children[5].children[0].type, 'paragraph');
  assert.equal(ast.children[6].language, 'js');
  assert.equal(ast.children[7].children[0].type, 'figure');
  assert.deepEqual(warnings, []);
});

test('parses all five GFM alert callouts into dedicated nodes', () => {
  const ast = parseMarkdown(
    ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']
      .map((kind) => `> [!${kind}]\n> ${kind} body.`)
      .join('\n\n'),
  );

  assert.deepEqual(
    ast.children.map(({ type, kind }) => [type, kind]),
    [
      ['callout', 'note'],
      ['callout', 'tip'],
      ['callout', 'important'],
      ['callout', 'warning'],
      ['callout', 'caution'],
    ],
  );
  assert.deepEqual(validateMarkdownAst(ast), []);
});

test('parses timeline and diagram fences as distinct node types', () => {
  const { ast, warnings } = parseMarkdownDocument(`\`\`\`timeline
2024-01 — Prototype
2024-06 — Launch
\`\`\`

\`\`\`diagram
graph LR
author --> review
\`\`\``);

  assert.deepEqual(
    ast.children.map(({ type }) => type),
    ['timeline', 'diagram'],
  );
  assert.deepEqual(ast.children[0].entries, [
    { date: '2024-01', label: 'Prototype' },
    { date: '2024-06', label: 'Launch' },
  ]);
  assert.match(ast.children[1].source, /graph LR/);
  assert.deepEqual(warnings, []);
});

test('raw HTML and unsafe link destinations are hard safety failures', () => {
  assert.throws(
    () => validateMarkdownAst(parseMarkdown('<script>alert("x")</script>')),
    MarkdownSafetyError,
  );
  for (const destination of [
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '/root-relative',
    '//example.com/path',
  ]) {
    assert.throws(
      () =>
        validateMarkdownAst(
          parseMarkdown(`[unsafe destination](${destination})`),
        ),
      MarkdownSafetyError,
      destination,
    );
  }
  assert.doesNotThrow(() =>
    validateMarkdownAst(
      parseMarkdown(
        '[HTTPS](https://example.com) [relative](guide/index.html) [fragment](#overview)',
      ),
    ),
  );
});

test('editorial findings return warnings without rejecting safe markdown', () => {
  const result = parseMarkdownDocument(`# First

### Skipped level

\`\`\`timeline
missing delimiter
\`\`\``);

  assert.deepEqual(
    result.warnings.map(({ code }) => code),
    ['heading-depth-jump', 'timeline-entry-shape'],
  );
});
