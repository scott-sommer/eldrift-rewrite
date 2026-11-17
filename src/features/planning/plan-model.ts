import type { PlanProvenance } from './plan-provenance';
export interface PlanEntry {
  type: string;
  x: number;
  y: number;
  rcl: number;
  minimumStoredEnergy?: number;
  priority: number;
  source: 'strategy' | 'operator';
  dependencies?: string[];
  tag?: string;
  objectId?: string;
}
export interface PlanState {
  room: string;
  revision: number;
  strategy: string | null;
  entries: PlanEntry[];
  provenance?: PlanProvenance;
}
export function integer(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function validEntry(value: unknown, types: ReadonlySet<string>): value is PlanEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<PlanEntry>;
  return validPlacement(entry, types) && typeof entry.priority === 'number' && Number.isFinite(entry.priority)
    && (entry.source === 'strategy' || entry.source === 'operator') && validDependencies(entry.dependencies) && validMetadata(entry);
}
function validPlacement(entry: Partial<PlanEntry>, types: ReadonlySet<string>): boolean {
  return typeof entry.type === 'string' && types.has(entry.type) && integer(entry.x, 0, 49)
    && integer(entry.y, 0, 49) && integer(entry.rcl, 1, 8);
}

function validDependencies(value: unknown): boolean {
  return value === undefined || Array.isArray(value) && value.length <= 100
    && value.every(item => typeof item === 'string') && new Set(value).size === value.length;
}

function validMetadata(entry: Partial<PlanEntry>): boolean {
  if (entry.minimumStoredEnergy !== undefined
    && (!Number.isSafeInteger(entry.minimumStoredEnergy) || entry.minimumStoredEnergy < 0)) return false;
  return [entry.tag, entry.objectId].every(value => value === undefined || typeof value === 'string' && value.length > 0);
}
