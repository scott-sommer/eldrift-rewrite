import { observerHomeEnabled } from './native-observer-admission';
import type { EmpireFeature } from './runtime-model';
import type { StatePort } from '../persistence/versioned-state';
import type { SchedulerPorts } from '../core/scheduling/model';
import type { createNativeStructureActions } from '../adapters/screeps/structure-actions';
import { createObservationStore } from '../features/intel/observation/store';
import { settleObservations, dispatchObservations } from '../features/intel/observation/cycle';
import type { ObservationCyclePorts } from '../features/intel/observation/cycle';
import { createIntelStore } from '../features/intel/store';
import { observeNativeIntel } from './native-intel-observation';
import { refreshNativeObservers } from './native-observer-demand';
/** Delayed visibility capture is urgent; optional future vision shares explicit empire admission. */
export function createNativeObservers(state: StatePort, actions: Pick<ReturnType<typeof createNativeStructureActions>, 'observe'>,
  failures: Pick<SchedulerPorts, 'reportFailure'>): EmpireFeature {
  const store = createObservationStore(state), intel = createIntelStore(state);
  return { id: 'observers', scope: 'empire', urgency: 'urgent', interval: 1, run(context) {
    const config = context.config.values, tick = context.world.tick, saved = store.read();
    if (!saved.requests.length && !saved.flights.length && ![...context.rooms.values()].some(room => room.values.observersEnabled)) return;
    if (!config.observerCpuBudget || !config.observerScanBudget) return;
    const deadline = Math.min(Game.cpu.getUsed() + config.observerCpuBudget, Game.cpu.tickLimit);
    const guard = () => Game.cpu.getUsed() < deadline;
    const background = () => guard() && config.backgroundEnabled && Game.cpu.bucket >= config.minimumBucket
      && Game.cpu.getUsed() < Game.cpu.tickLimit * config.backgroundCpuFraction;
    const ports: ObservationCyclePorts = {
      store, capture(room) {
        const summary = observeNativeIntel(room);
        if (!summary) return false;
        intel.observeSummary(summary);
        return true;
      },
      issue(id, request) {
        const observer = Game.getObjectById(id as Id<StructureObserver>);
        return observer?.structureType === STRUCTURE_OBSERVER
          ? actions.observe(observer, request.room, request.owner) : ERR_INVALID_TARGET;
      },
      failure(request, error) { failures.reportFailure({ id: `observer/${request.id}`, room: request.room, tick, error }); },
    };
    const budget = { scans: config.observerScanBudget, captures: config.observerCaptureBudget, issues: config.observerVisionBudget };
    const settled = settleObservations(tick, budget, ports, guard);
    const units = context.world.ownedRooms.flatMap(home => (home.structuresByType.get('observer') ?? [])
      .filter(structure => structure.owned).map(structure => ({ id: structure.id, home: home.name })));
    const enabled = (home: string) => observerHomeEnabled(context.rooms.get(home)?.values);
    const remaining = budget.scans - settled.scanned;
    const refreshReads = remaining === 1 && !store.read().requests.length ? 1 : Math.floor(remaining / 2);
    const scans = settled.scanned + (budget.issues && budget.captures
      ? refreshNativeObservers(context, units, store, refreshReads, enabled, background) : 0);
    dispatchObservations(tick, { ...budget, scans: budget.scans - scans, issues: Math.min(budget.issues, budget.captures) }, units, ports,
      enabled, background);
  } };
}
