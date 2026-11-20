import { expect, test } from 'vitest';
import { planLabTransport } from '../../src/capabilities/industry/labs/transport';
import { assignReactionLabs, assignedReactionNetwork } from '../../src/capabilities/industry/labs/assignment';
import type { ReactionLab } from '../../src/capabilities/industry/labs/model';
const lab = (id: string,mineral: string | null,amount = 0): ReactionLab => ({ id,mineral,amount,x: 10,y: 10,free: 3000-amount,cooldown: 0,reactionAmount: 5 });
const assignment = { product: 'OH',reagents: ['H','O'] as const,inputs: ['h','o'] as const,outputs: ['out'],roster: ['h','o','out'] };
const stores = [{ id: 'storage',stock: { H: 50,O: 50 },free: 100 }];
const options = { needed: 15,inputReserve: 5,supplyReserve: 10,maximum: 20 };

test('dirty geometric assignments are possible, but incompatible input minerals cannot react',() => {
  const labs = [lab('h','X',10),lab('o','X',10),lab('out','X',10)];
  expect(assignReactionLabs(labs,'OH',['H','O'])).not.toBeNull();
  expect(assignedReactionNetwork(assignment,labs)).toBeNull();
  labs[0]!.mineral = 'H'; labs[1]!.mineral = 'O';
  expect(assignedReactionNetwork(assignment,labs)?.outputs).toEqual([]);
});

test('incompatible input stock drains before refill, and every output product is banked',() => {
  const labs = [lab('h','X',10),lab('o',null),lab('out','OH',5)];
  const result = planLabTransport(assignment,labs,stores,options);
  expect(result.map(item => [item.lab,item.transfer.direction,item.transfer.resource,item.transfer.quantity])).toEqual([
    ['h','drain','X',10],['o','refill','O',20],['out','drain','OH',5],
  ]);
  expect(labs[0]!.amount).toBe(10);
});

test('warehouse reserves, per-trip batch and target headroom constrain refill',() => {
  const labs = [lab('h','H',5),lab('o','O',20),lab('out',null)];
  expect(planLabTransport(assignment,labs,[{ id: 'storage',stock: { H: 13 },free: 100 }],options)[0]?.transfer.quantity).toBe(3);
  expect(planLabTransport(assignment,labs,stores,{ ...options,maximum: 4 })[0]?.transfer.quantity).toBe(4);
  expect(planLabTransport(assignment,labs,stores,{ ...options,needed: 0 })).toEqual([]);
});

test('full or absent banks do not fabricate a drain destination; reserved/unassigned labs are untouched',() => {
  const labs = [lab('h','H',20),lab('o','O',20),lab('out','OH',5),lab('boost','X',50)];
  expect(planLabTransport(assignment,labs,[],options)).toEqual([]);
  expect(planLabTransport(assignment,labs,[{ ...stores[0]!,free: 0 }],options)).toEqual([]);
  expect(planLabTransport(assignment,labs,stores,options).map(item => item.lab)).toEqual(['out']);
});
