export const APP_PERMISSIONS = [
  "dashboard.view",
  "proposal.view",
  "proposal.view_all",
  "proposal.create",
  "proposal.approve",
  "proposal.pay",
  "report.view",
  "department.manage",
  "user.manage",
  "role.manage",
  "proposal_type.manage",
  "workflow.manage",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export type PermissionGroup = {
  title: string;
  items: Array<{
    key: AppPermission;
    label: string;
    description: string;
  }>;
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Tổng quan và báo cáo",
    items: [
      {
        key: "dashboard.view",
        label: "Xem dashboard",
        description: "Được vào trang tổng quan hệ thống.",
      },
      {
        key: "report.view",
        label: "Xem báo cáo",
        description: "Được mở trang báo cáo và thống kê.",
      },
    ],
  },
  {
    title: "Đề xuất",
    items: [
      {
        key: "proposal.view",
        label: "Xem đề xuất",
        description: "Được mở danh sách và chi tiết đề xuất.",
      },
      {
        key: "proposal.view_all",
        label: "Xem tất cả đề xuất",
        description: "Được xem và xuất Excel đề xuất của tất cả dự án. Nếu không cấp, chỉ xem dữ liệu thuộc dự án của tài khoản.",
      },
      {
        key: "proposal.create",
        label: "Tạo đề xuất",
        description: "Được tạo mới, lưu nháp và gửi đề xuất.",
      },
      {
        key: "proposal.approve",
        label: "Phê duyệt đề xuất",
        description: "Được duyệt hoặc từ chối đề xuất khi nằm trong luồng duyệt.",
      },
      {
        key: "proposal.pay",
        label: "Xác nhận thanh toán",
        description: "Được đánh dấu đề xuất đã thanh toán sau khi kế toán xử lý.",
      },
    ],
  },
  {
    title: "Quản trị danh mục",
    items: [
      {
        key: "department.manage",
        label: "Quản lý dự án",
        description: "Được vào trang dự án và chỉnh sửa danh mục dự án.",
      },
      {
        key: "proposal_type.manage",
        label: "Quản lý loại đề xuất",
        description: "Được tạo và sửa loại đề xuất.",
      },
      {
        key: "workflow.manage",
        label: "Quản lý quy trình",
        description: "Được vào trang cài đặt và chỉnh workflow phê duyệt.",
      },
    ],
  },
  {
    title: "Quản trị hệ thống",
    items: [
      {
        key: "user.manage",
        label: "Quản lý nhân viên",
        description: "Được tạo, sửa và quản lý tài khoản nhân viên.",
      },
      {
        key: "role.manage",
        label: "Quản lý vai trò",
        description: "Được tạo vai trò và phân quyền cho vai trò.",
      },
    ],
  },
];

export function hasPermission(
  permissions: string[] | null | undefined,
  permission: AppPermission,
) {
  return (permissions ?? []).includes(permission);
}

export function hasAnyPermission(
  permissions: string[] | null | undefined,
  required: AppPermission[],
) {
  return required.some((permission) => hasPermission(permissions, permission));
}

export function summarizePermissions(permissions: string[] | null | undefined) {
  const total = permissions?.length ?? 0;
  if (total === 0) return "Chưa có quyền nào";
  if (total === 1) return "1 quyền";
  return `${total} quyền`;
}

export function defaultPermissionsForRole(code: string): AppPermission[] {
  switch (code.trim().toUpperCase()) {
    case "ADMIN":
      return [...APP_PERMISSIONS];
    case "MANAGER":
      return [
        "dashboard.view",
        "proposal.view",
        "proposal.create",
        "proposal.approve",
        "report.view",
      ];
    case "FINANCE":
      return [
        "dashboard.view",
        "proposal.view",
        "proposal.create",
        "proposal.approve",
        "proposal.pay",
        "report.view",
      ];
    case "EMPLOYEE":
      return ["dashboard.view", "proposal.view", "proposal.create"];
    default:
      return ["proposal.view"];
  }
}
