import type { TaskRecord } from '../../../../persistence/tasks/schema';
import type { TransferAttempt, TransferObservation } from '../../../../capabilities/logistics/confirmation';
import type { Outcome } from '../../../../core/execution/model';
import type { HaulingBinding, HaulingPorts } from '../../../hauling-cycle';
import type { HaulingTaskPorts, HaulingTaskPayload } from '../../../hauling-task';
import { createHaulingTaskBehavior } from '../../../hauling-task';
import { createTaskRunner } from '../../../task-runner';
import { settleHaulingTask } from '../../../settle-hauling-task';
import { submitHaulingTask } from '../../../submit-hauling-task';
import type { NewHaulingTask } from '../../../submit-hauling-task';
import { remoteTransportTasks } from '../../transport-tasks';
import type { createPaidHaulingForecastState } from './seed';
export type PaidHaulingForecastSeed = ReturnType<typeof createPaidHaulingForecastState>;
export type PaidHaulingForecastWorker = PaidHaulingForecastSeed['workers'][number];
export type PaidHaulingAdmission = Omit<NewHaulingTask, 'home' | 'name' | 'unitId' | 'tick'>;
export interface PaidHaulingServicePorts extends Pick<HaulingTaskPorts<PaidHaulingForecastWorker>, 'view'> {
  /** Current-frame physical observation, including past effects already applied by the world owner. */
  observe(worker: PaidHaulingForecastWorker, attempt: TransferAttempt): TransferObservation;
  execution(worker: PaidHaulingForecastWorker, binding: HaulingBinding): Pick<HaulingPorts, 'execute'>;
  /** Admission policy may stage an idle body; assigned work never visits this port in the same frame. */
  recruit(worker: PaidHaulingForecastWorker, tick: number): PaidHaulingAdmission | undefined;
  refused(worker: PaidHaulingForecastWorker, tick: number): void;
  /** May stage an empty worker toward an unseen source; false retains the existing task without executing it. */
  prepare(worker: PaidHaulingForecastWorker, payload: HaulingTaskPayload): boolean;
  /** Authority and lifecycle are checked before productive execution; cleanup remains explicit. */
  authorized(worker: PaidHaulingForecastWorker, payload: HaulingTaskPayload): boolean;
}
export interface PaidHaulingVisit { name: string; work: boolean }
export interface PaidHaulingServiceResult { name: string; status: 'executed' | 'waiting' | 'preparing' | 'deferred' | 'idle' | 'refused'; outcome?: Outcome }
/** Task ownership only. The caller supplies the shared physical world and flushes its intents after all actors. */
export function createPaidHaulingForecastService(seed: PaidHaulingForecastSeed, ports: PaidHaulingServicePorts) {
  const workers = new Map(seed.workers.map(worker => [worker.name, worker]));
  const home = seed.home;
  let tick = seed.tick-1, failed = false;
  function observe(worker: PaidHaulingForecastWorker, attempt: TransferAttempt): TransferObservation {
    const observation = ports.observe(worker,attempt);
    if (observation.tick !== tick) throw new Error('Hauling observation frame mismatch');
    return observation;
  }
  const behavior = createHaulingTaskBehavior<PaidHaulingForecastWorker>(seed.state, {
    identity: worker => ({ id: worker.unit,name: worker.name }),
    view(worker,payload) {
      const view = ports.view(worker,payload);
      if (view.tick !== tick) throw new Error('Hauling view frame mismatch');
      return view;
    },
    execution: (worker,binding) => ({ ...ports.execution(worker,binding),observe: attempt => observe(worker,attempt) }),
  });
  const definitions = { haul: behavior }, tasks = remoteTransportTasks(seed.state, definitions, home);
  const execute = createTaskRunner(seed.state, definitions, () => tick);
  function visit(worker: PaidHaulingForecastWorker, work: boolean): PaidHaulingServiceResult {
    const head = tasks.head(worker.name), payload = tasks.payload(head);
    if (head && !payload) throw new Error('Unsupported forecast task');
    if (head && payload) {
      return existing(worker,head,payload,work);
    }
    if (!work) return { name: worker.name,status: 'deferred' };
    return recruit(worker);
  }
  function existing(worker: PaidHaulingForecastWorker, head: TaskRecord, payload: HaulingTaskPayload, work: boolean): PaidHaulingServiceResult {
    settleHaulingTask(seed.state, definitions, { id: worker.unit,name: worker.name }, attempt => observe(worker,attempt));
    if (tasks.pending(worker.unit)) return { name: worker.name,status: 'waiting' };
    if (!ports.authorized(worker,payload)) throw new Error('Forecast productive authority invalidated');
    if (!work) return { name: worker.name,status: 'deferred' };
    if (!ports.prepare(worker,payload)) return { name: worker.name,status: 'preparing' };
    const outcome = execute(worker.name,worker);
    if (!tasks.head(worker.name)) tasks.close(head);
    return { name: worker.name,status: 'executed',...(outcome ? { outcome } : {}) };
  }
  function recruit(worker: PaidHaulingForecastWorker): PaidHaulingServiceResult {
    const candidate = ports.recruit(worker,tick);
    if (!candidate) return { name: worker.name,status: 'idle' };
    if (!ports.authorized(worker,{ home,unitId: worker.unit,request: candidate.request,...(candidate.sinkRoom ? { sinkRoom: candidate.sinkRoom } : {}) })) {
      throw new Error('Forecast admission authority invalidated');
    }
    const admitted = submitHaulingTask(seed.state,definitions,{ ...candidate,home,name: worker.name,unitId: worker.unit,tick });
    if (!admitted) { ports.refused(worker,tick); return { name: worker.name,status: 'refused' }; }
    const outcome = execute(worker.name,worker);
    return { name: worker.name,status: 'executed',...(outcome ? { outcome } : {}) };
  }
  return {
    step(frame: number, visits: readonly PaidHaulingVisit[]): PaidHaulingServiceResult[] {
      if (failed) throw new Error('Cannot resume failed hauling service');
      validateFrame(frame,tick,visits,workers);
      tick = frame;
      try { return visits.map(entry => visit(workers.get(entry.name)!,entry.work)); }
      catch (error) { failed = true; throw error; }
    },
  };
}
function validateFrame(frame: number, previous: number, visits: readonly PaidHaulingVisit[], workers: ReadonlyMap<string,PaidHaulingForecastWorker>): void {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame !== previous+1) throw new Error('Nonconsecutive hauling service frame');
  if (visits.length > workers.size || new Set(visits.map(visit => visit.name)).size !== visits.length) throw new Error('Duplicate hauling service visit');
  if (visits.some(visit => !workers.has(visit.name) || typeof visit.work !== 'boolean')) throw new Error('Invalid hauling service visit');
}
