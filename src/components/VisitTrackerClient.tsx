'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVisitRecordAction, updateVisitStatusAction } from '@/app/actions';
import {
  MapPin, Calendar, Clock, Plus, Search, CheckCircle2,
  AlertCircle, User, Building, Phone, ArrowRight, ExternalLink, X, Briefcase
} from 'lucide-react';
import { sanitizeTo10Digits, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

interface ActiveCase {
  id: string;
  clientName: string;
  mobile: string;
  product: string;
}

interface VisitItem {
  id: string;
  caseId: string | null;
  case: { id: string; clientName: string; product: string } | null;
  clientName: string;
  clientPhone: string | null;
  propertyAddress: string | null;
  visitDate: string | Date;
  visitTime: string | null;
  staffUserId: string;
  staff: StaffUser;
  visitType: string;
  status: string;
  remarks: string | null;
  createdAt: string | Date;
}

interface Props {
  initialVisits: VisitItem[];
  staffUsers: StaffUser[];
  activeCases: ActiveCase[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

export default function VisitTrackerClient({
  initialVisits = [],
  staffUsers,
  activeCases,
  currentUserId,
  isSuperAdmin,
}: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitItem[]>(initialVisits);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    caseId: '',
    clientName: '',
    clientPhone: '',
    propertyAddress: '',
    visitDate: '',
    visitTime: '11:00',
    staffUserId: staffUsers[0]?.id || currentUserId,
    visitType: 'PROPERTY_VERIFICATION',
    remarks: '',
  });

  // Auto-populate when selecting a case
  const handleCaseSelect = (caseId: string) => {
    setForm((prev) => {
      if (!caseId) return { ...prev, caseId: '' };
      const matched = activeCases.find((c) => c.id === caseId);
      return {
        ...prev,
        caseId,
        clientName: matched ? matched.clientName : prev.clientName,
        clientPhone: matched ? matched.mobile : prev.clientPhone,
      };
    });
  };

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchClient = (v.clientName || '').toLowerCase().includes(q);
        const matchAddress = v.propertyAddress?.toLowerCase().includes(q);
        const matchStaff = (v.staff?.name || '').toLowerCase().includes(q);
        if (!matchClient && !matchAddress && !matchStaff) return false;
      }
      return true;
    });
  }, [visits, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayVisits = 0;

    visits.forEach((v) => {
      if (v.status === 'SCHEDULED') scheduled++;
      if (v.status === 'COMPLETED') completed++;
      if (v.status === 'CANCELLED') cancelled++;
      try {
        const vDate = new Date(v.visitDate);
        if (!isNaN(vDate.getTime()) && vDate.toISOString().slice(0, 10) === todayStr) {
          todayVisits++;
        }
      } catch {}
    });

    return { scheduled, completed, cancelled, todayVisits, total: visits.length };
  }, [visits]);

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.visitDate) {
      setError('Please provide Client Name and Visit Date.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createVisitRecordAction({
      caseId: form.caseId || undefined,
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone ? form.clientPhone.trim() : undefined,
      propertyAddress: form.propertyAddress ? form.propertyAddress.trim() : undefined,
      visitDate: form.visitDate,
      visitTime: form.visitTime || undefined,
      staffUserId: form.staffUserId,
      visitType: form.visitType,
      remarks: form.remarks || undefined,
    });

    setLoading(false);

    if (res.success && res.visit) {
      const assignedStaff = staffUsers.find((u) => u.id === form.staffUserId);
      const linkedCase = activeCases.find((c) => c.id === form.caseId);
      const newVisitItem: any = {
        ...res.visit,
        staff: assignedStaff || { id: form.staffUserId, name: 'Staff', role: 'MEMBER' },
        case: linkedCase ? { id: linkedCase.id, clientName: linkedCase.clientName, product: linkedCase.product } : null,
      };

      setVisits([newVisitItem, ...visits]);
      setIsModalOpen(false);
      setForm({
        caseId: '',
        clientName: '',
        clientPhone: '',
        propertyAddress: '',
        visitDate: '',
        visitTime: '11:00',
        staffUserId: staffUsers[0]?.id || currentUserId,
        visitType: 'PROPERTY_VERIFICATION',
        remarks: '',
      });
      router.refresh();
    } else {
      setError(res.error || 'Failed to schedule visit.');
    }
  };

  const handleUpdateStatus = async (visitId: string, newStatus: string) => {
    const res = await updateVisitStatusAction(visitId, newStatus);
    if (res.success) {
      setVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, status: newStatus } : v))
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to update visit status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Total Visits Logged
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-400">All recorded site & client visits</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Scheduled / Pending
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.scheduled}</div>
          <span className="text-[10px] text-amber-600/70">Upcoming field verifications</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Completed Visits
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          <span className="text-[10px] text-emerald-600/70">Verified & successfully closed</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Today's Visits
          </span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.todayVisits}</div>
          <span className="text-[10px] text-indigo-600/70">Scheduled for today</span>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search client, address or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Schedule Visit
        </button>
      </div>

      {/* Visits Table */}
      <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px] bg-slate-50/70 dark:bg-slate-800/40">
                <th className="py-3 px-4">Client & Contact</th>
                <th className="py-3 px-4">Visit Type</th>
                <th className="py-3 px-4">Property / Site Address</th>
                <th className="py-3 px-4">Visit Date & Time</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((v) => {
                  let dateStr = '--';
                  try {
                    const vd = new Date(v.visitDate);
                    if (!isNaN(vd.getTime())) {
                      dateStr = vd.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                    }
                  } catch {}

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {v.clientName}
                          {v.case && (
                            <Link
                              href={`/cases/${v.case.id}`}
                              className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5"
                            >
                              ({v.case.product}) <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                        {v.clientPhone && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {v.clientPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                          {v.visitType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                        {v.propertyAddress ? (
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{v.propertyAddress}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No address specified</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        <div>{dateStr}</div>
                        {v.visitTime && (
                          <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-500" /> {v.visitTime}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{v.staff?.name || 'Staff Member'}</div>
                        <div className="text-[10px] text-slate-400">{v.staff?.role || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            v.status === 'COMPLETED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : v.status === 'CANCELLED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status === 'SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(v.id, 'COMPLETED')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(v.id, 'CANCELLED')}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {v.status !== 'SCHEDULED' && (
                            <button
                              onClick={() => handleUpdateStatus(v.id, 'SCHEDULED')}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Re-open
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">
                    No visit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Visit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Schedule Client / Property Visit
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleScheduleVisit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Existing Case <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={form.caseId}
                  onChange={(e) => handleCaseSelect(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">-- Standalone Visit / No Case --</option>
                  {activeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product}) - {c.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Client Name"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={form.clientPhone}
                    onChange={(e) => setForm({ ...form, clientPhone: sanitizeTo10Digits(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Property Address / Visit Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Palm Heights, Sector 12"
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.visitDate}
                    onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Time
                  </label>
                  <input
                    type="time"
                    value={form.visitTime}
                    onChange={(e) => setForm({ ...form, visitTime: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Staff Executive *
                  </label>
                  <select
                    required
                    value={form.staffUserId}
                    onChange={(e) => setForm({ ...form, staffUserId: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Objective / Type
                  </label>
                  <select
                    value={form.visitType}
                    onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="PROPERTY_VERIFICATION">Property Verification</option>
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="DOCUMENT_COLLECTION">Document Collection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Meeting Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about verification requirements..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
