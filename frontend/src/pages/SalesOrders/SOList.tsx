import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Truck,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import api from '../../api/client';
import { SalesOrder, Customer, Material, Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const SOList: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const canManage = hasRole(['Admin', 'Sales Manager']);

  const [sos, setSos] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Outbound Delivery Modal
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryWarehouseId, setDeliveryWarehouseId] = useState<number>(1);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // New SO Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [shippingAddress, setShippingAddress] = useState('500 Innovation Park, San Jose, CA');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ material_id: number; quantity: number; unit_price: number; discount_percent: number; tax_rate: number }>
  >([{ material_id: 1, quantity: 10, unit_price: 25, discount_percent: 0, tax_rate: 18 }]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [soRes, custRes, matRes, whRes] = await Promise.all([
        api.get('/sales-orders'),
        api.get('/customers'),
        api.get('/materials'),
        api.get('/warehouses'),
      ]);
      setSos(soRes.data);
      setCustomers(custRes.data);
      setMaterials(matRes.data);
      setWarehouses(whRes.data);
      if (custRes.data.length > 0) {
        setSelectedCustomerId(custRes.data[0].id);
        setShippingAddress(custRes.data[0].address || 'Client Registered Address');
      }
      if (whRes.data.length > 0) setDeliveryWarehouseId(whRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        material_id: materials[0]?.id || 1,
        quantity: 5,
        unit_price: materials[0]?.selling_price || 20,
        discount_percent: 0,
        tax_rate: 18,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    if (field === 'material_id') {
      const mat = materials.find((m) => m.id === Number(value));
      if (mat) copy[idx].unit_price = mat.selling_price;
    }
    setItems(copy);
  };

  const handleCreateSO = async (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend Availability Check Checkpoint
    for (const line of items) {
      const mat = materials.find((m) => m.id === line.material_id);
      if (mat && line.quantity > mat.total_stock) {
        warning(
          `ATP Alert: Quantity requested (${line.quantity}) exceeds available stock (${mat.total_stock} ${mat.uom}) for '${mat.name}'. System validation will enforce limit.`,
          'Availability Warning'
        );
      }
    }

    try {
      const res = await api.post('/sales-orders', {
        customer_id: Number(selectedCustomerId),
        requested_delivery_date: deliveryDate,
        shipping_address: shippingAddress,
        notes,
        items,
      });

      success(
        `Sales Order ${res.data.so_number} confirmed! Available-to-Promise verified & stock reserved.`,
        'SAP SD Order Entry'
      );
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Stock availability check failed or order rejected');
    }
  };

  const handleCreateOutboundDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSO) return;

    try {
      const deliveryPayload = {
        so_id: selectedSO.id,
        warehouse_id: Number(deliveryWarehouseId),
        shipping_notes: deliveryNotes,
        items: selectedSO.items.map((it) => ({
          so_item_id: it.id,
          material_id: it.material_id,
          quantity: it.quantity - it.delivered_quantity,
          batch_number: 'BATCH-OUTBOUND',
        })),
      };

      const res = await api.post('/deliveries', deliveryPayload);
      success(
        `Outbound Delivery ${res.data.delivery_number} generated! Proceed to Goods Issue (PGI) to deduct stock.`,
        'SAP SD VL01N'
      );
      setIsDeliveryModalOpen(false);
      fetchData();
      navigate('/deliveries');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create Outbound Delivery');
    }
  };

  const handleCancelSO = async (id: number) => {
    try {
      await api.put(`/sales-orders/${id}/cancel`);
      success('Sales Order cancelled and reserved stock released');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Cannot cancel Sales Order');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const filtered = sos.filter((so) => {
    const matchesStatus = statusFilter ? so.status === statusFilter : true;
    const matchesSearch =
      so.so_number.toLowerCase().includes(search.toLowerCase()) ||
      so.customer_name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders (SD)"
        subtitle="SAP SD Sales Order Processing: Real-time Availability Check (ATP), stock reservation, and outbound delivery generation"
        sapModuleTag="SAP SD Sales Engine"
        actions={
          canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Sales Order (VA01)
            </button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SO # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="">All Order Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Partially Delivered">Partially Delivered</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sales Orders Table */}
      {loading ? (
        <LoadingSpinner message="Loading Sales Orders registry..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No sales orders found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">SO Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Delivery Date</th>
                  <th className="py-3 px-4 text-right">Order Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Logistics Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{so.so_number}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{so.customer_name}</span>
                      <span className="text-[10px] text-slate-500 block">By: {so.created_by_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{so.order_date}</td>
                    <td className="py-3.5 px-4 text-slate-600">{so.requested_delivery_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 block">{formatCurrency(so.total_amount)}</span>
                      <span className="text-[10px] text-slate-400 block">Sub: {formatCurrency(so.subtotal)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={so.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSO(so);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManage && (so.status === 'Confirmed' || so.status === 'Processing') && (
                          <button
                            onClick={() => {
                              setSelectedSO(so);
                              setIsDeliveryModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" /> Create Delivery (VL01N)
                          </button>
                        )}

                        {canManage && so.status === 'Confirmed' && (
                          <button
                            onClick={() => handleCancelSO(so.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Sales Order Modal (VA01) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Sales Order (SAP SD VA01)"
        subtitle="Automatic Stock Availability Check (ATP) prevents selling more than available warehouse inventory"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSO} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Account *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedCustomerId(id);
                  const c = customers.find((cust) => cust.id === id);
                  if (c?.address) setShippingAddress(c.address);
                }}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.customer_name} (Limit: ${c.credit_limit.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Requested Delivery Date *</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Shipping Destination Address *</label>
            <input
              type="text"
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Order Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Standard ground delivery requested"
            />
          </div>

          {/* Line Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                Sales Order Line Items & ATP Availability
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer"
              >
                + Add Material
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {items.map((it, idx) => {
                const mat = materials.find((m) => m.id === it.material_id);
                const hasSufficient = mat ? mat.total_stock >= it.quantity : true;

                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border ${
                      hasSufficient ? 'border-slate-200' : 'border-rose-300 bg-rose-50/30'
                    }`}
                  >
                    <div className="col-span-5">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-slate-500 font-semibold">Material</label>
                        {mat && (
                          <span
                            className={`text-[10px] font-bold ${
                              mat.total_stock < it.quantity ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            Avail: {mat.total_stock} {mat.uom}
                          </span>
                        )}
                      </div>
                      <select
                        value={it.material_id}
                        onChange={(e) => handleItemChange(idx, 'material_id', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border rounded border-slate-300 text-xs"
                      >
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.material_code} - {m.name} ({m.total_stock} in stock)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Quantity</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                        className={`w-full px-2 py-1.5 border rounded text-xs text-center font-bold ${
                          hasSufficient ? 'border-slate-300' : 'border-rose-400 text-rose-700 bg-rose-50'
                        }`}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Unit Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded border-slate-300 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Tax (%)</label>
                      <input
                        type="number"
                        value={it.tax_rate}
                        onChange={(e) => handleItemChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded border-slate-300 text-xs"
                      />
                    </div>

                    <div className="col-span-1 pt-4 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
            >
              Confirm Sales Order (VA01)
            </button>
          </div>
        </form>
      </Modal>

      {/* Outbound Delivery (VL01N) Modal */}
      {selectedSO && (
        <Modal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          title={`Generate Outbound Delivery (VL01N) for ${selectedSO.so_number}`}
          subtitle={`Customer: ${selectedSO.customer_name} • Order Total: ${formatCurrency(selectedSO.total_amount)}`}
        >
          <form onSubmit={handleCreateOutboundDelivery} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fulfillment Warehouse (Picking Node) *</label>
              <select
                required
                value={deliveryWarehouseId}
                onChange={(e) => setDeliveryWarehouseId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logistics / Packing Notes</label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
                placeholder="e.g. Fragile electronic components, pack with bubble buffer"
              />
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-900 block mb-1">Fulfillment Items in Delivery:</span>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                {selectedSO.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity - it.delivered_quantity} {it.uom} of {it.material_name} (${it.unit_price}/unit)
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Generate Delivery Document
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {selectedSO && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Sales Order Document: ${selectedSO.so_number}`}
          subtitle={`Customer: ${selectedSO.customer_name} • Order Date: ${selectedSO.order_date}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Account:</span>
                <p className="font-bold text-slate-900">{selectedSO.customer_name}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Delivery To: {selectedSO.shipping_address}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Status:</span>
                <Badge status={selectedSO.status} size="sm" />
                <p className="text-slate-500 text-[11px] mt-1">Due Date: {selectedSO.requested_delivery_date}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Delivered</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSO.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{it.material_name}</span>
                        <span className="font-mono text-[10px] text-blue-600 block">{it.material_code}</span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">
                        {it.delivered_quantity} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">${it.unit_price}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">${it.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Created by {selectedSO.created_by_name} on {selectedSO.order_date}
              </span>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 cursor-pointer"
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
