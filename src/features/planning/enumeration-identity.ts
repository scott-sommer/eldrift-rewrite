import type { EnumerationOptions } from './candidate-enumeration';
export function enumerationSignature(options: EnumerationOptions): string {
  return 'planning-candidates-v1:' + JSON.stringify(options);
}
