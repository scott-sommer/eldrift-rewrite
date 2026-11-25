import { createNativeLaborTravel } from '../../src/app/remotes/startup/household/labor-travel';
import type { HouseholdLaborState } from '../../src/capabilities/economy/startup/household/labor/model';
import type { BodyPart } from '../../src/capabilities/spawning/body';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborRoute(proof: NativeLaborProof, body: readonly BodyPart[], spawn: StructureSpawn) {
  if (proof.travelQuote) return proof.travelQuote;
  const point = (x: number,y: number) => ({ room: spawn.room.name,x,y }), before = JSON.stringify(Memory.eldrift);
  const quote = createNativeLaborTravel(4000)({ home: spawn.room.name,body,kind: proof.kind,load: 10,remainingLoad: 8,workTicks: 2,
    spawn: { position: point(spawn.pos.x,spawn.pos.y),exit: point(14,15) },source: { position: point(13,15),pickup: point(14,15) },
    target: { position: point(20,14),service: point(17,14) } });
  if (quote.status !== 'complete') throw new Error('Expected native labor path quote: '+quote.reason);
  proof.routeReadOnly = before === JSON.stringify(Memory.eldrift); proof.travelQuote = quote; return quote;
}
/** Follow the admitted native path; traffic/path re-quotation is a separate gate. */
export function moveNativeLabor(proof: NativeLaborProof, creep: Creep | undefined, tick: number, state: HouseholdLaborState, busy: boolean): void {
  if (!readyToMove(proof,creep,busy)) return;
  const path = route(proof,state,tick);
  if (!path.length) return;
  const current = path.findIndex(point => creep.pos.x === point.x && creep.pos.y === point.y), next = path[current+1];
  if (!next) return;
  const code = creep.move(creep.pos.getDirectionTo(next.x,next.y));
  proof.calls.push({ tick: Game.time,action: 'move',code,energy: 0 });
  if (code !== OK) throw new Error('Native labor route move refused: '+code);
}

function readyToMove(proof: NativeLaborProof, creep: Creep | undefined, busy: boolean): creep is Creep {
  return proof.travel && !!creep && !creep.spawning && creep.fatigue === 0 && !busy;
}
function route(proof: NativeLaborProof, state: HouseholdLaborState, tick: number) {
  if (state.phase === 'working' && state.picked > 0 && tick < state.workAt!) return proof.travelQuote!.legs[1]!.path;
  if (state.phase === 'returning' && tick < state.returnAt!) return proof.travelQuote!.legs[2]!.path;
  return [];
}
