import { assessRoom } from './assessment';
import { planningRoadCosts } from './road-costs';
import { measureRouteCost } from './route-cost';
import type { WeightedDestination } from './route-cost';
import type { FinishDraftInput } from './finish-draft';
import { tileIndex } from '../../core/geometry/local-grid';
export type DraftRouteCostsInput = Omit<FinishDraftInput, 'anchors'> & {
  hauling: readonly WeightedDestination[];
  serviceWeights: Readonly<Record<string, number>>;
};
/** Call only after hard validation; path failures remain candidate failures, never cheap scores. */
export function draftRouteCosts(input: DraftRouteCostsInput) {
  const { context, targets } = prepareRouteCosts(input);
  const hauling = measureRouteCost({ ...context, targets: input.hauling });
  if (!hauling.ok) return { ...hauling, phase: 'hauling' as const };
  const service = measureRouteCost({ ...context, targets });
  if (!service.ok) return { ...service, phase: 'service' as const };
  return { ok: true as const, hauling, service };
}

export function prepareRouteCosts(input: DraftRouteCostsInput) {
  const assessment = (input.assess ?? assessRoom)(input.observation);
  const observed = input.observation.infrastructure.filter(entry => entry.type === 'road').map(entry => entry.position);
  const costs = planningRoadCosts(assessment, input.entries, observed, input.blocksMovement);
  const context = { start: input.storage, roads: input.entries.filter(entry => entry.type === 'road').map(entry => entry.position),
    search: input.search(costs), traversable: (tile: { x: number; y: number }) => costs[tileIndex(tile)]! < 255 };
  const targets = input.entries.filter(entry => Object.hasOwn(input.serviceWeights, entry.type))
    .map(entry => ({ id: entry.type + ':' + tileIndex(entry.position), position: entry.position,
      weight: input.serviceWeights[entry.type]! }));
  return { context, targets, costs };
}
