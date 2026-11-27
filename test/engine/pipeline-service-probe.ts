import { recordSharedServiceCall } from './pipeline-shared-service-trace';
import { recordCalibrationCall } from './pipeline-cohort-calibration';
import { sameLogisticsService } from '../../src/capabilities/logistics/service';
import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
import type { PipelineServiceMemory } from './pipeline-service-policy';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { LogisticsRequest } from '../../src/capabilities/logistics/request';
/** Observe accepted SDK calls; transfer settlement remains independently tracked by pipeline receipts. */
export function withPipelineServiceProbe(run: () => void): void {
  if (!(Memory as PipelineServiceMemory).pipelineServiceMode) { run(); return; }
  const harvest = Creep.prototype.harvest, withdraw = Creep.prototype.withdraw, transfer = Creep.prototype.transfer, repair = Creep.prototype.repair;
  Creep.prototype.harvest = function(target) { const code = harvest.call(this,target); record(this,'harvest',target,code); return code; };
  Creep.prototype.withdraw = function(target,resource,amount) { const code = withdraw.call(this,target,resource,amount); record(this,'withdraw',target,code,amount); return code; };
  Creep.prototype.transfer = function(target,resource,amount) { const code = transfer.call(this,target,resource,amount); record(this,'transfer',target,code,amount); return code; };
  Creep.prototype.repair = function(target) { const code = repair.call(this,target); record(this,'repair',target,code); return code; };
  try { run(); } finally { Creep.prototype.harvest = harvest; Creep.prototype.withdraw = withdraw; Creep.prototype.transfer = transfer; Creep.prototype.repair = repair; }
}
type PositionedTarget = { id: string; pos: { roomName: string; x: number; y: number } };
function record(creep: Creep, action: 'harvest' | 'withdraw' | 'transfer' | 'repair', target: PositionedTarget & { energy?: number; hits?: number; hitsMax?: number }, code: number, amount?: number): void {
  recordSharedServiceCall(creep,action,target.id,code,amount);
  if (code !== OK) return;
  const identity = remoteFleetIdentity(creep.memory.population?.owner ?? ''); if (!identity) return;
  const memory = Memory as PipelineServiceMemory, plan = memory.pipelineServicePlans?.[identity.source]?.plan; if (!plan) return;
  recordCalibrationCall(creep,action,target,amount);
  const request = requestOf(creep);
  const matches = serviceMatches(creep,action,target,plan,request);
  if (matches === undefined) return; // Ordinary retirement banking is a separate recovery policy.
  const key = action+':'+creep.name, rows = memory.pipelineServiceCalls ??= {};
  const row = rows[key] ??= { count: 0,firstAt: Game.time,lastAt: Game.time,matches: true };
  row.count++; row.lastAt = Game.time; row.matches &&= matches;
}
function requestOf(creep: Creep): LogisticsRequest | undefined {
  const raw = createMemoryPort(() => Memory).read('tasks/'+creep.name) as { data?: { queue?: { kind: string; payload: { request?: LogisticsRequest } }[] } } | undefined;
  const head = raw?.data?.queue?.[0]; return head?.kind === 'haul' ? head.payload.request : undefined;
}

function serviceMatches(creep: Creep, action: string, target: PositionedTarget, plan: StartupTravelPlan, request: LogisticsRequest | undefined) {
  if (action === 'repair') return undefined;
  if (action !== 'harvest' && !request?.service) return undefined;
  const expected = action === 'harvest' ? plan.station : action === 'withdraw' ? plan.collection : plan.endpoint.deposit;
  return samePoint(creep.pos,expected) && targetMatches(action,target,plan) && requestMatches(action,request,plan);
}
function targetMatches(action: string, target: PositionedTarget, plan: StartupTravelPlan): boolean {
  if (action === 'harvest') return target.id === plan.source;
  return action === 'transfer' ? target.id === plan.endpoint.id : samePoint(target.pos,plan.station);
}
function requestMatches(action: string, request: LogisticsRequest | undefined, plan: StartupTravelPlan): boolean {
  return action === 'harvest' || sameLogisticsService(request?.service,{ collection: plan.collection,deposit: plan.endpoint.deposit,avoid: [plan.station] });
}
function samePoint(actual: PositionedTarget['pos'], expected: StartupTravelPlan['station']): boolean {
  return actual.roomName === expected.room && actual.x === expected.x && actual.y === expected.y;
}
