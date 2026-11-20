export interface WorkerBoostConfig { workerBoostPolicy: 'off' | 'optional' | 'required'; workerBoostTimeout: number }
export const workerBoostDefaults: Readonly<WorkerBoostConfig> = Object.freeze({ workerBoostPolicy: 'off',workerBoostTimeout: 200 });
export const workerBoostValidators: { [K in keyof WorkerBoostConfig]: (value: unknown) => boolean } = {
  workerBoostPolicy: value => value === 'off' || value === 'optional' || value === 'required',
  workerBoostTimeout: value => Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 1500,
};
