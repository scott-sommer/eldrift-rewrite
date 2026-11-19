import { object } from '../assignment-validation';
import type { RemoteManagementRecord } from './model';
export function migrateRemoteManagement(value: unknown, valid: (value: unknown) => value is RemoteManagementRecord): RemoteManagementRecord {
  if (!object(value) || !Array.isArray(value.offers)) throw new Error('Invalid legacy remote management');
  const candidate = { ...value,offers: value.offers.map(upgradeOffer) };
  if (!valid(candidate)) throw new Error('Invalid legacy remote management');
  return { ...candidate,identity: '',roomIndex: 0,sourceIndex: 0,offers: [],reports: [],scannedAt: null,committedAt: null };
}
function upgradeOffer(value: unknown) {
  if (!object(value) || !Array.isArray(value.quotes)) throw new Error('Invalid legacy remote offer');
  return { ...value,quotes: value.quotes.map(quote => {
    if (!object(quote) || !object(quote.assessment) || !object(quote.assessment.travel)) throw new Error('Invalid legacy remote quote');
    return { ...quote,assessment: { ...quote.assessment,travel: { ...quote.assessment.travel,minerReturnTicks: 0 } } };
  }) };
}
