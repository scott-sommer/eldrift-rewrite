export interface LabConfig {
  labReactionsEnabled: boolean;
  labReactionProduct: string;
  labReactionTarget: number;
  labReagentReserve: number;
  labReservedIds: readonly string[];
}
export const labDefaults: Readonly<LabConfig> = Object.freeze({
  labReactionsEnabled: false,labReactionProduct: '',labReactionTarget: 3000,labReagentReserve: 0,labReservedIds: Object.freeze([]),
});
function amount(value: unknown): boolean { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1000000; }
export const labValidators: { [K in keyof LabConfig]: (value: unknown) => boolean } = {
  labReactionsEnabled: value => typeof value === 'boolean',
  labReactionProduct: value => typeof value === 'string' && value.length <= 20 && /^[A-Za-z0-9]*$/.test(value),
  labReactionTarget: amount,labReagentReserve: amount,
  labReservedIds: value => Array.isArray(value) && value.length <= 10 && value.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100) && new Set(value).size === value.length,
};
