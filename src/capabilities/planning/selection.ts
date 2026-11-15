export const scoreDimensions = ['hauling', 'service', 'capacityShortfall', 'swamps', 'defense', 'migration'] as const;
export type ScoreDimension = typeof scoreDimensions[number];
export type LayoutCosts = Record<ScoreDimension, number>;
export interface ScoredLayout { id: string; costs: LayoutCosts }
export interface RankedLayout { id: string; total: number; contributions: LayoutCosts }
export function rankLayout(candidate: ScoredLayout, weights: LayoutCosts): RankedLayout {
  const contributions = {} as LayoutCosts;
  let total = 0;
  for (const dimension of scoreDimensions) {
    const cost = candidate.costs[dimension], weight = weights[dimension];
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(weight) || weight < 0) throw new Error('Invalid layout score');
    contributions[dimension] = cost * weight;
    total += contributions[dimension];
  }
  if (!Number.isFinite(total)) throw new Error('Layout score overflow');
  return { id: candidate.id, total, contributions };
}
/** Only candidates accepted by the supplied hard validator are scored. Lower total wins. */
export function selectLayout(
  candidates: readonly ScoredLayout[], weights: LayoutCosts, valid: (id: string) => boolean,
  previousId: string | undefined, minimumImprovement: number,
): RankedLayout | undefined {
  if (!Number.isFinite(minimumImprovement) || minimumImprovement < 0) throw new Error('Invalid switching threshold');
  const ids = candidates.map(candidate => candidate.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid candidate identities');
  const ranked = candidates.filter(candidate => valid(candidate.id)).map(candidate => rankLayout(candidate, weights))
    .sort((a, b) => a.total - b.total || (a.id < b.id ? -1 : Number(a.id > b.id)));
  const best = ranked[0];
  const previous = ranked.find(candidate => candidate.id === previousId);
  if (best && previous && previous.total - best.total <= minimumImprovement) return previous;
  return best;
}
