import { cancelObsoleteUpgradeClaimers } from './native-upgrade-claim-demand';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { advanceUpgradeLifecycle } from '../features/work/upgrade-lifecycle-store';
import { observeUpgradeLifecycle } from './native-upgrade-lifecycle-observation';
import { reconcileRenewableFleet } from '../features/population/renewable-fleet';
import { observePopulation } from '../adapters/screeps/population';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { upgradeClaimerOwner, moveUpgradeClaimer, travelUpgradeClaimers } from './native-upgrade-claimer';
import { observeUpgradeParking } from './native-upgrade-parking';
type Configuration = (room: string) => Readonly<RuntimeConfig>;
export function createNativeUpgradeLifecycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: Configuration): RoomFeature {
  function runTarget(room: Room, settings: Readonly<RuntimeConfig>): void {
    if (!settings.upgradeLifecycleEnabled && state.read('upgrade-lifecycle/' + room.name) === undefined) return;
    const controller = room.controller;
    if (!controller) return;
    const { sponsor, units, claimer, view } = observeUpgradeLifecycle(state, room, settings);
    const plan = advanceUpgradeLifecycle(state, room.name, view,
    { enabled: settings.upgradeLifecycleEnabled, cycleAtRcl8: settings.upgradeCycleAtRcl8 }, command => {
      if (command.kind === 'unclaim') dispatch.controllers.unclaim(controller, upgradeClaimerOwner(room.name));
      else if (claimer) dispatch.controllers.claim(claimer, controller, upgradeClaimerOwner(room.name));
    });
    maintainClaimers(room.name, sponsor, plan.claimerTarget, view.sponsorReady);
    if (!settings.upgradeLifecycleEnabled) return;
    dispatch.activate();
    for (const unit of units.filter(unit => !unit.spawning && unit.room.name === room.name)) {
      if (controller.my && controller.level < 8) park(unit, room);
      else moveUpgradeClaimer(dispatch, unit, room.name);
    }
  }
  function maintainClaimers(target: string, sponsor: Room | undefined, desired: number, enabled: boolean): void {
    if (!sponsor?.controller?.my) return;
    const other = Object.values(Game.rooms).filter(room => room.controller?.my && room.name !== sponsor.name)
      .flatMap(room => state.read('spawning/' + room.name) === undefined ? [] : createSpawnQueue(state, room.name).list());
    reconcileRenewableFleet(state, { home: sponsor.name, target, desired, enabled, owner: upgradeClaimerOwner(target),
      maximum: 1, priority: 10, priorityStep: 0, body: ['claim', 'move'] }, observePopulation(), other, Game.time);
  }
  function park(creep: Creep, room: Room): void {
    const destination = observeUpgradeParking(room, [creep]).get(creep.id);
    if (destination) dispatch.movement.move(creep, { owner: upgradeClaimerOwner(room.name), destination, range: 0,
      policy: { version: 'upgrade-claimer-idle', maximumRooms: 1, blockedRooms: [], costs: {} } });
  }
  return { id: 'upgrade-lifecycle', scope: 'visible', urgency: 'urgent', interval: 1, run({ room, config: settings }) {
    cancelObsoleteUpgradeClaimers(state, room.name, config);
    travelUpgradeClaimers(room.name, dispatch, config);
    const target = Game.rooms[room.name];
    if (target) runTarget(target, settings.values);
  } };
}
