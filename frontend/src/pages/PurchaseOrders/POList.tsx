import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  Eye,
  AlertCircle,
  FileText,
} from 'lucide-react';
import api from '../../api/client';
import { PurchaseOrder, Vendor, Material } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const POList: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canManage = hasRole(['Admin', 'Procurement Manager']);

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New PO State
  const [selectedVendorId, setSelectedVendorId] = useState<number>(1);
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [shippingAddress, setShippingAddress] = useState(
    'Central Distribution Center, 100 Logistics Way, Chicago, IL'
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ material_id: number; quantity: number; unit_price: number; discount_percent: number; tax_rate: number }>
  >([{ material_id: 1, quantity: 50, unit_price: 10, discount_percent: 0, tax_rate: 18 }]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, venRes, matRes] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/vendors'),
        api.get('/materials'),
      ]);
      setPos(poRes.data);
      setVendors(venRes.data);
      setMaterials(matRes.data);
      if (venRes.data.length > 0) {
        setSelectedVendorId(venRes.data[0].id);
        setPaymentTerms(venRes.data[0].payment_terms || 'Net 30');
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

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        material_id: materials[0]?.id || 1,
        quantity: 10,
        unit_price: materials[0]?.purchase_price || 10,
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
      if (mat) copy[idx].unit_price = mat.purchase_price;
    }
    setItems(copy);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/purchase-orders', {
        vendor_id: Number(selectedVendorId),
        expected_delivery_date: expectedDate,
        payment_terms: paymentTerms,
        shipping_address: shippingAddress,
        notes,
        items,
      });
      success('Purchase Order created successfully', 'SAP MM Order Issued');
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create PO');
    }
  };

  const handleApprovePO = async (id: number) => {
    try {
      await api.put(`/purchase-orders/${id}/approve`);
      success('PO approved by procurement manager');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to approve PO');
    }
  };

  const handleSendToVendor = async (id: number) => {
    try {
      await api.put(`/purchase-orders/${id}/send-to-vendor`);
      success('PO dispatched to vendor for delivery');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to send PO');
    }
  };

  const handleCancelPO = async (id: number) => {
    try {
      await api.put(`/purchase-orders/${id}/cancel`);
      success('PO cancelled');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to cancel PO');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const filtered = pos.filter((po) => {
    const matchesStatus = statusFilter ? po.status === statusFilter : true;
    const matchesSearch =
      po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      po.vendor_name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders (PO)"
        subtitle="SAP MM Purchase Order tracking, vendor contracts, line receipts, and 3-way invoice matching"
        sapModuleTag="SAP MM Core Procurement"
        actions={
          canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
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
            placeholder="Search PO # or vendor..."
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
            <option value="">All PO Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Sent to Vendor">Sent to Vendor</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Fully Received">Fully Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO Table */}
      {loading ? (
        <LoadingSpinner message="Loading Purchase Orders..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No purchase orders found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{po.po_number}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{po.vendor_name}</span>
                      <span className="text-[10px] text-slate-500 block">{po.payment_terms}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{po.po_date}</td>
                    <td className="py-3.5 px-4 text-slate-600">{po.expected_delivery_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 block">{formatCurrency(po.total_amount)}</span>
                      <span className="text-[10px] text-slate-400 block">Sub: {formatCurrency(po.subtotal)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={po.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View PO Details & Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManage && po.status === 'Pending Approval' && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}

                        {canManage && po.status === 'Approved' && (
                          <button
                            onClick={() => handleSendToVendor(po.id)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" /> Dispatch
                          </button>
                        )}

                        {canManage &&
                          (po.status === 'Sent to Vendor' || po.status === 'Partially Received') && (
                            <Link
                              to="/goods-receipts"
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              Receive Goods
                            </Link>
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

      {/* Create PO Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Purchase Order (SAP MM)"
        subtitle="Issue purchase order to external vendor with line items and pricing conditions"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor *</label>
              <select
                required
                value={selectedVendorId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedVendorId(id);
                  const v = vendors.find((vend) => vend.id === id);
                  if (v) setPaymentTerms(v.payment_terms || 'Net 30');
                }}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
                placeholder="Contractual instructions"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Receiving Warehouse & Shipping Address</label>
            <input
              type="text"
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          {/* Line Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                Purchase Order Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer"
              >
                + Add Line Item
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="col-span-5">
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Material</label>
                    <select
                      value={it.material_id}
                      onChange={(e) => handleItemChange(idx, 'material_id', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border rounded border-slate-300 text-xs"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.material_code} - {m.name}
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
                      className="w-full px-2 py-1.5 border rounded border-slate-300 text-xs text-center"
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
              ))}
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
              Submit Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* PO View & Print Layout Modal */}
      {selectedPO && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Purchase Order: ${selectedPO.po_number}`}
          subtitle={`Issued to ${selectedPO.vendor_name} • Status: ${selectedPO.status}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs printable-doc">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">StockFlow ERP</h2>
                <p className="text-slate-500 text-[11px]">Material Management (MM) Procurement Document</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-bold text-blue-600 block">{selectedPO.po_number}</span>
                <span className="text-[11px] text-slate-500 block">Date: {selectedPO.po_date}</span>
                <Badge status={selectedPO.status} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vendor:</span>
                <p className="font-bold text-slate-900 text-sm">{selectedPO.vendor_name}</p>
                <p className="text-slate-600 mt-0.5">Payment Terms: {selectedPO.payment_terms}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ship To:</span>
                <p className="text-slate-700">{selectedPO.shipping_address}</p>
                <p className="text-slate-500 mt-1 font-semibold">Expected By: {selectedPO.expected_delivery_date}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Item / Material</th>
                    <th className="py-2 px-3 text-center">Ordered</th>
                    <th className="py-2 px-3 text-center">Received</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Tax Rate</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPO.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{it.material_name}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{it.material_code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                        {it.received_quantity} {it.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">${it.unit_price}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{it.tax_rate}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">${it.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total breakdown */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedPO.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax:</span>
                  <span>{formatCurrency(selectedPO.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span>{formatCurrency(selectedPO.discount_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">{formatCurrency(selectedPO.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
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
