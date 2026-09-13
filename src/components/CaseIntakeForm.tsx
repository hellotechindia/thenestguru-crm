'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCaseAction } from '@/app/actions';
import { User, Phone, Mail, MapPin, Layers, Users, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

interface Props {
  teams: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; role: string; email: string }>;
}

export default function CaseIntakeForm({ teams, states, users }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Exclude SUPER_ADMIN from operational staff assignment lists
  const channelUsers = users.filter((u) => u.role === 'CHANNEL');
  const salesUsers = users.filter((u) => u.role === 'SALES');
  const operationUsers = users.filter((u) => u.role === 'OPERATION' || u.role === 'TEAM_MEMBER');

  const [formData, setFormData] = useState({
    clientName: '',
    mobile: '',
    email: '',
    clientState: states[0]?.name || '',
    product: 'Home Loan',
    customerType: 'Salaried',
    propertyType: 'Resale',
    coApplicantCount: 0,
    channelUserId: '',
    salesUserId: '',
    operationUserId: '',
    assignedTeamId: teams[0]?.id || '',
  });

  const [coApplicants, setCoApplicants] = useState<Array<{
    name: string;
    mobile: string;
    email: string;
    state: string;
    incomeRequired: boolean;
  }>>([]);

  const handleCoApplicantCountChange = (count: number) => {
    const newCount = Math.max(0, count);
    setFormData({ ...formData, coApplicantCount: newCount });

    const newCoApps = [];
    for (let i = 0; i < newCount; i++) {
      if (coApplicants[i]) {
        newCoApps.push(coApplicants[i]);
      } else {
        newCoApps.push({
          name: '',
          mobile: '',
          email: '',
          state: states[0]?.name || '',
          incomeRequired: true,
        });
      }
    }
    setCoApplicants(newCoApps);
  };

  const handleCoApplicantChange = (index: number, field: string, value: any) => {
    const updated = [...coApplicants];
    updated[index] = { ...updated[index], [field]: value };
    setCoApplicants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await createCaseAction({
        ...formData,
        coApplicantsData: coApplicants,
      });

      if (res.success && res.caseId) {
        router.push(`/cases/${res.caseId}`);
        router.refresh();
      } else {
        setError('Failed to create case.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating case');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl space-y-6 shadow-2xl">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 1. Client Contact Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-2">
          <User className="w-4 h-4" /> 1. Client Contact Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mobile Number <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. ramesh@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client State
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={formData.clientState}
                onChange={(e) => setFormData({ ...formData, clientState: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 font-semibold"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 2. Co-Applicants Details with Income Required Yes/No */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Users className="w-4 h-4" /> 2. Co-Applicant Details
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Number of Co-Applicants:</span>
            <input
              type="number"
              min="0"
              max="5"
              value={formData.coApplicantCount}
              onChange={(e) => handleCoApplicantCountChange(parseInt(e.target.value) || 0)}
              className="w-16 glass-input px-2 py-1 rounded-lg text-xs font-bold text-center"
            />
          </div>
        </div>

        {coApplicants.map((coApp, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
              <span>Co-Applicant {idx + 1}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Income Details Required:</span>
                <select
                  value={coApp.incomeRequired ? 'YES' : 'NO'}
                  onChange={(e) => handleCoApplicantChange(idx, 'incomeRequired', e.target.value === 'YES')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    coApp.incomeRequired
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <option value="YES">YES (Include Income Docs)</option>
                  <option value="NO">NO (Skip Income Docs)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  placeholder={`Co-Applicant ${idx + 1} Name`}
                  value={coApp.name}
                  onChange={(e) => handleCoApplicantChange(idx, 'name', e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Mobile"
                  value={coApp.mobile}
                  onChange={(e) => handleCoApplicantChange(idx, 'mobile', e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email ID</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={coApp.email}
                  onChange={(e) => handleCoApplicantChange(idx, 'email', e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                <select
                  value={coApp.state}
                  onChange={(e) => handleCoApplicantChange(idx, 'state', e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl bg-white dark:bg-slate-900"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* 3. Product & Source Assignment Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <Layers className="w-4 h-4" /> 3. Product & Source User Assignments
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Loan Product</label>
            <select
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-semibold"
            >
              <option value="Home Loan">Home Loan</option>
              <option value="Loan Against Property">Loan Against Property</option>
              <option value="MSME Business Loan">MSME Business Loan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Profile</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
            >
              <option value="Salaried">Salaried</option>
              <option value="Professional">Professional</option>
              <option value="Business">Business / Self-Employed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Property Scope</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              <option value="Resale">Resale Property</option>
              <option value="Takeover / Seller BT">Takeover / Seller BT</option>
              <option value="Direct Allotment (Under Construction)">
                Direct Allotment (Under Construction)
              </option>
            </select>
          </div>
        </div>

        {/* Source User Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Channel Partner User
            </label>
            <select
              value={formData.channelUserId}
              onChange={(e) => setFormData({ ...formData, channelUserId: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
            >
              <option value="">-- Unassigned Channel --</option>
              {channelUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sales Lead User
            </label>
            <select
              value={formData.salesUserId}
              onChange={(e) => setFormData({ ...formData, salesUserId: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
            >
              <option value="">-- Unassigned Sales --</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Operation Lead User
            </label>
            <select
              value={formData.operationUserId}
              onChange={(e) => setFormData({ ...formData, operationUserId: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
            >
              <option value="">-- Unassigned Operation --</option>
              {operationUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>

        {teams.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Operations Team
            </label>
            <select
              value={formData.assignedTeamId}
              onChange={(e) => setFormData({ ...formData, assignedTeamId: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span>Generating Dynamic Checklist...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Create Case & Auto-Generate Dynamic Checklist</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
