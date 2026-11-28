import { observePhysicalTransfer } from './transfer-observation';
import type { EnergyInventory } from '../../../../capabilities/resources/energy-inventory/model';
import type { createActionArbiter } from '../../../../core/execution/action-arbiter';
import type { Outcome } from '../../../../core/execution/model';
import type { IntentResult } from '../../../../core/execution/action-arbiter';
import { transferStep } from '../../../../capabilities/resources/step';
import type { EnergyInventoryFrame } from '../../../../capabilities/resources/energy-inventory/frame';
import type { TransferAttempt } from '../../../../capabilities/logistics/confirmation';
import type { LogisticsRequest } from '../../../../capabilities/logistics/request';
import type { Position } from '../../../../capabilities/movement/step';
import type { StatePort } from '../../../../persistence/versioned-state';
import { createTransferJournal } from '../../../../features/logistics/transfer-journal';
import type { HaulingBinding } from '../../../hauling-cycle';
import type { HaulingTaskPayload } from '../../../hauling-task';
import type { PaidHaulingForecastWorker } from './service';
export interface ForecastHaulingUnit { name: string; unit: string }
export interface ForecastHaulingTransferPorts<Worker extends ForecastHaulingUnit = PaidHaulingForecastWorker> {
  position(worker: Worker): Position;
  eventsVisible?(worker: Worker,attempt: TransferAttempt): boolean;
  target(worker: Worker, request: LogisticsRequest, phase: 'collect' | 'deliver'): { status: 'visible' | 'unseen' | 'missing'; inRange: boolean; accepting: boolean };
  approach(worker: Worker, binding: HaulingBinding, request: LogisticsRequest, phase: 'collect' | 'deliver'): Outcome;
  capacityPool(target: string): string;
}
/** Real transfer mechanism and journal, with intents restricted to the private shared physical inventory. */
export function createForecastHaulingTransfer<Worker extends ForecastHaulingUnit>(state: StatePort, inventory: Pick<EnergyInventoryFrame,'tick' | 'observe' | 'queue' | 'effect'>, arbiter: Pick<ReturnType<typeof createActionArbiter>, 'issue'>, ports: ForecastHaulingTransferPorts<Worker>) {
  function stock(id: string) { const value = inventory.observe(id); if (!value) throw new Error('Missing forecast inventory: '+id); return value; }
  function issue(worker: Worker, binding: HaulingBinding, request: LogisticsRequest,
    phase: 'collect' | 'deliver', amount: number, attemptId: string, requestKey: string): IntentResult {
    const collect = phase === 'collect', kind = collect ? 'withdraw' : 'transfer';
    const attempt: TransferAttempt = { id: attemptId,requestKey,unit: worker.unit,target: collect ? request.source : request.sink,
      room: ports.position(worker).room,resource: 'energy',kind,tick: inventory.tick(),amount,cargoBefore: stock(worker.unit).energy };
    if (!createTransferJournal(state,worker.unit).begin(attempt)) return { status: 'blocked',reason: 'action-conflict' };
    return arbiter.issue(worker.name,binding.scope,[kind],() => {
      inventory.queue({ id: attemptId,kind,source: collect ? request.source : worker.unit,target: collect ? worker.unit : request.sink,amount });
      return 0;
    }, code => code === 0);
  }
  function physicalView(worker: Worker, request: LogisticsRequest, phase: 'collect' | 'deliver', maximum: number) {
    const target = ports.target(worker,request,phase), unit = stock(worker.unit);
    const endpoint = inventory.observe(phase === 'collect' ? request.source : request.sink);
    if (target.status === 'visible' && !endpoint) throw new Error('Missing visible forecast endpoint');
    return { tick: inventory.tick(),complete: false,target: target.status,inRange: target.inRange,
      available: phase === 'collect' ? endpoint?.energy ?? 0 : unit.energy,
      capacity: phase === 'collect' ? unit.freeEnergyCapacity : receivingCapacity(target,endpoint),remaining: maximum };
  }
  return {
    view(worker: Worker, payload: HaulingTaskPayload) {
      const request = payload.request, unit = stock(worker.unit), target = ports.target(worker,request,'deliver'), source = ports.target(worker,request,'collect');
      return { tick: inventory.tick(),cargo: unit.energy,freeCargo: unit.freeEnergyCapacity,sourceStock: source.status === 'visible' ? inventory.observe(request.source)?.energy ?? 0 : 0,
        sinkFree: receivingCapacity(target,inventory.observe(request.sink)),sinkPool: ports.capacityPool(request.sink),minimumCollection: 0,sinkStatus: target.status };
    },
    observe(worker: Worker, attempt: TransferAttempt) {
      return observePhysicalTransfer(inventory,attempt,ports.eventsVisible?.(worker,attempt) ?? true);
    },
    execution(worker: Worker, binding: HaulingBinding) {
      return { execute(request: LogisticsRequest, phase: 'collect' | 'deliver', maximum: number, attemptId: string, requestKey: string): Outcome {
        if (request.resource !== 'energy' || !Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid forecast energy transfer');
        return transferStep(physicalView(worker,request,phase,maximum), {
          approach: () => ports.approach(worker,binding,request,phase),
          transfer: amount => issue(worker,binding,request,phase,amount,attemptId,requestKey),
          rejected: code => ({ status: 'blocked',reason: 'transfer-intent:'+code,retryAt: inventory.tick()+1 }),
        });
      } };
    },
  };
}
function receivingCapacity(target: { status: 'visible' | 'unseen' | 'missing'; accepting: boolean }, endpoint: EnergyInventory | undefined): number {
  if (target.status !== 'visible' || !target.accepting) return 0;
  return endpoint?.freeEnergyCapacity ?? 0;
}
