import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  LayoutDashboard,
  BarChart3,
  Settings,
  Shield,
  Users,
  User,
  List,
} from "lucide-react";
import type { AppPermission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: AppPermission;
};

export const adminNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    href: "/proposals",
    label: "Đề xuất",
    icon: ClipboardList,
    permission: "proposal.view",
  },
  {
    href: "/reports",
    label: "Báo cáo",
    icon: BarChart3,
    permission: "report.view",
  },
  {
    href: "/employees",
    label: "Nhân viên",
    icon: User,
    permission: "user.manage",
  },
  {
    href: "/departments",
    label: "Dự án",
    icon: Users,
    permission: "department.manage",
  },
  {
    href: "/roles",
    label: "Chức vụ",
    icon: Shield,
    permission: "role.manage",
  },
  {
    href: "/proposal-types",
    label: "Loại đề xuất",
    icon: List,
    permission: "proposal_type.manage",
  },
  {
    href: "/settings",
    label: "Cài đặt",
    icon: Settings,
    permission: "workflow.manage",
  },
];
