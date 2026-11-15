import { expect, test } from 'vitest';
import { resourceInfrastructure } from '../../src/capabilities/planning/resource-infrastructure';
import type { FixedObject } from '../../src/capabilities/planning/assessment-model';
const objects: FixedObject[] = [
  { id: 'c', kind: 'controller', position: { x: 40, y: 40 } },
  { id: 's1', kind: 'source', position: { x: 10, y: 10 } },
  { id: 's2', kind: 'source', position: { x: 12, y: 10 } },
  { id: 'm', kind: 'mineral', position: { x: 10, y: 40 } },
];
const input = { storage: { x: 25, y: 25 }, objects, reserved: [],
  available: (type: string, position: { x: number; y: number }) => type === 'extractor'
    || !objects.some(object => object.position.x === position.x && object.position.y === position.y),
  adjacentRoads: () => 0, open: () => true };
test('resource attachments share reservations and preserve legacy minimum levels and priorities', () => {
  const result = resourceInfrastructure(input);
  expect(result.missing).toEqual([]);
  expect(result.entries).toHaveLength(7);
  expect(new Set(result.entries.map(entry => JSON.stringify(entry.position))).size).toBe(7);
  expect(result.entries.filter(entry => entry.tag === 'controller')).toHaveLength(1);
  expect(result.entries.find(entry => entry.tag === 'controller')).toMatchObject({ type: 'link', minimumRcl: 5, priority: -375 });
  expect(result.entries.filter(entry => entry.tag === 'source' && entry.type === 'container')
    .every(entry => entry.minimumRcl === 3 && entry.priority === -398)).toBe(true);
  expect(resourceInfrastructure({ ...input, objects: [...objects].reverse() })).toEqual(result);
});
test('missing infrastructure is explicit and caller reservations remain unchanged', () => {
  const reserved = [{ x: 11, y: 11 }];
  const result = resourceInfrastructure({ ...input, reserved, available: () => false });
  expect(result.entries).toEqual([]);
  expect(result.missing).toEqual(['c:link', 's1:container', 's1:link', 's2:container', 's2:link', 'm:extractor', 'm:container']);
  expect(reserved).toEqual([{ x: 11, y: 11 }]);
});
