import { peekState } from '../../../../../persistence/versioned-state';
import { stateKey } from '../../../../../persistence/state-key';
import { taskSchema } from '../../../../../persistence/tasks/schema';
import { createTransferJournal } from '../../../../../features/logistics/transfer-journal';
import { logisticsQueueSchema } from '../../../../../features/logistics/request-schema';
import { validHaulingPayload } from '../../../../hauling-task';
import type { TransferAttempt } from '../../../../../capabilities/logistics/confirmation';
import type { LogisticsRequest } from '../../../../../capabilities/logistics/request';
import type { PaidHaulingForecastWorker } from '../service';
import type { PaidHaulingForecastSeed } from '../service';
import { haulingDefinitions } from '../opening';
import type { HomeConfirmedDelivery } from './model';
interface Candidate { worker: PaidHaulingForecastWorker; attempt: TransferAttempt; request: LogisticsRequest }
export function homeWorldReceiptCollector(seed: PaidHaulingForecastSeed) {
  const records = () => peekState(seed.state,stateKey('logistics-requests',seed.home),logisticsQueueSchema)?.records ?? [];
  return {
    capture() {
      const queue = records();
      return seed.workers.flatMap(worker => {
        const journal = createTransferJournal(seed.state,worker.unit).peek(), attempt = journal?.attempt;
        if (!attempt || journal!.acknowledged || attempt.kind !== 'transfer') return [];
        const task = peekState(seed.state,stateKey('tasks',worker.name),taskSchema(worker.name,haulingDefinitions))?.queue[0];
        if (!task || !validHaulingPayload(task.payload)) return [];
        const request = task.payload.request,record = queue.find(record => record.request.owner === request.owner && record.request.id === request.id);
        if (!record || record.receipts.some(receipt => receipt.id === attempt.id)) return [];
        return [{ worker,attempt,request }];
      });
    },
    confirmed(candidates: readonly Candidate[],tick: number): HomeConfirmedDelivery[] {
      const queue = records();
      return candidates.flatMap(({ worker,attempt,request }) => {
        const journal = createTransferJournal(seed.state,worker.unit).peek();
        if (!journal?.acknowledged || journal.attempt?.id !== attempt.id || journal.result?.status !== 'observed' || journal.result.amount <= 0) return [];
        const amount = journal.result.amount;
        const record = queue.find(record => record.request.owner === request.owner && record.request.id === request.id);
        if (!record?.receipts.some(receipt => receipt.id === attempt.id && receipt.amount === amount)) return [];
        return [{ source: worker.source,request: worker.name,id: attempt.id,energy: journal.result.amount,issuedAt: attempt.tick,tick }];
      });
    },
  };
}
