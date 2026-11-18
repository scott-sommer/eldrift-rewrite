import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { RuntimeConfig } from '../config/model';
import { createPlanStore } from '../features/planning/plan-store';
import { createConstructionProgressStore } from '../features/construction/progress-store';
import { createStoredConstructionCycle } from '../features/construction/stored-cycle';
import { constructionTypeOrder } from '../features/construction/order';
import { createConstructionReservationLedger, reservedConstructionPorts } from '../features/construction/reservation-ledger';
import { nativeConstructionPorts, nativeConstructionSiteKeys } from './native-construction-ports';
/** Owned-room construction is separate from planning; disabled configuration performs no native/state reads. */
export function createNativeConstructionFeature(state: StatePort, ledger = createConstructionReservationLedger()): RoomFeature {
  return { id: 'construction', scope: 'owned', urgency: 'background', interval: 1, run(context) {
    const config = context.config.values;
    if (!context.room.owned || !config.constructionEnabled) return;
    const deadline = Math.min(Game.cpu.getUsed() + config.constructionCpuBudget, Game.cpu.tickLimit * config.backgroundCpuFraction);
    const guard = () => Game.cpu.getUsed() < deadline;
    if (!guard() || !Game.rooms[context.room.name]?.controller?.my) return;
    const work = constructionWork(state, context.room.name, config, ledger);
    work?.advance({ entries: config.constructionEntries, attempts: config.constructionAttempts }, guard);
  } };
}
function constructionWork(state: StatePort, room: string, config: Readonly<RuntimeConfig>, ledger: ReturnType<typeof createConstructionReservationLedger>) {
  const plans = createPlanStore(state, room, Object.keys(CONTROLLER_STRUCTURES)), plan = plans.read();
  if (!plan.entries.length) return undefined;
  const ports = reservedConstructionPorts(room, nativeConstructionPorts(room, config.constructionRoomSites, config.constructionIncludeTerminalEnergy),
    ledger, () => Game.time, nativeConstructionSiteKeys);
  return createStoredConstructionCycle(createConstructionProgressStore(state, room), plans.read, ports,
    { types: constructionTypeOrder, ...(plan.provenance ? { bootstrapSpawn: plan.provenance.bootstrap.spawn } : {}) },
    () => Game.time, { attempts: config.constructionRetryAttempts, delay: config.constructionRetryDelay,
      maximumDelay: config.constructionRetryMaximumDelay });
}

export { createConstructionReservationLedger } from '../features/construction/reservation-ledger';
