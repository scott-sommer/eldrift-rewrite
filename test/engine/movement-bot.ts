import { loop as botLoop } from '../../src/main';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
import { observeTransitCursor,requestTransitCursor } from '../../src/capabilities/movement/transit/observed';
import type { ObservedTransitCursor } from '../../src/capabilities/movement/transit/observed';
const movement = createMovementService();
const plan = createTransitPlan({ unit: 'fixture-request',order: 'walker',owner: 'walk',priority: 0,weight: 0,recovery: 2,origin: { room: 'W0N1',x: 20,y: 20 },path: [{ room: 'W0N1',x: 21,y: 20 }] });
export function loop() {
  botLoop();
  const memory = Memory as Memory & { movementCursor?: ObservedTransitCursor; movementPlanEvidence?: number[]; movementEvidence?: { outcomes: string[]; positions: number[][] } };
  memory.movementEvidence ??= { outcomes: [],positions: [] };
  const creep = Game.creeps.walker!,position = { room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y };
  memory.movementCursor ??= { index: 0,position,observedAt: Game.time,requestedAt: null };
  const cursor = observeTransitCursor(plan,memory.movementCursor,Game.time,position);
  const command = { owner: 'walk',destination: plan.path[0]!,range: 0,policy: { version: 'fixed',blockedRooms: [],costs: {},maximumRooms: 1 } };
  const result = movement.follow(creep,command,plan,cursor.index);
  const duplicate = movement.move(creep,command);
  if (duplicate.status !== 'blocked' || duplicate.reason !== 'movement-already-requested') throw new Error('Fixed path bypassed movement reservation');
  memory.movementCursor = result.status === 'running' ? requestTransitCursor(plan,cursor,Game.time) : cursor;
  (memory.movementPlanEvidence ??= []).push(cursor.index);
  movement.flush();
  memory.movementEvidence.outcomes.push(result.status); memory.movementEvidence.positions.push([creep.pos.x,creep.pos.y]);
}
