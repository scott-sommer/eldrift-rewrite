import { afterEach, expect, test, vi } from 'vitest';
import { eligibleTransportSource, transportSources } from '../../../src/app/remotes/native-transport-sources';
afterEach(() => vi.unstubAllGlobals());
test('remote source selection admits nearby energy and containers, excluding other resources and distant objects', () => {
  vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('STRUCTURE_CONTAINER','container');
  vi.stubGlobal('FIND_STRUCTURES',1); vi.stubGlobal('FIND_DROPPED_RESOURCES',2);
  const pos = (x: number) => ({ roomName: 'E0N1',x,y: 10 });
  const container = { id: 'container',structureType: 'container',pos: pos(12),store: { energy: 20 } };
  const drop = { id: 'drop',resourceType: 'energy',pos: pos(13),amount: 50 };
  const mineral = { ...drop,id: 'mineral',resourceType: 'H' };
  const far = { ...drop,id: 'far',pos: pos(14) };
  const room = { find: (kind: number) => kind === 1 ? [container] : [drop,mineral,far] } as unknown as Room;
  expect(transportSources(room,{ room: 'E0N1',x: 10,y: 10 }).map(item => item.id)).toEqual(['drop','container']);
  expect(eligibleTransportSource(drop as Resource,{ room: 'W0N1',x: 10,y: 10 })).toBe(false);
});
