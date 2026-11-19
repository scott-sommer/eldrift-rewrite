import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createResumableRemoteTravel } from '../../../src/app/remotes/management/travel';
import { measureRemoteLeg } from '../../../src/app/remotes/assessment/travel';
import { prepareRemoteMatrices } from '../../../src/app/remotes/assessment/matrices';
import type { RemoteEstimateContext } from '../../../src/features/remotes/assessment-model';
import { managementFixture } from '../../fixtures/remote-management';
vi.mock('../../../src/app/remotes/assessment/travel',() => ({ measureRemoteLeg: vi.fn() }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: vi.fn(() => ({ version: 'topology-a',matrix: () => false })) }));
afterEach(() => vi.clearAllMocks());
function fixture() {
  const state = createMemoryPort(() => (root)), root = {}, f = managementFixture(); let admitted = true;
  const context = { request: { home: 'W0N1',room: 'E0N1',source: 'source',tick: 20,traversal: f.request.policy.traversal,economics: f.request.policy.economics },
    target: { room: 'E0N1',x: 10,y: 10 },traversal: {} as RemoteEstimateContext['traversal'],intel: vi.fn() };
  const origin = { room: 'W0N1',x: 25,y: 25 }, rooms = ['W0N1','E0N1'];
  vi.mocked(measureRemoteLeg).mockImplementation((_context,leg) => { admitted = false; return { status: 'complete',ticks: 10,operations: 20,arrival: leg.destination }; });
  const run = () => createResumableRemoteTravel(state)(context,origin,rooms,1000,{} as Parameters<ReturnType<typeof createResumableRemoteTravel>>[4],() => admitted);
  return { context,run,resume: () => { admitted = true; context.request.tick++; } };
}
test('completed travel legs survive recreation/CPU deferral and are not searched again', () => {
  const f = fixture();
  expect(f.run()).toEqual({ status: 'deferred',reason: 'admission' }); expect(measureRemoteLeg).toHaveBeenCalledTimes(1);
  f.resume(); expect(f.run()).toEqual({ status: 'deferred',reason: 'admission' }); expect(measureRemoteLeg).toHaveBeenCalledTimes(2);
  f.resume(); expect(f.run()).toEqual({ status: 'deferred',reason: 'admission' }); expect(measureRemoteLeg).toHaveBeenCalledTimes(3);
  f.resume(); expect(f.run()).toMatchObject({ status: 'complete',minerTicks: 10,minerReturnTicks: 10,outboundTicks: 10,returnTicks: 10,operations: 80 });
  expect(measureRemoteLeg).toHaveBeenCalledTimes(4);
  f.resume(); expect(f.run().status).toBe('complete'); expect(measureRemoteLeg).toHaveBeenCalledTimes(4);
});
test('body policy changes discard cached legs before further measurement', () => {
  const f = fixture(); f.run(); f.resume();
  f.context.request.economics = { ...f.context.request.economics,riskPerTick: 1 };
  f.run(); expect(measureRemoteLeg).toHaveBeenCalledTimes(2);
  expect(vi.mocked(measureRemoteLeg).mock.calls[1]?.[1].body).toEqual(f.context.request.economics.miner.body);
  f.resume(); vi.mocked(prepareRemoteMatrices).mockReturnValueOnce({ version: 'changed',matrix: () => false });
  f.run(); expect(vi.mocked(measureRemoteLeg).mock.calls[2]?.[1].body).toEqual(f.context.request.economics.miner.body);
});

test('loaded miner return is a distinct fourth leg from the measured mining arrival',() => {
  const f = fixture(); f.context.request.economics.miner.body = ['work','carry','move'];
  for (let index=0; index<4; index++) { f.run(); f.resume(); }
  const request = vi.mocked(measureRemoteLeg).mock.calls[3]![1];
  expect(request).toEqual({ origin: f.context.target,destination: { room: 'W0N1',x: 25,y: 25 },body: ['work','carry','move'],load: 50 });
  expect(vi.mocked(measureRemoteLeg).mock.calls[2]![1].load).toBe(100);
});
