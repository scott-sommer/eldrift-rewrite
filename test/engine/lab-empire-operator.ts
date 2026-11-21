import { industry } from '../../src/main';
/** Public console semantics checked before ordinary native production begins. */
export function verifyEmpireOperatorBoundaries(): void {
  const labs = industry.labs;
  labs.configure('W0N1',{ labProductionTargets: [{ product: 'UH2O',amount: 5,priority: 0 }] });
  const before = JSON.stringify(Memory), preview = labs.previewEmpire({ labProductionBatch: 20 });
  if (preview.ok || JSON.stringify(preview.conflicts) !== JSON.stringify(['W0N1'])) throw new Error('Missing shared target conflict preview');
  let refused = false;
  try { labs.configureEmpire({ labProductionBatch: 20 }); } catch { refused = true; }
  if (!refused || JSON.stringify(Memory) !== before) throw new Error('Conflicting shared policy partially wrote state');
  labs.clearOverride('W0N1',['labProductionTargets']);
  if (!labs.inspectEmpire().ok) throw new Error('Cleared room conflict remained active');
  const original = labs.inspectEmpire().values.labReagentReserve;
  labs.configureEmpire({ labReagentReserve: 7 });
  if (!labs.clearEmpire(['labReagentReserve']).changed || labs.inspectEmpire().values.labReagentReserve !== original) throw new Error('Shared clear failed to restore inherited reserve');
  const restored = JSON.stringify(Memory);
  if (labs.clearEmpire(['labReagentReserve']).changed || JSON.stringify(Memory) !== restored) throw new Error('Repeated shared clear wrote state');
}
