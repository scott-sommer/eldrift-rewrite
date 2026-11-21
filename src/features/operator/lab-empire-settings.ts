import { productionPolicySignature } from '../industry/production-policy';
import type { ConfigurationStore } from '../../config/provider';
import { configurationFor } from '../../config/provider';
import { resolveConfig } from '../../config/resolve';
import { copyPlain } from '../../persistence/plain-data';
import type { LabConfig } from '../../config/labs';
import { labKeys, labPatch } from './lab-patch';
export const empireLabKeys = labKeys.filter(key => !['labBoostRoles','labReservedIds'].includes(key));
export type EmpireLabPatch = Partial<Omit<LabConfig,'labBoostRoles' | 'labReservedIds'>>;
export function empireLabPatch(input: unknown,supported: (product: string) => boolean): EmpireLabPatch {
  const patch = labPatch(input);
  if (Object.keys(patch).some(key => !empireLabKeys.includes(key as keyof LabConfig))) throw new Error('Lab IDs and boost roles require room configuration');
  const products = [patch.labReactionProduct,...[...(patch.labProductionTargets ?? []),...(patch.labProductionThresholds ?? [])].map(target => target.product)].filter((product): product is string => !!product);
  if (products.some(product => !supported(product))) throw new Error('Unsupported reaction product');
  return patch;
}
export function empireLabView(saved: ConfigurationStore,tick: number,homes: readonly string[]) {
  const shared = resolveConfig(configurationFor(saved),tick);
  const conflicts = homes.filter(home => {
    const room = resolveConfig(configurationFor(saved,home),tick).values;
    return room.labReactionsEnabled && room.labProductionScope === 'empire' && productionPolicySignature(room) !== productionPolicySignature(shared.values);
  }).sort();
  return { ok: conflicts.length === 0,conflicts,values: copyPlain(Object.fromEntries(empireLabKeys.map(key => [key,shared.values[key]]))),
    sources: Object.fromEntries(empireLabKeys.map(key => [key,shared.sources[key]])) };
}
