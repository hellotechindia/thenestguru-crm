'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTemplateCategoryAction,
  updateTemplateCategoryAction,
  deleteTemplateCategoryAction,
  createTemplateItemAction,
  updateTemplateItemAction,
  deleteTemplateItemAction,
} from '@/app/actions';
import {
  Tag,
  FilePlus2,
  Trash2,
  Edit3,
  X,
  Check,
  FolderEdit,
  FolderX,
  Link2,
  MessageSquare,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface TemplateItem {
  id: string;
  label: string;
  applicantRequirement: string;
  coApplicantRequirement: string;
  propertyTypeScope: string | null;
  stage: number;
  requireOnedrive?: boolean;
  requireRemark?: boolean;
  remarkPlaceholder?: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  product: string;
  customerType: string;
  items: TemplateItem[];
}

interface ChecklistTemplateEditorProps {
  categories: CategoryItem[];
  products?: Array<{ id: string; name: string }>;
  profiles?: Array<{ id: string; name: string }>;
}

export default function ChecklistTemplateEditor({
  categories,
  products = [],
  profiles = [],
}: ChecklistTemplateEditorProps) {
  const router = useRouter();

  // Category creation
  const [newCatName, setNewCatName] = useState('');
  const [newCatProduct, setNewCatProduct] = useState(products[0]?.name || 'Home Loan');
  const [newCatCustomerType, setNewCatCustomerType] = useState(profiles[0]?.name || 'Salaried');

  // Category editing modal
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    product: string;
    customerType: string;
  } | null>(null);

  // Item creation
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || '');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [applicantReq, setApplicantReq] = useState('YES');
  const [coApplicantReq, setCoApplicantReq] = useState('IF_APPLICABLE');
  const [propScope, setPropScope] = useState('');
  const [itemStage, setItemStage] = useState(1);
  const [requireOnedrive, setRequireOnedrive] = useState(true);
  const [requireRemark, setRequireRemark] = useState(false);
  const [remarkPlaceholder, setRemarkPlaceholder] = useState('');

  // Item editing modal
  const [editingItem, setEditingItem] = useState<{
    id: string;
    categoryId: string;
    label: string;
    applicantRequirement: string;
    coApplicantRequirement: string;
    propertyTypeScope: string;
    stage: number;
    requireOnedrive: boolean;
    requireRemark: boolean;
    remarkPlaceholder: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const res = await createTemplateCategoryAction(newCatName, newCatProduct, newCatCustomerType);
    setLoading(false);
    if (res.success) {
      setNewCatName('');
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create category');
    }
  };

  // 2. Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const res = await updateTemplateCategoryAction(
      editingCategory.id,
      editingCategory.name,
      editingCategory.product,
      editingCategory.customerType
    );
    setLoading(false);
    if (res.success) {
      setEditingCategory(null);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to update category');
    }
  };

  // 3. Delete Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    const confirmMessage =
      cat.items.length > 0
        ? `Are you sure you want to delete category "${cat.name}"?\n\nWARNING: This will permanently delete all ${cat.items.length} template items inside it!`
        : `Delete category "${cat.name}"?`;

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    const res = await deleteTemplateCategoryAction(cat.id);
    setLoading(false);
    if (res.success) {
      if (selectedCatId === cat.id) {
        const remaining = categories.filter((c) => c.id !== cat.id);
        setSelectedCatId(remaining[0]?.id || '');
      }
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete category');
    }
  };

  // 4. Create Template Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !newItemLabel.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const res = await createTemplateItemAction({
      categoryId: selectedCatId,
      label: newItemLabel,
      applicantRequirement: applicantReq as any,
      coApplicantRequirement: coApplicantReq as any,
      propertyTypeScope: propScope || undefined,
      stage: itemStage,
      requireOnedrive,
      requireRemark,
      remarkPlaceholder: requireRemark ? remarkPlaceholder : undefined,
    });
    setLoading(false);
    if (res.success) {
      setNewItemLabel('');
      setRemarkPlaceholder('');
      setRequireRemark(false);
      setRequireOnedrive(true);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to create item');
    }
  };

  // 5. Update Template Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.label.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const res = await updateTemplateItemAction(editingItem.id, {
      categoryId: editingItem.categoryId,
      label: editingItem.label,
      applicantRequirement: editingItem.applicantRequirement as any,
      coApplicantRequirement: editingItem.coApplicantRequirement as any,
      propertyTypeScope: editingItem.propertyTypeScope || undefined,
      stage: editingItem.stage,
      requireOnedrive: editingItem.requireOnedrive,
      requireRemark: editingItem.requireRemark,
      remarkPlaceholder: editingItem.requireRemark ? editingItem.remarkPlaceholder : undefined,
    });
    setLoading(false);
    if (res.success) {
      setEditingItem(null);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Failed to update item');
    }
  };

  // 6. Delete Template Item
  const handleDeleteItem = async (id: string, label: string) => {
    if (!confirm(`Delete template item "${label}"?`)) return;
    await deleteTemplateItemAction(id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forms Sidebar */}
        <div className="space-y-6">
          {/* Create Category Form */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Add Checklist Category
            </h2>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name
                </label>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Product
                    </label>
                    <Link
                      href="/admin/products"
                      className="text-[10px] text-sky-600 hover:text-sky-500 font-semibold flex items-center gap-0.5"
                      title="Manage Loan Products"
                    >
                      + Manage
                    </Link>
                  </div>
                  {products.length > 0 ? (
                    <select
                      value={newCatProduct}
                      onChange={(e) => setNewCatProduct(e.target.value)}
                      className="w-full glass-input px-2 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newCatProduct}
                      onChange={(e) => setNewCatProduct(e.target.value)}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Profile
                    </label>
                    <Link
                      href="/admin/profiles"
                      className="text-[10px] text-purple-600 hover:text-purple-500 font-semibold flex items-center gap-0.5"
                      title="Manage Customer Profiles"
                    >
                      + Manage
                    </Link>
                  </div>
                  {profiles.length > 0 ? (
                    <select
                      value={newCatCustomerType}
                      onChange={(e) => setNewCatCustomerType(e.target.value)}
                      className="w-full glass-input px-2 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newCatCustomerType}
                      onChange={(e) => setNewCatCustomerType(e.target.value)}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
              >
                + Add Category
              </button>
            </form>
          </div>

          {/* Add Template Item Form */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FilePlus2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Add Checklist Item Template
            </h2>

            <form onSubmit={handleCreateItem} className="space-y-3">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Category
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full glass-input px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.product} - {c.customerType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Label */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Label / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanction Letter Copy"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Dynamic OneDrive Link Requirement */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-500" />
                    OneDrive Share Link Required?
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setRequireOnedrive(true)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        requireOnedrive
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequireOnedrive(false)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        !requireOnedrive
                          ? 'bg-slate-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No (Optional)
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {requireOnedrive
                    ? 'Staff must provide a valid OneDrive or cloud link for this document.'
                    : 'OneDrive link will be optional for this checklist item.'}
                </p>
              </div>

              {/* Dynamic Remark Requirement & Custom Placeholder */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    Remarks Field Required?
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setRequireRemark(true)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        requireRemark
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequireRemark(false)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        !requireRemark
                          ? 'bg-slate-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {requireRemark ? (
                  <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Custom Remark Placeholder Text:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Enter sanction terms, bank branch & rate..."
                      value={remarkPlaceholder}
                      onChange={(e) => setRemarkPlaceholder(e.target.value)}
                      className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      This text guides the operations team when typing remarks for this item.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Remarks field will be optional with standard placeholder.
                  </p>
                )}
              </div>

              {/* Requirement Conditions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Applicant Req.
                  </label>
                  <select
                    value={applicantReq}
                    onChange={(e) => setApplicantReq(e.target.value)}
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold"
                  >
                    <option value="YES">YES (Mandatory)</option>
                    <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                    <option value="ONLY_IF_SELLER_BT">ONLY_IF_SELLER_BT</option>
                    <option value="ONLY_MAHARASHTRA">ONLY_MAHARASHTRA</option>
                    <option value="NA">NA (Not Applicable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Co-Applicant Req.
                  </label>
                  <select
                    value={coApplicantReq}
                    onChange={(e) => setCoApplicantReq(e.target.value)}
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold"
                  >
                    <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                    <option value="YES">YES</option>
                    <option value="NA">NA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Property Scope
                  </label>
                  <select
                    value={propScope}
                    onChange={(e) => setPropScope(e.target.value)}
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                  >
                    <option value="">All Property Types</option>
                    <option value="RESALE">RESALE</option>
                    <option value="TAKEOVER_SELLER_BT">TAKEOVER_SELLER_BT</option>
                    <option value="DIRECT_ALLOTMENT">DIRECT_ALLOTMENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage (1 to 4)
                  </label>
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
                disabled={loading || !selectedCatId}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
              >
                + Add Item to Template
              </button>
            </form>
          </div>
        </div>

        {/* Main Checklist Matrix View */}
        <div className="lg:col-span-2 space-y-6">
          {categories.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              No checklist categories defined yet. Use the form on the left to add one!
            </div>
          ) : null}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
            >
              {/* Category Header with Edit & Delete options */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {cat.name}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Product: <strong className="text-sky-600 dark:text-sky-400">{cat.product}</strong> • Profile:{' '}
                    <strong className="text-purple-600 dark:text-purple-400">{cat.customerType}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400">
                    {cat.items.length} Rules
                  </span>

                  {/* Edit Category Button */}
                  <button
                    onClick={() =>
                      setEditingCategory({
                        id: cat.id,
                        name: cat.name,
                        product: cat.product,
                        customerType: cat.customerType,
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-transparent hover:border-sky-200 dark:hover:border-sky-800 transition-colors"
                    title="Edit Category"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete Category Button */}
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
                    title="Delete Category & Items"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items in this Category */}
              <div className="space-y-2">
                {cat.items.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No items in this category yet. Select it in the form to add items.
                  </div>
                ) : null}

                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Stage {item.stage}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
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

                        {/* OneDrive Badge */}
                        {item.requireOnedrive !== false ? (
                          <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-medium flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5" />
                            OneDrive Req
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-medium">
                            Drive Optional
                          </span>
                        )}

                        {/* Remarks Badge */}
                        {item.requireRemark ? (
                          <span
                            className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1"
                            title={item.remarkPlaceholder ? `Placeholder: "${item.remarkPlaceholder}"` : 'Remark Required'}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Remark Req
                            {item.remarkPlaceholder && (
                              <span className="font-normal opacity-80 max-w-[120px] truncate">
                                ({item.remarkPlaceholder})
                              </span>
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions on Item */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setEditingItem({
                            id: item.id,
                            categoryId: cat.id,
                            label: item.label,
                            applicantRequirement: item.applicantRequirement,
                            coApplicantRequirement: item.coApplicantRequirement,
                            propertyTypeScope: item.propertyTypeScope || '',
                            stage: item.stage,
                            requireOnedrive: item.requireOnedrive !== false,
                            requireRemark: item.requireRemark === true,
                            remarkPlaceholder: item.remarkPlaceholder || '',
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id, item.label)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderEdit className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Edit Checklist Category
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product
                  </label>
                  {products.length > 0 ? (
                    <select
                      value={editingCategory.product}
                      onChange={(e) => setEditingCategory({ ...editingCategory, product: e.target.value })}
                      className="w-full glass-input px-2 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingCategory.product}
                      onChange={(e) => setEditingCategory({ ...editingCategory, product: e.target.value })}
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Profile
                  </label>
                  {profiles.length > 0 ? (
                    <select
                      value={editingCategory.customerType}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, customerType: e.target.value })
                      }
                      className="w-full glass-input px-2 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingCategory.customerType}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, customerType: e.target.value })
                      }
                      className="w-full glass-input px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Edit Checklist Item Template
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-3">
              {/* Target Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editingItem.categoryId}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                  className="w-full glass-input px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.product} - {c.customerType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Label */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Label / Title
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              {/* OneDrive Requirement */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-sky-500" />
                    OneDrive Share Link Required?
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, requireOnedrive: true })}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        editingItem.requireOnedrive
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, requireOnedrive: false })}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        !editingItem.requireOnedrive
                          ? 'bg-slate-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No (Optional)
                    </button>
                  </div>
                </div>
              </div>

              {/* Remarks Requirement & Placeholder */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    Remarks Field Required?
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, requireRemark: true })}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        editingItem.requireRemark
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, requireRemark: false })}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        !editingItem.requireRemark
                          ? 'bg-slate-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {editingItem.requireRemark && (
                  <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Custom Remark Placeholder Text:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Enter sanction terms, bank branch & rate..."
                      value={editingItem.remarkPlaceholder}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, remarkPlaceholder: e.target.value })
                      }
                      className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Requirement Conditions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Applicant Req.
                  </label>
                  <select
                    value={editingItem.applicantRequirement}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, applicantRequirement: e.target.value })
                    }
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold"
                  >
                    <option value="YES">YES (Mandatory)</option>
                    <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                    <option value="ONLY_IF_SELLER_BT">ONLY_IF_SELLER_BT</option>
                    <option value="ONLY_MAHARASHTRA">ONLY_MAHARASHTRA</option>
                    <option value="NA">NA (Not Applicable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Co-Applicant Req.
                  </label>
                  <select
                    value={editingItem.coApplicantRequirement}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, coApplicantRequirement: e.target.value })
                    }
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold"
                  >
                    <option value="IF_APPLICABLE">IF_APPLICABLE</option>
                    <option value="YES">YES</option>
                    <option value="NA">NA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Property Scope
                  </label>
                  <select
                    value={editingItem.propertyTypeScope}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, propertyTypeScope: e.target.value })
                    }
                    className="w-full glass-input px-2 py-1.5 rounded-xl text-[11px] bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                  >
                    <option value="">All Property Types</option>
                    <option value="RESALE">RESALE</option>
                    <option value="TAKEOVER_SELLER_BT">TAKEOVER_SELLER_BT</option>
                    <option value="DIRECT_ALLOTMENT">DIRECT_ALLOTMENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage (1 to 4)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editingItem.stage}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, stage: parseInt(e.target.value) || 1 })
                    }
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
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
