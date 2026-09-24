'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createUserAction,
  createTeamAction,
  deleteUserAction,
  updateUserAction,
  createChildChannelAccountAction,
  deleteChildChannelAccountAction,
  updateChildChannelAccountAction,
} from '@/app/actions';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Trash2,
  Building,
  Eye,
  EyeOff,
  Edit3,
  X,
  Check,
  Key,
  AtSign,
  User,
  ShieldAlert,
  Network,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
} from 'lucide-react';
import { isValidEmail, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface UserItem {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  accessPermission?: string;
  team: { id?: string; name: string } | null;
  teamId?: string | null;
  dob?: Date | string | null;
  parentChannelId?: string | null;
  childChannels?: Array<{
    id: string;
    name: string;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    accessPermission: string;
    createdAt: Date | string;
  }>;
}

interface TeamItem {
  id: string;
  name: string;
  members: any[];
}

export default function UserManagementClient({
  users,
  teams,
  currentUserId,
}: {
  users: UserItem[];
  teams: TeamItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    username?: string;
    email?: string;
    password?: string;
    role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
    accessPermission: 'EDIT' | 'VIEW';
    teamId: string;
    dob?: string;
  } | null>(null);

  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER' as 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION',
    accessPermission: 'EDIT' as 'EDIT' | 'VIEW',
    teamId: teams[0]?.id || '',
    dob: '',
    monthlySalary: '',
    currentCTC: '',
    jobRole: '',
    department: '',
  });

  const [message, setMessage] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Channel Partner Child Accounts state
  const [expandedChannelIds, setExpandedChannelIds] = useState<Record<string, boolean>>({});
  const [selectedParentPartner, setSelectedParentPartner] = useState<UserItem | null>(null);
  const [childName, setChildName] = useState('');
  const [childUsername, setChildUsername] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childPhone, setChildPhone] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childLoading, setChildLoading] = useState(false);
  const [childMessage, setChildMessage] = useState('');

  // Child Account Editing State in Admin
  const [editingChildInAdmin, setEditingChildInAdmin] = useState<{
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
  } | null>(null);
  const [editChildLoading, setEditChildLoading] = useState(false);
  const [editChildMessage, setEditChildMessage] = useState('');
  const [showChildPassword, setShowChildPassword] = useState(false);

  const handleUpdateChildInAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChildInAdmin) return;
    setEditChildMessage('');

    if (!editingChildInAdmin.name.trim() || !editingChildInAdmin.username.trim()) {
      setEditChildMessage('Error: Name and Username are required.');
      return;
    }

    setEditChildLoading(true);
    const res = await updateChildChannelAccountAction({
      id: editingChildInAdmin.id,
      name: editingChildInAdmin.name.trim(),
      username: editingChildInAdmin.username.trim().toLowerCase(),
      email: editingChildInAdmin.email.trim() || undefined,
      phone: editingChildInAdmin.phone.trim() || undefined,
      password: editingChildInAdmin.password.trim() || undefined,
    });
    setEditChildLoading(false);

    if (!res.success) {
      setEditChildMessage(`Error: ${res.error}`);
    } else {
      setEditingChildInAdmin(null);
      setMessage(`Child account "${res.user?.name}" updated successfully!`);
      router.refresh();
    }
  };

  const handleCreateChildAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentPartner) return;
    setChildLoading(true);
    setChildMessage('');

    const res = await createChildChannelAccountAction({
      parentChannelId: selectedParentPartner.id,
      name: childName.trim(),
      username: childUsername.trim().toLowerCase(),
      email: childEmail.trim() || undefined,
      phone: childPhone.trim() || undefined,
      password: childPassword,
    });

    setChildLoading(false);
    if (res.success && res.user) {
      setChildMessage('Child account created successfully with strict VIEW permission.');
      setChildName('');
      setChildUsername('');
      setChildEmail('');
      setChildPhone('');
      setChildPassword('');
      router.refresh();
    } else {
      setChildMessage(`Error: ${res.error}`);
    }
  };

  const handleDeleteChildAccount = async (id: string, name: string) => {
    if (!confirm(`Delete child account "${name}"?`)) return;
    const res = await deleteChildChannelAccountAction(id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete child account');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!isValidName(newUser.name)) {
      setMessage('Error: Full Name must contain only alphabets and spaces (no numbers or special characters).');
      return;
    }

    if (newUser.email && newUser.email.trim() && !isValidEmail(newUser.email)) {
      setMessage('Error: Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await createUserAction({
      ...newUser,
      monthlySalary: newUser.monthlySalary ? parseFloat(newUser.monthlySalary) : undefined,
      currentCTC: newUser.currentCTC ? parseFloat(newUser.currentCTC) : undefined,
      jobRole: newUser.jobRole.trim() || undefined,
      department: newUser.department.trim() || undefined,
    });
    setLoading(false);
    if (!res.success) {
      setMessage(`Error: ${res.error}`);
    } else {
      setMessage('User created successfully!');
      setNewUser({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'TEAM_MEMBER',
        accessPermission: 'EDIT',
        teamId: teams[0]?.id || '',
        dob: '',
        monthlySalary: '',
        currentCTC: '',
        jobRole: '',
        department: '',
      });
      setShowPassword(false);
      router.refresh();
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditMessage('');

    if (!isValidName(editingUser.name)) {
      setEditMessage('Error: Full Name must contain only alphabets and spaces (no numbers or special characters).');
      return;
    }

    if (editingUser.email && editingUser.email.trim() && !isValidEmail(editingUser.email)) {
      setEditMessage('Error: Please enter a valid email address.');
      return;
    }

    setEditLoading(true);
    const res = await updateUserAction(editingUser);
    setEditLoading(false);
    if (!res.success) {
      setEditMessage(`Error: ${res.error}`);
    } else {
      setEditingUser(null);
      setMessage('User updated successfully!');
      router.refresh();
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    const res = await createTeamAction(newTeamName);
    setLoading(false);
    if (res.success) {
      setNewTeamName('');
      setMessage('Team created successfully!');
      router.refresh();
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    await deleteUserAction(id);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* 1. TOP SECTION: User Creation Form */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-6 shadow-xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-500" /> Add New User & Assign Role
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create credentials, set role permissions (Channel, Sales, Operation, Super Admin), and allocate operations team.
            </p>
          </div>

          <Link
            href="/admin/users/roles"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold text-xs border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors shadow-sm shrink-0"
          >
            <ShieldCheck className="w-4 h-4" /> Manage Roles & Access Permissions
          </Link>

          {/* Quick Team Creation Shortcut */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shrink-0">
            <Building className="w-4 h-4 text-indigo-500 ml-2 shrink-0" />
            <form onSubmit={handleCreateTeam} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="New Team Name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="glass-input px-3 py-1.5 rounded-xl text-xs w-44"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                + Team
              </button>
            </form>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: sanitizeToAlphabetsOnly(e.target.value) })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                placeholder="e.g. Anish Verma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username <span className="text-[10px] text-sky-500 font-bold">(Unique Login ID)</span>
              </label>
              <div className="relative">
                <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })
                  }
                  className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono"
                  placeholder="e.g. anish123"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                placeholder="e.g. anish@thenestguru.com (Optional)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full glass-input pl-3.5 pr-10 py-2.5 rounded-xl text-xs"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-sky-500" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e: any) => {
                  const selectedRole = e.target.value;
                  if (selectedRole === 'CHANNEL') {
                    setNewUser({ ...newUser, role: selectedRole, accessPermission: 'VIEW' });
                  } else {
                    setNewUser({ ...newUser, role: selectedRole });
                  }
                }}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
              >
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="TEAM_LEADER">Team Leader</option>
                <option value="CHANNEL">Channel Partner</option>
                <option value="SALES">Sales Lead</option>
                <option value="OPERATION">Operation Lead</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Access Permission</label>
              <select
                value={newUser.accessPermission}
                onChange={(e: any) => {
                  const selectedPerm = e.target.value;
                  if (newUser.role === 'CHANNEL' && selectedPerm === 'EDIT') {
                    const confirmed = window.confirm(
                      'Channel Partners typically have View Only access. Are you sure you want to assign Edit Access (Full) to this Channel Partner?'
                    );
                    if (!confirmed) {
                      return;
                    }
                  }
                  setNewUser({ ...newUser, accessPermission: selectedPerm });
                }}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-sky-600 dark:text-sky-400"
              >
                <option value="VIEW">View Only (Recommended for Channel)</option>
                <option value="EDIT">Edit Access (Full)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={newUser.dob}
                onChange={(e) => setNewUser({ ...newUser, dob: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
              />
            </div>

            {/* Compensation & HRMS Fields (Shown for internal staff roles) */}
            {newUser.role !== 'CHANNEL' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Basic Salary (₹) <span className="text-[10px] text-indigo-500 font-normal">(Auto-syncs CTC)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35000"
                    value={newUser.monthlySalary}
                    onChange={(e) => {
                      const mVal = e.target.value;
                      const num = parseFloat(mVal) || 0;
                      setNewUser({
                        ...newUser,
                        monthlySalary: mVal,
                        currentCTC: num > 0 ? String(Math.round(num * 12)) : newUser.currentCTC,
                      });
                    }}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual CTC (₹) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 420000"
                    value={newUser.currentCTC}
                    onChange={(e) => {
                      const cVal = e.target.value;
                      const num = parseFloat(cVal) || 0;
                      setNewUser({
                        ...newUser,
                        currentCTC: cVal,
                        monthlySalary: num > 0 ? String(Math.round(num / 12)) : newUser.monthlySalary,
                      });
                    }}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Designation / Role <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Credit Officer"
                    value={newUser.jobRole}
                    onChange={(e) => setNewUser({ ...newUser, jobRole: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? 'Creating User Account...' : '+ Create User Account'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. BOTTOM SECTION: Users Directory Table */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-4 shadow-xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Active Team Directory ({users.filter((u) => !u.parentChannelId).length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Active staff & personnel directory (Child IDs nested under parent channels)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">User & Login ID</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold text-center">Access Level</th>
                <th className="py-3 px-4 font-semibold">Team</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users
                .filter((u) => !u.parentChannelId)
                .map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{u.name}</span>
                          {u.username && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              @{u.username}
                            </span>
                          )}
                          {u.dob && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                              title={`Date of Birth: ${new Date(u.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            >
                              🎂 {new Date(u.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {u.email ? u.email : <span className="italic text-slate-400">No email registered</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.accessPermission === 'VIEW' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          <Eye className="w-3 h-3" /> View Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <Edit3 className="w-3 h-3" /> Edit Access
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {u.team?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role === 'CHANNEL' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedParentPartner(u);
                              setChildMessage('');
                            }}
                            title="Manage Sub-Accounts (Strict VIEW Access)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors mr-1 cursor-pointer shadow-sm"
                          >
                            <Network className="w-3.5 h-3.5 text-amber-600" />
                            <span>Child IDs ({u.childChannels?.length || 0})</span>
                          </button>
                        )}

                        {u.role === 'CHANNEL' ? (
                          <button
                            onClick={() =>
                              setEditingUser({
                                id: u.id,
                                name: u.name,
                                username: u.username || '',
                                email: u.email || '',
                                password: '',
                                role: u.role as any,
                                accessPermission: (u.accessPermission as any) || 'VIEW',
                                teamId: u.teamId || '',
                                dob:
                                  u.dob && !isNaN(new Date(u.dob).getTime())
                                    ? new Date(u.dob).toISOString().split('T')[0]
                                    : '',
                              })
                            }
                            title="Edit Channel Partner"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Link
                            href={`/admin/users/${u.id}`}
                            title="Edit Full Staff Profile & KYC Form"
                            className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Edit</span>
                          </Link>
                        )}

                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          title="Delete User"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-500" /> Edit Team Member Details
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {editMessage}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: sanitizeToAlphabetsOnly(e.target.value) })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username <span className="text-[10px] text-sky-500 font-bold">(Unique Login ID)</span>
                </label>
                <div className="relative">
                  <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }
                    className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs font-mono"
                    placeholder="e.g. anish123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  placeholder="e.g. anish@thenestguru.com (Optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password <span className="text-[10px] text-slate-400">(leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full glass-input pl-3 pr-10 py-2 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4 text-sky-500" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full glass-input px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-sky-600 dark:text-sky-400"
                  >
                    <option value="TEAM_MEMBER">Team Member</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="CHANNEL">Channel Partner</option>
                    <option value="SALES">Sales Lead</option>
                    <option value="OPERATION">Operation Lead</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Access Permission
                  </label>
                  <select
                    value={editingUser.accessPermission}
                    onChange={(e: any) => {
                      const newPerm = e.target.value;
                      if (editingUser.role === 'CHANNEL' && newPerm === 'EDIT') {
                        const confirmed = window.confirm(
                          'Channel Partners typically have View Only access. Are you sure you want to assign Edit Access (Full) to this Channel Partner?'
                        );
                        if (!confirmed) return;
                      }
                      setEditingUser({ ...editingUser, accessPermission: newPerm });
                    }}
                    className="w-full glass-input px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    <option value="VIEW">View Only</option>
                    <option value="EDIT">Full Edit Access</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={editingUser.dob || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, dob: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Team
                </label>
                <select
                  value={editingUser.teamId}
                  onChange={(e) => setEditingUser({ ...editingUser, teamId: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">None / Unassigned</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Channel Partner Child Accounts (Sub-Accounts) Management Modal */}
      {selectedParentPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Channel Partner Sub-Accounts
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  <Network className="w-5 h-5 text-amber-500" />
                  {selectedParentPartner.name} — Child Accounts (Sub-IDs)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Per compliance rules, all child accounts inherit strict <strong className="text-amber-600 dark:text-amber-400">VIEW ONLY</strong> permission.
                </p>
              </div>
              <button
                onClick={() => setSelectedParentPartner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {childMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold ${
                  childMessage.startsWith('Error')
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {childMessage}
              </div>
            )}

            {/* Existing Child Accounts List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Existing Sub-Accounts ({selectedParentPartner.childChannels?.length || 0})
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {!selectedParentPartner.childChannels || selectedParentPartner.childChannels.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No child sub-accounts registered under this partner yet.
                  </div>
                ) : (
                  selectedParentPartner.childChannels.map((child) => (
                    <div key={child.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{child.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            @{child.username || 'user'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {child.email || 'No email'} {child.phone ? `• ${child.phone}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-extrabold uppercase">
                          Channel Child
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          <Eye className="w-3 h-3" /> View Only
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChildInAdmin({
                              id: child.id,
                              name: child.name,
                              username: child.username || '',
                              email: child.email || '',
                              phone: child.phone || '',
                              password: '',
                            });
                            setEditChildMessage('');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Child Account"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChildAccount(child.id, child.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Child Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create New Child Account Form */}
            <form onSubmit={handleCreateChildAccount} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Add New Child Account for {selectedParentPartner.name}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Login Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh_sub"
                    value={childUsername}
                    onChange={(e) => setChildUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={childEmail}
                    onChange={(e) => setChildEmail(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={childPhone}
                    onChange={(e) => setChildPhone(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={childPassword}
                    onChange={(e) => setChildPassword(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={childLoading || !childName.trim() || !childUsername.trim() || !childPassword.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {childLoading ? 'Creating...' : '+ Create Child Account (VIEW Only)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Child Account Modal (Super Admin) */}
      {editingChildInAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Edit Child Account Details
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Role: <span className="font-bold text-amber-600">Channel Child (View Only)</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingChildInAdmin(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editChildMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {editChildMessage}
              </div>
            )}

            <form onSubmit={handleUpdateChildInAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingChildInAdmin.name}
                  onChange={(e) =>
                    setEditingChildInAdmin({
                      ...editingChildInAdmin,
                      name: sanitizeToAlphabetsOnly(e.target.value),
                    })
                  }
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={editingChildInAdmin.username}
                    onChange={(e) =>
                      setEditingChildInAdmin({
                        ...editingChildInAdmin,
                        username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }
                    className="w-full glass-input pl-7 pr-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep existing)</span>
                </label>
                <div className="relative">
                  <input
                    type={showChildPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={editingChildInAdmin.password}
                    onChange={(e) =>
                      setEditingChildInAdmin({ ...editingChildInAdmin, password: e.target.value })
                    }
                    className="w-full glass-input pl-3 pr-9 py-2 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChildPassword(!showChildPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showChildPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={editingChildInAdmin.phone}
                    onChange={(e) =>
                      setEditingChildInAdmin({ ...editingChildInAdmin, phone: e.target.value })
                    }
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={editingChildInAdmin.email}
                    onChange={(e) =>
                      setEditingChildInAdmin({ ...editingChildInAdmin, email: e.target.value })
                    }
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Role: Channel Child • Permission: Strict View Only</span>
                </div>
                <p>
                  Child accounts are permanently locked to View-Only access.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChildInAdmin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editChildLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editChildLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
