import { z } from 'zod';

import {
  contextsEqual,
  type ProviderContext,
  type RemoteProvider,
  type SemanticOperation,
} from './provider';
import { RemoteAccountContextSchema } from './schema';

export type HostSurfaceKind = 'connector' | 'configured-cli';

export interface HostCapabilityEvidence {
  provider: RemoteProvider;
  context: ProviderContext;
  surfaceKind: HostSurfaceKind;
  availability:
    | 'available'
    | 'authorization-required'
    | 'unsupported-or-unresolved'
    | 'disabled';
  semanticCapabilities: SemanticOperation[];
  evidenceDigest: string;
  observedAt: string;
}

const HostCapabilityEvidenceSchema = z
  .object({
    provider: z.enum(['github', 'linear', 'jira']),
    context: RemoteAccountContextSchema,
    surfaceKind: z.enum(['connector', 'configured-cli']),
    availability: z.enum([
      'available',
      'authorization-required',
      'unsupported-or-unresolved',
      'disabled',
    ]),
    semanticCapabilities: z
      .array(
        z.enum([
          'read',
          'read-discussion',
          'search-duplicates',
          'create',
          'update',
          'transition',
          'annotate',
        ]),
      )
      .max(32),
    evidenceDigest: z.string().min(1).max(512),
    observedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export function parseHostCapabilityEvidence(
  value: unknown,
): HostCapabilityEvidence {
  return HostCapabilityEvidenceSchema.parse(value);
}

export type HostExecutionSelection =
  | { selected: true; evidence: HostCapabilityEvidence; fallbackUsed: boolean }
  | {
      selected: false;
      reason:
        | 'unavailable'
        | 'authorization-required'
        | 'context-mismatch'
        | 'capability-missing'
        | 'disabled'
        | 'attempt-started';
    };

export function selectHostExecution(input: {
  provider: RemoteProvider;
  context: ProviderContext;
  operation: SemanticOperation;
  candidates: readonly HostCapabilityEvidence[];
  attemptStarted: boolean;
}): HostExecutionSelection {
  const relevant = input.candidates.filter(
    (candidate) => candidate.provider === input.provider,
  );
  if (relevant.some((candidate) => candidate.availability === 'disabled')) {
    return { selected: false, reason: 'disabled' };
  }
  if (input.attemptStarted)
    return { selected: false, reason: 'attempt-started' };
  const contextual = relevant.filter((candidate) =>
    contextsEqual(candidate.context, input.context),
  );
  if (relevant.length > 0 && contextual.length === 0) {
    return { selected: false, reason: 'context-mismatch' };
  }
  const capable = contextual.filter((candidate) =>
    candidate.semanticCapabilities.includes(input.operation),
  );
  if (contextual.length > 0 && capable.length === 0) {
    return { selected: false, reason: 'capability-missing' };
  }
  const available = capable.filter(
    (candidate) => candidate.availability === 'available',
  );
  const connector = available.find(
    (candidate) => candidate.surfaceKind === 'connector',
  );
  const selected =
    connector ??
    available.find((candidate) => candidate.surfaceKind === 'configured-cli');
  if (selected) {
    return {
      selected: true,
      evidence: selected,
      fallbackUsed: selected.surfaceKind === 'configured-cli',
    };
  }
  if (
    capable.some(
      (candidate) => candidate.availability === 'authorization-required',
    )
  ) {
    return { selected: false, reason: 'authorization-required' };
  }
  return { selected: false, reason: 'unavailable' };
}
