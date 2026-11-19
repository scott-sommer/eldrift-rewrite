import type { StatePort } from '../../../persistence/versioned-state';
import { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { createReservationTravelProgress } from '../../../features/remotes/reservation/travel-progress';
import { prepareRemoteMatrices } from '../assessment/matrices';
import { measureRemoteLeg } from '../assessment/travel';
import type { ReservationTravelContext } from './quote-context';
/** Completed legs survive CPU deferral and reset; geometry/topology/body changes invalidate only this controller cache. */
export function createReservationQuoteTravel(state: StatePort, maximumOps: number) {
  const snapshots = createMatrixSnapshots();
  return (context: ReservationTravelContext, guard: () => boolean) => {
    if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
    const matrices = prepareRemoteMatrices(context,context.rooms,1,snapshots), store = createReservationTravelProgress(state,context.request.home);
    const identity = JSON.stringify([context.request.home,context.controller,context.origin,context.rooms,context.body.parts,matrices.version]);
    let record = store.read(); const legs = record.identity === identity ? record.legs : [];
    for (let index=legs.length; index<2; index++) {
      if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
      const origin = index === 0 ? context.origin : legs[0]!.arrival, destination = index === 0 ? context.controller.position : context.origin;
      const result = measureRemoteLeg(context,{ origin,destination,body: context.body.parts,load: 0 },context.rooms,maximumOps,snapshots,guard);
      if (result.status !== 'complete') return result;
      legs.push({ ticks: result.ticks,operations: result.operations,arrival: result.arrival });
      if (!store.save(record.revision,context.request.tick,identity,legs)) return { status: 'deferred' as const,reason: 'progress-conflict' };
      record = store.read();
    }
    return { status: 'complete' as const,identity,outboundTicks: legs[0]!.ticks,returnTicks: legs[1]!.ticks,rooms: [...context.rooms],
      operations: legs.reduce((sum,leg) => sum+leg.operations,0),profile: 'balanced-claim-move' as const };
  };
}
