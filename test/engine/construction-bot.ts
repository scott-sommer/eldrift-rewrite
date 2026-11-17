import { loop as runtimeLoop } from '../../src/main';
import { nativeConstructionPorts, nativeConstructionSiteKeys } from '../../src/app/native-construction-ports';
import { createConstructionReservationLedger, reservedConstructionPorts } from '../../src/features/construction/reservation-ledger';
import { createStoredConstructionCycle } from '../../src/features/construction/stored-cycle';
import { createConstructionProgressStore } from '../../src/features/construction/progress-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const ledger = createConstructionReservationLedger();
export function loop() {
  runtimeLoop();
  const entries: PlanEntry[] = [25, 26].map(x => ({ type: 'road', x, y: 25, rcl: 1, priority: 1, source: 'strategy' }));
  entries.push({ type: 'rampart', x: 27, y: 25, rcl: 6, priority: 50, source: 'strategy', minimumStoredEnergy: 50000 });
  const ports = reservedConstructionPorts('W0N1', nativeConstructionPorts('W0N1', 1), ledger, () => Game.time, nativeConstructionSiteKeys);
  const store = createConstructionProgressStore(createMemoryPort(() => Memory), 'W0N1');
  const service = createStoredConstructionCycle(store, () => ({ room: 'W0N1', revision: 1, strategy: 'standard', entries }),
    ports, { types: constructionTypeOrder }, () => Game.time);
  const step = service.advance({ entries: 1, attempts: 1 }, () => true);
  if (step.status !== 'advanced') throw new Error('Expected native construction progress: ' + step.status);
  const result = step.result;
  const memory = Memory as Memory & { constructionRows?: unknown[] };
  (memory.constructionRows ??= []).push({ tick: Game.time, created: result.created, attempts: result.attempts,
    decisions: result.decisions.map(row => ({ type: row.entry.type, status: row.status, reason: row.reason })),
    next: store.read().next, sites: Object.keys(Game.constructionSites).length, storedEnergy: ports.observe().storedEnergy });
}
