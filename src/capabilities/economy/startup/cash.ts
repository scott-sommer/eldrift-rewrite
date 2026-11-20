import { createStartupCashLedger } from './cash-ledger';
import { startupReceiptIndex } from './cash-receipts';
import { startupFlowDue } from './flow';
import { validateStartupCash } from './cash-validation';
import type { StartupCashForecast, StartupCashInput, StartupCashReceipt } from './cash-model';
/** Synchronous convenience wrapper; cooperative project simulation records the same accounting per frame. */
export function forecastStartupCash(input: StartupCashInput, receipts: readonly StartupCashReceipt[] = []): StartupCashForecast {
  validateStartupCash(input);
  const credits = startupReceiptIndex(receipts,input.horizon,input.flows.map(flow => flow.id)), ledger = createStartupCashLedger(input);
  for (let tick = 0; tick <= input.horizon; tick++) ledger.frame(tick,input.flows.filter(flow => startupFlowDue(flow,tick)),credits.get(tick) ?? 0);
  return ledger.result();
}
