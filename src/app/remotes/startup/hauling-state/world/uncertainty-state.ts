import { schema as uncertaintySchema } from '../../../../../features/logistics/uncertainty';
import type { Incidents } from '../../../../../features/logistics/uncertainty';
import { peekState } from '../../../../../persistence/versioned-state';
import type { StatePort } from '../../../../../persistence/versioned-state';
import { validateHaulingBinding } from '../../../../settle-hauling-transfer';
import type { HomeHaulingInput } from './model';
/** Historical uncertainty is evidence, not income; validate it even when no task remains. */
export function validateHomeTransferIncidents(input: HomeHaulingInput,state: StatePort,nextTick: number): void {
  for (const source of input.sources) {
    const units = [...source.miners.map(miner => miner.observation.unit),...source.couriers.map(courier => courier.opening.observed.unit)];
    for (const unit of units) {
      const incidents = peekState(state,'logistics-uncertainty/'+unit,uncertaintySchema);
      validateTransferIncidents(incidents,unit,nextTick,input.home);
    }
  }
}
export function validateTransferIncidents(incidents: Incidents | null | undefined,unit: string,nextTick: number,home?: string): void {
  for (const incident of incidents?.entries ?? []) {
    if (incident.attempt.unit !== unit || (home !== undefined && incident.home !== home)) throw new Error('Home checkpoint uncertainty binding mismatch');
    if (incident.tick >= nextTick) throw new Error('Home checkpoint uncertainty clock mismatch');
    validateHaulingBinding(incident.attempt,{ home: incident.home,unit,request: incident.request });
  }
}
