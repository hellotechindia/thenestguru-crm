'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Building2, UserPlus, Users, ExternalLink, CheckCircle2, ArrowLeft } from 'lucide-react';
import { createBuilderAction } from '@/app/actions';

export interface DirectoryClientOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface BuilderOption {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  reraNumber?: string | null;
  approvedBanks?: string | null;
  officeAddress?: string | null;
  designation?: string | null;
}

export interface ChannelPartnerOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface SearchableBuilderCpSelectProps {
  selectedType: 'BUILDER' | 'CP' | 'CLIENT' | '';
  selectedName: string;
  builders: BuilderOption[];
  channelPartners: ChannelPartnerOption[];
  clients?: DirectoryClientOption[];
  onSelectBuilder: (builderName: string, builder?: BuilderOption) => void;
  onSelectCP: (cp: ChannelPartnerOption) => void;
  onSelectClient?: (client: DirectoryClientOption) => void;
  onClear: () => void;
  onBuilderCreated?: (builder: BuilderOption) => void;
  onClientCreated?: (client: DirectoryClientOption) => void;
}

export default function SearchableBuilderCpSelect({
  selectedType,
  selectedName,
  builders = [],
  channelPartners = [],
  clients = [],
  onSelectBuilder,
  onSelectCP,
  onSelectClient,
  onClear,
  onBuilderCreated,
  onClientCreated,
}: SearchableBuilderCpSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal for "+ Add (Builder / CP / Client)"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState<'CHOOSE' | 'BUILDER' | 'CLIENT'>('CHOOSE');

  // Builder creation form
  const [builderForm, setBuilderForm] = useState({
    name: '',
    contactPerson: '',
    designation: '',
    phone: '',
    approvedBanks: '',
    reraNumber: '',
    officeAddress: '',
  });
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderError, setBuilderError] = useState('');

  // Quick Client creation form
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    city: '',
    email: '',
  });
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const cleanQuery = query.trim().toLowerCase();

  const filteredBuilders = useMemo(() => {
    if (!cleanQuery) return builders;
    return builders.filter((b) => {
      return (
        b.name.toLowerCase().includes(cleanQuery) ||
        (b.reraNumber && b.reraNumber.toLowerCase().includes(cleanQuery)) ||
        (b.contactPerson && b.contactPerson.toLowerCase().includes(cleanQuery)) ||
        (b.phone && b.phone.includes(cleanQuery))
      );
    });
  }, [builders, cleanQuery]);

  const filteredCPs = useMemo(() => {
    if (!cleanQuery) return channelPartners;
    return channelPartners.filter((cp) => {
      return (
        (cp.name && cp.name.toLowerCase().includes(cleanQuery)) ||
        (cp.phone && cp.phone.includes(cleanQuery)) ||
        (cp.address && cp.address.toLowerCase().includes(cleanQuery))
      );
    });
  }, [channelPartners, cleanQuery]);

  const filteredClients = useMemo(() => {
    if (!cleanQuery) return clients;
    return clients.filter((c) => {
      return (
        (c.name && c.name.toLowerCase().includes(cleanQuery)) ||
        (c.phone && c.phone.includes(cleanQuery)) ||
        (c.city && c.city.toLowerCase().includes(cleanQuery)) ||
        (c.state && c.state.toLowerCase().includes(cleanQuery)) ||
        (c.email && c.email.toLowerCase().includes(cleanQuery))
      );
    });
  }, [clients, cleanQuery]);

  const totalResults = filteredBuilders.length + filteredCPs.length + filteredClients.length;

  const handleOpenAddModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setAddStep('CHOOSE');
    setBuilderError('');
    setClientError('');
    setIsAddModalOpen(true);
  };

  const handleCreateBuilderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderForm.name.trim()) {
      setBuilderError('Builder Name is required.');
      return;
    }
    setBuilderLoading(true);
    setBuilderError('');
    try {
      const res = await createBuilderAction(builderForm);
      if (res.success && res.builder) {
        onBuilderCreated?.(res.builder as any);
        onSelectBuilder(res.builder.name, res.builder as any);
        setIsAddModalOpen(false);
        setBuilderForm({
          name: '',
          contactPerson: '',
          designation: '',
          phone: '',
          approvedBanks: '',
          reraNumber: '',
          officeAddress: '',
        });
      } else {
        setBuilderError(res.error || 'Failed to create builder.');
      }
    } catch (err: any) {
      setBuilderError(err.message || 'Something went wrong.');
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      setClientError('Client Full Name is required.');
      return;
    }
    const cleanPhone = clientForm.phone.replace(/\D/g, '').slice(-10);
    const newClient: DirectoryClientOption = {
      id: `quick_${Date.now()}`,
      name: clientForm.name.trim(),
      phone: cleanPhone || null,
      city: clientForm.city.trim() || null,
      email: clientForm.email.trim() || null,
    };
    onClientCreated?.(newClient);
    onSelectClient?.(newClient);
    setIsAddModalOpen(false);
    setClientForm({ name: '', phone: '', city: '', email: '' });
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : 'z-20'}`}>
      <div ref={dropdownRef} className="relative w-full">
        {/* Trigger Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full glass-input px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer border transition-all ${
            isOpen
              ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white dark:bg-slate-900'
              : 'bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            {selectedType === 'BUILDER' && selectedName ? (
              <span className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400 truncate">
                <span>🏢</span>
                <span className="truncate">{selectedName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                  Builder
                </span>
              </span>
            ) : selectedType === 'CP' && selectedName ? (
              <span className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 truncate">
                <span>🤝</span>
                <span className="truncate">{selectedName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                  Channel Partner
                </span>
              </span>
            ) : selectedType === 'CLIENT' && selectedName ? (
              <span className="flex items-center gap-1.5 font-bold text-violet-600 dark:text-violet-400 truncate">
                <span>👤</span>
                <span className="truncate">{selectedName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shrink-0">
                  Client
                </span>
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  -- Select Builder / CP / Client ({builders.length + channelPartners.length + clients.length} options) --
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Quick Add Button directly in trigger */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition flex items-center gap-1"
              title="Add new Builder, Channel Partner or Client"
            >
              <span>+ Add</span>
            </button>

            {selectedName && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-[100] w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Instant Search Bar */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Search ${builders.length + channelPartners.length + clients.length} Builders, CPs & Clients...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
                <span>{totalResults} matches found</span>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  + Add New Entry
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              {totalResults === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <p>No entry matching &ldquo;{query}&rdquo;</p>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                  >
                    + Add New (Builder / CP / Client)
                  </button>
                </div>
              ) : (
                <>
                  {/* Builders Group */}
                  {filteredBuilders.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/40 rounded-lg flex items-center justify-between my-1">
                        <span>🏢 Builders ({filteredBuilders.length})</span>
                      </div>
                      {filteredBuilders.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            onSelectBuilder(b.name, b);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`px-3 py-2 rounded-xl text-xs cursor-pointer transition flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-950/40 ${
                            selectedType === 'BUILDER' && selectedName === b.name
                              ? 'bg-sky-500/10 font-bold text-sky-600 dark:text-sky-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <span>🏢 {b.name}</span>
                              {b.reraNumber && (
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                                  RERA: {b.reraNumber}
                                </span>
                              )}
                            </div>
                            {(b.contactPerson || b.phone) && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {b.contactPerson ? `${b.contactPerson} ` : ''}
                                {b.phone ? `• 📞 ${b.phone}` : ''}
                              </div>
                            )}
                          </div>
                          {selectedType === 'BUILDER' && selectedName === b.name && (
                            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Channel Partners Group */}
                  {filteredCPs.length > 0 && (
                    <div className="pt-1">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/40 rounded-lg flex items-center justify-between my-1">
                        <span>🤝 Channel Partners ({filteredCPs.length})</span>
                      </div>
                      {filteredCPs.map((cp) => (
                        <div
                          key={cp.id}
                          onClick={() => {
                            onSelectCP(cp);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`px-3 py-2 rounded-xl text-xs cursor-pointer transition flex items-center justify-between hover:bg-teal-50 dark:hover:bg-teal-950/40 ${
                            selectedType === 'CP' && (selectedName === cp.name || selectedName === cp.id)
                              ? 'bg-teal-500/10 font-bold text-teal-600 dark:text-teal-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <span>🤝 {cp.name || 'Unnamed CP'}</span>
                            </div>
                            {(cp.phone || cp.address) && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {cp.phone ? `📞 ${cp.phone} ` : ''}
                                {cp.address ? `• 📍 ${cp.address}` : ''}
                              </div>
                            )}
                          </div>
                          {selectedType === 'CP' && (selectedName === cp.name || selectedName === cp.id) && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clients from Directory Group */}
                  {filteredClients.length > 0 && (
                    <div className="pt-1">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50/70 dark:bg-violet-950/40 rounded-lg flex items-center justify-between my-1">
                        <span>👤 Clients from Directory ({filteredClients.length})</span>
                      </div>
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            onSelectClient?.(c);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`px-3 py-2 rounded-xl text-xs cursor-pointer transition flex items-center justify-between hover:bg-violet-50 dark:hover:bg-violet-950/40 ${
                            selectedType === 'CLIENT' && selectedName === c.name
                              ? 'bg-violet-500/10 font-bold text-violet-600 dark:text-violet-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <span>👤 {c.name}</span>
                            </div>
                            {(c.phone || c.city) && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {c.phone ? `📞 ${c.phone} ` : ''}
                                {(c.city || c.state) ? `• 📍 ${[c.city, c.state].filter(Boolean).join(', ')}` : ''}
                              </div>
                            )}
                          </div>
                          {selectedType === 'CLIENT' && selectedName === c.name && (
                            <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Modal to prompt: Builder vs Channel Partner vs Client */}
      {mounted && isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {addStep !== 'CHOOSE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddStep('CHOOSE');
                      setBuilderError('');
                      setClientError('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {addStep === 'CHOOSE' && 'Add New Contact or Organization'}
                  {addStep === 'BUILDER' && 'Add New Builder / Developer'}
                  {addStep === 'CLIENT' && 'Add / Link Client for Visit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: CHOOSE (Builder vs Channel Partner vs Client) */}
            {addStep === 'CHOOSE' && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select what type of entry you want to add:
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Option 1: Builder */}
                  <div
                    onClick={() => setAddStep('BUILDER')}
                    className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/20 hover:border-sky-400 hover:bg-sky-50 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                          🏢 Builder / Developer
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Add a real estate builder name, RERA details, approved banks & contacts.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Add &rarr;</span>
                  </div>

                  {/* Option 2: Channel Partner */}
                  <div
                    onClick={() => {
                      window.open('/admin/users', '_blank');
                      setIsAddModalOpen(false);
                    }}
                    className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/50 dark:bg-teal-950/20 hover:border-teal-400 hover:bg-teal-50 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition flex items-center gap-1.5">
                          <span>🤝 Channel Partner</span>
                          <ExternalLink className="w-3.5 h-3.5 text-teal-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Opens Channel Partner staff directory to register or manage CP accounts.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Open Page &rarr;</span>
                  </div>

                  {/* Option 3: Client */}
                  <div
                    onClick={() => setAddStep('CLIENT')}
                    className="p-4 rounded-xl border border-violet-200 dark:border-violet-800/80 bg-violet-50/50 dark:bg-violet-950/20 hover:border-violet-400 hover:bg-violet-50 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                          👤 Client (Applicant)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Quick add client name & phone number to link directly with this visit.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">Add &rarr;</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: BUILDER FORM */}
            {addStep === 'BUILDER' && (
              <form onSubmit={handleCreateBuilderSubmit} className="space-y-3 py-1">
                {builderError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {builderError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Builder / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Godrej Properties, DLF Limited"
                    value={builderForm.name}
                    onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Head / Manager"
                      value={builderForm.contactPerson}
                      onChange={(e) => setBuilderForm({ ...builderForm, contactPerson: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 011-45678900"
                      value={builderForm.phone}
                      onChange={(e) => setBuilderForm({ ...builderForm, phone: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Approved Banks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBI, HDFC, ICICI, Axis Bank"
                    value={builderForm.approvedBanks}
                    onChange={(e) => setBuilderForm({ ...builderForm, approvedBanks: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RERA Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPRERAPRJ12345"
                      value={builderForm.reraNumber}
                      onChange={(e) => setBuilderForm({ ...builderForm, reraNumber: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Office Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sector 62, Noida"
                      value={builderForm.officeAddress}
                      onChange={(e) => setBuilderForm({ ...builderForm, officeAddress: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddStep('CHOOSE')}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={builderLoading}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {builderLoading ? 'Saving...' : 'Save & Select Builder'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: QUICK CLIENT FORM */}
            {addStep === 'CLIENT' && (
              <form onSubmit={handleCreateClientSubmit} className="space-y-3 py-1">
                {clientError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {clientError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number (10 Digits)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gurugram, Haryana"
                      value={clientForm.city}
                      onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddStep('CHOOSE')}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Select Client for Visit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
