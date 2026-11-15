export interface PlanningScoreConfig {
  planningHaulingWeight: number; planningServiceWeight: number; planningCapacityWeight: number;
  planningSwampWeight: number; planningDefenseWeight: number; planningMigrationWeight: number;
  planningMinimumImprovement: number; planningMaximumPathOps: number;
}
export const planningScoreDefaults: Readonly<PlanningScoreConfig> = Object.freeze({
  planningHaulingWeight: 1, planningServiceWeight: 1, planningCapacityWeight: 1000,
  planningSwampWeight: 1, planningDefenseWeight: 1, planningMigrationWeight: 0.001,
  planningMinimumImprovement: 10, planningMaximumPathOps: 10000,
});
function weight(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000;
}
export const planningScoreValidators: { [K in keyof PlanningScoreConfig]: (value: unknown) => boolean } = {
  planningHaulingWeight: weight, planningServiceWeight: weight, planningCapacityWeight: weight,
  planningSwampWeight: weight, planningDefenseWeight: weight, planningMigrationWeight: weight,
  planningMinimumImprovement: weight,
  planningMaximumPathOps: value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 100000,
};
