import type { StatePort } from '../../persistence/versioned-state';
import { openState, saveState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { upgradeRotationSchema } from './upgrade-rotation-schema';
import { planUpgradeRotation } from './upgrade-rotation';
import type { UpgradeRotationObservation, UpgradeRotationPolicy } from './upgrade-rotation-model';
/** Persist decisions before adapters issue renewal/boost commands. */
export function advanceUpgradeRotation(state: StatePort, room: string, observation: UpgradeRotationObservation, policy?: UpgradeRotationPolicy) {
  const key = stateKey('upgrade-room', room);
  const schema = upgradeRotationSchema(room);
  const previous = openState(state, key, schema);
  const plan = planUpgradeRotation(previous, observation, policy);
  saveState(state, key, schema, plan.state);
  return plan;
}
