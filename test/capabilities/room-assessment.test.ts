import { expect, test } from 'vitest';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
const position = (x: number, y = 10) => ({ x, y });
const input = (): AssessmentInput => ({ terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] });
test('objects expose separate adjacent access and controller work ranges without occupying their tiles', () => {
  const view = input();
  view.objects = [{ id: 'source', kind: 'source', position: position(10) },
    { id: 'controller', kind: 'controller', position: position(30, 30) }];
  const result = assessRoom(view);
  expect(result.access.find(item => item.id === 'source')?.work).toHaveLength(8);
  expect(result.access.find(item => item.id === 'controller')?.adjacent).toHaveLength(8);
  expect(result.access.find(item => item.id === 'controller')?.work).toHaveLength(48);
  expect(result.walkable[510]).toBe(false);
  expect(result.available[510]).toBe(false);
});
test('occupied and constrained tiles preserve movement distinctions and existing anchors', () => {
  const view = input();
  view.infrastructure = [
    { id: 'road', type: 'road', position: position(10), walkable: true, owned: false },
    { id: 'spawn', type: 'spawn', position: position(11), walkable: false, owned: true },
  ];
  view.constraints = [
    { id: 'access', kind: 'keep-clear', position: position(12) },
    { id: 'avoid', kind: 'blocked', position: position(13) },
    { id: 'reserved', kind: 'locked', type: 'tower', position: position(14) },
  ];
  const result = assessRoom(view);
  expect(result.walkable.slice(510, 515)).toEqual([true, false, true, false, true]);
  expect(result.available.slice(510, 515)).toEqual([false, false, false, false, false]);
  expect(result.anchors.map(item => item.id)).toEqual(['spawn']);
  result.anchors[0]!.position.x = 40;
  expect(view.infrastructure[1]!.position.x).toBe(11);
});
test('blocked work access and malformed constraints remain explicit', () => {
  const view = input();
  view.terrain = Array(2500).fill('wall');
  view.objects = [{ id: 'mineral', kind: 'mineral', position: position(20) }];
  expect(assessRoom(view).access[0]).toMatchObject({ adjacent: [], work: [] });
  view.constraints = [{ id: 'bad', kind: 'locked', position: position(2) }];
  expect(() => assessRoom(view)).toThrow('constraint');
  view.constraints = [];
  view.objects = [view.objects[0]!, view.objects[0]!];
  expect(() => assessRoom(view)).toThrow('Duplicate');
});
