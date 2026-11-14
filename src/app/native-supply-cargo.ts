import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import type { Outcome } from '../core/execution/model';
import { nativeCargoSinks } from './native-cargo-recovery';
import { executeSupplyTransfer } from './native-supply-transfer';
/** Share destination policy and the supply journal; a second task queue must not settle these intents. */
export function recoverSupplyCargo(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  creep: Creep, home: string, terminalReserve: number): Outcome | undefined {
  const resource = (Object.keys(creep.store) as ResourceConstant[]).sort()
    .find(type => type !== 'energy' && creep.store.getUsedCapacity(type) > 0);
  if (!resource) return undefined;
  const room = Game.rooms[home];
  if (!room?.controller?.my) return blocked('supply-cargo-home-unavailable');
  const sink = nativeCargoSinks(room, resource, terminalReserve).find(isCargoStore);
  if (!sink) return blocked('supply-cargo-destination-full');
  const amount = Math.min(creep.store.getUsedCapacity(resource), sink.store.getFreeCapacity(resource) ?? 0);
  return executeSupplyTransfer(state, dispatch, creep, sink, 'transfer', amount, 0, resource);
}
function isCargoStore(structure: AnyStructure): structure is StructureStorage | StructureTerminal | StructureContainer {
  return structure.structureType === 'storage' || structure.structureType === 'terminal' || structure.structureType === 'container';
}
function blocked(reason: string): Outcome {
  return { status: 'blocked', reason, retryAt: Game.time + 1 };
}
