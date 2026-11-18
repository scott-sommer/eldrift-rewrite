export interface RemoteDiscoveryNode { room: string; depth: number }
export interface RemoteDiscoveryRecord {
  home: string; revision: number; clock: number; identity: string; startedAt: number; completedAt: number | null;
  next: number; queue: RemoteDiscoveryNode[]; seen: string[]; rooms: string[]; published: string[]; unknown: string[];
  pending: { depth: number; exits: string[]; next: number } | null; truncated: boolean;
}
export interface RemoteDiscoveryPolicy { depth: number; maximumRooms: number; refreshInterval: number }
export interface RemoteDiscoveryPorts { exits(room: string): readonly string[] | undefined; allows(room: string): boolean }
