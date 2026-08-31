export type AssociatedIssueRef =
  | { kind: 'legacy-scalar'; ref: string }
  | {
      kind: 'reference';
      type: string;
      ref: string;
      bindingId?: string;
    }
  | { kind: 'preserved'; value: unknown };

export type SerializedAssociatedIssue =
  | string
  | { type: string; ref: string; binding?: string }
  | unknown;

export function parseAssociatedIssues(value: unknown): AssociatedIssueRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') {
      return { kind: 'legacy-scalar', ref: entry };
    }
    if (
      isRecord(entry) &&
      typeof entry.type === 'string' &&
      entry.type.length > 0 &&
      typeof entry.ref === 'string' &&
      entry.ref.length > 0 &&
      (entry.binding === undefined ||
        (typeof entry.binding === 'string' && entry.binding.length > 0))
    ) {
      return {
        kind: 'reference',
        type: entry.type,
        ref: entry.ref,
        ...(typeof entry.binding === 'string'
          ? { bindingId: entry.binding }
          : {}),
      };
    }
    return { kind: 'preserved', value: entry };
  });
}

export function serializeAssociatedIssues(
  refs: readonly AssociatedIssueRef[],
): SerializedAssociatedIssue[] {
  return refs.map((ref) => {
    if (ref.kind === 'legacy-scalar') return ref.ref;
    if (ref.kind === 'preserved') return ref.value;
    return {
      type: ref.type,
      ref: ref.ref,
      ...(ref.bindingId ? { binding: ref.bindingId } : {}),
    };
  });
}

export function findDanglingAssociatedIssueBindings(
  refs: readonly AssociatedIssueRef[],
  knownBindingIds: ReadonlySet<string>,
): string[] {
  return [
    ...new Set(
      refs.flatMap((ref) =>
        ref.kind === 'reference' &&
        ref.bindingId &&
        !knownBindingIds.has(ref.bindingId)
          ? [ref.bindingId]
          : [],
      ),
    ),
  ];
}

export function isAssociationAuthorizing(_ref: AssociatedIssueRef): false {
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
