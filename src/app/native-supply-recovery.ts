import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { stateKey } from '../persistence/state-key';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { upgradeSupplyTarget } from '../features/work/upgrade-supply-identity';
import { haulingOwner } from '../features/logistics/identity';
import { createNativeGroundDelivery } from './native-ground-delivery';
import { settleSupplyCycle } from './native-supply-settlement';
import { selectSupplyRefuge } from './native-supply-refuge';
declare global {
  interface CreepMemory { upgradeSupplyRecovery?: { owner: string; sponsor: string } }
}
/** Physical-room scheduling keeps orphaned couriers reachable after their sponsor is no longer owned. */
export function createNativeSupplyRecovery(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  config: (room: string) => Readonly<RuntimeConfig>): RoomFeature {
  const ground = createNativeGroundDelivery(state, dispatch);
  function recover(creep: Creep): void {
    const identity = recoveryIdentity(creep);
    if (!identity) return;
    dispatch.activate();
    if (settleSupplyCycle(state, creep, ground)) return;
    const refuge = selectSupplyRefuge(creep, config);
    if (!refuge) return;
    if (insideRefuge(creep, refuge.name)) {
      creep.memory.population = { home: refuge.name, owner: haulingOwner(refuge.name) };
      delete creep.memory.upgradeSupplyRecovery;
      return;
    }
    dispatch.movement.move(creep, { owner: identity.owner, destination: { room: refuge.name, x: 25, y: 25 }, range: 20,
      policy: { version: 'supply-recovery', maximumRooms: 16, blockedRooms: [], costs: {} } });
  }
  return { id: 'supply-recovery', scope: 'visible', urgency: 'urgent', interval: 1, run({ room }) {
    cancelLostSupplyQueue(state, room.name);
    for (const creep of Object.values(Game.creeps).filter(creep => creep.my && !creep.spawning && creep.room.name === room.name)) recover(creep);
  } };
}
function cancelLostSupplyQueue(state: StatePort, home: string): void {
  const controller = Game.rooms[home]?.controller;
  if (!controller || controller.my || state.read(stateKey('spawning', home)) === undefined) return;
  const queue = createSpawnQueue(state, home);
  for (const request of queue.list()) {
    if (upgradeSupplyTarget(request.owner, home)) queue.cancel(request.id, request.owner);
  }
}

function recoveryIdentity(creep: Creep): CreepMemory['population'] {
  const identity = creep.memory.population;
  if (!identity || !upgradeSupplyTarget(identity.owner, identity.home)) return undefined;
  const sponsor = Game.rooms[identity.home];
  if (sponsor?.controller && !sponsor.controller.my) creep.memory.upgradeSupplyRecovery = { owner: identity.owner, sponsor: identity.home };
  const recovery = creep.memory.upgradeSupplyRecovery;
  return recovery?.owner === identity.owner && recovery.sponsor === identity.home ? identity : undefined;
}
function insideRefuge(creep: Creep, room: string): boolean {
  return creep.room.name === room && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49;
}
