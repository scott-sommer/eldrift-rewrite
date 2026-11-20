import { validatePatch } from '../../config/validation';
import { labValidators } from '../../config/labs';
import type { LabConfig } from '../../config/labs';
export const labKeys = Object.keys(labValidators) as (keyof LabConfig)[];
export function labPatch(input: unknown): Partial<LabConfig> {
  const patch = validatePatch(input,'roomOverride');
  if (!Object.keys(patch).every(key => Object.hasOwn(labValidators,key))) throw new Error('Only lab configuration keys are accepted');
  return patch;
}
export function onlyLabKeys(input: unknown): Partial<LabConfig> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(Object.entries(input).filter(([key]) => Object.hasOwn(labValidators,key)));
}
export function withoutLabKeys(input: unknown,keys: readonly string[] = labKeys): Record<string,unknown> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(Object.entries(input).filter(([key]) => !keys.includes(key)));
}
export function validateLabKeys(keys: readonly string[]): void {
  if (!Array.isArray(keys) || !keys.every(key => Object.hasOwn(labValidators,key))) throw new Error('Unknown lab configuration key');
}
