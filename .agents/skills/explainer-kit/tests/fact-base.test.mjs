import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { validateContract } from '../scripts/lib/contracts.mjs';
import { processFactBase } from '../scripts/lib/fact-base.mjs';

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
const NOW = '2026-07-17T20:00:00Z';

function source(id, overrides = {}) {
  return {
    id,
    kind: 'file',
    locator: `${id}.md`,
    hash: id === 'plan' ? HASH_A : HASH_B,
    observedAt: '2026-07-17T18:00:00Z',
    ...overrides,
  };
}

function suppliedFactBase(overrides = {}) {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: '2026-07-17T19:00:00Z',
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [source('plan')],
    claims: [
      {
        id: 'status',
        text: 'The rollout is active.',
        status: 'confirmed',
        citations: [{ sourceId: 'plan', locator: 'plan.md:20' }],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
    ...overrides,
  };
}

test('supplied mode performs only consistency and freshness checks', async () => {
  const critic = mock.fn(() => {
    throw new Error('supplied mode must not invoke the adversarial critic');
  });

  const result = await processFactBase(
    {
      mode: 'supplied',
      freshnessPolicy: 'live-wins',
      factBase: suppliedFactBase(),
    },
    { critic, now: NOW, maxAgeMs: 2 * 60 * 60 * 1000 },
  );

  assert.equal(critic.mock.callCount(), 0);
  assert.equal(result.factBase.mode, 'supplied');
  assert.deepEqual(result.checks, {
    kind: 'lightweight-consistency-freshness',
    consistency: 'passed',
    freshness: 'passed',
    warnings: [],
  });
  assert.deepEqual(result.critic, {
    invoked: false,
    reason: 'supplied-mode-lightweight-check-only',
  });
  assert.equal(validateContract('fact-base', result.factBase).valid, true);
});

test('supplied mode reports staleness and rejects inconsistent citations', async () => {
  const stale = suppliedFactBase({
    sources: [
      source('plan', {
        observedAt: '2026-07-15T19:00:00Z',
      }),
    ],
  });
  const result = await processFactBase(
    {
      mode: 'supplied',
      freshnessPolicy: 'live-wins',
      factBase: stale,
    },
    { now: NOW, maxAgeMs: 24 * 60 * 60 * 1000 },
  );

  assert.equal(result.checks.freshness, 'warned');
  assert.match(result.checks.warnings[0], /stale/i);

  const inconsistent = suppliedFactBase();
  inconsistent.claims[0].citations[0].sourceId = 'missing';
  await assert.rejects(
    processFactBase({
      mode: 'supplied',
      freshnessPolicy: 'live-wins',
      factBase: inconsistent,
    }),
    /unknown source/i,
  );
});

test('derives encoded immutable GitHub backlinks from reviewed source provenance', async () => {
  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan', {
            repository: 'acme/project-recaps',
            revision: COMMIT_SHA,
            path: 'docs/Project plans/phase #4.md',
            lineRange: { start: 10, end: 24 },
          }),
          claims: [
            {
              id: 'status',
              text: 'Phase four is complete.',
              lineRange: { start: 17, end: 19 },
            },
          ],
        },
      ],
    },
    {
      now: NOW,
      critic: async () => ({
        criticId: 'contract-critic',
        executedAt: NOW,
        findings: [],
      }),
    },
  );
  const expectedUrl =
    'https://github.com/acme/project-recaps/blob/0123456789abcdef0123456789abcdef01234567/docs/Project%20plans/phase%20%234.md#L17-L19';

  assert.deepEqual(
    {
      repository: result.factBase.sources[0].repository,
      revision: result.factBase.sources[0].revision,
      path: result.factBase.sources[0].path,
      lineRange: result.factBase.sources[0].lineRange,
      url: result.factBase.sources[0].url,
      locator: result.factBase.sources[0].locator,
    },
    {
      repository: 'acme/project-recaps',
      revision: COMMIT_SHA,
      path: 'docs/Project plans/phase #4.md',
      lineRange: { start: 10, end: 24 },
      url: 'https://github.com/acme/project-recaps/blob/0123456789abcdef0123456789abcdef01234567/docs/Project%20plans/phase%20%234.md#L10-L24',
      locator:
        'https://github.com/acme/project-recaps/blob/0123456789abcdef0123456789abcdef01234567/docs/Project%20plans/phase%20%234.md#L10-L24',
    },
  );
  assert.deepEqual(result.factBase.claims[0].citations, [
    {
      sourceId: 'plan',
      locator: expectedUrl,
      repository: 'acme/project-recaps',
      revision: COMMIT_SHA,
      path: 'docs/Project plans/phase #4.md',
      lineRange: { start: 17, end: 19 },
      url: expectedUrl,
    },
  ]);
  assert.equal(validateContract('fact-base', result.factBase).valid, true);
});

test('rejects moving revisions and local-path backlink provenance', async () => {
  for (const provenance of [
    {
      repository: 'acme/project-recaps',
      revision: 'main',
      path: 'docs/plan.md',
      lineRange: { start: 1, end: 2 },
    },
    {
      repository: 'acme/project-recaps',
      revision: COMMIT_SHA,
      path: '/Users/example/project/plan.md',
      lineRange: { start: 1, end: 2 },
    },
    {
      repository: 'acme/project-recaps',
      revision: COMMIT_SHA,
      path: 'docs/plan.md',
      lineRange: { start: 5, end: 4 },
    },
  ]) {
    await assert.rejects(
      processFactBase(
        {
          mode: 'federated',
          freshnessPolicy: 'live-wins',
          sourceDocuments: [
            {
              source: source('plan', provenance),
              claims: [{ id: 'status', text: 'Ready.' }],
            },
          ],
        },
        {
          now: NOW,
          critic: async () => ({
            criticId: 'contract-critic',
            executedAt: NOW,
            findings: [],
          }),
        },
      ),
      /repository|commit|relative|line range|provenance/i,
    );
  }
});

test('federated mode applies authoritative and fresher source precedence with citations', async () => {
  const critic = mock.fn(async () => ({
    criticId: 'contract-critic',
    executedAt: NOW,
    findings: [],
  }));
  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('snapshot', {
            observedAt: '2026-07-16T18:00:00Z',
          }),
          claims: [{ id: 'status', text: 'The rollout is planned.' }],
        },
        {
          source: source('live', {
            kind: 'github',
            locator: 'https://github.com/example/repo/pull/42',
            observedAt: '2026-07-17T19:00:00Z',
            authoritativeFor: ['status'],
          }),
          claims: [
            {
              id: 'status',
              text: 'The rollout is active.',
              sections: ['program-overview'],
            },
          ],
        },
      ],
    },
    { critic, now: NOW },
  );

  assert.equal(result.factBase.claims[0].text, 'The rollout is active.');
  assert.deepEqual(result.factBase.claims[0].sections, ['program-overview']);
  assert.deepEqual(result.factBase.claims[0].citations, [
    {
      sourceId: 'live',
      locator: 'https://github.com/example/repo/pull/42',
    },
  ]);
  assert.deepEqual(result.factBase.unresolvedClaims, []);
  assert.equal(validateContract('fact-base', result.factBase).valid, true);
});

test('federated mode preserves global scope when an agreeing source is untagged', async () => {
  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan'),
          claims: [{ id: 'status', text: 'The rollout is active.' }],
        },
        {
          source: source('live'),
          claims: [
            {
              id: 'status',
              text: 'The rollout is active.',
              sections: ['program-overview'],
            },
          ],
        },
      ],
    },
    {
      now: NOW,
      critic: async () => ({
        criticId: 'contract-critic',
        executedAt: NOW,
        findings: [],
      }),
    },
  );

  assert.equal('sections' in result.factBase.claims[0], false);
});

test('federated mode leaves equally authoritative contradictions unresolved', async () => {
  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan'),
          claims: [{ id: 'owner', text: 'The owner is the platform team.' }],
        },
        {
          source: source('design'),
          claims: [{ id: 'owner', text: 'The owner is the product team.' }],
        },
      ],
    },
    {
      now: NOW,
      critic: async () => ({
        criticId: 'contract-critic',
        executedAt: NOW,
        findings: [],
      }),
    },
  );

  assert.deepEqual(result.factBase.claims, []);
  assert.equal(result.factBase.unresolvedClaims[0].reason, 'contradictory');
  assert.deepEqual(
    result.factBase.unresolvedClaims[0].citations.map(
      ({ sourceId }) => sourceId,
    ),
    ['design', 'plan'],
  );
});

test('operator overrides win, remain explicit, and retain source citations', async () => {
  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan'),
          claims: [{ id: 'count', text: 'There are three lanes.' }],
        },
      ],
      overrides: [
        {
          claimId: 'count',
          decision: 'There are four lanes.',
          confirmedAt: NOW,
        },
      ],
    },
    {
      now: NOW,
      critic: async () => ({
        criticId: 'contract-critic',
        executedAt: NOW,
        findings: [
          {
            claimId: 'count',
            classification: 'contradictory',
            text: 'The source says three lanes.',
            sourceIds: ['plan'],
          },
        ],
      }),
    },
  );

  assert.deepEqual(result.factBase.overrides, [
    {
      claimId: 'count',
      decision: 'There are four lanes.',
      confirmedAt: NOW,
    },
  ]);
  assert.equal(result.factBase.claims[0].status, 'overridden');
  assert.equal(result.factBase.claims[0].text, 'There are four lanes.');
  assert.deepEqual(result.factBase.unresolvedClaims, []);
});

test('federated mode invokes a provider-neutral critic and integrates findings with provenance', async () => {
  const critic = mock.fn(async (request) => {
    assert.deepEqual(Object.keys(request).sort(), [
      'claims',
      'freshnessPolicy',
      'overrides',
      'sources',
    ]);
    assert.equal('provider' in request, false);
    assert.equal('command' in request, false);
    return {
      criticId: 'skeptical-pass',
      executedAt: NOW,
      findings: [
        {
          claimId: 'deadline',
          classification: 'needs-confirmation',
          text: 'The deadline lacks an authoritative source.',
          sourceIds: ['plan'],
        },
      ],
    };
  });

  const result = await processFactBase(
    {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan'),
          claims: [{ id: 'deadline', text: 'Launch is Friday.' }],
        },
      ],
    },
    { critic, now: NOW },
  );

  assert.equal(critic.mock.callCount(), 1);
  assert.equal(result.factBase.claims.length, 0);
  assert.equal(
    result.factBase.unresolvedClaims[0].reason,
    'needs-confirmation',
  );
  assert.deepEqual(
    result.factBase.unresolvedClaims[0].citations.map(
      ({ sourceId }) => sourceId,
    ),
    ['critic:skeptical-pass', 'plan'],
  );
  assert.deepEqual(result.critic, {
    invoked: true,
    criticId: 'skeptical-pass',
    executedAt: NOW,
    sourceId: 'critic:skeptical-pass',
    resultHash: result.factBase.sources.at(-1).hash,
  });
  assert.deepEqual(result.factBase.sources.at(-1), {
    id: 'critic:skeptical-pass',
    kind: 'other',
    locator: 'critic-callback:skeptical-pass',
    hash: result.critic.resultHash,
    observedAt: NOW,
  });
  assert.equal(validateContract('fact-base', result.factBase).valid, true);
});

test('federated mode requires a critic callback', async () => {
  await assert.rejects(
    processFactBase({
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sourceDocuments: [
        {
          source: source('plan'),
          claims: [{ id: 'status', text: 'Ready.' }],
        },
      ],
    }),
    /critic callback/i,
  );
});
