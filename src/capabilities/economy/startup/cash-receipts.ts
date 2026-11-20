import type { StartupCashReceipt } from './cash-model';
/** Separate finite events avoid inventing periodic income to fit the compact recurring-flow interface. */
export function startupReceiptIndex(receipts: readonly StartupCashReceipt[], horizon: number, flowIds: readonly string[]): ReadonlyMap<number,number> {
  if (receipts.length > 160016) throw new Error('Startup receipt event capacity');
  const ids = new Set(flowIds), energy = new Map<number,number>();
  for (const receipt of receipts) {
    validateReceipt(receipt,horizon,ids);
    ids.add(receipt.id); energy.set(receipt.tick,(energy.get(receipt.tick) ?? 0)+receipt.energy);
  }
  return energy;
}

function validateReceipt(receipt: StartupCashReceipt, horizon: number, ids: ReadonlySet<string>): void {
  if (typeof receipt.id !== 'string' || !receipt.id.length || receipt.id.length > 512 || ids.has(receipt.id)) throw new Error('Invalid/duplicate startup receipt identity');
  if (!bounded(receipt.tick,horizon)) throw new Error('Invalid startup receipt timing');
  if (!bounded(receipt.energy,1000000)) throw new Error('Invalid startup receipt energy');
}
function bounded(value: number, maximum: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= maximum; }

export { validateReceipt as validateStartupReceipt };
