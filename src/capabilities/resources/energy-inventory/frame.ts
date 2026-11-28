import { validateEnergyIntent,settleEnergyIntent } from './operations';
import { copyPlain } from '../../../core/plain-data';
import { validateEnergyEcology,finishEnergyEcology } from './ecology';
import { validateEnergyEffects } from './checkpoint';
import type { EnergyInventory,EnergyEffect,EnergyIntent,EnergyEcology } from './model';
import { validateEnergyInventories,validateEnergyTransferOrder } from './validation';
/** Shared physical energy only. Actor observations stay frozen until all queued intents settle. */
export function createEnergyInventoryFrame<T extends EnergyInventory>(openingTick: number, input: readonly T[], previousEffects: readonly EnergyEffect[] = [], initialEcology?: EnergyEcology) {
  if (!Number.isSafeInteger(openingTick) || openingTick < 0) throw new Error('Invalid energy inventory clock');
  const initial: EnergyEcology = initialEcology ?? { sources: [],ground: [],containers: [],decayDivisor: 1000 };
  validateEnergyInventories(input); validateEnergyEcology(initial,input); validateEnergyEffects(openingTick,previousEffects,input,initial);
  let stores = new Map(copyPlain([...input]).map(store => [store.id,store]));
  let ecology = copyPlain(initial);
  let tick = openingTick-1, open = false;
  let effects = new Map(copyPlain([...previousEffects]).map(effect => [effect.id,effect]));
  const intents = new Map<string,EnergyIntent>();
  function requireOpen(): void { if (!open) throw new Error('Energy inventory frame is closed'); }
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
    finish(order: readonly string[]): EnergyEffect[] {
      requireOpen(); validateEnergyTransferOrder(order,intents);
      const next = new Map([...stores].map(([id,store]) => [id,copyPlain(store)]));
      const nextEcology = copyPlain(ecology);
      const settled = order.map(id => settleEnergyIntent(next,nextEcology,intents.get(id)!,tick));
      finishEnergyEcology(nextEcology); validateEnergyEcology(nextEcology,[...next.values()]);
      validateEnergyInventories([...next.values()]);
      stores = next; ecology = nextEcology; effects = new Map(settled.map(effect => [effect.id,effect])); open = false;
      return copyPlain(settled);
    },
    source(id: string) { requireOpen(); const source = ecology.sources.find(source => source.id === id); return source && copyPlain(source); },
    structure(id: string) { requireOpen(); const target = ecology.structures?.find(target => target.id === id); return target && copyPlain(target); },
    ecologySnapshot() { if (open) throw new Error('Cannot snapshot open energy ecology'); return copyPlain(ecology); },
    checkpoint() {
      if (open) throw new Error('Cannot checkpoint open energy inventory frame');
      return { nextTick: tick+1,stores: copyPlain([...stores.values()]),effects: copyPlain([...effects.values()]),...(initialEcology !== undefined || ecology.sources.length || ecology.ground.length || ecology.containers.length || ecology.structures?.length ? { ecology: copyPlain(ecology) } : {}) };
    },
    snapshot(): T[] { if (open) throw new Error('Cannot snapshot open energy inventory frame'); return copyPlain([...stores.values()]); },
  };
}
export type EnergyInventoryFrame = ReturnType<typeof createEnergyInventoryFrame>;
