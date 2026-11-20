import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import type { ConfigurationStore } from '../../config/provider';
import { configurationFor } from '../../config/provider';
import { resolveConfig } from '../../config/resolve';
import type { ConfigInput } from '../../config/model';
import { labKeys, onlyLabKeys } from './lab-patch';
import { labStateSchema } from '../industry/lab-state';
import { productionSchema } from '../industry/production-state';
import { reservedBoostLabs } from '../industry/boosts/store';
function temporarySettings(temporary: ConfigInput['temporary'],tick: number) {
  return temporary ? { expiresAt: temporary.expiresAt,active: tick < temporary.expiresAt,values: onlyLabKeys(temporary.values) } : null;
}
export function inspectLabSettings(saved: ConfigurationStore,home: string,tick: number) {
  const effective = resolveConfig(configurationFor(saved,home),tick), room = saved.rooms?.[home];
  return { values: onlyLabKeys(effective.values),sources: Object.fromEntries(labKeys.map(key => [key,effective.sources[key]])),
    override: onlyLabKeys(room?.override),temporary: temporarySettings(room?.temporary,tick) };
}
export function inspectLabRuntime(state: StatePort,home: string) {
  return { assignment: peekState(state,'industry-labs/'+home,labStateSchema)?.assignment ?? null,
    production: peekState(state,'industry-production/'+home,productionSchema)?.step ?? null,reservedBoostLabs: reservedBoostLabs(state,home) };
}
