import type { StatePort } from '../../../persistence/versioned-state';
import type { ReservationQuoteRequest, ReservationQuoteResult } from '../../../features/remotes/reservation/model';
import { selectBufferedReservation } from '../../../features/remotes/reservation/body-policy';
import { room, natural } from '../../../features/remotes/assignment-validation';
import { createReservationQuoteContext } from './quote-context';
import type { ReservationQuoteOptions } from './quote-context';
import { createReservationQuoteTravel } from './quote-travel';
/** Quote controller service independently from source travel and observed source capacity. No actuator is invoked. */
export function createNativeReservationQuote(state: StatePort, options: ReservationQuoteOptions) {
  if (!natural(options.maximumRooms) || options.maximumRooms < 1 || options.maximumRooms > 64 || !natural(options.maximumOps) || options.maximumOps < 1 || options.maximumOps > 100000) throw new Error('Invalid reservation quote bounds');
  const observe = createReservationQuoteContext(state,options), measure = createReservationQuoteTravel(state,options.maximumOps);
  return (request: ReservationQuoteRequest, guard: () => boolean = () => true): ReservationQuoteResult => {
    validateRequest(request);
    if (!guard()) return { status: 'deferred',reason: 'admission' };
    const context = observe(request,guard);
    if (context.status !== 'ready') return context;
    const travel = measure(context,guard);
    if (travel.status !== 'complete') return travel;
    const selected = selectBufferedReservation(Math.min(request.bodyBudget,Game.rooms[request.home]!.energyCapacityAvailable),{
      lifetime: CREEP_CLAIM_LIFE_TIME,outboundTicks: travel.outboundTicks,returnTicks: travel.returnTicks,replacementMargin: request.replacementMargin,
      reservePerClaim: CONTROLLER_RESERVE,decayPerTick: 1,maximumReservation: CONTROLLER_RESERVE_MAX,minimumBufferTicks: request.minimumBufferTicks });
    return selected ? { status: 'quoted',...selected,home: request.home,room: request.room,controller: context.controller,observedAt: context.observedAt,travel }
      : { status: 'infeasible',reason: 'buffer' };
  };
}
function validateRequest(request: ReservationQuoteRequest): void {
  if (!room(request.home) || !room(request.room) || request.home === request.room || request.tick !== Game.time) throw new Error('Invalid reservation quote identity/clock');
  if (![request.bodyBudget,request.minimumBufferTicks,request.replacementMargin].every(natural)) throw new Error('Invalid reservation quote policy');
}
