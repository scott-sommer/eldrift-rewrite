import { validWorldPosition } from '../../core/geometry/world-position';
import type { Position } from '../movement/step';
export interface LogisticsService { collection: Position; deposit: Position; avoid?: readonly Position[] }
export function validateLogisticsService(value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || !('collection' in value) || !('deposit' in value)) throw new Error('Invalid logistics service geometry');
  if (!validWorldPosition(value.collection) || !validWorldPosition(value.deposit)) throw new Error('Invalid logistics service tile');
  validateAvoid(value as LogisticsService);
}
export function sameLogisticsService(a: LogisticsService | undefined, b: LogisticsService | undefined): boolean {
  if (!a || !b) return a === b;
  return samePoint(a.collection,b.collection) && samePoint(a.deposit,b.deposit) && sameAvoid(a.avoid,b.avoid);
}
function samePoint(a: Position, b: Position): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }

function validateAvoid(service: LogisticsService): void {
  if (service.avoid === undefined) return;
  if (!Array.isArray(service.avoid) || service.avoid.length > 64 || !service.avoid.every(validWorldPosition)) throw new Error('Invalid logistics service exclusions');
  if (service.avoid.some(point => samePoint(point,service.collection) || samePoint(point,service.deposit))) throw new Error('Excluded logistics service tile');
}
function sameAvoid(a: readonly Position[] = [], b: readonly Position[] = []): boolean { return a.length === b.length && a.every((point,index) => samePoint(point,b[index]!)); }
