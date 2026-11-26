import type { StartupPlanningJob, StartupPlanningQuery } from '../planning/model';
import type { CompleteStartupTravel } from '../selection-model';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
export interface StartupApproval { approvedAt: number; job: StartupPlanningJob; quote: CompleteStartupTravel; rooms: string[]; policy: StartupReturnPolicy }
export interface StartupApprovalRecord { home: string; revision: number; clock: number; approvals: StartupApproval[] }
export interface StartupApprovalProposal { query: StartupPlanningQuery; quote: CompleteStartupTravel; rooms: readonly string[]; policy: StartupReturnPolicy }
export type StartupApprovalWrite = 'saved' | 'conflict' | 'capacity' | 'unavailable' | 'rejected';
