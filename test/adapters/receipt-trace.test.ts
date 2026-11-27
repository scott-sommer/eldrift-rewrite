import { expect,test } from 'vitest';
import { traceReceipts } from '../engine/receipt-trace';
import type { ReceiptTrace } from '../engine/receipt-trace';
import type { LogisticsRecord } from '../../src/features/logistics/request-schema';
const record = (amount = 5, owner = 'owner'): LogisticsRecord => ({ request: { id: 'request',owner } as LogisticsRecord['request'],cancelled: false,receipts: [{ id: 'settled',amount }] });
test('receipt observation clocks survive JSON reload and repeated/pruned records without invented timestamps',() => {
  const trace: ReceiptTrace = { amounts: {},bindings: {} }; traceReceipts([record()],trace,10);
  const saved = JSON.parse(JSON.stringify(trace)) as ReceiptTrace;
  traceReceipts([],saved,11); traceReceipts([record()],saved,12); expect(saved.observedAt).toEqual({ settled: 10 });
  expect(saved.amounts).toEqual({ settled: 5 });
  expect(() => traceReceipts([record(6)],saved,13)).toThrow('changed');
  expect(() => traceReceipts([record(5,'other')],saved,13)).toThrow('multiple');
});
test('missing historical clocks and invalid clocks refuse rather than using transfer-attempt time',() => {
  const trace: ReceiptTrace = { amounts: {},bindings: {} }; traceReceipts([record()],trace);
  expect(() => traceReceipts([record()],trace,20)).toThrow('invent');
  expect(() => traceReceipts([],trace,-1)).toThrow('clock');
});
