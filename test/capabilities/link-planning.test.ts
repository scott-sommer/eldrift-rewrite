import { expect, test } from 'vitest';
import { classifyLinks } from '../../src/features/logistics/links/roles';
import { planLinkTransfers } from '../../src/features/logistics/links/plan';
import { defaultLinkPolicy } from '../../src/features/logistics/links/model';
const position = (x: number, y = 10) => ({ room: 'home', x, y });
const link = (id: string, x: number, energy = 800) => ({ id, position: position(x), energy, capacity: 800, cooldown: 0, active: true });
test('roles are deterministic, exclusive and safe without storage or sources', () => {
  const links = [link('far-storage', 13), link('source', 30), link('storage', 11), link('controller', 20), link('relay', 40)];
  const room = { sources: [position(31)], storage: position(10), controller: position(21), storageEnergy: 100 };
  const roles = classifyLinks(links, room);
  expect(roles.inputs.map(item => item.id)).toEqual(['source']);
  expect(roles.storage?.id).toBe('storage');
  expect(roles.controllers.map(item => item.id)).toEqual(['controller']);
  expect(classifyLinks([...links].reverse(), room)).toEqual(roles);
  expect(classifyLinks([], { sources: [], storageEnergy: 0 })).toEqual({ inputs: [], controllers: [], relays: [] });
});
test('competing source links share destination capacity using rounded native losses', () => {
  const transfers = planLinkTransfers({ inputs: [link('a', 10), link('b', 11)], controllers: [], relays: [], storage: link('sink', 15, 0) }, 0, defaultLinkPolicy);
  expect(transfers).toEqual([
    { source: 'a', sink: 'sink', amount: 800, expectedReceived: 776 },

  ]);
});
test('controller demand can recruit storage while cooling inputs and self transfers are excluded', () => {
  const input = { ...link('input', 10), cooldown: 1 };
  const storage = link('storage', 15);
  const controller = link('controller', 20, 0);
  const roles = { inputs: [input], storage, controllers: [controller], relays: [] };
  expect(planLinkTransfers(roles, 100, defaultLinkPolicy)).toEqual([{ source: 'storage', sink: 'controller', amount: 800, expectedReceived: 776 }]);
  expect(planLinkTransfers(roles, 0, defaultLinkPolicy)).toEqual([]);
  expect(planLinkTransfers({ ...roles, inputs: [storage] }, 0, defaultLinkPolicy)).toEqual([]);
});
test('relay deficits precede storage fallback and saturated receivers produce no transfers', () => {
  const roles = { inputs: [link('input', 10)], storage: link('storage', 15, 0), controllers: [], relays: [link('relay', 30, 400)] };
  expect(planLinkTransfers(roles, 0, defaultLinkPolicy)[0]).toMatchObject({ sink: 'relay', amount: 400, expectedReceived: 388 });
  expect(planLinkTransfers({ ...roles, relays: [], storage: link('storage', 15, 800) }, 0, defaultLinkPolicy)).toEqual([]);
});
