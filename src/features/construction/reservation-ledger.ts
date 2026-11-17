import { copyPlain } from '../../persistence/plain-data';
import { placementKey } from '../planning/dependencies';
import type { PlanEntry } from '../planning/plan-model';
import type { ConstructionObservation } from './model';
import type { ConstructionExecutionPorts } from './executor';
export function constructionReservationKey(room: string, entry: Pick<PlanEntry, 'type' | 'x' | 'y'>): string {
  if (!room || room.includes('/')) throw new Error('Invalid construction reservation room');
  return room + '/' + placementKey(entry);
}
/** Tick-owned accepted intents shared across room cycles; next-tick observations replace this ledger. */
export function createConstructionReservationLedger() {
  let currentTick = -1;
  const accepted = new Map<string, { room: string; entry: PlanEntry }>();
  function atTick(tick: number) {
    if (!Number.isSafeInteger(tick) || tick < currentTick || tick < 0) throw new Error('Invalid construction reservation tick');
    if (tick !== currentTick) { accepted.clear(); currentTick = tick; }
  }
  return {
    accept(tick: number, room: string, entry: PlanEntry) {
      atTick(tick); accepted.set(constructionReservationKey(room, entry), { room, entry: copyPlain(entry) });
    },
    observe(tick: number, room: string, observed: ConstructionObservation, globalPlacements: ReadonlySet<string>): ConstructionObservation {
      atTick(tick);
      for (const item of observed.structures.filter(item => item.owned)) accepted.delete(constructionReservationKey(room, item));
      const pending = [...accepted].filter(([key]) => !globalPlacements.has(key)).map(([, value]) => value);
      const local = pending.filter(value => value.room === room).map(value => ({
        id: 'construction-reservation:' + constructionReservationKey(room, value.entry),
        type: value.entry.type, x: value.entry.x, y: value.entry.y, owned: true,
      }));
      return { ...observed, globalSites: globalPlacements.size + pending.length, sites: [...observed.sites, ...local] };
    },
  };
}
/** All room executors in a tick must share this ledger and the same authoritative global-site key source. */
export function reservedConstructionPorts(
  room: string, ports: ConstructionExecutionPorts, ledger: ReturnType<typeof createConstructionReservationLedger>,
  tick: () => number, globalPlacements: () => ReadonlySet<string>,
): ConstructionExecutionPorts {
  return { observe: () => ledger.observe(tick(), room, ports.observe(), globalPlacements()),
    create(entry) {
      const requested = copyPlain(entry), result = ports.create(copyPlain(entry));
      if (result.status === 'created') ledger.accept(tick(), room, requested);
      return result;
    } };
}
