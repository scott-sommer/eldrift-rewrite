import { openState, saveState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { linkJournalSchema } from './journal-schema';
import type { LinkRecord } from './journal-schema';
import type { LogisticsRequest } from '../../../capabilities/logistics/request';
export interface LinkEvent { source: string; sink: string; resource: string; amount: number }
/** Bounded, write-before-intent evidence; links never enter the creep-executable request queue. */
export function createLinkJournal(state: StatePort, room: string) {
  const key = stateKey('link-transfers', room);
  const read = () => openState(state, key, linkJournalSchema);
  return {
    read,
    prepare(request: LogisticsRequest, issuedAt: number, lossRatio: number): boolean {
      const data = read();
      if (data.entries.some(entry => entry.request.id === request.id)) return false;
      if (data.entries.length === 100) {
        const removable = data.entries.findIndex(entry => entry.status !== 'pending');
        if (removable < 0) return false;
        data.entries.splice(removable, 1); data.discarded++;
      }
      data.entries.push({ request, issuedAt, lossRatio, status: 'pending' });
      saveState(state, key, linkJournalSchema, data);
      return true;
    },
    reject(id: string): void {
      const data = read();
      const entry = data.entries.find(item => item.request.id === id);
      if (!entry || entry.status !== 'pending') return;
      entry.status = 'rejected';
      saveState(state, key, linkJournalSchema, data);
    },
    settle(tick: number, events: readonly LinkEvent[] | undefined): void {
      const data = read();
      for (const entry of data.entries) {
        if (entry.status === 'pending' && tick > entry.issuedAt) settleEntry(entry, tick, events);
      }
      saveState(state, key, linkJournalSchema, data);
    },
  };
}
function settleEntry(entry: LinkRecord, tick: number, events: readonly LinkEvent[] | undefined): void {
  if (tick !== entry.issuedAt + 1 || !events) { entry.status = 'unknown'; return; }
  const matches = events.filter(event => event.source === entry.request.source && event.sink === entry.request.sink && event.resource === 'energy');
  if (matches.length === 0) { entry.status = 'not-transferred'; return; }
  const sent = matches[0]!.amount;
  if (matches.length !== 1 || !Number.isSafeInteger(sent) || sent <= 0 || sent > entry.request.quantity) { entry.status = 'unknown'; return; }
  entry.status = 'confirmed';
  entry.receipt = { observedAt: tick, sent, receivedAfterLoss: sent - Math.ceil(sent * entry.lossRatio) };
}
