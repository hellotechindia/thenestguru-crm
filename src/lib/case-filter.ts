import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function getScopedCaseWhere(
  userId: string,
  userRole: string
): Promise<Prisma.CaseWhereInput> {
  // Super Admin sees all cases across the system
  if (userRole === 'SUPER_ADMIN') {
    return {};
  }

  // Channel Partner: only their referred cases or child accounts
  if (userRole === 'CHANNEL') {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: { childChannels: { select: { id: true } } },
    });
    const channelIds = [userId];
    if (userRecord?.parentChannelId) {
      channelIds.push(userRecord.parentChannelId);
    }
    if (userRecord?.childChannels?.length) {
      channelIds.push(...userRecord.childChannels.map((c) => c.id));
    }

    return {
      OR: [
        { channelUserId: { in: channelIds } },
        { createdById: { in: channelIds } },
      ],
    };
  }

  // Staff members (Sales, Operation, Team Member)
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true, isTeamLeader: true },
  });

  const orConditions: Prisma.CaseWhereInput[] = [];

  if (userRole === 'SALES') {
    orConditions.push(
      { salesUserId: userId },
      { createdById: userId }
    );
  } else if (userRole === 'OPERATION') {
    orConditions.push(
      { operationUserId: userId },
      { createdById: userId }
    );
  } else {
    // Regular TEAM_MEMBER
    orConditions.push(
      { salesUserId: userId },
      { operationUserId: userId },
      { createdById: userId }
    );
  }

  // If user is a designated Team Leader, they also see cases assigned to their team
  if (userRecord?.isTeamLeader && userRecord.teamId) {
    orConditions.push({ assignedTeamId: userRecord.teamId });
  }

  return {
    OR: orConditions,
  };
}

export async function canUserAccessCase(
  userId: string,
  userRole: string,
  caseItem: {
    channelUserId?: string | null;
    salesUserId?: string | null;
    operationUserId?: string | null;
    createdById?: string;
    assignedTeamId?: string | null;
  }
): Promise<boolean> {
  if (userRole === 'SUPER_ADMIN') return true;

  if (userRole === 'CHANNEL') {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: { childChannels: { select: { id: true } } },
    });
    const channelIds = [userId];
    if (userRecord?.parentChannelId) channelIds.push(userRecord.parentChannelId);
    if (userRecord?.childChannels?.length) {
      channelIds.push(...userRecord.childChannels.map((c) => c.id));
    }
    return (
      (caseItem.channelUserId ? channelIds.includes(caseItem.channelUserId) : false) ||
      (caseItem.createdById ? channelIds.includes(caseItem.createdById) : false)
    );
  }

  // Check creator
  if (caseItem.createdById === userId) return true;

  // Check role-specific assignment
  if (userRole === 'SALES' && caseItem.salesUserId === userId) return true;
  if (userRole === 'OPERATION' && caseItem.operationUserId === userId) return true;
  if (
    userRole === 'TEAM_MEMBER' &&
    (caseItem.salesUserId === userId || caseItem.operationUserId === userId)
  ) {
    return true;
  }

  // Check team leader
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true, isTeamLeader: true },
  });
  if (
    userRecord?.isTeamLeader &&
    userRecord.teamId &&
    caseItem.assignedTeamId === userRecord.teamId
  ) {
    return true;
  }

  return false;
}
