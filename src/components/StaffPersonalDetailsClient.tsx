'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateStaffPersonalDetailsAction } from '@/app/actions';
import {
  User, Mail, Phone, MapPin, Shield, Calendar, CreditCard, Building,
  ArrowLeft, Edit3, CheckCircle2, ShieldAlert, Heart, Save, DollarSign,
  Upload, FileText, Image as ImageIcon, Briefcase, GraduationCap, Users2,
  Trash2, Plus, ExternalLink, X
} from 'lucide-react';
import { isValid10DigitPhone, isValidEmail, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';

export interface PastExperienceItem {
  companyName: string;
  tenure: string;
  position: string;
  salary: string;
  avgIncentive: string;
}

export interface StaffUserProps {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string;
  gender: string;
  role: string;
  dob: string;
  photographUrl?: string | null;
  pan: string;
  panCardUrl?: string | null;
  aadhaar: string;
  aadhaarCardUrl?: string | null;
  maritalStatus: string;
  marriageAnniversary: string;
  residentialAddress: string;
  permanentAddress: string;
  emergencyContactName1: string;
  emergencyContactRelation1: string;
  emergencyContactPhone1: string;
  emergencyContactName2: string;
  emergencyContactRelation2: string;
  emergencyContactPhone2: string;
  dateOfJoining: string;
  educationQualification: string;
  pastExperience?: string | null;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bloodGroup: string;
  currentCTC?: number | null;
  monthlySalary?: number | null;
  jobRole?: string | null;
  department?: string | null;
  employmentType?: string | null;
  workLocation?: string | null;
  teamName: string;
}

interface Props {
  staffUser: StaffUserProps;
  isSuperAdmin: boolean;
  isProfileSelfView?: boolean;
  recentSalaries?: any[];
}

export default function StaffPersonalDetailsClient({
  staffUser,
  isSuperAdmin,
  isProfileSelfView = false,
  recentSalaries = []
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Parse past experience safely
  const initialExperience: PastExperienceItem[] = (() => {
    try {
      if (staffUser.pastExperience) {
        const parsed = JSON.parse(staffUser.pastExperience);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [
      { companyName: '', tenure: '', position: '', salary: '', avgIncentive: '' }
    ];
  })();

  const [formData, setFormData] = useState({
    name: staffUser.name || '',
    email: staffUser.email || '',
    phone: staffUser.phone || '',
    gender: staffUser.gender || 'MALE',
    dob: staffUser.dob || '',
    photographUrl: staffUser.photographUrl || '',
    pan: staffUser.pan || '',
    panCardUrl: staffUser.panCardUrl || '',
    aadhaar: staffUser.aadhaar || '',
    aadhaarCardUrl: staffUser.aadhaarCardUrl || '',
    maritalStatus: staffUser.maritalStatus || 'SINGLE',
    marriageAnniversary: staffUser.marriageAnniversary || '',
    residentialAddress: staffUser.residentialAddress || '',
    permanentAddress: staffUser.permanentAddress || '',
    emergencyContactName1: staffUser.emergencyContactName1 || '',
    emergencyContactRelation1: staffUser.emergencyContactRelation1 || '',
    emergencyContactPhone1: staffUser.emergencyContactPhone1 || '',
    emergencyContactName2: staffUser.emergencyContactName2 || '',
    emergencyContactRelation2: staffUser.emergencyContactRelation2 || '',
    emergencyContactPhone2: staffUser.emergencyContactPhone2 || '',
    dateOfJoining: staffUser.dateOfJoining || '',
    educationQualification: staffUser.educationQualification || 'GRADUATE',
    bankName: staffUser.bankName || '',
    bankAccountNo: staffUser.bankAccountNo || '',
    bankIfsc: staffUser.bankIfsc || '',
    bloodGroup: staffUser.bloodGroup || '',
    jobRole: staffUser.jobRole || '',
    department: staffUser.department || '',
    currentCTC: staffUser.currentCTC ? String(staffUser.currentCTC) : '',
    monthlySalary: staffUser.monthlySalary ? String(staffUser.monthlySalary) : '',
    employmentType: staffUser.employmentType || 'FULL_TIME',
    workLocation: staffUser.workLocation || '',
  });

  const [experiences, setExperiences] = useState<PastExperienceItem[]>(initialExperience);

  // Client-side image compressor: keeps documents under 300KB to ensure fast saves and prevent payload overflow
  const compressImage = (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper for file to Base64 with compression
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'photographUrl' | 'panCardUrl' | 'aadhaarCardUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('File size must be under 12 MB.');
      return;
    }

    try {
      const base64String = await compressImage(file);
      setFormData((prev) => ({ ...prev, [field]: base64String }));
    } catch (err) {
      console.error('File read error:', err);
      alert('Failed to process image. Please try again.');
    }
  };

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { companyName: '', tenure: '', position: '', salary: '', avgIncentive: '' }
    ]);
  };

  const handleRemoveExperience = (index: number) => {
    if (experiences.length === 1) {
      setExperiences([{ companyName: '', tenure: '', position: '', salary: '', avgIncentive: '' }]);
      return;
    }
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleExperienceChange = (index: number, key: keyof PastExperienceItem, value: string) => {
    const updated = [...experiences];
    updated[index][key] = value;
    setExperiences(updated);
  };

  const handleCopyResidentialAddress = () => {
    setFormData((prev) => ({ ...prev, permanentAddress: prev.residentialAddress }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidName(formData.name)) {
      setError('Full Name must contain only alphabets and spaces.');
      return;
    }

    if (formData.phone && !isValid10DigitPhone(formData.phone)) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.emergencyContactPhone1 && !isValid10DigitPhone(formData.emergencyContactPhone1)) {
      setError('Emergency Contact 1 phone number must be exactly 10 digits.');
      return;
    }

    if (formData.emergencyContactPhone2 && !isValid10DigitPhone(formData.emergencyContactPhone2)) {
      setError('Emergency Contact 2 phone number must be exactly 10 digits.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      setLoading(true);

      const validExperiences = experiences.filter(
        (exp) => exp.companyName.trim() || exp.position.trim()
      );

      const res = await updateStaffPersonalDetailsAction(staffUser.id, {
        ...formData,
        dob: formData.dob || null,
        dateOfJoining: formData.dateOfJoining || null,
        marriageAnniversary: formData.maritalStatus === 'MARRIED' && formData.marriageAnniversary ? formData.marriageAnniversary : null,
        pastExperience: JSON.stringify(validExperiences),
        currentCTC: formData.currentCTC ? parseFloat(formData.currentCTC) : 0,
        monthlySalary: formData.monthlySalary ? parseFloat(formData.monthlySalary) : 0,
      });

      if (res.success) {
        setSuccess('Staff personal profile, KYC, and HRMS details saved successfully!');
        setIsEditing(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to save personal details.');
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      setError(err?.message || 'A network or server error occurred while saving. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {!isProfileSelfView && (
            <Link
              href="/admin/users"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Back to User Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          <div className="flex items-center gap-3">
            {formData.photographUrl ? (
              <img
                src={formData.photographUrl}
                alt={formData.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-md shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {formData.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {staffUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Team: {staffUser.teamName} &bull; Login ID: @{staffUser.username || 'user'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" /> Edit Profile & KYC
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-semibold">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Basic Personal Information & Photograph */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              1. Basic Personal Information & Photograph
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Photograph Upload */}
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                {formData.photographUrl ? (
                  <img
                    src={formData.photographUrl}
                    alt="Photograph"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-300 dark:border-slate-600 shadow"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-center sm:text-left flex-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Profile Photograph (Soft Copy)
                </label>
                <p className="text-[11px] text-slate-400">
                  Upload clear passport size photo or soft copy image (JPG, PNG under 3MB).
                </p>
                {isEditing && (
                  <div className="pt-1.5 flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formData.photographUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'photographUrl')}
                        className="hidden"
                      />
                    </label>
                    {formData.photographUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photographUrl: '' }))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                disabled={!isEditing}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: sanitizeToAlphabetsOnly(e.target.value) })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 font-semibold"
                placeholder="e.g. Ramesh Sharma"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Gender
              </label>
              <select
                disabled={!isEditing}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-white dark:bg-slate-900"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Date of Birth (DOB)
              </label>
              <input
                type="date"
                disabled={!isEditing}
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
              />
            </div>

            {/* Date of Joining */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Date of Joining (DOJ)
              </label>
              <input
                type="date"
                disabled={!isEditing}
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
              />
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Marital Status
              </label>
              <select
                disabled={!isEditing}
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-white dark:bg-slate-900"
              >
                <option value="SINGLE">Single / Unmarried</option>
                <option value="MARRIED">Married</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Marriage Anniversary */}
            {formData.maritalStatus === 'MARRIED' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Marriage Anniversary
                </label>
                <input
                  type="date"
                  disabled={!isEditing}
                  value={formData.marriageAnniversary}
                  onChange={(e) => setFormData({ ...formData, marriageAnniversary: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                />
              </div>
            )}

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Blood Group
              </label>
              <select
                disabled={!isEditing}
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-white dark:bg-slate-900"
              >
                <option value="">-- Select --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. CURRENT EMPLOYMENT & COMPENSATION (HRMS & SALARY MASTER) */}
        <div className="glass-panel p-6 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/20 via-white to-white dark:from-indigo-950/10 dark:via-slate-900 dark:to-slate-900 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              2. CURRENT EMPLOYMENT & COMPENSATION (HRMS MASTER)
            </h2>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              Auto-syncs with HRMS & Salary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Current Job Role / Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Current Job Role / Designation
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="e.g. Senior Credit Officer, Sales Manager"
                value={formData.jobRole}
                onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 font-medium"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Department
              </label>
              <select
                disabled={!isEditing}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-white dark:bg-slate-900"
              >
                <option value="">-- Select Department --</option>
                <option value="Operations & Loan Processing">Operations & Loan Processing</option>
                <option value="Sales & Business Development">Sales & Business Development</option>
                <option value="Credit & Underwriting">Credit & Underwriting</option>
                <option value="Verification & Field Inspection">Verification & Field Inspection</option>
                <option value="Accounts & Finance">Accounts & Finance</option>
                <option value="HR & Administration">HR & Administration</option>
                <option value="Customer Relationship & Support">Customer Relationship & Support</option>
                <option value="Management & Executive">Management & Executive</option>
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Employment Type
              </label>
              <select
                disabled={!isEditing}
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 bg-white dark:bg-slate-900 font-medium"
              >
                <option value="FULL_TIME">Full-Time (Regular)</option>
                <option value="PROBATION">Probation Period</option>
                <option value="CONTRACT">Contractual</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="INTERN">Internship</option>
              </select>
            </div>

            {/* Current Annual CTC */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Current Annual CTC (₹)
                </label>
                {isEditing && formData.currentCTC && parseFloat(formData.currentCTC) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ctc = parseFloat(formData.currentCTC) || 0;
                      setFormData({ ...formData, monthlySalary: String(Math.round(ctc / 12)) });
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Set Monthly (÷ 12)
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  disabled={!isEditing}
                  placeholder="e.g. 600000"
                  value={formData.currentCTC}
                  onChange={(e) => setFormData({ ...formData, currentCTC: e.target.value })}
                  className="w-full glass-input pl-7 pr-3 py-2 rounded-xl text-xs disabled:opacity-80 font-mono font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Monthly Base / Gross Salary */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Monthly Base / Full Gross (₹)
                </label>
                {isEditing && formData.monthlySalary && parseFloat(formData.monthlySalary) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const monthly = parseFloat(formData.monthlySalary) || 0;
                      setFormData({ ...formData, currentCTC: String(Math.round(monthly * 12)) });
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Set CTC (× 12)
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  disabled={!isEditing}
                  placeholder="e.g. 50000"
                  value={formData.monthlySalary}
                  onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                  className="w-full glass-input pl-7 pr-3 py-2 rounded-xl text-xs disabled:opacity-80 font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            {/* Work Location / Branch */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Work Location / Branch
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="e.g. Head Office - Noida, Delhi Branch"
                value={formData.workLocation}
                onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>HRMS & Salary Register Auto-Sync:</strong> Yahan save kiya hua Job Role, Department aur Monthly CTC direct HRMS attendance desk aur Salary Register me automatic pick hoga.
            </span>
          </div>
        </div>

        {/* 3. Contact & Address Details */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              2. Contact Information & Addresses
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                maxLength={10}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: sanitizeTo10Digits(e.target.value) })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80 font-mono"
                placeholder="e.g. 9876543210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
                placeholder="e.g. user@thenestguru.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Current Residential Address
              </label>
              <textarea
                rows={2}
                disabled={!isEditing}
                value={formData.residentialAddress}
                onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
                placeholder="Flat / House No, Street, Landmark, City, Pincode"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Permanent Address
                </label>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCopyResidentialAddress}
                    className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                  >
                    Same as Current Address
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                disabled={!isEditing}
                value={formData.permanentAddress}
                onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
                placeholder="Permanent family address, City, State, Pincode"
              />
            </div>
          </div>
        </div>

        {/* 3. KYC Verification & Soft Copies */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              3. Identity & KYC Documents (with Soft Copy Upload)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PAN Card Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  PAN Card Number
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono uppercase disabled:opacity-80 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  PAN Card Soft Copy (Document Upload)
                </label>
                {formData.panCardUrl ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="text-xs font-semibold truncate">PAN Card Document Attached</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={formData.panCardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-xs font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, panCardUrl: '' }))}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Remove soft copy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <p className="text-[11px] text-slate-400 mb-1.5">No PAN soft copy uploaded yet.</p>
                    {isEditing && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-200 dark:border-sky-800 cursor-pointer hover:bg-sky-100 transition">
                        <Upload className="w-3 h-3" /> Upload PAN Soft Copy
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'panCardUrl')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aadhaar Card Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Aadhaar Card Number
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  maxLength={12}
                  placeholder="1234 5678 9012"
                  value={formData.aadhaar}
                  onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value.replace(/\D/g, '') })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono disabled:opacity-80 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Aadhaar Card Soft Copy (Document Upload)
                </label>
                {formData.aadhaarCardUrl ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="text-xs font-semibold truncate">Aadhaar Card Document Attached</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={formData.aadhaarCardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-xs font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, aadhaarCardUrl: '' }))}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Remove soft copy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <p className="text-[11px] text-slate-400 mb-1.5">No Aadhaar soft copy uploaded yet.</p>
                    {isEditing && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-200 dark:border-sky-800 cursor-pointer hover:bg-sky-100 transition">
                        <Upload className="w-3 h-3" /> Upload Aadhaar Soft Copy
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(e, 'aadhaarCardUrl')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bank Account Details */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              4. Bank & Account Details (for Payroll & Salary Slip)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="e.g. HDFC Bank, SBI, ICICI"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Number
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="Account number"
                value={formData.bankAccountNo}
                onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value.replace(/\D/g, '') })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono disabled:opacity-80 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                disabled={!isEditing}
                maxLength={11}
                placeholder="HDFC0001234"
                value={formData.bankIfsc}
                onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono uppercase disabled:opacity-80 font-bold"
              />
            </div>
          </div>
        </div>

        {/* 5. Two Emergency Contact Persons */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Users2 className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              5. Emergency Contacts (2 Persons)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Person 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-flex items-center justify-center text-[10px]">1</span>
                <span>Emergency Contact Person 1</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    placeholder="e.g. Suresh Kumar"
                    value={formData.emergencyContactName1}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName1: e.target.value })}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Relationship
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. Father / Spouse"
                      value={formData.emergencyContactRelation1}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelation1: e.target.value })}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditing}
                      maxLength={10}
                      placeholder="10-digit phone"
                      value={formData.emergencyContactPhone1}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone1: sanitizeTo10Digits(e.target.value) })}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono disabled:opacity-80"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Person 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-flex items-center justify-center text-[10px]">2</span>
                <span>Emergency Contact Person 2</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    placeholder="e.g. Meena Sharma"
                    value={formData.emergencyContactName2}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName2: e.target.value })}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Relationship
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. Brother / Mother"
                      value={formData.emergencyContactRelation2}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelation2: e.target.value })}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditing}
                      maxLength={10}
                      placeholder="10-digit phone"
                      value={formData.emergencyContactPhone2}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone2: sanitizeTo10Digits(e.target.value) })}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono disabled:opacity-80"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Education Qualification */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              6. Education Qualification
            </h3>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Highest Educational Qualification (Select from Dropdown)
            </label>
            <select
              disabled={!isEditing}
              value={formData.educationQualification}
              onChange={(e) => setFormData({ ...formData, educationQualification: e.target.value })}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-80 bg-white dark:bg-slate-900"
            >
              <option value="10TH">High School (10th Standard / Matriculation)</option>
              <option value="12TH">Senior Secondary / Intermediate (12th Standard)</option>
              <option value="DIPLOMA">Diploma (Polytechnic / Technical Certification)</option>
              <option value="GRADUATE">Graduate / Bachelor's Degree (B.Com / B.Sc / B.A / B.Tech / BBA)</option>
              <option value="POST_GRADUATE">Post Graduate / Master's Degree (MBA / M.Com / M.Sc / M.Tech / MCA)</option>
              <option value="DOCTORATE">Doctorate / Ph.D.</option>
              <option value="OTHER">Other Professional Qualification</option>
            </select>
          </div>
        </div>

        {/* 7. Past Work Experience */}
        <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                7. Past Employment Experience
              </h3>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={handleAddExperience}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Experience</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {experiences.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Experience Entry #{idx + 1}
                  </span>
                  {isEditing && experiences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Remove this experience entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. ABC Finance Pvt Ltd"
                      value={exp.companyName}
                      onChange={(e) => handleExperienceChange(idx, 'companyName', e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Tenure / Duration
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. 2 Years 3 Months"
                      value={exp.tenure}
                      onChange={(e) => handleExperienceChange(idx, 'tenure', e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Position / Designation
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. Senior Sales Executive"
                      value={exp.position}
                      onChange={(e) => handleExperienceChange(idx, 'position', e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Salary (₹ CTC / Month)
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. ₹ 35,000 / mo"
                      value={exp.salary}
                      onChange={(e) => handleExperienceChange(idx, 'salary', e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Avg. Monthly Incentive
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="e.g. ₹ 12,000 / mo"
                      value={exp.avgIncentive}
                      onChange={(e) => handleExperienceChange(idx, 'avgIncentive', e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-xl text-xs disabled:opacity-80 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Changes Floating / Fixed Bar */}
        {isEditing && (
          <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Review all information before saving. Profile and KYC records will be updated immediately.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving Profile...' : 'Save Profile & KYC Details'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
