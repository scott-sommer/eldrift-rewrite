import { pipelineFamily } from './remote-pipeline-probe';
interface ObservedUnit { name: string; family: string; room: string; ttl: number | null; spawning: boolean; cargo: number }
interface Expiry { name: string; family: string; tick: number; lastCargo: number; tombstoneEnergy: number; id: string }
export interface StartupAttrition {
  previous: ObservedUnit[]; expiries: Expiry[]; knownAssets: string[]; recoveredAttempts: number;
  inactiveEnergy: number; localExpiryEnergy: number;
}
export function observeStartupAttrition(previous?: StartupAttrition): StartupAttrition {
  const state = previous ?? { previous: [],expiries: [],knownAssets: [],recoveredAttempts: 0,inactiveEnergy: 0,localExpiryEnergy: 0 };
  const home = Game.rooms.W0N1!, tombstones = home.find(FIND_TOMBSTONES), drops = home.find(FIND_DROPPED_RESOURCES).filter(item => item.resourceType === RESOURCE_ENERGY);
  const alive = new Set(Object.keys(Game.creeps));
  for (const old of state.previous) {
    if (alive.has(old.name) || old.spawning || old.ttl !== 1) continue;
    const tombstone = tombstones.find(item => item.creep.name === old.name);
    if (!tombstone) continue;
    const energy = tombstone.store.energy;
    state.expiries.push({ name: old.name,family: old.family,tick: Game.time,lastCargo: old.cargo,tombstoneEnergy: energy,id: tombstone.id });
    if (old.family === 'distributor' && old.room === 'W0N1') state.localExpiryEnergy += energy;
  }
  state.knownAssets = [...new Set([...state.knownAssets,...tombstones.map(item => item.id),...drops.map(item => item.id)])];
  state.inactiveEnergy = tombstones.reduce((sum,item) => sum+item.store.energy,0)+drops.reduce((sum,item) => sum+item.amount,0);
  state.previous = Object.values(Game.creeps).map(creep => ({ name: creep.name,family: pipelineFamily(creep.memory.population?.owner ?? '') ?? 'other',room: creep.room.name,
    ttl: creep.ticksToLive ?? null,spawning: creep.spawning,cargo: creep.store.energy }));
  return state;
}
/** This controlled fixture disables reclamation; a successful asset collection invalidates simple loss attribution. */
export function instrumentStartupCollections(state: StartupAttrition): () => void {
  const withdraw = Creep.prototype.withdraw, pickup = Creep.prototype.pickup;
  Creep.prototype.withdraw = function(target,resource,amount) {
    const code = withdraw.call(this,target,resource,amount);
    if (code === OK && resource === RESOURCE_ENERGY && state.knownAssets.includes(target.id)) state.recoveredAttempts++;
    return code;
  };
  Creep.prototype.pickup = function(target) {
    const code = pickup.call(this,target);
    if (code === OK && target.resourceType === RESOURCE_ENERGY && state.knownAssets.includes(target.id)) state.recoveredAttempts++;
    return code;
  };
  return () => { Creep.prototype.withdraw = withdraw; Creep.prototype.pickup = pickup; };
}
