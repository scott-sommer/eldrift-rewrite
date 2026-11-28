import { afterEach,expect,test,vi } from 'vitest';
import { observePaidHomeSites } from '../../../src/app/remotes/startup/home-observation/construction';
afterEach(() => vi.unstubAllGlobals());

test('native sites use detached local birth aliases and distinguish unsupported structure recipes',() => {
  for (const [key,value] of Object.entries({ FIND_CONSTRUCTION_SITES: 4,STRUCTURE_CONTAINER: 'container',CONTAINER_CAPACITY: 2000,CONTAINER_HITS: 250000,CONTAINER_DECAY_TIME: 100,CONTAINER_DECAY_TIME_OWNED: 500,CONTAINER_DECAY: 5000 })) vi.stubGlobal(key,value);
  const sites = [{ id: 'native-site',structureType: 'container',pos: { roomName: 'W0N1',x: 10,y: 10 },progress: 4995,progressTotal: 5000 },{ id: 'road-site',structureType: 'road',pos: { roomName: 'W0N1',x: 11,y: 10 },progress: 0,progressTotal: 300 }];
  const room = { controller: { level: 3 },find: () => sites } as unknown as Room;
  const captured = observePaidHomeSites(room),birth = captured[0]!.completion!;
  expect(birth.store).toMatchObject({ energy: 0,capacity: 2000,active: true }); expect(birth.store.id).not.toBe(sites[0]!.id);
  expect(birth.container.decay).toEqual({ remaining: 100,interval: 499,amount: 5000 }); expect(captured[1]!.completion).toBeNull();
  sites[0]!.pos.x = 5; expect(captured[0]!.position.x).toBe(10);
});
