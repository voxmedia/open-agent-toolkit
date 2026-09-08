import { describe, expect, it } from 'vitest';

import {
  readDeclaredVersion,
  resolveDeclaredVersion,
  withDeclaredVersion,
} from './skill-version';

function skill(declaration: string): string {
  return `---\nname: core\n${declaration}\n---\n\n# Core\n`;
}

describe('readDeclaredVersion', () => {
  it('prefers metadata.version over the deprecated top-level alias', () => {
    expect(readDeclaredVersion(skill('metadata:\n  version: 1.2.3'))).toBe(
      '1.2.3',
    );
    expect(readDeclaredVersion(skill('version: 1.2.3'))).toBe('1.2.3');
    expect(
      readDeclaredVersion(skill('version: 1.2.3\nmetadata:\n  version: 2.0.0')),
    ).toBe('2.0.0');
    expect(readDeclaredVersion(skill('description: core'))).toBeUndefined();
  });

  it('ignores a metadata block in the skill body', () => {
    const content = `${skill('version: 1.2.3')}\n## Example\n\nmetadata:\n  version: 9.9.9\n`;

    expect(readDeclaredVersion(content)).toBe('1.2.3');
  });
});

describe('withDeclaredVersion', () => {
  it('rewrites the declaration in whichever position a skill uses', () => {
    expect(withDeclaredVersion(skill('version: 1.2.3'), '0.0.1')).toContain(
      '\nversion: 0.0.1\n',
    );
    expect(
      withDeclaredVersion(skill('metadata:\n  version: 1.2.3'), '0.0.1'),
    ).toContain('\n  version: 0.0.1\n');
  });

  it('rewrites every declaration so the result is never self-contradictory', () => {
    const both = skill('version: 1.2.3\nmetadata:\n  version: 1.2.3');

    const rewritten = withDeclaredVersion(both, '0.0.1');

    // Rewriting only the resolved position would leave the other declaration at
    // the old value, and the consumer under test would then be rejecting a
    // conflict rather than the version it was handed.
    expect(resolveDeclaredVersion(rewritten)?.conflict).toBeUndefined();
    expect(readDeclaredVersion(rewritten)).toBe('0.0.1');
    expect(rewritten).toContain('\nversion: 0.0.1\n');
    expect(rewritten).toContain('\n  version: 0.0.1\n');
  });

  it('rewrites both declarations when the metadata key carries a comment', () => {
    const both = skill('version: 1.2.3\nmetadata: # info\n  version: 1.2.3');

    const rewritten = withDeclaredVersion(both, '0.0.1');

    expect(resolveDeclaredVersion(rewritten)?.conflict).toBeUndefined();
    expect(readDeclaredVersion(rewritten)).toBe('0.0.1');
  });

  it('is not misled into rewriting a block scalar by an indented comment', () => {
    // The comment is indented deeper than the map's real children: treating it
    // as structure would set the child indent to 4, hide `  version: 1.2.3`,
    // and rewrite the block scalar's payload instead.
    const content = skill(
      'metadata:\n    # comment\n  description: |\n    version: 9.9.9\n  version: 1.2.3',
    );

    const rewritten = withDeclaredVersion(content, '0.0.1');

    expect(rewritten).toContain('\n    version: 9.9.9\n');
    expect(rewritten).toContain('\n  version: 0.0.1\n');
    expect(readDeclaredVersion(rewritten)).toBe('0.0.1');
  });

  it('leaves content alone when nothing resolves or a declaration repeats', () => {
    // `1.10` is the number 1.1 to YAML, so the resolver reads no version at all.
    const unusable = skill('version: 1.10');
    const noDeclaration = skill('description: core');
    const repeated = skill(
      'metadata:\n  version: 1.2.3\nmetadata:\n  version: 9.9.9',
    );

    expect(withDeclaredVersion(unusable, '0.0.1')).toBe(unusable);
    expect(withDeclaredVersion(noDeclaration, '0.0.1')).toBe(noDeclaration);
    expect(withDeclaredVersion(repeated, '0.0.1')).toBe(repeated);
  });

  it('never rewrites a version outside the frontmatter', () => {
    const content = `${skill('version: 1.2.3')}\n## Example\n\nversion: 9.9.9\n`;

    expect(withDeclaredVersion(content, '0.0.1')).toContain('\nversion: 9.9.9');
  });
});
