import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import {
  getTasksAction,
  getAssignableUsersAction,
  getActiveCasesForTaskSelectAction,
} from '@/app/actions';
import TaskManagementClient from '@/components/TaskManagementClient';

export const revalidate = 0;

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  // Strict role check: Channel role is completely excluded from Task Management
  if (userRole === 'CHANNEL') {
    redirect('/dashboard');
  }

  const [tasksRes, usersRes, casesRes] = await Promise.all([
    getTasksAction(),
    getAssignableUsersAction(),
    getActiveCasesForTaskSelectAction(),
  ]);

  const tasks = tasksRes.tasks || [];
  const assignableUsers = usersRes.users || [];
  const activeCases = casesRes.cases || [];

  return (
    <TaskManagementClient
      initialTasks={tasks as any}
      assignableUsers={assignableUsers}
      activeCases={activeCases}
      currentUser={{
        id: currentUserId,
        name: session.user.name || 'User',
        role: userRole,
      }}
    />
  );
}
