/** Encodes arbitrary identifiers without changing existing simple record keys. */
export function stateKey(namespace: string, id: string): string {
  if (!/^[a-z][a-zA-Z0-9-]*$/.test(namespace) || !id) throw new Error('Invalid state identity');
  const encoded = id.replace(/[^a-zA-Z0-9_-]/g, character => `%${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `${namespace}/${encoded}`;
}
