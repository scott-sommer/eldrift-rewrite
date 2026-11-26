import { createScoutControlStore } from '../../src/features/intel/scout-control-store';
import { scoutHome } from '../../src/features/intel/scout-identity';
import type { StatePort } from '../../src/persistence/versioned-state';
/** Passive, bounded diagnostic history carried by the existing externally collected fixture rows. */
export function observePipelineScouts(state: StatePort) {
  if (!(Memory as Memory & { pipelineScoutProbeMode?: boolean }).pipelineScoutProbeMode || Game.time > 256) return undefined;
  const controls = createScoutControlStore(state).read().units;
  return Object.values(Game.creeps).filter(unit => scoutHome(unit.memory.population?.owner ?? '') !== undefined).slice(0,20).map(unit => {
    const saved = controls.find(control => control.id === unit.id);
    return { name: unit.name,position: { room: unit.pos.roomName,x: unit.pos.x,y: unit.pos.y },fatigue: unit.fatigue,
      control: saved ? { phase: saved.phase,objective: saved.objective,assignmentIndex: saved.assignmentIndex,enteredAt: saved.enteredAt,
        stuck: saved.stuck,oscillations: saved.oscillations,moving: saved.moving,escapeCursor: saved.escapeCursor,retries: saved.retries,wakeAt: saved.wakeAt } : null };
  });
}
