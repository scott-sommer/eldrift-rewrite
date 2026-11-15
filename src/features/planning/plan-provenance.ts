import { scoreDimensions } from '../../capabilities/planning/selection';
import type { LayoutCosts } from '../../capabilities/planning/selection';
import { integer } from './plan-model';
import type { PlanEntry } from './plan-model';
export interface PlanProvenance {
  candidateId: string; strategyVersion: string; observation: string; policy: string;
  generatedAt: number; committedAt: number;
  anchor: { x: number; y: number }; transform: number;
  bootstrap: { spawn: string; storage: string };
  costs: LayoutCosts;
}
export function validProvenance(value: unknown, entries: readonly PlanEntry[]): value is PlanProvenance {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PlanProvenance>;
  if (![data.candidateId, data.strategyVersion, data.observation, data.policy].every(item => typeof item === 'string' && item.length > 0)) return false;
  if (!integer(data.generatedAt, 0, Number.MAX_SAFE_INTEGER) || !integer(data.committedAt, data.generatedAt!, Number.MAX_SAFE_INTEGER)) return false;
  if (!validPlacement(data)) return false;
  return validCosts(data.costs) && validBootstrap(data.bootstrap, entries);
}
function validCosts(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const costs = value as LayoutCosts;
  return scoreDimensions.every(key => typeof costs[key] === 'number' && Number.isFinite(costs[key]) && costs[key] >= 0);
}
function validBootstrap(value: unknown, entries: readonly PlanEntry[]): boolean {
  if (!value || typeof value !== 'object') return false;
  const bootstrap = value as PlanProvenance['bootstrap'];
  return entries.some(entry => entry.type === 'spawn' && entry.rcl === 1 && key(entry) === bootstrap.spawn)
    && entries.some(entry => entry.type === 'storage' && key(entry) === bootstrap.storage);
}
function key(entry: PlanEntry): string { return entry.type + ':' + entry.x + ':' + entry.y; }

function validPlacement(data: Partial<PlanProvenance>): boolean {
  return !!data.anchor && integer(data.anchor.x, 0, 49) && integer(data.anchor.y, 0, 49) && integer(data.transform, 0, 7);
}
