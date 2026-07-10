import { describe, expect, it } from 'vitest';

import {
  isOatManagedCodexRoleFile,
  readOatManagedCodexRoleOwner,
  withOatManagedCodexRoleOwner,
} from './shared';

const ROLE = 'oat-reviewer-gpt-5-6-sol-high';

function roleFile(options?: { header?: string[]; body?: string[] }): string {
  return [
    ...(options?.header ?? [
      '# oat-managed: true',
      `# oat-role: ${ROLE}`,
      '# oat-owner: project-config',
    ]),
    ...(options?.body ?? ['model = "gpt-5.6-sol"', '']),
  ].join('\n');
}

describe('managed Codex role headers', () => {
  it('recognizes one well-formed contiguous leading header', () => {
    const content = roleFile();

    expect(isOatManagedCodexRoleFile(content)).toBe(true);
    expect(isOatManagedCodexRoleFile(content, ROLE)).toBe(true);
    expect(isOatManagedCodexRoleFile(content, 'other-role')).toBe(false);
    expect(readOatManagedCodexRoleOwner(content)).toBe('project-config');
  });

  it('ignores marker-like text outside the leading header', () => {
    const bodyOnly = [
      'developer_instructions = """',
      '# oat-managed: true',
      `# oat-role: ${ROLE}`,
      '# oat-owner: project-config',
      '"""',
      '',
    ].join('\n');
    const precededHeader = roleFile({
      header: [
        '# ordinary comment',
        '# oat-managed: true',
        `# oat-role: ${ROLE}`,
      ],
    });

    for (const content of [bodyOnly, precededHeader]) {
      expect(isOatManagedCodexRoleFile(content, ROLE)).toBe(false);
      expect(readOatManagedCodexRoleOwner(content)).toBeNull();
      expect(withOatManagedCodexRoleOwner(content, 'user-config')).toBe(
        content,
      );
    }
  });

  it.each([
    [
      'managed marker',
      ['# oat-managed: true', '# oat-managed: true', `# oat-role: ${ROLE}`],
    ],
    [
      'role marker',
      ['# oat-managed: true', `# oat-role: ${ROLE}`, `# oat-role: ${ROLE}`],
    ],
    [
      'owner marker',
      [
        '# oat-managed: true',
        `# oat-role: ${ROLE}`,
        '# oat-owner: project-config',
        '# oat-owner: project-config',
      ],
    ],
    [
      'conflicting owner markers',
      [
        '# oat-managed: true',
        `# oat-role: ${ROLE}`,
        '# oat-owner: project-config',
        '# oat-owner: user-config',
      ],
    ],
  ])('rejects duplicate or conflicting %s lines', (_label, header) => {
    const content = roleFile({ header });

    expect(isOatManagedCodexRoleFile(content, ROLE)).toBe(false);
    expect(readOatManagedCodexRoleOwner(content)).toBeNull();
    expect(withOatManagedCodexRoleOwner(content, 'supported-catalogue')).toBe(
      content,
    );
  });

  it.each([
    ['# oat-managed: true ', `# oat-role: ${ROLE}`],
    ['# oat-managed: true', '# oat-role:'],
    ['# oat-managed: true', `# oat-role: ${ROLE}`, '# oat-owner: external'],
  ])('rejects malformed leading header markers', (...header) => {
    const content = roleFile({ header });

    expect(isOatManagedCodexRoleFile(content, ROLE)).toBe(false);
    expect(readOatManagedCodexRoleOwner(content)).toBeNull();
  });

  it('inserts a missing owner into the header without rewriting a body example', () => {
    const bodyOwnerLine = '# oat-owner: project-config';
    const content = roleFile({
      header: ['# oat-managed: true', `# oat-role: ${ROLE}`],
      body: ['developer_instructions = """', bodyOwnerLine, '"""', ''],
    });

    expect(withOatManagedCodexRoleOwner(content, 'user-config')).toBe(
      roleFile({
        header: [
          '# oat-managed: true',
          `# oat-role: ${ROLE}`,
          '# oat-owner: user-config',
        ],
        body: ['developer_instructions = """', bodyOwnerLine, '"""', ''],
      }),
    );
  });

  it('rewrites only the valid header owner and preserves body marker text', () => {
    const bodyOwnerLine = '# oat-owner: user-config';
    const content = roleFile({
      body: ['developer_instructions = """', bodyOwnerLine, '"""', ''],
    });
    const updated = withOatManagedCodexRoleOwner(
      content,
      'supported-catalogue',
    );

    expect(updated).toContain('# oat-owner: supported-catalogue');
    expect(updated).toContain(
      ['developer_instructions = """', bodyOwnerLine, '"""'].join('\n'),
    );
    expect(readOatManagedCodexRoleOwner(updated)).toBe('supported-catalogue');
  });
});
