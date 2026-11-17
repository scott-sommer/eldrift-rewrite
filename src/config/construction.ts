export interface ConstructionConfig {
  constructionEnabled: boolean; constructionCpuBudget: number; constructionEntries: number;
  constructionAttempts: number; constructionRoomSites: number; constructionIncludeTerminalEnergy: boolean;
  constructionRetryAttempts: number; constructionRetryDelay: number; constructionRetryMaximumDelay: number;
}
export const constructionDefaults: Readonly<ConstructionConfig> = Object.freeze({
  constructionEnabled: false, constructionCpuBudget: 3, constructionEntries: 20, constructionAttempts: 1,
  constructionRoomSites: 5, constructionIncludeTerminalEnergy: false,
  constructionRetryAttempts: 3, constructionRetryDelay: 10, constructionRetryMaximumDelay: 1000,
});
function integer(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
export const constructionValidators: { [K in keyof ConstructionConfig]: (value: unknown) => boolean } = {
  constructionEnabled: value => typeof value === 'boolean',
  constructionCpuBudget: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000,
  constructionEntries: value => integer(value, 0, 10000), constructionAttempts: value => integer(value, 0, 10000),
  constructionRoomSites: value => integer(value, 0, 100), constructionIncludeTerminalEnergy: value => typeof value === 'boolean',
  constructionRetryAttempts: value => integer(value, 1, 1000), constructionRetryDelay: value => integer(value, 1, 1000000),
  constructionRetryMaximumDelay: value => integer(value, 1, 1000000),
};
