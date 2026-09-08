import { describe, expect, it } from 'vitest';

import {
  semanticDigest,
  type ProviderAdapter,
  type SanitizedProviderObservation,
  type SemanticAction,
} from './provider';
import {
  evaluateProviderConformance,
  validateSemanticObservation,
} from './provider-conformance';

const context = { workspaceId: 'workspace-1', teamId: 'team-1' };
const observation: SanitizedProviderObservation = {
  provider: 'linear',
  context,
  identity: { stableId: 'issue-1', aliases: ['ENG-1'] },
  fields: {
    title: 'Safe title',
    description: null,
    priority: 'high',
    status: 'open',
  },
  revision: { contentDigest: 'sha256:remote' },
  capabilityEvidenceDigest: 'sha256:capability',
};

const adapter: ProviderAdapter = {
  provider: 'linear',
  normalize(value) {
    return {
      provider: value.provider,
      context: value.context,
      stableId: value.identity.stableId,
      aliases: value.identity.aliases,
      title: String(value.fields.title),
      description: null,
      priority: String(value.fields.priority),
      status: String(value.fields.status),
      revisionDigest: semanticDigest(value.revision),
      extensions: {},
    };
  },
  plan(operation, input) {
    return { provider: 'linear', operation, context, intent: input };
  },
  validateObservation(action, value) {
    const reasons = validateSemanticObservation(action, value);
    return { valid: reasons.length === 0, reasons };
  },
  verificationFields() {
    return ['title'];
  },
  verify(_action, issue) {
    return [
      {
        field: 'title',
        status: issue.title === 'Safe title' ? 'verified' : 'mismatch',
      },
    ];
  },
};

describe('provider conformance', () => {
  it('proves stable identity, aliases, normalization, semantic planning, and verification masks', () => {
    expect(
      evaluateProviderConformance({
        adapter,
        observation,
        expected: {
          stableId: 'issue-1',
          aliases: ['ENG-1'],
          verificationFields: ['title'],
        },
      }),
    ).toEqual([]);
  });

  it('rejects provider and context mismatches without a native request schema', () => {
    const action: SemanticAction = {
      provider: 'github',
      operation: 'read',
      context,
      intent: {},
    };
    expect(validateSemanticObservation(action, observation)).toEqual([
      'provider-mismatch',
    ]);
    expect(
      validateSemanticObservation(
        { ...action, provider: 'linear', context: { teamId: 'other' } },
        observation,
      ),
    ).toEqual(['context-mismatch']);
  });
});
