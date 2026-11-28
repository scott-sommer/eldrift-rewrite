import { tileKey } from '../../movement/traffic/model';
import { validateBirthRecipe,validateBirthMetadata } from './construction-birth';
import type { EnergyEcology,EnergyInventory,EnergyBuildSite } from './model';
export function validateBuildSites(ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  const sites = ecology.sites ?? [];
  validateIdentities(sites);
  for (const site of sites) {
    validateSite(site);
    validateSiteRoster(site,ecology,stores);
  }
}
function validateIdentities(sites: readonly EnergyBuildSite[]): void {
  const ids = sites.map(site => site.id),births = sites.flatMap(site => site.completion ? [site.completion.store.id] : []);
  if (!Array.isArray(sites) || sites.length > 256 || new Set(ids).size !== ids.length || new Set(births).size !== births.length || ids.some(id => births.includes(id))) throw new Error('Invalid construction identities');
}
function validateSite(site: EnergyBuildSite): void {
  tileKey(site.position);
  if (!site.id || !site.structureType || !quantity(site.progress) || !quantity(site.progressTotal) || site.progressTotal < 1 || site.progress > site.progressTotal) throw new Error('Invalid construction progress');
  validateCompletionPhase(site);
  validateBirthRecipe(site);
}
function validateCompletionPhase(site: EnergyBuildSite): void {
  if ((site.progress === site.progressTotal) !== (site.completedAt !== undefined)) throw new Error('Invalid construction completion phase');
  if (site.completedAt !== undefined && (!Number.isSafeInteger(site.completedAt) || site.completedAt < 0)) throw new Error('Invalid construction completion clock');
}
function validateSiteRoster(site: EnergyBuildSite,ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  if (stores.some(store => store.id === site.id) || ecology.sources.some(source => source.id === site.id)) throw new Error('Construction site identity collision');
  if (!site.completion) return;
  const id = site.completion.store.id,container = ecology.containers.find(value => value.id === id),health = ecology.structures?.find(value => value.id === id),store = stores.find(value => value.id === id);
  if (ecology.sources.some(source => source.id === id)) throw new Error('Construction birth/source collision');
  if (site.completedAt === undefined) {
    if (container || health || store) throw new Error('Premature construction birth');
    return;
  }
  validateBirthMetadata(site,container,health,store);
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
