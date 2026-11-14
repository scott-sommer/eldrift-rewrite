import type { LinkPolicy, LinkRoles, LinkTransfer, LinkView } from './model';
/** Plans simultaneous transfers against one shared destination budget, without depending on native intent ordering. */
export function planLinkTransfers(roles: LinkRoles, storageEnergy: number, policy: LinkPolicy): LinkTransfer[] {
  const controller = storageEnergy > 0 ? roles.controllers.find(link => link.energy < link.capacity * policy.controllerTrigger) : undefined;
  const sink = controller ?? roles.relays.find(link => link.energy < policy.relayTrigger) ?? roles.storage;
  if (!sink) return [];
  const inputs = [...roles.inputs];
  if (controller && roles.storage && controller.energy < controller.capacity * policy.storageAssistTrigger) inputs.push(roles.storage);
  return allocate(inputs, sink, policy.lossRatio);
}
function allocate(inputs: readonly LinkView[], sink: LinkView, lossRatio: number): LinkTransfer[] {
  if (!Number.isFinite(lossRatio) || lossRatio < 0 || lossRatio >= 1) throw new Error('Invalid link loss ratio');
  const transfers: LinkTransfer[] = [];
  const sent = new Set<string>();
  let free = sink.capacity - sink.energy;
  for (const source of inputs) {
    if (!source.active || source.cooldown > 0 || source.id === sink.id || sent.has(source.id)) continue;
    const amount = Math.min(source.energy, free);
    const expectedReceived = amount - Math.ceil(amount * lossRatio);
    if (expectedReceived <= 0) continue;
    transfers.push({ source: source.id, sink: sink.id, amount, expectedReceived });
    sent.add(source.id);
    free -= amount;
  }
  return transfers;
}
