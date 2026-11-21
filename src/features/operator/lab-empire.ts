import { legacyProductionTargets } from '../industry/legacy-production-targets';
import type { LegacyProductionOptions } from '../industry/legacy-production-targets';
import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import type { ConfigurationStore } from '../../config/provider';
import { operatorSchema } from './state';
import { editOperatorConfiguration } from './configuration-transaction';
import { empireLabKeys, empireLabPatch, empireLabView } from './lab-empire-settings';
import type { EmpireLabPatch } from './lab-empire-settings';
import { createEmpireProductionStore } from '../industry/empire-production/store';
interface EmpireLabPorts { clock(): number; homes(): readonly string[]; productSupported(product: string): boolean }
export function createEmpireLabOperator(state: StatePort,ports: EmpireLabPorts) {
  const read = () => peekState(state,'operator/config',operatorSchema) ?? {};
  const view = (saved: ConfigurationStore) => empireLabView(saved,ports.clock(),ports.homes());
  function patchCandidate(saved: ConfigurationStore,input: unknown): ConfigurationStore {
    const empire = { ...saved.empire as object,...empireLabPatch(input,ports.productSupported) }, next = { ...saved,empire };
    if (!Object.keys(empire).length) delete (next as ConfigurationStore).empire;
    return next;
  }
  function commit(edit: (saved: ConfigurationStore) => ConfigurationStore) {
    let proposed: ReturnType<typeof view> | undefined;
    const changed = editOperatorConfiguration(state,saved => {
      const next = edit(saved); proposed = view(next);
      if (!proposed.ok) throw new Error('Conflicting empire production targets in rooms: '+proposed.conflicts.join(', '));
      return next;
    });
    return { changed,...proposed! };
  }
  return {
    legacyTargets(options?: LegacyProductionOptions) {
      const targets = legacyProductionTargets(options); empireLabPatch({ labProductionTargets: targets },ports.productSupported); return targets;
    },
    inspectEmpire() { return { ...view(read()),windows: createEmpireProductionStore(state,() => false).list() }; },
    previewEmpire(input: EmpireLabPatch) { return view(patchCandidate(read(),input)); },
    configureEmpire(input: EmpireLabPatch) { return commit(saved => patchCandidate(saved,input)); },
    clearEmpire(keys: readonly (keyof EmpireLabPatch)[] = empireLabKeys as (keyof EmpireLabPatch)[]) {
      if (!Array.isArray(keys) || !keys.every(key => empireLabKeys.includes(key))) throw new Error('Unknown empire lab configuration key');
      return commit(saved => {
        const empire = Object.fromEntries(Object.entries(saved.empire ?? {}).filter(([key]) => !keys.includes(key as keyof EmpireLabPatch))), next: ConfigurationStore = { ...saved,empire };
        if (!Object.keys(empire).length) delete next.empire; return next;
      });
    },
  };
}
