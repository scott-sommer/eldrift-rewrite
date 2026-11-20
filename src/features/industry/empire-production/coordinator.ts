import type { ProductionTarget, RecipeLookup } from '../../../capabilities/industry/production/model';
import type { EmpireProductionRoom } from '../../../capabilities/industry/production/empire';
import { planEmpireProduction } from '../../../capabilities/industry/production/empire';
import type { createEmpireProductionStore } from './store';
export interface EmpireProductionSnapshot extends EmpireProductionRoom { ready: boolean }
interface CoordinationInput {
  context: string; targets: readonly ProductionTarget[]; stock: Readonly<Record<string,number>>;
  rooms: readonly EmpireProductionSnapshot[]; visible: ReadonlySet<string>; maximumNodes: number;
}
type Store = ReturnType<typeof createEmpireProductionStore>;
function observeWindows(store: Store,input: CoordinationInput,recipe: RecipeLookup): void {
  for (const window of store.list()) {
    const room = input.rooms.find(item => item.home === window.home);
    if (window.context !== input.context || !input.targets.some(target => target.product === window.product)) store.retire(window.home);
    else if (room) store.observe(window.home,room.inventory,recipe,room.options);
    else if (input.visible.has(window.home)) store.retire(window.home);
  }
}
function retireExcess(store: Store,input: CoordinationInput): void {
  const missing = new Map(input.targets.map(target => [target.product,Math.max(0,target.amount-(input.stock[target.product] ?? 0))]));
  for (const window of store.list()) {
    const available = missing.get(window.product) ?? 0;
    if (window.remaining > available) store.retire(window.home);
    missing.set(window.product,Math.max(0,available-window.remaining));
  }
}
/** Reconcile existing work before allocating; unseen windows freeze new admissions without erasing state. */
export function coordinateEmpireProduction(store: Store,input: CoordinationInput,recipe: RecipeLookup) {
  observeWindows(store,input,recipe); retireExcess(store,input);
  for (const window of store.list().filter(item => item.retiring)) store.release(window.home);
  const windows = store.list();
  if (windows.some(window => !input.visible.has(window.home))) return windows;
  const proposed = planEmpireProduction({ targets: input.targets,stock: input.stock,rooms: input.rooms.filter(room => room.ready),
    commitments: windows.map(window => ({ home: window.home,product: window.product,amount: window.remaining })),maximumNodes: input.maximumNodes },recipe);
  store.admit(input.context,proposed.map(item => ({ ...item,rootStock: input.rooms.find(room => room.home === item.home)!.inventory.total[item.product] ?? 0 })));
  return store.list();
}
