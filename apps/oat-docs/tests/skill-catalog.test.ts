import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import {
  renderSkillCatalog,
  updateSkillCatalog,
} from '@docs-tools/skill-catalog';
import {
  validateSkillMapping,
  type SkillMapping,
} from '@docs-tools/skill-mapping';
import type { PackDefinition } from '@oat-repo/pack-manifest';
import { format } from 'oxfmt';

const roots: string[] = [];
after(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

const manifest: readonly PackDefinition[] = [
  {
    name: 'utility',
    allowedScopes: ['project', 'user'],
    defaultScope: 'user',
    assets: ['zeta-skill', 'alpha-skill', 'hidden-skill'].map((name) => ({
      id: `skill:${name}`,
      kind: 'skill',
      source: `skills/${name}`,
      destination: `.agents/skills/${name}`,
      scopes: ['project', 'user'],
      ownership: { project: 'managed', user: 'managed' },
    })),
  },
];

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-skill-catalog-'));
  roots.push(repoRoot);
  const docsRoot = join(repoRoot, 'docs');
  const catalogPath = join(docsRoot, 'skills/index.md');
  const mappingPath = join(repoRoot, 'skill-docs.json');
  for (const [name, fields] of [
    [
      'zeta-skill',
      'description: Zeta source facts\nuser-invocable: true\ndisable-model-invocation: false',
    ],
    [
      'alpha-skill',
      'description: |-\n  Literal | pipe & <tag> [link](path) `code` *bold* {brace} \\slash\n  second line.',
    ],
    ['hidden-skill', 'description: Internal helper\nuser-invocable: false'],
  ]) {
    const directory = join(repoRoot, '.agents/skills', name!);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'SKILL.md'),
      `---\nname: ${name}\n${fields}\n---\n\n# Skill\n`,
    );
  }
  await mkdir(dirname(catalogPath), { recursive: true });
  await mkdir(join(docsRoot, 'workflows'), { recursive: true });
  await writeFile(
    join(docsRoot, 'workflows/guide.md'),
    '# Guide\n\n## Zeta skill\n\n**Example scenario:** Use the zeta workflow.\n\n## Alpha skill\n\n**Example scenario:** Use the alpha workflow.\n',
  );
  const original =
    '---\ntitle: Skills\ndescription: Authored source\n---\n\n## Contents\n\nAuthored intro.\n\n## Full Catalog\n\n<!-- oat:skill-catalog:start -->\nold catalog\n<!-- oat:skill-catalog:end -->\n\n## Related\n\nAuthored tail.\n';
  await writeFile(catalogPath, original);
  const mapping: SkillMapping = {
    version: 1,
    skills: [
      {
        name: 'zeta-skill',
        family: 'Research',
        page: 'workflows/guide.md',
        anchor: 'zeta-skill',
        applicability: 'required',
        applicabilityNotes: 'Explicit project selection is accepted.',
      },
      {
        name: 'alpha-skill',
        family: 'Research',
        page: 'workflows/guide.md',
        anchor: 'alpha-skill',
        applicability: 'optional',
        applicabilityNotes: 'Works without a project | pointer.',
      },
    ],
    excluded: [
      {
        name: 'hidden-skill',
        reason: 'Canonical metadata declares user-invocable: false.',
      },
    ],
  };
  await writeFile(mappingPath, JSON.stringify(mapping));
  return {
    repoRoot,
    docsRoot,
    catalogPath,
    mappingPath,
    mapping,
    manifest,
    original,
  };
}

test('renders canonical facts, escaped Markdown, declared visibility and relative owner links deterministically', async () => {
  const context = await fixture();
  const validation = await validateSkillMapping(context);
  const block = await renderSkillCatalog(validation);
  assert.ok(block.indexOf('`alpha-skill`') < block.indexOf('`zeta-skill`'));
  assert.ok(
    block.includes(
      'Literal &#124; pipe &#38; &#60;tag&#62; &#91;link&#93;&#40;path&#41; &#96;code&#96; \\*bold\\* &#123;brace&#125; &#92;slash second line.',
    ),
    block,
  );
  assert.ok(block.includes('user: not declared; model disabled: not declared'));
  assert.ok(block.includes('user: true; model disabled: false'));
  assert.ok(block.includes('Requires project'));
  assert.ok(block.includes('Project optional'));
  assert.ok(
    block.includes('[`alpha-skill`](../workflows/guide.md#alpha-skill)'),
  );
  assert.ok(!block.includes('Explicit project selection is accepted.'));
  assert.ok(!block.includes('`hidden-skill`'));
  assert.equal(
    await renderSkillCatalog({
      ...validation,
      inventory: [...validation.inventory].reverse(),
      mapping: {
        ...validation.mapping,
        skills: [...validation.mapping.skills].reverse(),
      },
    }),
    block,
  );
  validation.mapping.skills[0]!.family = 'Advanced';
  validation.mapping.skills[1]!.applicability = 'none';
  const grouped = await renderSkillCatalog(validation);
  assert.ok(grouped.indexOf('### Advanced') < grouped.indexOf('### Research'));
  assert.ok(grouped.includes('No existing project required'));
  assert.equal(
    (
      await format('skills/index.md', block, {
        proseWrap: 'preserve',
        printWidth: 80,
      })
    ).code.trimEnd(),
    block,
  );
});

test('generation changes only the marked block and is idempotent; check accepts current output', async () => {
  const context = await fixture();
  assert.deepEqual(await updateSkillCatalog({ ...context, mode: 'write' }), {
    changed: true,
    skillCount: 2,
  });
  const generated = await readFile(context.catalogPath, 'utf8');
  assert.equal(
    generated.split('<!-- oat:skill-catalog:start -->')[0],
    context.original.split('<!-- oat:skill-catalog:start -->')[0],
  );
  assert.equal(
    generated.split('<!-- oat:skill-catalog:end -->')[1],
    context.original.split('<!-- oat:skill-catalog:end -->')[1],
  );
  assert.deepEqual(await updateSkillCatalog({ ...context, mode: 'write' }), {
    changed: false,
    skillCount: 2,
  });
  assert.deepEqual(await updateSkillCatalog({ ...context, mode: 'check' }), {
    changed: false,
    skillCount: 2,
  });
  assert.equal(await readFile(context.catalogPath, 'utf8'), generated);
});

test('preserves CRLF authored bytes while generating a current block', async () => {
  const context = await fixture();
  await writeFile(context.catalogPath, context.original.replace(/\n/g, '\r\n'));
  await updateSkillCatalog({ ...context, mode: 'write' });
  const generated = await readFile(context.catalogPath, 'utf8');
  assert.ok(!/(?<!\r)\n/.test(generated));
  await updateSkillCatalog({ ...context, mode: 'check' });
});

test('check rejects source description drift without writing, then regeneration restores parity', async () => {
  const context = await fixture();
  await updateSkillCatalog({ ...context, mode: 'write' });
  const generated = await readFile(context.catalogPath, 'utf8');
  const sourcePath = join(
    context.repoRoot,
    '.agents/skills/zeta-skill/SKILL.md',
  );
  await writeFile(
    sourcePath,
    (await readFile(sourcePath, 'utf8')).replace(
      'Zeta source facts',
      'Updated source facts',
    ),
  );
  await assert.rejects(
    updateSkillCatalog({ ...context, mode: 'check' }),
    /catalog is stale/,
  );
  assert.equal(await readFile(context.catalogPath, 'utf8'), generated);
  await updateSkillCatalog({ ...context, mode: 'write' });
  assert.ok(
    (await readFile(context.catalogPath, 'utf8')).includes(
      'Updated source facts',
    ),
  );
  await updateSkillCatalog({ ...context, mode: 'check' });
});

test('check rejects curated mapping drift without rewriting the committed block', async () => {
  const context = await fixture();
  await updateSkillCatalog({ ...context, mode: 'write' });
  const generated = await readFile(context.catalogPath, 'utf8');
  context.mapping.skills[0]!.applicability = 'optional';
  await writeFile(context.mappingPath, JSON.stringify(context.mapping));
  await assert.rejects(
    updateSkillCatalog({ ...context, mode: 'check' }),
    /catalog is stale/,
  );
  assert.equal(await readFile(context.catalogPath, 'utf8'), generated);
});

for (const mode of ['check', 'write'] as const) {
  test(`${mode} rejects missing real anchors before any catalog write`, async () => {
    const context = await fixture();
    await writeFile(join(context.docsRoot, 'workflows/guide.md'), '# Guide\n');
    await assert.rejects(
      updateSkillCatalog({ ...context, mode }),
      /Missing guide anchor workflows\/guide.md#zeta-skill/,
    );
    assert.equal(await readFile(context.catalogPath, 'utf8'), context.original);
  });
}

for (const defect of ['missing', 'phantom'] as const) {
  test(`rejects ${defect} inventory accounting before generation`, async () => {
    const context = await fixture();
    if (defect === 'missing') context.mapping.skills.pop();
    else context.mapping.skills[0]!.name = 'phantom-skill';
    await writeFile(context.mappingPath, JSON.stringify(context.mapping));
    await assert.rejects(
      updateSkillCatalog({ ...context, mode: 'write' }),
      defect === 'missing'
        ? /Missing guide for alpha-skill/
        : /Phantom skill phantom-skill/,
    );
    assert.equal(await readFile(context.catalogPath, 'utf8'), context.original);
  });
}

test('rejects missing, duplicated and reversed marker boundaries without modifying authored text', async () => {
  const context = await fixture();
  for (const malformed of [
    context.original.replace('<!-- oat:skill-catalog:start -->', ''),
    `${context.original}\n<!-- oat:skill-catalog:end -->\n`,
    '<!-- oat:skill-catalog:end -->\nAuthored\n<!-- oat:skill-catalog:start -->\n',
  ]) {
    await writeFile(context.catalogPath, malformed);
    await assert.rejects(
      updateSkillCatalog({ ...context, mode: 'write' }),
      /one ordered pair/,
    );
    assert.equal(await readFile(context.catalogPath, 'utf8'), malformed);
  }
});

test('rejects catalog paths outside docs and symlinked files or parents', async () => {
  const context = await fixture();
  const externalPath = join(context.repoRoot, 'external.md');
  await writeFile(externalPath, context.original);
  await assert.rejects(
    updateSkillCatalog({
      ...context,
      catalogPath: externalPath,
      mode: 'write',
    }),
    /inside the docs root/,
  );
  await rm(context.catalogPath);
  await symlink(externalPath, context.catalogPath);
  await assert.rejects(
    updateSkillCatalog({ ...context, mode: 'write' }),
    /real Markdown file/,
  );
  await rm(dirname(context.catalogPath), { recursive: true });
  await symlink(context.repoRoot, dirname(context.catalogPath));
  await assert.rejects(
    updateSkillCatalog({ ...context, mode: 'write' }),
    /must not traverse symlinks/,
  );
  assert.equal(await readFile(externalPath, 'utf8'), context.original);
});

test('refuses rendering a validation result that still has pending anchors', async () => {
  const context = await fixture();
  const validation = await validateSkillMapping(context);
  await assert.rejects(
    () =>
      renderSkillCatalog({
        ...validation,
        pendingAnchors: ['guide.md#future'],
      }),
    /pending guide anchors/,
  );
});
