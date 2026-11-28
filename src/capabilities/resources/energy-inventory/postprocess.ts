import { expireBody,decayTombstone } from './remains';
import { copyPlain } from '../../../core/plain-data';
import { tileKey } from '../../movement/traffic/model';
import { advanceEnergySource } from '../../mining/source-regeneration';
import { decayContainer } from './container';
import { decayGroundEnergy } from './ground';
import type { EnergyEcology,EnergyInventory,EnergyPostprocess,EnergyPostprocessOrder } from './model';
export function postprocessEnergy(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,tick: number,order?: EnergyPostprocessOrder): void {
  const operations = energyObjectOperations(ecology),selected = selectOperations(operations,order);
  const byKey = new Map(operations.map(operation => [operation.key,operation]));
  for (const key of selected) applyOperation(stores,ecology,byKey.get(key)!,tick);
}
function energyObjectOperations(ecology: EnergyEcology): EnergyPostprocess[] {
  const bodies = ecology.bodies ?? [],tombs = ecology.tombstones ?? [];
  return [
    ...ecology.sources.map(source => operation('source',source.id)),...ecology.ground.map(drop => operation('ground',tileKey(drop.position))),
    ...bodies.filter(body => body.diedAt === undefined).map(body => operation('body',body.id)),
    ...tombs.filter(tomb => tomb.expiredAt === undefined).map(tomb => operation('tombstone',tomb.id)),
    ...ecology.containers.filter(container => container.decay && container.destroyedAt === undefined).map(container => operation('container',container.id)),
  ];
}
function selectOperations(operations: readonly EnergyPostprocess[],order?: EnergyPostprocessOrder): readonly string[] {
  if (!order && operations.some(operation => operation.kind === 'container')) throw new Error('Explicit container object-processing order required');
  if (!order && operations.some(operation => ['body','tombstone'].includes(operation.kind))) throw new Error('Explicit lifetime object-processing order required');
  const selected = order ? order(copyPlain(operations)) : operations.map(operation => operation.key),keys = new Set(operations.map(operation => operation.key));
  if (selected.length !== operations.length || new Set(selected).size !== selected.length || selected.some(key => !keys.has(key))) throw new Error('Invalid energy object-processing order');
  return selected;
}
function applyOperation(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,item: EnergyPostprocess,tick: number): void {
  if (item.kind === 'source') advanceEnergySource(ecology.sources.find(source => source.id === item.id)!,1);
  else if (item.kind === 'ground') decayGroundEnergy(ecology,item.id);
  else if (item.kind === 'body') expireBody(stores,ecology,item.id,tick);
  else if (item.kind === 'tombstone') decayTombstone(stores,ecology,item.id,tick);
  else decayContainer(stores,ecology,item.id,tick);
}
function operation(kind: EnergyPostprocess['kind'],id: string): EnergyPostprocess { return { key: JSON.stringify([kind,id]),kind,id }; }
