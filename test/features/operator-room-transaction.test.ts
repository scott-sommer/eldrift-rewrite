import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { editOperatorRooms } from '../../src/features/operator/room-transaction';
function fixture() {
  let memory = {}; const port = createMemoryPort(() => memory); let writes = 0;
  return { port,state: { read: port.read,write: (...args: Parameters<typeof port.write>) => { writes++; port.write(...args); } },raw: () => JSON.stringify(memory),writes: () => writes,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('multi-room edits commit once, preserve unrelated policy, detach nested input and replay without extra writes',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { empire: { workerUpgraderTarget: 2 },rooms: { W0N1: { override: { labReactionTarget: 10 } } } } });
  const edits = ['W0N1','W1N1'].map(home => ({ home,apply: (settings: { override?: unknown }) => ({ ...settings,override: { ...settings.override as object,labReactionTarget: 20 } }) }));
  expect(editOperatorRooms(f.state,edits,() => true)).toBe(true); expect(f.writes()).toBe(1); f.reset();
  expect(editOperatorRooms(f.state,edits,() => true)).toBe(false); expect(f.writes()).toBe(1);
  expect(f.port.read('operator/config')).toMatchObject({ data: { empire: { workerUpgraderTarget: 2 },rooms: { W0N1: { override: { labReactionTarget: 20 } },W1N1: { override: { labReactionTarget: 20 } } } } });
});
test('an invalid second room or lost ownership leaves all configuration unchanged with no partial write',() => {
  const f = fixture(), before = f.raw();
  const edits = [{ home: 'W0N1',apply: () => ({ override: { labReactionTarget: 20 } }) },{ home: 'W1N1',apply: () => ({ override: { labReactionTarget: -1 } }) }];
  expect(() => editOperatorRooms(f.state,edits,() => true)).toThrow('Invalid operator'); expect(f.raw()).toBe(before); expect(f.writes()).toBe(0);
  expect(() => editOperatorRooms(f.state,edits,home => home === 'W0N1')).toThrow('owned'); expect(f.raw()).toBe(before);
});
test('duplicate, unbounded and empty scopes are explicit; future state refuses unchanged',() => {
  const f = fixture(), edit = { home: 'W0N1',apply: () => ({}) };
  expect(() => editOperatorRooms(f.state,[edit,edit],() => true)).toThrow('bulk room');
  expect(() => editOperatorRooms(f.state,Array.from({ length: 51 },(_,i) => ({ ...edit,home: 'W'+i+'N1' })),() => true)).toThrow('bulk room');
  expect(editOperatorRooms(f.state,[],() => true)).toBe(false); expect(f.raw()).toBe('{}');
  f.port.write('operator/config',{ owner: 'operator',version: 2,data: {} }); const before = f.raw();
  expect(() => editOperatorRooms(f.state,[edit],() => true)).toThrow('future'); expect(f.raw()).toBe(before);
});
test('in-place editing of a detached nested setting cannot hide a change from transaction comparison',() => {
  const f = fixture(); f.port.write('operator/config',{ owner: 'operator',version: 1,data: { rooms: { W0N1: { override: { labReactionTarget: 10 } } } } });
  expect(editOperatorRooms(f.state,[{ home: 'W0N1',apply: settings => { (settings.override as { labReactionTarget: number }).labReactionTarget = 30; return settings; } }],() => true)).toBe(true);
  expect(f.port.read('operator/config')).toMatchObject({ data: { rooms: { W0N1: { override: { labReactionTarget: 30 } } } } });
});
