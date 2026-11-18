import { planningRoadSearch } from './planning-road-search';
/** Single-network heap accelerator. Each search still clones its private native matrix. */
export function createPlanningRoadSearchCache(room: string, maxOps: number) {
  let saved: { costs: number[]; search: ReturnType<typeof planningRoadSearch> } | undefined;
  return (costs: readonly number[]) => {
    if (!saved || costs.length !== saved.costs.length || !saved.costs.every((cost, index) => cost === costs[index])) {
      const search = planningRoadSearch(room, costs, maxOps);
      saved = { costs: [...costs], search };
    }
    return saved.search;
  };
}
