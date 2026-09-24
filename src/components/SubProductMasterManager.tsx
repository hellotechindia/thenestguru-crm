'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSubProductAction,
  updateSubProductAction,
  deleteSubProductAction,
} from '@/app/actions';
import {
  GitFork,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  ShieldAlert,
  Pencil,
} from 'lucide-react';

export interface ProductItem {
  id: string;
  name: string;
}

export interface SubProductItem {
  id: string;
  name: string;
  productId: string;
  product?: { id: string; name: string };
}

interface Props {
  products: ProductItem[];
  initialSubProducts: SubProductItem[];
}

export default function SubProductMasterManager({ products = [], initialSubProducts = [] }: Props) {
  const router = useRouter();
  const [subProducts, setSubProducts] = useState<SubProductItem[]>(initialSubProducts);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    productId: products[0]?.id || '',
    name: '',
  });

  // Edit State
  const [editingSubProduct, setEditingSubProduct] = useState<SubProductItem | null>(null);
  const [editForm, setEditForm] = useState({
    productId: products[0]?.id || '',
    name: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const filteredSubProducts = subProducts.filter((sp) => {
    if (selectedProductFilter === 'ALL') return true;
    return sp.productId === selectedProductFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.name.trim()) {
      setError('Please select a parent Product and specify Sub-Product name.');
      return;
    }

    setLoading(true);
    setError('');
    const res = await createSubProductAction({
      productId: form.productId,
      name: form.name.trim(),
    });
    setLoading(false);

    if (res.success && res.subProduct) {
      const parentProd = products.find((p) => p.id === form.productId);
      const newSp = { ...res.subProduct, product: parentProd };
      setSubProducts([...subProducts, newSp as any].sort((a, b) => a.name.localeCompare(b.name)));
      setIsModalOpen(false);
      setForm({ productId: products[0]?.id || '', name: '' });
      setSuccess('Sub-Product added successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setError(res.error || 'Failed to add Sub-Product.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubProduct || !editForm.productId || !editForm.name.trim()) {
      setEditError('Please select a parent Product and specify Sub-Product name.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    const res = await updateSubProductAction(editingSubProduct.id, {
      productId: editForm.productId,
      name: editForm.name.trim(),
    });
    setEditLoading(false);

    if (res.success && res.subProduct) {
      const parentProd = products.find((p) => p.id === editForm.productId);
      const updatedSp = { ...res.subProduct, product: parentProd };
      setSubProducts(
        subProducts
          .map((sp) => (sp.id === editingSubProduct.id ? (updatedSp as any) : sp))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingSubProduct(null);
      setSuccess('Sub-Product updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update Sub-Product.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Sub-Product "${name}"?`)) return;

    const res = await deleteSubProductAction(id);
    if (res.success) {
      setSubProducts(subProducts.filter((sp) => sp.id !== id));
      setSuccess('Sub-Product deleted successfully!');
      setTimeout(() => setSuccess(''), 4000);
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete Sub-Product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-600" />
            Sub-Products Master Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure granular sub-products (e.g., Plot Purchase, Resale Home, Balance Transfer) linked to Loan Products
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Sub-Product
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedProductFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedProductFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          All Products ({subProducts.length})
        </button>
        {products.map((p) => {
          const count = subProducts.filter((sp) => sp.productId === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProductFilter(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedProductFilter === p.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {p.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Sub-Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredSubProducts.length > 0 ? (
          filteredSubProducts.map((sp) => (
            <div
              key={sp.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {sp.product?.name || 'Loan Product'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSubProduct(sp);
                        setEditForm({
                          productId: sp.productId,
                          name: sp.name,
                        });
                        setEditError('');
                      }}
                      className="p-1 rounded-lg hover:bg-sky-500/10 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
                      title="Edit Sub-Product"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(sp.id, sp.name)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Delete Sub-Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                  {sp.name}
                </h3>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                Available in Lead Intake
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs italic">
            No sub-products configured for this selection.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitFork className="w-5 h-5 text-indigo-600" />
                Add Sub-Product
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Main Loan Product *
                </label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sub-Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plot Purchase + Construction"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Sub-Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-Product Modal */}
      {editingSubProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-500" />
                Edit Sub-Product
              </h3>
              <button
                onClick={() => setEditingSubProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Main Loan Product *
                </label>
                <select
                  required
                  value={editForm.productId}
                  onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sub-Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plot Purchase + Construction"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSubProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
