import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import type { Position } from '../capabilities/movement/step';
import type { Outcome } from '../core/execution/model';
import { selectUpgradeSupplySource } from '../features/work/upgrade-supply-destination';
import { upgradeSupplyTarget } from '../features/work/upgrade-supply-identity';
import { haulingOwner } from '../features/logistics/identity';
import { observeUpgradeSupplyDestination } from './native-upgrade-supply-destination';
import { createNativeGroundDelivery } from './native-ground-delivery';
import { settleSupplyCycle } from './native-supply-settlement';
import { recoverSupplyCargo } from './native-supply-cargo';
import { executeSupplyTransfer } from './native-supply-transfer';
const policy = { version: 'upgrade-supply-cycle', blockedRooms: [], costs: {}, maximumRooms: 16 };
export interface NativeSupplyCyclePlan { home: string; target: string; anchor: Position; reserve: number; active: boolean; terminalFreeReserve?: number }
export function createNativeUpgradeSupplyCycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>) {
  const ground = createNativeGroundDelivery(state, dispatch);
  const blocked = (reason: string): Outcome => ({ status: 'blocked', reason, retryAt: Game.time + 1 });
  function move(creep: Creep, destination: Position, range = 1): Outcome {
    return dispatch.movement.move(creep, { owner: creep.memory.population!.owner, destination, range, policy });
  }
  function collect(creep: Creep, plan: NativeSupplyCyclePlan): Outcome {
    const room = Game.rooms[plan.home];
    if (!room?.controller?.my) return blocked('sponsor-unavailable');
    const selected = selectUpgradeSupplySource(room.storage && { id: room.storage.id, energy: room.storage.store.energy },
      room.terminal && { id: room.terminal.id, energy: room.terminal.store.energy });
    const source = selected && Game.getObjectById(selected.id as Id<StructureStorage | StructureTerminal>);
    if (!source?.my) return blocked('supply-source-unavailable');
    const available = Math.max(0, source.store.energy - plan.reserve);
    const amount = Math.min(available, creep.store.getFreeCapacity('energy'));
    return amount > 0 ? executeSupplyTransfer(state, dispatch, creep, source, 'withdraw', amount, available) : blocked('supply-reserve');
  }
  function deliver(creep: Creep, plan: NativeSupplyCyclePlan): Outcome {
    const room = Game.rooms[plan.target];
    if (!room) return move(creep, plan.anchor);
    const choice = observeUpgradeSupplyDestination(room, plan.anchor);
    if (choice.kind === 'hold') return returnCargo(creep, plan.home);
    const position = choice.kind === 'ground' ? choice.anchor : choice.endpoint.position;
    if (creep.pos.roomName !== position.room || creep.pos.getRangeTo(position.x, position.y) > 1) return move(creep, position);
    if (choice.kind === 'wait') return blocked('supply-destination-full');
    if (choice.kind === 'ground') {
      const result = ground.issue(creep, creep.memory.population!.owner, 'supply-drop:' + creep.id + ':' + Game.time, 'energy', creep.store.energy);
      return result.status === 'issued' ? { status: 'running' } : blocked('supply-drop-' + result.status);
    }
    const target = Game.getObjectById(choice.endpoint.id as Id<StructureStorage | StructureTerminal | Creep>);
    return target ? executeSupplyTransfer(state, dispatch, creep, target, 'transfer', Math.min(creep.store.energy, choice.endpoint.free), 0)
      : blocked('supply-destination-missing');
  }
  function returnCargo(creep: Creep, home: string): Outcome {
    const room = Game.rooms[home], storage = room?.storage;
    if (!room?.controller?.my || !storage?.my) return blocked('supply-return-unavailable');
    const maximum = Math.min(creep.store.energy, storage.store.getFreeCapacity('energy') ?? 0);
    return maximum > 0 ? executeSupplyTransfer(state, dispatch, creep, storage, 'transfer', maximum, 0) : blocked('supply-return-full');
  }
  function returnEmpty(creep: Creep, home: string): Outcome {
    if (creep.pos.roomName !== home || creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
      return move(creep, { room: home, x: 25, y: 25 }, 20);
    }
    if (Game.rooms[home]?.controller?.my) creep.memory.population!.owner = haulingOwner(home);
    return { status: 'done' };
  }
  return { run(creep: Creep, plan: NativeSupplyCyclePlan): Outcome {
    if (!eligibleSupplyUnit(creep, plan)) return blocked('supply-unit-mismatch');
    dispatch.activate();
    if (settleSupplyCycle(state, creep, ground)) return { status: 'running' };
    const cargo = recoverSupplyCargo(state, dispatch, creep, plan.home, plan.terminalFreeReserve ?? 0);
    if (cargo) return cargo;
    if (creep.store.energy > 0) return deliver(creep, plan);
    if (plan.active) return collect(creep, plan);
    return returnEmpty(creep, plan.home);
  } };
}

function eligibleSupplyUnit(creep: Creep, plan: NativeSupplyCyclePlan): boolean {
  const population = creep.memory.population;
  return creep.my && !creep.spawning && population?.home === plan.home
    && upgradeSupplyTarget(population.owner, plan.home) === plan.target;
}
