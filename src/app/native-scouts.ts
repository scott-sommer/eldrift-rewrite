import { createNativeFlagTargets } from '../adapters/screeps/flag-targets';
import { createScoutPlanningBudget } from './scout-planning-budget';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { RoomFeature } from './runtime-model';
import type { SchedulerPorts } from '../core/scheduling/model';
import type { ScoutDispatch } from './native-scout-ports';
import { createScoutControlStore, initialScoutControl } from '../features/intel/scout-control-store';
import { createScoutHistoryStore } from '../features/intel/scout-store';
import { scoutHome } from '../features/intel/scout-identity';
import { advanceScout } from '../features/intel/scout-control';
import { nativeScoutHeartbeat } from './native-scout-heartbeat';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { nativeScoutPorts } from './native-scout-ports';
import { maintainNativeScouts, nativeScoutQueued } from './native-scout-fleet';
export function createNativeScouts(state: StatePort, dispatch: ScoutDispatch,
  configuration: (room: string) => Readonly<RuntimeConfig>, report: Pick<SchedulerPorts,'reportFailure'>) {
  const controls = createScoutControlStore(state), history = createScoutHistoryStore(state), flags = createNativeFlagTargets();
  const planning = createScoutPlanningBudget({ tick: () => Game.time, usedCpu: () => Game.cpu.getUsed(),
    tickLimit: () => Game.cpu.tickLimit, bucket: () => Game.cpu.bucket });
  let tick = -1, roster: Creep[] = [];
  const configs = new Map<string,Readonly<RuntimeConfig>>();
  function settings(home: string): Readonly<RuntimeConfig> {
    if (!configs.has(home)) configs.set(home,configuration(home));
    return configs.get(home)!;
  }
  const demand: RoomFeature = { id: 'scout-demand', urgency: 'urgent', interval: 1, run({ room, config }) {
    const configured = config.values.scoutsEnabled || config.values.scoutSpawningEnabled;
    const queued = nativeScoutQueued(state,room.name);
    if (!configured && !queued) return;
    const home = Game.rooms[room.name];
    if (!home?.controller?.my) return;
    const flag = flags.resolve(config.values.scoutFallbackFlag);
    if (maintainNativeScouts(state,home,config.values,queued,planning(home.name,config.values),flag?.room)) dispatch.activate();
  } };
  const feature: RoomFeature = { id: 'scouts', scope: 'visible', urgency: 'urgent', interval: 1, run({ room }) {
    if (tick !== Game.time) { tick = Game.time; roster = Object.values(Game.creeps).filter(ownedScout); configs.clear(); }
    const units = roster.filter(creep => creep.pos.roomName === room.name).filter(creep => {
      const config = settings(creep.memory.population!.home);
      return config.scoutsEnabled && config.scoutControlCpuBudget > 0;
    });
    if (!units.length) return;
    const snapshots = new Map(controls.read().units.map(unit => [unit.id,unit]));
    units.sort((a,b) => (snapshots.get(a.id)?.lastTick ?? -1)-(snapshots.get(b.id)?.lastTick ?? -1) || a.id.localeCompare(b.id));
    const deadline = Math.min(Game.cpu.tickLimit,Game.cpu.getUsed()+Math.max(...units.map(unit => settings(unit.memory.population!.home).scoutControlCpuBudget)));
    for (const creep of units) {
      if (Game.cpu.getUsed() >= deadline) break;
      try { run(creep); } catch (error) {
        checkpointFailure(creep);
        try { report.reportFailure({ id: `scout/${creep.id}`, room: room.name, tick: Game.time, error }); } catch { /* Unit isolation survives a broken sink. */ }
      }
    }
  } };
  function checkpointFailure(creep: Creep): void {
    try {
      const saved = controls.read().units.find(unit => unit.id === creep.id)
        ?? initialScoutControl(creep.id,creep.memory.population!.home,creep.pos.roomName,Game.time);
      saved.lastTick = Game.time;
      controls.save(saved);
    } catch { /* A corrupt/unwritable namespace is preserved for the owning error path. */ }
  }
  function run(creep: Creep): void {
    const home = creep.memory.population!.home, config = settings(home);
    const saved = controls.read().units.find(unit => unit.id === creep.id);
    history.heartbeat(nativeScoutHeartbeat(creep,home,saved?.objective ?? null));
    if (!config.scoutsEnabled || creep.spawning) return;
    const control = saved ?? initialScoutControl(creep.id,home,creep.pos.roomName,Game.time);
    const { ports, dangerous } = nativeScoutPorts(state,dispatch,creep,home,config,planning(home,config),() => flags.resolve(config.scoutFallbackFlag));
    dispatch.activate();
    const result = advanceScout(control,{ tick: Game.time, position: movementPosition(creep.pos), canMove: creep.fatigue === 0, dangerous, ports,
      policy: { assigned: config.scoutAssignedRooms, stabilizeTicks: config.scoutStabilizeTicks,
        hostileAvoidTicks: config.scoutHostileAvoidTicks, routeAvoidTicks: config.scoutRouteAvoidTicks,
        stuckTicks: config.scoutStuckTicks, oscillationLimit: config.scoutOscillationLimit } });
    controls.save(result.control);
  }
  return { feature, demand };
}
function ownedScout(creep: Creep): boolean {
  const identity = creep.memory.population;
  if (!identity || typeof identity.owner !== 'string' || typeof identity.home !== 'string') return false;
  const home = scoutHome(identity.owner);
  return home !== undefined && home === identity.home;
}
