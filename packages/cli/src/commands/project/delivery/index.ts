import { Command } from 'commander';

import { createProjectDeliveryCheckCommand } from './check';
import { createProjectDeliveryRefreshCommand } from './refresh';
import { createProjectDeliveryWaiveCommand } from './waive';

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
  applyWaiverPlan,
  createProjectDeliveryWaiveCommand,
  planDeliveryWaiver,
  type WaiveRefusalCode,
} from './waive';
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
      'Observe goal delivery registry members, check delivery evidence freshness, and record operator freshness waivers',
    )
    .addCommand(createProjectDeliveryRefreshCommand())
    .addCommand(createProjectDeliveryCheckCommand())
    .addCommand(createProjectDeliveryWaiveCommand());
}
