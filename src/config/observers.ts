import { roomCoordinates } from '../core/geometry/room-grid';
export interface ObserverConfig {
  observersEnabled: boolean; observerAssignedRooms: readonly string[]; observerRefreshInterval: number;
  observerRequestLifetime: number; observerFailureDelay: number;
  observerCpuBudget: number; observerVisionBudget: number; observerCaptureBudget: number; observerScanBudget: number;
}
export const observerDefaults: Readonly<ObserverConfig> = Object.freeze({
  observersEnabled: false, observerAssignedRooms: Object.freeze([]), observerRefreshInterval: 1,
  observerRequestLifetime: 25, observerFailureDelay: 25,
  observerCpuBudget: 3, observerVisionBudget: 4, observerCaptureBudget: 4, observerScanBudget: 32,
});
function integer(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
function rooms(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 64 || !value.every(item => typeof item === 'string')) return false;
  try { value.forEach(roomCoordinates); return true; } catch { return false; }
}
export const observerValidators: { [K in keyof ObserverConfig]: (value: unknown) => boolean } = {
  observersEnabled: value => typeof value === 'boolean', observerAssignedRooms: rooms,
  observerRefreshInterval: value => integer(value, 1, 1000000), observerRequestLifetime: value => integer(value, 2, 1000000),
  observerFailureDelay: value => integer(value, 1, 1000000),
  observerCpuBudget: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000,
  observerVisionBudget: value => integer(value, 0, 32), observerCaptureBudget: value => integer(value, 0, 32),
  observerScanBudget: value => integer(value, 0, 1000),
};
const shared = new Set(['observerCpuBudget','observerVisionBudget','observerCaptureBudget','observerScanBudget']);
export function validateObserverScope(key: string, layer: string): void {
  if (shared.has(key) && layer !== 'environment' && layer !== 'empire') throw new Error(`${layer}.${key}: shared observer budget requires environment or empire scope`);
}
