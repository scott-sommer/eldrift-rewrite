import type { LabAssignment } from './assignment';
import type { ReactionLab } from './model';
export interface LabWarehouse { id: string; stock: Readonly<Record<string,number>>; free: number }
export interface LabTransportOptions { needed: number; inputReserve: number; supplyReserve: number; maximum: number }
export interface LabTransfer { lab: string; transfer: { direction: string; source: string; sink: string; resource: string; quantity: number } }
/** One service per lab. Clear incompatible minerals before filling; every output mineral is banked. */
export function planLabTransport(assignment: LabAssignment,labs: readonly ReactionLab[],stores: readonly LabWarehouse[],options: LabTransportOptions): readonly LabTransfer[] {
  const result: LabTransfer[] = [];
  for (const lab of labs.filter(lab => [...assignment.inputs,...assignment.outputs].includes(lab.id))) {
    const index = assignment.inputs.indexOf(lab.id), resource = index < 0 ? null : assignment.reagents[index]!;
    const transfer = lab.mineral && (resource !== lab.mineral || index < 0)
      ? drain(lab,stores,options.maximum) : refill(lab,resource,stores,options);
    if (transfer) result.push({ lab: lab.id,transfer });
  }
  return result;
}
function drain(lab: ReactionLab,stores: readonly LabWarehouse[],maximum: number) {
  const sink = stores.find(store => store.free > 0);
  const quantity = Math.min(lab.amount,sink?.free ?? 0,maximum);
  return sink && quantity > 0 && lab.mineral ? { direction: 'drain',source: lab.id,sink: sink.id,resource: lab.mineral,quantity } : undefined;
}
function refill(lab: ReactionLab,resource: string | null,stores: readonly LabWarehouse[],options: LabTransportOptions) {
  if (!resource || !options.needed) return undefined;
  const source = stores.find(store => (store.stock[resource] ?? 0) > options.supplyReserve);
  const target = Math.min(lab.amount+lab.free,options.needed+options.inputReserve);
  const quantity = Math.min(Math.max(0,target-lab.amount),Math.max(0,(source?.stock[resource] ?? 0)-options.supplyReserve),options.maximum);
  return source && quantity > 0 ? { direction: 'refill',source: source.id,sink: lab.id,resource,quantity } : undefined;
}
