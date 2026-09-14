export const FLOW_FAILURE_STAGES = Object.freeze([
  'bundle',
  'authoring',
  'verify',
  'core',
  'interrupted',
]);

const FLOW_FAILURE_STAGE_SET = new Set(FLOW_FAILURE_STAGES);

export function isFlowFailureStage(value) {
  return FLOW_FAILURE_STAGE_SET.has(value);
}
