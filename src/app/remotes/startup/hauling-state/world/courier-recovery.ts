import { createForecastRemoteBanking } from '../../banking-state/service';
import type { createPaidHaulingMovement } from '../movement/frame';
import type { PaidHaulingForecastWorker } from '../service';
import type { PlannedMovementCommand } from '../../../../../capabilities/movement/fixed-step';
import type { HomeHaulingInput,HomeWorldEnvironment,HomeWorldShared } from './model';
/** Current banking and recovery policy composed over shared physical movement, never opening-token replay. */
export function createHomeCourierRecovery(home: HomeHaulingInput,shared: HomeWorldShared,environment: HomeWorldEnvironment,movement: ReturnType<typeof createPaidHaulingMovement>) {
  const options = environment.courierBanking;
  if (!options) return {};
  const bank = createForecastRemoteBanking(home.home,shared,{ ...options.environment,
    eventsVisible: (_worker,attempt) => environment.visible(attempt.room,shared.inventory.tick()) },options.policy);
  return { banking: { ...bank,prepare(worker: PaidHaulingForecastWorker,definitions: Parameters<typeof bank.prepare>[1]) {
    const mode = bank.prepare(worker,definitions);
    if (mode === 'bank') movement.handoff(worker.name);
    return mode;
  } },retire(worker: PaidHaulingForecastWorker): void {
    movement.handoff(worker.name);
    options.environment.retire(worker,home.home,'remote-transport-return:'+worker.name);
  },resume(worker: PaidHaulingForecastWorker,command: PlannedMovementCommand): boolean {
    if (movement.resume(worker.name)) return true;
    if (!options.rejoin) throw new Error('Missing modelled courier productive reentry path');
    options.rejoin(worker,command); return false;
  } };
}
