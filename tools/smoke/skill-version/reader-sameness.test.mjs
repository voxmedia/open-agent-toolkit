import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

/**
 * Three `node --test` files carry a byte-identical local `readSkillVersion`
 * helper because none of them can import the TypeScript resolver in
 * `packages/cli/src/commands/shared/frontmatter.ts`: two of them ship as skill
 * assets under `.agents/skills`, where an import from `tools/` would not
 * survive pack installation.
 *
 * Nothing else pins them to each other, so a fix applied to one copy could
 * silently leave the other two behind and each suite would keep passing
 * against a different precedence rule. This test is that pin: the three
 * function sources must stay exactly equal.
 *
 * The canonical behaviour they implement is the resolver's, and
 * `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` is what keeps
 * the equivalent bundled reader honest against it.
 */
const repoRoot = new URL('../../../', import.meta.url);

const readerFiles = [
  'tools/smoke/explainer-kit/wrapper-compatibility.test.mjs',
  '.agents/skills/explainer-kit/tests/rebuildability.test.mjs',
  '.agents/skills/recon/tests/skill-contract.test.mjs',
];

function extractReader(source, file) {
  const start = source.indexOf('function readSkillVersion(');
  assert.notEqual(
    start,
    -1,
    `${file} no longer declares a local readSkillVersion helper`,
  );
  const end = source.indexOf('\n}\n', start);
  assert.notEqual(end, -1, `${file} readSkillVersion helper is unterminated`);
  return source.slice(start, end + 2);
}

test('the duplicated local readSkillVersion helpers stay byte-identical', async () => {
  const sources = await Promise.all(
    readerFiles.map(async (file) => ({
      file,
      reader: extractReader(
        await readFile(new URL(file, repoRoot), 'utf8'),
        file,
      ),
    })),
  );

  assert.equal(sources.length, 3);
  const [reference, ...rest] = sources;
  // A helper that shrank to a stub would make the equality trivially true.
  assert.ok(
    reference.reader.split('\n').length > 20,
    'readSkillVersion is unexpectedly short; the extraction is probably wrong',
  );
  assert.match(reference.reader, /metadata/);

  for (const { file, reader } of rest) {
    assert.equal(
      reader,
      reference.reader,
      `${file} readSkillVersion has drifted from ${reference.file}`,
    );
  }
});
