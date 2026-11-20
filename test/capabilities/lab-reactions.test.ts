import { expect, test } from 'vitest';
import { reactionReagents } from '../../src/capabilities/industry/labs/model';
import type { ReactionLab } from '../../src/capabilities/industry/labs/model';
import { selectReactionNetwork } from '../../src/capabilities/industry/labs/topology';
import { planLabReactions } from '../../src/capabilities/industry/labs/plan';
const lab = (id: string,mineral: string | null,x = 10,y = 10): ReactionLab => ({ id,mineral,x,y,amount: mineral ? 20 : 0,free: 3000,cooldown: 0,reactionAmount: 5 });
function fixture() { return [lab('h','H'),lab('o','O',12,10),lab('a',null,11,11),lab('b','OH',11,9)]; }

test('recipes come from injected constants, include intermediates, and unknown products are refused',() => {
  const table = { O: { H: 'OH' },H: { O: 'OH' },OH: { UH: 'UH2O' } };
  expect(reactionReagents(table,'OH')).toEqual(['H','O']); expect(reactionReagents(table,'UH2O')).toEqual(['OH','UH']);
  expect(reactionReagents(table,'X')).toBeNull();
});

test('network selection is deterministic across enumeration and never mutates the caller',() => {
  const labs = fixture(), expected = selectReactionNetwork(labs,['H','O'],'OH');
  expect(expected?.inputs.map(lab => lab.id)).toEqual(['h','o']); expect(expected?.outputs.map(lab => lab.id)).toEqual(['a','b']);
  expect(selectReactionNetwork([...labs].reverse(),['H','O'],'OH')).toEqual(expected); expect(labs.map(lab => lab.id)).toEqual(['h','o','a','b']);
});

test('geometry and incompatible output minerals cannot be treated as usable production',() => {
  expect(selectReactionNetwork([lab('h','H'),lab('o','O'),lab('far',null,13,10)],['H','O'],'OH')).toBeNull();
  expect(selectReactionNetwork([lab('h','H'),lab('o','O'),lab('wrong','X')],['H','O'],'OH')).toBeNull();
  expect(() => selectReactionNetwork([lab('same','H'),lab('same','O')],['H','O'],'OH')).toThrow('roster');
});

test('multiple outputs share finite reagent stock and policy reserves without overshooting the target',() => {
  const network = selectReactionNetwork(fixture(),['H','O'],'OH')!;
  expect(planLabReactions(network,'OH',100,15)).toHaveLength(1);
  expect(planLabReactions(network,'OH',9,0)).toHaveLength(1);
  expect(planLabReactions(network,'OH',4,0)).toEqual([]);
  expect(planLabReactions(network,'OH',100,20)).toEqual([]);
});

test('cooldown, fullness and operated output amounts each affect the admitted batch',() => {
  const labs = fixture(); labs[2]!.cooldown = 1; labs[3]!.free = 4;
  expect(planLabReactions(selectReactionNetwork(labs,['H','O'],'OH')!,'OH',100,0)).toEqual([]);
  labs[3]!.free = 3000; labs[3]!.reactionAmount = 7;
  expect(planLabReactions(selectReactionNetwork(labs,['H','O'],'OH')!,'OH',100,14)).toEqual([]);
  expect(planLabReactions(selectReactionNetwork(labs,['H','O'],'OH')!,'OH',100,13)[0]?.amount).toBe(7);
});
