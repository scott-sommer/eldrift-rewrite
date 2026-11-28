import { copyPlain } from '../../../core/plain-data';
import { tileKey } from '../../movement/traffic/model';
import { advanceEnergySource } from '../../mining/source-regeneration';
import { decayContainer } from './container';
import { decayGroundEnergy } from './ground';
import type { EnergyEcology,EnergyInventory,EnergyPostprocess,EnergyPostprocessOrder } from './model';
export function postprocessEnergy(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,tick: number,order?: EnergyPostprocessOrder): void {
  const operations: EnergyPostprocess[] = [
    ...ecology.sources.map(source => operation('source',source.id)),...ecology.ground.map(drop => operation('ground',tileKey(drop.position))),
    ...ecology.containers.filter(container => container.decay && container.destroyedAt === undefined).map(container => operation('container',container.id)),
  ];
  if (!order && operations.some(operation => operation.kind === 'container')) throw new Error('Explicit container object-processing order required');
  const selected = order ? order(copyPlain(operations)) : operations.map(operation => operation.key);
  const byKey = new Map(operations.map(operation => [operation.key,operation]));
  if (selected.length !== operations.length || new Set(selected).size !== selected.length || selected.some(key => !byKey.has(key))) throw new Error('Invalid energy object-processing order');
  for (const key of selected) {
    const item = byKey.get(key)!;
    if (item.kind === 'source') advanceEnergySource(ecology.sources.find(source => source.id === item.id)!,1);
    else if (item.kind === 'ground') decayGroundEnergy(ecology,item.id);
    else decayContainer(stores,ecology,item.id,tick);
  }
}
function operation(kind: EnergyPostprocess['kind'],id: string): EnergyPostprocess { return { key: JSON.stringify([kind,id]),kind,id }; }
