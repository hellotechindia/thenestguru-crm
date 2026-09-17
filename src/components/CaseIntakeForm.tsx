'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCaseAction } from '@/app/actions';
import { User, Phone, Mail, MapPin, Layers, Users, ArrowRight, Sparkles, UserCheck, Building2, Calendar } from 'lucide-react';
import { isValid10DigitPhone, isValidEmail, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';

interface Props {
  teams: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string; cities?: Array<{ id: string; name: string }> }>;
  users: Array<{ id: string; name: string; role: string; email?: string | null; username?: string | null }>;
  products?: Array<{ id: string; name: string }>;
  profiles?: Array<{ id: string; name: string }>;
}

export default function CaseIntakeForm({
  teams,
  states,
  users,
  products = [],
  profiles = [],
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);

  // Exclude SUPER_ADMIN from operational staff assignment lists
  const channelUsers = users.filter((u) => u.role === 'CHANNEL');
  const salesUsers = users.filter((u) => u.role === 'SALES');
  const operationUsers = users.filter((u) => u.role === 'OPERATION' || u.role === 'TEAM_MEMBER');

  const [formData, setFormData] = useState({
    clientName: '',
    mobile: '',
    email: '',
    clientState: states[0]?.name || '',
    clientCity: '',
    clientDob: '',
    product: products[0]?.name || 'Home Loan',
    customerType: profiles[0]?.name || 'Salaried',
    propertyType: 'Resale',
    coApplicantCount: 0,
    channelUserId: '',
    salesUserId: '',
    operationUserId: '',
    assignedTeamId: teams[0]?.id || '',
  });

  const selectedStateObj = states.find((s) => s.name === formData.clientState);
  const stateCities = selectedStateObj?.cities || [];

  const [coApplicants, setCoApplicants] = useState<Array<{
    name: string;
    mobile: string;
    email: string;
    state: string;
    dob?: string;
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
          dob: '',
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
    setError('');

    // Strict Name, Phone & Email Validations
    if (!isValidName(formData.clientName)) {
      setError('Client Full Name must contain only alphabetic characters and spaces (numbers and special characters are not allowed).');
      return;
    }
    if (!isValid10DigitPhone(formData.mobile)) {
      setError('Client Mobile Number must be exactly 10 digits.');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid Client Email Address (e.g. client@example.com).');
      return;
    }
    for (let i = 0; i < coApplicants.length; i++) {
      const coApp = coApplicants[i];
      if (coApp.name && !isValidName(coApp.name)) {
        setError(`Co-Applicant ${i + 1} Name must contain only alphabetic characters and spaces (numbers and special characters are not allowed).`);
        return;
      }
      if (coApp.mobile && !isValid10DigitPhone(coApp.mobile)) {
        setError(`Co-Applicant ${i + 1} (${coApp.name || 'Co-Applicant'}) mobile number must be exactly 10 digits.`);
        return;
      }
      if (coApp.email && !isValidEmail(coApp.email)) {
        setError(`Co-Applicant ${i + 1} (${coApp.name || 'Co-Applicant'}) email address is invalid.`);
        return;
      }
    }

    setLoading(true);

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
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
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
                onChange={(e) => setFormData({ ...formData, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Number <span className="text-rose-500">* (10 Digits)</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${formData.mobile.length === 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                {formData.mobile.length}/10 digits
              </span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: sanitizeTo10Digits(e.target.value) })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono tracking-wider"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address <span className="text-rose-500">* (Valid Email)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. ramesh@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client Date of Birth (DOB) <span className="text-slate-400 font-normal">(Optional - For Birthday wishes)</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="date"
                value={formData.clientDob}
                onChange={(e) => setFormData({ ...formData, clientDob: e.target.value })}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client State
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={formData.clientState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setIsCustomCity(false);
                  setFormData({
                    ...formData,
                    clientState: newState,
                    clientCity: '',
                  });
                }}
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 font-semibold"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client City <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            {stateCities.length > 0 ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={
                      isCustomCity
                        ? '__other__'
                        : stateCities.some((c) => c.name === formData.clientCity)
                        ? formData.clientCity
                        : formData.clientCity
                        ? '__other__'
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setIsCustomCity(true);
                        setFormData({ ...formData, clientCity: '' });
                      } else {
                        setIsCustomCity(false);
                        setFormData({ ...formData, clientCity: e.target.value });
                      }
                    }}
                    className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 font-medium"
                  >
                    <option value="">-- Select City ({formData.clientState}) --</option>
                    {stateCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__other__">+ Other / Enter Manually</option>
                  </select>
                </div>
                {isCustomCity && (
                  <input
                    type="text"
                    placeholder="Enter city name..."
                    value={formData.clientCity}
                    onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium"
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Pune"
                  value={formData.clientCity}
                  onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                  className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            )}
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
                  onChange={(e) => handleCoApplicantChange(idx, 'name', sanitizeToAlphabetsOnly(e.target.value))}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Mobile Number (10 Digits)</label>
                  <span className={`text-[10px] font-mono ${coApp.mobile?.length === 10 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                    {coApp.mobile?.length || 0}/10
                  </span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={coApp.mobile}
                  onChange={(e) => handleCoApplicantChange(idx, 'mobile', sanitizeTo10Digits(e.target.value))}
                  className="w-full glass-input px-3 py-2 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email ID</label>
                <input
                  type="email"
                  placeholder="coapplicant@example.com"
                  value={coApp.email}
                  onChange={(e) => handleCoApplicantChange(idx, 'email', e.target.value.trim())}
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

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth (DOB) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={coApp.dob || ''}
                  onChange={(e) => handleCoApplicantChange(idx, 'dob', e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
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
              {products.length > 0 ? (
                products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Home Loan">Home Loan</option>
                  <option value="Loan Against Property">Loan Against Property</option>
                  <option value="MSME Business Loan">MSME Business Loan</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Profile</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
            >
              {profiles.length > 0 ? (
                profiles.map((pr) => (
                  <option key={pr.id} value={pr.name}>
                    {pr.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Salaried">Salaried</option>
                  <option value="Professional">Professional</option>
                  <option value="Business">Business / Self-Employed</option>
                </>
              )}
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
                <option key={u.id} value={u.id}>{u.name.replace(/\s*\([^)]*\)/g, '').trim()}</option>
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
                <option key={u.id} value={u.id}>{u.name.replace(/\s*\([^)]*\)/g, '').trim()}</option>
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
                <option key={u.id} value={u.id}>{u.name.replace(/\s*\([^)]*\)/g, '').trim()}</option>
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
