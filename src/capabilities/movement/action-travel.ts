import type { Mobility } from './mobility';
/** Finite fixed-route movement frames before a non-movement action; final fatigue need not clear. */
export function quoteActionTravel(mobility: Mobility, terrain: readonly (1 | 2 | 10)[], initialFatigue = 0) {
  if (!natural(initialFatigue) || initialFatigue > 1000000 || terrain.length > 1500 || terrain.some(rate => ![1,2,10].includes(rate))) throw new Error('Invalid action travel input');
  if (!terrain.length) return { status: 'complete' as const,ticks: 0,arrivalFatigue: initialFatigue };
  if (!mobility.mobile) return { status: 'deferred' as const,reason: 'immobile' as const };
  if (!natural(mobility.weight) || !natural(mobility.recovery) || mobility.recovery < 1) throw new Error('Invalid action travel mobility');
  let ticks = 0, fatigue = initialFatigue;
  for (const rate of terrain) {
    const waiting = Math.ceil(fatigue/mobility.recovery); ticks += waiting+1;
    fatigue = Math.max(0,mobility.weight*rate-mobility.recovery);
    if (ticks > 1500) return { status: 'deferred' as const,reason: 'travel-limit' as const };
  }
  return { status: 'complete' as const,ticks,arrivalFatigue: fatigue };
}
function natural(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
