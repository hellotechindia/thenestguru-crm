'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserAction, createTeamAction, deleteUserAction } from '@/app/actions';
import { Users, UserPlus, ShieldCheck, UserCheck, Trash2, Building } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  team: { name: string } | null;
}

interface TeamItem {
  id: string;
  name: string;
  members: any[];
}

export default function UserManagementClient({ users, teams }: { users: UserItem[]; teams: TeamItem[] }) {
  const router = useRouter();
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER' as 'SUPER_ADMIN' | 'TEAM_MEMBER',
    teamId: teams[0]?.id || '',
  });

  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      setNewUser({ name: '', email: '', password: '', role: 'TEAM_MEMBER', teamId: teams[0]?.id || '' });
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
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-400" />
          Add New User
        </h2>

        {message && (
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs">
            {message}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e: any) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-white"
              >
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Team</label>
              <select
                value={newUser.teamId}
                onChange={(e) => setNewUser({ ...newUser, teamId: e.target.value })}
                className="w-full glass-input px-2 py-2 rounded-xl text-xs bg-slate-900 text-white"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Create User Account
          </button>
        </form>

        <hr className="border-slate-800 my-4" />

        {/* Team Creation */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Create Operations Team
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
      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Active Team Directory ({users.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Assigned Team</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    {u.role === 'SUPER_ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                        <ShieldCheck className="w-3 h-3" /> Super Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold text-[10px]">
                        <UserCheck className="w-3 h-3" /> Team Member
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-300">
                    {u.team?.name || 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
