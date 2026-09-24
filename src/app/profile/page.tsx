import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StaffPersonalDetailsClient from '@/components/StaffPersonalDetailsClient';
import ProfileEditClient from '@/components/ProfileEditClient';

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: true,
      salaryRecords: { orderBy: { createdAt: 'desc' }, take: 6 },
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Account & Staff Profile
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your complete personal details, KYC documentation, emergency contacts, education, past experience, and security password.
        </p>
      </div>

      {/* 1. Full Personal Details & KYC Form */}
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
          teamName: user.team?.name || 'Operations',
        }}
        isSuperAdmin={(session.user as any).role === 'SUPER_ADMIN'}
        isProfileSelfView={true}
        recentSalaries={user.salaryRecords}
      />

      {/* 2. Password & Login Security */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Account Password & Security
        </h2>
        <ProfileEditClient
          user={{
            id: user.id,
            name: user.name,
            email: user.email || '',
            role: user.role,
            avatarUrl: user.avatarUrl || null,
            teamName: user.team?.name || 'Operations',
          }}
        />
      </div>
    </div>
  );
}
