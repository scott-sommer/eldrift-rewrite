import { expect, test } from 'vitest';
import { chooseWorkerSource } from '../../src/features/work/source-assignment';
const a = { id: 'a', position: { room: 'W0N1', x: 10, y: 10 } };
const b = { id: 'b', position: { room: 'W0N1', x: 20, y: 20 } };
test('automatic assignments balance live consumers with stable ties and full room identity', () => {
  expect(chooseWorkerSource([b, a], [])?.source).toBe('a');
  expect(chooseWorkerSource([b, a], [{ source: 'a', position: a.position }])?.source).toBe('b');
  expect(chooseWorkerSource([b, a], [{ source: 'a', position: { ...a.position, room: 'E0N1' } }])?.source).toBe('a');
  expect(chooseWorkerSource([], [])).toBeUndefined();
});
