import { validWorldPosition } from '../../../../core/geometry/world-position';
import type { Position } from '../../../movement/step';
import type { StaticTravelLeg } from '../../../movement/path-model';
import type { BodyPart } from '../../../spawning/body';
export interface HouseholdTravelPlan {
  home: string; body: readonly BodyPart[];
  spawn: { id: string; position: Position; exit: Position };
  source: { id: string; position: Position; pickup: Position };
  destination: { id: string; position: Position; deposit: Position };
}
export interface HouseholdTravelLeg { kind: 'approach' | 'loaded' | 'return'; origin: Position; destination: Position; body: readonly BodyPart[]; load: number; range: 0 }
export type HouseholdTravelMeasure = (leg: HouseholdTravelLeg, guard: () => boolean) => ({ status: 'complete' } & StaticTravelLeg) | { status: 'deferred'; reason: string };
export function quoteHouseholdTravel(plan: HouseholdTravelPlan, binding: string, measure: HouseholdTravelMeasure, guard: () => boolean = () => true) {
  validatePlan(plan);
  if (typeof binding !== 'string' || !binding.length || binding.length > 8192) throw new Error('Invalid household travel binding');
  const snapshot = copyPlan(plan), legs: (HouseholdTravelLeg & StaticTravelLeg)[] = [];
  for (const leg of requests(snapshot)) {
    if (!guard()) return { status: 'deferred' as const,reason: 'admission',completedLegs: legs.length };
    const measured = measure({ ...leg,origin: copyPoint(leg.origin),destination: copyPoint(leg.destination),body: [...leg.body] },guard);
    if (measured.status === 'deferred') return { ...measured,completedLegs: legs.length };
    validateMeasurement(measured,leg.destination); legs.push({ ...leg,ticks: measured.ticks,operations: measured.operations,arrival: copyPoint(measured.arrival) });
  }
  return { status: 'complete' as const,identity: JSON.stringify([snapshot,binding]),plan: snapshot,legs,operations: legs.reduce((sum,leg) => sum+leg.operations,0) };
}
function requests(plan: HouseholdTravelPlan): HouseholdTravelLeg[] {
  const body = plan.body, capacity = body.filter(part => part === 'carry').length*50;
  return [
    { kind: 'approach',origin: plan.spawn.exit,destination: plan.source.pickup,body,load: 0,range: 0 },
    { kind: 'loaded',origin: plan.source.pickup,destination: plan.destination.deposit,body,load: capacity,range: 0 },
    { kind: 'return',origin: plan.destination.deposit,destination: plan.source.pickup,body,load: 0,range: 0 },
  ];
}
function validatePlan(plan: HouseholdTravelPlan): void {
  const positions = [plan.spawn.position,plan.spawn.exit,plan.source.position,plan.source.pickup,plan.destination.position,plan.destination.deposit];
  if (!positions.every(point => validWorldPosition(point) && point.room === plan.home)) throw new Error('Invalid household travel position');
  if (![plan.spawn.id,plan.source.id,plan.destination.id].every(id => typeof id === 'string' && id.length > 0 && id.length <= 240)) throw new Error('Invalid household travel identity');
  if (!adjacent(plan.spawn.position,plan.spawn.exit) || !adjacent(plan.source.position,plan.source.pickup) || !adjacent(plan.destination.position,plan.destination.deposit)) throw new Error('Invalid household service adjacency');
  validateBody(plan.body);
}
function validateBody(body: readonly BodyPart[]): void {
  if (!body.length || body.length > 50 || !body.includes('carry') || !body.includes('move') || body.some(part => !['carry','move'].includes(part))) throw new Error('Unsupported household travel body');
}
function adjacent(a: Position, b: Position): boolean { return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)) === 1; }
function validateMeasurement(leg: StaticTravelLeg, destination: Position): void {
  if (![leg.ticks,leg.operations].every(value => Number.isSafeInteger(value) && value >= 0) || leg.ticks > 1500 || leg.operations > 1000000) throw new Error('Invalid household leg measurement');
  if (!validWorldPosition(leg.arrival) || leg.arrival.room !== destination.room || leg.arrival.x !== destination.x || leg.arrival.y !== destination.y) throw new Error('Inexact household arrival');
}
function copyPlan(plan: HouseholdTravelPlan): HouseholdTravelPlan {
  return { home: plan.home,body: [...plan.body],spawn: { id: plan.spawn.id,position: copyPoint(plan.spawn.position),exit: copyPoint(plan.spawn.exit) },
    source: { id: plan.source.id,position: copyPoint(plan.source.position),pickup: copyPoint(plan.source.pickup) },
    destination: { id: plan.destination.id,position: copyPoint(plan.destination.position),deposit: copyPoint(plan.destination.deposit) } };
}

function copyPoint(point: Position): Position { return { room: point.room,x: point.x,y: point.y }; }
