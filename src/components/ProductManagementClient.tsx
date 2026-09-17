'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  FileCheck2,
  FolderCheck,
  Tag
} from 'lucide-react';
import { 
  createProductAction, 
  updateProductAction, 
  deleteProductAction 
} from '@/app/actions';

interface ProductItem {
  id: string;
  name: string;
  createdAt: Date | string;
}

export default function ProductManagementClient({ initialProducts }: { initialProducts: ProductItem[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [newProductName, setNewProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await createProductAction(newProductName);
      setLoading(false);
      if (res.success && res.product) {
        setProducts([...products, res.product].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProductName('');
        setSuccessMsg('Product added successfully.');
        router.refresh();
      } else {
        setError(res.error || 'Failed to add product.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Error adding product.');
    }
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim()) return;

    setEditLoading(true);
    setEditError('');

    try {
      const res = await updateProductAction(editingProduct.id, editName);
      setEditLoading(false);
      if (res.success && res.product) {
        setProducts(
          products.map((item) => (item.id === editingProduct.id ? res.product! : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingProduct(null);
        router.refresh();
      } else {
        setEditError(res.error || 'Failed to update product.');
      }
    } catch (err: any) {
      setEditLoading(false);
      setEditError(err.message || 'Error updating product.');
    }
  };

  const handleDelete = async (p: ProductItem) => {
    if (!confirm(`Are you sure you want to delete "${p.name}"?`)) return;

    try {
      const res = await deleteProductAction(p.id);
      if (res.success) {
        setProducts(products.filter((item) => item.id !== p.id));
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete product.');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting product.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
              <Package className="w-3 h-3" /> Checklist Matrix Configuration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Loan Products Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure data-driven loan products. These automatically populate in Checklist Category setup and New Case Intake forms across the CRM.
          </p>
        </div>
      </div>

      {/* Add Product Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-500" /> Add New Loan Product
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="e.g. Commercial Purchase Loan, Home Loan, Overdraft"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            className="flex-1 glass-input px-4 py-2.5 rounded-xl text-xs font-semibold"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all hover:scale-[1.01] disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Adding...' : 'Add Product'}</span>
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Active Products ({products.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Managed products available in checklist & case intake
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4 font-bold">Product Name</th>
                <th className="py-3 px-4 font-bold">System Identifier</th>
                <th className="py-3 px-4 font-bold">Created Date</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No products found. Add your first loan product above.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {p.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product Name"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete Product"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-500" /> Edit Product Name
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                  placeholder="e.g. Home Loan"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
