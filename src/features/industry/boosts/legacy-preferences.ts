import type { BoostBodyPart } from '../../../capabilities/industry/boosts/model';
import type { BoostBudget, BoostPreferences, BoostPrice, BoostSelection } from './selection-policy';
import { selectBoostPlan } from './selection-policy';

// Legacy booster.js 82–147, strongest tier first. WORK means dismantle; upgrade/build are separate intents.
const definitions: Record<string, { part: string; compounds: string[] }> = {
  move: { part: 'move',compounds: ['XZHO2','ZHO2','ZO'] },
  heal: { part: 'heal',compounds: ['XLHO2','LHO2','LO'] },
  work: { part: 'work',compounds: ['XZH2O','ZH2O','ZH'] },
  attack: { part: 'attack',compounds: ['XUH2O','UH2O','UH'] },
  ranged_attack: { part: 'ranged_attack',compounds: ['XKHO2','KHO2','KO'] },
  tough: { part: 'tough',compounds: ['XGHO2','GHO2','GO'] },
  upgrade: { part: 'work',compounds: ['XGH2O','GH2O','GH'] },
  build: { part: 'work',compounds: ['XLH2O','LH2O','LH'] },
  carry: { part: 'carry',compounds: ['XKH2O','KH2O','KH'] },
};
export const legacyBoostPreferences: BoostPreferences = Object.freeze(Object.fromEntries(
  Object.entries(definitions).map(([alias,entry]) => [alias,Object.freeze({ part: entry.part,compounds: Object.freeze(entry.compounds) })]),
));
export interface LegacyBoostActor { role: string; remoteUpgrader: boolean; body: readonly BoostBodyPart[] }
export function selectLegacyBoostPlan(aliases: readonly string[],actor: LegacyBoostActor,budget: BoostBudget,price: BoostPrice): BoostSelection | { status: 'skipped'; reason: 'remote-upgrader' } {
  if (actor.role === 'upgrader' && actor.remoteUpgrader) return { status: 'skipped',reason: 'remote-upgrader' };
  return selectBoostPlan(aliases,actor.body,budget,price,legacyBoostPreferences);
}
