'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChevronRight,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { createVisitRecordAction } from '@/app/actions';
import DatePickerInput from '@/components/DatePickerInput';
import SearchableBuilderCpSelect, {
  BuilderOption,
  ChannelPartnerOption,
  DirectoryClientOption,
} from '@/components/SearchableBuilderCpSelect';

interface Props {
  staffUsers: Array<{ id: string; name: string; role: string }>;
  activeCases: Array<{ id: string; clientName: string; mobile?: string | null; product: string }>;
  builders: BuilderOption[];
  channelPartners: ChannelPartnerOption[];
  clients: DirectoryClientOption[];
  currentUserId: string;
}

export default function ScheduleVisitPageClient({
  staffUsers,
  activeCases,
  builders: initialBuilders,
  channelPartners,
  clients: initialClients,
  currentUserId,
}: Props) {
  const router = useRouter();

  const [buildersList, setBuildersList] = useState<BuilderOption[]>(initialBuilders);
  const [clientsList, setClientsList] = useState<DirectoryClientOption[]>(initialClients);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    caseId: '',
    clientName: '',
    clientPhone: '',
    contactPhone: '',
    contactEmail: '',
    projectName: '',
    projectPrice: '',
    propertyAddress: '',
    visitDate: '',
    visitTime: '11:00',
    staffUserId: staffUsers[0]?.id || currentUserId,
    visitType: 'PROPERTY_VERIFICATION',
    remarks: '',

    // Builder / CP Specs
    builderName: '',
    projectType: 'Residential',
    projectLaunchDate: '',
    reraStatus: '',
    approvedBanks: '',
    priceRange: '',
    totalUnits: '',
    unitsSold: '',
    paymentPlan: '',

    // Concerned Person & Office
    concernedPersonName: '',
    concernedPersonDesignation: '',
    concernedPersonContact: '',
    officeAddress: '',

    // Channel Partner
    cpName: '',
    cpContact: '',
    cpAddress: '',

    // Strategy & Next FU
    visitFrequency: '',
    nextFollowUpDate: '',
    leadType: 'Warm',
  });

  const handleCaseSelect = (caseId: string) => {
    if (!caseId) {
      setForm((prev) => ({ ...prev, caseId: '' }));
      return;
    }
    const selected = activeCases.find((c) => c.id === caseId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        caseId: selected.id,
        clientName: selected.clientName || prev.clientName,
        clientPhone: selected.mobile || prev.clientPhone,
        contactPhone: selected.mobile || prev.contactPhone,
      }));
    }
  };

  const handleSelectBuilder = (bName: string, bObj?: BuilderOption) => {
    const matched = bObj || buildersList.find((b) => b.name === bName);
    const phoneVal = matched?.phone || '';
    const emailVal = matched?.email || '';
    setForm((prev) => ({
      ...prev,
      builderName: bName,
      clientName: bName,
      cpName: '',
      cpContact: '',
      cpAddress: '',
      contactPhone: phoneVal || prev.contactPhone,
      contactEmail: emailVal || prev.contactEmail,
      clientPhone: phoneVal || prev.clientPhone,
      approvedBanks: matched?.approvedBanks || prev.approvedBanks,
      concernedPersonName: matched?.contactPerson || prev.concernedPersonName,
      concernedPersonDesignation: matched?.designation || prev.concernedPersonDesignation,
      concernedPersonContact: phoneVal || prev.concernedPersonContact,
      officeAddress: matched?.officeAddress || prev.officeAddress,
      reraStatus: matched?.reraNumber ? `RERA: ${matched.reraNumber}` : prev.reraStatus,
    }));
  };

  const handleSelectCP = (cp: ChannelPartnerOption) => {
    const phoneVal = cp.phone || '';
    const emailVal = cp.email || '';
    setForm((prev) => ({
      ...prev,
      builderName: '',
      clientName: cp.name,
      cpName: cp.name,
      cpContact: phoneVal,
      cpAddress: cp.address || '',
      contactPhone: phoneVal || prev.contactPhone,
      contactEmail: emailVal || prev.contactEmail,
      clientPhone: phoneVal || prev.clientPhone,
      concernedPersonName: prev.concernedPersonName || cp.name,
      concernedPersonContact: phoneVal || prev.concernedPersonContact,
      officeAddress: prev.officeAddress || cp.address || '',
    }));
  };

  const handleSelectClient = (c: DirectoryClientOption) => {
    const phoneVal = c.phone || '';
    const emailVal = c.email || '';
    setForm((prev) => ({
      ...prev,
      clientName: c.name,
      builderName: '',
      cpName: '',
      contactPhone: phoneVal || prev.contactPhone,
      contactEmail: emailVal || prev.contactEmail,
      clientPhone: phoneVal || prev.clientPhone,
      propertyAddress: [c.city, c.state].filter(Boolean).join(', ') || prev.propertyAddress,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const effectiveEntityName = form.builderName.trim() || form.cpName.trim() || form.clientName.trim();
    if (!effectiveEntityName) {
      setError('Please select a Builder, Channel Partner, or Client from the directory dropdown.');
      return;
    }

    if (!form.visitDate.trim()) {
      setError('Visit Date is required.');
      return;
    }

    if (!form.staffUserId) {
      setError('Please select an assigned staff executive.');
      return;
    }

    setLoading(true);
    try {
      const formattedPersonContact = [form.contactPhone.trim(), form.contactEmail.trim()].filter(Boolean).join(' / ') || form.concernedPersonContact.trim() || null;
      const res = await createVisitRecordAction({
        caseId: form.caseId || null,
        clientName: effectiveEntityName,
        clientPhone: form.contactPhone.trim() || form.clientPhone.trim() || form.cpContact.trim() || form.concernedPersonContact.trim() || null,
        projectName: form.projectName.trim() || null,
        projectPrice: form.projectPrice ? Number(form.projectPrice) : null,
        propertyAddress: form.propertyAddress.trim() || form.officeAddress.trim() || null,
        visitDate: form.visitDate,
        visitTime: form.visitTime || null,
        staffUserId: form.staffUserId,
        visitType: form.visitType,
        remarks: form.remarks.trim() || null,

        builderName: form.builderName.trim() || null,
        projectType: form.projectType || null,
        projectLaunchDate: form.projectLaunchDate.trim() || null,
        reraStatus: form.reraStatus.trim() || null,
        approvedBanks: form.approvedBanks.trim() || null,
        priceRange: form.priceRange.trim() || null,
        totalUnits: form.totalUnits.trim() || null,
        unitsSold: form.unitsSold.trim() || null,
        paymentPlan: form.paymentPlan.trim() || null,

        concernedPersonName: form.concernedPersonName.trim() || null,
        concernedPersonDesignation: form.concernedPersonDesignation.trim() || null,
        concernedPersonContact: formattedPersonContact,
        officeAddress: form.officeAddress.trim() || null,

        cpName: form.cpName.trim() || null,
        cpContact: form.contactPhone.trim() || form.cpContact.trim() || null,
        cpAddress: form.cpAddress.trim() || null,

        visitFrequency: form.visitFrequency.trim() || null,
        nextFollowUpDate: form.nextFollowUpDate || null,
        leadType: form.leadType || null,
      });

      if (res.success) {
        setSuccessMsg('Visit scheduled successfully! Redirecting to Visit Tracker...');
        setTimeout(() => {
          router.push('/visits');
          router.refresh();
        }, 800);
      } else {
        setError(res.error || 'Failed to schedule visit.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong scheduling the visit.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDisplayType = form.builderName ? 'BUILDER' : form.cpName ? 'CP' : form.clientName ? 'CLIENT' : '';
  const selectedDisplayName = form.builderName || form.cpName || form.clientName || '';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/visits" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Visit Tracker
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-800 dark:text-slate-200">Schedule New Visit</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Schedule New Visit & Project Information
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All details on a single page. Select from Builder, Channel Partner, or Client Directory below.
          </p>
        </div>

        <Link
          href="/visits"
          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Visits
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Single-Page Unified Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CORE SELECTION - 3 DYNAMIC DIRECTORY OPTIONS */}
        <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-[35]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  1. Builder / Channel Partner / Client Directory Selection *
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select an existing entity or click <strong>+ Add</strong> to create a new Builder, CP, or Client.
                </p>
              </div>
            </div>
            {selectedDisplayName && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {selectedDisplayType === 'BUILDER' && '🏢 Builder Selected'}
                {selectedDisplayType === 'CP' && '🤝 CP Selected'}
                {selectedDisplayType === 'CLIENT' && '👤 Client Selected'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="md:col-span-2 relative z-[35]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Builder / Channel Partner / Client Directory *
              </label>
              <SearchableBuilderCpSelect
                selectedType={selectedDisplayType}
                selectedName={selectedDisplayName}
                builders={buildersList}
                channelPartners={channelPartners}
                clients={clientsList}
                onSelectBuilder={(bName, bObj) => handleSelectBuilder(bName, bObj)}
                onSelectCP={(cp) => handleSelectCP(cp)}
                onSelectClient={(c) => handleSelectClient(c)}
                onClear={() => {
                  setForm((prev) => ({
                    ...prev,
                    builderName: '',
                    cpName: '',
                    clientName: '',
                    contactPhone: '',
                    contactEmail: '',
                    clientPhone: '',
                    cpContact: '',
                    cpAddress: '',
                  }));
                }}
                onBuilderCreated={(newB) => {
                  setBuildersList((prev) => [newB, ...prev]);
                }}
                onClientCreated={(newC) => {
                  setClientsList((prev) => [newC, ...prev]);
                }}
              />

              {form.builderName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  <span>🏢 Active Builder: <strong>{form.builderName}</strong></span>
                </div>
              )}
              {form.cpName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  <span>🤝 Active Channel Partner: <strong>{form.cpName}</strong></span>
                </div>
              )}
              {!form.builderName && !form.cpName && form.clientName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  <span>👤 Active Client: <strong>{form.clientName}</strong></span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Link to Existing Intake Case <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={form.caseId}
                onChange={(e) => handleCaseSelect(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-medium"
              >
                <option value="">-- Standalone Visit / No Case Linked --</option>
                {activeCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} ({c.product}) - 📞 {c.mobile || 'No Phone'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                placeholder="e.g. The Arbour, Sector 63"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Auto-filled / Editable Phone & Email Fields */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Contact Phone Number</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value, clientPhone: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Contact Email Address</span>
              </label>
              <input
                type="email"
                placeholder="e.g. contact@domain.com"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: SCHEDULE & CORE VISIT SPECS */}
        <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-[25]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                2. Visit Schedule & Executive Assignment
              </h3>
              <p className="text-[11px] text-slate-400">
                Specify when this visit will happen and who will execute it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Visit Date * (DD/MM/YYYY)
              </label>
              <DatePickerInput
                required
                value={form.visitDate}
                onChange={(val) => setForm({ ...form, visitDate: val })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
                minYear={1990}
                maxYear={2050}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Visit Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="time"
                  value={form.visitTime}
                  onChange={(e) => setForm({ ...form, visitTime: e.target.value })}
                  className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Staff Executive *
              </label>
              <select
                required
                value={form.staffUserId}
                onChange={(e) => setForm({ ...form, staffUserId: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
              >
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Visit Objective / Type
              </label>
              <select
                value={form.visitType}
                onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
              >
                <option value="PROPERTY_VERIFICATION">Property Verification</option>
                <option value="BUILDER_DISCUSSION">Builder Discussion</option>
                <option value="CLIENT_MEETING">Client Meeting</option>
                <option value="DOCUMENT_COLLECTION">Document Collection</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Property Address / Visit Location
              </label>
              <input
                type="text"
                placeholder="e.g. Flat 302, Palm Heights, Sector 62, Noida"
                value={form.propertyAddress}
                onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PROJECT SPECIFICATIONS & COMMERCIALS */}
        <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-[15]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                3. Project Specs, Pricing & RERA Details
              </h3>
              <p className="text-[11px] text-slate-400">
                Inventory size, approved financial institutions, payment plan, and price bracket.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Type of Project
              </label>
              <select
                value={form.projectType}
                onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Launch / Expected Date
              </label>
              <input
                type="text"
                placeholder="e.g. Jan 2025 or DD/MM/YYYY"
                value={form.projectLaunchDate}
                onChange={(e) => setForm({ ...form, projectLaunchDate: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                RERA Status
              </label>
              <input
                type="text"
                placeholder="Received / Expected by Dec..."
                value={form.reraStatus}
                onChange={(e) => setForm({ ...form, reraStatus: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank&apos;s Name Approved
              </label>
              <input
                type="text"
                placeholder="e.g. SBI, HDFC, ICICI, Axis Bank"
                value={form.approvedBanks}
                onChange={(e) => setForm({ ...form, approvedBanks: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Price Range
              </label>
              <input
                type="text"
                placeholder="e.g. ₹75 L - ₹1.5 Cr"
                value={form.priceRange}
                onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Total No. of Units
              </label>
              <input
                type="text"
                placeholder="e.g. 450"
                value={form.totalUnits}
                onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Units Sold (If Any)
              </label>
              <input
                type="text"
                placeholder="e.g. 180"
                value={form.unitsSold}
                onChange={(e) => setForm({ ...form, unitsSold: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Plan
              </label>
              <input
                type="text"
                placeholder="e.g. 10:90, CLP, Subvention"
                value={form.paymentPlan}
                onChange={(e) => setForm({ ...form, paymentPlan: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: CONCERNED PERSON & OFFICE */}
        <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-[10]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                4. Concerned Person & Corporate Office
              </h3>
              <p className="text-[11px] text-slate-400">
                Official contact person at builder desk or channel partner coordinator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Concerned Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mr. Rajesh Sharma"
                value={form.concernedPersonName}
                onChange={(e) => setForm({ ...form, concernedPersonName: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Designation
              </label>
              <input
                type="text"
                placeholder="e.g. VP Sales / Site Manager"
                value={form.concernedPersonDesignation}
                onChange={(e) => setForm({ ...form, concernedPersonDesignation: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Details (Mobile / E-mail ID)
              </label>
              <input
                type="text"
                placeholder="e.g. 9811223344 / rajesh@builder.com"
                value={form.concernedPersonContact}
                onChange={(e) => setForm({ ...form, concernedPersonContact: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Office Address
              </label>
              <input
                type="text"
                placeholder="e.g. Corporate Office, 5th Floor, Tower B, Cyber City, Gurugram"
                value={form.officeAddress}
                onChange={(e) => setForm({ ...form, officeAddress: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: STRATEGY, FOLLOW-UP & REMARKS */}
        <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-[5]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                5. Lead Strategy & Next Follow-Up
              </h3>
              <p className="text-[11px] text-slate-400">
                Categorize conversion probability and schedule the next interaction cycle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Type *
              </label>
              <select
                value={form.leadType}
                onChange={(e) => setForm({ ...form, leadType: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
              >
                <option value="Hot">🔥 Hot (High Intent)</option>
                <option value="Warm">⚡ Warm (Considering)</option>
                <option value="Cold">❄️ Cold (Early Stage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Frequency of Visit
              </label>
              <input
                type="text"
                placeholder="e.g. Once a week, 15 days, Monthly"
                value={form.visitFrequency}
                onChange={(e) => setForm({ ...form, visitFrequency: e.target.value })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Next FU Date (DD/MM/YYYY)
              </label>
              <DatePickerInput
                value={form.nextFollowUpDate}
                onChange={(val) => setForm({ ...form, nextFollowUpDate: val })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium"
                minYear={1990}
                maxYear={2050}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Remarks / Agenda Notes
            </label>
            <textarea
              rows={3}
              placeholder="Enter briefing notes, verified requirements, or agenda points..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/visits"
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>Scheduling Visit...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save & Schedule Visit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
