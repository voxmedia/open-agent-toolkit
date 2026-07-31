import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { tmpdir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { join } from 'node:path';

import { canonicalizeJson, parseStrictJson } from './canonical-json';

const AUTHORITY_KEY_ENV = 'OAT_REVIEW_AUTHORITY_KEY';
const VALIDATION_ROOT_ENV = 'OAT_REVIEW_VALIDATION_ROOT';

interface AuthenticatedStateEnvelope {
  schemaVersion: 1;
  algorithm: 'hmac-sha256';
  state: unknown;
  tag: string;
}

function exactEnvelope(value: unknown): AuthenticatedStateEnvelope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('authenticated validation state envelope is invalid');
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.join(',') !== 'algorithm,schemaVersion,state,tag' ||
    record.schemaVersion !== 1 ||
    record.algorithm !== 'hmac-sha256' ||
    typeof record.tag !== 'string'
  ) {
    throw new Error('authenticated validation state envelope is invalid');
  }
  return record as unknown as AuthenticatedStateEnvelope;
}

export class ValidationStoreAuthority {
  readonly #key: Buffer;

  constructor(key: Uint8Array) {
    if (key.byteLength < 32) {
      throw new Error(
        'validation authority key must contain at least 32 bytes',
      );
    }
    this.#key = Buffer.from(key);
  }

  #tag(state: unknown): string {
    return createHmac('sha256', this.#key)
      .update(canonicalizeJson(state))
      .digest('base64url');
  }

  seal(state: unknown): string {
    return `${JSON.stringify({
      schemaVersion: 1,
      algorithm: 'hmac-sha256',
      state,
      tag: this.#tag(state),
    } satisfies AuthenticatedStateEnvelope)}\n`;
  }

  open(source: string): unknown {
    const envelope = exactEnvelope(parseStrictJson(source));
    const expected = Buffer.from(this.#tag(envelope.state));
    const received = Buffer.from(envelope.tag);
    if (
      expected.byteLength !== received.byteLength ||
      !timingSafeEqual(expected, received)
    ) {
      throw new Error('validation state authentication failed');
    }
    return envelope.state;
  }
}

const EPHEMERAL_TEST_AUTHORITY = new ValidationStoreAuthority(randomBytes(32));

export function ephemeralValidationStoreAuthority(): ValidationStoreAuthority {
  return EPHEMERAL_TEST_AUTHORITY;
}

export function launcherValidationStoreAuthority(
  environment: NodeJS.ProcessEnv = process.env,
): ValidationStoreAuthority {
  const encoded = environment[AUTHORITY_KEY_ENV];
  if (!encoded) {
    throw new Error(
      `${AUTHORITY_KEY_ENV} is required for review state authority`,
    );
  }
  return new ValidationStoreAuthority(Buffer.from(encoded, 'base64url'));
}

export function consumeLauncherValidationAuthorityKey(
  environment: NodeJS.ProcessEnv = process.env,
): Buffer {
  const encoded = environment[AUTHORITY_KEY_ENV];
  if (!encoded) {
    throw new Error(
      `${AUTHORITY_KEY_ENV} is required for review state authority`,
    );
  }
  delete environment[AUTHORITY_KEY_ENV];
  const key = Buffer.from(encoded, 'base64url');
  if (key.byteLength < 32) {
    key.fill(0);
    throw new Error('validation authority key must contain at least 32 bytes');
  }
  return key;
}

export function reviewerSafeEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const safe = { ...environment };
  delete safe[AUTHORITY_KEY_ENV];
  return safe;
}

export function launcherValidationStoreRoot(
  input: {
    repoRoot?: string;
    environment?: NodeJS.ProcessEnv;
  } = {},
): string {
  const environment = input.environment ?? process.env;
  const configured = environment[VALIDATION_ROOT_ENV];
  const root = resolve(
    configured ?? join(tmpdir(), 'oat-review-validation-authoritative-v1'),
  );
  if (configured && !isAbsolute(configured)) {
    throw new Error(`${VALIDATION_ROOT_ENV} must be an absolute path`);
  }
  if (input.repoRoot) {
    const relation = relative(resolve(input.repoRoot), root);
    if (
      relation === '' ||
      (!relation.startsWith('..') && !isAbsolute(relation))
    ) {
      throw new Error(
        'authoritative validation state must be outside the repository',
      );
    }
  }
  return root;
}
