import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeRemoteMovement } from '../../src/app/remotes/native-movement';
import { createMovementPaths } from '../../src/adapters/screeps/movement-paths';
import { movementPosition } from '../../src/adapters/screeps/movement-traffic';
import { stepDirection } from '../../src/capabilities/movement/transition';
const state = createMemoryPort(() => Memory), dispatch = createNativeDispatch(state), paths = createMovementPaths();
const travel = createNativeRemoteMovement(state,dispatch,{ maximumRooms: 8,guard: () => true,
  policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 100,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) });
export function loop(): void {
  if (Game.time === 1) openState(state,'operator/config',operatorSchema);
  const miner = probe(Game.creeps['returning-miner']!), courier = probe(Game.creeps['returning-courier']!);
  dispatch.flush();
  const row = { tick: Game.time,...miner,courier,batch: dispatch.movement.flush() };
  const memory = Memory as Memory & { borderRows?: unknown[] }; (memory.borderRows ??= []).push(row);
}
function probe(creep: Creep) {
  const position = movementPosition(creep.pos), destination = { room: 'W0N1',x: 45,y: 25 };
  const view = { tick: Game.time,position,destination,range: 3,fatigue: creep.fatigue,allowPartial: false };
  const request = paths.prepare(creep,view,true,{ version: 'border-probe',allowedRooms: ['W0N1','E0N1'],blockedRooms: [],costs: {},maximumRooms: 8 });
  const path = paths.search(request), outcome = travel.retire(creep,'W0N1','border-return');
  return { position,cargo: creep.store.energy,pathStatus: path.status,path: 'path' in path ? path.path.slice(0,4) : [],
    direction: 'path' in path && path.path[0] ? stepDirection(position,path.path[0]) : null,outcome };
}
