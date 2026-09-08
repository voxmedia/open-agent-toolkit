import type { OatPjmRemoteOperationClass } from '@config/oat-config';

import type { RemoteBindingMetadata } from './schema';

export type BindingPurpose = RemoteBindingMetadata['purposes'][number];
export type SharedRemoteField = 'title' | 'description' | 'priority';
export type FieldDirection = 'inbound' | 'outbound';
export type CloseoutAnnotationPolicy = 'propose' | 'none';
export type CloseoutTransitionPolicy =
  | 'propose'
  | 'provider-automation'
  | 'none';

export interface PurposePolicy {
  fields: Record<SharedRemoteField, readonly FieldDirection[]>;
  lifecycle: readonly OatPjmRemoteOperationClass[];
  closeout: {
    annotation: CloseoutAnnotationPolicy;
    transition: CloseoutTransitionPolicy;
  };
}

export interface ComposedPurposePolicy {
  purposes: BindingPurpose[];
  fields: Record<SharedRemoteField, FieldDirection[]>;
  lifecycle: OatPjmRemoteOperationClass[];
  closeout: {
    annotation: CloseoutAnnotationPolicy;
    transition: CloseoutTransitionPolicy | 'choice-required';
  };
  choiceRequired: boolean;
  noOp: boolean;
}

const INBOUND = Object.freeze<FieldDirection[]>(['inbound']);
const BIDIRECTIONAL = Object.freeze<FieldDirection[]>(['inbound', 'outbound']);
const NO_DIRECTIONS = Object.freeze<FieldDirection[]>([]);
const CLOSEOUT_LIFECYCLE = Object.freeze<OatPjmRemoteOperationClass[]>([
  'annotate',
  'transition',
]);
const NO_LIFECYCLE = Object.freeze<OatPjmRemoteOperationClass[]>([]);

export const PURPOSE_POLICIES: Readonly<Record<BindingPurpose, PurposePolicy>> =
  Object.freeze({
    source: Object.freeze({
      fields: Object.freeze({
        title: INBOUND,
        description: INBOUND,
        priority: INBOUND,
      }),
      lifecycle: CLOSEOUT_LIFECYCLE,
      closeout: Object.freeze({
        annotation: 'propose' as const,
        transition: 'propose' as const,
      }),
    }),
    planning: Object.freeze({
      fields: Object.freeze({
        title: BIDIRECTIONAL,
        description: BIDIRECTIONAL,
        priority: BIDIRECTIONAL,
      }),
      lifecycle: CLOSEOUT_LIFECYCLE,
      closeout: Object.freeze({
        annotation: 'propose' as const,
        transition: 'propose' as const,
      }),
    }),
    delivery: Object.freeze({
      fields: Object.freeze({
        title: NO_DIRECTIONS,
        description: NO_DIRECTIONS,
        priority: NO_DIRECTIONS,
      }),
      lifecycle: NO_LIFECYCLE,
      closeout: Object.freeze({
        annotation: 'none' as const,
        transition: 'provider-automation' as const,
      }),
    }),
    reference: Object.freeze({
      fields: Object.freeze({
        title: NO_DIRECTIONS,
        description: NO_DIRECTIONS,
        priority: NO_DIRECTIONS,
      }),
      lifecycle: NO_LIFECYCLE,
      closeout: Object.freeze({
        annotation: 'none' as const,
        transition: 'none' as const,
      }),
    }),
  });

const SHARED_FIELDS: readonly SharedRemoteField[] = [
  'title',
  'description',
  'priority',
];
const OPERATION_ORDER: readonly OatPjmRemoteOperationClass[] = [
  'create',
  'update-fields',
  'annotate',
  'transition',
  'delete',
  'relink',
  'detach',
  'recreate',
];

export function composePurposePolicies(
  purposes: readonly BindingPurpose[],
): ComposedPurposePolicy {
  if (purposes.length === 0) {
    throw new Error('A binding must declare at least one purpose.');
  }

  const uniquePurposes = new Set<BindingPurpose>();
  for (const purpose of purposes) {
    if (!(purpose in PURPOSE_POLICIES)) {
      throw new Error(`Unknown purpose '${String(purpose)}'.`);
    }
    if (uniquePurposes.has(purpose)) {
      throw new Error('Binding purposes must be unique.');
    }
    uniquePurposes.add(purpose);
  }

  const policies = purposes.map((purpose) => PURPOSE_POLICIES[purpose]);
  const fields = Object.fromEntries(
    SHARED_FIELDS.map((field) => [
      field,
      intersectOrdered(
        policies.map((policy) => policy.fields[field]),
        ['inbound', 'outbound'],
      ),
    ]),
  ) as Record<SharedRemoteField, FieldDirection[]>;
  const lifecycle = intersectOrdered(
    policies.map((policy) => policy.lifecycle),
    OPERATION_ORDER,
  );
  const annotation = policies.every(
    (policy) => policy.closeout.annotation === 'propose',
  )
    ? 'propose'
    : 'none';
  const transitionValues = new Set(
    policies.map((policy) => policy.closeout.transition),
  );
  const nonNoneTransitions = new Set(
    [...transitionValues].filter((value) => value !== 'none'),
  );
  const transition = transitionValues.has('none')
    ? 'none'
    : nonNoneTransitions.size > 1
      ? 'choice-required'
      : ([...nonNoneTransitions][0] ?? 'none');
  const choiceRequired = transition === 'choice-required';
  const noOp =
    SHARED_FIELDS.every((field) => fields[field].length === 0) &&
    lifecycle.length === 0;

  return {
    purposes: [...purposes],
    fields,
    lifecycle,
    closeout: { annotation, transition },
    choiceRequired,
    noOp,
  };
}

function intersectOrdered<T>(
  values: readonly (readonly T[])[],
  order: readonly T[],
): T[] {
  return order.filter((candidate) =>
    values.every((value) => value.includes(candidate)),
  );
}
