import { editOperatorRooms, validateOperatorHome } from './room-transaction';
import type { OperatorRoomSettings } from './room-transaction';
import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { operatorSchema } from './state';
import type { LabConfig } from '../../config/labs';
import { inspectLabSettings, inspectLabRuntime } from './lab-inspection';
import { labPatch, labKeys, withoutLabKeys, validateLabKeys } from './lab-patch';
export interface OperatorLabFact { id: string; active: boolean; mineral: string | null; amount: number; energy: number; cooldown: number }
export interface LabOperatorPorts { clock(): number; owns(home: string): boolean; labs(home: string): readonly OperatorLabFact[]; productSupported(product: string): boolean; boostSupported(resource: string): boolean }
/** Configuration intents never erase assignments, claims, tasks or native receipts. */
export function createLabOperator(state: StatePort,ports: LabOperatorPorts) {
  const read = () => peekState(state,'operator/config',operatorSchema) ?? {};
  function inspect(home: string) {
    validateOperatorHome(home);
    return { home,owned: ports.owns(home),...inspectLabSettings(read(),home,ports.clock()),...inspectLabRuntime(state,home),labs: copyPlain(ports.labs(home)) };
  }

  function patch(home: string,input: unknown): Partial<LabConfig> {
    const value = labPatch(input);
    const products = [value.labReactionProduct,...(value.labProductionTargets ?? []).map(target => target.product)].filter((product): product is string => !!product);
    if (products.some(product => !ports.productSupported(product))) throw new Error('Unsupported reaction product');
    if (value.labBoostRoles && !value.labBoostRoles.every(role => ports.boostSupported(role.resource) && ports.labs(home).some(lab => lab.id === role.lab))) throw new Error('Boost role requires an owned lab and compound');
    if (value.labReservedIds && !value.labReservedIds.every(id => ports.labs(home).some(lab => lab.id === id))) throw new Error('Reserved lab must be owned in this room');
    return value;
  }
  function change(home: string,edit: (settings: OperatorRoomSettings) => OperatorRoomSettings) {
    editOperatorRooms(state,[{ home,apply: edit }],ports.owns); return inspect(home);
  }
  return {
    inspect,
    configureMany(changes: readonly { home: string; input: Partial<LabConfig> }[]) {
      if (!Array.isArray(changes) || changes.length > 50) throw new Error('Invalid bulk configuration changes');
      const changed = editOperatorRooms(state,changes.map(change => ({ home: change.home,apply: (settings: OperatorRoomSettings) => ({ ...settings,override: { ...settings.override as object,...patch(change.home,change.input) } }) })),ports.owns);
      return { changed,homes: changes.map(change => change.home).sort() };
    },
    configure(home: string,input: Partial<LabConfig>) { return change(home,settings => ({ ...settings,override: { ...settings.override as object,...patch(home,input) } })); },
    clearOverride(home: string,keys: readonly (keyof LabConfig)[] = labKeys) {
      validateLabKeys(keys); return change(home,settings => ({ ...settings,override: withoutLabKeys(settings.override,keys) }));
    },
    temporary(home: string,input: Partial<LabConfig>,expiresAt: number) {
      if (!Number.isSafeInteger(expiresAt) || expiresAt <= ports.clock()) throw new Error('Temporary expiry must be a future tick');
      return change(home,settings => {
        const value = patch(home,input), old = settings.temporary;
        const active = old && ports.clock() < old.expiresAt;
        const unrelated = active ? withoutLabKeys(old.values) : {};
        if (Object.keys(unrelated).length && old!.expiresAt !== expiresAt) throw new Error('Cannot change unrelated temporary expiry');
        return { ...settings,temporary: { expiresAt,values: { ...(active ? old.values as object : {}),...value } } };
      });
    },
    clearTemporary(home: string) {
      return change(home,settings => {
        if (!settings.temporary) return settings;
        const values = withoutLabKeys(settings.temporary.values);
        if (Object.keys(values).length) return { ...settings,temporary: { ...settings.temporary,values } };
        delete settings.temporary; return settings;
      });
    },
  };
}
