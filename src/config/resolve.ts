import { defaults } from './model';
import type { ConfigInput, ConfigKey, ConfigLayer, EffectiveConfig } from './model';
import { validatePatch } from './validation';
const layers = ['environment', 'empire', 'roomProfile', 'roomOverride'] as const;
export function resolveConfig(input: ConfigInput, tick: number): EffectiveConfig {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid configuration tick');
  const values = { ...defaults };
  const sources = Object.fromEntries(Object.keys(defaults).map(key => [key, 'defaults'])) as Record<ConfigKey, ConfigLayer>;
  function apply(layer: ConfigLayer, raw: unknown): void {
    const patch = validatePatch(raw, layer);
    Object.assign(values, patch);
    for (const key of Object.keys(patch) as ConfigKey[]) sources[key] = layer;
  }
  for (const layer of layers) {
    if (input[layer] !== undefined) apply(layer, input[layer]);
  }
  if (input.temporary !== undefined) {
    const { expiresAt, values: temporary } = input.temporary;
    if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) throw new Error('temporary.expiresAt: invalid tick');
    // Validate expired input too, so configuration errors are never silently hidden.
    const patch = validatePatch(temporary, 'temporary');
    if (tick < expiresAt) apply('temporary', patch);
  }
  if (values.recoveryEnterEnergy >= values.recoveryExitEnergy) throw new Error('Recovery entry must be below exit energy');
  if (values.terminalEnergyLow >= values.terminalEnergyHigh) throw new Error('terminalEnergyLow must be below terminalEnergyHigh');
  return { values: Object.freeze(values), sources: Object.freeze(sources) };
}
