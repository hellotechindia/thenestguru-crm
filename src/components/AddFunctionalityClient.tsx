'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBankConfigAction,
  deleteBankConfigAction,
  updateBankConfigAction,
  createStateConfigAction,
  deleteStateConfigAction,
  updateStateConfigAction,
  addCityToStateAction,
  deleteCityConfigAction,
  updateCityConfigAction,
  createRevenueAction,
  deleteRevenueAction,
  updateRevenueAction,
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from '@/app/actions';
import {
  Building2,
  MapPin,
  IndianRupee,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
  X,
  AlertCircle,
} from 'lucide-react';

interface Props {
  banks: Array<{ id: string; bankName: string; requiredSalaryMonths: number }>;
  states: Array<{ id: string; name: string; cities?: Array<{ id: string; name: string }> }>;
  cases: Array<{ id: string; clientName: string; product: string; status: string }>;
  revenues: Array<{ id: string; amount: number; month: string; state: string; case?: { clientName: string } | null }>;
  expenses: Array<{ id: string; amount: number; month: string }>;
}

export default function AddFunctionalityClient({ banks, states, cases, revenues, expenses }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'banks' | 'states' | 'revenue' | 'expenses'>('banks');

  // Bank Form
  const [bankName, setBankName] = useState('');
  const [salaryMonths, setSalaryMonths] = useState(6);

  // State & City Form
  const [stateName, setStateName] = useState('');
  const [initialCities, setInitialCities] = useState('');
  const [quickCityStateId, setQuickCityStateId] = useState<string | null>(null);
  const [quickCityName, setQuickCityName] = useState('');
  const [modalCityName, setModalCityName] = useState('');

  // Revenue Form
  const [revenueAmount, setRevenueAmount] = useState('');
  const [revenueMonth, setRevenueMonth] = useState('September 2026');
  const [revenueState, setRevenueState] = useState(states[0]?.name || 'Karnataka');
  const [revenueCaseId, setRevenueCaseId] = useState('');

  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMonth, setExpenseMonth] = useState('September 2026');

  // Edit States
  const [editingBank, setEditingBank] = useState<{ id: string; bankName: string; requiredSalaryMonths: number } | null>(null);
  const [editingState, setEditingState] = useState<{ id: string; name: string; cities?: Array<{ id: string; name: string }> } | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<{ id: string; amount: number; month: string; state: string; caseId?: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<{ id: string; amount: number; month: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editError, setEditError] = useState('');

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;
    setLoading(true);
    const res = await createBankConfigAction(bankName.trim(), salaryMonths);
    setLoading(false);
    if (res.success) {
      setBankName('');
      setMessage('Bank configured successfully!');
      router.refresh();
    }
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank || !editingBank.bankName.trim()) return;
    setLoading(true);
    setEditError('');
    const res = await updateBankConfigAction(editingBank.id, editingBank.bankName.trim(), editingBank.requiredSalaryMonths);
    setLoading(false);
    if (!res.success) {
      setEditError(res.error || 'Failed to update bank configuration');
    } else {
      setEditingBank(null);
      setMessage('Bank configuration updated successfully!');
      router.refresh();
    }
  };

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateName.trim()) return;
    setLoading(true);
    const parsedCities = initialCities
      ? initialCities.split(',').map((c) => c.trim()).filter(Boolean)
      : [];
    const res = await createStateConfigAction(stateName.trim(), parsedCities);
    setLoading(false);
    if (res.success) {
      setStateName('');
      setInitialCities('');
      setMessage('State and cities configured successfully!');
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to add state');
    }
  };

  const handleAddCityToState = async (stateId: string, cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    const res = await addCityToStateAction(stateId, cityName.trim());
    setLoading(false);
    if (res.success) {
      setQuickCityName('');
      setQuickCityStateId(null);
      setModalCityName('');
      setMessage(`City "${cityName.trim()}" added successfully!`);
      if (editingState && editingState.id === stateId && res.city) {
        setEditingState({
          ...editingState,
          cities: [...(editingState.cities || []), res.city],
        });
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to add city');
    }
  };

  const handleDeleteCity = async (cityId: string, cityName: string, stateId?: string) => {
    if (confirm(`Remove city "${cityName}"?`)) {
      setLoading(true);
      const res = await deleteCityConfigAction(cityId);
      setLoading(false);
      if (res.success) {
        setMessage(`City "${cityName}" removed!`);
        if (editingState && stateId && editingState.id === stateId) {
          setEditingState({
            ...editingState,
            cities: (editingState.cities || []).filter((c) => c.id !== cityId),
          });
        }
        router.refresh();
      }
    }
  };

  const handleUpdateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingState || !editingState.name.trim()) return;
    setLoading(true);
    setEditError('');
    const res = await updateStateConfigAction(editingState.id, editingState.name.trim());
    setLoading(false);
    if (!res.success) {
      setEditError(res.error || 'Failed to update state');
    } else {
      setEditingState(null);
      setMessage('State updated successfully!');
      router.refresh();
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueAmount) return;
    setLoading(true);
    const res = await createRevenueAction(parseFloat(revenueAmount), revenueMonth, revenueState, revenueCaseId || undefined);
    setLoading(false);
    if (res.success) {
      setRevenueAmount('');
      setMessage('Revenue record added!');
      router.refresh();
    }
  };

  const handleUpdateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevenue) return;
    setLoading(true);
    setEditError('');
    const res = await updateRevenueAction(
      editingRevenue.id,
      editingRevenue.amount,
      editingRevenue.month,
      editingRevenue.state,
      editingRevenue.caseId || undefined
    );
    setLoading(false);
    if (!res.success) {
      setEditError(res.error || 'Failed to update revenue record');
    } else {
      setEditingRevenue(null);
      setMessage('Revenue record updated successfully!');
      router.refresh();
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount) return;
    setLoading(true);
    const res = await createExpenseAction(parseFloat(expenseAmount), expenseMonth);
    setLoading(false);
    if (res.success) {
      setExpenseAmount('');
      setMessage('Expense record added!');
      router.refresh();
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setLoading(true);
    setEditError('');
    const res = await updateExpenseAction(editingExpense.id, editingExpense.amount, editingExpense.month);
    setLoading(false);
    if (!res.success) {
      setEditError(res.error || 'Failed to update expense record');
    } else {
      setEditingExpense(null);
      setMessage('Expense record updated successfully!');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'banks'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Bank Salary Slips ({banks.length})
        </button>

        <button
          onClick={() => setActiveTab('states')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'states'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" /> State Configuration ({states.length})
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'revenue'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <IndianRupee className="w-4 h-4" /> Revenue ({revenues.length})
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'expenses'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses ({expenses.length})
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {message}
          </div>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Bank Salary Slip Duration Configuration */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-500" /> Configure Bank Salary Slip
            </h3>
            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India (SBI)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Required Salary Slip Months
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={salaryMonths}
                  onChange={(e) => setSalaryMonths(parseInt(e.target.value) || 6)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. SBI → 6 months, PNB → 2 months
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow"
              >
                Save Bank Duration Rule
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Configured Banks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Bank Name</th>
                    <th className="py-3 px-4 font-semibold text-center">Required Salary Slip Duration</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {banks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.bankName}</td>
                      <td className="py-3 px-4 text-center font-extrabold text-sky-600 dark:text-sky-400">
                        {b.requiredSalaryMonths} Months
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditError('');
                              setEditingBank({ ...b });
                            }}
                            title="Edit Bank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-500/10 transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Remove ${b.bankName}?`)) {
                                await deleteBankConfigAction(b.id);
                                router.refresh();
                              }
                            }}
                            title="Delete Bank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: State Configuration */}
      {activeTab === 'states' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Add State & Cities
            </h3>
            <form onSubmit={handleAddState} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cities (Optional - comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Pune, Nagpur, Nashik"
                  value={initialCities}
                  onChange={(e) => setInitialCities(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  You can also add or delete cities anytime in the table below.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow"
              >
                Add State & Cities
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Configured States & Cities</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-1/4">State Name</th>
                    <th className="py-3 px-4 font-semibold">Configured Cities</th>
                    <th className="py-3 px-4 font-semibold text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {states.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white align-top">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal block mt-1">
                          {s.cities && s.cities.length > 0
                            ? `${s.cities.length} ${s.cities.length === 1 ? 'city' : 'cities'} configured`
                            : 'No cities mapped'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top space-y-2">
                        {/* Cities Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
                          {s.cities && s.cities.length > 0 ? (
                            s.cities.map((city) => (
                              <span
                                key={city.id}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-[11px] font-medium transition-all"
                              >
                                <span>{city.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCity(city.id, city.name, s.id)}
                                  title={`Remove ${city.name}`}
                                  className="text-indigo-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No cities yet.</span>
                          )}
                        </div>

                        {/* Inline Add City Input */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="+ Add city..."
                            value={quickCityStateId === s.id ? quickCityName : ''}
                            onFocus={() => {
                              if (quickCityStateId !== s.id) {
                                setQuickCityStateId(s.id);
                                setQuickCityName('');
                              }
                            }}
                            onChange={(e) => {
                              setQuickCityStateId(s.id);
                              setQuickCityName(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCityToState(s.id, quickCityName);
                              }
                            }}
                            className="glass-input px-2.5 py-1 rounded-lg text-xs w-48 placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            disabled={loading || quickCityStateId !== s.id || !quickCityName.trim()}
                            onClick={() => handleAddCityToState(s.id, quickCityName)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditError('');
                              setModalCityName('');
                              setEditingState({ ...s, cities: s.cities || [] });
                            }}
                            title="Edit State"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Remove state "${s.name}" and all its mapped cities?`)) {
                                await deleteStateConfigAction(s.id);
                                router.refresh();
                              }
                            }}
                            title="Delete State"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Revenue Management */}
      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> Add Revenue Entry
            </h3>
            <form onSubmit={handleAddRevenue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Revenue Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100000"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Month / Period</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. September 2026"
                  value={revenueMonth}
                  onChange={(e) => setRevenueMonth(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                <select
                  value={revenueState}
                  onChange={(e) => setRevenueState(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Link to Client Case (Optional)</label>
                <select
                  value={revenueCaseId}
                  onChange={(e) => setRevenueCaseId(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- No specific case --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow"
              >
                Record Revenue Entry
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Month</th>
                    <th className="py-3 px-4 font-semibold">State</th>
                    <th className="py-3 px-4 font-semibold">Linked Case</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {revenues.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{r.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.month}</td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">{r.state}</td>
                      <td className="py-3 px-4 text-slate-500">{r.case?.clientName || 'General'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditError('');
                              const matchedCase = cases.find((c) => c.clientName === r.case?.clientName);
                              setEditingRevenue({
                                id: r.id,
                                amount: r.amount,
                                month: r.month,
                                state: r.state,
                                caseId: matchedCase?.id || '',
                              });
                            }}
                            title="Edit Revenue"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete revenue entry?')) {
                                await deleteRevenueAction(r.id);
                                router.refresh();
                              }
                            }}
                            title="Delete Revenue"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Expense Management */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-500" /> Add Expense Entry
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expense Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Month / Period</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. September 2026"
                  value={expenseMonth}
                  onChange={(e) => setExpenseMonth(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow"
              >
                Record Expense Entry
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Expense Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Month</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                        ₹{e.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{e.month}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditError('');
                              setEditingExpense({ ...e });
                            }}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete expense entry?')) {
                                await deleteExpenseAction(e.id);
                                router.refresh();
                              }
                            }}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- EDIT MODALS -------------------- */}

      {/* 1. Edit Bank Modal */}
      {editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-500" /> Edit Bank Configuration
              </h3>
              <button
                onClick={() => setEditingBank(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdateBank} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={editingBank.bankName}
                  onChange={(e) => setEditingBank({ ...editingBank, bankName: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Required Salary Slip Months
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  required
                  value={editingBank.requiredSalaryMonths}
                  onChange={(e) => setEditingBank({ ...editingBank, requiredSalaryMonths: parseInt(e.target.value) || 1 })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBank(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit State Modal */}
      {editingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" /> Edit State Configuration
              </h3>
              <button
                onClick={() => setEditingState(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdateState} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State Name
                </label>
                <input
                  type="text"
                  required
                  value={editingState.name}
                  onChange={(e) => setEditingState({ ...editingState, name: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Mapped Cities Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mapped Cities ({editingState.cities?.length || 0})
                </label>

                <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                  {editingState.cities && editingState.cities.length > 0 ? (
                    editingState.cities.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs font-medium"
                      >
                        <span>{c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCity(c.id, c.name, editingState.id)}
                          title={`Delete ${c.name}`}
                          className="text-indigo-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No cities currently mapped.</span>
                  )}
                </div>

                {/* Add new city to this state */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add new city to this state..."
                    value={modalCityName}
                    onChange={(e) => setModalCityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (modalCityName.trim()) {
                          handleAddCityToState(editingState.id, modalCityName);
                        }
                      }
                    }}
                    className="flex-1 glass-input px-3 py-1.5 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    disabled={loading || !modalCityName.trim()}
                    onClick={() => handleAddCityToState(editingState.id, modalCityName)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingState(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all"
                >
                  Save State Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Revenue Modal */}
      {editingRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-500" /> Edit Revenue Record
              </h3>
              <button
                onClick={() => setEditingRevenue(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdateRevenue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revenue Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={editingRevenue.amount}
                  onChange={(e) => setEditingRevenue({ ...editingRevenue, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Month / Period
                </label>
                <input
                  type="text"
                  required
                  value={editingRevenue.month}
                  onChange={(e) => setEditingRevenue({ ...editingRevenue, month: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <select
                  value={editingRevenue.state}
                  onChange={(e) => setEditingRevenue({ ...editingRevenue, state: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Linked Case (Optional)
                </label>
                <select
                  value={editingRevenue.caseId || ''}
                  onChange={(e) => setEditingRevenue({ ...editingRevenue, caseId: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- No specific case --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.product})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRevenue(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-500" /> Edit Expense Record
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Month / Period
                </label>
                <input
                  type="text"
                  required
                  value={editingExpense.month}
                  onChange={(e) => setEditingExpense({ ...editingExpense, month: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
