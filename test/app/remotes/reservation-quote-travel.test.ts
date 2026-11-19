import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createReservationQuoteTravel } from '../../../src/app/remotes/reservation/quote-travel';
import { createReservationTravelProgress } from '../../../src/features/remotes/reservation/travel-progress';
import { measureRemoteLeg } from '../../../src/app/remotes/assessment/travel';
import { prepareRemoteMatrices } from '../../../src/app/remotes/assessment/matrices';
import { bufferedReserver } from '../../../src/capabilities/spawning/reservation-recipes';
import type { ReservationTravelContext } from '../../../src/app/remotes/reservation/quote-context';
vi.mock('../../../src/app/remotes/assessment/travel',() => ({ measureRemoteLeg: vi.fn() }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: vi.fn(() => ({ version: 'topology',matrix: () => false })) }));
afterEach(() => vi.clearAllMocks());
function fixture() {
  const root = {}, state = createMemoryPort(() => root); let admitted = true;
  const context = { status: 'ready',request: { home: 'W0N1',room: 'E0N1',tick: 1,bodyBudget: 1300,minimumBufferTicks: 100,replacementMargin: 25,traversal: { mode: 'known-safe',username: 'self',allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 100,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 } },
    body: bufferedReserver(1300,2)!,origin: { room: 'W0N1',x: 47,y: 25 },rooms: ['W0N1','E0N1'],controller: { id: 'controller',position: { room: 'E0N1',x: 3,y: 25 } },observedAt: 1,intel: vi.fn() } as ReservationTravelContext;
  vi.mocked(measureRemoteLeg).mockImplementation((_context,leg) => { admitted = false; return { status: 'complete',ticks: 10,operations: 8,arrival: { ...leg.destination,x: leg.destination.x-1 } }; });
  state.write('fixture/unrelated',{ owner: 'fixture',version: 1,data: { retained: true } });
  state.write('remoteTravel/W0N1',{ owner: 'remotes',version: 2,data: { revision: 3,clock: 1,identity: 'source-cache',legs: [] } });
  const run = () => createReservationQuoteTravel(state,1000)(context,() => admitted);
  return { root,state,context,run,resume: () => { admitted = true; context.request.tick++; } };
}
test('controller legs resume across recreation and CPU deferral without altering source progress or unrelated state',() => {
  const f = fixture(), source = f.state.read('remoteTravel/W0N1'), unrelated = f.state.read('fixture/unrelated');
  expect(f.run()).toEqual({ status: 'deferred',reason: 'admission' }); expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(1);
  f.resume(); expect(f.run()).toMatchObject({ status: 'complete',outboundTicks: 10,returnTicks: 10,operations: 16 });
  expect(vi.mocked(measureRemoteLeg).mock.calls[1]![1].origin).toEqual({ room: 'E0N1',x: 2,y: 25 });
  f.resume(); expect(f.run().status).toBe('complete'); expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(2);
  expect(f.state.read('remoteTravel/W0N1')).toEqual(source); expect(f.state.read('fixture/unrelated')).toEqual(unrelated);
});
test('controller and topology changes invalidate measured legs, while pricing-only policy does not',() => {
  const f = fixture(); f.run(); f.resume(); f.run(); f.resume(); f.context.request.minimumBufferTicks = 200;
  f.run(); expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(2);
  f.context.controller.position.x = 20; f.resume(); expect(f.run().status).toBe('deferred'); expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(3);
  f.resume(); vi.mocked(prepareRemoteMatrices).mockReturnValueOnce({ version: 'new-topology',matrix: () => false }); f.run(); expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(4);
});
test('controller progress retains CAS/clock fencing and rejects corrupt over-capacity or negative leg state',() => {
  const f = fixture(); f.run(); const store = createReservationTravelProgress(f.state,'W0N1','E0N1'), record = store.read();
  expect(store.save(record.revision-1,2,'new',[])).toBe(false); expect(store.save(record.revision,0,'new',[])).toBe(false);
  expect(() => store.save(record.revision,2,'new',Array(3).fill(record.legs[0]!))).toThrow();
  f.state.write('remoteReserveTravel/W0N1',{ owner: 'remotes',version: 1,data: { ...record,legs: [{ ...record.legs[0]!,ticks: -1 }] } }); expect(() => store.read()).toThrow();
});

test('interleaved controllers retain independent completed legs instead of evicting each other',() => {
  const f = fixture(); f.run(); f.resume(); f.run();
  const second = structuredClone({ ...f.context,intel: undefined });
  const north = { ...second,intel: f.context.intel,request: { ...f.context.request,room: 'W0N2' },rooms: ['W0N1','W0N2'],controller: { id: 'north',position: { room: 'W0N2',x: 20,y: 20 } } };
  const measure = createReservationQuoteTravel(f.state,1000);
  vi.mocked(measureRemoteLeg).mockImplementation((_context,leg) => ({ status: 'complete',ticks: 15,operations: 10,arrival: leg.destination }));
  expect(measure(north,() => true).status).toBe('complete');
  f.resume(); expect(f.run().status).toBe('complete');
  expect(vi.mocked(measureRemoteLeg)).toHaveBeenCalledTimes(4);
  expect(createReservationTravelProgress(f.state,'W0N1','W0N2').read().legs).toHaveLength(2);
});
test('valid legacy controller measurements invalidate once while revision and clock fencing survive',() => {
  const f = fixture(); f.state.write('remoteReserveTravel/W0N1',{ owner: 'remotes',version: 1,data: { revision: 9,clock: 10,identity: 'old-controller',legs: [] } });
  const store = createReservationTravelProgress(f.state,'W0N1','E0N1');
  expect(store.read()).toEqual({ revision: 9,clock: 10,identity: '',legs: [] });
  expect(store.save(9,9,'new',[])).toBe(false); expect(store.save(9,10,'new',[])).toBe(true);
  expect(f.state.read('remoteReserveTravel/W0N1')).toMatchObject({ version: 2,data: { revision: 10,clock: 10 } });
});
test('controller cache history is bounded and evicts the oldest measured room safely',() => {
  const f = fixture();
  for (let index=0; index<65; index++) {
    const store = createReservationTravelProgress(f.state,'W0N1',`E${index}N1`);
    expect(store.save(index,index,'controller-'+index,[])).toBe(true);
  }
  expect(createReservationTravelProgress(f.state,'W0N1','E0N1').read().identity).toBe('');
  expect(createReservationTravelProgress(f.state,'W0N1','E64N1').read().identity).toBe('controller-64');
});
