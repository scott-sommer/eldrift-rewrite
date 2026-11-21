import type { LabProductionConfig } from '../../config/lab-production';
import type { RecipeLookup } from '../../capabilities/industry/production/model';
import { selectStockThresholds } from '../../capabilities/industry/production/stock-thresholds';
export function productionPolicySignature(config: Readonly<LabProductionConfig>): string {
  return config.labProductionPolicy === 'targets' ? JSON.stringify(['targets',config.labProductionTargets])
    : JSON.stringify(['thresholds',config.labProductionThresholds,config.labIntermediateBase,config.labIntermediatePerTerminal]);
}
export function configuredProductionTargets(config: Readonly<LabProductionConfig>) {
  return config.labProductionPolicy === 'thresholds' ? config.labProductionThresholds : config.labProductionTargets;
}
export function selectProductionPolicy(config: Readonly<LabProductionConfig>,stock: Readonly<Record<string,number>>,terminals: number,recipe: RecipeLookup) {
  if (config.labProductionPolicy === 'targets') return { targets: config.labProductionTargets,context: config.labProductionTargets };
  const selected = selectStockThresholds(config.labProductionThresholds,stock,recipe,{ base: config.labIntermediateBase,perTerminal: config.labIntermediatePerTerminal,terminals });
  // Effective intermediate deficits change with stock; durable context changes only with policy/active root/floor.
  return { targets: selected.targets,context: ['stock-thresholds/1',productionPolicySignature(config),selected.selection,selected.intermediate] };
}
