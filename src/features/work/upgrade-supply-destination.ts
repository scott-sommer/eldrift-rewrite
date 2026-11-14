import type { Position } from '../../capabilities/movement/step';
export interface SupplyEndpoint { id: string; position: Position; free: number }
export interface UpgradeSupplyDestinationView {
  owned: boolean; level: number; anchor: Position;
  terminal?: SupplyEndpoint; master?: SupplyEndpoint; storage?: SupplyEndpoint;
}
export type UpgradeSupplyDestination =
  | { kind: 'transfer'; endpoint: SupplyEndpoint }
  | { kind: 'wait'; endpoint: SupplyEndpoint }
  | { kind: 'ground'; anchor: Position }
  | { kind: 'hold'; reason: 'target-not-owned' };
/** Port of role.hauler.js: terminal at RCL6+, then master, then return storage/drop. */
export function selectUpgradeSupplyDestination(view: UpgradeSupplyDestinationView): UpgradeSupplyDestination {
  if (!view.owned) return { kind: 'hold', reason: 'target-not-owned' };
  if (view.level >= 6 && view.terminal) return deliveryOrWait(view.terminal);
  if (view.master) return deliveryOrWait(view.master);
  if (view.storage && view.storage.free > 0) return { kind: 'transfer', endpoint: view.storage };
  return { kind: 'ground', anchor: view.anchor };
}
function deliveryOrWait(endpoint: SupplyEndpoint): UpgradeSupplyDestination {
  return { kind: endpoint.free > 0 ? 'transfer' : 'wait', endpoint };
}
export interface UpgradeSupplySource { id: string; energy: number }
/** Legacy collection prefers terminal while sponsor storage is below 70000. */
export function selectUpgradeSupplySource(storage: UpgradeSupplySource | undefined,
  terminal: UpgradeSupplySource | undefined, terminalThreshold = 70000): UpgradeSupplySource | undefined {
  if (!Number.isSafeInteger(terminalThreshold) || terminalThreshold < 0) throw new Error('Invalid supply terminal threshold');
  if ((!storage || storage.energy < terminalThreshold) && terminal && terminal.energy > 0) return terminal;
  return storage && storage.energy > 0 ? storage : undefined;
}
