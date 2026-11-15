import { validateLayoutCapacity } from './capacity-validation';
import { validatePlanningConstraints } from './preservation';
import { validateStageAccess } from './access-validation';
import { reactionGeometry } from './lab-geometry';
import type { StagedTile } from './template';
import type { StructureLimits } from './core-model';
import type { PlanningConstraint } from './assessment-model';
import type { assessRoom } from './assessment';
export interface DraftValidationInput {
  assessment: ReturnType<typeof assessRoom>;
  entries: readonly StagedTile[];
  limits: StructureLimits;
  constraints: readonly PlanningConstraint[];
  blocksMovement: (type: string) => boolean;
  placementFailures: (entries: readonly StagedTile[]) => readonly string[];
}
export type DraftValidation =
  | { ok: false; phase: 'capacity' | 'constraints' | 'placement' | 'labs' | 'access'; details: unknown }
  | { ok: true };
/** Structural draft gate. The caller must supply authoritative placement legality checks. */
export function validateDraft(input: DraftValidationInput): DraftValidation {
  const capacity = validateLayoutCapacity(input.entries, input.limits);
  if (capacity.length) return { ok: false, phase: 'capacity', details: capacity };
  const constraints = validatePlanningConstraints(input.entries, input.constraints);
  if (constraints.length) return { ok: false, phase: 'constraints', details: constraints };
  const placement = input.placementFailures(input.entries);
  if (placement.length) return { ok: false, phase: 'placement', details: placement };
  const labs = invalidLabStages(input.entries);
  if (labs.length) return { ok: false, phase: 'labs', details: labs };
  const access = validateStageAccess(input.assessment, input.entries, input.blocksMovement).filter(stage => !stage.connected);
  if (access.length) return { ok: false, phase: 'access', details: access };
  return { ok: true };
}
function invalidLabStages(entries: readonly StagedTile[]): number[] {
  const failures: number[] = [];
  for (let rcl = 1; rcl <= 8; rcl++) {
    const labs = entries.filter(entry => entry.type === 'lab' && entry.rcl <= rcl);
    if (labs.length > 0 && !reactionGeometry(labs.map(entry => entry.position))) failures.push(rcl);
  }
  return failures;
}
