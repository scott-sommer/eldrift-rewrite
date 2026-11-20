import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { boostLabRoles, boostRoleAllows, boostRoleLabIds, reconcileBoostLabRoles } from '../../src/features/industry/boost-labs/store';
const role = { lab: 'lab',resource: 'GH2O',mineral: 60,energy: 40 };
function fixture() { let memory = {}; const state = createMemoryPort(() => memory); return { state,reset: () => { memory = JSON.parse(JSON.stringify(memory)); },raw: () => JSON.stringify(memory) }; }
test('role changes and removals wait for admitted work without exposing retiring labs to reactions or new incompatible boosts',() => {
  const f = fixture(); expect(boostLabRoles(f.state,'W0N1')).toEqual([]); expect(f.raw()).toBe('{}');
  reconcileBoostLabRoles(f.state,'W0N1',[role],() => false); f.reset(); const next = { ...role,resource: 'ZO' };
  expect(reconcileBoostLabRoles(f.state,'W0N1',[next],() => true)).toEqual([role]);
  expect(boostRoleAllows([role],[next],'lab','GH2O')).toBe(false); expect(boostRoleAllows([role],[next],'lab','ZO')).toBe(false);
  expect(boostRoleLabIds(f.state,'W0N1',[])).toEqual(['lab']); expect(reconcileBoostLabRoles(f.state,'W0N1',[],() => true)).toEqual([role]);
  expect(reconcileBoostLabRoles(f.state,'W0N1',[next],() => false)).toEqual([next]);
  expect(reconcileBoostLabRoles(f.state,'W0N1',[],() => false)).toEqual([]);
});
test('declared roles constrain only their lab and the bounded handoff does not drop ten retiring identities',() => {
  const f = fixture(), old = Array.from({ length: 10 },(_,i) => ({ ...role,lab: 'old'+i })), next = old.map((item,i) => ({ ...item,lab: 'new'+i }));
  reconcileBoostLabRoles(f.state,'W0N1',old,() => false); expect(reconcileBoostLabRoles(f.state,'W0N1',next,() => true)).toEqual(old);
  expect(boostRoleLabIds(f.state,'W0N1',next)).toHaveLength(20);
  expect(reconcileBoostLabRoles(f.state,'W0N1',next,() => false)).toEqual(next);
  expect(boostRoleAllows([],next,'new0','GH2O')).toBe(true); expect(boostRoleAllows([],next,'new0','ZO')).toBe(false); expect(boostRoleAllows([],next,'free','ZO')).toBe(true);
});
test('future role state refuses without overwriting it',() => {
  const f = fixture(); f.state.write('industry-boost-labs/W0N1',{ owner: 'industry',version: 2,data: { roles: [] } }); const before = f.raw();
  expect(() => reconcileBoostLabRoles(f.state,'W0N1',[role],() => false)).toThrow('future'); expect(f.raw()).toBe(before);
});
