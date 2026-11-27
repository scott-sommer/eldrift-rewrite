import type { LogisticsRecord } from '../../src/features/logistics/request-schema';
export interface ReceiptTrace { amounts: Record<string,number>; bindings: Record<string,string>; observedAt?: Record<string,number> }
/** Test evidence survives pruning, while rejecting cross-request or changed credit identities. */
export function traceReceipts(records: readonly LogisticsRecord[], trace: ReceiptTrace, tick?: number): void {
  if (tick !== undefined && (!Number.isSafeInteger(tick) || tick < 0)) throw new Error('Invalid receipt observation clock');
  for (const record of records) for (const receipt of record.receipts) {
    const binding = JSON.stringify([record.request.owner,record.request.id]), id = receipt.id;
    if (Object.hasOwn(trace.bindings,id) && trace.bindings[id] !== binding) throw new Error('One receipt credited multiple requests');
    if (Object.hasOwn(trace.amounts,id) && trace.amounts[id] !== receipt.amount) throw new Error('Receipt amount changed after credit');
    if (tick !== undefined) noteObservation(trace,id,tick);
    trace.amounts[id] = receipt.amount; trace.bindings[id] = binding;
  }
}

function noteObservation(trace: ReceiptTrace, id: string, tick: number): void {
  const observations = trace.observedAt ??= {};
  if (Object.hasOwn(trace.amounts,id) && !Object.hasOwn(observations,id)) throw new Error('Cannot invent a past receipt observation');
  if (!Object.hasOwn(observations,id)) observations[id] = tick;
}
