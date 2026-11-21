import type { LabProductionConfig } from '../../config/lab-production';
import type { LabProductionTarget } from '../../config/lab-production';
const defaults = { XZHO2: 50000,XLHO2: 50000,XZH2O: 50000,XLH2O: 25000,XUH2O: 50000,XKHO2: 50000,XGHO2: 50000,BOOST: 200000 } as const;
export interface LegacyProductionOptions { upgradeProduct?: string; amounts?: Partial<Record<keyof typeof defaults,number>> }
function validateOptions(options: LegacyProductionOptions): void {
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['upgradeProduct','amounts'].includes(key))) throw new Error('Invalid legacy production options');
}
function targetAmounts(input: LegacyProductionOptions['amounts']) {
  const amounts = input === undefined ? {} : input;
  if (!amounts || typeof amounts !== 'object' || Array.isArray(amounts) || Object.keys(amounts).some(key => !Object.hasOwn(defaults,key))) throw new Error('Unknown legacy production target');
  return amounts;
}
function upgradeProduct(input: string | undefined): string {
  const product = input === undefined ? 'XGH2O' : input;
  if (typeof product !== 'string' || !/^[A-Za-z0-9]{1,20}$/.test(product) || product === 'BOOST') throw new Error('Upgrade product must be distinct from the fixed preset targets');
  return product;
}
function targetAmount(input: number | undefined,fallback: number): number {
  const amount = input === undefined ? fallback : input;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) throw new Error('Invalid legacy production amount');
  return amount;
}
/** Explicit compatibility preset from resourceManager.js; no ambient Memory or mutable singleton policy. */
export function legacyProductionThresholds(options: LegacyProductionOptions = {}): LabProductionTarget[] {
  validateOptions(options);
  const product = upgradeProduct(options.upgradeProduct), amounts = targetAmounts(options.amounts);
  return Object.entries(defaults).map(([key,fallback],priority) => ({ product: key === 'BOOST' ? product : key,
    amount: targetAmount(amounts[key as keyof typeof defaults],fallback),priority }));
}

export function legacyProductionTargets(options: LegacyProductionOptions = {}): LabProductionTarget[] {
  const targets = legacyProductionThresholds(options);
  if (new Set(targets.map(target => target.product)).size !== targets.length) throw new Error('Upgrade product must be distinct from the fixed preset targets; use legacyPolicy for separate thresholds');
  return targets;
}
export function legacyProductionPolicy(options: LegacyProductionOptions = {}): Pick<LabProductionConfig,'labProductionPolicy' | 'labProductionThresholds' | 'labIntermediateBase' | 'labIntermediatePerTerminal' | 'labProductionScope'> {
  return { labProductionScope: 'empire',labProductionPolicy: 'thresholds',labProductionThresholds: legacyProductionThresholds(options),labIntermediateBase: 1000,labIntermediatePerTerminal: 1000 };
}
