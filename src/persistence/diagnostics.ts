import { copyPlain } from './plain-data';
export interface SerializationMetrics {
  codeUnits: number;
  utf8Bytes: number;
  elapsed: number;
}
function utf8Length(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if (code <= 0x7f) bytes++;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}
export function measureSerialization(value: unknown, clock: () => number): SerializationMetrics {
  const start = clock();
  const serialized = JSON.stringify(copyPlain(value));
  const elapsed = clock() - start;
  return { codeUnits: serialized.length, utf8Bytes: utf8Length(serialized), elapsed };
}
