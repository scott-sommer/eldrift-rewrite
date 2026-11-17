export interface PlanningDefenseConfig {
  planningDefenseStrategy: 'adaptive' | 'legacy';
  planningDefenseRcl: number; planningDefenseScans: number; planningDefenseAugmentations: number;
  planningDefenseUpkeepWeight: number; planningDefenseRepairWeight: number; planningDefenseTowerWeight: number;
  planningDefenseMinimumTowerPower: number; planningDefenseMaximumUnreachableRepair: number;
}
export const planningDefenseDefaults: Readonly<PlanningDefenseConfig> = Object.freeze({
  planningDefenseStrategy: 'adaptive', planningDefenseRcl: 6, planningDefenseScans: 10000,
  planningDefenseAugmentations: 1, planningDefenseUpkeepWeight: 100, planningDefenseRepairWeight: 1,
  planningDefenseTowerWeight: 1, planningDefenseMinimumTowerPower: 150, planningDefenseMaximumUnreachableRepair: 2500,
});
function integer(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
function weight(value: unknown): boolean { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000; }
export const planningDefenseValidators: { [K in keyof PlanningDefenseConfig]: (value: unknown) => boolean } = {
  planningDefenseStrategy: value => value === 'adaptive' || value === 'legacy',
  planningDefenseRcl: value => integer(value, 2, 8), planningDefenseScans: value => integer(value, 1, 1000000),
  planningDefenseAugmentations: value => integer(value, 1, 10000),
  planningDefenseUpkeepWeight: weight, planningDefenseRepairWeight: weight, planningDefenseTowerWeight: weight,
  planningDefenseMinimumTowerPower: weight, planningDefenseMaximumUnreachableRepair: value => integer(value, 0, 2500),
};
