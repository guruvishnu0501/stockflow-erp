import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit2, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { Material, Category, Warehouse, Vendor } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MaterialModal } from './MaterialModal';
import { useAuth } from '../../context/AuthContext';

export const MaterialList: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['Admin', 'Procurement Manager', 'Inventory Manager']);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, catRes, whRes, venRes] = await Promise.all([
        api.get('/materials'),
        api.get('/categories'),
        api.get('/warehouses'),
        api.get('/vendors'),
      ]);
      setMaterials(matRes.data);
      setCategories(catRes.data);
      setWarehouses(whRes.data);
      setVendors(venRes.data);
    } catch (err) {
      console.error('Error fetching materials master', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered materials
  const filtered = materials.filter((m) => {
    const matchesSearch =
      m.material_code.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory ? m.category_id === Number(selectedCategory) : true;
    const matchesStatus = selectedStatus ? m.stock_status === selectedStatus : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCSV = () => {
    window.open('/api/v1/materials/export/csv', '_blank');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Master (MM)"
        subtitle="Centralized SAP MM item registry, bill of materials properties, stock limits, and valuation"
        sapModuleTag="SAP MM Master Data"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, name, SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
          >
            <option value="">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Overstock">Overstock</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingSpinner message="Loading Material Master registry..." />
      ) : paginated.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No materials found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or create a new material.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Material Code / SKU</th>
                  <th className="py-3 px-4">Name & Category</th>
                  <th className="py-3 px-4 text-right">Cost / Sell Price</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Reorder Point</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Warehouse</th>
                  {canEdit && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginated.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 font-mono block">{m.material_code}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{m.sku}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{m.name}</span>
                      <span className="text-[10px] text-blue-600 font-medium block">
                        {m.category_name || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900 block">{formatCurrency(m.selling_price)}</span>
                      <span className="text-[10px] text-slate-500 block">Cost: {formatCurrency(m.purchase_price)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900">
                        {m.total_stock} <span className="text-[10px] font-normal text-slate-500">{m.uom}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-slate-600 font-medium">{m.reorder_level} {m.uom}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={m.stock_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {m.warehouse_name || 'Central CDC'}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingMaterial(m);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} materials
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        material={editingMaterial}
        onSuccess={fetchData}
        categories={categories}
        warehouses={warehouses}
        vendors={vendors}
      />
    </div>
  );
};
