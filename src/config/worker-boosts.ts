export interface WorkerBoostConfig { workerBuilderRecipe: 'standard' | 'boosted'; workerBoostPolicy: 'off' | 'optional' | 'required'; workerBoostTimeout: number }
export const workerBoostDefaults: Readonly<WorkerBoostConfig> = Object.freeze({ workerBuilderRecipe: 'standard',workerBoostPolicy: 'off',workerBoostTimeout: 200 });
export const workerBoostValidators: { [K in keyof WorkerBoostConfig]: (value: unknown) => boolean } = {
  workerBuilderRecipe: value => value === 'standard' || value === 'boosted',
  workerBoostPolicy: value => value === 'off' || value === 'optional' || value === 'required',
  workerBoostTimeout: value => Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 1500,
};

export function validateWorkerBoostConfig(config: Readonly<WorkerBoostConfig>): void {
  if (config.workerBuilderRecipe === 'boosted' && config.workerBoostPolicy !== 'required') throw new Error('Boosted builder recipe requires required boost policy');
}
