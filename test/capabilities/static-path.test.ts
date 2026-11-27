import { expect,test } from 'vitest';
import { validStaticPath } from '../../src/capabilities/movement/static-path';
const point = (room: string,x: number,y = 25) => ({ room,x,y });
test('static geometry accepts native exit plus landing representation and zero-step legs',() => {
  expect(validStaticPath(point('W0N1',48),[point('W0N1',49),point('E0N1',0),point('E0N1',1)],point('E0N1',1))).toBe(true);
  expect(validStaticPath(point('W0N1',48),[],point('W0N1',48))).toBe(true);
});
test('disconnected, malformed, excessive and wrong-arrival paths refuse',() => {
  expect(validStaticPath(point('W0N1',45),[point('W0N1',48)],point('W0N1',48))).toBe(false);
  expect(validStaticPath(point('W0N1',45),[point('W0N1',50)],point('W0N1',50))).toBe(false);
  expect(validStaticPath(point('W0N1',45),Array.from({ length: 2501 },() => point('W0N1',45)),point('W0N1',45))).toBe(false);
  expect(validStaticPath(point('W0N1',45),[point('W0N1',46)],point('W0N1',47))).toBe(false);
});
