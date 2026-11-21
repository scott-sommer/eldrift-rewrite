export interface LabProductionTarget { product: string; amount: number; priority: number }
export interface LabProductionConfig { labProductionScope: 'room' | 'empire'; labProductionPolicy: 'targets' | 'thresholds'; labProductionThresholds: readonly LabProductionTarget[]; labIntermediateBase: number; labIntermediatePerTerminal: number; labProductionTargets: readonly LabProductionTarget[]; labProductionBatch: number }
export const labProductionDefaults: Readonly<LabProductionConfig> = Object.freeze({ labProductionScope: 'room',labProductionPolicy: 'targets',labProductionThresholds: Object.freeze([]),labIntermediateBase: 1000,labIntermediatePerTerminal: 1000,labProductionTargets: Object.freeze([]),labProductionBatch: 1000 });
function integer(value: unknown,minimum: number,maximum: number): boolean { return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum; }
function target(value: unknown): value is LabProductionTarget {
  if (!value || typeof value !== 'object') return false;
  const item = value as LabProductionTarget;
  if (!Object.keys(value).every(key => ['product','amount','priority'].includes(key))) return false;
  return typeof item.product === 'string' && /^[A-Za-z0-9]{1,20}$/.test(item.product) && integer(item.amount,0,1000000) && integer(item.priority,0,1000000);
}
function thresholds(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 16 && value.every(target);
}
function targets(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 16 && value.every(target) && new Set(value.map(item => item.product)).size === value.length;
}
export const labProductionValidators: { [K in keyof LabProductionConfig]: (value: unknown) => boolean } = {
  labProductionPolicy: value => value === 'targets' || value === 'thresholds',labProductionThresholds: thresholds,
  labIntermediateBase: value => integer(value,0,1000000),labIntermediatePerTerminal: value => integer(value,0,1000000),
  labProductionScope: value => value === 'room' || value === 'empire',labProductionTargets: targets,labProductionBatch: value => integer(value,5,3000),
};
/** Target records are copied/frozen after validation, so caller mutations cannot alter effective policy. */
export function snapshotLabProductionValue(key: string,value: unknown): unknown {
  if (!['labProductionTargets','labProductionThresholds'].includes(key)) return value;
  return Object.freeze((value as readonly LabProductionTarget[]).map(item => Object.freeze({ product: item.product,amount: item.amount,priority: item.priority })));
}
