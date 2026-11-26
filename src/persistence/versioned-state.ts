import { copyPlain } from './plain-data';
export interface Envelope {
  version: number;
  owner: string;
  data: unknown;
}
export interface StateSchema<T> {
  owner: string;
  version: number;
  initial(): T;
  valid(data: unknown): data is T;
  migrations: Readonly<Record<number, (data: unknown) => unknown>>;
}
export interface StatePort {
  /** When declared, every read returns fresh, plain-data-validated values with no shared mutable references. */
  readonly detachedReads?: true;
  read(key: string): unknown;
  write(key: string, value: Envelope): void;
}
export interface RemovableStatePort extends StatePort {
  remove(key: string, owner: string): void;
}
function envelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Envelope>;
  return Number.isSafeInteger(record.version) && (record.version ?? -1) >= 0 && typeof record.owner === 'string' && Object.hasOwn(record, 'data');
}
export function openState<T>(port: StatePort, key: string, schema: StateSchema<T>): T {
  const raw = port.read(key);
  if (raw === undefined) return initialize(port, key, schema);
  const data = decodeState(raw, key, schema, port.detachedReads === true);
  if ((raw as Envelope).version !== schema.version) port.write(key, { owner: schema.owner, version: schema.version, data: copyPlain(data) });
  return data;
}
/** Validate and migrate a detached snapshot without initializing or persisting it. */
export function peekState<T>(port: StatePort, key: string, schema: StateSchema<T>): T | undefined {
  const raw = port.read(key);
  return raw === undefined ? undefined : decodeState(raw, key, schema, port.detachedReads === true);
}
function decodeState<T>(raw: unknown, key: string, schema: StateSchema<T>, detached: boolean): T {
  if (!envelope(raw)) throw new Error(`${key}: corrupt state envelope`);
  if (raw.owner !== schema.owner) throw new Error(`${key}: state owner mismatch`);
  if (raw.version > schema.version) throw new Error(`${key}: unsupported future version`);
  let data: unknown = detached ? raw.data : copyPlain(raw.data);
  for (let version = raw.version; version < schema.version; version++) {
    const migrate = schema.migrations[version];
    if (!migrate) throw new Error(`${key}: missing migration ${version}`);
    data = migrate(data);
  }
  if (!schema.valid(data)) throw new Error(`${key}: invalid state data`);
  return data;
}
function initialize<T>(port: StatePort, key: string, schema: StateSchema<T>): T {
  const data = schema.initial();
  if (!schema.valid(data)) throw new Error(`${key}: invalid initial state`);
  port.write(key, { owner: schema.owner, version: schema.version, data: copyPlain(data) });
  return data;
}


export function saveState<T>(port: StatePort, key: string, schema: StateSchema<T>, data: T): void {
  const raw = port.read(key);
  if (!envelope(raw)) throw new Error(`${key}: open state before saving`);
  if (raw.owner !== schema.owner) throw new Error(`${key}: state owner mismatch`);
  if (raw.version !== schema.version) throw new Error(`${key}: migrate state before saving`);
  const snapshot = copyPlain(data);
  if (!schema.valid(snapshot)) throw new Error(`${key}: invalid state data`);
  port.write(key, { owner: schema.owner, version: schema.version, data: snapshot });
}
