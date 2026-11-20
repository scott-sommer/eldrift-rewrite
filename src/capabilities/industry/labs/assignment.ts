import type { ReactionLab, ReactionNetwork } from './model';
import { selectReactionNetwork } from './topology';
export interface LabAssignment {
  product: string; reagents: readonly [string,string]; inputs: readonly [string,string]; outputs: readonly string[]; roster: readonly string[];
}
export function assignReactionLabs(labs: readonly ReactionLab[],product: string,reagents: readonly [string,string]): LabAssignment | null {
  const network = selectReactionNetwork(labs,reagents,product,true);
  return network ? { product,reagents: [...reagents],inputs: [network.inputs[0].id,network.inputs[1].id],outputs: network.outputs.map(lab => lab.id),roster: labs.map(lab => lab.id).sort() } : null;
}
/** Dirty assignments stay pinned while transport clears them. Only compatible observed stock may react. */
export function assignedReactionNetwork(assignment: LabAssignment,labs: readonly ReactionLab[]): ReactionNetwork | null {
  const first = labs.find(lab => lab.id === assignment.inputs[0]), second = labs.find(lab => lab.id === assignment.inputs[1]);
  if (first?.mineral !== assignment.reagents[0] || second?.mineral !== assignment.reagents[1]) return null;
  const outputs = labs.filter(lab => assignment.outputs.includes(lab.id) && (lab.mineral === null || lab.mineral === assignment.product));
  return { inputs: [first,second],outputs };
}
