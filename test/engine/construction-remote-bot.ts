import { loop as runtimeLoop } from '../../src/main';
import { nativeConstructionPorts, nativeConstructionSiteKeys } from '../../src/app/native-construction-ports';
import { createConstructionReservationLedger, reservedConstructionPorts } from '../../src/features/construction/reservation-ledger';
import { runConstructionCycle } from '../../src/features/construction/executor';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const ledger = createConstructionReservationLedger();
export function loop() {
  runtimeLoop();
  const actor = Object.values(Game.spawns)[0]!.owner.username;
  const raw = nativeConstructionPorts('E0N1', 3, false, { rooms: ['E0N1'], username: actor });
  const ports = reservedConstructionPorts('E0N1', raw, ledger, () => Game.time, nativeConstructionSiteKeys);
  const entries: PlanEntry[] = ['road', 'container'].map((type, index) => ({ type, x: 25 + index, y: 25,
    rcl: 1, priority: 1, source: 'strategy' }));
  const result = runConstructionCycle(entries, ports, { types: constructionTypeOrder }, { entries: 10, attempts: 2 }, () => true);
  const forbidden = raw.create({ ...entries[0]!, type: 'spawn' });
  const unapproved = nativeConstructionPorts('E0N1', 3).create(entries[0]!);
  const observed = ports.observe();
  const memory = Memory as Memory & { constructionRemoteRows?: unknown[] };
  (memory.constructionRemoteRows ??= []).push({ tick: Game.time, created: result.created, level: observed.level,
    stage: observed.stageLevel, forbidden: forbidden.reason, unapproved: unapproved.reason,
    sites: Object.values(Game.constructionSites).filter(site => site.pos.roomName === 'E0N1').map(site => site.structureType) });
}
