import type { CandidateDefense } from '../features/planning/candidate-defense';
/** One observation/policy owns a room's defense accelerator; persistent progress remains authoritative. */
export function createPlanningDefenseCache() {
  let saved: { identity: string; defense: CandidateDefense } | undefined;
  return (identity: string, create: () => CandidateDefense): CandidateDefense => {
    if (!identity) throw new Error('Missing defense cache identity');
    if (saved?.identity !== identity) saved = { identity, defense: create() };
    return saved.defense;
  };
}
