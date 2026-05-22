import React, { useState } from 'react';
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
  onDeleteCategory
}: ProductsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  const [stockQty, setStockQty] = useState('100');
  const [unit, setUnit] = useState('PCS');

  const filterCategories = ['All', ...categories];

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setCategory(categories[0] || 'Software Services');
    setPrice('');
    setGstPercent('18');
    setHsnSac('994912');
    setStockQty('100');
    setUnit('HRS');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setPrice(String(p.price));
    setGstPercent(String(p.gstPercent));
    setHsnSac(p.hsnSac);
    setStockQty(String(p.stockQty));
    setUnit(p.unit);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !gstPercent || !hsnSac) {
      alert("Name, Price, GST % and HSN/SAC are mandatory values!");
      return;
    }

    const payload: Partial<Product> = {
      name,
      sku,
      category,
      price: Number(price),
      gstPercent: Number(gstPercent),
      hsnSac,
      stockQty: Number(stockQty),
      unit
    };

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, payload);
    } else {
      await onAddProduct(payload);
    }
    setIsModalOpen(false);
  };

  // Category Actions
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      alert(err.message || "Failed to create category");
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
    if (cat.toLowerCase() === 'uncategorized') {
      alert("The default category 'Uncategorized' cannot be deleted.");
      return;
    }
    const linkedProductsCount = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
    const confirmMessage = linkedProductsCount > 0 
      ? `Are you sure you want to delete category "${cat}"? This will move ${linkedProductsCount} linked catalog product(s) to "Uncategorized".`
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
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.hsnSac.includes(searchTerm);
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
          <p className="text-sm text-slate-500">Manage tax codes, HSN alignments, and pricing configurations.</p>
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
              placeholder="Search by name, SKU, HSN/SAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => setSelectedCategory(cat)}
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
        {filteredProducts.map((p) => (
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
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#E5E7EB] text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Price Limit / Rate</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">{formatCurrency(p.price)}</span>
                  <span className="text-[10px] text-slate-400 uppercase"> / {p.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">GST Rate (SAC/HSN)</span>
                  <span className="font-bold font-sans text-indigo-700 text-sm">{p.gstPercent}%</span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">HSN: {p.hsnSac}</span>
                </div>
              </div>

              {/* Stock Indicator */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 font-medium font-mono">CODE: {p.sku}</span>
                <div className="flex items-center gap-1.5">
                  {p.stockQty < 15 ? (
                    <div className="flex items-center gap-1 text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{p.stockQty} low</span>
                    </div>
                  ) : (
                    <div className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{p.stockQty} ready</span>
                    </div>
                  )}
                </div>
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
          <package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 text-sm">No items in chosen catalog</h4>
          <p className="text-xs text-slate-400 mt-1">Refine your search tags or register a fresh product scope directly.</p>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-[#E5E7EB]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">{editingProduct ? 'Modify Catalog Item' : 'New Catalog Item Listing'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">SKU / ITEM CODE</label>
                  <input 
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">SAC / HSN CODE *</label>
                  <input 
                    type="text"
                    required
                    maxLength={8}
                    placeholder="e.g. 998313"
                    value={hsnSac}
                    onChange={(e) => setHsnSac(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Applicable GST Rate *</label>
                  <select 
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="5">5% (GST Lower rate)</option>
                    <option value="12">12% (Standard secondary rate)</option>
                    <option value="18">18% (Standard service rate)</option>
                    <option value="28">28% (Luxuries and high assets rate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">Stock / Target Limits</label>
                  <input 
                    type="number"
                    required
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Selling Unit</label>
                  <input 
                    type="text"
                    placeholder="e.g. HRS, PCS, UNITS"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="gradient-btn px-5 py-2 text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Confirm Catalogue Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY CRUD DIALOG */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" id="category-crud-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl border border-[#E5E7EB]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">Category Configuration Master</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryName(null);
                }} 
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                    className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    id="new-category-input"
                  />
                  <button
                    type="submit"
                    className="gradient-btn rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    id="submit-new-category-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create</span>
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
                              className="flex-1 text-xs p-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end">
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
          </div>
        </div>
      )}
    </div>
  );
}
