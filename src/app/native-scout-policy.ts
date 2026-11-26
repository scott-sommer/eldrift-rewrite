import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import { createIntelStore } from '../features/intel/store';
import { createScoutHistoryStore } from '../features/intel/scout-store';
import { scoutDangerRooms } from '../features/intel/scout-danger';
import type { IntelTraversalPolicy } from '../features/intel/traversal-model';
export function nativeScoutPolicy(state: StatePort, home: string, username: string, config: Readonly<RuntimeConfig>,
  avoids: Readonly<Record<string,number>> = {}): IntelTraversalPolicy {
  const danger = scoutDangerRooms(home,createScoutHistoryStore(state).read(),Game.time,
    { window: config.scoutDangerWindow, minimumLosses: config.scoutDangerLosses });
  const avoidUntil = { ...avoids };
  for (const room of danger) avoidUntil[room.room] = Math.max(avoidUntil[room.room] ?? 0,room.until);
  return { mode: 'exploration', username, allies: config.allies, blockedRooms: [], avoidUntil,
    allowKeeper: config.scoutAllowKeeper, maximumAge: config.intelMaximumAge, maximumRooms: config.scoutExplorationRooms,
    unknownCost: 8, staleCost: 4, keeperCost: 25 };
}
export function nativeScoutIntelPorts(state: StatePort) {
  const intel = createIntelStore(state);
  return { detachedReads: true as const,intel: (room: string) => intel.peek(room,Game.time).record,
    status: (room: string) => Game.map.getRoomStatus(room)?.status ?? 'unknown',
    exits: (room: string) => {
      const exits = Game.map.describeExits(room);
      return exits ? Object.values(exits) : undefined;
    } };
}
export function nativeScoutDepth(home: string, config: Readonly<RuntimeConfig>): number {
  const controller = Game.rooms[home]?.controller;
  if (!controller?.my) return config.scoutDepth;
  if (controller.level >= 4) return config.scoutExtendedDepth;
  const progressed = controller.level === 3 && controller.progressTotal > 0 && controller.progress/controller.progressTotal >= config.scoutExtendedProgress;
  return progressed ? config.scoutExtendedDepth : config.scoutDepth;
}
