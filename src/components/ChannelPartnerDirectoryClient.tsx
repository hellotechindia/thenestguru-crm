'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, Phone, Mail, MapPin, Building,
  Calendar, ShieldCheck, Download, X, Eye, CheckCircle2,
  AlertCircle, Edit2, Trash2, AlertTriangle
} from 'lucide-react';
import {
  createChannelPartnerAction,
  updateChannelPartnerAction,
  deleteChannelPartnerAction
} from '@/app/actions';
import { exportToCSV } from '@/lib/excel-export';
import DatePickerInput from './DatePickerInput';

export interface ChannelPartnerItem {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  jobRole: string | null; // Firm Name
  dob: string | Date | null;
  accessPermission: string | null;
  createdAt: string | Date;
}

interface Props {
  initialPartners: ChannelPartnerItem[];
  isSuperAdmin: boolean;
  isTeamLeader?: boolean;
}

export default function ChannelPartnerDirectoryClient({
  initialPartners = [],
  isSuperAdmin,
  isTeamLeader,
}: Props) {
  const router = useRouter();
  const [partners, setPartners] = useState<ChannelPartnerItem[]>(initialPartners);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    firmName: '',
    password: '',
    dob: '',
  });

  // Edit Modal State
  const [editingPartner, setEditingPartner] = useState<ChannelPartnerItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    firmName: '',
    password: '',
    dob: '',
  });

  // Delete Confirmation Popup State
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<ChannelPartnerItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const canManage = isSuperAdmin || isTeamLeader;

  // Filtered partners
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const q = searchQuery.toLowerCase();
    return partners.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchPhone = (p.phone || '').toLowerCase().includes(q);
      const matchEmail = (p.email || '').toLowerCase().includes(q);
      const matchFirm = (p.jobRole || '').toLowerCase().includes(q);
      const matchAddress = (p.address || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchFirm || matchAddress;
    });
  }, [partners, searchQuery]);

  // Handle Create Submit
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Partner Name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Contact Number is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await createChannelPartnerAction({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      firmName: formData.firmName.trim() || undefined,
      password: formData.password.trim() || undefined,
      dob: formData.dob || undefined,
    });

    setLoading(false);

    if (res.success && res.partner) {
      setPartners((prev) => [res.partner as any, ...prev]);
      setSuccessMsg(`Channel partner "${res.partner.name}" created successfully with VIEW access permission!`);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        firmName: '',
        password: '',
        dob: '',
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 1500);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create channel partner.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (partner: ChannelPartnerItem) => {
    setEditErrorMsg('');
    setEditSuccessMsg('');
    let formattedDob = '';
    if (partner.dob) {
      try {
        const d = new Date(partner.dob);
        if (!isNaN(d.getTime())) {
          formattedDob = d.toISOString().slice(0, 10);
        }
      } catch {}
    }

    setEditFormData({
      name: partner.name || '',
      phone: partner.phone || '',
      email: partner.email || '',
      address: partner.address || '',
      firmName: partner.jobRole && partner.jobRole !== 'Channel Partner' ? partner.jobRole : '',
      password: '',
      dob: formattedDob,
    });
    setEditingPartner(partner);
  };

  // Handle Edit Submit
  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    if (!editFormData.name.trim()) {
      setEditErrorMsg('Partner Name is required.');
      return;
    }
    if (!editFormData.phone.trim()) {
      setEditErrorMsg('Contact Number is required.');
      return;
    }

    setEditLoading(true);
    setEditErrorMsg('');
    setEditSuccessMsg('');

    const res = await updateChannelPartnerAction({
      id: editingPartner.id,
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim(),
      email: editFormData.email.trim() || undefined,
      address: editFormData.address.trim() || undefined,
      firmName: editFormData.firmName.trim() || undefined,
      password: editFormData.password.trim() || undefined,
      dob: editFormData.dob || undefined,
    });

    setEditLoading(false);

    if (res.success && res.partner) {
      setPartners((prev) =>
        prev.map((p) => (p.id === editingPartner.id ? (res.partner as any) : p))
      );
      setEditSuccessMsg(`Channel partner "${res.partner.name}" updated successfully!`);
      setTimeout(() => {
        setEditingPartner(null);
        setEditSuccessMsg('');
      }, 1200);
      router.refresh();
    } else {
      setEditErrorMsg(res.error || 'Failed to update channel partner.');
    }
  };

  // Handle Delete Confirmation Submit
  const handleDeletePartner = async () => {
    if (!deleteConfirmPartner) return;
    setDeleteLoading(true);
    setDeleteErrorMsg('');

    const res = await deleteChannelPartnerAction(deleteConfirmPartner.id);
    setDeleteLoading(false);

    if (res.success) {
      setPartners((prev) => prev.filter((p) => p.id !== deleteConfirmPartner.id));
      setDeleteConfirmPartner(null);
      router.refresh();
    } else {
      setDeleteErrorMsg(res.error || 'Failed to delete channel partner.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = filteredPartners.map((p) => ({
      'Partner Name': p.name,
      'Firm Name': p.jobRole || 'Independent CP',
      'Contact Number': p.phone || '',
      'Email': p.email || '',
      'Address': p.address || '',
      'Date of Birth': p.dob ? new Date(p.dob).toLocaleDateString('en-IN') : '',
      'Access Permission': p.accessPermission || 'VIEW',
      'Created Date': new Date(p.createdAt).toLocaleDateString('en-IN'),
    }));
    exportToCSV(`channel_partners_${new Date().toISOString().slice(0, 10)}`, data);
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Partners
          </span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {partners.length}
          </div>
          <span className="text-[10px] text-slate-400">Registered channel partners</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Verified Contacts
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {partners.filter((p) => Boolean(p.phone)).length}
          </div>
          <span className="text-[10px] text-emerald-600/70">With direct mobile number</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Default View Access
          </span>
          <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
            {partners.filter((p) => p.accessPermission === 'VIEW' || !p.accessPermission).length}
          </div>
          <span className="text-[10px] text-sky-600/70">Safe view-only portal access</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Firm Associates
          </span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {partners.filter((p) => Boolean(p.jobRole && p.jobRole !== 'Channel Partner')).length}
          </div>
          <span className="text-[10px] text-indigo-600/70">With registered company/firm</span>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="p-4 glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search partner, phone, firm, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Export channel partners to CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export CSV</span>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Channel Partner</span>
            </button>
          )}
        </div>
      </div>

      {/* Partners Table */}
      <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px] tracking-wider bg-slate-50/80 dark:bg-slate-800/60 select-none">
                <th className="py-3.5 px-4 text-left">Partner & Firm</th>
                <th className="py-3.5 px-4 text-left">Contact Info</th>
                <th className="py-3.5 px-4 text-left">Address</th>
                <th className="py-3.5 px-4 text-left">Date of Birth</th>
                <th className="py-3.5 px-4 text-center">Permission</th>
                <th className="py-3.5 px-4 text-center">Enrolled Date</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPartners.length > 0 ? (
                filteredPartners.map((p) => {
                  let dobStr = '--';
                  if (p.dob) {
                    try {
                      const d = new Date(p.dob);
                      if (!isNaN(d.getTime())) {
                        dobStr = d.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                      }
                    } catch {}
                  }

                  let createdStr = '--';
                  try {
                    const cd = new Date(p.createdAt);
                    if (!isNaN(cd.getTime())) {
                      createdStr = cd.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                    }
                  } catch {}

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                            {p.name}
                          </div>
                          {p.jobRole && (
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                              <Building className="w-3 h-3 text-indigo-500" />
                              <span>{p.jobRole}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">
                            User: @{p.username}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          {p.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold text-xs">
                              <Phone className="w-3.5 h-3.5 text-emerald-500" />
                              <a href={`tel:${p.phone}`} className="hover:underline">
                                {p.phone}
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No phone</span>
                          )}
                          {p.email && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <a href={`mailto:${p.email}`} className="hover:underline truncate max-w-[180px]">
                                {p.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-middle">
                        {p.address ? (
                          <div className="flex items-start gap-1 text-[11px] text-slate-600 dark:text-slate-300 max-w-[220px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{p.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4 align-middle">
                        {p.dob ? (
                          <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            <Calendar className="w-3 h-3 text-purple-500" />
                            <span>{dobStr}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Eye className="w-2.5 h-2.5" />
                          <span>{p.accessPermission || 'VIEW'} ONLY</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center align-middle text-slate-500 font-mono text-[11px]">
                        {createdStr}
                      </td>

                      <td className="py-3 px-4 text-center align-middle">
                        {canManage ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                              title="Edit Channel Partner"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteErrorMsg('');
                                setDeleteConfirmPartner(p);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Delete Channel Partner"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No channel partners found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Channel Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Channel Partner
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register a new sourcing channel partner with default VIEW permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePartner} className="space-y-3.5 text-xs">
              {/* Mandatory Section */}
              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Mandatory Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Partner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Details Section */}
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Profile &amp; Firm Information (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Firm / Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prime Realty Solutions"
                      value={formData.firmName}
                      onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. partner@realty.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth (DOB)
                    </label>
                    <DatePickerInput
                      placeholder="DD/MM/YYYY"
                      value={formData.dob}
                      onChange={(val) => setFormData({ ...formData, dob: val })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={1950}
                      maxYear={2010}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Portal Password
                    </label>
                    <input
                      type="text"
                      placeholder="Default: NestGuru@123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Office / Business Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Office 402, Sector 62, Noida, UP"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                {/* Permissions Notice */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Default Access Permission:</span>
                      <span className="text-slate-500 block text-[11px]">This account is configured with VIEW-only permissions.</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    VIEW ONLY
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Creating Partner...' : 'Create Channel Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Channel Partner Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Channel Partner
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update profile, contact details, or credentials for @{editingPartner.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {editSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePartner} className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Mandatory Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Partner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Profile &amp; Firm Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Firm / Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prime Realty Solutions"
                      value={editFormData.firmName}
                      onChange={(e) => setEditFormData({ ...editFormData, firmName: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. partner@realty.com"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth (DOB)
                    </label>
                    <DatePickerInput
                      placeholder="DD/MM/YYYY"
                      value={editFormData.dob}
                      onChange={(val) => setEditFormData({ ...editFormData, dob: val })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                      minYear={1950}
                      maxYear={2010}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reset Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep existing password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Office / Business Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Office 402, Sector 62, Noida, UP"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                {/* Permissions Notice */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Access Permission:</span>
                      <span className="text-slate-500 block text-[11px]">Channel Partner Portal View Access</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    VIEW ONLY
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup Modal */}
      {deleteConfirmPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Channel Partner?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete this partner?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Partner Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{deleteConfirmPartner.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">@{deleteConfirmPartner.username}</span>
              </div>
              {deleteConfirmPartner.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Contact Number:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{deleteConfirmPartner.phone}</span>
                </div>
              )}
              {deleteConfirmPartner.jobRole && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Firm / Company:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{deleteConfirmPartner.jobRole}</span>
                </div>
              )}
            </div>

            {deleteErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="text-[11px] text-rose-600/90 dark:text-rose-400/90 bg-rose-50/50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
              ⚠️ <strong>Warning:</strong> This partner will be permanently deleted from the directory along with login access.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteConfirmPartner(null);
                  setDeleteErrorMsg('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeletePartner}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
