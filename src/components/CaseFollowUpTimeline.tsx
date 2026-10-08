'use client';

import { useState } from 'react';
import { addCaseFollowUpAction } from '@/app/actions';
import { Clock, Plus, CheckCircle, MessageSquare, ShieldAlert, History } from 'lucide-react';
import { formatISTDate } from '@/lib/ist-time';

interface FollowUpItem {
  id: string;
  stage: number;
  stageName?: string | null;
  status: string;
  remarks: string;
  createdByName: string;
  createdAt: string | Date;
}

interface Props {
  caseId: string;
  initialFollowUps: FollowUpItem[];
  isReadOnly?: boolean;
  statusList?: string[];
}

const DEFAULT_STATUS_OPTIONS = [
  'Pending Documents',
  'Documents In Review',
  'Verification Scheduled',
  'Bank File Login Done',
  'Underwriting Queries Raised',
  'Queries Resolved',
  'Sanction Letter Issued',
  'Disbursement Processed',
  'On Hold',
  'Rejected',
];

export default function CaseFollowUpTimeline({
  caseId,
  initialFollowUps = [],
  isReadOnly = false,
  statusList = [],
}: Props) {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(initialFollowUps);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = statusList && statusList.length > 0 ? statusList : DEFAULT_STATUS_OPTIONS;

  const [form, setForm] = useState({
    stage: 1,
    status: statusOptions[0] || 'Pending Documents',
    remarks: '',
  });

  const stageOptions = [
    { value: 1, label: 'Stage 1: Lead Intake & KYC' },
    { value: 2, label: 'Stage 2: Document Verification & Eligibility' },
    { value: 3, label: 'Stage 3: Bank File Login & Underwriting' },
    { value: 4, label: 'Stage 4: Sanction & Disbursement' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.remarks.trim()) {
      setError('Please provide follow-up remarks.');
      return;
    }

    setLoading(true);
    setError('');

    const matchedStage = stageOptions.find((s) => s.value === Number(form.stage));

    const res = await addCaseFollowUpAction({
      caseId,
      stage: Number(form.stage),
      stageName: matchedStage?.label || `Stage ${form.stage}`,
      status: form.status,
      remarks: form.remarks.trim(),
    });

    setLoading(false);

    if (res.success && res.followUp) {
      setFollowUps([res.followUp, ...followUps]);
      setForm({
        stage: Number(form.stage),
        status: form.status,
        remarks: '',
      });
      setIsAdding(false);
    } else {
      setError(res.error || 'Failed to save follow-up entry.');
    }
  };

  const renderRemarks = (rawRemarks: string) => {
    const docMatch = rawRemarks.match(/^\[(.*?)\]\s*\((.*?)\):\s*(.*)$/);
    if (docMatch) {
      const docName = docMatch[1];
      const personName = docMatch[2];
      const details = docMatch[3];
      const isCoApp = personName.toLowerCase().includes('co-applicant');

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              📄 {docName}
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
              isCoApp
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}>
              👤 {personName}
            </span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {details}
          </p>
        </div>
      );
    }

    if (rawRemarks.startsWith('Case status changed')) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ⚡ Stage Update
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rawRemarks}</span>
        </div>
      );
    }

    if (rawRemarks.startsWith('Bulk saved')) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            📦 Category Save
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rawRemarks}</span>
        </div>
      );
    }

    if (rawRemarks.startsWith('Updated Personal Info')) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            👤 Personal Details
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rawRemarks}</span>
        </div>
      );
    }

    return <span>{rawRemarks}</span>;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-5 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Case File Follow-Up & Timeline Log
          </h3>
          <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
            {followUps.length} Records
          </span>
        </div>

        {!isReadOnly && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add Follow-Up Remark
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              New File Follow-Up Entry
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Workflow Stage
              </label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
              >
                {stageOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Current Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Follow-Up Remarks & Next Action Plan *
            </label>
            <textarea
              required
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Spoke with client. Client will provide Form 16 and bank statement by 4 PM tomorrow..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Follow-Up'}
            </button>
          </div>
        </form>
      )}

      {/* Follow-Up Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-4">Remarks</th>
              <th className="py-2.5 px-3">Updated By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {followUps.length > 0 ? (
              followUps.map((item) => {
                const dateObj = new Date(item.createdAt);
                const dateFormatted = dateObj.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {dateFormatted} <span className="opacity-75">({timeFormatted})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 min-w-[200px]">
                      {renderRemarks(item.remarks)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {item.createdByName || 'Staff'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                  No follow-up remarks logged yet for this case.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
