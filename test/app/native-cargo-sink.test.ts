import { afterEach, expect, test, vi } from 'vitest';
import { nativeCargoSink, nativeCargoSinks } from '../../src/app/native-cargo-recovery';

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const target = { id: 'store',structureType: 'storage',my: true,pos: { roomName: 'W0N1' },
    isActive: () => true,store: { getFreeCapacity: () => 100 } };
  const room = { name: 'W0N1',find: () => [target] } as unknown as Room;
  vi.stubGlobal('FIND_STRUCTURES',1);
  vi.stubGlobal('Game',{ getObjectById: (id: string) => id === target.id ? target : null });
  return { target,room };
}
test('selected endpoint follows current storage eligibility and matches ranked selection',() => {
  const f = fixture();
  expect(nativeCargoSink(f.room,'store','energy',0)).toBe(nativeCargoSinks(f.room,'energy',0)[0]);
  expect(nativeCargoSink(f.room,'missing','energy',0)).toBeUndefined();
  f.target.my = false; expect(nativeCargoSink(f.room,'store','energy',0)).toBeUndefined();
  f.target.my = true; f.target.isActive = () => false;
  expect(nativeCargoSink(f.room,'store','energy',0)).toBeUndefined();
  f.target.isActive = () => true; f.target.store.getFreeCapacity = () => 0;
  expect(nativeCargoSink(f.room,'store','energy',0)).toBeUndefined();
});
test('selected endpoint rejects other rooms and non-structure objects',() => {
  const f = fixture(); f.target.pos.roomName = 'E0N1';
  expect(nativeCargoSink(f.room,'store','energy',0)).toBeUndefined();
  vi.stubGlobal('Game',{ getObjectById: () => ({ id: 'unit',pos: { roomName: 'W0N1' },store: {} }) });
  expect(nativeCargoSink(f.room,'unit','energy',0)).toBeUndefined();
});
test('selected endpoint retains resource-specific consumer and container policies',() => {
  const f = fixture(); f.target.structureType = 'spawn';
  expect(nativeCargoSink(f.room,'store','H',50)).toBeUndefined();
  expect(nativeCargoSink(f.room,'store','energy',50)).toBe(f.target);
  f.target.structureType = 'container'; f.target.my = false;
  expect(nativeCargoSink(f.room,'store','H',50)).toBe(f.target);
  f.target.structureType = 'terminal'; f.target.my = true;
  expect(nativeCargoSink(f.room,'store','H',150)).toBe(f.target);
});
