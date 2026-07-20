"use client";

import { Eye, Bell, UserCheck, Crown } from "lucide-react";
import type { ApprovalWorkflow } from "@/lib/api/workflows";

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  WATCHER: { label: "Người theo dõi", icon: Eye },
  NOTIFY: { label: "Nhận thông báo", icon: Bell },
  EXECUTOR: { label: "Người thực hiện", icon: UserCheck },
};

type ProposalWorkflowPanelProps = {
  workflow?: ApprovalWorkflow | null;
};

export function ProposalWorkflowPanel({ workflow }: ProposalWorkflowPanelProps) {
  if (!workflow) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted/60 px-4 py-8 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <UserCheck className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-slate-600">
          Chưa có quy trình cho loại đề xuất này
        </p>
        <p className="text-xs text-slate-400">
          Vào Cài đặt để thiết lập người duyệt
        </p>
      </div>
    );
  }

  const steps = workflow.steps ?? [];
  const participants = workflow.participants ?? [];
  const grouped = {
    WATCHER: participants.filter((p) => p.role === "WATCHER"),
    NOTIFY: participants.filter((p) => p.role === "NOTIFY"),
    EXECUTOR: participants.filter((p) => p.role === "EXECUTOR"),
  };

  return (
    <div className="space-y-6">
      {/* Approval steps — a real sequence, so numbered + connected reads as information, not decoration */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Bước phê duyệt
        </p>
        {steps.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có người duyệt</p>
        ) : (
          <ol className="relative">
            {steps.map((step, idx) => (
              <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                {idx < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[13px] top-7 h-[calc(100%-6px)] w-px bg-border"
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                    step.isSeniorApprover
                      ? "bg-amber-100 text-amber-700"
                      : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {step.stepOrder}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-700">
                    {step.label ?? "Người xét duyệt"}
                    {step.isSeniorApprover && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <Crown className="h-3 w-3" />
                        Cấp cao
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {step.approver?.fullName ?? "Chưa chỉ định"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {(["WATCHER", "NOTIFY", "EXECUTOR"] as const).map((role) => {
        if (grouped[role].length === 0) return null;
        const { label, icon: Icon } = ROLE_CONFIG[role];
        return (
          <div key={role} className="border-t border-border pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {grouped[role].map((p) => (
                <li
                  key={p.id}
                  className="rounded-full border border-border bg-surface-muted px-3 py-1 text-sm text-slate-600"
                >
                  {p.user?.fullName}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}