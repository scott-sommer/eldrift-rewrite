import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
export function startupTravelPlan(): StartupTravelPlan {
  return { home: 'W0N1',room: 'E0N1',source: 'source',spawn: { id: 'spawn',position: { room: 'W0N1',x: 47,y: 25 },exit: { room: 'W0N1',x: 46,y: 25 } },
    station: { room: 'E0N1',x: 5,y: 24 },collection: { room: 'E0N1',x: 4,y: 24 },endpoint: { id: 'bank',position: { room: 'W0N1',x: 45,y: 25 },deposit: { room: 'W0N1',x: 44,y: 25 } },
    miner: ['work','work','work','work','carry','move','move'],courier: ['carry','carry','move','move'] };
}
