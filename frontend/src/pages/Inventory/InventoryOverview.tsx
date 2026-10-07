import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  SlidersHorizontal,
  Warehouse as WarehouseIcon,
  Search,
  Filter,
  AlertTriangle,
  History,
} from 'lucide-react';
import api from '../../api/client';
import { InventoryItem, Material, Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const InventoryOverview: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canAdjust = hasRole(['Admin', 'Inventory Manager']);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Adjust Form State
  const [adjustMaterialId, setAdjustMaterialId] = useState<number>(1);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState<number>(1);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Annual Physical Inventory Count reconciliation');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Transfer Form State
  const [transferMaterialId, setTransferMaterialId] = useState<number>(1);
  const [transferSourceWhId, setTransferSourceWhId] = useState<number>(1);
  const [transferDestWhId, setTransferDestWhId] = useState<number>(2);
  const [transferQuantity, setTransferQuantity] = useState<number>(25);
  const [transferNotes, setTransferNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, whRes, matRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/warehouses'),
        api.get('/materials'),
      ]);
      setInventory(invRes.data);
      setWarehouses(whRes.data);
      setMaterials(matRes.data);
      if (whRes.data.length >= 2) {
        setTransferSourceWhId(whRes.data[0].id);
        setTransferDestWhId(whRes.data[1].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjust', {
        material_id: Number(adjustMaterialId),
        warehouse_id: Number(adjustWarehouseId),
        new_quantity: Number(adjustQuantity),
        reason: adjustReason,
        notes: adjustNotes,
      });
      success('Stock level adjusted and immutable audit record created');
      setIsAdjustOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Stock adjustment failed');
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferSourceWhId === transferDestWhId) {
      error('Source and destination warehouses must be different');
      return;
    }
    try {
      await api.post('/inventory/transfer', {
        material_id: Number(transferMaterialId),
        source_warehouse_id: Number(transferSourceWhId),
        dest_warehouse_id: Number(transferDestWhId),
        quantity: Number(transferQuantity),
        notes: transferNotes,
      });
      success('Stock successfully transferred between warehouses');
      setIsTransferOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Stock transfer failed');
    }
  };

  const filtered = inventory.filter((item) => {
    const matchesWh = selectedWarehouseId ? item.warehouse_id === Number(selectedWarehouseId) : true;
    const matchesSearch =
      item.material_code.toLowerCase().includes(search.toLowerCase()) ||
      item.material_name.toLowerCase().includes(search.toLowerCase());
    return matchesWh && matchesSearch;
  });

  const totalOnHand = filtered.reduce((acc, it) => acc + it.quantity_on_hand, 0);
  const totalReserved = filtered.reduce((acc, it) => acc + it.quantity_reserved, 0);
  const totalAvailable = filtered.reduce((acc, it) => acc + it.quantity_available, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Balances & Warehouse Inventory"
        subtitle="Real-time multi-location stock levels, reserved allocations (ATP), and physical audit controls"
        sapModuleTag="SAP MM Inventory"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/stock-movements"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              Movements Ledger
            </Link>

            {canAdjust && (
              <>
                <button
                  onClick={() => setIsTransferOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  Transfer Stock
                </button>
                <button
                  onClick={() => setIsAdjustOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Adjust Stock
                </button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Physical On Hand</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOnHand.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total across displayed warehouses</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Reserved (Active Orders)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalReserved.toLocaleString()}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Committed to confirmed Sales Orders</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Available to Promise (ATP)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalAvailable.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Immediately eligible for fulfillment</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search material code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Warehouse:</span>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading warehouse stock records..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No inventory balances found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4 text-center">On Hand Qty</th>
                  <th className="py-3 px-4 text-center">Reserved Qty</th>
                  <th className="py-3 px-4 text-center">Available Qty (ATP)</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{it.material_name}</span>
                      <span className="font-mono text-[10px] text-blue-600 font-semibold block">{it.material_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{it.warehouse_name}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {it.quantity_on_hand} <span className="text-[10px] font-normal text-slate-500">{it.uom}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                      {it.quantity_reserved} <span className="text-[10px] font-normal text-slate-500">{it.uom}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {it.quantity_available} <span className="text-[10px] font-normal text-slate-500">{it.uom}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{it.batch_number || 'DEFAULT'}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(it.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Physical Inventory Stock Adjustment"
        subtitle="Mandatory business reason required. Changes immediately create an immutable MovementType.ADJUSTMENT audit entry."
      >
        <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material Master *</label>
            <select
              value={adjustMaterialId}
              onChange={(e) => setAdjustMaterialId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.material_code} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse *</label>
              <select
                value={adjustWarehouseId}
                onChange={(e) => setAdjustWarehouseId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Physical Count *</label>
              <input
                type="number"
                required
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason (Mandatory Audit Field) *</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            >
              <option value="Annual Physical Inventory Count reconciliation">Annual Physical Count Reconciliation</option>
              <option value="Damaged / Scrap write-off">Damaged / Scrap Write-Off</option>
              <option value="Found Unrecorded Stock in Depot">Found Unrecorded Stock in Depot</option>
              <option value="Quality Control Sample Withdrawal">Quality Control Sample Withdrawal</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Explanation</label>
            <input
              type="text"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Approved under Audit Doc # AUD-2026-09"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Record Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Inter-Warehouse Inventory Transfer"
        subtitle="Atomic transfer between warehouses: deducts source and increments destination warehouse"
      >
        <form onSubmit={handleTransferStock} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Material to Transfer *</label>
            <select
              value={transferMaterialId}
              onChange={(e) => setTransferMaterialId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.material_code} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source Warehouse (From) *</label>
              <select
                value={transferSourceWhId}
                onChange={(e) => setTransferSourceWhId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Warehouse (To) *</label>
              <select
                value={transferDestWhId}
                onChange={(e) => setTransferDestWhId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transfer Quantity *</label>
            <input
              type="number"
              required
              min="1"
              value={transferQuantity}
              onChange={(e) => setTransferQuantity(parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transfer Notes</label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Inter-depot stock rebalancing"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Execute Stock Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
