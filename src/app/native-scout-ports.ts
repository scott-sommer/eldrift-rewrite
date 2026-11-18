import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { Outcome } from '../core/execution/model';
import type { ScoutControlPorts } from '../features/intel/scout-control-model';
import type { createNativeDispatch } from './native-dispatch';
import { createScoutControlStore } from '../features/intel/scout-control-store';
import { createIntelStore } from '../features/intel/store';
import { observeNativeIntel } from './native-intel-observation';
import { traversalThreat } from '../features/intel/traversal-threats';
import { threatAvoidance } from '../capabilities/movement/avoidance';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { createIntelTraversal } from '../features/intel/traversal';
import { nativeScoutPlan } from './native-scout-plan';
import { nativeScoutRoute } from './native-scout-route';
import { nativeScoutIntelPorts, nativeScoutPolicy } from './native-scout-policy';
import { nativeScoutStabilization } from './native-scout-position';
export interface ScoutDispatch {
  activate(): void;
  movement: Pick<ReturnType<typeof createNativeDispatch>['movement'],'move'>;
}
export function nativeScoutPorts(state: StatePort, dispatch: Pick<ScoutDispatch,'movement'>, creep: Creep,
  home: string, config: Readonly<RuntimeConfig>, planningGuard: () => boolean): { ports: ScoutControlPorts; dangerous: boolean } {
  const store = createIntelStore(state), summary = observeNativeIntel(creep.pos.roomName);
  if (!summary) throw new Error('Owned scout room is not visible');
  store.observeSummary(summary);
  const friendly = new Set([creep.owner.username,...config.allies]);
  const threats = summary.units.filter(unit => !unit.owned && !friendly.has(unit.owner))
    .map(unit => ({ room: summary.room, x: unit.x, y: unit.y }));
  const avoid = threatAvoidance(threats,config.scoutThreatRange,movementPosition(creep.pos));
  const dangerous = traversalThreat(store.peek(summary.room,Game.time).record,friendly) !== undefined;
  return { dangerous, ports: {
    capture: visited => store.observeSummary(summary,visited),
    failure: (room,reason) => store.recordFailure(room,{ id: `scout-route:${creep.id}:${Game.time}`, tick: Game.time, reason }),
    next: control => {
      const assigned = createScoutControlStore(state).read().units.filter(unit => unit.id !== creep.id && unit.objective)
        .map(unit => unit.objective!);
      return nativeScoutPlan(state,home,creep.owner.username,config,assigned,control.avoidUntil,planningGuard).targets[0]?.room;
    },
    escape: (avoids,cursor) => escapeRoom(state,creep,home,config,avoids,cursor),
    stabilize: cursor => {
      const destination = nativeScoutStabilization(creep,avoid,cursor);
      if (!destination) return { status: 'failed', reason: 'no-stabilization-tile' };
      return dispatch.movement.move(creep,{ owner: `scout:${creep.id}`, destination, range: 0, avoid,
        policy: { version: 'scout-local', maximumRooms: 1, blockedRooms: [], costs: {}, allowedRooms: [creep.pos.roomName] } });
    },
    travel: (room,avoids): Outcome => {
      const policy = nativeScoutRoute(state,creep,home,room,config,avoids);
      if (!('version' in policy)) return policy;
      return dispatch.movement.move(creep,{ owner: `scout:${creep.id}`, destination: { room, x: 25, y: 25 }, range: 23, policy, avoid });
    },
  } };
}
function escapeRoom(state: StatePort, creep: Creep, home: string, config: Readonly<RuntimeConfig>, avoids: Readonly<Record<string,number>>, cursor: number) {
  const ports = nativeScoutIntelPorts(state), traversal = createIntelTraversal(ports,nativeScoutPolicy(state,home,creep.owner.username,config,avoids),Game.time);
  const rooms = (ports.exits(creep.pos.roomName) ?? []).filter(traversal.allows)
    .sort((a,b) => traversal.cost(a)-traversal.cost(b) || a.localeCompare(b));
  return rooms.length ? rooms[cursor%rooms.length] : undefined;
}
