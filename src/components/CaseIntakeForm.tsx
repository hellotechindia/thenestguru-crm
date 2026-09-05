'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCaseAction } from '@/app/actions';
import { Building2, User, Phone, Mail, FileText, Layers, Users, ArrowRight, Sparkles } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

export default function CaseIntakeForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientName: '',
    mobile: '',
    email: '',
    product: 'Home Loan',
    customerType: 'Salaried',
    propertyType: 'Resale',
    coApplicantCount: 0,
    assignedTeamId: teams[0]?.id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await createCaseAction(formData);
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
    <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Section 1: Client Personal Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <User className="w-4 h-4" />
          1. Client Contact Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Client Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mobile Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address (Optional)</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Section 2: Case Product & Checklist Parameters */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          2. Product & Checklist Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Loan Product</label>
            <select
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-slate-900 text-sky-400 font-semibold"
            >
              <option value="Home Loan">Home Loan (Active)</option>
              <option value="Loan Against Property">Loan Against Property</option>
              <option value="MSME Business Loan">MSME Business Loan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Profile Type</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-slate-900 text-white font-semibold"
            >
              <option value="Salaried">Salaried (Full Matrix)</option>
              <option value="Professional">Professional (Doctor, CA, Architect)</option>
              <option value="Business">Business / Self-Employed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Property Scope Type</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-slate-900 text-indigo-400 font-semibold"
            >
              <option value="Resale">Resale Property</option>
              <option value="Takeover / Seller BT">Takeover / Seller BT</option>
              <option value="Direct Allotment (Under Construction)">
                Direct Allotment (Under Construction)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">No. of Co-Applicants</label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                max="5"
                value={formData.coApplicantCount}
                onChange={(e) => setFormData({ ...formData, coApplicantCount: parseInt(e.target.value) || 0 })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-white"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Generates per-co-applicant document line items automatically.
            </span>
          </div>
        </div>

        {teams.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Operations Team</label>
            <select
              value={formData.assignedTeamId}
              onChange={(e) => setFormData({ ...formData, assignedTeamId: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-slate-900 text-slate-200"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
