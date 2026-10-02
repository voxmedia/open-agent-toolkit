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
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  loadSkillMapping,
  parseSkillMapping,
  readSkillInventory,
  validateSkillMapping,
  type SkillMapping,
} from '@docs-tools/skill-mapping';
import type { PackDefinition } from '@oat-repo/pack-manifest';

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
    assets: ['sample-skill', 'hidden-skill'].map((name) => ({
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
  const repoRoot = await mkdtemp(join(tmpdir(), 'oat-skill-mapping-'));
  roots.push(repoRoot);
  const docsRoot = join(repoRoot, 'docs');
  await mkdir(docsRoot);
  for (const [name, fields] of [
    [
      'sample-skill',
      'description: >-\n  A source description\n  across two lines.\nuser-invocable: true',
    ],
    [
      'hidden-skill',
      'description: Internal workflow contract\nuser-invocable: false',
    ],
    ['unshipped-skill', 'description: A currently unshipped skill'],
  ]) {
    const directory = join(repoRoot, '.agents/skills', name!);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'SKILL.md'),
      `---\nname: ${name}\n${fields}\n---\n\n# Skill\n`,
    );
  }
  await writeFile(join(docsRoot, 'guide.md'), '# Guide\n\n## Sample skill\n');
  const mapping: SkillMapping = {
    version: 1,
    skills: [
      {
        name: 'sample-skill',
        family: 'Examples',
        page: 'guide.md',
        anchor: 'sample-skill',
        applicability: 'none',
        applicabilityNotes: 'Requires source inputs, not an existing project.',
      },
    ],
    excluded: [
      {
        name: 'hidden-skill',
        reason: 'Canonical metadata declares user-invocable: false.',
      },
      {
        name: 'unshipped-skill',
        reason: 'Currently unshipped; future distribution intent is unknown.',
      },
    ],
  };
  return { repoRoot, docsRoot, mapping, manifest };
}

test('validates real inventory, YAML descriptions and real heading anchors without writing sources', async () => {
  const context = await fixture();
  const path = join(context.docsRoot, 'guide.md');
  const original = await readFile(path, 'utf8');
  const result = await validateSkillMapping(context);
  assert.equal(result.inventory.length, 3);
  assert.equal(
    result.inventory[1]!.description,
    'A source description across two lines.',
  );
  assert.equal(result.inventory[1]!.userInvocable, true);
  assert.equal(result.inventory[1]!.disableModelInvocation, null);
  assert.deepEqual(result.inventory[1]!.packs, ['utility']);
  assert.deepEqual(result.pendingAnchors, []);
  assert.equal(await readFile(path, 'utf8'), original);
});

test('loads and schema-validates the durable JSON boundary', async () => {
  const context = await fixture();
  const path = join(context.repoRoot, 'skill-docs.json');
  await writeFile(path, JSON.stringify(context.mapping));
  assert.deepEqual(await loadSkillMapping(path), context.mapping);
});

test('reads literal multiline descriptions without confusing YAML chomping or visibility', async () => {
  const context = await fixture();
  await writeFile(
    join(context.repoRoot, '.agents/skills/sample-skill/SKILL.md'),
    '---\nname: sample-skill\ndescription: |\n  First line.\n  Second line.\ndisable-model-invocation: true\n---\n',
  );
  const result = await validateSkillMapping(context);
  assert.equal(result.inventory[1]!.description, 'First line.\nSecond line.');
  assert.equal(result.inventory[1]!.disableModelInvocation, true);
  assert.equal(result.inventory[1]!.eligible, true);
});

test('pending mode relaxes only missing future pages or anchors', async () => {
  const context = await fixture();
  context.mapping.skills[0]!.anchor = 'not-authored';
  await assert.rejects(validateSkillMapping(context), /Missing guide anchor/);
  const pending = await validateSkillMapping({
    ...context,
    allowPendingAnchors: true,
  });
  assert.deepEqual(pending.pendingAnchors, ['guide.md#not-authored']);
  context.mapping.skills[0]!.page = 'future/guide.md';
  assert.deepEqual(
    (await validateSkillMapping({ ...context, allowPendingAnchors: true }))
      .pendingAnchors,
    ['future/guide.md#not-authored'],
  );
  await assert.rejects(validateSkillMapping(context), /Missing guide anchor/);
});

for (const [label, mutate, diagnostic] of [
  [
    'missing guide',
    (mapping: SkillMapping) => {
      mapping.skills = [];
    },
    /Missing guide for sample-skill/,
  ],
  [
    'missing exclusion',
    (mapping: SkillMapping) => {
      mapping.excluded.pop();
    },
    /Missing exclusion for unshipped-skill/,
  ],
  [
    'phantom guide',
    (mapping: SkillMapping) => {
      mapping.skills[0]!.name = 'phantom-skill';
    },
    /Phantom skill phantom-skill/,
  ],
  [
    'phantom exclusion',
    (mapping: SkillMapping) => {
      mapping.excluded.push({ name: 'phantom-skill', reason: 'No source.' });
    },
    /Phantom skill phantom-skill/,
  ],
  [
    'duplicate accounting',
    (mapping: SkillMapping) => {
      mapping.skills.push({ ...mapping.skills[0]!, anchor: 'another' });
    },
    /Duplicate accounting/,
  ],
  [
    'duplicate owner',
    (mapping: SkillMapping) => {
      mapping.skills.push({ ...mapping.skills[0]!, name: 'phantom-skill' });
    },
    /Duplicate guide ownership/,
  ],
  [
    'eligible exclusion',
    (mapping: SkillMapping) => {
      mapping.excluded.push({
        name: 'sample-skill',
        reason: 'Not documented yet.',
      });
      mapping.skills = [];
    },
    /Eligible skill sample-skill cannot be excluded/,
  ],
  [
    'ineligible guide',
    (mapping: SkillMapping) => {
      mapping.skills.push({
        ...mapping.skills[0]!,
        name: 'hidden-skill',
        anchor: 'hidden-skill',
      });
      mapping.excluded.shift();
    },
    /Ineligible skill hidden-skill/,
  ],
] as const) {
  test(`rejects ${label} even with pending anchors allowed`, async () => {
    const context = await fixture();
    mutate(context.mapping);
    await assert.rejects(
      validateSkillMapping({ ...context, allowPendingAnchors: true }),
      diagnostic,
    );
  });
}

test('changed manifest membership rejects stale inventory accounting', async () => {
  const context = await fixture();
  await validateSkillMapping(context);
  const changed = [
    {
      ...manifest[0]!,
      assets: manifest[0]!.assets.filter(
        (asset) => asset.id !== 'skill:sample-skill',
      ),
    },
  ];
  await assert.rejects(
    validateSkillMapping({
      ...context,
      manifest: changed,
      allowPendingAnchors: true,
    }),
    /Ineligible skill sample-skill/,
  );
  await validateSkillMapping(context);
});

test('rejects shipped skills absent from the canonical directory inventory', async () => {
  const context = await fixture();
  await rm(join(context.repoRoot, '.agents/skills/sample-skill'), {
    recursive: true,
  });
  await assert.rejects(
    readSkillInventory(context.repoRoot, manifest),
    /Shipped skill sample-skill has no real canonical directory/,
  );
});

test('discovers newly added unshipped directories instead of silently ignoring them', async () => {
  const context = await fixture();
  const directory = join(context.repoRoot, '.agents/skills/new-skill');
  await mkdir(directory);
  await writeFile(
    join(directory, 'SKILL.md'),
    '---\nname: new-skill\ndescription: New canonical skill\n---\n',
  );
  await assert.rejects(
    validateSkillMapping({ ...context, allowPendingAnchors: true }),
    /Missing exclusion for new-skill/,
  );
});

test('retirement and explicit false visibility are source eligibility, not mapping decisions', async () => {
  const context = await fixture();
  const path = join(context.repoRoot, '.agents/skills/sample-skill/SKILL.md');
  await writeFile(
    path,
    '---\nname: sample-skill\ndescription: Retired. Use a replacement.\n---\n',
  );
  await assert.rejects(
    validateSkillMapping({ ...context, allowPendingAnchors: true }),
    /Ineligible skill sample-skill.*retired/,
  );
  context.mapping.skills = [];
  context.mapping.excluded.push({
    name: 'sample-skill',
    reason: 'Canonical description explicitly retires it.',
  });
  await validateSkillMapping(context);
});

test('omitted visibility remains eligible and nested false metadata does not hide a skill', async () => {
  const context = await fixture();
  await writeFile(
    join(context.repoRoot, '.agents/skills/sample-skill/SKILL.md'),
    '---\nname: sample-skill\ndescription: Visible by default\nmetadata:\n  user-invocable: false\n---\n',
  );
  const result = await validateSkillMapping(context);
  assert.equal(result.inventory[1]!.userInvocable, null);
  assert.equal(result.inventory[1]!.eligible, true);
});

for (const [fields, diagnostic] of [
  [
    'name: wrong-name\ndescription: Source description',
    /name does not match canonical directory/,
  ],
  [
    'name: sample-skill\nname: duplicate\ndescription: Source description',
    /malformed frontmatter/,
  ],
  [
    'name: sample-skill\ndescription: Source description\nuser-invocable: "false"',
    /user-invocable must be boolean/,
  ],
  [
    'name: sample-skill\ndescription: Source description\ndisable-model-invocation: "true"',
    /disable-model-invocation must be boolean/,
  ],
] as const) {
  test(`rejects invalid canonical metadata: ${diagnostic.source}`, async () => {
    const context = await fixture();
    await writeFile(
      join(context.repoRoot, '.agents/skills/sample-skill/SKILL.md'),
      `---\n${fields}\n---\n`,
    );
    await assert.rejects(
      validateSkillMapping({ ...context, allowPendingAnchors: true }),
      diagnostic,
    );
  });
}

test('does not treat fenced example headings as owner anchors', async () => {
  const context = await fixture();
  await writeFile(
    join(context.docsRoot, 'guide.md'),
    '# Guide\n\n```md\n## Sample skill\n```\n',
  );
  await assert.rejects(
    validateSkillMapping(context),
    /Missing guide anchor guide.md#sample-skill/,
  );
});

test('rejects symlinked owner pages even in pending mode', async () => {
  const context = await fixture();
  await rm(join(context.docsRoot, 'guide.md'));
  await writeFile(join(context.repoRoot, 'outside.md'), '## Sample skill\n');
  await symlink(
    join(context.repoRoot, 'outside.md'),
    join(context.docsRoot, 'guide.md'),
  );
  await assert.rejects(
    validateSkillMapping({ ...context, allowPendingAnchors: true }),
    /must not traverse symlinks/,
  );
});

test('rejects malformed schema, unsafe targets and incomplete conditional notes', async () => {
  const { mapping } = await fixture();
  for (const value of [
    { ...mapping, version: 2 },
    { ...mapping, unknown: true },
    { ...mapping, excluded: [{ name: 'hidden-skill', reason: '' }] },
    { ...mapping, skills: [{ ...mapping.skills[0], page: '../escape.md' }] },
    { ...mapping, skills: [{ ...mapping.skills[0], page: '/absolute.md' }] },
    { ...mapping, skills: [{ ...mapping.skills[0], page: 'guide.md?query' }] },
    { ...mapping, skills: [{ ...mapping.skills[0], anchor: '' }] },
    {
      ...mapping,
      skills: [{ ...mapping.skills[0], applicability: 'sometimes' }],
    },
    {
      ...mapping,
      skills: [{ ...mapping.skills[0], applicability: ['none'] }],
    },
    { ...mapping, skills: [{ ...mapping.skills[0], applicabilityNotes: '' }] },
  ])
    assert.throws(() => parseSkillMapping(value));
});
