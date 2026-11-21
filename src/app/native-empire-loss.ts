import type { StatePort } from '../persistence/versioned-state';
import { reconcileLabServices, labServicesBusy } from '../features/industry/lab-services';
function lost(home: string): boolean {
  const room = Game.rooms[home]; return !!room?.controller && !room.controller.my;
}
/** Stop only unclaimed industry supply when a visible controller confirms ownership loss. */
export function maintainLostEmpireSupply(state: StatePort,homes: readonly string[]): void {
  for (const home of homes) if (lost(home)) reconcileLabServices(state,home,Game.time,[],0);
}
/** Existing native industry couriers retain their population home through admitted cargo and recovery. */
export function lostEmpireRoomSettled(state: StatePort,home: string): boolean {
  if (!lost(home)) return false;
  const survivors = Object.values(Game.creeps).some(creep => creep.my && creep.memory.population?.home === home);
  return !survivors && !labServicesBusy(state,home,Game.time);
}
