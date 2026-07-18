import { describe, expect, it } from 'vitest';

import {
  buildCursorMaterializedRoleName,
  isOatManagedCursorRoleFile,
  readOatManagedCursorRoleOwner,
  readOatManagedCursorRoleName,
  renderCursorManagedComments,
} from './shared';

describe('cursor materialization shared helpers', () => {
  it('builds deterministic normalized names from flat ladder ids', () => {
    expect(
      buildCursorMaterializedRoleName({
        agentName: 'oat-reviewer',
        ladderModelId: 'cursor-grok-4.5-high-fast',
      }),
    ).toBe('oat-reviewer-cursor-grok-4-5-high-fast');
  });

  it('renders and parses strict YAML comment ownership markers', () => {
    const roleName = 'oat-reviewer-gpt-5-6-sol-high';
    const content = [
      '---',
      ...renderCursorManagedComments(roleName, 'project-config'),
      `name: ${roleName}`,
      'description: reviewer',
      'model: gpt-5.6-sol[reasoning=high]',
      '---',
      '',
      'Review.',
    ].join('\n');

    expect(isOatManagedCursorRoleFile(content, roleName)).toBe(true);
    expect(readOatManagedCursorRoleName(content)).toBe(roleName);
    expect(readOatManagedCursorRoleOwner(content)).toBe('project-config');
  });

  it('rejects markers outside frontmatter and malformed duplicate markers', () => {
    const bodySpoof = [
      '---',
      'name: spoof',
      'description: spoof',
      'model: composer-2.5[fast=true]',
      '---',
      '# oat-managed: true',
      '# oat-role: spoof',
      '# oat-owner: project-config',
    ].join('\n');
    const duplicateOwner = [
      '---',
      '# oat-managed: true',
      '# oat-role: duplicate',
      '# oat-owner: project-config',
      '# oat-owner: project-config',
      'name: duplicate',
      'description: duplicate',
      'model: composer-2.5[fast=true]',
      '---',
    ].join('\n');

    expect(isOatManagedCursorRoleFile(bodySpoof)).toBe(false);
    expect(isOatManagedCursorRoleFile(duplicateOwner)).toBe(false);
  });
});
