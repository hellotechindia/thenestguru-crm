'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserAction, createTeamAction, deleteUserAction, updateUserAction } from '@/app/actions';
import { Users, UserPlus, ShieldCheck, UserCheck, Trash2, Building, Eye, Edit3, X, Check, Key } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  accessPermission?: string;
  team: { id?: string; name: string } | null;
  teamId?: string | null;
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
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER' as 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION',
    accessPermission: 'EDIT' as 'EDIT' | 'VIEW',
    teamId: teams[0]?.id || '',
  });

  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    password: '';
    role: 'SUPER_ADMIN' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
    accessPermission: 'EDIT' | 'VIEW';
    teamId: string;
  } | null>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await createUserAction(newUser);
    setLoading(false);
    if (!res.success) {
      setMessage(`Error: ${res.error}`);
    } else {
      setMessage('User created successfully!');
      setNewUser({ name: '', email: '', password: '', role: 'TEAM_MEMBER', accessPermission: 'EDIT', teamId: teams[0]?.id || '' });
      router.refresh();
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditMessage('');
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* User Creation Form */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-500" /> Add New User & Assign Role
        </h2>

        {message && (
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              placeholder="e.g. Anish Verma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              placeholder="e.g. anish@nestguru.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e: any) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
              >
                <option value="TEAM_MEMBER">Team Member</option>
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
                onChange={(e: any) => setNewUser({ ...newUser, accessPermission: e.target.value })}
                className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-sky-600 dark:text-sky-400"
              >
                <option value="EDIT">Edit Access (Full)</option>
                <option value="VIEW">View Access Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Team</label>
            <select
              value={newUser.teamId}
              onChange={(e) => setNewUser({ ...newUser, teamId: e.target.value })}
              className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all"
          >
            Create User Account
          </button>
        </form>

        <hr className="border-slate-200 dark:border-slate-800 my-4" />

        {/* Team Creation */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" /> Create Operations Team
          </h3>
          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. South Region Team"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Active Team Directory ({users.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold text-center">Access Level</th>
                <th className="py-3 px-4 font-semibold">Team</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-500">{u.email}</div>
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
                      <button
                        onClick={() =>
                          setEditingUser({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            password: '',
                            role: u.role as any,
                            accessPermission: (u.accessPermission as any) || 'EDIT',
                            teamId: u.teamId || '',
                          })
                        }
                        title="Edit User Details"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title="Delete User"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
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
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password <span className="text-[10px] text-slate-400">(leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value as any })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
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
                    <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                    <option value="CHANNEL">CHANNEL</option>
                    <option value="SALES">SALES</option>
                    <option value="OPERATION">OPERATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Access Permission
                  </label>
                  <select
                    value={editingUser.accessPermission}
                    onChange={(e: any) => setEditingUser({ ...editingUser, accessPermission: e.target.value })}
                    className="w-full glass-input px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    <option value="EDIT">Full Edit Access</option>
                    <option value="VIEW">View Only</option>
                  </select>
                </div>
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
    </div>
  );
}
