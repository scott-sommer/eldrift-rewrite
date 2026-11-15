import { expect, test } from 'vitest';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import { validateStageAccess, accessRequirements } from '../../src/capabilities/planning/access-validation';
import { adjacentTiles } from '../../src/core/geometry/local-grid';
const assessment = assessRoom({
  terrain: Array(2500).fill('plain'), infrastructure: [], constraints: [],
  objects: [
    { id: 's', kind: 'source', position: { x: 10, y: 10 } },
    { id: 'c', kind: 'controller', position: { x: 40, y: 40 } },
    { id: 'm', kind: 'mineral', position: { x: 10, y: 40 } },
  ],
});
const blocks = (type: string) => !['road', 'container', 'rampart'].includes(type);
test('assessment produces work-range, service and directional exit requirements', () => {
  const requirements = accessRequirements(assessment, [{ type: 'spawn', position: { x: 25, y: 25 } }]);
  expect(requirements.find(item => item.id === 'source:s')?.positions).toHaveLength(8);
  expect(requirements.find(item => item.id === 'controller:c')?.positions).toHaveLength(48);
  expect(requirements.find(item => item.id === 'mineral:m')?.positions).toHaveLength(8);
  expect(requirements.find(item => item.id === 'spawn:25:25')?.positions).toHaveLength(8);
  expect(requirements.filter(item => item.id.startsWith('exit:'))).toHaveLength(4);
});
test('later structures cannot trap the spawn even if bootstrap access is valid', () => {
  const spawn = { type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 };
  const enclosure = adjacentTiles(spawn.position).map(position => ({ type: 'extension', position, rcl: 4 }));
  const results = validateStageAccess(assessment, [spawn, ...enclosure], blocks);
  expect(results.slice(0, 3).every(result => result.connected)).toBe(true);
  expect(results.slice(3).every(result => !result.connected && result.inaccessible.includes('spawn:25:25'))).toBe(true);
});
test('planned blockers around a source reject harvesting access while roads do not restore it', () => {
  const enclosure = adjacentTiles({ x: 10, y: 10 }).flatMap(position => [
    { type: 'lab', position, rcl: 6 }, { type: 'road', position, rcl: 4 },
  ]);
  const results = validateStageAccess(assessment, enclosure, blocks);
  expect(results[4]!.connected).toBe(true);
  expect(results[5]!.inaccessible).toContain('source:s');
});
