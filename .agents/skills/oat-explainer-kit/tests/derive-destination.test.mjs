import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveExplainerDestination } from '../scripts/derive-destination.mjs';

test('derives project destinations from normalized repository roots', () => {
  assert.deepEqual(
    deriveExplainerDestination({
      invocation: 'project',
      projectSlug: 'Roadmap & café',
      s3Uri: 's3://example-bucket/repositories/demo///',
      publicBaseUrl: 'https://docs.example.com/repositories/demo///',
    }),
    {
      s3Uri:
        's3://example-bucket/repositories/demo/projects/Roadmap%20%26%20caf%C3%A9',
      publicBaseUrl:
        'https://docs.example.com/repositories/demo/projects/Roadmap%20%26%20caf%C3%A9',
    },
  );
});

test('uses encodeURIComponent segment rules for reserved and unicode text', () => {
  for (const slug of ['space here', '日本語', '#frag?', 'a:b@c']) {
    const destination = deriveExplainerDestination({
      invocation: 'project',
      projectSlug: slug,
      s3Uri: 's3://bucket/root',
      publicBaseUrl: 'https://example.com/root',
    });
    const encoded = encodeURIComponent(slug);
    assert.equal(destination.s3Uri, `s3://bucket/root/projects/${encoded}`);
    assert.equal(
      destination.publicBaseUrl,
      `https://example.com/root/projects/${encoded}`,
    );
  }
});

test('leaves repository and direct invocation roots unchanged', () => {
  for (const invocation of ['repo', 'direct']) {
    assert.deepEqual(
      deriveExplainerDestination({
        invocation,
        s3Uri: 's3://bucket/root///',
        publicBaseUrl: 'https://example.com/root///',
      }),
      {
        s3Uri: 's3://bucket/root',
        publicBaseUrl: 'https://example.com/root',
      },
    );
  }
});

test('rejects empty and unsafe project slug segments', () => {
  for (const projectSlug of [
    '',
    '   ',
    '.',
    '..',
    'a/b',
    'a\\b',
    'bad\0slug',
  ]) {
    assert.throws(
      () =>
        deriveExplainerDestination({
          invocation: 'project',
          projectSlug,
          s3Uri: 's3://bucket/root',
          publicBaseUrl: 'https://example.com/root',
        }),
      /project slug|unsafe/i,
    );
  }
});

test('rejects unsupported invocations and malformed roots', () => {
  assert.throws(
    () =>
      deriveExplainerDestination({
        invocation: 'unknown',
        s3Uri: 's3://bucket/root',
        publicBaseUrl: 'https://example.com/root',
      }),
    /unsupported.*invocation/i,
  );
  assert.throws(
    () =>
      deriveExplainerDestination({
        invocation: 'repo',
        s3Uri: 'https://not-s3.example.com',
        publicBaseUrl: 'https://example.com/root',
      }),
    /s3/i,
  );
});

test('rejects credential-bearing and non-root destination URLs', () => {
  const invalidRoots = [
    {
      label: 's3Uri',
      value: 's3://synthetic-access:synthetic-secret@bucket/root',
    },
    {
      label: 's3Uri',
      value: 's3:///bucket/root',
    },
    {
      label: 's3Uri',
      value: 's3://bucket/root?synthetic-token=value',
    },
    {
      label: 's3Uri',
      value: 's3://bucket/root#synthetic-fragment',
    },
    {
      label: 'publicBaseUrl',
      value: 'https://synthetic-user:synthetic-password@docs.example.com/root',
    },
    {
      label: 'publicBaseUrl',
      value: 'https:///docs.example.com/root',
    },
    {
      label: 'publicBaseUrl',
      value: 'https://docs.example.com/root?synthetic-token=value',
    },
    {
      label: 'publicBaseUrl',
      value: 'https://docs.example.com/root#synthetic-fragment',
    },
  ];

  for (const { label, value } of invalidRoots) {
    assert.throws(
      () =>
        deriveExplainerDestination({
          invocation: 'project',
          projectSlug: 'demo',
          s3Uri: label === 's3Uri' ? value : 's3://bucket/root',
          publicBaseUrl:
            label === 'publicBaseUrl' ? value : 'https://example.com/root',
        }),
      new RegExp(label, 'i'),
      `${label} accepted invalid root ${value}`,
    );
  }
});
