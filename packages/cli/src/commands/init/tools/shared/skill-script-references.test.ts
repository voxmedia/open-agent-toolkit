import { PACK_MANIFEST } from '@commands/tools/shared/pack-manifest';
import type {
  PackAssetDefinition,
  PackDefinition,
} from '@commands/tools/shared/types';
import { describe, expect, it } from 'vitest';

import {
  classifyCanonicalSkillDir,
  classifyCanonicalSkillDirs,
  extractScriptReferences,
  findMissingShippedSkillDirs,
  findUnshippedScriptReferences,
  formatScriptReferenceViolation,
  listPackScriptDestinations,
  listShippedSkills,
  resolveOwningPack,
} from './skill-script-references';

const BOTH_SCOPES = ['project', 'user'] as const;
const BOTH_MANAGED = { project: 'managed', user: 'managed' } as const;

function skillAsset(name: string): PackAssetDefinition {
  return {
    id: `skill:${name}`,
    kind: 'skill',
    source: `skills/${name}`,
    destination: `.agents/skills/${name}`,
    scopes: BOTH_SCOPES,
    ownership: BOTH_MANAGED,
  };
}

function scriptAsset(name: string, sharedOwner?: string): PackAssetDefinition {
  return {
    id: `script:${name}`,
    kind: 'script',
    source: `scripts/${name}`,
    destination: `.oat/scripts/${name}`,
    scopes: BOTH_SCOPES,
    ownership: BOTH_MANAGED,
    executable: true,
    sharedOwner,
  };
}

function pack(
  name: PackDefinition['name'],
  assets: readonly PackAssetDefinition[],
): PackDefinition {
  return {
    name,
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets,
  };
}

// The healthy shape: one pack ships both the consuming skill and the script it
// names. Every mutation below is this fixture with exactly one thing changed.
const HEALTHY_MANIFEST: readonly PackDefinition[] = [
  pack('docs', [skillAsset('docs-consumer'), scriptAsset('helper.sh')]),
  pack('workflows', [
    skillAsset('workflow-consumer'),
    scriptAsset('other-helper.sh'),
  ]),
];

const CONSUMER_TEXT =
  'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/helper.sh"\nRun it from the scope root.\n';

const CONSUMER_SOURCE = {
  skill: 'docs-consumer',
  file: '.agents/skills/docs-consumer/SKILL.md',
  text: CONSUMER_TEXT,
};

describe('extractScriptReferences', () => {
  it.each([
    [
      'a bare reference',
      'Run .oat/scripts/resolve-tracking.sh from the repository root',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      '$SCOPE_ROOT-prefixed script references',
      'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a ${HOME}-prefixed reference',
      'USER_SCRIPT="${HOME}/.oat/scripts/generate-thin-index.sh"',
      ['.oat/scripts/generate-thin-index.sh'],
    ],
    [
      'a tilde-prefixed reference',
      'Copy `~/.oat/scripts/generate-oat-state.sh` into place.',
      ['.oat/scripts/generate-oat-state.sh'],
    ],
    [
      'a backticked reference in prose',
      '- Shared tracking helper: `$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh`, where',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a link-form reference',
      'See [the tracking helper](../../.oat/scripts/resolve-tracking.sh).',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a reference closing a sentence',
      'Then run .oat/scripts/resolve-tracking.sh.',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a reference closing a question',
      'Did you run .oat/scripts/resolve-tracking.sh?',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a reference followed by a colon',
      'Run .oat/scripts/resolve-tracking.sh: it resolves the scope root.',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'a reference closing an exclamation',
      'Run .oat/scripts/resolve-tracking.sh!',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'an angle-wrapped link destination',
      'See [the tracking helper](<../../.oat/scripts/resolve-tracking.sh>).',
      ['.oat/scripts/resolve-tracking.sh'],
    ],
    [
      'two references on one line',
      'Chain .oat/scripts/a.sh and `.oat/scripts/b.sh` together.',
      ['.oat/scripts/a.sh', '.oat/scripts/b.sh'],
    ],
    [
      'a deeper path, captured whole rather than truncated',
      'Run .oat/scripts/nested/thing.sh',
      ['.oat/scripts/nested/thing.sh'],
    ],
    // Fail-open guards. Each of these once normalized or truncated into a
    // shipped name, or vanished entirely, which would have let a broken
    // reference pass the integrity check.
    [
      'does not trim a trailing underscore into a shipped name',
      'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh_"',
      ['.oat/scripts/resolve-tracking.sh_'],
    ],
    [
      'does not trim a trailing hyphen into a shipped name',
      'Run .oat/scripts/resolve-tracking.sh-',
      ['.oat/scripts/resolve-tracking.sh-'],
    ],
    [
      'drops only one prose mark, so a doubled period still fails',
      'Run .oat/scripts/resolve-tracking.sh..',
      ['.oat/scripts/resolve-tracking.sh.'],
    ],
    [
      'does not truncate a shipped prefix followed by another segment',
      'Run `.oat/scripts/resolve-tracking.sh/extra.sh`',
      ['.oat/scripts/resolve-tracking.sh/extra.sh'],
    ],
    [
      'captures a name opening with an underscore',
      'Run .oat/scripts/_missing.sh',
      ['.oat/scripts/_missing.sh'],
    ],
    [
      'captures a name opening with a hyphen',
      'Run `.oat/scripts/-missing.sh`',
      ['.oat/scripts/-missing.sh'],
    ],
    [
      'captures a dotfile name',
      'Run `.oat/scripts/.missing.sh`',
      ['.oat/scripts/.missing.sh'],
    ],
    // Negatives are load-bearing: a false positive here fails CI on prose that
    // names no script at all.
    [
      'ignores a bare .oat/scripts/ prose mention',
      '`.oat/scripts/` within the target repository.',
      [],
    ],
    [
      'ignores a directory root with no trailing slash',
      'USER_SCRIPTS_ROOT="${HOME}/.oat/scripts"',
      [],
    ],
    [
      'ignores an angle-bracket placeholder',
      '| Script   | `~/.oat/scripts/<file>`     |',
      [],
    ],
    [
      'ignores a brace placeholder',
      'Installs to `.oat/scripts/{name}` under the resolved scope.',
      [],
    ],
    [
      'ignores a path glued to an identifier',
      'The fork at myrepo.oat/scripts/thing.sh is unrelated.',
      [],
    ],
    [
      'ignores a shell variable placeholder',
      'Resolve `.oat/scripts/${SCRIPT_NAME}` against the scope root.',
      [],
    ],
    [
      'ignores a glob',
      'Every `.oat/scripts/*.sh` is installed executable.',
      [],
    ],
    [
      'ignores a placeholder segment rather than truncating to its prefix',
      'Run `.oat/scripts/resolve-tracking.sh/<file>`',
      [],
    ],
  ])('%s', (_name, text, expected) => {
    expect(
      extractScriptReferences(text as string).map(({ reference }) => reference),
    ).toEqual(expected);
  });

  it('reports the line of each occurrence', () => {
    const text = [
      '# Title',
      '',
      'TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"',
      'no reference here',
      'Also `.oat/scripts/generate-oat-state.sh`.',
    ].join('\n');

    expect(extractScriptReferences(text)).toEqual([
      { reference: '.oat/scripts/resolve-tracking.sh', line: 3 },
      { reference: '.oat/scripts/generate-oat-state.sh', line: 5 },
    ]);
  });

  it('never assembles a reference across a line break', () => {
    expect(
      extractScriptReferences('.oat/scripts/\nresolve-tracking.sh'),
    ).toEqual([]);
  });
});

describe('shipped skill surface', () => {
  it('lists the union of every pack skill asset', () => {
    expect(listShippedSkills(HEALTHY_MANIFEST)).toEqual([
      'docs-consumer',
      'workflow-consumer',
    ]);
  });

  it('classifies a manifest skill as shipped', () => {
    expect(classifyCanonicalSkillDir('docs-consumer', HEALTHY_MANIFEST)).toBe(
      'shipped',
    );
  });

  it('does not resolve an unshipped canonical skill to a pack', () => {
    // A repository-local authoring skill: a real directory under
    // `.agents/skills` that no pack ships. It is classified and reported, never
    // failed, and it never reaches the owning-pack resolver.
    expect(
      classifyCanonicalSkillDir('repo-local-authoring', HEALTHY_MANIFEST),
    ).toBe('canonical-unshipped');
    expect(() =>
      resolveOwningPack('repo-local-authoring', HEALTHY_MANIFEST),
    ).toThrow(/shipped by no pack/);
  });

  it('splits a directory listing into shipped and canonical-unshipped', () => {
    expect(
      classifyCanonicalSkillDirs(
        ['workflow-consumer', 'repo-local-authoring', 'docs-consumer'],
        HEALTHY_MANIFEST,
      ),
    ).toEqual({
      shipped: ['docs-consumer', 'workflow-consumer'],
      canonicalUnshipped: ['repo-local-authoring'],
    });
  });

  it('reports a shipped skill whose canonical directory is absent', () => {
    expect(
      findMissingShippedSkillDirs(['docs-consumer'], HEALTHY_MANIFEST),
    ).toEqual(['workflow-consumer']);
    expect(
      findMissingShippedSkillDirs(
        ['docs-consumer', 'workflow-consumer', 'repo-local-authoring'],
        HEALTHY_MANIFEST,
      ),
    ).toEqual([]);
  });

  it('resolveOwningPack throws for a name in no pack', () => {
    expect(() => resolveOwningPack('nowhere', HEALTHY_MANIFEST)).toThrow(
      'resolveOwningPack: skill "nowhere" is shipped by no pack; pass a name from listShippedSkills()',
    );
  });

  it('resolves a skill shipped by two packs to both', () => {
    const shared: readonly PackDefinition[] = [
      pack('docs', [skillAsset('shared-skill'), scriptAsset('helper.sh')]),
      pack('workflows', [skillAsset('shared-skill')]),
    ];

    expect(resolveOwningPack('shared-skill', shared)).toEqual([
      'docs',
      'workflows',
    ]);
  });
});

describe('findUnshippedScriptReferences', () => {
  it("passes when every shipped skill's script references exist in its owning pack", () => {
    expect(
      findUnshippedScriptReferences([CONSUMER_SOURCE], HEALTHY_MANIFEST),
    ).toEqual([]);
  });

  it('reports skill, reference, and pack when the script is absent', () => {
    // The mutation: the same manifest with the referenced script removed.
    const mutated: readonly PackDefinition[] = [
      pack('docs', [skillAsset('docs-consumer')]),
      pack('workflows', [
        skillAsset('workflow-consumer'),
        scriptAsset('other-helper.sh'),
      ]),
    ];

    const violations = findUnshippedScriptReferences(
      [CONSUMER_SOURCE],
      mutated,
    );

    expect(violations).toEqual([
      {
        skill: 'docs-consumer',
        file: '.agents/skills/docs-consumer/SKILL.md',
        line: 1,
        reference: '.oat/scripts/helper.sh',
        packs: ['docs'],
        shipped: [],
      },
    ]);
    expect(formatScriptReferenceViolation(violations[0]!)).toBe(
      'docs-consumer (pack docs) references .oat/scripts/helper.sh at .agents/skills/docs-consumer/SKILL.md:1, but pack docs ships no scripts',
    );
  });

  it('fails when a referenced script is renamed', () => {
    const renamed: readonly PackDefinition[] = [
      pack('docs', [skillAsset('docs-consumer'), scriptAsset('helper-v2.sh')]),
    ];

    const violations = findUnshippedScriptReferences(
      [CONSUMER_SOURCE],
      renamed,
    );

    expect(violations).toHaveLength(1);
    expect(formatScriptReferenceViolation(violations[0]!)).toBe(
      'docs-consumer (pack docs) references .oat/scripts/helper.sh at .agents/skills/docs-consumer/SKILL.md:1, but pack docs ships .oat/scripts/helper-v2.sh',
    );
  });

  it('fails when the skill moved to a pack that does not ship the script', () => {
    // Pack-boundary drift: the script still exists, but not in the pack that
    // now ships the consuming skill.
    const moved: readonly PackDefinition[] = [
      pack('docs', [scriptAsset('helper.sh')]),
      pack('workflows', [skillAsset('docs-consumer')]),
    ];

    expect(
      findUnshippedScriptReferences([CONSUMER_SOURCE], moved).map(
        ({ packs, reference }) => ({ packs, reference }),
      ),
    ).toEqual([{ packs: ['workflows'], reference: '.oat/scripts/helper.sh' }]);
  });

  it('accepts a sharedOwner script from either owning pack', () => {
    // `sharedOwner` lets one script legitimately live in two packs, so the
    // check is membership in an owning pack, never uniqueness.
    const shared: readonly PackDefinition[] = [
      pack('docs', [
        skillAsset('docs-consumer'),
        scriptAsset('helper.sh', 'helper'),
      ]),
      pack('workflows', [
        skillAsset('workflow-consumer'),
        scriptAsset('helper.sh', 'helper'),
      ]),
    ];

    expect(
      findUnshippedScriptReferences(
        [CONSUMER_SOURCE, { ...CONSUMER_SOURCE, skill: 'workflow-consumer' }],
        shared,
      ),
    ).toEqual([]);
  });

  it("accepts a script shipped by only one of a skill's owning packs", () => {
    // Membership in an owning pack, never intersection across all of them. The
    // skill is shipped by two packs and the script by one; an implementation
    // that required every owning pack to ship the script would fail here, and
    // the sharedOwner case above cannot catch that because both of its packs
    // ship the script.
    const dualOwned: readonly PackDefinition[] = [
      pack('docs', [skillAsset('dual-owned'), scriptAsset('helper.sh')]),
      pack('workflows', [skillAsset('dual-owned')]),
    ];

    expect(resolveOwningPack('dual-owned', dualOwned)).toEqual([
      'docs',
      'workflows',
    ]);
    expect(
      findUnshippedScriptReferences(
        [{ ...CONSUMER_SOURCE, skill: 'dual-owned' }],
        dualOwned,
      ),
    ).toEqual([]);
  });

  it('never validates an unshipped canonical skill that carries a script reference', () => {
    // The no-owner policy, end to end: a canonical directory outside every pack
    // may name a script no pack ships, and that is reported, never failed. It is
    // excluded by construction rather than by an allowlist, because the checker
    // is driven by the manifest's shipped surface.
    const unshipped = 'repo-local-authoring';
    const unshippedSource = {
      skill: unshipped,
      file: `.agents/skills/${unshipped}/SKILL.md`,
      text: 'Run `.oat/scripts/local-only.sh` from the repository root.\n',
    };

    // It really does carry a reference, and to a script no pack ships.
    expect(
      extractScriptReferences(unshippedSource.text).map(
        ({ reference }) => reference,
      ),
    ).toEqual(['.oat/scripts/local-only.sh']);

    expect(
      classifyCanonicalSkillDirs(
        [CONSUMER_SOURCE.skill, unshipped],
        HEALTHY_MANIFEST,
      ),
    ).toEqual({
      shipped: [CONSUMER_SOURCE.skill],
      canonicalUnshipped: [unshipped],
    });

    // Driving from the shipped surface drops it before the checker sees it, so
    // the dangling reference yields no violation and the resolver is never
    // reached with a name it would have to throw on.
    const shipped = listShippedSkills(HEALTHY_MANIFEST);
    const sources = [CONSUMER_SOURCE, unshippedSource].filter(({ skill }) =>
      shipped.includes(skill),
    );

    expect(sources.map(({ skill }) => skill)).toEqual([CONSUMER_SOURCE.skill]);
    expect(findUnshippedScriptReferences(sources, HEALTHY_MANIFEST)).toEqual(
      [],
    );
    expect(() => resolveOwningPack(unshipped, HEALTHY_MANIFEST)).toThrow(
      /shipped by no pack/,
    );
  });

  it('ignores prose that names no script', () => {
    expect(
      findUnshippedScriptReferences(
        [
          {
            ...CONSUMER_SOURCE,
            text: 'Scripts install to `.oat/scripts/` under the resolved scope; see `~/.oat/scripts/<file>`.',
          },
        ],
        HEALTHY_MANIFEST,
      ),
    ).toEqual([]);
  });
});

describe('live pack manifest', () => {
  it('resolves each live tracking-script consumer to its owning pack', () => {
    expect(resolveOwningPack('oat-docs-analyze')).toEqual(['docs']);
    expect(resolveOwningPack('oat-repo-knowledge-index')).toEqual([
      'workflows',
    ]);
  });

  it('exposes the script destinations each live pack ships', () => {
    expect(listPackScriptDestinations('docs')).toEqual([
      '.oat/scripts/resolve-tracking.sh',
    ]);
    expect(listPackScriptDestinations('workflows')).toEqual([
      '.oat/scripts/generate-oat-state.sh',
      '.oat/scripts/generate-thin-index.sh',
      '.oat/scripts/resolve-tracking.sh',
    ]);
    expect(listPackScriptDestinations('utility')).toEqual([]);
  });

  it('derives the shipped skill surface from the live manifest', () => {
    const shipped = listShippedSkills(PACK_MANIFEST);

    // A skill that shipped after this contract was designed still lands in the
    // surface, because the surface is derived rather than curated.
    expect(shipped).toEqual(expect.arrayContaining(['oat-project-lite']));
    // Agent assets are a separate kind and never leak into the skill surface.
    expect(shipped).not.toContain('oat-reviewer');
    expect(new Set(shipped).size).toBe(shipped.length);
  });
});
