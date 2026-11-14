import { upgradeLifecycleSchema } from './upgrade-lifecycle-model';
import type { UpgradeLifecycleState, UpgradeLifecycleView, UpgradeLifecyclePolicy, UpgradeControllerCommand } from './upgrade-lifecycle-model';
export interface UpgradeLifecyclePlan { state: UpgradeLifecycleState; claimerTarget: 0 | 1; reason: string; command?: UpgradeControllerCommand }
/** Observed ownership drives completion; native return codes cannot complete a cycle. */
export function planUpgradeLifecycle(previous: UpgradeLifecycleState, view: UpgradeLifecycleView, policy: UpgradeLifecyclePolicy): UpgradeLifecyclePlan {
  validate(previous, view, policy);
  if (view.tick === previous.lastTick) return { state: previous, claimerTarget: decide(previous, view, policy).claimerTarget, reason: 'already-evaluated' };
  const state = observe(previous, view);
  const decision = decide(state, view, policy);
  if (decision.command) state.attempt = { ...decision.command, tick: view.tick };
  return { state, ...decision };
}
function observe(previous: UpgradeLifecycleState, view: UpgradeLifecycleView): UpgradeLifecycleState {
  const state = { ...previous, lastTick: view.tick };
  const controller = view.controller;
  if (!controller) return state;
  if (state.controller !== controller.id) {
    state.controller = controller.id;
    state.attempt = null;
    state.releaseObserved = false;
  }
  if (state.attempt?.kind === 'unclaim' && controller.ownership === 'neutral') state.releaseObserved = true;
  if (controller.ownership === 'own' && controller.level < 8) {
    if (state.releaseObserved) state.cycles++;
    state.releaseObserved = false;
    state.attempt = null;
  }
  return state;
}
function decide(state: UpgradeLifecycleState, view: UpgradeLifecycleView, policy: UpgradeLifecyclePolicy): Omit<UpgradeLifecyclePlan, 'state'> {
  const controller = view.controller;
  if (!controller) return hold('unseen');
  if (!policy.enabled) return hold('disabled');
  if (controller.ownership === 'foreign' || controller.reservedByOther) return hold('foreign-control');
  if (controller.ownership === 'own' && controller.level < 8) return hold('growing');
  if (!view.fleetActive && !state.releaseObserved) return hold('fleet-paused');
  if (controller.ownership === 'own') return resetDecision(view, policy);
  return claimDecision(view);
}
function claimDecision(view: UpgradeLifecycleView): Omit<UpgradeLifecyclePlan, 'state'> {
  if (!view.freeGcl) return hold('gcl-full');
  const claimerTarget = view.sponsorReady ? 1 : 0;
  if (!view.claimer?.ready) return { claimerTarget, reason: 'awaiting-claimer' };
  return { claimerTarget, reason: 'claim', command: { kind: 'claim', controller: view.controller!.id, claimer: view.claimer.id } };
}
function resetDecision(view: UpgradeLifecycleView, policy: UpgradeLifecyclePolicy): Omit<UpgradeLifecyclePlan, 'state'> {
  if (!policy.cycleAtRcl8) return hold('cycle-disabled');
  if (!view.sponsorReady) return hold('sponsor-unavailable');
  if (!view.claimer?.ready) return { claimerTarget: 1, reason: 'preparing-reset' };
  return { claimerTarget: 1, reason: 'unclaim', command: { kind: 'unclaim', controller: view.controller!.id, claimer: view.claimer.id } };
}
function hold(reason: string): Omit<UpgradeLifecyclePlan, 'state'> { return { claimerTarget: 0, reason }; }
function validate(state: UpgradeLifecycleState, view: UpgradeLifecycleView, policy: UpgradeLifecyclePolicy): void {
  if (!upgradeLifecycleSchema.valid(state) || !Number.isSafeInteger(view.tick) || view.tick < 0 || view.tick < state.lastTick) throw new Error('Invalid lifecycle state/tick');
  if (![policy.enabled, policy.cycleAtRcl8, view.freeGcl, view.sponsorReady, view.fleetActive].every(value => typeof value === 'boolean')) throw new Error('Invalid lifecycle policy');
  validateController(view.controller);
  if (view.claimer && (!identity(view.claimer.id) || typeof view.claimer.ready !== 'boolean')) throw new Error('Invalid claimer observation');
}
function validateController(controller: UpgradeLifecycleView['controller']): void {
  if (controller && (!identity(controller.id) || !['own', 'neutral', 'foreign'].includes(controller.ownership)
    || !Number.isSafeInteger(controller.level) || controller.level < 0 || controller.level > 8
    || typeof controller.reservedByOther !== 'boolean')) throw new Error('Invalid controller observation');
}

function identity(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
