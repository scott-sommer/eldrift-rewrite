import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import type { EmpireFeature, EmpireFeatureContext } from './runtime-model';
import type { SchedulerPorts } from '../core/scheduling/model';
import { createIntelStore } from '../features/intel/store';
import { createCaptureProgressStore } from '../features/intel/capture-store';
import { captureIntelCycle } from '../features/intel/capture-cycle';
import { observeNativeIntel } from './native-intel-observation';
/** Capture consumes existing vision; scout and observer demand are separate policies. */
export function createNativeIntelFeature(state: StatePort, failures: Pick<SchedulerPorts, 'reportFailure'>): EmpireFeature {
  return { id: 'intel-capture', scope: 'empire', urgency: 'background', interval: 1, run(context) {
    const config = context.config.values;
    if (![...context.rooms.values()].some(room => room.values.intelEnabled)) return;
    if (!config.intelCaptureScans || !config.intelCaptureRooms || !config.intelCaptureCpuBudget) return;
    const deadline = Math.min(Game.cpu.getUsed() + config.intelCaptureCpuBudget, Game.cpu.tickLimit * config.backgroundCpuFraction);
    const guard = () => Game.cpu.getUsed() < deadline;
    if (!guard()) return;
    capture(context, state, failures, guard);
  } };
}
function capture(context: EmpireFeatureContext, state: StatePort, failures: Pick<SchedulerPorts, 'reportFailure'>,
  guard: () => boolean): void {
  const store = createIntelStore(state), tick = context.world.tick, config = context.config.values;
  captureIntelCycle([...context.world.rooms.keys()], tick, { scans: config.intelCaptureScans, attempts: config.intelCaptureRooms }, {
    progress: createCaptureProgressStore(state),
    policy: room => {
      const values = context.rooms.get(room)!.values;
      return { enabled: roomEnabled(values), interval: values.intelCaptureInterval };
    },
    latest: room => {
      const view = store.peek(room, tick, context.rooms.get(room)!.values.intelMaximumAge);
      const failure = view.record.lastFailure;
      return { seen: view.record.lastSeen, stale: view.freshness !== 'fresh',
        failedAt: failure?.id.startsWith('intel-capture:') ? failure.tick : null };
    },
    capture: room => {
      const summary = observeNativeIntel(room);
      if (!summary) return false;
      store.observeSummary(summary);
      return true;
    },
    failure: (room, error) => {
      try { store.recordFailure(room, { id: `intel-capture:${room}:${tick}`, tick, reason: failureReason(error) }); }
      finally { failures.reportFailure({ id: 'intel-capture', room, tick, error }); }
    },
  }, guard);
}
function failureReason(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 256) || 'Intel capture failed';
}

function roomEnabled(config: Readonly<RuntimeConfig>): boolean {
  return config.intelEnabled && config.backgroundEnabled && Game.cpu.bucket >= config.minimumBucket
    && Game.cpu.getUsed() < Game.cpu.tickLimit * config.backgroundCpuFraction;
}
