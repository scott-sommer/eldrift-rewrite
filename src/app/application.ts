export interface TickService {
  run(): void;
}

export function createApplication(services: readonly TickService[]) {
  return {
    tick(): void {
      for (const service of services) service.run();
    },
  };
}
