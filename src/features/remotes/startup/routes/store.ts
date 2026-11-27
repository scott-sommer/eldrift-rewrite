import { peekState,openState,saveState } from '../../../../persistence/versioned-state';
import { copyPlain } from '../../../../core/plain-data';
import { activatePaidCourierRoute } from './progress';
import { validPaidCourierRouteRecord } from './validation';
import type { StatePort,StateSchema } from '../../../../persistence/versioned-state';
import type { PaidCourierRouteRecord,PaidCourierRouteProgram,PaidCourierActiveRoute } from './model';
export function createPaidCourierRouteStore(state: StatePort,home: string) {
  const key = 'remoteStartupRoutes/'+home;
  const schema: StateSchema<PaidCourierRouteRecord> = { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,routes: [] }),valid: (value): value is PaidCourierRouteRecord => validPaidCourierRouteRecord(value,home) };
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function commit(expected: number,tick: number,routes: PaidCourierActiveRoute[]): boolean {
    const current = read(); if (current.revision !== expected || tick < current.clock) return false;
    const next = { home,revision: current.revision+1,clock: tick,routes: copyPlain(routes) };
    if (!schema.valid(next)) throw new Error('Invalid courier route record');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  }
  return { read,
    release(name: string,unit: string,tick: number,expected: number): boolean {
      const current = read();
      if (!current.routes.some(route => route.program.name === name && route.program.unit === unit)) return false;
      return commit(expected,tick,current.routes.filter(route => route.program.name !== name));
    },
    activate(program: PaidCourierRouteProgram,expected: number): boolean {
      const current = read(),route = activatePaidCourierRoute(program);
      return commit(expected,program.activatedAt,[...current.routes.filter(route => route.program.name !== program.name),route]);
    },
    progress(name: string,route: PaidCourierActiveRoute,tick: number,expected: number): boolean {
      const current = read(),previous = current.routes.find(route => route.program.name === name);
      if (!previous || JSON.stringify(previous.program) !== JSON.stringify(route.program)) return false;
      return commit(expected,tick,current.routes.map(previous => previous.program.name === name ? route : previous));
    },
  };
}
