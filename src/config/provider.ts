import type { ConfigInput } from './model';
export interface ConfigurationStore {
  environment?: unknown;
  empire?: unknown;
  profiles?: Readonly<Record<string, unknown>>;
  rooms?: Readonly<Record<string, { profile?: string; override?: unknown; temporary?: NonNullable<ConfigInput['temporary']> }>>;
}
export function configurationFor(store: ConfigurationStore, room?: string): ConfigInput {
  const shared = { ...(store.environment === undefined ? {} : { environment: store.environment }), ...(store.empire === undefined ? {} : { empire: store.empire }) };
  if (room === undefined) return shared;
  const settings = store.rooms?.[room];
  if (!settings) return shared;
  const profile = settings.profile === undefined ? undefined : store.profiles?.[settings.profile];
  if (settings.profile !== undefined && profile === undefined) throw new Error(`Unknown room profile: ${settings.profile}`);
  return { ...shared,
    ...(profile === undefined ? {} : { roomProfile: profile }),
    ...(settings.override === undefined ? {} : { roomOverride: settings.override }),
    ...(settings.temporary === undefined ? {} : { temporary: settings.temporary }),
  };
}
