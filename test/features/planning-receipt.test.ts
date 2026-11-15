import { expect, test } from 'vitest';
import { validPlanningReceipt } from '../../src/features/planning/planning-receipt';
const receipt = { signature: 'job', planRevision: 1, completedAt: 2, outcome: 'no-valid-candidate' };
test('historical receipts remain readable and diagnostic counters are consistent', () => {
  expect(validPlanningReceipt(receipt)).toBe(true);
  expect(validPlanningReceipt({ ...receipt, diagnostics: { evaluated: 2, rejected: 1,
    lastRejection: { id: 'candidate', reason: 'blocked' } } })).toBe(true);
  for (const diagnostics of [null, {}, { evaluated: 1, rejected: 2 },
    { evaluated: 1.5, rejected: 0 }, { evaluated: 10001, rejected: 0 },
    { evaluated: 1, rejected: 0, lastRejection: { id: 'candidate', reason: 'blocked' } },
    { evaluated: 1, rejected: 1, lastRejection: { id: '', reason: 'blocked' } },
    { evaluated: 1, rejected: 1, lastRejection: { id: 'candidate', reason: '' } }]) {
    expect(validPlanningReceipt({ ...receipt, diagnostics })).toBe(false);
  }
});
