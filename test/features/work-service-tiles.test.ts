import { expect, test } from 'vitest';
import { selectWorkService } from '../../src/features/work/service-tiles';
const point = (x: number,y: number,room = 'W0N1') => ({ room,x,y });
test('pickup excludes the source and prefers a walkable tile nearest the spawn exit',() => {
  expect(selectWorkService(point(13,15),point(14,15),1,() => true)).toEqual(point(14,15));
  expect(selectWorkService(point(13,15),point(14,15),1,p => p.x < 13)).toEqual(point(12,14));
});
test('work service reuses the pickup when in action range and respects obstacles',() => {
  expect(selectWorkService(point(14,16),point(14,15),3,() => true)).toEqual(point(14,15));
  expect(selectWorkService(point(20,15),point(14,15),3,p => p.x !== 17)).toEqual(point(18,13));
});
test('exits, unseen-room origins and fully blocked service areas do not become stations',() => {
  expect(selectWorkService(point(0,0),point(0,1),1,() => true)).toEqual(point(1,1));
  expect(selectWorkService(point(20,20),point(1,1,'W1N1'),3,() => true)).toBeUndefined();
  expect(selectWorkService(point(20,20),point(1,1),3,() => false)).toBeUndefined();
});
