import { copyPlain } from '../../../core/plain-data';
import { validateEnergyEcology,validateHarvest,settleHarvest,finishEnergyEcology } from './ecology';
import { validateEnergyEffects } from './checkpoint';
import type { EnergyInventory, EnergyTransferEffect, EnergyTransferIntent,EnergyEffect,EnergyIntent,EnergyEcology } from './model';
import { validateEnergyInventories,validateEnergyTransfer,validateEnergyTransferOrder } from './validation';
/** Shared physical energy only. Actor observations stay frozen until all queued intents settle. */
export function createEnergyInventoryFrame<T extends EnergyInventory>(openingTick: number, input: readonly T[], previousEffects: readonly EnergyEffect[] = [], initialEcology: EnergyEcology = { sources: [],ground: [],containers: [],decayDivisor: 1000 }) {
  if (!Number.isSafeInteger(openingTick) || openingTick < 0) throw new Error('Invalid energy inventory clock');
  validateEnergyInventories(input); validateEnergyEcology(initialEcology,input); validateEnergyEffects(openingTick,previousEffects,input,initialEcology);
  let stores = new Map(copyPlain([...input]).map(store => [store.id,store]));
  let ecology = copyPlain(initialEcology);
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
      requireOpen(); if (raw.kind === 'harvest') validateHarvest(raw,stores,ecology); else validateEnergyTransfer(raw,stores);
      if (intents.has(raw.id) || intents.size >= 512) throw new Error('Duplicate or excessive energy transfer intents');
      intents.set(raw.id,copyPlain(raw));
    },
    pending(): EnergyIntent[] { requireOpen(); return copyPlain([...intents.values()]); },
    finish(order: readonly string[]): EnergyEffect[] {
      requireOpen(); validateEnergyTransferOrder(order,intents);
      const next = new Map([...stores].map(([id,store]) => [id,copyPlain(store)]));
      const nextEcology = copyPlain(ecology);
      const settled = order.map(id => { const intent = intents.get(id)!; return intent.kind === 'harvest' ? settleHarvest(next,nextEcology,intent,tick) : settle(next,intent,tick); });
      finishEnergyEcology(nextEcology); validateEnergyEcology(nextEcology,[...next.values()]);
      validateEnergyInventories([...next.values()]);
      stores = next; ecology = nextEcology; effects = new Map(settled.map(effect => [effect.id,effect])); open = false;
      return copyPlain(settled);
    },
    source(id: string) { requireOpen(); const source = ecology.sources.find(source => source.id === id); return source && copyPlain(source); },
    ecologySnapshot() { if (open) throw new Error('Cannot snapshot open energy ecology'); return copyPlain(ecology); },
    checkpoint() {
      if (open) throw new Error('Cannot checkpoint open energy inventory frame');
      return { nextTick: tick+1,stores: copyPlain([...stores.values()]),effects: copyPlain([...effects.values()]),...(ecology.sources.length || ecology.ground.length ? { ecology: copyPlain(ecology) } : {}) };
    },
    snapshot(): T[] { if (open) throw new Error('Cannot snapshot open energy inventory frame'); return copyPlain([...stores.values()]); },
  };
}
function settle(stores: Map<string, EnergyInventory>, intent: EnergyTransferIntent, tick: number): EnergyTransferEffect {
  const source = stores.get(intent.source)!, target = stores.get(intent.target)!;
  // Engine4.3.2 transfers require the full sender amount; withdrawals clip to remaining source stock.
  const available = intent.kind === 'transfer' && source.energy < intent.amount ? 0 : source.energy;
  const amount = Math.min(intent.amount,available,target.freeEnergyCapacity);
  source.energy -= amount; source.usedCapacity -= amount; source.freeEnergyCapacity += amount;
  target.energy += amount; target.usedCapacity += amount; target.freeEnergyCapacity -= amount;
  return { ...intent,amount,issuedAt: tick,settledAt: tick+1 };
}
export type EnergyInventoryFrame = ReturnType<typeof createEnergyInventoryFrame>;
