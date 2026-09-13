'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBankConfigAction,
  deleteBankConfigAction,
  createStateConfigAction,
  deleteStateConfigAction,
  createRevenueAction,
  deleteRevenueAction,
  createExpenseAction,
  deleteExpenseAction,
} from '@/app/actions';
import { Building2, MapPin, IndianRupee, Receipt, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
  banks: Array<{ id: string; bankName: string; requiredSalaryMonths: number }>;
  states: Array<{ id: string; name: string }>;
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

  // State Form
  const [stateName, setStateName] = useState('');

  // Revenue Form
  const [revenueAmount, setRevenueAmount] = useState('');
  const [revenueMonth, setRevenueMonth] = useState('September 2026');
  const [revenueState, setRevenueState] = useState(states[0]?.name || 'Karnataka');
  const [revenueCaseId, setRevenueCaseId] = useState('');

  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMonth, setExpenseMonth] = useState('September 2026');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateName.trim()) return;
    setLoading(true);
    const res = await createStateConfigAction(stateName.trim());
    setLoading(false);
    if (res.success) {
      setStateName('');
      setMessage('State configured successfully!');
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
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {message}
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
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {banks.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.bankName}</td>
                      <td className="py-3 px-4 text-center font-extrabold text-sky-600 dark:text-sky-400">
                        {b.requiredSalaryMonths} Months
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Remove ${b.bankName}?`)) {
                              await deleteBankConfigAction(b.id);
                              router.refresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <Plus className="w-4 h-4 text-indigo-500" /> Add State
            </h3>
            <form onSubmit={handleAddState} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow"
              >
                Add State
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Configured States</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">State Name</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {states.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Remove ${s.name}?`)) {
                              await deleteStateConfigAction(s.id);
                              router.refresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {revenues.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{r.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.month}</td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">{r.state}</td>
                      <td className="py-3 px-4 text-slate-500">{r.case?.clientName || 'General'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete revenue entry?')) {
                              await deleteRevenueAction(r.id);
                              router.refresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                        ₹{e.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{e.month}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete expense entry?')) {
                              await deleteExpenseAction(e.id);
                              router.refresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
