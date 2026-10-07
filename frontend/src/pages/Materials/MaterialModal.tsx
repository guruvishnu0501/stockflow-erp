import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Material, Category, Warehouse, Vendor } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSuccess: () => void;
  categories: Category[];
  warehouses: Warehouse[];
  vendors: Vendor[];
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  material,
  onSuccess,
  categories,
  warehouses,
  vendors,
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    material_code: '',
    name: '',
    description: '',
    category_id: '' as string | number,
    subcategory: '',
    sku: '',
    uom: 'PC',
    purchase_price: 0,
    selling_price: 0,
    tax_rate: 18.0,
    min_stock_level: 10,
    max_stock_level: 1000,
    reorder_level: 25,
    default_warehouse_id: '' as string | number,
    primary_vendor_id: '' as string | number,
    initial_stock: 0,
  });

  useEffect(() => {
    if (material) {
      setFormData({
        material_code: material.material_code,
        name: material.name,
        description: material.description || '',
        category_id: material.category_id || '',
        subcategory: material.subcategory || '',
        sku: material.sku,
        uom: material.uom,
        purchase_price: material.purchase_price,
        selling_price: material.selling_price,
        tax_rate: material.tax_rate,
        min_stock_level: material.min_stock_level,
        max_stock_level: material.max_stock_level,
        reorder_level: material.reorder_level,
        default_warehouse_id: material.default_warehouse_id || '',
        primary_vendor_id: material.primary_vendor_id || '',
        initial_stock: 0,
      });
    } else {
      setFormData({
        material_code: `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        description: '',
        category_id: categories[0]?.id || '',
        subcategory: '',
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        uom: 'PC',
        purchase_price: 10.0,
        selling_price: 25.0,
        tax_rate: 18.0,
        min_stock_level: 10,
        max_stock_level: 1000,
        reorder_level: 25,
        default_warehouse_id: warehouses[0]?.id || '',
        primary_vendor_id: vendors[0]?.id || '',
        initial_stock: 50,
      });
    }
  }, [material, categories, warehouses, vendors, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        default_warehouse_id: formData.default_warehouse_id ? Number(formData.default_warehouse_id) : null,
        primary_vendor_id: formData.primary_vendor_id ? Number(formData.primary_vendor_id) : null,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        tax_rate: Number(formData.tax_rate),
        min_stock_level: Number(formData.min_stock_level),
        max_stock_level: Number(formData.max_stock_level),
        reorder_level: Number(formData.reorder_level),
        initial_stock: Number(formData.initial_stock),
      };

      if (material) {
        await api.put(`/materials/${material.id}`, payload);
        success('Material Master updated successfully');
      } else {
        await api.post('/materials', payload);
        success('New Material Master created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to save Material Master');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={material ? `Edit Material: ${material.material_code}` : 'Create Material Master (SAP MM)'}
      subtitle="Define material attributes, classification, safety buffers, and pricing"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material Code *</label>
            <input
              type="text"
              required
              disabled={!!material}
              value={formData.material_code}
              onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">SKU *</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg border-slate-300"
            placeholder="e.g. ESP32-S3 Microcontroller Board"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg border-slate-300"
            placeholder="Technical specs and application details"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
            <input
              type="text"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UoM)</label>
            <select
              value={formData.uom}
              onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            >
              <option value="PC">PC (Pieces)</option>
              <option value="KG">KG (Kilograms)</option>
              <option value="MTR">MTR (Meters)</option>
              <option value="LTR">LTR (Liters)</option>
              <option value="BOX">BOX (Box/Kit)</option>
            </select>
          </div>
        </div>

        {/* Pricing & Tax */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Purchase Price ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            />
          </div>
        </div>

        {/* Inventory Control Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Min Safety Level</label>
            <input
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reorder Point</label>
            <input
              type="number"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Max Capacity Level</label>
            <input
              type="number"
              value={formData.max_stock_level}
              onChange={(e) => setFormData({ ...formData, max_stock_level: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>
        </div>

        {/* Default Warehouse & Primary Vendor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Default Warehouse</label>
            <select
              value={formData.default_warehouse_id}
              onChange={(e) => setFormData({ ...formData, default_warehouse_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            >
              <option value="">None</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Vendor</label>
            <select
              value={formData.primary_vendor_id}
              onChange={(e) => setFormData({ ...formData, primary_vendor_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            >
              <option value="">None</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.company_name} ({v.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Initial Stock only when creating */}
        {!material && (
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80">
            <label className="block font-semibold text-blue-900 mb-1">Initial Opening Stock Allocation</label>
            <input
              type="number"
              value={formData.initial_stock}
              onChange={(e) => setFormData({ ...formData, initial_stock: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg border-blue-300 bg-white"
              placeholder="Initial stock balance"
            />
            <p className="text-[11px] text-blue-700 mt-1">
              Automatically creates opening inventory balance and Goods Receipt audit record.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? 'Saving Material...' : material ? 'Update Material' : 'Create Material'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
