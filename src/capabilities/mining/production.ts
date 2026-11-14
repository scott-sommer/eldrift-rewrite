import type { Outcome } from '../../core/execution/model';
export interface ProductionView {
  tick: number;
  available: number;
  readyAt: number;
}
export function energyReadiness(view: ProductionView): Outcome | undefined {
  if (view.available > 0) return undefined;
  return { status: 'blocked', reason: 'source-depleted', retryAt: Math.max(view.tick + 1, view.readyAt) };
}
export function mineralReadiness(view: ProductionView, extractor: 'ready' | 'missing' | 'inactive', cooldown: number): Outcome | undefined {
  if (extractor !== 'ready') return { status: 'blocked', reason: 'extractor-' + extractor, retryAt: view.tick + 1 };

  if (view.available <= 0) return { status: 'blocked', reason: 'mineral-depleted', retryAt: Math.max(view.tick + 1, view.readyAt) };
  if (cooldown > 0) return { status: 'blocked', reason: 'extractor-cooldown', retryAt: view.tick + cooldown };
  return undefined;
}


export function mineralCapacity(tick: number, available: number, free: number, harvestPower: number): Outcome | undefined {
  if (Math.min(available, harvestPower) > free) return { status: 'blocked', reason: 'mineral-capacity', retryAt: tick + 1 };
  return undefined;
}
