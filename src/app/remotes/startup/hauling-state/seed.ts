import { copyPlain } from '../../../../core/plain-data';
import { stateKey } from '../../../../persistence/state-key';
import { quantitySchema } from '../../../../persistence/quantities/schema';
import type { QuantityClaim } from '../../../../core/resources/quantity-claim';
import { logisticsQueueSchema } from '../../../../features/logistics/request-schema';
import type { LogisticsRecord } from '../../../../features/logistics/request-schema';
import { schema as journalSchema } from '../../../../features/logistics/transfer-journal';
import { taskSchema } from '../../../../persistence/tasks/schema';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
import { haulingDefinitions, normalizeHaulingOpening } from './opening';
import { peekState } from '../../../../persistence/versioned-state';
import type { PrivateHaulingRecord } from './private-state';
import { privateHaulingState, seedHaulingRecord } from './private-state';
export interface PaidHaulingForecastCourier { source: string; room: string; opening: PaidCourierOpening }
/** Seed one home once: shared requests and outside liabilities remain shared, not copied per source. */
export function createPaidHaulingForecastState(home: string, tick: number, couriers: readonly PaidHaulingForecastCourier[], claims: readonly QuantityClaim[], checkpoint?: readonly PrivateHaulingRecord[]) {
  validateInput(home, tick, couriers);
  const state = privateHaulingState(checkpoint), records = new Map<string, LogisticsRecord>();
  const workers = couriers.map(courier => {
    const observed = courier.opening.observed;
    if (checkpoint) return { source: courier.source,name: observed.name,unit: observed.unit,opening: copyPlain(courier.opening) };
    const normalized = normalizeHaulingOpening(home, courier.room, courier.opening);
    if (normalized.request) addRequest(records, normalized.request);
    if (normalized.journal) seedHaulingRecord(state,stateKey('logistics-attempts',observed.unit),journalSchema,normalized.journal);
    seedHaulingRecord(state,stateKey('tasks',observed.name),taskSchema(observed.name,haulingDefinitions),
      { unit: observed.name,queue: normalized.task ? [normalized.task] : [] });
    return { source: courier.source,name: observed.name,unit: observed.unit,opening: copyPlain(courier.opening) };
  });
  if (checkpoint) { validateRestoredState(state,home,workers); return { home,tick,state,workers }; }
  seedHaulingRecord(state,stateKey('logistics-requests',home),logisticsQueueSchema,{ records: [...records.values()] });
  seedHaulingRecord(state,'quantity-reservations/empire',quantitySchema,{ claims: copyPlain([...claims]) });
  return { home,tick,state,workers };
}
function validateInput(home: string, tick: number, couriers: readonly PaidHaulingForecastCourier[]): void {
  if (!home || !Number.isSafeInteger(tick) || tick < 0 || couriers.length > 64) throw new Error('Invalid forecast home boundary');
  if (couriers.some(courier => !courier.source || !courier.room || courier.opening.observed.observedAt !== tick)) throw new Error('Forecast opening clock mismatch');
  const names = couriers.map(courier => courier.opening.observed.name), units = couriers.map(courier => courier.opening.observed.unit);
  if (new Set(names).size !== names.length || new Set(units).size !== units.length || [...names,...units].some(value => !value)) {
    throw new Error('Duplicate forecast worker');
  }
}
function addRequest(records: Map<string, LogisticsRecord>, record: LogisticsRecord): void {
  const key = JSON.stringify([record.request.owner,record.request.id]), existing = records.get(key);
  if (!existing) { records.set(key,record); return; }
  if (JSON.stringify(existing.request) !== JSON.stringify(record.request)) throw new Error('Conflicting shared forecast request');
  for (const receipt of record.receipts) {
    const posted = existing.receipts.find(item => item.id === receipt.id);
    if (posted && posted.amount !== receipt.amount) throw new Error('Conflicting shared forecast receipt');
    if (!posted) existing.receipts.push(receipt);
  }
}

function validateRestoredState(state: ReturnType<typeof privateHaulingState>,home: string,workers: readonly { name: string; unit: string }[]): void {
  if (!peekState(state,stateKey('logistics-requests',home),logisticsQueueSchema) || !peekState(state,'quantity-reservations/empire',quantitySchema)) throw new Error('Incomplete private hauling checkpoint');
  for (const worker of workers) {
    if (!peekState(state,stateKey('tasks',worker.name),taskSchema(worker.name,haulingDefinitions))) throw new Error('Missing private hauling tasks');
    peekState(state,stateKey('logistics-attempts',worker.unit),journalSchema);
  }
}
