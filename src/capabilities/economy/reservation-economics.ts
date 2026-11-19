import { bodyCost } from '../spawning/body';
import { remoteServiceTiming } from './remote-timing';
import type { ReservationEconomicsInput, ReservationEconomicsResult } from './reservation-model';
/** Current reservation growth and full-body replacement cost; source capacity/stock are separate observations. */
export function assessReservationEconomics(input: ReservationEconomicsInput): ReservationEconomicsResult {
  validate(input);
  const claims = input.body.filter(part => part === 'claim').length, moves = input.body.filter(part => part === 'move').length;
  if (claims === 0) return { status: 'infeasible',reason: 'no-claim' };
  if (!moves && input.outboundTicks+input.returnTicks > 0) return { status: 'infeasible',reason: 'immobile' };
  const timing = remoteServiceTiming(input.lifetime,input.outboundTicks,input.returnTicks,input.replacementMargin);
  if (timing.replacementTicks <= 0) return { status: 'infeasible',reason: 'service' };
  const spawnTicks = input.body.length*3, cost = bodyCost(input.body);
  const netReservePerTick = claims*input.reservePerClaim-input.decayPerTick;
  // Controller aging clears at endTime-1; ticksToEnd includes one tick that is not useful missed-service coverage.
  const usefulBufferTicks = Math.min(input.maximumReservation-1,Math.max(0,Math.floor(timing.serviceTicks*netReservePerTick)));
  const recoveryTicks = spawnTicks+timing.travelTicks+timing.marginTicks;
  const requiredBufferTicks = input.minimumBufferTicks+recoveryTicks;
  if (netReservePerTick <= 0 || usefulBufferTicks < requiredBufferTicks) return { status: 'infeasible',reason: 'buffer' };
  return { status: 'evaluated',claims,cost,spawnTicks,timing,netReservePerTick,usefulBufferTicks,requiredBufferTicks,recoveryTicks,
    energyPerTick: cost/timing.replacementTicks,spawnLoad: spawnTicks/timing.replacementTicks };
}
function validate(input: ReservationEconomicsInput): void {
  if (!Array.isArray(input.body) || !input.body.length || input.body.length > 50 || !input.body.every(part => part === 'claim' || part === 'move')) throw new Error('Invalid reservation body');
  if (![input.lifetime,input.reservePerClaim,input.decayPerTick,input.maximumReservation].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid reservation duration/power');
  if (![input.minimumBufferTicks,input.replacementMargin].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid reservation buffer');
  if (![input.outboundTicks,input.returnTicks].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid reservation travel');
}
