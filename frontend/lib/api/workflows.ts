import api from "@/lib/api/client";

const proposalTypesCache = new Map<string, { expiresAt: number; data: ProposalType[] }>();
const proposalTypesPending = new Map<string, Promise<ProposalType[]>>();
const PROPOSAL_TYPES_CACHE_MS = 5 * 60 * 1000;
let proposalTypesCacheGeneration = 0;

export type ProposalGroup = "FINANCE" | "PROCUREMENT";

export type ProposalType = {
  id: string;
  code: string;
  name: string;
  group: ProposalGroup;
  isActive: boolean;
  sortOrder: number;
  workflows?: ApprovalWorkflow[];
};

export type WorkflowStep = {
  id: string;
  stepOrder: number;
  label?: string | null;
  approverId: string;
  isSeniorApprover?: boolean;
  approver?: { id: string; fullName: string; email?: string };
};

export type WorkflowParticipant = {
  id: string;
  userId?: string;
  role: "WATCHER" | "NOTIFY" | "EXECUTOR";
  user?: { id: string; fullName: string };
};

export type ApprovalWorkflow = {
  id: string;
  name: string;
  proposalTypeId: string;
  isSequential: boolean;
  isActive: boolean;
  steps: WorkflowStep[];
  participants?: WorkflowParticipant[];
  proposalType?: ProposalType;
};

export async function getProposalTypes(
  group?: ProposalGroup,
  options?: {
    includeInactive?: boolean;
    includeWorkflows?: boolean;
    forceRefresh?: boolean;
  },
): Promise<ProposalType[]> {
  const cacheKey = `${group ?? "ALL"}:${options?.includeInactive ? "inactive" : "active"}:${options?.includeWorkflows === false ? "lite" : "full"}`;
  const cached = proposalTypesCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.data;
  const pending = proposalTypesPending.get(cacheKey);
  if (!options?.forceRefresh && pending) return pending;

  const params = {
    ...(group ? { group } : {}),
    ...(options?.includeInactive ? { includeInactive: "true" } : {}),
    ...(options?.includeWorkflows === false ? { includeWorkflows: "false" } : {}),
  };
  const cacheGeneration = proposalTypesCacheGeneration;
  const request = api
    .get<ProposalType[]>("/proposal-types", {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
    .then(({ data }) => {
      // A request started before a create/update/delete must not restore stale data.
      if (cacheGeneration === proposalTypesCacheGeneration) {
        proposalTypesCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + PROPOSAL_TYPES_CACHE_MS,
        });
      }
      return data;
    })
    .finally(() => proposalTypesPending.delete(cacheKey));
  proposalTypesPending.set(cacheKey, request);
  return request;
}

function clearProposalTypesCache() {
  proposalTypesCacheGeneration += 1;
  proposalTypesCache.clear();
}

export async function createProposalType(payload: {
  code: string;
  name: string;
  group: ProposalGroup;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ProposalType> {
  const { data } = await api.post<ProposalType>("/proposal-types", payload);
  clearProposalTypesCache();
  return data;
}

export async function updateProposalType(id: string, payload: Partial<ProposalType>): Promise<ProposalType> {
  const { data } = await api.patch<ProposalType>(`/proposal-types/${id}`, payload);
  clearProposalTypesCache();
  return data;
}

export async function deleteProposalType(id: string): Promise<void> {
  await api.delete(`/proposal-types/${id}`);
  clearProposalTypesCache();
}

export async function getWorkflows(): Promise<ApprovalWorkflow[]> {
  const { data } = await api.get<ApprovalWorkflow[]>("/workflows");
  return data;
}

export async function createWorkflow(payload: {
  name: string;
  proposalTypeId: string;
  isSequential?: boolean;
  steps: Array<{ stepOrder: number; label?: string; approverId: string; isSeniorApprover?: boolean }>;
  watcherIds?: string[];
  notifyIds?: string[];
  executorIds?: string[];
}): Promise<ApprovalWorkflow> {
  const { data } = await api.post<ApprovalWorkflow>("/workflows", payload);
  return data;
}

export async function updateWorkflow(
  id: string,
  payload: Partial<{
    name: string;
    isSequential: boolean;
    isActive: boolean;
    steps: Array<{ stepOrder: number; label?: string; approverId: string; isSeniorApprover?: boolean }>;
    watcherIds: string[];
    notifyIds: string[];
    executorIds: string[];
  }>,
): Promise<ApprovalWorkflow> {
  const { data } = await api.patch<ApprovalWorkflow>(
    `/workflows/${id}`,
    payload,
  );
  return data;
}
