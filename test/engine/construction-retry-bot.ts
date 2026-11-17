import { loop as runtimeLoop } from '../../src/main';
import { nativeConstructionPorts } from '../../src/app/native-construction-ports';
import { createStoredConstructionCycle } from '../../src/features/construction/stored-cycle';
import { createConstructionProgressStore } from '../../src/features/construction/progress-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { PlanEntry } from '../../src/features/planning/plan-model';
export function loop() {
  runtimeLoop();
  const memory = Memory as Memory & { constructionRetryRows?: unknown[]; constructionRetryCalls?: unknown[] };
  const raw = nativeConstructionPorts('W0N1', 2);
  const entry: PlanEntry = { type: 'road', x: 25, y: 25, rcl: 1, priority: 1, source: 'strategy' };
  const store = createConstructionProgressStore(createMemoryPort(() => Memory), 'W0N1');
  const ports = { observe: raw.observe, create(request: PlanEntry) {
    // Fault injection at the native boundary: valid desired tile, invalid actual border tile.
    const target = Game.time < 10 ? { ...request, x: 0, y: 25 } : request;
    const result = raw.create(target);
    (memory.constructionRetryCalls ??= []).push({ tick: Game.time, ...result });
    return result;
  } };
  const service = createStoredConstructionCycle(store, () => ({ room: 'W0N1', revision: Game.time < 10 ? 1 : 2,
    strategy: 'fixture', entries: [entry] }), ports, { types: constructionTypeOrder }, () => Game.time,
  { attempts: 3, delay: 2, maximumDelay: 4 });
  const step = service.advance({ entries: 1, attempts: 1 }, () => true);
  if (step.status !== 'advanced') throw new Error('Retry fixture progress failed: ' + step.status);
  (memory.constructionRetryRows ??= []).push({ tick: Game.time, retries: store.read().retries,
    decisions: step.result.decisions.map(row => ({ status: row.status, reason: row.reason })), sites: Object.keys(Game.constructionSites).length });
}
