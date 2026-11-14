import type { LinkRoles } from './model';
export interface StorageStock { id: string; energy: number; free: number }
export interface LinkServicePolicy { controllerNeed: number; storageTarget: number; maximumBatch: number }
export interface LinkService { direction: 'fill' | 'drain'; source: string; sink: string; quantity: number }
/** Legacy distributor link servicing expressed as one mutually exclusive direction per observation. */
export function planLinkService(roles: LinkRoles, storage: StorageStock | undefined, policy: LinkServicePolicy): LinkService | undefined {
  validate(policy);
  const link = roles.storage;
  if (!storage || !link || !link.active || link.id === storage.id) return undefined;
  const needed = roles.controllers.some(controller => controller.active && controller.energy < controller.capacity * policy.controllerNeed);
  if (needed) {
    if (link.energy >= link.capacity * policy.storageTarget) return undefined;
    return service('fill', storage.id, link.id, Math.min(storage.energy, link.capacity - link.energy, policy.maximumBatch));
  }
  if (link.energy <= link.capacity * policy.storageTarget) return undefined;
  return service('drain', link.id, storage.id, Math.min(link.energy, storage.free, policy.maximumBatch));
}
function service(direction: LinkService['direction'], source: string, sink: string, quantity: number): LinkService | undefined {
  return quantity > 0 ? { direction, source, sink, quantity } : undefined;
}
function validate(policy: LinkServicePolicy): void {
  if (![policy.controllerNeed, policy.storageTarget].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('Invalid link service threshold');
  if (!Number.isSafeInteger(policy.maximumBatch) || policy.maximumBatch <= 0) throw new Error('Invalid link service batch');
}
