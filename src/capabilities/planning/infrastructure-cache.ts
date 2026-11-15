import { attachInfrastructure } from './attach-infrastructure';
export type InfrastructureProvider = typeof attachInfrastructure;
/** One detached attachment result; semantic input changes invalidate it, reloads reconstruct it. */
export function createInfrastructureCache(attach: InfrastructureProvider = attachInfrastructure): InfrastructureProvider {
  let saved: { signature: string; result: ReturnType<InfrastructureProvider> } | undefined;
  return (entries, storage, observation, limits, assess) => {
    const signature = JSON.stringify([entries, storage, observation, limits]);
    if (saved?.signature !== signature) {
      saved = { signature, result: JSON.parse(JSON.stringify(attach(entries, storage, observation, limits, assess))) };
    }
    return JSON.parse(JSON.stringify(saved.result)) as ReturnType<InfrastructureProvider>;
  };
}
