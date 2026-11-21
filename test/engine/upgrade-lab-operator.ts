import { industry } from '../../src/main';
import { nativeUpgradeLab } from '../../src/app/native-specialist-labs';
declare global { interface Memory { specialistOperatorChecked?: boolean } }
export function verifySpecialistOperator(): void {
  if (Memory.specialistOperatorChecked) return;
  const lab = nativeUpgradeLab(Game.rooms.W0N1!)!, request = { resource: 'ZO',mineral: 30,energy: 20 }, api = industry.labs;
  const before = JSON.stringify(Memory.eldrift), preview = api.previewBoostRoles('W0N1',[request],{ preserveReactions: false });
  if (!preview.ok || preview.plan.roles.some(role => role.lab === lab.id)) throw new Error('Operator allocation consumed specialist lab');
  if (api.previewBoostRoles('W0N1',[request],{ preserveReactions: true }).ok) throw new Error('Operator overpromised remaining reaction topology');
  const all = api.previewAllBoostRoles([request],{ preserveReactions: false });
  if (!all.ok || all.rooms.some(room => room.result.ok && room.result.plan.roles.some(role => role.lab === lab.id))) throw new Error('Bulk operator allocation consumed specialist lab');
  let refused = false;
  try { api.configure('W0N1',{ labBoostRoles: [{ ...request,lab: lab.id }] }); } catch { refused = true; }
  if (!refused || JSON.stringify(Memory.eldrift) !== before) throw new Error('Incompatible specialist binding partially wrote configuration');
  api.configure('W0N1',{ labBoostRoles: [{ lab: lab.id,resource: 'XGH2O',mineral: 0,energy: 0 }] });
  Memory.specialistOperatorChecked = true;
}
