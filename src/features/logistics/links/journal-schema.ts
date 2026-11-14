import type { StateSchema } from '../../../persistence/versioned-state';
import { validateLogisticsRequest } from '../../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../../capabilities/logistics/request';
export interface LinkRecord {
  request: LogisticsRequest;
  issuedAt: number;
  lossRatio: number;
  status: 'pending' | 'confirmed' | 'not-transferred' | 'unknown' | 'rejected';
  receipt?: { observedAt: number; sent: number; receivedAfterLoss: number };
}
export interface LinkJournal { entries: LinkRecord[]; discarded: number }
function validRecord(value: unknown): value is LinkRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as LinkRecord;
  try { validateLogisticsRequest(record.request); } catch { return false; }
  if (record.request.resource !== 'energy' || record.request.expiresAt !== record.issuedAt + 1) return false;
  if (!validTiming(record)) return false;
  if (!['pending', 'confirmed', 'not-transferred', 'unknown', 'rejected'].includes(record.status)) return false;
  return validReceipt(record);
}
function validTiming(record: LinkRecord): boolean {
  return Number.isSafeInteger(record.issuedAt) && record.issuedAt >= 0 &&
    Number.isFinite(record.lossRatio) && record.lossRatio >= 0 && record.lossRatio <= 1;
}
function validReceipt(record: LinkRecord): boolean {
  const receipt = record.receipt;
  if (record.status !== 'confirmed') return receipt === undefined;
  if (!receipt || receipt.observedAt !== record.issuedAt + 1) return false;
  return Number.isSafeInteger(receipt.sent) && receipt.sent > 0 && receipt.sent <= record.request.quantity &&
    receipt.receivedAfterLoss === receipt.sent - Math.ceil(receipt.sent * record.lossRatio);
}
export const linkJournalSchema: StateSchema<LinkJournal> = {
  owner: 'logistics', version: 1, initial: () => ({ entries: [], discarded: 0 }), migrations: {},
  valid(value: unknown): value is LinkJournal {
    if (!value || typeof value !== 'object') return false;
    const data = value as LinkJournal;
    return Number.isSafeInteger(data.discarded) && data.discarded >= 0 && Array.isArray(data.entries) &&
      data.entries.length <= 100 && data.entries.every(validRecord) &&
      new Set(data.entries.map(entry => entry.request.id)).size === data.entries.length;
  },
};
