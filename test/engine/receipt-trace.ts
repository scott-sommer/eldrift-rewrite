import type { LogisticsRecord } from '../../src/features/logistics/request-schema';
export interface ReceiptTrace { amounts: Record<string,number>; bindings: Record<string,string> }
/** Test evidence survives pruning, while rejecting cross-request or changed credit identities. */
export function traceReceipts(records: readonly LogisticsRecord[], trace: ReceiptTrace): void {
  for (const record of records) for (const receipt of record.receipts) {
    const binding = JSON.stringify([record.request.owner,record.request.id]), id = receipt.id;
    if (Object.hasOwn(trace.bindings,id) && trace.bindings[id] !== binding) throw new Error('One receipt credited multiple requests');
    if (Object.hasOwn(trace.amounts,id) && trace.amounts[id] !== receipt.amount) throw new Error('Receipt amount changed after credit');
    trace.amounts[id] = receipt.amount; trace.bindings[id] = binding;
  }
}
