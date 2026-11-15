import { prepareStampComposition } from './stamp-composition-policy';
export type StampPreparationProvider = typeof prepareStampComposition;
/** One immutable candidate preparation per owner; changed inputs and heap resets recompute it. */
export function createStampPreparationCache(prepare: StampPreparationProvider = prepareStampComposition): StampPreparationProvider {
  let saved: { signature: string; value: ReturnType<StampPreparationProvider> } | undefined;
  return (storage, observation, limits, anchorLimit, entries = []) => {
    const signature = JSON.stringify([storage, observation, limits, anchorLimit, entries]);
    if (saved?.signature === signature) return saved.value;
    const value = prepare(storage, observation, limits, anchorLimit, entries);
    freezePreparation(value);
    saved = { signature, value };
    return value;
  };
}
/** Preparation owns its arrays/tiles; freezing prevents a consumer from corrupting later reads. */
function freezePreparation(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezePreparation(child);
  Object.freeze(value);
}
