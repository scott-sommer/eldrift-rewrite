import type { ReservationQuoteRequest } from '../../../src/features/remotes/reservation/model';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeReservationCandidates } from '../../../src/app/remotes/reservation/candidates';
import { createNativeReservationQuote } from '../../../src/app/remotes/reservation/native-quote';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { defaults } from '../../../src/config/model';
import { resolveConfig } from '../../../src/config/resolve';
import { managementFixture } from '../../fixtures/remote-management';
import { reservationQuote } from '../../fixtures/reservation-quote';
vi.mock('../../../src/app/remotes/reservation/native-quote',() => ({ createNativeReservationQuote: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
test('disabled reservation policy reads neither state nor native quote context',() => {
  const state = { read: vi.fn(),write: vi.fn() }, policy = managementFixture().request.policy;
  expect(createNativeReservationCandidates(state)({} as Room,policy,defaults,() => true)).toBe(policy);
  expect(state.read).not.toHaveBeenCalled(); expect(createNativeReservationQuote).not.toHaveBeenCalled();
});
test('native candidate decoration supplies configured bounds and preserves a stable published quote',() => {
  vi.stubGlobal('Game',{ time: 20 });
  const f = managementFixture(), root = {}, memory = createMemoryPort(() => root);
  const measured = vi.fn((request: ReservationQuoteRequest) => reservationQuote(request.home,request.room,Game.time));
  vi.mocked(createNativeReservationQuote).mockReturnValue(measured);
  const home = { name: 'W0N1',energyCapacityAvailable: 1300 } as Room;
  const config = { ...defaults,remoteReservationEnabled: true,remoteReservationBodyBudget: 1950,remoteReservationMinimumBuffer: 200,remoteReservationMargin: 30 };
  const run = () => createNativeReservationCandidates(memory)(home,f.request.policy,config,() => true);
  const policy = run(); expect(policy.candidates[0]!.reservation).toEqual(measured.mock.results[0]!.value);
  expect(measured.mock.calls[0]![0]).toMatchObject({ bodyBudget: 1300,minimumBufferTicks: 200,replacementMargin: 30 });
  Game.time++; expect(run()).toEqual(policy); expect(measured).toHaveBeenCalledTimes(1);
});
test('reservation controls validate body, buffer and bounded work independently',() => {
  const config = resolveConfig({ empire: { remoteReservationEnabled: true,remoteReservationBodyBudget: 1300,remoteReservationQuoteRooms: 2 } },1).values;
  expect(config.remoteReservationEnabled).toBe(true); expect(config.remoteReservationQuoteRooms).toBe(2);
  for (const values of [{ remoteReservationBodyBudget: 5201 },{ remoteReservationQuoteRooms: 65 },{ remoteReservationMinimumBuffer: 5000 },{ remoteReservationMargin: -1 }]) expect(() => resolveConfig({ empire: values },1)).toThrow();
});
