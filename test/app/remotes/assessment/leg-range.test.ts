import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { measureRemoteLeg } from '../../../../src/app/remotes/assessment/travel';
import type { RemoteLegRequest } from '../../../../src/app/remotes/assessment/travel';
import type { createMatrixSnapshots } from '../../../../src/adapters/screeps/matrix-snapshots';
const controls = vi.hoisted(() => ({ searches: [] as { range: number; blockedCost: number }[] }));
vi.mock('../../../../src/adapters/screeps/travel-estimate',() => ({ plannedMobility: () => ({ mobile: true,roadCost: 1,plainCost: 1,swampCost: 5 }) }));
vi.mock('../../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: () => ({ version: 'topology',matrix: () => {
  const values = new Map<string,number>(); return { set: (x: number,y: number,cost: number) => values.set(x+':'+y,cost),get: (x: number,y: number) => values.get(x+':'+y) ?? 0 };
} }) }));
vi.mock('../../../../src/adapters/screeps/path-search',() => ({ createNativePathSearch: (matrix: (room: string) => { get(x: number,y: number): number }) => (request: { range: number; destination: RemoteLegRequest['destination'] }) => {
  controls.searches.push({ range: request.range,blockedCost: matrix('E0N1').get(5,24) });
  return { status: 'complete',path: [request.destination],cost: 12,operations: 30 };
} }));
beforeEach(() => { controls.searches.length = 0; });
afterEach(() => vi.clearAllMocks());
function measure(leg: Partial<RemoteLegRequest>) {
  const request: RemoteLegRequest = { origin: { room: 'W0N1',x: 46,y: 25 },destination: { room: 'E0N1',x: 4,y: 24 },body: ['carry','move'],load: 0,...leg };
  return measureRemoteLeg({ intel: vi.fn() },request,['W0N1','E0N1'],4000,{} as ReturnType<typeof createMatrixSnapshots>,() => true);
}
test('existing source/controller legs retain range1 while a startup service tile requests exact range0',() => {
  expect(measure({}).status).toBe('complete'); expect(measure({ range: 0 }).status).toBe('complete');
  expect(controls.searches.map(search => search.range)).toEqual([1,0]);
});
test('a persistent station exclusion reaches native search matrices and cannot leak into a later leg',() => {
  measure({ range: 0,blocked: [{ room: 'E0N1',x: 5,y: 24 }] }); measure({ range: 0 });
  expect(controls.searches.map(search => search.blockedCost)).toEqual([255,0]);
});
test('invalid or unbounded exclusion lists fail before native path search',() => {
  expect(() => measure({ blocked: [{ room: 'E0N1',x: 50,y: 24 }] })).toThrow('exclusions');
  expect(() => measure({ blocked: Array.from({ length: 65 },() => ({ room: 'E0N1',x: 5,y: 24 })) })).toThrow('exclusions');
  expect(controls.searches).toEqual([]);
});
