import { natural, object } from '../../assignment-validation';
import { validPlanningContext } from '../planning/validation';
import { validCandidateAssessment } from './assessment-validation';
import type { StartupCandidateEntry, StartupCandidateRecord } from './model';
export function candidateId(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
export function validCandidateRecord(value: unknown, home: string): value is StartupCandidateRecord {
  if (!object(value) || !validRecordHeader(value,home) || !Array.isArray(value.entries)) return false;
  if (JSON.stringify(value).length > 1048576) return false;
  return validEntries(value.entries,home,value.clock as number);
}
function validRecordHeader(value: Record<string,unknown>, home: string): boolean {
  return Object.keys(value).length === 4 && value.home === home && [value.revision,value.clock].every(natural);
}
function validEntries(entries: unknown[], home: string, clock: number): boolean {
  if (entries.length > 16 || !entries.every(entry => validEntry(entry,home,clock))) return false;
  return new Set((entries as StartupCandidateEntry[]).map(entry => entry.id)).size === entries.length;
}
function validEntry(value: unknown, home: string, clock: number): value is StartupCandidateEntry {
  if (!validPlanningContext(value,home,clock) || Object.keys(value).length !== 11) return false;
  const entry = value as unknown as StartupCandidateEntry;
  return validEntryMetadata(entry,clock) && validEntryIdentity(entry) && validCandidateAssessment(entry.assessment);
}
function validEntryMetadata(entry: StartupCandidateEntry, clock: number): boolean {
  return candidateId(entry.id) && natural(entry.recordedAt) && entry.recordedAt >= entry.observedAt && entry.recordedAt <= Math.min(clock,entry.expiresAt);
}
function validEntryIdentity(entry: StartupCandidateEntry): boolean {
  return typeof entry.inputIdentity === 'string' && entry.inputIdentity.length > 0 && entry.inputIdentity.length <= 262144
    && typeof entry.policyIdentity === 'string' && entry.policyIdentity.length <= 256;
}
