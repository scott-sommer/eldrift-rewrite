import type { BoostBodyPart, BoostStep } from '../../../capabilities/industry/boosts/model';

export interface BoostPreference { part: string; compounds: readonly string[] }
export type BoostPreferences = Readonly<Record<string, BoostPreference>>;
export interface BoostBudget { minerals: Readonly<Record<string, number>>; energy: number }
export interface BoostPrice { mineral: number; energy: number }
export type BoostSelection =
  | { status: 'selected'; steps: readonly BoostStep[] }
  | { status: 'unavailable'; alias: string; reason: 'body' | 'stock' };

function positive(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
function stock(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function validate(aliases: readonly string[],body: readonly BoostBodyPart[],budget: BoostBudget,price: BoostPrice): void {
  if (aliases.length < 1 || aliases.length > 8 || body.length > 50) throw new Error('Invalid boost selection bounds');
  if (!positive(price.mineral) || !positive(price.energy)) throw new Error('Invalid boost price');
  if (!stock(budget.energy) || !Object.values(budget.minerals).every(stock)) throw new Error('Invalid boost budget');
  if (!body.every(part => stock(part.hits) && part.hits <= 100)) throw new Error('Invalid boost body');
}
function preferencesFor(aliases: readonly string[],preferences: BoostPreferences): BoostPreference[] {
  const selected = aliases.map(alias => {
    const preference = Object.hasOwn(preferences,alias) ? preferences[alias] : undefined;
    if (!preference || !preference.part || preference.part.length > 20 || !preference.compounds.length || preference.compounds.length > 8) throw new Error('Unknown or invalid boost preference: '+alias);
    if (!preference.compounds.every(resource => resource.length > 0 && resource.length <= 20)) throw new Error('Invalid boost compound');
    return preference;
  });
  if (new Set(selected.map(item => item.part)).size !== selected.length) throw new Error('Conflicting boost body types');
  return selected;
}
function candidate(preference: BoostPreference,body: readonly BoostBodyPart[],budget: BoostBudget,price: BoostPrice): BoostStep | null {
  const parts = body.filter(part => part.type === preference.part);
  if (!parts.length || parts.some(part => part.hits === 0)) return null;
  for (const resource of preference.compounds) {
    if (parts.some(part => part.boost !== null && part.boost !== resource)) continue;
    const missing = parts.filter(part => part.boost === null).length;
    if (missing*price.mineral > (budget.minerals[resource] ?? 0) || missing*price.energy > budget.energy) continue;
    return { part: preference.part,resource,count: parts.length };
  }
  return null;
}
/** Caller supplies unreserved stock after policy floors; selection itself does not reserve or promise readiness. */
export function selectBoostPlan(aliases: readonly string[],body: readonly BoostBodyPart[],budget: BoostBudget,price: BoostPrice,preferences: BoostPreferences): BoostSelection {
  validate(aliases,body,budget,price);
  const chosen = preferencesFor(aliases,preferences), minerals = { ...budget.minerals }, steps: BoostStep[] = [];
  let energy = budget.energy;
  for (const [index,preference] of chosen.entries()) {
    const step = candidate(preference,body,{ minerals,energy },price);
    if (!step) return { status: 'unavailable',alias: aliases[index]!,reason: body.some(part => part.type === preference.part) ? 'stock' : 'body' };
    const missing = body.filter(part => part.type === step.part && part.boost === null).length;
    minerals[step.resource] = (minerals[step.resource] ?? 0)-missing*price.mineral;
    energy -= missing*price.energy;
    steps.push(step);
  }
  return { status: 'selected',steps };
}
