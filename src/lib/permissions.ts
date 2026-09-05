export type Role = 'SUPER_ADMIN' | 'TEAM_MEMBER';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage_users' | 'manage_templates';
export type Resource = 'case' | 'checklist_item' | 'user' | 'team' | 'template';

export interface UserContext {
  id: string;
  role: Role;
  teamId?: string | null;
}

export function can(user: UserContext | null | undefined, action: Action, resource: Resource): boolean {
  if (!user) return false;

  // Super Admin can do everything
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Team Member restrictions
  if (user.role === 'TEAM_MEMBER') {
    // Cannot delete anything
    if (action === 'delete') {
      return false;
    }

    // Cannot manage users or templates
    if (action === 'manage_users' || action === 'manage_templates') {
      return false;
    }

    if (resource === 'user' || resource === 'team' || resource === 'template') {
      return action === 'read';
    }

    // Can create, read, update cases and checklist items
    if (resource === 'case' || resource === 'checklist_item') {
      return action === 'create' || action === 'read' || action === 'update';
    }
  }

  return false;
}
