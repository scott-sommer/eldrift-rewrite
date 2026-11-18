import { bodyCost, partCosts } from '../spawning/body';
import type { RemoteBody, RemoteHauler } from './remote-model';
export interface OperatingBody { cost: number; spawnTicks: number; productiveTicks: number; work: number; capacity: number }
/** Replacement interval excludes initial travel from actual post-spawn lifetime. */
export function operatingBody(input: RemoteBody): OperatingBody | undefined {
  validateParts(input.body);
  validateTiming(input);
  const productiveTicks = input.lifetime - input.travelTicks - (input.replacementMargin ?? 0);
  if (productiveTicks <= 0) return undefined;
  if (input.travelTicks > 0 && !input.body.includes('move')) return undefined;
  return { cost: bodyCost(input.body), spawnTicks: input.body.length * 3, productiveTicks,
    work: input.body.filter(part => part === 'work').length, capacity: input.body.filter(part => part === 'carry').length * 50 };
}

/** The first loaded delivery must fit; positive outbound lifetime alone is insufficient. */
export function operatingHauler(input: RemoteHauler): OperatingBody | undefined {
  const result = operatingBody({ ...input,travelTicks: input.outboundTicks });
  if (!result) return undefined;
  const trip = input.outboundTicks + input.returnTicks + input.serviceTicks;
  if (trip >= input.lifetime - (input.replacementMargin ?? 0)) return undefined;
  if (input.returnTicks > 0 && !input.body.includes('move')) return undefined;
  return result;
}
function validateParts(body: RemoteBody['body']): void {
  if (!Array.isArray(body) || !body.length || body.length > 50) throw new Error('Invalid economic body');
  if (!body.every(part => typeof part === 'string' && Object.hasOwn(partCosts,part))) throw new Error('Invalid economic body part');
}
function validateTiming(input: RemoteBody): void {
  if (!Number.isSafeInteger(input.lifetime) || input.lifetime < 1) throw new Error('Invalid economic lifetime');
  if (!Number.isFinite(input.travelTicks) || input.travelTicks < 0) throw new Error('Invalid economic travel');
  const margin = input.replacementMargin ?? 0;
  if (!Number.isFinite(margin) || margin < 0) throw new Error('Invalid economic replacement margin');
}
