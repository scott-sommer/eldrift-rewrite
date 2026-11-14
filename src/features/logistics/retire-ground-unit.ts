import { openState, saveState, type RemovableStatePort, type StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { groundJournalSchema, type GroundJournal } from './ground-journal';
interface Evidence { unit: string; journal: GroundJournal }
interface Archive { entries: Evidence[]; discarded: number }
const archiveKey = 'ground-retired/empire';
const schema: StateSchema<Archive> = {
  owner: 'ground-delivery', version: 1, migrations: {}, initial: () => ({ entries: [], discarded: 0 }),
  valid(value: unknown): value is Archive {
    if (!value || typeof value !== 'object') return false;
    const archive = value as Archive;
    return Number.isSafeInteger(archive.discarded) && archive.discarded >= 0 && Array.isArray(archive.entries)
      && archive.entries.length <= 50 && archive.entries.every(validEvidence)
      && new Set(archive.entries.map(entry => entry.unit)).size === archive.entries.length;
  },
};
function validEvidence(entry: Evidence): boolean {
  return !!entry && typeof entry.unit === 'string' && entry.unit.length > 0 && groundJournalSchema.valid(entry.journal)
    && entry.journal.attempt?.unit === entry.unit;
}
/** Preserve the last ground outcome before deleting state belonging to the retired native identity. */
export function retireGroundUnit(state: RemovableStatePort, unit: string): void {
  const key = stateKey('ground-delivery', unit);
  if (state.read(key) === undefined) return;
  const journal = openState(state, key, groundJournalSchema);
  if (journal.attempt) archiveEvidence(state, { unit, journal });
  state.remove(key, groundJournalSchema.owner);
}
function archiveEvidence(state: RemovableStatePort, evidence: Evidence): void {
  const archive = openState(state, archiveKey, schema);
  if (archive.entries.some(entry => entry.unit === evidence.unit)) return;
  archive.entries.push(evidence);
  if (archive.entries.length > 50) { archive.entries.shift(); archive.discarded++; }
  saveState(state, archiveKey, schema, archive);
}
