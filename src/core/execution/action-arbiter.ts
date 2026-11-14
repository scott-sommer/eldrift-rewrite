export type IntentResult =
  | { status: 'issued'; code: number }
  | { status: 'rejected'; code: number }
  | { status: 'blocked'; reason: 'owner-conflict' | 'action-conflict' };
interface UnitBudget { owner: string; slots: Set<string> }
/** Inject action compatibility as slot sets; this mechanism contains no role policy. */
export function createActionArbiter(clock: () => number) {
  let tick: number | undefined;
  const units = new Map<string, UnitBudget>();
  function budget(unit: string, owner: string): UnitBudget {
    const current = clock();
    if (tick !== current) { units.clear(); tick = current; }
    let entry = units.get(unit);
    if (!entry) { entry = { owner, slots: new Set() }; units.set(unit, entry); }
    return entry;
  }
  return {
    issue(unit: string, owner: string, slots: readonly string[], invoke: () => number, accepted: (code: number) => boolean): IntentResult {
      if (!unit || !owner || slots.length === 0 || slots.some(slot => !slot)) throw new Error('Invalid action identity');
      const entry = budget(unit, owner);
      if (entry.owner !== owner) return { status: 'blocked', reason: 'owner-conflict' };
      if (slots.some(slot => entry.slots.has(slot))) return { status: 'blocked', reason: 'action-conflict' };
      // Reserve before invoking: re-entry or an exception cannot issue a duplicate intent.
      for (const slot of slots) entry.slots.add(slot);
      const code = invoke();
      if (accepted(code)) return { status: 'issued', code };
      for (const slot of slots) entry.slots.delete(slot);
      return { status: 'rejected', code };
    },
  };
}
