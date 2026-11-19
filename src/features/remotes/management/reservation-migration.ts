import { object } from '../assignment-validation';
import type { RemoteManagementRecord } from './model';
/** Old offers lack per-room reservation provenance; retain lease generations while remeasuring cached decisions. */
export function migrateReservationManagement(value: unknown, valid: (value: unknown) => value is RemoteManagementRecord): RemoteManagementRecord {
  if (!object(value) || !Array.isArray(value.offers) || value.offers.some(offer => object(offer) && Object.hasOwn(offer,'reservation'))) throw new Error('Invalid legacy reservation metadata');
  if (!valid(value)) throw new Error('Invalid legacy remote management');
  return { ...value,identity: '',roomIndex: 0,sourceIndex: 0,offers: [],reports: [],scannedAt: null,committedAt: null };
}
