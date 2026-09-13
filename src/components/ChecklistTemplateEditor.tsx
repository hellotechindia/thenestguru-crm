'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTemplateCategoryAction,
  createTemplateItemAction,
  deleteTemplateItemAction,
} from '@/app/actions';
import { Layers, Plus, Trash2, Tag, FilePlus2, CheckCircle2 } from 'lucide-react';

interface TemplateItem {
  id: string;
  label: string;
  applicantRequirement: string;
  coApplicantRequirement: string;
  propertyTypeScope: string | null;
  stage: number;
}

interface CategoryItem {
  id: string;
  name: string;
  product: string;
  customerType: string;
  items: TemplateItem[];
}

export default function ChecklistTemplateEditor({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();

  // Category creation
  const [newCatName, setNewCatName] = useState('');
  const [newCatProduct, setNewCatProduct] = useState('Home Loan');
  const [newCatCustomerType, setNewCatCustomerType] = useState('Salaried');

  // Item creation
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [applicantReq, setApplicantReq] = useState('YES');
  const [coApplicantReq, setCoApplicantReq] = useState('IF_APPLICABLE');
  const [propScope, setPropScope] = useState('');
  const [itemStage, setItemStage] = useState(1);

  const [loading, setLoading] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setLoading(true);
    const res = await createTemplateCategoryAction(newCatName, newCatProduct, newCatCustomerType);
    setLoading(false);
    if (res.success) {
      setNewCatName('');
      router.refresh();
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !newItemLabel.trim()) return;
    setLoading(true);
    const res = await createTemplateItemAction({
      categoryId: selectedCatId,
      label: newItemLabel,
      applicantRequirement: applicantReq as any,
      coApplicantRequirement: coApplicantReq as any,
      propertyTypeScope: propScope || undefined,
      stage: itemStage,
    });
    setLoading(false);
    if (res.success) {
      setNewItemLabel('');
      router.refresh();
    }
  };

  const handleDeleteItem = async (id: string, label: string) => {
    if (!confirm(`Delete template item "${label}"?`)) return;
    await deleteTemplateItemAction(id);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Forms Sidebar */}
      <div className="space-y-6">
        {/* Create Category Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Add Checklist Category
          </h2>

          <form onSubmit={handleCreateCategory} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Stage 2 Bank Disbursal Kit"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product</label>
                <input
                  type="text"
                  value={newCatProduct}
                  onChange={(e) => setNewCatProduct(e.target.value)}
                  className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Profile</label>
                <input
                  type="text"
                  value={newCatCustomerType}
                  onChange={(e) => setNewCatCustomerType(e.target.value)}
                  className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all"
            >
              Add Category
            </button>
          </form>
        </div>

        {/* Add Template Item Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Add Checklist Item Template
          </h2>

          <form onSubmit={handleCreateItem} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Category</label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.product} - {c.customerType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Sanction Letter Copy"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Applicant Req.</label>
                <select
                  value={applicantReq}
                  onChange={(e) => setApplicantReq(e.target.value)}
                  className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-slate-900 text-sky-400 font-bold"
                >
                  <option value="YES">YES (Mandatory)</option>
                  <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                  <option value="ONLY_IF_SELLER_BT">ONLY_IF_SELLER_BT</option>
                  <option value="ONLY_MAHARASHTRA">ONLY_MAHARASHTRA</option>
                  <option value="NA">NA (Not Applicable)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Co-Applicant Req.</label>
                <select
                  value={coApplicantReq}
                  onChange={(e) => setCoApplicantReq(e.target.value)}
                  className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-slate-900 text-amber-400 font-bold"
                >
                  <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                  <option value="YES">YES</option>
                  <option value="NA">NA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Property Scope</label>
                <select
                  value={propScope}
                  onChange={(e) => setPropScope(e.target.value)}
                  className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-slate-900 text-indigo-400"
                >
                  <option value="">All Property Types</option>
                  <option value="RESALE">RESALE</option>
                  <option value="TAKEOVER_SELLER_BT">TAKEOVER_SELLER_BT</option>
                  <option value="DIRECT_ALLOTMENT">DIRECT_ALLOTMENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stage (1 to 4)</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={itemStage}
                  onChange={(e) => setItemStage(parseInt(e.target.value) || 1)}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-bold text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Add Item to Matrix
            </button>
          </form>
        </div>
      </div>

      {/* Main Checklist Matrix View */}
      <div className="lg:col-span-2 space-y-6">
        {categories.map((cat) => (
          <div key={cat.id} className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  {cat.name}
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {cat.product} • {cat.customerType} Profile
                </span>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400">
                {cat.items.length} Template Rules
              </span>
            </div>

            <div className="space-y-2">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">{item.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 text-[10px] font-semibold">
                        App: {item.applicantRequirement}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-semibold">
                        Co-App: {item.coApplicantRequirement}
                      </span>
                      {item.propertyTypeScope && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold">
                          {item.propertyTypeScope}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">Stage {item.stage}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id, item.label)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
