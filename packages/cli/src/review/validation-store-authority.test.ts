import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  consumeLauncherValidationAuthorityKey,
  launcherValidationStoreAuthority,
  launcherValidationStoreRoot,
  reviewerSafeEnvironment,
  ValidationStoreAuthority,
} from './validation-store-authority';

describe('ValidationStoreAuthority', () => {
  it('authenticates state and rejects plaintext or tampered envelopes', () => {
    const authority = new ValidationStoreAuthority(Buffer.alloc(32, 7));
    const sealed = authority.seal({ phase: 'prepared', count: 1 });

    expect(authority.open(sealed)).toEqual({ phase: 'prepared', count: 1 });
    const tampered = sealed.replace('"count":1', '"count":2');
    expect(() => authority.open(tampered)).toThrow(/authentication/);
    const duplicateState = sealed.replace(
      '"state":{"phase":"prepared","count":1}',
      '"state":{"phase":"prepared","count":1},"state":{"phase":"prepared","count":1}',
    );
    expect(() => authority.open(duplicateState)).toThrow(/duplicate/);
    expect(() => authority.open(`${sealed.trim()} true`)).toThrow(
      /strict JSON/,
    );
    expect(() =>
      authority.open(JSON.stringify({ phase: 'evidence_started' })),
    ).toThrow(/envelope/);
  });

  it('requires a launcher-held key and an outside-repository absolute root', () => {
    const key = Buffer.alloc(32, 3).toString('base64url');
    expect(
      launcherValidationStoreAuthority({ OAT_REVIEW_AUTHORITY_KEY: key }),
    ).toBeInstanceOf(ValidationStoreAuthority);
    expect(() => launcherValidationStoreAuthority({})).toThrow(
      /OAT_REVIEW_AUTHORITY_KEY/,
    );
    expect(() =>
      launcherValidationStoreRoot({
        environment: { OAT_REVIEW_VALIDATION_ROOT: 'relative/store' },
      }),
    ).toThrow(/absolute/);
    expect(() =>
      launcherValidationStoreRoot({
        repoRoot: '/workspace/repo',
        environment: {
          OAT_REVIEW_VALIDATION_ROOT: join(
            '/workspace/repo',
            '.oat',
            'validation',
          ),
        },
      }),
    ).toThrow(/outside/);
  });

  it('consumes launcher authority and removes it from reviewer environments', () => {
    const environment = {
      OAT_REVIEW_AUTHORITY_KEY: Buffer.alloc(32, 5).toString('base64url'),
      SAFE: 'visible',
    };
    const key = consumeLauncherValidationAuthorityKey(environment);
    expect(key).toEqual(Buffer.alloc(32, 5));
    expect(environment).not.toHaveProperty('OAT_REVIEW_AUTHORITY_KEY');
    expect(
      reviewerSafeEnvironment({
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-leak',
        TSX_TSCONFIG_PATH: 'packages/cli/tsconfig.json',
        SAFE: 'visible',
      }),
    ).toEqual({ SAFE: 'visible' });
  });
});
