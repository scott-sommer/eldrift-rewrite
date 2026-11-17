import { loop as runtimeLoop } from '../../src/main';
import { nativeConstructionPorts, nativeConstructionSiteKeys } from '../../src/app/native-construction-ports';
import { createConstructionReservationLedger, reservedConstructionPorts } from '../../src/features/construction/reservation-ledger';
import { runConstructionCycle } from '../../src/features/construction/executor';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const ledger = createConstructionReservationLedger();
export function loop() {
  runtimeLoop();
  const entries: PlanEntry[] = [25, 26].map(x => ({ type: 'road', x, y: 25, rcl: 1, priority: 1, source: 'strategy' }));
  entries.push({ type: 'rampart', x: 27, y: 25, rcl: 6, priority: 50, source: 'strategy', minimumStoredEnergy: 50000 });
  const ports = reservedConstructionPorts('W0N1', nativeConstructionPorts('W0N1', 1), ledger, () => Game.time, nativeConstructionSiteKeys);
  const result = runConstructionCycle(entries, ports, { types: constructionTypeOrder }, { entries: 10, attempts: 1 }, () => true);
  const memory = Memory as Memory & { constructionRows?: unknown[] };
  (memory.constructionRows ??= []).push({ tick: Game.time, created: result.created, attempts: result.attempts,
    decisions: result.decisions.map(row => ({ type: row.entry.type, status: row.status, reason: row.reason })),
    sites: Object.keys(Game.constructionSites).length, storedEnergy: ports.observe().storedEnergy });
}
