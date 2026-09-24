'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveCustomRoleAction,
  deleteCustomRoleAction,
  RoleMatrixItem,
} from '@/app/actions';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Users,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  FolderCheck,
  CheckSquare,
  MapPin,
  CalendarDays,
  IndianRupee,
  FileCheck2,
  Settings,
  Sparkles,
  Info,
} from 'lucide-react';

interface Props {
  initialRoles: RoleMatrixItem[];
  userCounts: Record<string, number>;
}

export default function RolesPermissionsManager({
  initialRoles = [],
  userCounts = {},
}: Props) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleMatrixItem[]>(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleMatrixItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    description: string;
    baseRole: 'SUPER_ADMIN' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'CHANNEL' | 'SALES' | 'OPERATION';
    accessPermission: 'EDIT' | 'VIEW';
    modules: {
      cases: 'FULL' | 'VIEW' | 'ASSIGNED_ONLY' | 'NONE';
      tasks: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
      visits: 'FULL' | 'ASSIGNED_ONLY' | 'NONE';
      hrms: 'FULL' | 'VIEW' | 'NONE';
      salary: 'FULL' | 'MY_SLIP' | 'NONE';
      checklist: 'FULL' | 'VIEW' | 'NONE';
      settings: 'FULL' | 'VIEW' | 'NONE';
    };
  }>({
    name: '',
    description: '',
    baseRole: 'TEAM_MEMBER',
    accessPermission: 'EDIT',
    modules: {
      cases: 'FULL',
      tasks: 'ASSIGNED_ONLY',
      visits: 'ASSIGNED_ONLY',
      hrms: 'VIEW',
      salary: 'MY_SLIP',
      checklist: 'VIEW',
      settings: 'NONE',
    },
  });

  const openCreateModal = () => {
    setEditingRole(null);
    setForm({
      name: '',
      description: '',
      baseRole: 'TEAM_MEMBER',
      accessPermission: 'EDIT',
      modules: {
        cases: 'FULL',
        tasks: 'ASSIGNED_ONLY',
        visits: 'ASSIGNED_ONLY',
        hrms: 'VIEW',
        salary: 'MY_SLIP',
        checklist: 'VIEW',
        settings: 'NONE',
      },
    });
    setIsModalOpen(true);
  };

  const openEditModal = (r: RoleMatrixItem) => {
    setEditingRole(r);
    setForm({
      id: r.id,
      name: r.name,
      description: r.description || '',
      baseRole: r.baseRole,
      accessPermission: r.accessPermission,
      modules: { ...r.modules },
    });
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Role Name is required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await saveCustomRoleAction({
      id: editingRole?.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      baseRole: form.baseRole,
      accessPermission: form.accessPermission,
      modules: form.modules,
    });

    setLoading(false);

    if (res.success && res.role) {
      setMessage({
        type: 'success',
        text: `Role "${res.role.name}" saved with custom access permissions successfully!`,
      });

      const updatedList = [...roles];
      const idx = updatedList.findIndex((r) => r.id === res.role!.id);
      if (idx >= 0) {
        updatedList[idx] = res.role;
      } else {
        updatedList.push(res.role);
      }
      setRoles(updatedList);
      setIsModalOpen(false);
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save role.' });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete custom role "${roleName}"?`)) return;

    setDeletingId(roleId);
    const res = await deleteCustomRoleAction(roleId);
    setDeletingId(null);

    if (res.success) {
      setRoles(roles.filter((r) => r.id !== roleId));
      setMessage({ type: 'success', text: `Role "${roleName}" deleted.` });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to delete role.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-sky-500" />
            Roles & Granular Access Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure system roles, create custom titles, and assign modular access permissions (Cases, Tasks, HRMS, Salary, Settings)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> + Create New Role
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Roles Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((r) => {
          const count = userCounts[r.id] || (r.baseRole && userCounts[r.baseRole]) || 0;
          return (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        r.id === 'SUPER_ADMIN'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
                          : r.id === 'CHANNEL'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{r.name}</span>
                        {r.isSystem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border border-slate-200 dark:border-slate-700">
                            Built-in
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">@{r.id}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      r.accessPermission === 'EDIT'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                    }`}
                  >
                    {r.accessPermission === 'EDIT' ? 'Full Access' : 'View Only'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 min-h-[36px] line-clamp-2">
                  {r.description || 'No custom description provided.'}
                </p>

                {/* Module Access Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Module Access Matrix
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <FolderCheck className="w-3 h-3 text-sky-500" /> Cases
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.cases}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckSquare className="w-3 h-3 text-indigo-500" /> Tasks
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.tasks}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3 text-emerald-500" /> HRMS
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.hrms}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <IndianRupee className="w-3 h-3 text-amber-500" /> Salary
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.salary}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <FileCheck2 className="w-3 h-3 text-purple-500" /> Checklists
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.checklist}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Settings className="w-3 h-3 text-slate-500" /> Settings
                      </span>
                      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200">
                        {r.modules.settings}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  <span>{count} Staff Assigned</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="Edit Role & Permissions"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {!r.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(r.id, r.name)}
                      disabled={deletingId === r.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {editingRole ? `Edit Role: ${editingRole.name}` : 'Add New Custom Role & Permissions'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define role title and assign modular permissions across CRM operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Credit Analyst"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Base Category Profile
                  </label>
                  <select
                    value={form.baseRole}
                    onChange={(e: any) => setForm({ ...form, baseRole: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                  >
                    <option value="TEAM_MEMBER">Team Member (Staff Core)</option>
                    <option value="TEAM_LEADER">Team Leader (Oversight)</option>
                    <option value="SALES">Sales Specialist</option>
                    <option value="OPERATION">Operation Specialist</option>
                    <option value="CHANNEL">Channel Partner</option>
                    <option value="SUPER_ADMIN">Admin Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Access Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.accessPermission === 'EDIT'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessPermission"
                      checked={form.accessPermission === 'EDIT'}
                      onChange={() => setForm({ ...form, accessPermission: 'EDIT' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" /> Full Edit Access
                      </div>
                      <div className="text-[10px] text-slate-400">Can create, update & process files</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.accessPermission === 'VIEW'
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessPermission"
                      checked={form.accessPermission === 'VIEW'}
                      onChange={() => setForm({ ...form, accessPermission: 'VIEW' })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-sky-600" /> View Only Access
                      </div>
                      <div className="text-[10px] text-slate-400">Strict read-only permissions</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Responsibility Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Responsible for vetting credit documentation and conducting valuation verification..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Module Granular Access Matrix */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  Granular Module Access Assignment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Cases Directory
                    </label>
                    <select
                      value={form.modules.cases}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, cases: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - All Cases & Intake</option>
                      <option value="VIEW">VIEW - Read Only All</option>
                      <option value="ASSIGNED_ONLY">ASSIGNED ONLY - Assigned to Me</option>
                      <option value="NONE">NONE - Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Task Management
                    </label>
                    <select
                      value={form.modules.tasks}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, tasks: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - Delegate & Assign to All</option>
                      <option value="ASSIGNED_ONLY">ASSIGNED ONLY - My Tasks Only</option>
                      <option value="NONE">NONE - Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      HRMS Employee Desk
                    </label>
                    <select
                      value={form.modules.hrms}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, hrms: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - Staff Attendance & Leaves</option>
                      <option value="VIEW">VIEW - My Attendance & Leaves</option>
                      <option value="NONE">NONE - Restricted</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Salary Register & Slips
                    </label>
                    <select
                      value={form.modules.salary}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, salary: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - Company Salary Register</option>
                      <option value="MY_SLIP">MY SLIP - Download My Payslip</option>
                      <option value="NONE">NONE - Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Checklist Matrix & Rules
                    </label>
                    <select
                      value={form.modules.checklist}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, checklist: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - Edit Rules & Templates</option>
                      <option value="VIEW">VIEW - Read Only</option>
                      <option value="NONE">NONE - Hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      CRM System Settings
                    </label>
                    <select
                      value={form.modules.settings}
                      onChange={(e: any) =>
                        setForm({ ...form, modules: { ...form.modules, settings: e.target.value } })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      <option value="FULL">FULL - Modify Branding & Banks</option>
                      <option value="VIEW">VIEW - Read Only</option>
                      <option value="NONE">NONE - Restricted</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {loading ? 'Saving Role...' : editingRole ? 'Save Changes' : '+ Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
