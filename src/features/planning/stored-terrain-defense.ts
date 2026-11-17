import { copyPlain } from '../../persistence/plain-data';
import { createTerrainDefenseRequest, terrainDefenseIdentity } from './terrain-defense-request';
import type { TerrainCutDefenseInput } from '../../capabilities/planning/terrain-cut-defense';
import type { createDefenseSearchStore } from './defense-search-store';
/** One request-scoped heap accelerator; persisted revision changes invalidate its cached search. */
export function createStoredTerrainDefense(store: ReturnType<typeof createDefenseSearchStore>, source: TerrainCutDefenseInput) {
  const input = copyPlain(source), identity = terrainDefenseIdentity(input);
  let search: ReturnType<typeof createTerrainDefenseRequest> | undefined, revision = -1;
  return { advance(budget: { augmentations: number; scans: number }, guard: () => boolean) {
    if (!guard()) return { status: 'deferred' as const };
    const record = store.read();
    if (record.checkpoint && record.checkpoint.identity !== identity) {
      const cleared = store.clear(record.revision);
      search = undefined;
      revision = -1;
      if (!cleared.ok) return { status: 'conflict' as const };
      return { status: 'restarted' as const };
    }
    if (record.revision !== revision) search = createTerrainDefenseRequest(input, record.checkpoint);
    search ??= createTerrainDefenseRequest(input, record.checkpoint);
    const step = search.advance(budget.augmentations, guard, budget.scans);
    const saved = store.save(record.revision, step.checkpoint);
    if (!saved.ok) { search = undefined; revision = -1; return { status: 'conflict' as const }; }
    revision = saved.record.revision;
    return { status: 'advanced' as const, result: step.result, checkpoint: step.checkpoint };
  } };
}
