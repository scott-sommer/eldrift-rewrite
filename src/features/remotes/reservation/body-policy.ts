import { bufferedReserver } from '../../../capabilities/spawning/reservation-recipes';
import { assessReservationEconomics } from '../../../capabilities/economy/reservation-economics';
import type { ReservationEconomicsInput, ReservationEconomics } from '../../../capabilities/economy/reservation-model';
export type ReservationBodyPolicy = Omit<ReservationEconomicsInput,'body'>;
/** Cheapest feasible buffered balanced body; the selected quote carries its shared room commitment once. */
export function selectBufferedReservation(budget: number, policy: ReservationBodyPolicy) {
  const candidates: { body: NonNullable<ReturnType<typeof bufferedReserver>>; economics: ReservationEconomics }[] = [];
  for (let claims=2; claims<=8; claims++) {
    const body = bufferedReserver(budget,claims);
    if (!body) continue;
    const economics = assessReservationEconomics({ ...policy,body: body.parts });
    if (economics.status === 'evaluated') candidates.push({ body,economics });
  }
  candidates.sort((a,b) => a.economics.energyPerTick-b.economics.energyPerTick || a.body.cost-b.body.cost);
  const selected = candidates[0];
  return selected && { ...selected,commitment: { atomic: false,slots: 1,energyPerTick: selected.economics.energyPerTick,spawnLoad: selected.economics.spawnLoad } };
}
