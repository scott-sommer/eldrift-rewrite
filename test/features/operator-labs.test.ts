import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLabOperator } from '../../src/features/operator/labs';
import { operatorSchema } from '../../src/features/operator/state';
import { openState, saveState } from '../../src/persistence/versioned-state';
function fixture() {
  let memory = {}, tick = 1, owned = true;
  const state = createMemoryPort(() => memory), facts = [{ id: 'lab',active: true,mineral: 'H',amount: 10,energy: 20,cooldown: 0 }];
  const commands = () => createLabOperator(state,{ clock: () => tick,owns: () => owned,labs: () => facts,productSupported: product => ['OH','UH','UH2O'].includes(product),boostSupported: resource => ['GH2O','XGH2O','ZO'].includes(resource) });
  return { state,facts,commands,raw: () => JSON.stringify(memory),tick: (value: number) => { tick = value; },own: (value: boolean) => { owned = value; },reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('inspection and absent clears do not initialize namespaces; detached values cannot change effective policy',() => {
  const f = fixture(), commands = f.commands(); const report = commands.inspect('W0N1');
  expect(report.values.labReactionsEnabled).toBe(false); expect(report.assignment).toBeNull(); expect(report.production).toBeNull();
  report.labs[0]!.amount = 999; expect(f.facts[0]!.amount).toBe(10);
  commands.clearOverride('W0N1'); commands.clearTemporary('W0N1'); expect(f.raw()).toBe('{}');
});
test('room patch respects precedence and preserves profiles, other rooms, unrelated override keys and industry state',() => {
  const f = fixture(); openState(f.state,'operator/config',operatorSchema);
  saveState(f.state,'operator/config',operatorSchema,{ empire: { labReactionProduct: 'OH' },profiles: { industry: { labReactionTarget: 20 } },rooms: {
    W0N1: { profile: 'industry',override: { workerUpgraderTarget: 2 } },W1N1: { override: { labReactionTarget: 30 } } } });
  const other = { owner: 'industry',version: 1,data: { assignment: null } }; f.state.write('industry-labs/W0N1',other);
  const report = f.commands().configure('W0N1',{ labReactionProduct: 'UH',labReactionsEnabled: true });
  expect(report.values).toMatchObject({ labReactionProduct: 'UH',labReactionTarget: 20,labReactionsEnabled: true }); expect(report.sources.labReactionProduct).toBe('roomOverride');
  expect(f.commands().inspect('W1N1').values.labReactionTarget).toBe(30); expect(f.state.read('industry-labs/W0N1')).toEqual(other);
  f.commands().clearOverride('W0N1',['labReactionProduct']); expect(f.commands().inspect('W0N1').values.labReactionProduct).toBe('OH');
  expect(f.state.read('operator/config')).toMatchObject({ data: { rooms: { W0N1: { profile: 'industry',override: { workerUpgraderTarget: 2 } } } } });
});
test('invalid keys/products/lab ownership and unowned rooms refuse without partially writing configuration',() => {
  const f = fixture();
  for (const patch of [{ workerUpgraderTarget: 3 },{ labReactionProduct: 'madeup' },{ labReservedIds: ['foreign'] },{ labReactionTarget: -1 }]) {
    expect(() => f.commands().configure('W0N1',patch)).toThrow(); expect(f.raw()).toBe('{}');
  }
  f.own(false); expect(() => f.commands().configure('W0N1',{ labReactionsEnabled: false })).toThrow('owned'); expect(f.raw()).toBe('{}');
  expect(() => f.commands().inspect('../other')).toThrow('room name');
});
test('temporary policy expires at the boundary, survives reset and cannot extend an unrelated active override',() => {
  const f = fixture(); openState(f.state,'operator/config',operatorSchema);
  saveState(f.state,'operator/config',operatorSchema,{ rooms: { W0N1: { temporary: { expiresAt: 10,values: { workerUpgraderTarget: 0 } } } } });
  const before = f.raw(); expect(() => f.commands().temporary('W0N1',{ labReactionsEnabled: true },20)).toThrow('unrelated temporary expiry'); expect(f.raw()).toBe(before);
  f.commands().temporary('W0N1',{ labReactionsEnabled: true },10); f.reset();
  expect(f.commands().inspect('W0N1')).toMatchObject({ values: { labReactionsEnabled: true },sources: { labReactionsEnabled: 'temporary' },temporary: { active: true,expiresAt: 10 } });
  f.tick(10); expect(f.commands().inspect('W0N1')).toMatchObject({ values: { labReactionsEnabled: false },temporary: { active: false } });
  f.commands().temporary('W0N1',{ labReactionTarget: 25 },20);
  expect(f.state.read('operator/config')).toMatchObject({ data: { rooms: { W0N1: { temporary: { values: { labReactionTarget: 25 } } } } } });
  expect(JSON.stringify(f.state.read('operator/config'))).not.toContain('workerUpgraderTarget');
});
test('clearing a temporary lab patch preserves other active keys and its original lifetime; repeated commands are idempotent',() => {
  const f = fixture(); openState(f.state,'operator/config',operatorSchema);
  saveState(f.state,'operator/config',operatorSchema,{ rooms: { W0N1: { temporary: { expiresAt: 10,values: { workerUpgraderTarget: 2,labReactionTarget: 15 } } } } });
  f.commands().clearTemporary('W0N1'); expect(f.state.read('operator/config')).toMatchObject({ data: { rooms: { W0N1: { temporary: { expiresAt: 10,values: { workerUpgraderTarget: 2 } } } } } });
  const before = f.raw(); f.commands().clearTemporary('W0N1'); expect(f.raw()).toBe(before);
  f.commands().configure('W0N1',{ labReactionTarget: 25 }); const saved = f.raw(); f.commands().configure('W0N1',{ labReactionTarget: 25 }); expect(f.raw()).toBe(saved);
});
test('nested target input is copied; future or corrupt configuration refuses without destructive recovery',() => {
  const f = fixture(), targets = [{ product: 'UH2O',amount: 10,priority: 1 }];
  f.commands().configure('W0N1',{ labProductionTargets: targets,labReservedIds: ['lab'] }); targets[0]!.amount = 99;
  expect(f.commands().inspect('W0N1').values.labProductionTargets).toEqual([{ product: 'UH2O',amount: 10,priority: 1 }]);
  f.state.write('operator/config',{ owner: 'operator',version: 2,data: {} }); const before = f.raw();
  expect(() => f.commands().configure('W0N1',{ labReactionTarget: 1 })).toThrow('future'); expect(f.raw()).toBe(before);
});

test('unseen-room inspection retains observed assignments and production without erasing owned feature state',() => {
  const f = fixture(), assignment = { product: 'OH',reagents: ['H','O'],inputs: ['one','two'],outputs: ['three'],roster: ['one','two','three'] };
  f.state.write('industry-labs/W0N1',{ owner: 'industry',version: 1,data: { assignment } });
  f.state.write('industry-production/W0N1',{ owner: 'industry',version: 1,data: { context: 'configured',step: { root: 'UH2O',product: 'OH',reagents: ['H','O'],target: 10 } } });
  const before = f.raw(); f.own(false);
  expect(f.commands().inspect('W0N1')).toMatchObject({ owned: false,assignment,production: { product: 'OH',target: 10 } }); expect(f.raw()).toBe(before);
});

test('operator role bindings validate owned labs and actual boost compounds before any write',() => {
  const f = fixture();
  expect(() => f.commands().configure('W0N1',{ labBoostRoles: [{ lab: 'foreign',resource: 'GH2O',mineral: 30,energy: 20 }] })).toThrow('owned lab');
  expect(() => f.commands().configure('W0N1',{ labBoostRoles: [{ lab: 'lab',resource: 'OH',mineral: 30,energy: 20 }] })).toThrow('compound');
  expect(f.raw()).toBe('{}');
  expect(f.commands().configure('W0N1',{ labBoostRoles: [{ lab: 'lab',resource: 'GH2O',mineral: 30,energy: 20 }] }).values.labBoostRoles).toEqual([{ lab: 'lab',resource: 'GH2O',mineral: 30,energy: 20 }]);
});
