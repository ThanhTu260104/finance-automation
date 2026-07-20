import { ProposalsDashboard } from "@/components/proposals/ProposalsDashboard";
import type { ProposalStatus, ProposalView } from "@/lib/api/proposals";

const VIEWS = new Set<ProposalView>([
  "all", "draft", "cancelled", "mine", "approve", "watch", "notify", "execute",
]);
const STATUSES = new Set<ProposalStatus>([
  "DRAFT", "PENDING", "APPROVED", "PENDING_PAYMENT", "PAID", "REJECTED", "CANCELLED",
]);

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string; status?: string }>;
}) {
  const params = await searchParams;
  const initialView: ProposalView = params.filter === "pending-me"
    ? "approve"
    : VIEWS.has(params.view as ProposalView)
      ? params.view as ProposalView
      : "all";
  const initialStatus = STATUSES.has(params.status as ProposalStatus)
    ? params.status as ProposalStatus
    : "";

  return <ProposalsDashboard initialView={initialView} initialStatus={initialStatus} />;
}
