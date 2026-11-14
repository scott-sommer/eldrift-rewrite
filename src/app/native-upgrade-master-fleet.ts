import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { PopulationUnit } from '../capabilities/spawning/demand';
import type { SpawnRequest } from '../capabilities/spawning/request';
import type { BodyPart } from '../capabilities/spawning/body';
import { bodyPlan } from '../capabilities/spawning/body';
import { reconcileRenewableFleet } from '../features/population/renewable-fleet';
import { upgradeMasterOwner } from '../features/work/upgrade-identity';
import { observeUpgradeMasterLayout } from './native-upgrade-master-layout';
export function maintainUpgradeMasterFleet(state: StatePort, home: Room, target: string, config: Readonly<RuntimeConfig>,
  active: boolean, units: readonly PopulationUnit[], pending: readonly SpawnRequest[]): void {
  const room = Game.rooms[target];
  const enabled = active && config.upgradeMasterEnabled && config.upgradeMasterSpawningEnabled
    && config.upgradeRoomServiceEnabled && ready(room);
  const body = bodyPlan(['move', ...Array<BodyPart>(18).fill('carry')], home.energyCapacityAvailable)?.parts;
  reconcileRenewableFleet(state, { home: home.name, target, owner: upgradeMasterOwner(target), desired: 1, maximum: 1,
    priority: 10, priorityStep: 0, enabled, ...(body ? { body } : {}) }, units, pending, Game.time);
}
function ready(room: Room | undefined): boolean {
  return !!room?.controller?.my && room.controller.level < 8 && !!observeUpgradeMasterLayout(room);
}
