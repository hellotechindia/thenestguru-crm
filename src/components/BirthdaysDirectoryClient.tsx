'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Cake, 
  Sparkles, 
  Search, 
  Filter, 
  Calendar, 
  Copy, 
  Check, 
  Shuffle, 
  Send, 
  X, 
  Users, 
  Gift, 
  ArrowLeft,
  PartyPopper,
  MessageCircle,
  ExternalLink,
  Heart,
  Plus,
  Phone,
  Trash2,
  Building,
  UserCheck,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { BIRTHDAY_TEMPLATES, getCustomWish } from '@/lib/birthday-wishes';
import { isValid10DigitPhone, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';
import { createManualBirthdayAction, updateManualBirthdayAction, deleteManualBirthdayAction } from '@/app/actions';

export interface BirthdayItem {
  id: string;
  manualId?: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
  category: 'STAFF' | 'CLIENT' | 'CO_APPLICANT' | 'MANUAL';
  categoryLabel: string;
  teamName: string;
  association: string;
  remark?: string | null;
  dob: Date | string | null;
  isWithin30Days: boolean;
  isToday: boolean;
  daysRemaining: number;
  formattedBirthday: string;
  isManual?: boolean;
}

interface BirthdaysDirectoryClientProps {
  initialBirthdays: BirthdayItem[];
}

export default function BirthdaysDirectoryClient({ initialBirthdays }: BirthdaysDirectoryClientProps) {
  const router = useRouter();
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>(initialBirthdays);

  // Sync state if initialBirthdays changes via router.refresh()
  useEffect(() => {
    setBirthdays(initialBirthdays);
  }, [initialBirthdays]);

  const [searchTerm, setSearchTerm] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<'upcoming30' | 'today' | 'week' | 'all'>('upcoming30');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'STAFF' | 'CLIENT' | 'CO_APPLICANT' | 'MANUAL'>('ALL');
  
  // Wish Modal State
  const [selectedUser, setSelectedUser] = useState<BirthdayItem | null>(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Manual Birthday Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    dob: '',
    remark: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Manual Entry Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    phone: '',
    dob: '',
    remark: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Stats calculation
  const todayCount = useMemo(() => birthdays.filter((b) => b.isToday).length, [birthdays]);
  const weekCount = useMemo(() => birthdays.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= 7).length, [birthdays]);
  const upcoming30Count = useMemo(() => birthdays.filter((b) => b.isWithin30Days).length, [birthdays]);
  const totalCount = birthdays.length;

  const staffCount = useMemo(() => birthdays.filter((b) => b.category === 'STAFF').length, [birthdays]);
  const clientCount = useMemo(() => birthdays.filter((b) => b.category === 'CLIENT').length, [birthdays]);
  const coAppCount = useMemo(() => birthdays.filter((b) => b.category === 'CO_APPLICANT').length, [birthdays]);
  const manualCount = useMemo(() => birthdays.filter((b) => b.category === 'MANUAL').length, [birthdays]);

  // Filtered List
  const filteredList = useMemo(() => {
    return birthdays.filter((b) => {
      // Category filter
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) {
        return false;
      }

      // Timeline filter
      if (timelineFilter === 'today' && !b.isToday) return false;
      if (timelineFilter === 'week' && !(b.daysRemaining >= 0 && b.daysRemaining <= 7)) return false;
      if (timelineFilter === 'upcoming30' && !b.isWithin30Days) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          b.name.toLowerCase().includes(term) ||
          (b.username && b.username.toLowerCase().includes(term)) ||
          (b.phone && b.phone.includes(term)) ||
          (b.email && b.email.toLowerCase().includes(term)) ||
          (b.role && b.role.toLowerCase().includes(term)) ||
          (b.association && b.association.toLowerCase().includes(term)) ||
          (b.remark && b.remark.toLowerCase().includes(term)) ||
          b.categoryLabel.toLowerCase().includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [birthdays, searchTerm, timelineFilter, categoryFilter]);

  const handleOpenWishModal = (user: BirthdayItem) => {
    const randIdx = Math.floor(Math.random() * BIRTHDAY_TEMPLATES.length);
    setTemplateIndex(randIdx);
    setSelectedUser(user);
    setCopied(false);
  };

  const handleShuffle = () => {
    setTemplateIndex((prev) => (prev + 1) % BIRTHDAY_TEMPLATES.length);
    setCopied(false);
  };

  const currentTemplate = BIRTHDAY_TEMPLATES[templateIndex];
  const customMessage = selectedUser ? getCustomWish(currentTemplate.template, selectedUser.name) : '';

  const handleCopy = () => {
    if (!customMessage) return;
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!customMessage) return;
    const cleanPhone = selectedUser?.phone ? selectedUser.phone.replace(/[^0-9]/g, '') : '';
    const phoneParam = cleanPhone ? `phone=${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}&` : '';
    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
  };

  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.dob) {
      setAddError('Please enter both Name and Date of Birth.');
      return;
    }

    if (!isValidName(addForm.name)) {
      setAddError('Full Name must contain only alphabets and spaces (no numbers or special characters).');
      return;
    }

    if (addForm.phone && !isValid10DigitPhone(addForm.phone)) {
      setAddError('Phone number must be a valid 10-digit number.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const res = await createManualBirthdayAction(addForm);
      setIsAdding(false);
      if (res.success) {
        setIsAddModalOpen(false);
        setAddForm({ name: '', phone: '', dob: '', remark: '' });
        router.refresh();
      } else {
        setAddError(res.error || 'Failed to save birthday entry.');
      }
    } catch (err: any) {
      setIsAdding(false);
      setAddError(err.message || 'Error creating manual entry.');
    }
  };

  const handleDeleteManualEntry = async (item: BirthdayItem) => {
    if (!item.manualId) return;
    if (confirm(`Remove manual birthday entry for "${item.name}"?`)) {
      const res = await deleteManualBirthdayAction(item.manualId);
      if (res.success) {
        router.refresh();
      }
    }
  };

  const handleOpenEditModal = (item: BirthdayItem) => {
    if (!item.manualId) return;
    const rawDob = item.dob ? new Date(item.dob).toISOString().split('T')[0] : '';
    setEditForm({
      id: item.manualId,
      name: item.name,
      phone: item.phone || '',
      dob: rawDob,
      remark: item.remark === 'Direct Birthday Entry' ? '' : (item.remark || ''),
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.dob) {
      setEditError('Please enter both Name and Date of Birth.');
      return;
    }

    if (!isValidName(editForm.name)) {
      setEditError('Full Name must contain only alphabets and spaces (no numbers or special characters).');
      return;
    }

    if (editForm.phone && !isValid10DigitPhone(editForm.phone)) {
      setEditError('Phone number must be a valid 10-digit number.');
      return;
    }

    setIsEditing(true);
    setEditError('');

    try {
      const res = await updateManualBirthdayAction(editForm);
      setIsEditing(false);
      if (res.success) {
        setIsEditModalOpen(false);
        router.refresh();
      } else {
        setEditError(res.error || 'Failed to update birthday entry.');
      }
    } catch (err: any) {
      setIsEditing(false);
      setEditError(err.message || 'Error updating birthday entry.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center gap-1">
              <PartyPopper className="w-3 h-3 text-pink-500" /> Unified Celebrations Hub
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Staff • Loan Clients • Co-Applicants • Manual Entries
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            TheNestGuru Birthday Celebrations Directory
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Unified birthday tracking for clients, co-applicants, and staff with 1-click personalized wishes & manual entry
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAddError('');
              setAddForm({ name: '', phone: '', dob: '', remark: '' });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Birthday Entry</span>
          </button>

          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setTimelineFilter('today')}
          className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer ${
            timelineFilter === 'today'
              ? 'border-amber-400 bg-amber-500/10 shadow-lg scale-[1.02]'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Birthdays
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              todayCount > 0 ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {todayCount}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            {todayCount > 0 ? 'Active celebration today! 🎂' : 'No birthdays today'}
          </div>
        </div>

        <div 
          onClick={() => setTimelineFilter('week')}
          className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer ${
            timelineFilter === 'week'
              ? 'border-pink-500 bg-pink-500/10 shadow-lg scale-[1.02]'
              : 'border-slate-200 dark:border-slate-800 hover:border-pink-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              This Week (7 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {weekCount}
          </div>
          <div className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold mt-0.5">
            Next 7 days celebration list
          </div>
        </div>

        <div 
          onClick={() => setTimelineFilter('upcoming30')}
          className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer ${
            timelineFilter === 'upcoming30'
              ? 'border-purple-500 bg-purple-500/10 shadow-lg scale-[1.02]'
              : 'border-slate-200 dark:border-slate-800 hover:border-purple-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Upcoming (30 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {upcoming30Count}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
            Active 1-month window
          </div>
        </div>

        <div 
          onClick={() => setTimelineFilter('all')}
          className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer ${
            timelineFilter === 'all'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg scale-[1.02]'
              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Registered
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalCount}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            Across CRM Database
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        {/* Source / Category Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Source:</span>
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Sources ({totalCount})
            </button>
            <button
              onClick={() => setCategoryFilter('STAFF')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'STAFF'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              Staff & Teams ({staffCount})
            </button>
            <button
              onClick={() => setCategoryFilter('CLIENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'CLIENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              Loan Clients ({clientCount})
            </button>
            <button
              onClick={() => setCategoryFilter('CO_APPLICANT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'CO_APPLICANT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              Co-Applicants ({coAppCount})
            </button>
            <button
              onClick={() => setCategoryFilter('MANUAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === 'MANUAL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              Manual Entries ({manualCount})
            </button>
          </div>

          {/* Timeline filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setTimelineFilter('upcoming30')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineFilter === 'upcoming30'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Upcoming 30D ({upcoming30Count})
            </button>
            <button
              onClick={() => setTimelineFilter('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineFilter === 'today'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Today ({todayCount})
            </button>
            <button
              onClick={() => setTimelineFilter('week')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineFilter === 'week'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Week ({weekCount})
            </button>
            <button
              onClick={() => setTimelineFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                timelineFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Schedule ({totalCount})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Name, Phone, Email, Role, Category, Association, or Remark..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-9 pr-8 py-2 rounded-xl text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Birthday Table */}
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5 font-bold">Person / Contact</th>
                <th className="py-3.5 px-4 font-bold">Category & Association</th>
                <th className="py-3.5 px-4 font-bold">Birthday Date</th>
                <th className="py-3.5 px-4 font-bold">Countdown / Schedule</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                <th className="py-3.5 px-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Cake className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No birthdays found matching your filter.
                      </p>
                      <p className="text-xs text-slate-500">
                        Try clearing your search term, switching categories, or click "+ Add Birthday Entry".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                      item.isToday ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                    }`}
                  >
                    {/* Person Info */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                          item.isToday
                            ? 'bg-gradient-to-tr from-amber-500 to-pink-500 text-white shadow-amber-500/30 animate-pulse'
                            : item.category === 'CLIENT'
                            ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.category === 'CO_APPLICANT'
                            ? 'bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : item.category === 'MANUAL'
                            ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}>
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{item.name}</span>
                            {item.username && (
                              <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-medium">
                                @{item.username}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                            {item.phone && (
                              <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                                📱 {item.phone}
                              </span>
                            )}
                            {item.email && (
                              <span className="truncate max-w-[180px] text-slate-400">
                                ✉️ {item.email}
                              </span>
                            )}
                            {!item.phone && !item.email && (
                              <span className="text-[10px] text-slate-400 italic">No contact stored</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Association */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.category === 'CLIENT'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : item.category === 'CO_APPLICANT'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : item.category === 'MANUAL'
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          }`}>
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                          {item.association}
                        </div>
                        {item.remark && item.remark !== item.association && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                            {item.remark}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Birthday Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-white text-xs">
                        <Calendar className="w-3.5 h-3.5 text-pink-500" />
                        <span>{item.formattedBirthday}</span>
                      </div>
                      {item.dob && (
                        <div className="text-[10px] text-slate-400">
                          Birth Year: {new Date(item.dob).getFullYear()}
                        </div>
                      )}
                    </td>

                    {/* Days Remaining / Timeline */}
                    <td className="py-3.5 px-4">
                      {item.isToday ? (
                        <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                          <span>🎉 TODAY!</span>
                        </span>
                      ) : item.daysRemaining === 1 ? (
                        <span className="font-bold text-pink-600 dark:text-pink-400">
                          Tomorrow (In 1 day)
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          In {item.daysRemaining} days
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {item.isToday ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-sm shadow-amber-500/20">
                          TODAY 🎉
                        </span>
                      ) : item.daysRemaining <= 7 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30">
                          THIS WEEK
                        </span>
                      ) : item.isWithin30Days ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          NEXT 30 DAYS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          SCHEDULED
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenWishModal(item)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                            item.isToday
                              ? 'bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-amber-500/20 scale-105'
                              : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/20'
                          }`}
                          title={`Send celebratory wish to ${item.name}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Wish 🎉</span>
                        </button>

                        {item.isManual && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit manual entry"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteManualEntry(item)}
                              title="Delete manual entry"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen-Centered Birthday Wish Modal with WhatsApp & Copy */}
      {selectedUser && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setSelectedUser(null)}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-600 dark:text-pink-300 flex items-center justify-center shadow-sm">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Wish {selectedUser.name} <Sparkles className="w-4 h-4 text-amber-500" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Birthday: <span className="font-semibold text-pink-600 dark:text-pink-400">{selectedUser.formattedBirthday}</span> • {selectedUser.categoryLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Recipient Details Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 text-xs flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Association</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.association}</span>
                </div>
                {selectedUser.phone && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">WhatsApp / Phone</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">📱 {selectedUser.phone}</span>
                  </div>
                )}
              </div>

              {/* Tone Badge & Shuffle */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Template {templateIndex + 1} of {BIRTHDAY_TEMPLATES.length} • {currentTemplate.tone}
                </span>

                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle Message 🎲</span>
                </button>
              </div>

              {/* Message Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-sky-500/5 border border-pink-500/20 dark:border-pink-500/30 text-slate-800 dark:text-slate-100 text-sm leading-relaxed shadow-inner">
                {customMessage}
              </div>

              {/* Action Buttons: WhatsApp Share & Copy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopy}
                  className={`py-3 px-4 rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Wish Message</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    {selectedUser.phone ? 'Send via WhatsApp 💬' : 'Share on WhatsApp 💬'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manual Birthday Entry Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-indigo-500/15 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-sm">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Add Birthday Entry
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add client, partner, or friend for automated celebrations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualEntry} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: sanitizeToAlphabetsOnly(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone / WhatsApp Number (10 Digits)
                  </label>
                  <span className={`text-[10px] font-mono ${addForm.phone.length === 10 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                    {addForm.phone.length}/10
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: sanitizeTo10Digits(e.target.value) })}
                    className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-wider"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Used for 1-click direct WhatsApp birthday wishes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth (DOB) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={addForm.dob}
                    onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                    className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Remark / Association <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Key Channel Partner, Direct Client, Friend"
                  value={addForm.remark}
                  onChange={(e) => setAddForm({ ...addForm, remark: e.target.value })}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isAdding ? 'Saving...' : 'Save Birthday Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Manual Birthday Entry Modal */}
      {isEditModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-sm">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Edit Birthday Entry
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update birthday details for this contact
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateManualEntry} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: sanitizeToAlphabetsOnly(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone / WhatsApp Number (10 Digits)
                  </label>
                  <span className={`text-[10px] font-mono ${editForm.phone.length === 10 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                    {editForm.phone.length}/10
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: sanitizeTo10Digits(e.target.value) })}
                    className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-wider"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Used for 1-click direct WhatsApp birthday wishes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth (DOB) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full glass-input pl-9 pr-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Remark / Association <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Key Channel Partner, Direct Client, Friend"
                  value={editForm.remark}
                  onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isEditing ? 'Updating...' : 'Update Birthday Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
