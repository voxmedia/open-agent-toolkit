import { describe, expect, it } from 'vitest';

import { reconcileBinding, type ReconciliationInput } from './reconcile';

const baseInput: ReconciliationInput = {
  base: { title: 'Base', description: 'Base body', priority: 'medium' },
  local: { title: 'Base', description: 'Base body', priority: 'medium' },
  remote: { title: 'Base', description: 'Base body', priority: 'medium' },
  fieldDirections: {
    title: ['inbound', 'outbound'],
    description: ['inbound', 'outbound'],
    priority: ['inbound', 'outbound'],
  },
  descriptionMode: 'managed-section',
  priorityMapping: true,
  remoteLifecycle: 'active',
  uncertainOperation: false,
};

describe('reconcileBinding', () => {
  it('classifies no-change, local-only, remote-only, and converged values', () => {
    expect(reconcileBinding(baseInput).classification).toBe('no-change');
    expect(
      reconcileBinding({
        ...baseInput,
        local: { ...baseInput.local, title: 'Local' },
      }).fields.title,
    ).toMatchObject({
      classification: 'local-only',
      proposedDirection: 'outbound',
    });
    expect(
      reconcileBinding({
        ...baseInput,
        remote: { ...baseInput.remote, title: 'Remote' },
      }).fields.title,
    ).toMatchObject({
      classification: 'remote-only',
      proposedDirection: 'inbound',
    });
    expect(
      reconcileBinding({
        ...baseInput,
        local: { ...baseInput.local, title: 'Same' },
        remote: { ...baseInput.remote, title: 'Same' },
      }).fields.title,
    ).toMatchObject({ classification: 'converged', proposedDirection: 'none' });
  });

  it('classifies independent changes as disjoint with both safe proposals', () => {
    const result = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, title: 'Local title' },
      remote: { ...baseInput.remote, priority: 'high' },
    });

    expect(result.classification).toBe('disjoint');
    expect(result.fields.title.proposedDirection).toBe('outbound');
    expect(result.fields.priority?.proposedDirection).toBe('inbound');
    expect(result.choiceRequired).toBe(false);
  });

  it('requires a choice for a same-field conflict regardless of configured direction', () => {
    const result = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, title: 'Local title' },
      remote: { ...baseInput.remote, title: 'Remote title' },
      fieldDirections: { ...baseInput.fieldDirections, title: ['inbound'] },
    });

    expect(result.classification).toBe('conflict');
    expect(result.fields.title.proposedDirection).toBe('choice-required');
    expect(result.choiceRequired).toBe(true);
  });

  it.each([
    ['archived', 'remote-anomaly'],
    ['moved', 'remote-anomaly'],
    ['missing-or-invisible', 'remote-anomaly'],
    ['deleted-confirmed', 'remote-anomaly'],
    ['temporarily-unavailable', 'remote-anomaly'],
  ] as const)(
    'blocks proposals for the %s remote lifecycle',
    (lifecycle, expected) => {
      const result = reconcileBinding({
        ...baseInput,
        local: { ...baseInput.local, title: 'Local title' },
        remoteLifecycle: lifecycle,
      });
      expect(result.classification).toBe(expected);
      expect(result.fields.title.proposedDirection).toBe('none');
      expect(result.blockedBy).toEqual([`remote-lifecycle:${lifecycle}`]);
    },
  );

  it('blocks every proposal behind an uncertain prior operation', () => {
    const result = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, title: 'Local title' },
      uncertainOperation: true,
    });
    expect(result.classification).toBe('uncertain-operation');
    expect(result.fields.title.proposedDirection).toBe('none');
    expect(result.blockedBy).toEqual(['uncertain-operation']);
  });

  it('honors description modes without treating retained full content as writable', () => {
    const none = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, description: 'Local body' },
      descriptionMode: 'none',
    });
    expect(none.fields.description).toMatchObject({
      classification: 'local-only',
      proposedDirection: 'none',
      scope: 'none',
    });

    const managed = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, description: 'Managed local' },
      descriptionMode: 'managed-section',
    });
    expect(managed.fields.description).toMatchObject({
      proposedDirection: 'outbound',
      scope: 'managed-section',
    });

    const replace = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, description: 'Complete local' },
      descriptionMode: 'replace',
    });
    expect(replace.fields.description.scope).toBe('full');
  });

  it('omits priority when no safe provider mapping is advertised', () => {
    const result = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, priority: 'high' },
      priorityMapping: false,
    });
    expect(result.fields.priority).toBeUndefined();
    expect(result.classification).toBe('no-change');
    expect(result.blockedBy).toContain('priority-mapping-unavailable');
  });

  it('keeps status and provider-native fields outside the shared contract', () => {
    const result = reconcileBinding({
      ...baseInput,
      local: { ...baseInput.local, status: 'done', labels: ['local'] },
      remote: { ...baseInput.remote, status: 'closed', labels: ['remote'] },
    } as ReconciliationInput);
    expect(Object.keys(result.fields)).toEqual([
      'title',
      'description',
      'priority',
    ]);
  });
});
