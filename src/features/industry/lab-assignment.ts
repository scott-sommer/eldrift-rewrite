import type { StatePort } from '../../persistence/versioned-state';
import { openState, saveState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { labStateSchema } from './lab-state';
import { reconcileLabServices, labServicesBusy } from './lab-services';
import { assignReactionLabs } from '../../capabilities/industry/labs/assignment';
import type { LabAssignment } from '../../capabilities/industry/labs/assignment';
import type { ReactionLab } from '../../capabilities/industry/labs/model';
export interface LabRecipe { product: string; reagents: readonly [string,string] }
/** A recipe/roster change drains admitted work before replacing pinned role identities. */
export function reconcileLabAssignment(state: StatePort,room: string,tick: number,labs: readonly ReactionLab[],recipe: LabRecipe | null): LabAssignment | null {
  const key = stateKey('industry-labs',room);
  if (!recipe && state.read(key) === undefined) return null;
  const current = openState(state,key,labStateSchema), previous = current.assignment;
  if (recipe && previous && unchanged(previous,recipe,labs)) return previous;
  reconcileLabServices(state,room,tick,[],0);
  if (labServicesBusy(state,room,tick)) return null;
  current.assignment = recipe ? assignReactionLabs(labs,recipe.product,recipe.reagents) : null;
  saveState(state,key,labStateSchema,current);
  return current.assignment;
}
function unchanged(assignment: LabAssignment,recipe: LabRecipe,labs: readonly ReactionLab[]): boolean {
  return assignment.product === recipe.product && assignment.reagents.every((resource,index) => resource === recipe.reagents[index])
    && JSON.stringify(assignment.roster) === JSON.stringify(labs.map(lab => lab.id).sort());
}
