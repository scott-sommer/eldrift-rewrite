import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { upgradeLifecycleSchema } from './upgrade-lifecycle-model';
import type { UpgradeLifecycleView, UpgradeLifecyclePolicy, UpgradeControllerCommand } from './upgrade-lifecycle-model';
import { planUpgradeLifecycle } from './upgrade-lifecycle';
/** Record the decision before effects; reconstruction in the same tick cannot repeat a controller action. */
export function advanceUpgradeLifecycle(port: StatePort, room: string, view: UpgradeLifecycleView,
  policy: UpgradeLifecyclePolicy, invoke: (command: UpgradeControllerCommand) => void) {
  const key = stateKey('upgrade-lifecycle', room);
  const previous = openState(port, key, upgradeLifecycleSchema);
  const plan = planUpgradeLifecycle(previous, view, policy);
  saveState(port, key, upgradeLifecycleSchema, plan.state);
  if (plan.command) invoke(plan.command);
  return plan;
}
