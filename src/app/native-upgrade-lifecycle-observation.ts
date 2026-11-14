import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { UpgradeLifecycleView } from '../features/work/upgrade-lifecycle-model';
import { refreshUpgradeFleetGate } from '../features/work/upgrade-fleet-gate';
import { observeUpgradeEmpire } from './native-upgrade-layout';
import { upgradeClaimers, readyUpgradeClaimer } from './native-upgrade-claimer';
export function observeUpgradeLifecycle(state: StatePort, room: Room, settings: Readonly<RuntimeConfig>) {
  const controller = room.controller!;
  const sponsor = Game.rooms[settings.upgradeRoomSponsor || room.name];
  const units = upgradeClaimers(room.name);
  const minimumTtl = controller.my && controller.level === 8 ? settings.upgradeClaimerMinimumTtl : 1;
  const claimer = units.find(unit => readyUpgradeClaimer(unit, controller, minimumTtl)) ?? units.find(unit => !unit.spawning);
  const empire = observeUpgradeEmpire();
  const view: UpgradeLifecycleView = { tick: Game.time, controller: controllerView(controller),
    ...(claimer ? { claimer: { id: claimer.id, ready: readyUpgradeClaimer(claimer, controller, minimumTtl) } } : {}),
    freeGcl: Game.gcl.level > empire.ownedRooms, sponsorReady: readySponsor(sponsor),
    fleetActive: refreshUpgradeFleetGate(state, room.name, empire.empireEnergy, settings.upgradeFleetStartEnergy, settings.upgradeFleetStopEnergy) };
  return { sponsor, units, claimer, view };
}
function readySponsor(sponsor: Room | undefined): boolean {
  return !!sponsor?.controller?.my && sponsor.energyCapacityAvailable >= 650
    && Object.values(Game.spawns).some(spawn => spawn.room.name === sponsor.name);
}
function controllerView(controller: StructureController): NonNullable<UpgradeLifecycleView['controller']> {
  const username = Object.values(Game.creeps)[0]?.owner.username ?? Object.values(Game.spawns)[0]?.owner.username;
  return { id: controller.id, ownership: controller.my ? 'own' : controller.owner ? 'foreign' : 'neutral',
    level: controller.level, reservedByOther: !!controller.reservation && controller.reservation.username !== username };
}
