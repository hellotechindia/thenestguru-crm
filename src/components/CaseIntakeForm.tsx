'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCaseAction } from '@/app/actions';
import {
  User, Phone, Mail, MapPin, Layers, Users, ArrowRight, Sparkles,
  UserCheck, Building2, Calendar, ShieldAlert, CheckCircle2, Save, Plus
} from 'lucide-react';
import { isValid10DigitPhone, isValidEmail, sanitizeTo10Digits, isValidName, sanitizeToAlphabetsOnly } from '@/lib/validations';
import { INDIAN_STATES, getCitiesForIndianState } from '@/lib/india-data';
import DatePickerInput from '@/components/DatePickerInput';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';

export interface CoApplicantEntry {
  name: string;
  relationship: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  state: string;
  city: string;
  customerType: string;
  customerTypes?: string[];
  incomeTypes: string[];
  incomeRequired: boolean;
}

interface Props {
  teams: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string; cities?: Array<{ id: string; name: string }> }>;
  users: Array<{ id: string; name: string; role: string; email?: string | null; username?: string | null }>;
  products?: Array<{ id: string; name: string; subProducts?: Array<{ id: string; name: string }> }>;
  profiles?: Array<{ id: string; name: string }>;
  subProducts?: Array<{ id: string; name: string; productId: string }>;
  propertyScopes?: Array<{ id: string; name: string }>;
  targetCategories?: Array<{ id: string; name: string }>;
  isSuperAdmin?: boolean;
  currentUser?: { name: string; role: string };
}

export default function CaseIntakeForm({
  teams,
  states,
  users,
  products = [],
  profiles = [],
  subProducts = [],
  propertyScopes = [],
  targetCategories = [],
  isSuperAdmin = false,
  currentUser,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Fallback defaults
  const defaultProduct = products[0]?.name || 'Home Loan';
  const defaultCustomerType = targetCategories[0]?.name || 'Individual';
  const defaultPropertyScope = propertyScopes[0]?.name || 'Resale';

  const defaultState = states[0]?.name || 'Uttar Pradesh';

  const [formData, setFormData] = useState({
    product: defaultProduct,
    subProduct: '',
    clientName: '',
    mobile: '',
    email: '',
    gender: 'MALE',
    clientDob: '',
    clientState: defaultState,
    clientCity: '',
    customerType: defaultCustomerType,
    customerTypes: defaultCustomerType ? [defaultCustomerType] : [] as string[],
    incomeTypes: [] as string[],
    propertyType: defaultPropertyScope,
    propertyState: defaultState,
    propertyCity: '',
    coApplicantCount: 0,
    channelUserId: '',
    channelUserIds: [] as string[],
    salesUserId: '',
    salesUserIds: [] as string[],
    operationUserId: '',
    operationUserIds: [] as string[],
    assignedTeamId: teams[0]?.id || '',
  });

  // Filter Sub-Products based on selected product
  const selectedProductObj = products.find(p => p.name.toLowerCase() === formData.product.toLowerCase());
  const filteredSubProducts = subProducts.filter(sp => {
    if (!selectedProductObj) return false;
    return sp.productId === selectedProductObj.id;
  });

  const selectedStateObj = states.find((s) => s.name?.toLowerCase() === formData.clientState?.toLowerCase());
  const clientDbCities = selectedStateObj?.cities?.map((c) => c.name) || [];
  const stateCities = Array.from(new Set([...clientDbCities, ...getCitiesForIndianState(formData.clientState)]));

  const selectedPropStateObj = states.find((s) => s.name?.toLowerCase() === formData.propertyState?.toLowerCase());
  const propDbCities = selectedPropStateObj?.cities?.map((c) => c.name) || [];
  const propStateCities = Array.from(new Set([...propDbCities, ...getCitiesForIndianState(formData.propertyState)]));

  const [activeCoAppTab, setActiveCoAppTab] = useState<number>(0);
  const [coApplicants, setCoApplicants] = useState<CoApplicantEntry[]>([]);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('nestguru_case_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.formData && (parsed.formData.clientName || parsed.formData.mobile)) {
          const restoredCustomerTypes = Array.isArray(parsed.formData.customerTypes)
            ? parsed.formData.customerTypes
            : (parsed.formData.customerType ? parsed.formData.customerType.split(',').map((s: string) => s.trim()).filter(Boolean) : [defaultCustomerType]);
          const restoredChannelIds = Array.isArray(parsed.formData.channelUserIds)
            ? parsed.formData.channelUserIds
            : (parsed.formData.channelUserId ? parsed.formData.channelUserId.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
          const restoredSalesIds = Array.isArray(parsed.formData.salesUserIds)
            ? parsed.formData.salesUserIds
            : (parsed.formData.salesUserId ? parsed.formData.salesUserId.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
          const restoredOpIds = Array.isArray(parsed.formData.operationUserIds)
            ? parsed.formData.operationUserIds
            : (parsed.formData.operationUserId ? parsed.formData.operationUserId.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

          setFormData({
            ...parsed.formData,
            customerTypes: restoredCustomerTypes,
            customerType: restoredCustomerTypes.join(', '),
            channelUserIds: restoredChannelIds,
            channelUserId: restoredChannelIds.join(','),
            salesUserIds: restoredSalesIds,
            salesUserId: restoredSalesIds.join(','),
            operationUserIds: restoredOpIds,
            operationUserId: restoredOpIds.join(','),
            incomeTypes: Array.isArray(parsed.formData.incomeTypes)
              ? parsed.formData.incomeTypes
              : [],
          });
          if (parsed.coApplicants) setCoApplicants(parsed.coApplicants);
          setDraftSavedTime('Draft restored');
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, []);

  // Save changes to draft
  useEffect(() => {
    if (formData.clientName || formData.mobile || formData.email) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem('nestguru_case_draft', JSON.stringify({ formData, coApplicants }));
          setDraftSavedTime('Auto-saved just now');
        } catch (e) {
          console.error('Failed to save draft:', e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, coApplicants]);

  // Prevent accidental Back / Unload navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.clientName || formData.mobile) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in lead creation. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  const handleCustomerTypeToggle = (cType: string) => {
    setFormData((prev) => {
      const current = prev.customerTypes || (prev.customerType ? prev.customerType.split(',').map((s) => s.trim()).filter(Boolean) : []);
      const exists = current.includes(cType);
      const updated = exists ? current.filter((t) => t !== cType) : [...current, cType];
      return {
        ...prev,
        customerTypes: updated,
        customerType: updated.join(', '),
      };
    });
  };

  const handleIncomeTypeToggle = (type: string) => {
    setFormData(prev => {
      const current = prev.incomeTypes || [];
      if (current.includes(type)) {
        return { ...prev, incomeTypes: current.filter(t => t !== type) };
      } else {
        return { ...prev, incomeTypes: [...current, type] };
      }
    });
  };

  const handleCoApplicantCustomerTypeToggle = (index: number, cType: string) => {
    const updated = [...coApplicants];
    const co = updated[index];
    if (!co) return;
    const currentTypes = co.customerTypes || (co.customerType ? co.customerType.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const exists = currentTypes.includes(cType);
    const newTypes = exists ? currentTypes.filter((t: string) => t !== cType) : [...currentTypes, cType];
    updated[index] = {
      ...co,
      customerTypes: newTypes,
      customerType: newTypes.join(', '),
    };
    setCoApplicants(updated);
  };

  const handleCoApplicantCountChange = (count: number) => {
    const newCount = Math.max(0, count);
    setFormData(prev => ({ ...prev, coApplicantCount: newCount }));

    setCoApplicants(prev => {
      const updated = [...prev];
      if (newCount > updated.length) {
        for (let i = updated.length; i < newCount; i++) {
          updated.push({
            name: '',
            relationship: i === 0 ? 'Spouse' : 'Brother',
            mobile: '',
            email: '',
            gender: 'MALE',
            dob: '',
            state: formData.clientState || (states[0]?.name || ''),
            city: '',
            customerType: defaultCustomerType,
            customerTypes: defaultCustomerType ? [defaultCustomerType] : [],
            incomeTypes: [],
            incomeRequired: false,
          });
        }
      } else {
        updated.splice(newCount);
      }
      return updated;
    });

    if (activeCoAppTab >= newCount && newCount > 0) {
      setActiveCoAppTab(newCount - 1);
    }
  };

  const handleCoApplicantChange = (index: number, field: keyof CoApplicantEntry, value: any) => {
    const updated = [...coApplicants];
    updated[index] = { ...updated[index], [field]: value };
    setCoApplicants(updated);
  };

  const handleCoApplicantIncomeToggle = (index: number, incomeType: string) => {
    const updated = [...coApplicants];
    const co = updated[index];
    const current = co.incomeTypes || [];
    let nextIncomeTypes: string[];

    if (current.includes(incomeType)) {
      nextIncomeTypes = current.filter((t) => t !== incomeType);
    } else {
      if (incomeType.toLowerCase().includes('housewife')) {
        nextIncomeTypes = ['Housewife'];
      } else {
        nextIncomeTypes = [...current.filter((t) => !t.toLowerCase().includes('housewife')), incomeType];
      }
    }

    const isHousewife = nextIncomeTypes.some((t) => t.toLowerCase().includes('housewife'));
    const hasEarningIncome = nextIncomeTypes.length > 0 && !isHousewife;

    updated[index] = {
      ...co,
      incomeTypes: nextIncomeTypes,
      incomeRequired: hasEarningIncome,
    };
    setCoApplicants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict Name, Phone & Email Validations
    if (!isValidName(formData.clientName)) {
      setError('Client Full Name must contain only alphabetic characters and spaces.');
      return;
    }
    if (!isValid10DigitPhone(formData.mobile)) {
      setError('Client mobile number must be exactly 10 digits.');
      return;
    }
    if (formData.email && !isValidEmail(formData.email)) {
      setError('Please enter a valid client email address.');
      return;
    }

    // Validate Co-Applicants
    for (let i = 0; i < coApplicants.length; i++) {
      const co = coApplicants[i];
      if (!co.name || !isValidName(co.name)) {
        setError(`Co-Applicant ${i + 1} Name must contain only alphabetic characters and spaces.`);
        return;
      }
      if (co.mobile && !isValid10DigitPhone(co.mobile)) {
        setError(`Co-Applicant ${i + 1} Mobile number must be exactly 10 digits.`);
        return;
      }
      if (co.email && !isValidEmail(co.email)) {
        setError(`Co-Applicant ${i + 1} Email is invalid.`);
        return;
      }
    }

    // Validate Customer Types & Income
    const selectedCustomerTypes = formData.customerTypes || (formData.customerType ? formData.customerType.split(',').map((s) => s.trim()).filter(Boolean) : []);
    if (selectedCustomerTypes.length === 0) {
      setError('Please select at least one Customer Type / Entity.');
      return;
    }

    if (!formData.incomeTypes || formData.incomeTypes.length === 0) {
      setError('Please select at least one Income Profile.');
      return;
    }

    setLoading(true);

    try {
      const sanitizedCoApplicants = coApplicants.map((co) => ({
        ...co,
        customerType: co.customerTypes && co.customerTypes.length > 0 ? co.customerTypes.join(', ') : co.customerType,
      }));

      const res = await createCaseAction({
        clientName: formData.clientName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email ? formData.email.trim() : undefined,
        gender: formData.gender,
        clientState: formData.clientState,
        clientCity: formData.clientCity || undefined,
        clientDob: formData.clientDob || null,
        product: formData.product,
        subProduct: formData.subProduct || undefined,
        customerType: selectedCustomerTypes.join(', '),
        propertyType: formData.propertyType,
        propertyState: formData.propertyState || undefined,
        propertyCity: formData.propertyCity ? formData.propertyCity.trim() : undefined,
        incomeTypes: formData.incomeTypes,
        coApplicantCount: formData.coApplicantCount,
        coApplicantsData: sanitizedCoApplicants,
        channelUserId: (formData.channelUserIds?.length ? formData.channelUserIds.join(',') : formData.channelUserId) || undefined,
        salesUserId: (formData.salesUserIds?.length ? formData.salesUserIds.join(',') : formData.salesUserId) || undefined,
        operationUserId: (formData.operationUserIds?.length ? formData.operationUserIds.join(',') : formData.operationUserId) || undefined,
        assignedTeamId: formData.assignedTeamId || undefined,
      });

      if (res?.success && res.caseId) {
        localStorage.removeItem('nestguru_case_draft');
        router.push(`/cases/${res.caseId}`);
      } else {
        setError('Failed to create case intake. Please verify your inputs.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error occurred while creating case.');
    } finally {
      setLoading(false);
    }
  };

  const channelUsers = users.filter((u) => u.role === 'CHANNEL');
  const salesUsers = users.filter((u) => u.role === 'SALES');
  const operationUsers = users.filter((u) => u.role === 'OPERATION' || u.role === 'TEAM_MEMBER');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draftSavedTime && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {draftSavedTime}
          </span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('nestguru_case_draft');
              setDraftSavedTime(null);
            }}
            className="hover:underline opacity-80"
          >
            Clear Draft
          </button>
        </div>
      )}

      {/* Case Originator / Creator Attribution Banner */}
      {currentUser && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Case File Intake By:</span>
            <strong className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</strong>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            This account will be permanently recorded as the Creator / Originator of this loan case.
          </span>
        </div>
      )}

      {/* SECTION 1: LOAN & SUB-PRODUCT (Top First Dropdown as requested) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            1. Loan Product & Sub-Product
          </h2>
          <span className="ml-auto text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
            Mandatory First Step
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Loan Product *
            </label>
            <select
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value, subProduct: '' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Sub Product (If Applicable)
            </label>
            <select
              value={formData.subProduct}
              onChange={(e) => setFormData({ ...formData, subProduct: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="">-- Standard / No Sub-Product --</option>
              {filteredSubProducts.map((sp) => (
                <option key={sp.id} value={sp.name}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: APPLICANT DETAILS & PROFILE */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            2. Applicant Profile & KYC Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Applicant Full Name (Alphabets Only) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: sanitizeToAlphabetsOnly(e.target.value) })}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Mobile Number (10 Digits) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: sanitizeTo10Digits(e.target.value) })}
                placeholder="9876543210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rahul.sharma@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Client Sex / Gender *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Date of Birth (Birthday - DD/MM/YYYY)
            </label>
            <DatePickerInput
              value={formData.clientDob}
              onChange={(iso) => setFormData({ ...formData, clientDob: iso })}
              placeholder="DD/MM/YYYY"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Client State *
            </label>
            <select
              value={formData.clientState}
              onChange={(e) => setFormData({ ...formData, clientState: e.target.value, clientCity: '' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Client City
            </label>
            <input
              type="text"
              list="clientCityList"
              value={formData.clientCity}
              onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
              placeholder="e.g. Mumbai, Bengaluru, Noida..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <datalist id="clientCityList">
              {stateCities.map((cityName) => (
                <option key={cityName} value={cityName} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Multi-Customer Type / Entity Checkboxes */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Customer Type / Entity (Select Multiple if Applicable) *
            </label>
            {isSuperAdmin && (
              <a
                href="/admin/customer-types"
                target="_blank"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                title="Manage dynamic customer type options in Master settings"
              >
                + Manage Customer Types
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from(new Map(targetCategories.map((tc) => [tc.name, tc])).values()).map((tc) => {
              const checked = (formData.customerTypes || []).includes(tc.name);
              return (
                <label
                  key={tc.id || tc.name}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    checked
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCustomerTypeToggle(tc.name)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="truncate">{tc.name}</span>
                </label>
              );
            })}
          </div>
          {(!formData.customerTypes || formData.customerTypes.length === 0) && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              ⚠️ Please select at least one customer type / entity.
            </p>
          )}
        </div>

        {/* Multi-Income Types Checkboxes (Dynamic from Profile Master) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Income Profile (Select Multiple if Applicable) *
            </label>
            {isSuperAdmin && (
              <a
                href="/admin/profiles"
                target="_blank"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                title="Manage dynamic income profile options in Master settings"
              >
                + Manage Dynamic Profiles
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {((profiles && profiles.length > 0)
              ? profiles.map((p) => p.name)
              : ['Salaried', 'Self Employed Professional', 'Business / Non-Professional', 'Rental Income']
            ).map((inc) => {
              const checked = (formData.incomeTypes || []).includes(inc);
              return (
                <label
                  key={inc}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    checked
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleIncomeTypeToggle(inc)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>{inc}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: PROPERTY DETAILS & SCOPE */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            3. Property Type & Location Scope
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Property Scope *
            </label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              {propertyScopes.map((ps) => (
                <option key={ps.id} value={ps.name}>
                  {ps.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Property State *
            </label>
            <select
              value={formData.propertyState}
              onChange={(e) => setFormData({ ...formData, propertyState: e.target.value, propertyCity: '' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="">-- Select Property State --</option>
              {INDIAN_STATES.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Property City
            </label>
            <input
              type="text"
              list="propertyCityList"
              value={formData.propertyCity}
              onChange={(e) => setFormData({ ...formData, propertyCity: e.target.value })}
              placeholder="e.g. Noida, Gurugram, Mumbai..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <datalist id="propertyCityList">
              {propStateCities.map((cityName) => (
                <option key={cityName} value={cityName} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* SECTION 4: CO-APPLICANTS (COMPREHENSIVE ALL-FIELDS PROCESS) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                4. Co-Applicants Information
                {coApplicants.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                    {coApplicants.length} Added
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Capture complete contact, KYC, relation & income profiles for all co-borrowers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleCoApplicantCountChange(coApplicants.length + 1);
                setActiveCoAppTab(coApplicants.length);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Co-Applicant</span>
            </button>
          </div>
        </div>

        {coApplicants.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Sole Applicant File (No Co-Applicants Added)
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              If the client has co-borrowers or family members contributing to income, click &quot;Add Co-Applicant&quot; above.
            </p>
            <button
              type="button"
              onClick={() => {
                handleCoApplicantCountChange(1);
                setActiveCoAppTab(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Co-Applicant 1
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs for Co-Applicants */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
              {coApplicants.map((co, idx) => {
                const isActive = activeCoAppTab === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center rounded-xl border text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveCoAppTab(idx)}
                      className="px-3.5 py-2 flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{co.name || `Co-Applicant #${idx + 1}`}</span>
                      {co.relationship && (
                        <span className="text-[10px] font-normal opacity-80">
                          ({co.relationship})
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      title="Remove this Co-Applicant"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove Co-Applicant #${idx + 1} (${co.name || 'Co-Applicant'})?`)) {
                          const updated = coApplicants.filter((_, i) => i !== idx);
                          setCoApplicants(updated);
                          setFormData((prev) => ({ ...prev, coApplicantCount: updated.length }));
                          if (activeCoAppTab >= updated.length) {
                            setActiveCoAppTab(Math.max(0, updated.length - 1));
                          }
                        }
                      }}
                      className="px-2 py-2 hover:text-rose-400 opacity-70 hover:opacity-100 border-l border-white/20 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  handleCoApplicantCountChange(coApplicants.length + 1);
                  setActiveCoAppTab(coApplicants.length);
                }}
                className="px-3 py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-bold shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Another
              </button>
            </div>

            {/* Active Co-Applicant Form Details */}
            {(() => {
              const activeIdx = Math.min(activeCoAppTab, coApplicants.length - 1);
              const activeCo = coApplicants[activeIdx];
              if (!activeCo) return null;

              const activeCoState = activeCo.state || formData.clientState;
              const coDbCities = states.find((s) => s.name?.toLowerCase() === activeCoState?.toLowerCase())?.cities?.map((c) => c.name) || [];
              const coStateCities = Array.from(new Set([...coDbCities, ...getCitiesForIndianState(activeCoState)]));
              const coCityListId = `coCityList_${activeIdx}`;

              const availableIncomeProfiles = (profiles && profiles.length > 0)
                ? profiles.map((p) => p.name)
                : ['Salaried', 'Self Employed Professional', 'Business / Non-Professional', 'Rental Income'];

              return (
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  {/* Top Bar for Active Co-Applicant */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Co-Applicant #{activeIdx + 1} Profile & Details
                      </span>
                      {activeCo.name && (
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          — {activeCo.name}
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={activeCo.incomeRequired}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'incomeRequired', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span>Income Required for Loan Eligibility</span>
                    </label>
                  </div>

                  {/* Section A: Personal & Contact (Equivalent to Applicant) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={activeCo.name}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'name', sanitizeToAlphabetsOnly(e.target.value))}
                        placeholder="e.g. Ramesh Sharma"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Relationship with Applicant *
                      </label>
                      <select
                        value={activeCo.relationship || 'Spouse'}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'relationship', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                      >
                        <option value="Spouse">Spouse (Pati / Patni)</option>
                        <option value="Father">Father (Pita)</option>
                        <option value="Mother">Mother (Mata)</option>
                        <option value="Brother">Brother (Bhai)</option>
                        <option value="Sister">Sister (Behen)</option>
                        <option value="Son">Son (Beta)</option>
                        <option value="Daughter">Daughter (Beti)</option>
                        <option value="Business Partner">Business Partner</option>
                        <option value="Director">Company Director</option>
                        <option value="Other">Other Guarantor / Relative</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Mobile Number * (10 Digits)
                        </label>
                        <span className={`text-[10px] font-mono font-bold ${activeCo.mobile.length === 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {activeCo.mobile.length}/10
                        </span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={activeCo.mobile}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'mobile', sanitizeTo10Digits(e.target.value))}
                        placeholder="9876543210"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={activeCo.email}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'email', e.target.value.trim())}
                        placeholder="coapplicant@example.com"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Sex / Gender *
                      </label>
                      <select
                        value={activeCo.gender || 'MALE'}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'gender', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Date of Birth (DD/MM/YYYY)
                      </label>
                      <DatePickerInput
                        value={activeCo.dob}
                        onChange={(iso) => handleCoApplicantChange(activeIdx, 'dob', iso)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        State *
                      </label>
                      <select
                        value={activeCo.state || formData.clientState}
                        onChange={(e) => {
                          const updated = [...coApplicants];
                          updated[activeIdx] = { ...updated[activeIdx], state: e.target.value, city: '' };
                          setCoApplicants(updated);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      >
                        <option value="">-- Select State --</option>
                        {INDIAN_STATES.map((stateName) => (
                          <option key={stateName} value={stateName}>
                            {stateName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        list={coCityListId}
                        value={activeCo.city}
                        onChange={(e) => handleCoApplicantChange(activeIdx, 'city', e.target.value)}
                        placeholder="e.g. Mumbai, Pune..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <datalist id={coCityListId}>
                        {coStateCities.map((cityName) => (
                          <option key={cityName} value={cityName} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Co-Applicant Customer Type / Entity Checkboxes */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                      Co-Applicant Customer Type / Entity (Select Multiple if Applicable) *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Array.from(new Map(targetCategories.map((tc) => [tc.name, tc])).values()).map((tc) => {
                        const coCustomerTypes = activeCo.customerTypes || (activeCo.customerType ? activeCo.customerType.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
                        const checked = coCustomerTypes.includes(tc.name);
                        return (
                          <label
                            key={tc.id || tc.name}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              checked
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleCoApplicantCustomerTypeToggle(activeIdx, tc.name)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span className="truncate">{tc.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Income Profiles Checkboxes (if financial co-applicant) */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Co-Applicant Income Profile(s) *
                      </label>
                      {!activeCo.incomeRequired && (
                        <span className="text-[11px] text-amber-500 font-medium">
                          (Non-financial co-borrower - KYC only)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableIncomeProfiles.map((inc) => {
                        const checked = (activeCo.incomeTypes || []).includes(inc);
                        return (
                          <label
                            key={inc}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              checked
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleCoApplicantIncomeToggle(activeIdx, inc)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span>{inc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* SECTION 5: SOURCE & ASSIGNMENTS */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <UserCheck className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              5. Source Assignment & Operations Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign single or multiple Channel Partners, Sales Executives & Operations Leads (Multi-Select Checkboxes)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pointer 5: Channel Partner visible ONLY to Super Admin */}
          {isSuperAdmin && (
            <MultiSelectDropdown
              label="Channel Partner(s) (Super Admin View)"
              placeholder="-- Direct Lead / None (Click to Select) --"
              color="amber"
              options={channelUsers.map((u) => ({
                value: u.id,
                label: u.name,
                subtitle: u.email || 'Channel Partner',
                badge: 'Channel',
              }))}
              selected={formData.channelUserIds}
              onChange={(newIds) =>
                setFormData({
                  ...formData,
                  channelUserIds: newIds,
                  channelUserId: newIds.join(','),
                })
              }
            />
          )}

          <MultiSelectDropdown
            label="Sales Executive(s)"
            placeholder="-- Unassigned (Click to Select) --"
            color="blue"
            options={salesUsers.map((u) => ({
              value: u.id,
              label: u.name,
              subtitle: u.email || 'Sales Team',
              badge: 'Sales',
            }))}
            selected={formData.salesUserIds}
            onChange={(newIds) =>
              setFormData({
                ...formData,
                salesUserIds: newIds,
                salesUserId: newIds.join(','),
              })
            }
          />

          <MultiSelectDropdown
            label="Operations Executive(s)"
            placeholder="-- Unassigned (Click to Select) --"
            color="purple"
            options={operationUsers.map((u) => ({
              value: u.id,
              label: u.name,
              subtitle: u.email || 'Operations Team',
              badge: 'Ops',
            }))}
            selected={formData.operationUserIds}
            onChange={(newIds) =>
              setFormData({
                ...formData,
                operationUserIds: newIds,
                operationUserId: newIds.join(','),
              })
            }
          />
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Are you sure you want to cancel lead creation? Unsaved entries will be discarded.')) {
              localStorage.removeItem('nestguru_case_draft');
              router.push('/cases');
            }
          }}
          className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Creating Case...' : 'Create Case Intake'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
