import { expect, test } from 'vitest';
import { allocateBoostLabs, allocationRange } from '../../src/capabilities/industry/labs/boost-allocation';
import type { AllocationLab } from '../../src/capabilities/industry/labs/boost-allocation';
const request = { resource: 'XGH2O',mineral: 60,energy: 40 }, anchor = { x: 9,y: 9 };
const square = [{ id: 'near',x: 10,y: 10 },{ id: 'a',x: 11,y: 10 },{ id: 'b',x: 10,y: 11 },{ id: 'c',x: 11,y: 11 }];
test('role-only allocation chooses nearest labs and preserves request effect order without mutating its inputs',() => {
  const labs = [{ id: 'far',x: 20,y: 20 },...square], requests = [request,{ ...request,resource: 'ZO' }], before = JSON.stringify([labs,requests]);
  const plan = allocateBoostLabs(labs,requests,anchor,false)!;
  expect(plan.roles.map(role => [role.lab,role.resource])).toEqual([['near','XGH2O'],['a','ZO']]); expect(JSON.stringify([labs,requests])).toBe(before);
});
test('preserved reactions leave a valid two-input/output network and ties are stable across roster permutations',() => {
  const plan = allocateBoostLabs(square,[request],anchor,true)!;
  expect(plan.roles[0]!.lab).toBe('near'); expect(plan.inputs).toHaveLength(2); expect(plan.outputs).toHaveLength(1);
  expect(new Set([...plan.roles.map(role => role.lab),...plan.inputs,...plan.outputs]).size).toBe(4);
  for (const order of [square,[...square].reverse(),[square[2]!,square[0]!,square[3]!,square[1]!]]) expect(allocateBoostLabs(order,[request],anchor,true)).toEqual(plan);
});
test('irregular geometry uses an outlying boost lab to preserve more reaction outputs before optimizing travel',() => {
  const labs = [...square,{ id: 'outlier',x: 1,y: 1 }], plan = allocateBoostLabs(labs,[request],anchor,true)!;
  expect(plan.roles[0]!.lab).toBe('outlier'); expect(plan.outputs).toHaveLength(2);
});
test('insufficient compatible geometry refuses instead of dropping requested boosts or returning an unusable reaction pair',() => {
  expect(allocateBoostLabs(square,[request,request],anchor,true)).toBeNull();
  expect(allocateBoostLabs([{ id: 'a',x: 0,y: 0 },{ id: 'b',x: 10,y: 10 },{ id: 'c',x: 30,y: 30 },{ id: 'd',x: 49,y: 49 }],[request],anchor,true)).toBeNull();
  expect(allocateBoostLabs(square,[request,request,request,request],anchor,false)!.roles).toHaveLength(4);
  expect(allocateBoostLabs([],[],anchor,true)).toEqual({ roles: [],inputs: [],outputs: [],distance: 0 });
});
function oracle(labs: readonly AllocationLab[],count: number) {
  let score = { outputs: 0,distance: Infinity };
  for (let mask = 0; mask < 1<<labs.length; mask++) {
    const chosen = labs.filter((_,i) => mask & 1<<i); if (chosen.length !== count) continue;
    const other = labs.filter(lab => !chosen.includes(lab)), distance = chosen.reduce((sum,lab) => sum+allocationRange(lab,anchor),0);
    for (const a of other) for (const b of other) {
      if (a === b) continue;
      const outputs = other.filter(lab => lab !== a && lab !== b && allocationRange(lab,a) <= 2 && allocationRange(lab,b) <= 2).length;
      if (outputs > score.outputs || (outputs === score.outputs && outputs > 0 && distance < score.distance)) score = { outputs,distance };
    }
  }
  return score;
}
test('pair-based allocation agrees with an independent exhaustive role-subset oracle on mixed six-lab geometry',() => {
  const labs = [...square,{ id: 'outlier',x: 1,y: 1 },{ id: 'edge',x: 13,y: 11 }];
  for (const count of [1,2,3]) {
    const plan = allocateBoostLabs(labs,Array.from({ length: count },() => request),anchor,true)!;
    expect({ outputs: plan.outputs.length,distance: plan.distance }).toEqual(oracle(labs,count));
  }
});
test('malformed/unbounded rosters refuse before search',() => {
  expect(() => allocateBoostLabs([...square,square[0]!],[request],anchor,true)).toThrow('roster');
  expect(() => allocateBoostLabs([{ id: 'bad',x: NaN,y: 1 }],[request],anchor,false)).toThrow('roster');
  expect(() => allocateBoostLabs([],Array.from({ length: 11 },() => request),anchor,false)).toThrow('bounds');
});
