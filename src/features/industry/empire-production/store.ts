import type { StatePort } from '../../../persistence/versioned-state';
import { peekState } from '../../../persistence/versioned-state';
import { copyPlain } from '../../../persistence/plain-data';
import type { ProductionInventory, ProductionOptions, RecipeLookup } from '../../../capabilities/industry/production/model';
import type { EmpireProductionAdmission, EmpireProductionWindow } from './model';
import { empireProductionSchema as schema } from './schema';
import { progressEmpireWindow } from './progress';
const key = 'industry-empire-production/empire';
function admitted(context: string,input: EmpireProductionAdmission): EmpireProductionWindow {
  if (!Number.isSafeInteger(input.rootStock) || input.rootStock < 0) throw new Error('Invalid root baseline');
  return { home: input.home,product: input.product,amount: input.amount,context,rootTarget: input.rootStock+input.amount,remaining: input.amount,observedRoot: input.rootStock,
    initialStep: copyPlain(input.step),step: copyPlain(input.step),retiring: false };
}
function identity(window: EmpireProductionWindow): string { return JSON.stringify([window.home,window.product,window.amount,window.context,window.rootTarget,window.initialStep]); }
export function createEmpireProductionStore(state: StatePort,canRelease: (home: string) => boolean) {
  const read = () => peekState(state,key,schema)?.windows ?? [];
  function write(previous: readonly EmpireProductionWindow[],windows: EmpireProductionWindow[]): boolean {
    const data = { windows: [...windows].sort((a,b) => a.home.localeCompare(b.home)) };
    if (!schema.valid(data)) throw new Error('Invalid empire production windows');
    if (JSON.stringify(previous) === JSON.stringify(data.windows)) return false;
    state.write(key,{ owner: schema.owner,version: schema.version,data: copyPlain(data) }); return true;
  }
  function update(home: string,edit: (window: EmpireProductionWindow) => EmpireProductionWindow): boolean {
    const previous = read(); return write(previous,previous.map(window => window.home === home ? edit(window) : window));
  }
  return { list: read,
    admit(context: string,inputs: readonly EmpireProductionAdmission[]) {
      if (inputs.length > 50 || new Set(inputs.map(item => item.home)).size !== inputs.length) throw new Error('Invalid admission scope');
      const previous = read(), windows = [...previous];
      for (const input of inputs) {
        const candidate = admitted(context,input), existing = previous.find(window => window.home === input.home);
        if (existing && identity(existing) !== identity(candidate)) throw new Error('Conflicting empire production window');
        if (!existing) windows.push(candidate);
      }
      return write(previous,windows);
    },
    observe(home: string,inventory: ProductionInventory,recipe: RecipeLookup,options: ProductionOptions) { return update(home,window => progressEmpireWindow(window,inventory,recipe,options)); },
    retire(home: string) { return update(home,window => ({ ...window,retiring: true })); },
    release(home: string) {
      const previous = read(), window = previous.find(item => item.home === home);
      if (!window?.retiring || !canRelease(home)) return false;
      return write(previous,previous.filter(item => item.home !== home));
    },
  };
}
