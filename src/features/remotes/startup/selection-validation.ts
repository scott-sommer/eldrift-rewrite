import { natural, object } from '../assignment-validation';
import { validStartupTravelLeg } from './travel-progress';
import { startupTravelLegs } from './travel-plan';
import type { CompleteStartupTravel, StartupGeometrySelection } from './selection-model';
export function validStartupSelection(value: unknown, home: string, clock: number): value is StartupGeometrySelection {
  if (!object(value) || !natural(value.generation) || value.generation === 0) return false;
  if (!selectionBinding(value.binding) || !natural(value.selectedAt) || !natural(value.expiresAt)) return false;
  if (value.selectedAt > clock || value.expiresAt < value.selectedAt || value.expiresAt-value.selectedAt > 10000) return false;
  return validQuote(value.quote,home);
}
export function selectionBinding(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 8192; }
function validQuote(value: unknown, home: string): value is CompleteStartupTravel {
  if (!quoteShape(value,home)) return false;
  try {
    const quote = value as unknown as CompleteStartupTravel, expected = startupTravelLegs(quote.plan);
    if (!identityMatches(quote)) return false;
    if (!quote.legs.every((leg,index) => matchingLeg(leg,expected[index]!))) return false;
    return quote.operations === quote.legs.reduce((sum,leg) => sum+leg.operations,0);
  } catch { return false; }
}
function quoteShape(value: unknown, home: string): boolean {
  if (!object(value) || value.status !== 'complete' || !object(value.plan) || value.plan.home !== home) return false;
  if (!Array.isArray(value.legs) || value.legs.length !== 5 || !natural(value.operations)) return false;
  return typeof value.identity === 'string' && value.identity.length <= 100000;
}
function identityMatches(quote: CompleteStartupTravel): boolean {
  const identity: unknown = JSON.parse(quote.identity);
  return Array.isArray(identity) && identity.length === 2 && JSON.stringify(identity[0]) === JSON.stringify(quote.plan) && selectionBinding(identity[1]);
}
function matchingLeg(leg: CompleteStartupTravel['legs'][number], expected: ReturnType<typeof startupTravelLegs>[number]): boolean {
  return validStartupTravelLeg(leg) && leg.operations <= 1000000 && leg.kind === expected.kind && samePosition(leg.arrival,expected.destination);
}
function samePosition(a: CompleteStartupTravel['plan']['station'], b: CompleteStartupTravel['plan']['station']): boolean {
  return a.room === b.room && a.x === b.x && a.y === b.y;
}
