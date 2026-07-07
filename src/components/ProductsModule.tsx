import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Tag, 
  ShieldCheck, 
  Layers,
  X,
  PlusCircle,
  Save,
  Check
} from 'lucide-react';
import { Product } from '../types';
import Pagination from './Pagination';

interface ProductsModuleProps {
  products: Product[];
  onAddProduct: (product: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  canWrite?: boolean;
  canDelete?: boolean;
  categories: string[];
  onAddCategory: (name: string) => Promise<void>;
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
  businessSettings: any;
}

export default function ProductsModule({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  canWrite = true,
  canDelete = true,
  categories = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  businessSettings
}: ProductsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // Category Configuration Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [updatedCategoryName, setUpdatedCategoryName] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Software Services');
  const [price, setPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [hsnSac, setHsnSac] = useState('');
  const [stockQty, setStockQty] = useState('999');
  const [unit, setUnit] = useState('');

  const filterCategories = ['All', ...categories];

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setCategory(categories[0] || 'Software Services');
    setPrice('');
    setGstPercent(businessSettings?.gstOption === 'zero_tax' ? '0' : '18');
    setHsnSac('');
    setStockQty('999');
    setUnit('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setCategory(p.category);
    setPrice(String(p.price));
    setGstPercent(businessSettings?.gstOption === 'zero_tax' ? '0' : String(p.gstPercent || '0'));
    setHsnSac(p.hsnSac || '');
    setStockQty(String(p.stockQty || '999'));
    setUnit(p.unit || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name || !price) {
      alert("Name and Price are mandatory values!");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Product> = {
        name,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        price: Number(price),
        gstPercent: businessSettings?.gstOption === 'zero_tax' ? 0 : Number(gstPercent),
        hsnSac: hsnSac || '',
        stockQty: Number(stockQty) || 999,
        unit: unit || ''
      };

      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while saving product details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Category Actions
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newCategoryName.trim()) return;
    
    setIsSaving(true);
    try {
      await onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartRenameCategory = (cat: string) => {
    setEditingCategoryName(cat);
    setUpdatedCategoryName(cat);
  };

  const handleSaveRenameCategory = async (oldName: string) => {
    const trimmed = updatedCategoryName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCategoryName(null);
      return;
    }
    try {
      await onUpdateCategory(oldName, trimmed);
      setEditingCategoryName(null);
    } catch (err: any) {
      alert(err.message || "Failed to rename category");
    }
  };

  const handleDeleteCategoryClick = async (cat: string) => {
    const fallbackCategory = categories.find(c => c.toLowerCase() !== cat.toLowerCase()) || 'General';
    const linkedProductsCount = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
    const confirmMessage = linkedProductsCount > 0 
      ? `Are you sure you want to delete category "${cat}"? This will move ${linkedProductsCount} linked catalog product(s) to "${fallbackCategory}".`
      : `Are you sure you want to delete the category "${cat}" permanently?`;
      
    if (confirm(confirmMessage)) {
      try {
        await onDeleteCategory(cat);
        if (selectedCategory === cat) {
          setSelectedCategory('All');
        }
      } catch (err: any) {
        alert(err.message || "Failed to delete category");
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6" id="products-module-container">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Products</h1>
          <p className="text-sm text-slate-500">Manage catalog deliverables, categories, and item pricing configurations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
              id="manage-categories-btn"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Manage Categories</span>
            </button>
          )}
          {canWrite && (
            <button 
              onClick={handleOpenAdd}
              className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              id="add-product-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Catalogue Item</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              id="product-search-input"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing <b className="text-slate-800">{filteredProducts.length}</b> products / services
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E7EB]">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-purple-50 border border-purple-200 text-purple-700' 
                  : 'bg-slate-50 border border-[#E5E7EB] text-slate-500 hover:bg-slate-100/70 hover:text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="products-cards-grid">
        {filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p) => (
          <div 
            key={p.id}
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">{p.category}</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2 line-clamp-2 min-h-10 font-display" title={p.name}>{p.name}</h3>
                </div>
                <div className="p-2 bg-indigo-50/50 rounded-xl text-indigo-600 border border-indigo-100 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              {/* Price and GST details */}
              <div className={`grid ${businessSettings?.gstOption === 'zero_tax' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 py-3 border-y border-[#E5E7EB] text-xs`}>
                <div>
                  <span className="text-slate-400 font-medium block">Price Limit / Rate</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">{formatCurrency(p.price)}</span>
                </div>
                {businessSettings?.gstOption !== 'zero_tax' && (
                  <div>
                    <span className="text-slate-400 font-medium block">GST Rate</span>
                    <span className="font-bold font-sans text-indigo-700 text-sm">{p.gstPercent}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-slate-50/50 px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3 shrink-0">
              {canWrite && (
                <button 
                  onClick={() => handleOpenEdit(p)}
                  className="p-1 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg flex items-center gap-1 transition"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={() => {
                    if(confirm(`Remove catalog description ${p.name} permanently?`)) {
                      onDeleteProduct(p.id);
                    }
                  }}
                  className="p-1 px-2.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 bg-white rounded-lg flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 col-span-full">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-sm">No items in chosen catalog</h4>
          <p className="text-xs text-slate-400 mt-1">Refine your search tags or register a fresh product scope directly.</p>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={filteredProducts.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* FORM MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
              <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
              <motion.div 
                key="product-edit-modal"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col my-auto max-h-[85vh] md:max-h-[90vh] z-10 text-slate-800"
              >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base font-display">{editingProduct ? 'Modify Catalog Item' : 'New Catalog Item Listing'}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Item / Service Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Oracle Database Audit Retainer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className={`grid ${businessSettings?.gstOption === 'zero_tax' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Price Limit (INR) *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 150000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  {businessSettings?.gstOption !== 'zero_tax' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Applicable GST Rate *</label>
                      <select 
                        value={gstPercent}
                        onChange={(e) => setGstPercent(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="0">0% (GST Exempt / Nil Rate)</option>
                        <option value="5">5% (GST Lower rate)</option>
                        <option value="12">12% (Standard secondary rate)</option>
                        <option value="18">18% (Standard service rate)</option>
                        <option value="28">28% (Luxuries and high assets rate)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Product Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving...
                      </>
                    ) : (
                      editingProduct ? 'Save Changes' : 'Confirm Catalogue Item'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* CATEGORY CRUD DIALOG */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans" id="category-crud-modal">
              <div className="fixed inset-0" onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryName(null); }} />
              <motion.div 
                key="category-crud-modal-content"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-auto max-h-[85vh] md:max-h-[90vh] z-10 text-slate-800"
              >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base font-display">Category Configuration Master</h3>
                </div>
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryName(null);
                  }} 
                  className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* CREATE ACTION */}
                <form onSubmit={handleCreateCategorySubmit} className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase block font-sans">Add Product / Service Category</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Consulting Services"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-slate-800"
                      id="new-category-input"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="gradient-btn rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                      id="submit-new-category-btn"
                    >
                      {isSaving ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'Creating...' : 'Create'}</span>
                    </button>
                  </div>
                </form>

                {/* READ / UPDATE / DELETE CONTAINER */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans pb-1 border-b border-slate-100">
                    Active Asset Categories ({categories.length})
                  </div>

                  <div className="max-h-64 overflow-y-auto pr-1 space-y-2" id="category-items-list">
                    {categories.map((cat) => {
                      const linkedCount = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                      const isEditing = editingCategoryName === cat;

                      return (
                        <div 
                          key={cat} 
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-50/80 transition"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                              <input 
                                type="text"
                                value={updatedCategoryName}
                                onChange={(e) => setUpdatedCategoryName(e.target.value)}
                                className="flex-1 text-xs p-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRenameCategory(cat)}
                                className="p-1 px-2.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingCategoryName(null)}
                                className="p-1 px-2 text-[10px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 bg-white rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-800">{cat}</span>
                                <span className="text-[10px] text-slate-400 font-medium font-mono">
                                  {linkedCount} linked catalog {linkedCount === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* UPDATE ACTION GRID TRIGGER */}
                                <button 
                                  onClick={() => handleStartRenameCategory(cat)}
                                  className="p-1 px-2 text-[10px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  title="Rename Category"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Rename</span>
                                </button>
                                
                                {/* DELETE ACTION GRID TRIGGER */}
                                <button 
                                  onClick={() => handleDeleteCategoryClick(cat)}
                                  className="p-1 px-2 text-[10px] font-medium text-rose-600 hover:text-rose-700 border border-rose-200 bg-white rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {categories.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No categories registered yet. Use the fields above to align catalog properties.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryName(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
}
