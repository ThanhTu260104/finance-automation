export const ROLE_PERMISSIONS = [
  'dashboard.view',
  'proposal.view',
  'proposal.create',
  'proposal.approve',
  'proposal.pay',
  'report.view',
  'department.manage',
  'user.manage',
  'role.manage',
  'proposal_type.manage',
  'workflow.manage',
] as const;

export type RolePermission = (typeof ROLE_PERMISSIONS)[number];

export function normalizeRolePermissions(
  permissions?: string[],
): RolePermission[] {
  if (!permissions?.length) return [];
  const allowed = new Set<string>(ROLE_PERMISSIONS);
  return [...new Set(permissions.filter((item) => allowed.has(item)))].sort() as RolePermission[];
}

export function deriveLegacyRoleFlags(permissions?: string[]) {
  const granted = new Set(permissions ?? []);
  return {
    canCreateProposal: granted.has('proposal.create'),
    canApprove: granted.has('proposal.approve'),
  };
}

export function roleHasPermission(
  permissions: string[] | null | undefined,
  permission: RolePermission,
) {
  return (permissions ?? []).includes(permission);
}
