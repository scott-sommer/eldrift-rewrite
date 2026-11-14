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
  read(key: string): unknown;
  write(key: string, value: Envelope): void;
}
function envelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Envelope>;
  return Number.isSafeInteger(record.version) && (record.version ?? -1) >= 0 && typeof record.owner === 'string' && Object.hasOwn(record, 'data');
}
export function openState<T>(port: StatePort, key: string, schema: StateSchema<T>): T {
  const raw = port.read(key);
  if (raw === undefined) return initialize(port, key, schema);
  if (!envelope(raw)) throw new Error(`${key}: corrupt state envelope`);
  if (raw.owner !== schema.owner) throw new Error(`${key}: state owner mismatch`);
  if (raw.version > schema.version) throw new Error(`${key}: unsupported future version`);
  let data: unknown = copyPlain(raw.data);
  for (let version = raw.version; version < schema.version; version++) {
    const migrate = schema.migrations[version];
    if (!migrate) throw new Error(`${key}: missing migration ${version}`);
    data = migrate(data);
  }
  if (!schema.valid(data)) throw new Error(`${key}: invalid state data`);
  if (raw.version !== schema.version) port.write(key, { owner: schema.owner, version: schema.version, data: copyPlain(data) });
  return data;
}
function initialize<T>(port: StatePort, key: string, schema: StateSchema<T>): T {
  const data = schema.initial();
  if (!schema.valid(data)) throw new Error(`${key}: invalid initial state`);
  port.write(key, { owner: schema.owner, version: schema.version, data: copyPlain(data) });
  return data;
}

