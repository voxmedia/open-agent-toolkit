import type {
  OatPjmRemoteDescriptionMode,
  OatPjmRemoteMutationAuthority,
  OatPjmRemoteOperationClass,
} from '@config/oat-config';

import {
  validatePreviewApproval,
  type BindingPreview,
  type PreviewApproval,
} from './preview';
import { semanticDigest } from './provider';

interface AuthorityLayerInput {
  default?: unknown;
  operations?: Partial<Record<OatPjmRemoteOperationClass, unknown>>;
}

interface PolicyLayerInput {
  description?: unknown;
  authority?: AuthorityLayerInput;
}

export interface ResolveEffectiveRemotePolicyInput {
  repository: PolicyLayerInput;
  provider?: PolicyLayerInput;
  binding?: PolicyLayerInput;
  completeDescriptionReplacement?: boolean;
}

export interface AuthorityResolutionTrace {
  builtIn: 'read-only';
  repository: {
    value: OatPjmRemoteMutationAuthority;
    source: 'built-in' | 'default' | 'operation';
  };
  provider: {
    value: OatPjmRemoteMutationAuthority | null;
    source: 'inherit' | 'default' | 'operation';
  };
  bindingDefault: OatPjmRemoteMutationAuthority | null;
  bindingOperation: OatPjmRemoteMutationAuthority | null;
  hardFloor: 'user-approved' | null;
  final: OatPjmRemoteMutationAuthority;
}

export interface EffectiveRemotePolicy {
  description: OatPjmRemoteDescriptionMode;
  descriptionTrace: {
    builtIn: 'none';
    repository: OatPjmRemoteDescriptionMode;
    provider: OatPjmRemoteDescriptionMode | null;
    binding: OatPjmRemoteDescriptionMode | null;
    final: OatPjmRemoteDescriptionMode;
  };
  authority: Record<OatPjmRemoteOperationClass, OatPjmRemoteMutationAuthority>;
  authorityTrace: Record<OatPjmRemoteOperationClass, AuthorityResolutionTrace>;
  hardFloors: Array<
    'replace-description' | 'destructive' | 'identity-resolution'
  >;
  findings: string[];
}

export type ProductionMutationInvocation =
  | { kind: 'interactive'; invocationId: string; evidenceDigest: string }
  | {
      kind: 'workflow';
      invocationId: string;
      workflowId: string;
      revision: string;
    };

export function validateProductionMutationAuthority(input: {
  effective: OatPjmRemoteMutationAuthority;
  invocation: ProductionMutationInvocation;
  expectedInvocationDigest: string;
  preview: BindingPreview;
  approval: PreviewApproval | null;
  expectedWorkflow: { workflowId: string; revision: string };
  now: string;
  approvalMaxAgeMs: number;
}): {
  authority: { effective: OatPjmRemoteMutationAuthority; sourceDigest: string };
  approval: PreviewApproval | null;
} {
  if (input.effective === 'read-only') {
    throw new Error('Remote mutation is read-only under current policy.');
  }
  if (input.effective === 'user-authorized') {
    if (
      input.invocation.kind !== 'interactive' ||
      input.invocation.evidenceDigest !== input.expectedInvocationDigest
    ) {
      throw new Error(
        'Explicit invocation evidence does not authorize this mutation.',
      );
    }
    return {
      authority: {
        effective: input.effective,
        sourceDigest: input.expectedInvocationDigest,
      },
      approval: null,
    };
  }
  if (input.effective === 'user-approved') {
    if (
      !input.approval ||
      !validatePreviewApproval(input.preview, input.approval, {
        now: input.now,
        maxAgeMs: input.approvalMaxAgeMs,
      }).valid
    ) {
      throw new Error('Fresh approval does not match the current preview.');
    }
    return {
      authority: {
        effective: input.effective,
        sourceDigest: semanticDigest(input.approval),
      },
      approval: input.approval,
    };
  }
  if (
    input.invocation.kind !== 'workflow' ||
    input.invocation.workflowId !== input.expectedWorkflow.workflowId ||
    input.invocation.revision !== input.expectedWorkflow.revision
  ) {
    throw new Error(
      'Autonomous mutation requires current active-workflow authority.',
    );
  }
  return {
    authority: {
      effective: input.effective,
      sourceDigest: semanticDigest(input.expectedWorkflow),
    },
    approval: null,
  };
}

const OPERATIONS: readonly OatPjmRemoteOperationClass[] = [
  'create',
  'update-fields',
  'transition',
  'annotate',
  'delete',
  'relink',
  'detach',
  'recreate',
];
const AUTHORITIES: readonly OatPjmRemoteMutationAuthority[] = [
  'read-only',
  'user-approved',
  'user-authorized',
  'autonomous',
];
const DESCRIPTION_MODES: readonly OatPjmRemoteDescriptionMode[] = [
  'none',
  'managed-section',
  'replace',
];
const DESTRUCTIVE_OPERATIONS = new Set<OatPjmRemoteOperationClass>([
  'delete',
  'recreate',
]);
const IDENTITY_OPERATIONS = new Set<OatPjmRemoteOperationClass>([
  'relink',
  'detach',
  'recreate',
]);

export function resolveEffectiveRemotePolicy(
  input: ResolveEffectiveRemotePolicyInput,
): EffectiveRemotePolicy {
  const findings: string[] = [];
  const description = resolveDescription(input, findings);
  const authority = {} as EffectiveRemotePolicy['authority'];
  const authorityTrace = {} as EffectiveRemotePolicy['authorityTrace'];
  const hardFloors = new Set<EffectiveRemotePolicy['hardFloors'][number]>();

  for (const operation of OPERATIONS) {
    const resolved = resolveAuthority(operation, input, findings);
    let final = resolved.value;
    let hardFloor: 'user-approved' | null = null;
    if (DESTRUCTIVE_OPERATIONS.has(operation)) {
      hardFloors.add('destructive');
      hardFloor = 'user-approved';
    }
    if (IDENTITY_OPERATIONS.has(operation)) {
      hardFloors.add('identity-resolution');
      hardFloor = 'user-approved';
    }
    if (
      operation === 'update-fields' &&
      input.completeDescriptionReplacement === true
    ) {
      hardFloors.add('replace-description');
      hardFloor = 'user-approved';
    }
    if (hardFloor) final = clampAuthority(final, hardFloor);

    authority[operation] = final;
    authorityTrace[operation] = {
      builtIn: 'read-only',
      repository: resolved.repository,
      provider: resolved.provider,
      bindingDefault: resolved.bindingDefault,
      bindingOperation: resolved.bindingOperation,
      hardFloor,
      final,
    };
  }

  return {
    description: description.final,
    descriptionTrace: description,
    authority,
    authorityTrace,
    hardFloors: [...hardFloors],
    findings,
  };
}

function resolveAuthority(
  operation: OatPjmRemoteOperationClass,
  input: ResolveEffectiveRemotePolicyInput,
  findings: string[],
): {
  value: OatPjmRemoteMutationAuthority;
  repository: AuthorityResolutionTrace['repository'];
  provider: AuthorityResolutionTrace['provider'];
  bindingDefault: OatPjmRemoteMutationAuthority | null;
  bindingOperation: OatPjmRemoteMutationAuthority | null;
} {
  const repositoryAuthority = input.repository.authority;
  let repository: AuthorityResolutionTrace['repository'];
  if (hasOperation(repositoryAuthority, operation)) {
    repository = {
      value: sanitizeAuthority(
        repositoryAuthority?.operations?.[operation],
        `repository operation '${operation}'`,
        findings,
      ),
      source: 'operation',
    };
  } else if (hasDefined(repositoryAuthority, 'default')) {
    repository = {
      value: sanitizeAuthority(
        repositoryAuthority?.default,
        'repository default',
        findings,
      ),
      source: 'default',
    };
  } else {
    repository = { value: 'read-only', source: 'built-in' };
  }

  const providerAuthority = input.provider?.authority;
  let provider: AuthorityResolutionTrace['provider'];
  let providerValue = repository.value;
  if (hasOperation(providerAuthority, operation)) {
    providerValue = sanitizeAuthority(
      providerAuthority?.operations?.[operation],
      `provider operation '${operation}'`,
      findings,
    );
    provider = { value: providerValue, source: 'operation' };
  } else if (hasDefined(providerAuthority, 'default')) {
    providerValue = sanitizeAuthority(
      providerAuthority?.default,
      'provider default',
      findings,
    );
    provider = { value: providerValue, source: 'default' };
  } else {
    provider = { value: null, source: 'inherit' };
  }

  const bindingAuthority = input.binding?.authority;
  const bindingDefault = hasDefined(bindingAuthority, 'default')
    ? sanitizeAuthority(bindingAuthority?.default, 'binding default', findings)
    : null;
  const bindingOperation = hasOperation(bindingAuthority, operation)
    ? sanitizeAuthority(
        bindingAuthority?.operations?.[operation],
        `binding operation '${operation}'`,
        findings,
      )
    : null;
  const value = [bindingDefault, bindingOperation]
    .filter(
      (candidate): candidate is OatPjmRemoteMutationAuthority =>
        candidate !== null,
    )
    .reduce(clampAuthority, providerValue);

  return {
    value,
    repository,
    provider,
    bindingDefault,
    bindingOperation,
  };
}

function resolveDescription(
  input: ResolveEffectiveRemotePolicyInput,
  findings: string[],
): EffectiveRemotePolicy['descriptionTrace'] {
  const repository = hasDefined(input.repository, 'description')
    ? sanitizeDescription(
        input.repository.description,
        'repository description',
        findings,
      )
    : 'none';
  const provider = hasDefined(input.provider, 'description')
    ? sanitizeDescription(
        input.provider?.description,
        'provider description',
        findings,
      )
    : null;
  const binding = hasDefined(input.binding, 'description')
    ? sanitizeDescription(
        input.binding?.description,
        'binding description',
        findings,
      )
    : null;
  const providerResult = provider ?? repository;
  const final = binding
    ? clampDescription(providerResult, binding)
    : providerResult;
  return { builtIn: 'none', repository, provider, binding, final };
}

function sanitizeAuthority(
  value: unknown,
  source: string,
  findings: string[],
): OatPjmRemoteMutationAuthority {
  if (AUTHORITIES.includes(value as OatPjmRemoteMutationAuthority)) {
    return value as OatPjmRemoteMutationAuthority;
  }
  findings.push(`Invalid ${source} value; using read-only.`);
  return 'read-only';
}

function sanitizeDescription(
  value: unknown,
  source: string,
  findings: string[],
): OatPjmRemoteDescriptionMode {
  if (DESCRIPTION_MODES.includes(value as OatPjmRemoteDescriptionMode)) {
    return value as OatPjmRemoteDescriptionMode;
  }
  findings.push(`Invalid ${source} value; using none.`);
  return 'none';
}

function clampAuthority(
  left: OatPjmRemoteMutationAuthority,
  right: OatPjmRemoteMutationAuthority,
): OatPjmRemoteMutationAuthority {
  return AUTHORITIES.indexOf(left) <= AUTHORITIES.indexOf(right) ? left : right;
}

function clampDescription(
  left: OatPjmRemoteDescriptionMode,
  right: OatPjmRemoteDescriptionMode,
): OatPjmRemoteDescriptionMode {
  return DESCRIPTION_MODES.indexOf(left) <= DESCRIPTION_MODES.indexOf(right)
    ? left
    : right;
}

function hasDefined(value: object | undefined, key: string): boolean {
  return (
    value !== undefined &&
    Object.hasOwn(value, key) &&
    value[key as never] !== undefined
  );
}

function hasOperation(
  authority: AuthorityLayerInput | undefined,
  operation: OatPjmRemoteOperationClass,
): boolean {
  return (
    authority?.operations !== undefined &&
    Object.hasOwn(authority.operations, operation)
  );
}
