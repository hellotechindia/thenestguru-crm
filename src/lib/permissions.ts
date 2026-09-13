export type Role = 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
export type AccessPermission = 'EDIT' | 'VIEW';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage_users' | 'manage_templates' | 'manage_functionality';
export type Resource = 'case' | 'checklist_item' | 'user' | 'team' | 'template' | 'functionality';

export interface UserContext {
  id: string;
  role: Role;
  accessPermission?: AccessPermission;
  teamId?: string | null;
}

export function can(user: UserContext | null | undefined, action: Action, resource: Resource): boolean {
  if (!user) return false;

  // Super Admin has full permissions
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // View permission restriction
  if (user.accessPermission === 'VIEW' && (action === 'create' || action === 'update' || action === 'delete')) {
    return false;
  }

  // Non-super admin restrictions
  if (action === 'delete') {
    return false;
  }

  if (action === 'manage_users' || action === 'manage_templates' || action === 'manage_functionality') {
    return false;
  }

  if (resource === 'case' || resource === 'checklist_item') {
    if (action === 'read') return true;
    if (action === 'create' || action === 'update') {
      return user.accessPermission !== 'VIEW';
    }
  }

  return false;
}
