import { describe, expect, it } from 'vitest';

import {
  getDispatchPolicyChoices,
  renderDispatchPolicyChoicesMarkdown,
} from './dispatch-policy-options';
import { VALID_MANAGED_DISPATCH_POLICIES } from './oat-config';

describe('dispatch policy option metadata', () => {
  it('includes every managed dispatch policy from the canonical enum', () => {
    const managedChoices = getDispatchPolicyChoices().filter(
      (choice) =>
        choice.kind === 'managed-capped' || choice.kind === 'managed-uncapped',
    );

    expect(managedChoices.map((choice) => choice.policy).sort()).toEqual(
      [...VALID_MANAGED_DISPATCH_POLICIES].sort(),
    );
    expect(managedChoices.map((choice) => choice.policy)).toContain('frontier');
  });

  it('describes uncapped, inherit, and unresolved by behavior', () => {
    const choices = getDispatchPolicyChoices();

    expect(choices.find((choice) => choice.value === 'uncapped')).toMatchObject(
      {
        kind: 'managed-uncapped',
        runtimePolicy: true,
        description: expect.stringContaining(
          'OAT still manages dispatch selection',
        ),
      },
    );
    expect(choices.find((choice) => choice.value === 'inherit')).toMatchObject({
      kind: 'inherit',
      runtimePolicy: true,
      description: expect.stringContaining(
        'OAT does not choose model or effort',
      ),
    });
    expect(
      choices.find((choice) => choice.value === 'leave-unresolved'),
    ).toMatchObject({
      kind: 'unresolved',
      runtimePolicy: false,
      description: expect.stringContaining(
        'Implementation preflight must block',
      ),
    });
  });

  it('renders markdown from canonical option data', () => {
    const markdown = renderDispatchPolicyChoicesMarkdown();

    expect(markdown).toContain('4. Frontier');
    expect(markdown).toContain('5. Uncapped');
    expect(markdown).toContain('6. Inherit Host Defaults');
    expect(markdown).toContain('7. Leave Unresolved');
    expect(markdown).toContain('not host default behavior');
    expect(markdown).toContain('planning/preflight deferral');
  });
});
