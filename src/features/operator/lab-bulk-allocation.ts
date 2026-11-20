import type { LabAllocationOperation, LabAllocationPreview } from './lab-allocation';
import { validateBoostAllocationInput } from './lab-allocation';
import { validateOperatorHomes } from './room-transaction';
import type { LabConfig } from '../../config/labs';
interface BulkConfigureReceipt { changed: boolean; homes: string[] }
interface RoomPreview { home: string; result: LabAllocationPreview | { ok: false; reason: 'rejected'; message: string } }
function roomPreview(preview: LabAllocationOperation,home: string,requests: Parameters<LabAllocationOperation>[1],options: Parameters<LabAllocationOperation>[2]): RoomPreview {
  try { return { home,result: preview(home,requests,options) }; }
  catch (error) { return { home,result: { ok: false,reason: 'rejected',message: error instanceof Error ? error.message : String(error) } }; }
}
export function createBulkLabAllocation(preview: LabAllocationOperation,configure: (changes: readonly { home: string; input: Partial<LabConfig> }[]) => BulkConfigureReceipt) {
  function previewMany(homes: readonly string[],requests: Parameters<LabAllocationOperation>[1],options: Parameters<LabAllocationOperation>[2] = {}) {
    validateOperatorHomes(homes); validateBoostAllocationInput(requests,options);
    const rooms = [...homes].sort().map(home => roomPreview(preview,home,requests,options));
    return { ok: rooms.every(room => room.result.ok),rooms };
  }
  return { previewBoostRolesForRooms: previewMany,
    assignBoostRolesForRooms(homes: readonly string[],requests: Parameters<LabAllocationOperation>[1],options?: Parameters<LabAllocationOperation>[2]) {
      const result = previewMany(homes,requests,options); if (!result.ok) return result;
      const changes = result.rooms.map(room => {
        if (!room.result.ok) throw new Error('Unresolved bulk allocation');
        return { home: room.home,input: { labBoostRoles: room.result.plan.roles } };
      });
      return { ...result,configuration: configure(changes) };
    },
  };
}
