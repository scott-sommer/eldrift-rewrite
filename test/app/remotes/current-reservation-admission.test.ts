import { afterEach, expect, test, vi } from 'vitest';
import { managementFixture } from '../../fixtures/remote-management';
import { reservationQuote } from '../../fixtures/reservation-quote';
import { createCurrentReservationAdmission } from '../../../src/app/remotes/management/current-reservation';
import { createNativeReservationQuote } from '../../../src/app/remotes/reservation/native-quote';
vi.mock('../../../src/app/remotes/reservation/native-quote',() => ({ createNativeReservationQuote: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
test('native commit requotes the selected body and rejects changed route/timing while accepting a fresh observation of the same quote',() => {
  const f = managementFixture(), quote = reservationQuote(), fresh = structuredClone(quote); fresh.observedAt = 20;
  vi.stubGlobal('Game',{ time: 20 }); const native = vi.fn(() => fresh); vi.mocked(createNativeReservationQuote).mockReturnValue(native);
  const admit = createCurrentReservationAdmission(f.state,f.request,{ maximumRooms: 8,maximumOps: 1000 },() => true);
  expect(admit(quote,() => true)).toBe(true); expect(native).toHaveBeenCalledWith(expect.objectContaining({ bodyBudget: 1300,room: 'E0N1',tick: 20 }),expect.any(Function));
  fresh.travel.identity = 'changed-route'; expect(admit(quote,() => true)).toBe(false); fresh.travel.identity = quote.travel.identity;
  fresh.economics.energyPerTick++; expect(admit(quote,() => true)).toBe(false);
});
test('CPU refusal prevents even cached controller admission work',() => {
  const f = managementFixture(), native = vi.fn(() => reservationQuote()); vi.mocked(createNativeReservationQuote).mockReturnValue(native);
  const admit = createCurrentReservationAdmission(f.state,f.request,{ maximumRooms: 8,maximumOps: 1000 },() => false);
  expect(admit(reservationQuote(),() => true)).toBe(false); expect(native).not.toHaveBeenCalled();
});
