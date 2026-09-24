import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StaffPersonalDetailsClient from '@/components/StaffPersonalDetailsClient';

export const revalidate = 0;

export default async function StaffPersonalDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const currentUserRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  // Only Super Admin or the staff member himself can view this page
  if (currentUserRole !== 'SUPER_ADMIN' && currentUserId !== params.id) {
    redirect('/dashboard');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      team: true,
      salaryRecords: { orderBy: { createdAt: 'desc' }, take: 6 },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <StaffPersonalDetailsClient
        staffUser={{
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone || '',
          gender: user.gender || 'MALE',
          role: user.role,
          dob: user.dob ? user.dob.toISOString().slice(0, 10) : '',
          photographUrl: user.photographUrl || user.avatarUrl || null,
          pan: user.pan || '',
          panCardUrl: user.panCardUrl || null,
          aadhaar: user.aadhaar || '',
          aadhaarCardUrl: user.aadhaarCardUrl || null,
          maritalStatus: user.maritalStatus || 'SINGLE',
          marriageAnniversary: user.marriageAnniversary ? user.marriageAnniversary.toISOString().slice(0, 10) : '',
          residentialAddress: user.residentialAddress || user.address || '',
          permanentAddress: user.permanentAddress || user.address || '',
          emergencyContactName1: user.emergencyContactName1 || '',
          emergencyContactRelation1: user.emergencyContactRelation1 || '',
          emergencyContactPhone1: user.emergencyContactPhone1 || user.emergencyContact || '',
          emergencyContactName2: user.emergencyContactName2 || '',
          emergencyContactRelation2: user.emergencyContactRelation2 || '',
          emergencyContactPhone2: user.emergencyContactPhone2 || '',
          dateOfJoining: user.dateOfJoining ? user.dateOfJoining.toISOString().slice(0, 10) : '',
          educationQualification: user.educationQualification || 'GRADUATE',
          pastExperience: user.pastExperience || '[]',
          bankName: user.bankName || '',
          bankAccountNo: user.bankAccountNo || '',
          bankIfsc: user.bankIfsc || '',
          bloodGroup: user.bloodGroup || '',
          currentCTC: user.currentCTC || 0,
          monthlySalary: user.monthlySalary || 0,
          jobRole: user.jobRole || '',
          department: user.department || '',
          employmentType: user.employmentType || 'FULL_TIME',
          workLocation: user.workLocation || '',
          teamName: user.team?.name || 'Unassigned',
        }}
        isSuperAdmin={currentUserRole === 'SUPER_ADMIN'}
        recentSalaries={user.salaryRecords}
      />
    </div>
  );
}
