import { copyPlain } from '../../../../../core/plain-data';
import type { EnergyBuildSite,EnergyEcology } from '../../../../../capabilities/resources/energy-inventory/model';
import type { HomeHaulingInput } from './model';
/** Only births declared by captured sites may expand the immutable physical roster on restore. */
export function expandHomeConstruction(input: HomeHaulingInput,current: EnergyEcology | undefined): HomeHaulingInput {
  const original = input.ecology?.sites ?? [],restored = current?.sites ?? [];
  if (original.length !== restored.length) throw new Error('Home checkpoint construction roster mismatch');
  const expanded = copyPlain(input);
  for (const site of restored) {
    const opening = original.find(value => value.id === site.id);
    validateSiteContinuation(opening,site);
    if (opening.completedAt === undefined && site.completedAt !== undefined) appendBirth(expanded,site);
  }
  return expanded;
}
function validateSiteContinuation(opening: EnergyBuildSite | undefined,site: EnergyBuildSite): asserts opening is EnergyBuildSite {
  if (!opening || JSON.stringify(metadata(opening)) !== JSON.stringify(metadata(site))) throw new Error('Home checkpoint construction metadata mismatch');
  if (opening.completedAt !== undefined && site.completedAt !== opening.completedAt) throw new Error('Home checkpoint construction clock changed');
  if (site.progress < opening.progress) throw new Error('Home checkpoint construction progress regressed');
}
function metadata(site: EnergyBuildSite) {
  return { id: site.id,position: site.position,structureType: site.structureType,progressTotal: site.progressTotal,completion: site.completion };
}
function appendBirth(input: HomeHaulingInput,site: EnergyBuildSite): void {
  if (!input.ecology || !site.completion) throw new Error('Home checkpoint undeclared construction birth');
  if (site.completedAt! <= input.observedAt) throw new Error('Home checkpoint construction predates opening');
  const birth = copyPlain(site.completion);
  input.inventories = [...input.inventories,birth.store];
  input.ecology.containers.push(birth.container); (input.ecology.structures ??= []).push(birth.health);
}
