import type { RuntimeConfig } from '../config/model';
import type { createNativeDispatch } from './native-dispatch';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export const upgradeClaimerOwner = (room: string) => 'upgrade-claimer:' + room;
export function upgradeClaimTarget(owner: string): string | undefined {
  const target = owner.startsWith('upgrade-claimer:') ? owner.slice(16) : '';
  return /^[WE]\d+[NS]\d+$/.test(target) ? target : undefined;
}
export function upgradeClaimers(target: string): Creep[] {
  return Object.values(Game.creeps).filter(creep => creep.memory.population?.home === target
    && creep.memory.population.owner === upgradeClaimerOwner(target)).sort((a, b) => a.name.localeCompare(b.name));
}
export function readyUpgradeClaimer(creep: Creep, controller: StructureController, minimumTtl: number): boolean {
  return !creep.spawning && creep.my && (creep.ticksToLive ?? 0) >= minimumTtl
    && creep.getActiveBodyparts(CLAIM) > 0 && creep.pos.isNearTo(controller);
}
export function moveUpgradeClaimer(dispatch: ReturnType<typeof createNativeDispatch>, creep: Creep, target: string): void {
  if (creep.spawning) return;
  const controller = Game.rooms[target]?.controller;
  dispatch.activate();
  dispatch.movement.move(creep, { owner: upgradeClaimerOwner(target),
    destination: controller ? movementPosition(controller.pos) : { room: target, x: 25, y: 25 }, range: controller ? 1 : 20,
    policy: { version: 'upgrade-claim', maximumRooms: 16, blockedRooms: [], costs: {} } });
}
export function travelUpgradeClaimers(room: string, dispatch: ReturnType<typeof createNativeDispatch>, config: (room: string) => Readonly<RuntimeConfig>): void {
  for (const creep of Object.values(Game.creeps).filter(unit => unit.room.name === room)) {
    const target = upgradeClaimTarget(creep.memory.population?.owner ?? '');
    if (target && target !== room && config(target).upgradeLifecycleEnabled) moveUpgradeClaimer(dispatch, creep, target);
  }
}
