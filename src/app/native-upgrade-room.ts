import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { observeUpgradeLayout, observeUpgradeEmpire } from './native-upgrade-layout';
import { runUpgradeUnit } from './native-upgrade-unit';
import { upgradeOwner } from '../features/work/upgrade-identity';
import { advanceUpgradeRotation } from '../features/work/upgrade-rotation-store';
import { defaultUpgradeRotation } from '../features/work/upgrade-rotation-model';
import { createUpgradeBoost } from '../features/work/upgrade-boost';
const boostedWork = (creep: Creep) => creep.body.filter(part => part.type === WORK && !!part.boost).length;
/** Owned specialist rooms opt in independently of ordinary worker execution. */
export function createNativeUpgradeRoom(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>): RoomFeature {
  return { id: 'upgrade-room', urgency: 'urgent', interval: 1, run({ room: view, config }) {
    if (!config.values.upgradeRoomEnabled) return;
    const room = Game.rooms[view.name];
    if (!room?.controller?.my) return;
    const roster = Object.values(Game.creeps).filter(creep => !creep.spawning
      && creep.memory.population?.home === room.name && creep.memory.population.owner === upgradeOwner(room.name));
    const layout = observeUpgradeLayout(room);
    if (!layout) return;
    const boosts = createUpgradeBoost(state, room.name);
    const settled = boosts.settled(Game.time, roster.map(creep => ({ id: creep.id, boosted: boostedWork(creep) })));
    const plan = advanceUpgradeRotation(state, room.name, { tick: Game.time, enabled: true, ...observeUpgradeEmpire(),
      members: roster.map(creep => ({ id: creep.id, ttl: creep.ticksToLive! })), settledBoosts: settled },
    { ...defaultUpgradeRotation, empireReserve: config.values.upgradeRoomEmpireReserve, perOtherRoomReserve: config.values.upgradeRoomOtherReserve });
    boosts.consume(settled);
    dispatch.activate();
    const synchronized = roster.every(creep => layout.stations.some(position => creep.pos.roomName === position.room && creep.pos.isEqualTo(position.x, position.y)));
    for (const slot of plan.state.slots) {
      const creep = roster.find(unit => unit.id === slot.unit)!;
      runUpgradeUnit(state, dispatch, creep, room.name, layout.stations[slot.slot]!, layout, synchronized);
      if (plan.renew === creep.id && creep.pos.isNearTo(layout.spawn)) dispatch.structures.renew(layout.spawn, creep, upgradeOwner(room.name));
      if (plan.boost === creep.id && creep.pos.isNearTo(layout.lab)) {
        boosts.issue(Game.time, { id: creep.id, boosted: boostedWork(creep) }, () => dispatch.structures.boost(layout.lab, creep, upgradeOwner(room.name)));
      }
    }
  } };
}
