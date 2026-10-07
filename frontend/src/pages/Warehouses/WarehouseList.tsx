import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, MapPin, User, Plus, Eye, Boxes, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const WarehouseList: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedWhInventory, setSelectedWhInventory] = useState<any | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    manager_name: '',
    capacity: 25000,
  });

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/warehouses', {
        ...formData,
        capacity: Number(formData.capacity),
      });
      success('Warehouse facility registered');
      setIsAddOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create warehouse');
    }
  };

  const viewWarehouseStock = async (id: number) => {
    try {
      const res = await api.get(`/warehouses/${id}/inventory`);
      setSelectedWhInventory(res.data);
      setIsInventoryOpen(true);
    } catch (err) {
      error('Could not fetch warehouse stock profile');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Stock Locations"
        subtitle="Multi-depot storage nodes, fulfillment hubs, capacity allocation, and inventory distribution"
        sapModuleTag="SAP MM Logistics Locations"
        actions={
          isAdmin && (
            <button
              onClick={() => {
                setFormData({
                  code: `WH-${Math.floor(100 + Math.random() * 900)}`,
                  name: '',
                  location: '',
                  manager_name: '',
                  capacity: 30000,
                });
                setIsAddOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          )
        }
      />

      {loading ? (
        <LoadingSpinner message="Loading warehouse facilities..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <WarehouseIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{w.name}</h3>
                      <span className="font-mono text-[10px] text-blue-600 font-bold">{w.code}</span>
                    </div>
                  </div>
                  <Badge status={w.status} size="sm" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{w.location}</span>
                  </div>
                  {w.manager_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Manager: {w.manager_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Storage Capacity:</span>
                    <span className="font-bold text-slate-900">{w.capacity.toLocaleString()} units</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Active Storage Unit</span>
                <button
                  onClick={() => viewWarehouseStock(w.id)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Stock Matrix
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Warehouse Facility"
        subtitle="Register new physical distribution center or regional logistics hub"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
                placeholder="e.g. South Fulfillment Depot"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">City, State / Location *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Dallas, TX, USA"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Manager</label>
              <input
                type="text"
                value={formData.manager_name}
                onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capacity (Units)</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Save Warehouse
            </button>
          </div>
        </form>
      </Modal>

      {/* Warehouse Stock Modal */}
      {selectedWhInventory && (
        <Modal
          isOpen={isInventoryOpen}
          onClose={() => setIsInventoryOpen(false)}
          title={`Facility Stock Matrix: ${selectedWhInventory.warehouse.name}`}
          subtitle={`Location: ${selectedWhInventory.warehouse.location} • Total Stock: ${selectedWhInventory.total_stock_quantity.toLocaleString()} units`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total SKUs Stored:</span>
                <span className="text-base font-bold text-slate-900">{selectedWhInventory.total_items_count} Materials</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Warehouse Inventory Value:</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(selectedWhInventory.total_valuation)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3 text-center">On Hand</th>
                    <th className="py-2.5 px-3 text-center">Available (ATP)</th>
                    <th className="py-2.5 px-3 text-right">Valuation</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedWhInventory.items.map((it: any) => (
                    <tr key={it.material_id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{it.material_name}</span>
                        <span className="font-mono text-[10px] text-blue-600 block">{it.material_code}</span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {it.quantity_on_hand} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">
                        {it.quantity_available} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(it.valuation)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Badge status={it.stock_status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInventoryOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
