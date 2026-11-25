export interface SpawnAdmission { kind: 'household-labor'; task: string }
export function validateSpawnAdmission(value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== 'object') throw new Error('Invalid spawn admission');
  const record = value as Partial<SpawnAdmission>;
  if (record.kind !== 'household-labor' || typeof record.task !== 'string' || !record.task.length || record.task.length > 300 || Object.keys(record).some(key => !['kind','task'].includes(key))) throw new Error('Invalid spawn admission');
}
