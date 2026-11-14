import type { RemovableStatePort, StateSchema } from '../../persistence/versioned-state';
import { openState, saveState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { schema as journalSchema } from './transfer-journal';
import type { Journal } from './transfer-journal';
import { schema as incidentSchema } from './uncertainty';
import type { Incidents } from './uncertainty';
interface RetiredEvidence { unit: string; journal: Journal | null; incidents: Incidents | null }
interface Archive { entries: RetiredEvidence[]; discarded: number }
const archiveKey = 'logistics-retired/empire';
const archiveSchema: StateSchema<Archive> = {
  owner: 'logistics', version: 1, initial: () => ({ entries: [], discarded: 0 }), migrations: {},
  valid(value: unknown): value is Archive {
    if (!value || typeof value !== 'object') return false;
    const record = value as Archive;
    return Number.isSafeInteger(record.discarded) && record.discarded >= 0 && Array.isArray(record.entries)
      && record.entries.length <= 50 && record.entries.every(validEvidence)
      && new Set(record.entries.map(entry => entry.unit)).size === record.entries.length;
  },
};
function validEvidence(entry: RetiredEvidence): boolean {
  return !!entry && typeof entry.unit === 'string' && entry.unit.length > 0
    && (entry.journal === null || journalSchema.valid(entry.journal))
    && (entry.incidents === null || incidentSchema.valid(entry.incidents));
}
/** Archive before deletion; bounded lifecycle retirement supplies the previous native ID, never a reused name. */
export function retireLogisticsUnit(state: RemovableStatePort, unit: string): void {
  const journalKey = stateKey('logistics-attempts', unit);
  const incidentKey = stateKey('logistics-uncertainty', unit);
  const journal = state.read(journalKey) === undefined ? null : openState(state, journalKey, journalSchema);
  const incidents = state.read(incidentKey) === undefined ? null : openState(state, incidentKey, incidentSchema);
  if (journal === null && incidents === null) return;
  const archive = openState(state, archiveKey, archiveSchema);
  if (!archive.entries.some(entry => entry.unit === unit)) {
    archive.entries.push({ unit, journal, incidents });
    if (archive.entries.length > 50) { archive.entries.shift(); archive.discarded++; }
    saveState(state, archiveKey, archiveSchema, archive);
  }
  state.remove(journalKey, 'logistics');
  state.remove(incidentKey, 'logistics');
}
