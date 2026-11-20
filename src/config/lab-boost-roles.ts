export interface LabBoostRole { lab: string; resource: string; mineral: number; energy: number }
export interface LabBoostRoleConfig { labBoostRoles: readonly LabBoostRole[] }
function amount(value: unknown,maximum: number): boolean { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum; }
function validRole(value: unknown): value is LabBoostRole {
  if (!value || typeof value !== 'object') return false;
  const role = value as LabBoostRole;
  if (!Object.keys(value).every(key => ['lab','resource','mineral','energy'].includes(key))) return false;
  return typeof role.lab === 'string' && role.lab.length > 0 && role.lab.length <= 100
    && typeof role.resource === 'string' && /^[A-Za-z0-9]{1,20}$/.test(role.resource) && amount(role.mineral,3000) && amount(role.energy,2000);
}
export function validBoostRoles(value: unknown): value is LabBoostRole[] {
  return Array.isArray(value) && value.length <= 10 && value.every(validRole) && new Set(value.map(role => role.lab)).size === value.length;
}
export function snapshotLabBoostValue(key: string,value: unknown): unknown {
  if (key !== 'labBoostRoles') return value;
  return Object.freeze((value as readonly LabBoostRole[]).map(role => Object.freeze({ lab: role.lab,resource: role.resource,mineral: role.mineral,energy: role.energy })));
}
