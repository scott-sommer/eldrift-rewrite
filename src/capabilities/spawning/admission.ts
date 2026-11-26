export interface HouseholdLaborAdmission { kind: 'household-labor'; task: string; publication?: true }
export interface RemoteStartupAdmission { kind: 'remote-startup'; generation: number; observedAt: number }
export type SpawnAdmission = HouseholdLaborAdmission | RemoteStartupAdmission;
export function validateSpawnAdmission(value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid spawn admission');
  const record = value as Record<string,unknown>;
  if (record.kind === 'remote-startup') {
    validateRemoteAdmission(record);
    return;
  }
  validateHouseholdAdmission(record);
}
function validateRemoteAdmission(record: Record<string,unknown>): void {
  if (!natural(record.generation) || !natural(record.observedAt) || !validKeys(record,['kind','generation','observedAt'])) throw new Error('Invalid remote startup admission');
}
function validateHouseholdAdmission(record: Record<string,unknown>): void {
  if (record.publication !== undefined && record.publication !== true) throw new Error('Invalid spawn publication authority');
  if (record.kind !== 'household-labor' || !validTaskIdentity(record.task) || !validKeys(record,['kind','task','publication'])) throw new Error('Invalid spawn admission');
}
function validKeys(record: object, allowed: readonly string[]): boolean { return Object.keys(record).every(key => allowed.includes(key)); }
function natural(value: unknown): boolean { return Number.isSafeInteger(value) && Number(value) >= 0; }
function validTaskIdentity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 300;
}
export function sameSpawnAdmission(a: SpawnAdmission | undefined, b: SpawnAdmission | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'remote-startup') return b.kind === a.kind && a.generation === b.generation && a.observedAt === b.observedAt;
  return b.kind === a.kind && a.task === b.task && a.publication === b.publication;
}
