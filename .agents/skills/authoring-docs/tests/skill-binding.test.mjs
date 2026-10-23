import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Shipped prose is the agent-facing contract. The override permits the same
// guard to inspect an immutable pre-fix tree; it does not execute an agent.
const root =
  process.env.SKILL_BINDING_SOURCE_ROOT ??
  fileURLToPath(new URL('../../../../', import.meta.url));
const paths = [
  'authoring-docs/references/guidance-sources.md',
  'oat-docs-analyze/SKILL.md',
  'oat-docs-bootstrap/SKILL.md',
  'oat-docs-apply/SKILL.md',
  'oat-docs-authoring/SKILL.md',
];

for (const path of paths) {
  test(`${path} preserves the loaded authoring-docs binding`, () => {
    const text = readFileSync(resolve(root, '.agents/skills', path), 'utf8');
    const normalized = text.replace(/\s+/g, ' ');
    const tiers = [
      '`${SKILL_DIR}/..`',
      '`${HOME}/.agents/skills`',
      '`<repo-root>/.agents/skills`',
    ].map((tier) => normalized.indexOf(tier));
    assert.ok(tiers[0] >= 0, 'loaded sibling tier must be present');
    assert.match(
      normalized,
      /probe each exact `authoring-docs\/SKILL\.md` in order:/,
    );
    assert.ok(
      tiers[0] < tiers[1] && tiers[1] < tiers[2],
      'loaded → user → repo',
    );
    assert.match(
      normalized,
      /Bind the first matching `authoring-docs` directory once as `AUTHORING_DOCS_ROOT`/,
    );
    if (path === 'authoring-docs/references/guidance-sources.md') {
      assert.match(
        normalized,
        /Reuse an already validated `AUTHORING_DOCS_ROOT`/,
        'reuse validated binding before fallback',
      );
      assert.match(normalized, /Do not reload the skill or re-run discovery/);
      assert.match(
        normalized,
        /When `authoring-docs` itself is the loaded skill and no root is bound, validate `\$\{SKILL_DIR\}\/SKILL\.md` as `authoring-docs`, then bind `\$\{SKILL_DIR\}` once as `AUTHORING_DOCS_ROOT`/,
      );
      assert.match(
        normalized,
        /If that validation fails, stop this guidance resolution/,
      );
      const fallback = normalized.indexOf('Only for an unbound consumer');
      assert.ok(fallback > normalized.indexOf('Reuse an already validated'));
      assert.ok(
        fallback < tiers[0],
        'fallback is reserved for an unbound consumer',
      );
      assert.doesNotMatch(
        normalized,
        /load `\$\{AUTHORING_DOCS_ROOT\}\/SKILL\.md`|stop this handoff/,
      );
    } else {
      assert.match(normalized, /load `\$\{AUTHORING_DOCS_ROOT\}\/SKILL\.md`/);
    }
    assert.match(
      normalized,
      /same root for every authoring-docs reference and script/,
    );
    assert.match(
      normalized,
      path === 'authoring-docs/references/guidance-sources.md'
        ? /If none is found, name `authoring-docs`, stop this guidance resolution/
        : /If none is found, name `authoring-docs`, stop this handoff/,
    );
    assert.ok(
      normalized.includes('oat tools install docs --scope <user|project>'),
    );
    assert.ok(
      normalized.includes(
        'oat tools update --pack docs --scope <user|project>',
      ),
    );
    if (path === 'oat-docs-authoring/SKILL.md') {
      assert.doesNotMatch(normalized, /Load `authoring-docs`/i);
      assert.equal(
        normalized.match(/load `\$\{AUTHORING_DOCS_ROOT\}\/SKILL\.md`/g)
          ?.length,
        1,
        'one bound load before authoring references',
      );
      assert.ok(
        normalized.indexOf('Bind the first matching') <
          normalized.indexOf(
            '`${AUTHORING_DOCS_ROOT}/references/guidance-sources.md`',
          ),
      );
    }
    assert.doesNotMatch(
      normalized,
      /(?:from installed scope \(user then project\)|from installed user scope then project scope)/,
    );
  });
}
