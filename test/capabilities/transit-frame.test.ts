import { pathTravelClock } from '../../src/adapters/screeps/path-travel-clock';
import { expect,test } from 'vitest';
import { createTransitPlan,initialTransitState } from '../../src/capabilities/movement/transit/plan';
import { advanceTransitFrame } from '../../src/capabilities/movement/transit/frame';
import type { TransitPlan } from '../../src/capabilities/movement/transit/model';
const p = (x: number,y = 25,room = 'W0N1') => ({ room,x,y });
const ports = { legal: () => true,terrain: () => 2 as const };
function plan(unit: string,origin: ReturnType<typeof p>,path: ReturnType<typeof p>[],priority = 0): TransitPlan {
  return createTransitPlan({ unit,owner: 'cohort',priority,origin,path,weight: 1,recovery: 2 });
}
test('shared destinations use runtime priority and stationary occupants remain blocking',() => {
  const plans = [plan('a',p(10),[p(11)],1),plan('b',p(12),[p(11)],2)];
  const first = advanceTransitFrame(plans,plans.map(item => initialTransitState(item,0)),0,[],ports);
  expect(first.states.map(item => item.index)).toEqual([0,1]);
  expect(first.resolution.denied).toEqual([{ unit: 'a',reason: 'destination-conflict' }]);
  const second = advanceTransitFrame(plans,first.states,1,[],ports);
  expect(second.states[0]!.index).toBe(0);
  expect(second.resolution.denied).toEqual([{ unit: 'a',reason: 'dependency-blocked' }]);
});
test('chains and swaps use the same batch solver rather than sequential position updates',() => {
  const plans = [plan('a',p(10),[p(11)]),plan('b',p(11),[p(10)])];
  const result = advanceTransitFrame(plans,plans.map(item => initialTransitState(item,0)),0,[],ports);
  expect(result.states.map(item => item.position.x)).toEqual([11,10]);
  expect(result.states.every(item => item.arrivedAt === 1)).toBe(true);
});
test('fatigue and service waits advance across JSON checkpoints without mutating inputs',() => {
  const plans = [createTransitPlan({ ...plan('a',p(10),[p(11),p(12)]),weight: 3,recovery: 2 })];
  const start = plans.map(item => initialTransitState(item,1));
  const waiting = advanceTransitFrame(plans,start,0,[],ports);
  expect(waiting.states[0]!.index).toBe(0);
  let states = advanceTransitFrame(plans,waiting.states,1,[],ports).states;
  expect(states[0]!.fatigue).toBe(4);
  states = JSON.parse(JSON.stringify(states));
  states = advanceTransitFrame(plans,states,2,[],ports).states;
  states = advanceTransitFrame(plans,states,3,[],ports).states;
  expect(states[0]!.fatigue).toBe(0);
  expect(advanceTransitFrame(plans,states,4,[],ports).states[0]!.arrivedAt).toBe(5);
  expect(start[0]!.index).toBe(0);
  expect(() => advanceTransitFrame(plans,states,5,[],ports)).toThrow('Nonconsecutive');
});
test('border transit protects local and landing tiles and clears entry fatigue',() => {
  const input = plan('a',p(48),[p(49),p(0,25,'E0N1'),p(1,25,'E0N1')]);
  const result = advanceTransitFrame([input],[initialTransitState(input,0)],0,[],{ ...ports,terrain: () => 10 });
  expect(result.states[0]).toMatchObject({ position: p(0,25,'E0N1'),index: 1,fatigue: 0 });
  expect(result.resolution.accepted[0]!.via).toEqual(p(49));
  const blocked = advanceTransitFrame([input],[initialTransitState(input,0)],0,[{ unit: 'other',position: p(49) }],ports);
  expect(blocked.resolution.denied[0]!.reason).toBe('dependency-blocked');
});
test('live legality can represent spawn exits and unknown route states refuse',() => {
  const input = plan('a',p(10),[p(11)]),state = initialTransitState(input,0);
  expect(advanceTransitFrame([input],[state],0,[],{ ...ports,legal: () => false }).resolution.denied[0]!.reason).toBe('invalid-step');
  expect(() => advanceTransitFrame([input],[{ ...state,position: p(20) }],0,[],ports)).toThrow('diverged');
  expect(() => plan('a',p(10),[p(20)])).toThrow('Disconnected');
});

test('uncontended frames preserve the previously qualified static native travel clock',() => {
  const paths = [[p(11),p(12),p(13)],[p(49),p(0,25,'E0N1'),p(1,25,'E0N1')]];
  for (const weight of [0,1,3]) for (const rate of [1,2,10] as const) for (const path of paths) {
    const origin = path[0]!.x === 49 ? p(48) : p(10);
    const input = createTransitPlan({ ...plan('a',origin,path),weight });
    const mobility = { mobile: true as const,weight,recovery: 2,roadCost: 1,plainCost: 1,swampCost: 1 };
    const expected = pathTravelClock(origin,path,mobility,() => rate);
    let states = [initialTransitState(input,0)];
    for (let tick = 0; tick < 100 && states[0]!.arrivedAt === undefined; tick++) {
      states = advanceTransitFrame([input],states,tick,[],{ ...ports,terrain: () => rate }).states;
    }
    expect(states[0]!.arrivedAt).toBe(expected);
  }
});

test('a restored arrival marker cannot bypass an unfinished route cursor',() => {
  const input = plan('a',p(10),[p(11)]),state = initialTransitState(input,0);
  expect(() => advanceTransitFrame([input],[{ ...state,arrivedAt: 0 }],0,[],ports)).toThrow('arrival/cursor');
});
