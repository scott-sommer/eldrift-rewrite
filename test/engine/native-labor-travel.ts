import { plannedMobility } from '../../src/adapters/screeps/travel-estimate';
import { quoteActionTravel } from '../../src/capabilities/movement/action-travel';
import type { HouseholdLaborState } from '../../src/capabilities/economy/startup/household/labor/model';
import type { BodyPart } from '../../src/capabilities/spawning/body';
import type { NativeLaborProof } from './native-labor-model';
export function nativeLaborTravelTicks(body: readonly BodyPart[], load: number): number {
  const quote = quoteActionTravel(plannedMobility(body,load),[2,2,2]);
  if (quote.status !== 'complete') throw new Error('Expected finite loaded route'); return quote.ticks;
}
/** Fixed admitted route isolates loaded fatigue; traffic/path re-quotation is a separate gate. */
export function moveNativeLabor(proof: NativeLaborProof, creep: Creep | undefined, tick: number, state: HouseholdLaborState, busy: boolean): void {
  if (!readyToMove(proof,creep,busy)) return;
  const path = route(state,tick);
  if (!path.length) return;
  const current = path.findIndex(([x,y]) => creep.pos.x === x && creep.pos.y === y), next = path[current+1];
  if (!next) return;
  const code = creep.move(creep.pos.getDirectionTo(next[0],next[1]));
  proof.calls.push({ tick: Game.time,action: 'move',code,energy: 0 });
  if (code !== OK) throw new Error('Native labor route move refused: '+code);
}

function readyToMove(proof: NativeLaborProof, creep: Creep | undefined, busy: boolean): creep is Creep {
  return proof.travel && !!creep && !creep.spawning && creep.fatigue === 0 && !busy;
}
function route(state: HouseholdLaborState, tick: number): readonly (readonly [number,number])[] {
  if (state.phase === 'working' && state.picked > 0 && tick < state.workAt!) return [[15,14],[16,14],[17,14]];
  if (state.phase === 'returning' && tick < state.returnAt!) return [[16,14],[15,14],[14,15]];
  return [];
}
