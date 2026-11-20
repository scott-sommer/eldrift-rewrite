import { populationMemory, observePopulation, observeSpawning } from '../../src/adapters/screeps/population';
import { loop as botLoop } from '../../src/main';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { sourceMiner } from '../../src/capabilities/spawning/economy-recipes';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import type { Position } from '../../src/capabilities/movement/step';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const state = createMemoryPort(() => Memory);
function coordinator() { return createSpawnCoordinator(state, { clock: () => Game.time, invoke: createNativeSpawn(populationMemory) }, observeSpawning, 'skip'); }
declare global { interface Memory { spawnEvidence?: { accepted: number; observed: boolean[]; spawning: boolean[]; rejected: number[]; selected?: string; exit?: Position; actualExit?: Position; activeAt?: number; directions?: number[]; queueVersion?: number; legacy?: unknown } } }
export function loop() {
  botLoop();
  const evidence = Memory.spawnEvidence ??= { accepted: 0, observed: [], spawning: [],rejected: [] };
  const queue = createSpawnQueue(state, 'W0N1');
  if (evidence.observed.length === 0) {
    state.write('spawning/W0N1',{ owner: 'population',version: 1,data: { requests: [{ id: 'legacy',name: 'legacy',owner: 'unrelated',room: 'W0N1',body: ['move'],priority: 10,readyAt: 100,expiresAt: 200 }] } });
    submitMiner(false);
  }
  if (Game.time === 2) { queue.cancel('miner-invalid','economy'); submitMiner(true); }
  const creep = Game.creeps['new-miner'];
  if (creep && !observePopulation().some(unit => unit.name === creep.name && unit.owner === 'economy' && unit.room === 'W0N1')) throw new Error('Population identity lost');
  evidence.observed.push(creep !== undefined);
  evidence.spawning.push(creep?.spawning ?? false);
  const receipts = coordinator()();
  if (coordinator()().length !== 0) throw new Error('Reconstructed coordinator dispatched twice');
  evidence.accepted += receipts.filter(receipt => receipt.status === 'accepted').length;
  evidence.rejected.push(...receipts.flatMap(receipt => receipt.status === 'rejected' ? [receipt.code] : []));
  const spawn = Object.values(Game.spawns)[0]!;
  if (spawn.spawning) evidence.directions = [...(spawn.spawning.directions ?? [])];
  if (creep && !creep.spawning && !evidence.actualExit) { evidence.actualExit = { room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y }; evidence.activeAt = Game.time; }
  evidence.queueVersion = (state.read('spawning/W0N1') as { version: number }).version;
  evidence.legacy = queue.list().find(request => request.id === 'legacy');
  if (creep && queue.list().some(request => request.name === 'new-miner')) throw new Error('Observed birth did not reconcile queue');
}


function submitMiner(valid: boolean): void {
  const spawn = Object.values(Game.spawns)[0]!, exit = { room: spawn.room.name,x: spawn.pos.x-1,y: spawn.pos.y };
  Memory.spawnEvidence!.selected = spawn.id; Memory.spawnEvidence!.exit = exit;
  createSpawnQueue(state,'W0N1').submit({ id: valid ? 'miner-valid' : 'miner-invalid',name: 'new-miner',owner: 'economy',room: 'W0N1',
    priority: 1,readyAt: Game.time,expiresAt: 20,body: sourceMiner(200)!.parts,placement: { spawn: spawn.id,exit: valid ? exit : { ...exit,x: spawn.pos.x } } });
}
