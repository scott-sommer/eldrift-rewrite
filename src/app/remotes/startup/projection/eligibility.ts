import { validCompleteStartupTravel } from '../../../../features/remotes/startup/selection-validation';
import type { NativeStartupQuote, NativeStartupProjectionOptions } from './model';
export function startupProjectionRefusal(quote: NativeStartupQuote, options: NativeStartupProjectionOptions): string | undefined {
  if (quote.observedAt !== Game.time || quote.facts.observedAt !== Game.time) return 'stale-observation';
  if (!validCompleteStartupTravel(quote,quote.facts.home) || !sameGeometry(quote)) return 'quote-facts';
  if (quote.facts.workers.length > 0) return 'existing-workforce';
  return sourceStateRefusal(quote,options);
}
function sourceStateRefusal(quote: NativeStartupQuote, options: NativeStartupProjectionOptions): string | undefined {
  const station = quote.facts.station.facts;
  if (station.status === 'ready' && (station.energy > 0 || station.claimedEnergy > 0)) return 'station-stock';
  if (quote.facts.reservation && quote.facts.reservation.ticksToEnd <= options.horizon+1) return 'reservation-transition';
  return undefined;
}
function sameGeometry(quote: NativeStartupQuote): boolean {
  const plan = quote.plan, facts = quote.facts, spawn = facts.spawns.find(item => item.id === plan.spawn.id);
  if (!spawn || !samePosition(spawn.position,plan.spawn.position)) return false;
  if (facts.home !== plan.home || facts.room !== plan.room || facts.source.id !== plan.source) return false;
  return facts.endpoint.id === plan.endpoint.id && samePosition(facts.station,plan.station) && samePosition(facts.endpoint.position,plan.endpoint.position);
}
function samePosition(a: NativeStartupQuote['plan']['station'], b: typeof a): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
