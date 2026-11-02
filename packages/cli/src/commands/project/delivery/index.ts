import { Command } from 'commander';

import { createProjectDeliveryCheckCommand } from './check';
import { createProjectDeliveryRefreshCommand } from './refresh';

export {
  createProjectDeliveryCheckCommand,
  deliveryEffectiveScope,
  evaluateSubjectEvidence,
  loadGoalDeliveryProject,
} from './check';
export {
  applyObservationWrites,
  createProjectDeliveryRefreshCommand,
  endpointSatisfied,
  planDeliveryRefresh,
} from './refresh';
export {
  classifyPath,
  evaluateDeliveryReview,
  evaluateGateCarrier,
  evaluateSuccessor,
  type CarrierEvaluation,
  type CarrierExpectation,
  type EvidenceScope,
  type ReviewEvaluation,
  type SuccessorResult,
} from './evidence';

/** `oat project delivery`: the goal delivery registry's observation surface. */
export function createProjectDeliveryCommand(): Command {
  return new Command('delivery')
    .description(
      'Observe goal delivery registry members and check delivery evidence freshness',
    )
    .addCommand(createProjectDeliveryRefreshCommand())
    .addCommand(createProjectDeliveryCheckCommand());
}
