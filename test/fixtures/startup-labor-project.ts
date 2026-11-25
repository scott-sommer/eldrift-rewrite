import { startupPassiveProject } from './startup-passive-project';
export function startupLaborProject(kind: 'upgrade' | 'build' = 'upgrade') {
  const input = startupPassiveProject(), spawning = input.project.spawning;
  spawning.requests = [{ id: 'home-worker',name: 'home-worker',owner: 'home',room: spawning.room,body: ['work','carry','move'],priority: -2,readyAt: 0,expiresAt: 101 },...spawning.requests];
  input.household = { ...input.household!,endpointCapacity: input.homeSink.capacity,labor: { horizon: 100,jobs: [
    { id: 'home-work',request: 'home-worker',kind,pickupAt: 9,outboundTicks: 2,workTicks: 2,returnTicks: 1,energy: 10 },
  ] } };
  return input;
}
