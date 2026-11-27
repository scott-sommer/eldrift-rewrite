import { keys,record,integer } from '../../../../capabilities/economy/startup/checkpoints/validation';
/** Old physical cursors prove their own observation time; incubating records prove activation only. */
export function upgradePaidRouteObservations(value: unknown): unknown {
  if (!record(value) || !keys(value,['home','revision','clock','routes']) || !Array.isArray(value.routes)) throw new Error('Invalid legacy route record');
  return { ...value,routes: value.routes.map(upgradeRoute) };
}
function upgradeRoute(value: unknown): unknown {
  if (!record(value) || !keys(value,['program','leg','phase','readyAt','energy','fatigue','cursor']) || !record(value.program)) throw new Error('Invalid legacy route');
  const observedAt = value.cursor === null ? value.program.activatedAt : cursorTime(value.cursor);
  if (!integer(observedAt)) throw new Error('Invalid legacy route observation');
  return { ...value,observedAt };
}
function cursorTime(value: unknown): unknown { return record(value) ? value.observedAt : undefined; }
