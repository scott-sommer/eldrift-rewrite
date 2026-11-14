export interface WorkSupplyView {
  storageAvailable: boolean;
  container: { id: string; energy: number; free: number } | undefined;
  workers: readonly { id: string; free: number }[];
}
/** Legacy no-storage fallback: infrastructure first, controller reserve next, workers last. */
export function workSupplySinks(view: WorkSupplyView, urgentDemand: boolean, controllerTarget: number) {
  if (view.storageAvailable || urgentDemand) return [];
  if (view.container && view.container.energy < controllerTarget && view.container.free > 0) {
    return [{ id: view.container.id, free: Math.min(view.container.free, controllerTarget - view.container.energy), priority: 0 }];
  }
  return view.workers.filter(unit => unit.free > 25).map(unit => ({ ...unit, priority: 1 }));
}
