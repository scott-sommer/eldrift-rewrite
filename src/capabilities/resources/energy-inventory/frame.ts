import { settleEnergyFrame } from './settlement';
import { validateContainerClocks } from './container';
import { validateEnergyIntent } from './operations';
import { copyPlain } from '../../../core/plain-data';
import { validateEnergyEcology } from './ecology';
import { validateEnergyEffects } from './checkpoint';
import type { EnergyInventory,EnergyEffect,EnergyIntent,EnergyEcology,EnergyPostprocessOrder } from './model';
import { validateEnergyInventories } from './validation';
/** Shared physical energy only. Actor observations stay frozen until all queued intents settle. */
export function createEnergyInventoryFrame<T extends EnergyInventory>(openingTick: number, input: readonly T[], previousEffects: readonly EnergyEffect[] = [], initialEcology?: EnergyEcology) {
  if (!Number.isSafeInteger(openingTick) || openingTick < 0) throw new Error('Invalid energy inventory clock');
  const initial: EnergyEcology = initialEcology ?? { sources: [],ground: [],containers: [],decayDivisor: 1000 };
  validateEnergyInventories(input); validateEnergyEcology(initial,input); validateEnergyEffects(openingTick,previousEffects,input,initial); validateContainerClocks(initial,openingTick);
  let stores = new Map(copyPlain([...input]).map(store => [store.id,store]));
  let ecology = copyPlain(initial);
  let tick = openingTick-1, open = false,settling = false;
  let effects = new Map(copyPlain([...previousEffects]).map(effect => [effect.id,effect]));
  const intents = new Map<string,EnergyIntent>();
  function requireOpen(): void { if (!open || settling) throw new Error('Energy inventory frame is closed'); }
  return {
    begin(frame: number): void {
      if (open || !Number.isSafeInteger(frame) || frame < 0 || frame >= Number.MAX_SAFE_INTEGER || frame !== tick+1) throw new Error('Invalid energy inventory frame order');
      tick = frame; open = true; intents.clear();
    },
    tick(): number { requireOpen(); return tick; },
    observe(id: string): T | undefined { requireOpen(); const store = stores.get(id); return store && copyPlain(store); },
    effect(id: string): EnergyEffect | undefined {
      requireOpen(); const effect = effects.get(id); return effect?.settledAt === tick ? copyPlain(effect) : undefined;
    },
    queue(raw: EnergyIntent): void {
      requireOpen(); validateEnergyIntent(raw,stores,ecology);
      if (intents.has(raw.id) || intents.size >= 512) throw new Error('Duplicate or excessive energy transfer intents');
      intents.set(raw.id,copyPlain(raw));
    },
    pending(): EnergyIntent[] { requireOpen(); return copyPlain([...intents.values()]); },
    finish(order: readonly string[],postprocess?: EnergyPostprocessOrder): EnergyEffect[] {
      requireOpen(); settling = true;
      try {
        const next = settleEnergyFrame(stores,ecology,intents,order,tick,postprocess);
        stores = next.stores; ecology = next.ecology; effects = new Map(next.effects.map(effect => [effect.id,effect])); open = false;
        return copyPlain(next.effects);
      } finally { settling = false; }
    },
    source(id: string) { requireOpen(); const source = ecology.sources.find(source => source.id === id); return source && copyPlain(source); },
    structure(id: string) { requireOpen(); const target = ecology.containers.some(container => container.id === id && container.destroyedAt !== undefined) ? undefined : ecology.structures?.find(target => target.id === id); return target && copyPlain(target); },
    ecologySnapshot() { if (open || settling) throw new Error('Cannot snapshot open energy ecology'); return copyPlain(ecology); },
    checkpoint() {
      if (open || settling) throw new Error('Cannot checkpoint open energy inventory frame');
      return { nextTick: tick+1,stores: copyPlain([...stores.values()]),effects: copyPlain([...effects.values()]),...(initialEcology !== undefined || ecology.sources.length || ecology.ground.length || ecology.containers.length || ecology.structures?.length ? { ecology: copyPlain(ecology) } : {}) };
    },
    snapshot(): T[] { if (open || settling) throw new Error('Cannot snapshot open energy inventory frame'); return copyPlain([...stores.values()]); },
  };
}
export type EnergyInventoryFrame = ReturnType<typeof createEnergyInventoryFrame>;
