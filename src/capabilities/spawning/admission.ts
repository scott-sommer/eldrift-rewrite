export interface SpawnAdmission { kind: 'household-labor'; task: string; publication?: true }
export function validateSpawnAdmission(value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== 'object') throw new Error('Invalid spawn admission');
  const record = value as Partial<SpawnAdmission>;
  if (record.publication !== undefined && record.publication !== true) throw new Error('Invalid spawn publication authority');
  if (record.kind !== 'household-labor' || !validTaskIdentity(record.task) || !validAdmissionKeys(record)) throw new Error('Invalid spawn admission');
}

function validAdmissionKeys(record: object): boolean {
  return Object.keys(record).every(key => ['kind','task','publication'].includes(key));
}

function validTaskIdentity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 300;
}
