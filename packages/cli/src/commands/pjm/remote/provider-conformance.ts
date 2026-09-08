import {
  contextsEqual,
  type ProviderAdapter,
  type SanitizedProviderObservation,
  type SemanticAction,
} from './provider';

export interface ProviderConformanceFixture {
  adapter: ProviderAdapter;
  observation: SanitizedProviderObservation;
  expected: {
    stableId: string;
    aliases: string[];
    verificationFields: string[];
  };
}

export function evaluateProviderConformance(
  fixture: ProviderConformanceFixture,
): string[] {
  const failures: string[] = [];
  const issue = fixture.adapter.normalize(fixture.observation);
  if (issue.provider !== fixture.adapter.provider)
    failures.push('provider-identity');
  if (issue.stableId !== fixture.expected.stableId)
    failures.push('stable-identity');
  if (
    JSON.stringify(issue.aliases) !== JSON.stringify(fixture.expected.aliases)
  ) {
    failures.push('aliases');
  }
  const action = fixture.adapter.plan('update', {
    stableId: issue.stableId,
    fields: { title: issue.title },
  });
  if (!contextsEqual(action.context, fixture.observation.context)) {
    failures.push('action-context');
  }
  const validation = fixture.adapter.validateObservation(
    action,
    fixture.observation,
  );
  if (!validation.valid)
    failures.push(
      ...validation.reasons.map((reason) => `observation:${reason}`),
    );
  if (
    JSON.stringify(fixture.adapter.verificationFields(action)) !==
    JSON.stringify(fixture.expected.verificationFields)
  ) {
    failures.push('verification-fields');
  }
  return failures;
}

export function validateSemanticObservation(
  action: SemanticAction,
  observation: SanitizedProviderObservation,
): string[] {
  const reasons: string[] = [];
  if (action.provider !== observation.provider)
    reasons.push('provider-mismatch');
  if (!contextsEqual(action.context, observation.context))
    reasons.push('context-mismatch');
  if (!observation.capabilityEvidenceDigest)
    reasons.push('capability-evidence-missing');
  return reasons;
}
