import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { calculateTransferBooking, prepareTransferBooking } from '../../capabilities/logistics/booking';
import type { TransferAvailability, TransferBooking } from '../../capabilities/logistics/booking';
export type { TransferAvailability, TransferBooking } from '../../capabilities/logistics/booking';
/** Reserve outstanding request quantity and storage, dropping the stock claim after confirmed pickup. */
export function reserveTransfer(state: StatePort, request: LogisticsRequest, booking: TransferBooking,
  observed: TransferAvailability, tick: number): number {
  const prepared = prepareTransferBooking(request, booking, observed, tick);
  if (!prepared) return 0;
  const ledger = createQuantityReservations(state);
  if (prepared.releasePool) ledger.releasePool(prepared.identity, prepared.releasePool);
  const allocation = calculateTransferBooking(prepared, ledger.list(tick));
  if (!allocation) return 0;
  return ledger.reserve(allocation.claim, prepared.capacities, tick) ? allocation.amount : 0;
}
