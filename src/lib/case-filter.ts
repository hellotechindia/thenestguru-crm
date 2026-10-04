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

    const channelOrConditions: Prisma.CaseWhereInput[] = [
      { channelUserId: { in: channelIds } },
      { createdById: { in: channelIds } },
    ];
    for (const cid of channelIds) {
      channelOrConditions.push({ channelUserId: { contains: cid } });
    }

    return {
      OR: channelOrConditions,
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
      { salesUserId: { contains: userId } },
      { createdById: userId }
    );
  } else if (userRole === 'OPERATION') {
    orConditions.push(
      { operationUserId: userId },
      { operationUserId: { contains: userId } },
      { createdById: userId }
    );
  } else {
    // Regular TEAM_MEMBER
    orConditions.push(
      { salesUserId: userId },
      { salesUserId: { contains: userId } },
      { operationUserId: userId },
      { operationUserId: { contains: userId } },
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

  const caseChannelIds = (caseItem.channelUserId || '').split(',').map((s) => s.trim()).filter(Boolean);
  const caseSalesIds = (caseItem.salesUserId || '').split(',').map((s) => s.trim()).filter(Boolean);
  const caseOpsIds = (caseItem.operationUserId || '').split(',').map((s) => s.trim()).filter(Boolean);

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
      caseChannelIds.some((cid) => channelIds.includes(cid)) ||
      (caseItem.createdById ? channelIds.includes(caseItem.createdById) : false)
    );
  }

  // Check creator
  if (caseItem.createdById === userId) return true;

  // Check role-specific assignment
  if (userRole === 'SALES' && caseSalesIds.includes(userId)) return true;
  if (userRole === 'OPERATION' && caseOpsIds.includes(userId)) return true;
  if (
    userRole === 'TEAM_MEMBER' &&
    (caseSalesIds.includes(userId) || caseOpsIds.includes(userId))
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
