'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTemplateCategoryAction,
  createTemplateCategoriesBatchAction,
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
  Building2,
  Package,
  Briefcase,
  Users2,
  Layers,
  Plus,
  ChevronDown,
  Search,
} from 'lucide-react';

export interface TemplateItem {
  id: string;
  label: string;
  applicantRequirement: string;
  coApplicantRequirement: string;
  propertyTypeScope: string | null;
  subProduct?: string | null;
  incomeType?: string | null;
  customerType?: string | null;
  stages?: string | null;
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
  propertyScopes?: Array<{ id: string; name: string; description?: string | null }>;
  customerTypes?: Array<{ id: string; name: string; description?: string | null }>;
  workflowStages?: Array<{ id: string; stageNumber: number; name: string; color?: string | null }>;
  subProducts?: Array<{ id: string; name: string; productId: string; product?: { id: string; name: string } }>;
}

function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  color = 'indigo',
  allLabel = 'All',
  headerRight,
  mode = 'filter',
  placeholder,
  inline = true,
}: {
  label: string;
  icon?: any;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  color?: 'indigo' | 'sky' | 'purple' | 'amber' | 'emerald';
  allLabel?: string;
  headerRight?: React.ReactNode;
  mode?: 'filter' | 'explicit';
  placeholder?: string;
  inline?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside - never close when clicking a submit button to prevent layout shift cancelling clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest('button[type="submit"]') || target.closest('[data-submit-btn]'))) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen]);

  const isValueMatch = (a: string, b: string) => {
    const aNorm = a.trim().toLowerCase();
    const bNorm = b.trim().toLowerCase();
    if (aNorm === bNorm) return true;
    if (aNorm.replace(/_/g, ' ') === bNorm.replace(/_/g, ' ')) return true;
    return false;
  };

  const isSelected = (val: string) => {
    return selected.some((s) => isValueMatch(s, val));
  };

  const toggleOption = (val: string) => {
    if (isSelected(val)) {
      onChange(selected.filter((s) => !isValueMatch(s, val)));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectAll = () => {
    if (search.trim()) {
      const newVals = filteredOptions.map((o) => o.value).filter((v) => !isSelected(v));
      onChange([...selected, ...newVals]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const clearAll = () => {
    if (search.trim()) {
      const filteredSet = new Set(filteredOptions.map((o) => o.value.trim().toLowerCase()));
      onChange(selected.filter((s) => !filteredSet.has(s.trim().toLowerCase())));
    } else {
      onChange([]);
    }
  };

  const isAll = options.length > 0 && selected.length === options.length;
  const isDefaultAll = selected.length === 0;

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const themeColors = {
    indigo: {
      border: 'border-indigo-500 focus:border-indigo-600',
      badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      checkbox: 'bg-indigo-600 border-indigo-600 text-white',
      hover: 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      ring: 'focus:ring-indigo-500/20',
    },
    amber: {
      border: 'border-amber-500 focus:border-amber-600',
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      checkbox: 'bg-amber-600 border-amber-600 text-white',
      hover: 'hover:bg-amber-50/70 dark:hover:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      ring: 'focus:ring-amber-500/20',
    },
    emerald: {
      border: 'border-emerald-500 focus:border-emerald-600',
      badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      checkbox: 'bg-emerald-600 border-emerald-600 text-white',
      hover: 'hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      ring: 'focus:ring-emerald-500/20',
    },
    purple: {
      border: 'border-purple-500 focus:border-purple-600',
      badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      checkbox: 'bg-purple-600 border-purple-600 text-white',
      hover: 'hover:bg-purple-50/70 dark:hover:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      ring: 'focus:ring-purple-500/20',
    },
    sky: {
      border: 'border-sky-500 focus:border-sky-600',
      badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
      checkbox: 'bg-sky-600 border-sky-600 text-white',
      hover: 'hover:bg-sky-50/70 dark:hover:bg-sky-950/30',
      text: 'text-sky-600 dark:text-sky-400',
      ring: 'focus:ring-sky-500/20',
    },
  }[color];

  // Dynamic summary text for the trigger button
  let summaryText = allLabel;
  if (isDefaultAll) {
    summaryText = allLabel;
  } else if (isAll) {
    summaryText = `All Selected (${options.length})`;
  } else if (selected.length === 1) {
    const matched = options.find((o) => isValueMatch(o.value, selected[0]));
    summaryText = matched ? matched.label : selected[0];
  } else {
    summaryText = `${selected.length} Selected`;
  }

  return (
    <div className="relative space-y-1" ref={dropdownRef}>
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${themeColors.text}`} />}
          <span>{label}</span>
          {options.length > 0 && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({selected.length}/{options.length})
            </span>
          )}
        </label>
        {headerRight ? (
          headerRight
        ) : (
          <span
            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              isDefaultAll
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                : isAll
                ? `${themeColors.badge} font-extrabold shadow-sm`
                : themeColors.badge
            }`}
          >
            {isDefaultAll
              ? 'All (Default)'
              : isAll
              ? `All (${options.length}) Selected`
              : `${selected.length} Selected`}
          </span>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border transition-all text-left shadow-sm cursor-pointer ${
          isOpen
            ? `${themeColors.border} ring-2 ${themeColors.ring}`
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-slate-800 dark:text-slate-200 truncate font-medium">
            {isDefaultAll ? (
              <span className="text-slate-400 font-normal">All / Any (No restriction)</span>
            ) : isAll ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">All Selected ({options.length})</span>
            ) : (
              <span className="font-semibold">{summaryText}</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-800 dark:text-white' : ''
          }`}
        />
      </button>

      {/* Dismissible Selected Badges Preview (ALWAYS shown whenever items are selected) */}
      {selected.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {selected.slice(0, 4).map((val) => {
            const opt = options.find((o) => isValueMatch(o.value, val));
            return (
              <span
                key={val}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${themeColors.badge}`}
              >
                <span className="max-w-[140px] truncate">{opt ? opt.label : val}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                  className="hover:opacity-75 p-0.5 cursor-pointer"
                  title="Remove selection"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          {selected.length > 4 && (
            <span className="text-[10px] text-slate-400 font-semibold self-center">
              +{selected.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Options Container: Inline expanding panel */}
      {isOpen && (
        <div
          className={
            inline
              ? 'mt-2 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150 shadow-inner'
              : 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150'
          }
        >
          {/* Header / Search */}
          <div className="space-y-1.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            {options.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {selected.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className={`font-semibold hover:underline cursor-pointer ${themeColors.text}`}
                >
                  Select All
                </button>
              </div>
            </div>
          </div>

          {/* Options List with Checkboxes */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching options</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = isSelected(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      checked
                        ? `${themeColors.hover} font-semibold text-slate-900 dark:text-white`
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Modern Checkbox */}
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                        checked
                          ? themeColors.checkbox
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Explicit Done / Close Button */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {selected.length === 0
                ? 'All options included (no filter)'
                : `${selected.length} of ${options.length} item(s) selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChecklistTemplateEditor({
  categories,
  products = [],
  profiles = [],
  propertyScopes = [],
  customerTypes = [],
  workflowStages = [],
  subProducts = [],
}: ChecklistTemplateEditorProps) {
  const router = useRouter();

  // Category creation (universal for all products and profiles by default)
  const [newCatName, setNewCatName] = useState('');

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
  const [selectedPropScopes, setSelectedPropScopes] = useState<string[]>([]);
  const [selectedSubProducts, setSelectedSubProducts] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<number[]>([1]);
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
    selectedPropScopes: string[];
    selectedSubProducts: string[];
    selectedProfiles: string[];
    selectedCustomerTypes: string[];
    selectedStages: number[];
    stage: number;
    requireOnedrive: boolean;
    requireRemark: boolean;
    remarkPlaceholder: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Create Category (Universal by default for all products & customer profiles)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('Category Name is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await createTemplateCategoryAction(newCatName.trim(), 'ALL', 'ALL');
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
    if (!selectedCatId || !newItemLabel.trim()) {
      setErrorMsg('Target Category and Document Title are required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await createTemplateItemAction({
        categoryId: selectedCatId,
        label: newItemLabel.trim(),
        applicantRequirement: applicantReq as any,
        coApplicantRequirement: coApplicantReq as any,
        propertyTypeScope: selectedPropScopes.length > 0 ? selectedPropScopes.join(', ') : undefined,
        subProduct: selectedSubProducts.length > 0 ? selectedSubProducts.join(', ') : undefined,
        incomeType: selectedProfiles.length > 0 ? selectedProfiles.join(', ') : undefined,
        customerType: selectedCustomerTypes.length > 0 ? selectedCustomerTypes.join(', ') : undefined,
        stages: selectedStages.length > 0 ? selectedStages.join(', ') : undefined,
        stage: selectedStages.length > 0 ? selectedStages[0] : 1,
        requireOnedrive,
        requireRemark,
        remarkPlaceholder: requireRemark ? remarkPlaceholder.trim() : undefined,
      });
      setLoading(false);
      if (res.success) {
        setNewItemLabel('');
        setRemarkPlaceholder('');
        setRequireRemark(false);
        setRequireOnedrive(true);
        setSelectedPropScopes([]);
        setSelectedSubProducts([]);
        setSelectedProfiles([]);
        setSelectedCustomerTypes([]);
        setSelectedStages([1]);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to create item');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'Error occurred while saving item');
    }
  };

  // 5. Update Template Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.label.trim()) {
      setErrorMsg('Document Title is required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await updateTemplateItemAction(editingItem.id, {
        categoryId: editingItem.categoryId,
        label: editingItem.label.trim(),
        applicantRequirement: editingItem.applicantRequirement as any,
        coApplicantRequirement: editingItem.coApplicantRequirement as any,
        propertyTypeScope: editingItem.selectedPropScopes.length > 0 ? editingItem.selectedPropScopes.join(', ') : undefined,
        subProduct: editingItem.selectedSubProducts.length > 0 ? editingItem.selectedSubProducts.join(', ') : undefined,
        incomeType: editingItem.selectedProfiles.length > 0 ? editingItem.selectedProfiles.join(', ') : undefined,
        customerType: editingItem.selectedCustomerTypes.length > 0 ? editingItem.selectedCustomerTypes.join(', ') : undefined,
        stages: editingItem.selectedStages.length > 0 ? editingItem.selectedStages.join(', ') : undefined,
        stage: editingItem.selectedStages.length > 0 ? editingItem.selectedStages[0] : 1,
        requireOnedrive: editingItem.requireOnedrive,
        requireRemark: editingItem.requireRemark,
        remarkPlaceholder: editingItem.requireRemark ? (editingItem.remarkPlaceholder || '').trim() : undefined,
      });
      setLoading(false);
      if (res.success) {
        setEditingItem(null);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to update item');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'Error occurred while updating item');
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
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-20">
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
                <p className="text-[10px] text-slate-400 mt-1">
                  By default, this category applies to all loan products &amp; customer profiles.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {loading ? 'Adding Category...' : '+ Add Category'}
              </button>
            </form>
          </div>

          {/* Add Template Item Form */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm relative z-10">
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
                      {c.name} {c.product === 'ALL' && c.customerType === 'ALL' ? '(Universal / All Cases)' : `(${c.product} - ${c.customerType})`}
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

              {/* Multi-Select Dropdown: Property Scope */}
              <MultiSelectDropdown
                label="Property Scope"
                icon={Building2}
                options={propertyScopes.length > 0 ? propertyScopes.map(s => ({ label: s.name, value: s.name })) : [
                  { label: 'Resale', value: 'Resale' },
                  { label: 'Takeover / Seller BT', value: 'Takeover / Seller BT' },
                  { label: 'Direct Allotment - Flat', value: 'Direct Allotment - Flat' },
                  { label: 'Direct Allotment - Plot', value: 'Direct Allotment - Plot' },
                  { label: 'Commercial Property', value: 'Commercial Property' },
                  { label: 'Industrial Plot', value: 'Industrial Plot' },
                ]}
                selected={selectedPropScopes}
                onChange={setSelectedPropScopes}
                color="indigo"
                allLabel="All Property Scopes"
              />

              {/* Multi-Select Dropdown: Product Type and Sub Product Type */}
              <MultiSelectDropdown
                label="Product & Sub-Product Type"
                icon={Package}
                options={subProducts.length > 0 ? subProducts.map(sp => {
                  const prefix = sp.product?.name ? `${sp.product.name} - ` : '';
                  return { label: `${prefix}${sp.name}`, value: `${prefix}${sp.name}` };
                }) : products.map(p => ({ label: p.name, value: p.name }))}
                selected={selectedSubProducts}
                onChange={setSelectedSubProducts}
                color="amber"
                allLabel="All Products / Sub-Products"
              />

              {/* Multi-Select Dropdown: Income Profile */}
              <MultiSelectDropdown
                label="Income Profile Option"
                icon={Briefcase}
                options={profiles.length > 0 ? profiles.map(p => ({ label: p.name, value: p.name })) : [
                  { label: 'Salaried', value: 'Salaried' },
                  { label: 'Self Employed Professional', value: 'Self Employed Professional' },
                  { label: 'Self Employed Non-Professional', value: 'Self Employed Non-Professional' },
                  { label: 'Rental Income', value: 'Rental Income' },
                ]}
                selected={selectedProfiles}
                onChange={setSelectedProfiles}
                color="emerald"
                allLabel="All Income Profiles"
              />

              {/* Multi-Select Dropdown: Customer Type */}
              <MultiSelectDropdown
                label="Customer Type"
                icon={Users2}
                options={customerTypes.length > 0 ? customerTypes.map(c => ({ label: c.name, value: c.name })) : [
                  { label: 'Individual', value: 'Individual' },
                  { label: 'Proprietorship', value: 'Proprietorship' },
                  { label: 'Partnership', value: 'Partnership' },
                  { label: 'Pvt Ltd', value: 'Pvt Ltd' },
                  { label: 'Public Ltd', value: 'Public Ltd' },
                  { label: 'HUF', value: 'HUF' },
                ]}
                selected={selectedCustomerTypes}
                onChange={setSelectedCustomerTypes}
                color="purple"
                allLabel="All Customer Types"
              />

              {/* Multi-Select Dropdown: Workflow Stages */}
              <MultiSelectDropdown
                label="Workflow Stages"
                icon={Layers}
                options={workflowStages.length > 0 ? workflowStages.map(s => ({
                  label: `Stage ${s.stageNumber}: ${s.name}`,
                  value: String(s.stageNumber),
                })) : [
                  { label: 'Stage 1 (Login Docs)', value: '1' },
                  { label: 'Stage 2 (Sanction Docs)', value: '2' },
                  { label: 'Stage 3 (Disbursal Docs)', value: '3' },
                  { label: 'Stage 4 (Post-Disbursal)', value: '4' },
                ]}
                selected={selectedStages.map(String)}
                onChange={(vals) => setSelectedStages(vals.map(v => parseInt(v)).filter(n => !isNaN(n)))}
                color="sky"
                allLabel="All Stages (1 to 4)"
              />

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button type="button" onClick={() => setErrorMsg('')} className="p-0.5 hover:opacity-75">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                data-submit-btn="true"
                disabled={loading || !selectedCatId}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'Adding Item...' : '+ Add Item to Template'}
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
                  {cat.product === 'ALL' && cat.customerType === 'ALL' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                      Universal (Applies to all loan cases)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Product: <strong className="text-sky-600 dark:text-sky-400">{cat.product}</strong> • Profile:{' '}
                      <strong className="text-purple-600 dark:text-purple-400">{cat.customerType}</strong>
                    </span>
                  )}
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
                        {item.stages ? (
                          <div className="flex items-center gap-1">
                            {item.stages.split(',').map((s) => (
                              <span
                                key={s.trim()}
                                className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
                              >
                                Stage {s.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Stage {item.stage}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 text-[10px] font-semibold">
                          App: {item.applicantRequirement}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-semibold">
                          Co-App: {item.coApplicantRequirement}
                        </span>

                        {item.propertyTypeScope && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            {item.propertyTypeScope}
                          </span>
                        )}

                        {item.customerType && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 text-[10px] font-semibold flex items-center gap-1">
                            <Users2 className="w-2.5 h-2.5" />
                            {item.customerType}
                          </span>
                        )}

                        {item.incomeType && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                            <Briefcase className="w-2.5 h-2.5" />
                            {item.incomeType}
                          </span>
                        )}

                        {item.subProduct && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />
                            {item.subProduct}
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
                        onClick={() => {
                          setErrorMsg('');
                          setEditingItem({
                            id: item.id,
                            categoryId: cat.id,
                            label: item.label,
                            applicantRequirement: item.applicantRequirement,
                            coApplicantRequirement: item.coApplicantRequirement,
                            selectedPropScopes: item.propertyTypeScope
                              ? item.propertyTypeScope.split(',').map((s) => {
                                  const trimmed = s.trim();
                                  const lower = trimmed.toLowerCase();
                                  if (lower === 'resale') return 'Resale';
                                  if (lower === 'takeover_seller_bt' || lower.includes('seller bt')) return 'Takeover / Seller BT';
                                  if (lower === 'direct_allotment' || lower.includes('direct allotment - flat')) return 'Direct Allotment - Flat';
                                  if (lower.includes('direct allotment - plot')) return 'Direct Allotment - Plot';
                                  if (lower.includes('commercial')) return 'Commercial Property';
                                  if (lower.includes('industrial')) return 'Industrial Plot';
                                  return trimmed;
                                }).filter(Boolean)
                              : [],
                            selectedSubProducts: item.subProduct ? item.subProduct.split(',').map((s) => s.trim()).filter(Boolean) : [],
                            selectedProfiles: item.incomeType ? item.incomeType.split(',').map((s) => s.trim()).filter(Boolean) : [],
                            selectedCustomerTypes: item.customerType ? item.customerType.split(',').map((s) => s.trim()).filter(Boolean) : [],
                            selectedStages: item.stages
                              ? item.stages.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n > 0)
                              : [item.stage || 1],
                            stage: item.stage,
                            requireOnedrive: item.requireOnedrive !== false,
                            requireRemark: item.requireRemark === true,
                            remarkPlaceholder: item.remarkPlaceholder || '',
                          });
                        }}
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

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Categories are universal and apply across all loan products and borrower profiles automatically.
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
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button type="button" onClick={() => setErrorMsg('')} className="p-1 hover:opacity-75">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
                      {c.name} {c.product === 'ALL' && c.customerType === 'ALL' ? '(Universal / All Cases)' : `(${c.product} - ${c.customerType})`}
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

              {/* Multi-Select Dropdown: Property Scope in Edit Modal */}
              <MultiSelectDropdown
                label="Property Scope"
                icon={Building2}
                options={propertyScopes.length > 0 ? propertyScopes.map(s => ({ label: s.name, value: s.name })) : [
                  { label: 'Resale', value: 'Resale' },
                  { label: 'Takeover / Seller BT', value: 'Takeover / Seller BT' },
                  { label: 'Direct Allotment - Flat', value: 'Direct Allotment - Flat' },
                  { label: 'Direct Allotment - Plot', value: 'Direct Allotment - Plot' },
                  { label: 'Commercial Property', value: 'Commercial Property' },
                  { label: 'Industrial Plot', value: 'Industrial Plot' },
                ]}
                selected={editingItem.selectedPropScopes}
                onChange={(scopes) => setEditingItem({ ...editingItem, selectedPropScopes: scopes })}
                color="indigo"
                allLabel="All Property Scopes"
              />

              {/* Multi-Select Dropdown: Product Type and Sub Product Type in Edit Modal */}
              <MultiSelectDropdown
                label="Product & Sub-Product Type"
                icon={Package}
                options={subProducts.length > 0 ? subProducts.map(sp => {
                  const prefix = sp.product?.name ? `${sp.product.name} - ` : '';
                  return { label: `${prefix}${sp.name}`, value: `${prefix}${sp.name}` };
                }) : products.map(p => ({ label: p.name, value: p.name }))}
                selected={editingItem.selectedSubProducts}
                onChange={(subs) => setEditingItem({ ...editingItem, selectedSubProducts: subs })}
                color="amber"
                allLabel="All Products / Sub-Products"
              />

              {/* Multi-Select Dropdown: Income Profile in Edit Modal */}
              <MultiSelectDropdown
                label="Income Profile Option"
                icon={Briefcase}
                options={profiles.length > 0 ? profiles.map(p => ({ label: p.name, value: p.name })) : [
                  { label: 'Salaried', value: 'Salaried' },
                  { label: 'Self Employed Professional', value: 'Self Employed Professional' },
                  { label: 'Self Employed Non-Professional', value: 'Self Employed Non-Professional' },
                  { label: 'Rental Income', value: 'Rental Income' },
                ]}
                selected={editingItem.selectedProfiles}
                onChange={(profs) => setEditingItem({ ...editingItem, selectedProfiles: profs })}
                color="emerald"
                allLabel="All Income Profiles"
              />

              {/* Multi-Select Dropdown: Customer Type in Edit Modal */}
              <MultiSelectDropdown
                label="Customer Type"
                icon={Users2}
                options={customerTypes.length > 0 ? customerTypes.map(c => ({ label: c.name, value: c.name })) : [
                  { label: 'Individual', value: 'Individual' },
                  { label: 'Proprietorship', value: 'Proprietorship' },
                  { label: 'Partnership', value: 'Partnership' },
                  { label: 'Pvt Ltd', value: 'Pvt Ltd' },
                  { label: 'Public Ltd', value: 'Public Ltd' },
                  { label: 'HUF', value: 'HUF' },
                ]}
                selected={editingItem.selectedCustomerTypes}
                onChange={(custs) => setEditingItem({ ...editingItem, selectedCustomerTypes: custs })}
                color="purple"
                allLabel="All Customer Types"
              />

              {/* Multi-Select Dropdown: Workflow Stages in Edit Modal */}
              <MultiSelectDropdown
                label="Workflow Stages"
                icon={Layers}
                options={workflowStages.length > 0 ? workflowStages.map(s => ({
                  label: `Stage ${s.stageNumber}: ${s.name}`,
                  value: String(s.stageNumber),
                })) : [
                  { label: 'Stage 1 (Login Docs)', value: '1' },
                  { label: 'Stage 2 (Sanction Docs)', value: '2' },
                  { label: 'Stage 3 (Disbursal Docs)', value: '3' },
                  { label: 'Stage 4 (Post-Disbursal)', value: '4' },
                ]}
                selected={editingItem.selectedStages.map(String)}
                onChange={(vals) => setEditingItem({
                  ...editingItem,
                  selectedStages: vals.map(v => parseInt(v)).filter(n => !isNaN(n)),
                  stage: vals.length > 0 ? parseInt(vals[0]) : 1,
                })}
                color="sky"
                allLabel="All Stages (1 to 4)"
              />

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
                  data-submit-btn="true"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
