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
  Tag,
  GitFork,
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  createSubProductAction,
  updateSubProductAction,
  deleteSubProductAction,
} from '@/app/actions';

export interface SubProductItem {
  id: string;
  name: string;
  productId: string;
}

export interface ProductItem {
  id: string;
  name: string;
  createdAt: Date | string;
  subProducts?: SubProductItem[];
}

export default function ProductManagementClient({
  initialProducts,
}: {
  initialProducts: ProductItem[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');

  // New Product Form State
  const [newProductName, setNewProductName] = useState('');
  const [newSubProductsText, setNewSubProductsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline Sub-Product Input state per product: { [productId]: string }
  const [inlineSubProductInputs, setInlineSubProductInputs] = useState<Record<string, string>>({});
  const [subProductLoading, setSubProductLoading] = useState<Record<string, boolean>>({});

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Edit Sub-Product Modal State
  const [editingSubProduct, setEditingSubProduct] = useState<{ id: string; name: string; productId: string; productName?: string } | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubProductId, setEditSubProductId] = useState('');
  const [editSubLoading, setEditSubLoading] = useState(false);
  const [editSubError, setEditSubError] = useState('');

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.subProducts?.some((sp) => sp.name.toLowerCase().includes(q))) return true;
    return false;
  });

  const totalSubProductsCount = products.reduce(
    (acc, p) => acc + (p.subProducts?.length || 0),
    0
  );

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const initialSubList = newSubProductsText
      ? newSubProductsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      const res = await createProductAction(newProductName.trim(), initialSubList);
      setLoading(false);
      if (res.success && res.product) {
        setProducts(
          [...products, res.product as any].sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewProductName('');
        setNewSubProductsText('');
        setSuccessMsg(
          `Product "${res.product.name}" created successfully with ${
            res.product.subProducts?.length || 0
          } sub-product(s).`
        );
        setTimeout(() => setSuccessMsg(''), 5000);
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
      const res = await updateProductAction(editingProduct.id, editName.trim());
      setEditLoading(false);
      if (res.success && res.product) {
        setProducts(
          products
            .map((item) =>
              item.id === editingProduct.id
                ? { ...item, name: res.product!.name }
                : item
            )
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

  const handleDeleteProduct = async (p: ProductItem) => {
    const subCount = p.subProducts?.length || 0;
    const confirmText = subCount > 0
      ? `Are you sure you want to delete "${p.name}" and its ${subCount} sub-product(s)?`
      : `Are you sure you want to delete "${p.name}"?`;

    if (!confirm(confirmText)) return;

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

  // Inline Add Sub-Product to existing product
  const handleAddInlineSubProduct = async (productId: string) => {
    const subName = (inlineSubProductInputs[productId] || '').trim();
    if (!subName) return;

    setSubProductLoading({ ...subProductLoading, [productId]: true });

    const res = await createSubProductAction({
      productId,
      name: subName,
    });

    setSubProductLoading({ ...subProductLoading, [productId]: false });

    if (res.success && res.subProduct) {
      setProducts(
        products.map((p) => {
          if (p.id === productId) {
            const currentSubs = p.subProducts || [];
            return {
              ...p,
              subProducts: [...currentSubs, res.subProduct!].sort((a, b) =>
                a.name.localeCompare(b.name)
              ),
            };
          }
          return p;
        })
      );
      setInlineSubProductInputs({ ...inlineSubProductInputs, [productId]: '' });
      router.refresh();
    } else {
      alert(res.error || 'Failed to add sub-product');
    }
  };

  // Delete Sub-Product
  const handleDeleteSubProduct = async (productId: string, subId: string, subName: string) => {
    if (!confirm(`Delete sub-product "${subName}"?`)) return;

    const res = await deleteSubProductAction(subId);
    if (res.success) {
      setProducts(
        products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              subProducts: (p.subProducts || []).filter((s) => s.id !== subId),
            };
          }
          return p;
        })
      );
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete sub-product');
    }
  };

  // Update Sub-Product
  const handleUpdateSubProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubProduct || !editSubName.trim()) return;

    setEditSubLoading(true);
    setEditSubError('');

    try {
      const targetPid = editSubProductId || editingSubProduct.productId;
      const res = await updateSubProductAction(editingSubProduct.id, {
        name: editSubName.trim(),
        productId: targetPid,
      });
      setEditSubLoading(false);

      if (res.success && res.subProduct) {
        const oldPid = editingSubProduct.productId;
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === oldPid && oldPid !== targetPid) {
              return {
                ...p,
                subProducts: (p.subProducts || []).filter((s) => s.id !== editingSubProduct.id),
              };
            }
            if (p.id === targetPid) {
              const remaining = (p.subProducts || []).filter((s) => s.id !== editingSubProduct.id);
              return {
                ...p,
                subProducts: [...remaining, res.subProduct!].sort((a, b) =>
                  a.name.localeCompare(b.name)
                ),
              };
            }
            return p;
          })
        );
        setEditingSubProduct(null);
        router.refresh();
      } else {
        setEditSubError(res.error || 'Failed to update sub-product.');
      }
    } catch (err: any) {
      setEditSubLoading(false);
      setEditSubError(err.message || 'Error updating sub-product.');
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
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Loan Products & Sub-Products Master
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage primary loan products and their underlying sub-products. Sub-products automatically populate across Case Intake forms and Dynamic Checklist rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="text-lg font-black text-sky-600 dark:text-sky-400 leading-none">
              {products.length}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Products
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {totalSubProductsCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Sub-Products
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-sky-500" /> Add New Loan Product & Initial Sub-Products
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create a parent loan category and optionally pre-fill its sub-products (comma-separated).
          </p>
        </div>

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

        <form onSubmit={handleCreateProduct} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Commercial Purchase Loan, Doctor Loan"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sub-Products <span className="text-[10px] text-slate-400 font-normal">(Optional, comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shop Purchase, Office Loan, Commercial Plot"
                value={newSubProductsText}
                onChange={(e) => setNewSubProductsText(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              💡 You can also add and manage sub-products anytime inline under each product below.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all hover:scale-[1.01] disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : '+ Create Product'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search products or sub-products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Showing {filteredProducts.length} of {products.length} Products
        </div>
      </div>

      {/* Products & Sub-Products List (Cards) */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-sm">No products matched your search.</p>
            <p className="text-xs">Try clearing the search query or create a new loan product above.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const subs = p.subProducts || [];
            const inlineVal = inlineSubProductInputs[p.id] || '';
            const isSubAdding = subProductLoading[p.id] || false;

            return (
              <div
                key={p.id}
                className="glass-panel p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Product Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm shrink-0 border border-sky-500/20">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {p.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {subs.length} Sub-Product{subs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                        <span className="font-mono text-[10px]">ID: {p.id}</span>
                        <span>•</span>
                        <span>
                          Created:{' '}
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Product Name"
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      title="Delete Product"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-Products Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-indigo-500" />
                      Sub-Products / Loan Variants:
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {subs.length === 0 ? 'No sub-products defined yet' : `${subs.length} configured`}
                    </span>
                  </div>

                  {/* Sub-Product Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {subs.map((sp) => (
                      <div
                        key={sp.id}
                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 transition-all shadow-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>{sp.name}</span>
                        <button
                          onClick={() => {
                            setEditingSubProduct({
                              id: sp.id,
                              name: sp.name,
                              productId: p.id,
                              productName: p.name,
                            });
                            setEditSubName(sp.name);
                            setEditSubProductId(p.id);
                            setEditSubError('');
                          }}
                          className="ml-1 p-0.5 rounded-md text-slate-400 hover:text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors cursor-pointer"
                          title={`Edit Sub-Product "${sp.name}"`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubProduct(p.id, sp.id, sp.name)}
                          className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                          title={`Delete Sub-Product "${sp.name}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Inline Quick Add Field */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="+ Add sub-product..."
                        value={inlineVal}
                        onChange={(e) =>
                          setInlineSubProductInputs({
                            ...inlineSubProductInputs,
                            [p.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInlineSubProduct(p.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl glass-input text-xs font-medium w-48 focus:w-60 transition-all"
                      />
                      <button
                        onClick={() => handleAddInlineSubProduct(p.id)}
                        disabled={!inlineVal.trim() || isSubAdding}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40"
                      >
                        {isSubAdding ? '...' : '+ Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-500" /> Edit Product Name
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
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
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Sub-Product Modal */}
      {editingSubProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-500" /> Edit Sub-Product / Variant
              </h3>
              <button
                onClick={() => setEditingSubProduct(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSubError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editSubError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Loan Product
                </label>
                <select
                  value={editSubProductId}
                  onChange={(e) => setEditSubProductId(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sub-Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resale Property / Balance Transfer"
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSubProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {editSubLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
