import React, { useState, useEffect } from 'react';
import { Plus, Search, FileSpreadsheet, CheckCircle, XCircle, ArrowRight, AlertCircle, ShoppingCart } from 'lucide-react';
import api from '../../api/client';
import { PurchaseRequisition, Material, Vendor } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PRList: React.FC = () => {
  const { hasRole, user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const canManage = hasRole(['Admin', 'Procurement Manager']);

  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedPrToConvert, setSelectedPrToConvert] = useState<PurchaseRequisition | null>(null);

  // New PR Form State
  const [department, setDepartment] = useState('Procurement');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [requiredDate, setRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<Array<{ material_id: number; quantity: number; estimated_unit_price: number; notes: string }>>([
    { material_id: 1, quantity: 100, estimated_unit_price: 10, notes: '' },
  ]);

  // Convert to PO Form State
  const [convertVendorId, setConvertVendorId] = useState<number>(1);
  const [convertExpectedDate, setConvertExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [convertAddress, setConvertAddress] = useState('Central Distribution Center, 100 Logistics Way, Chicago, IL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prRes, matRes, venRes] = await Promise.all([
        api.get('/purchase-requisitions'),
        api.get('/materials'),
        api.get('/vendors'),
      ]);
      setPrs(prRes.data);
      setMaterials(matRes.data);
      setVendors(venRes.data);
      if (venRes.data.length > 0) setConvertVendorId(venRes.data[0].id);
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
    setItems([...items, { material_id: materials[0]?.id || 1, quantity: 10, estimated_unit_price: 10, notes: '' }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    if (field === 'material_id') {
      const mat = materials.find((m) => m.id === Number(value));
      if (mat) copy[idx].estimated_unit_price = mat.purchase_price;
    }
    setItems(copy);
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/purchase-requisitions', {
        department,
        priority,
        required_date: requiredDate,
        reason,
        items,
      });
      success('Purchase Requisition created successfully', 'SAP MM Workflow');
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to create PR');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/purchase-requisitions/${id}/approve`);
      success('Purchase Requisition approved', 'Status updated');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to approve PR');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/purchase-requisitions/${id}/reject`, { reason: 'Rejected by manager' });
      success('Purchase Requisition rejected');
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to reject PR');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrToConvert) return;
    try {
      const res = await api.post(`/purchase-requisitions/${selectedPrToConvert.id}/convert-to-po`, {
        vendor_id: Number(convertVendorId),
        expected_delivery_date: convertExpectedDate,
        shipping_address: convertAddress,
      });
      success(`Converted to Purchase Order ${res.data.po_number}`, 'SAP MM Automation');
      setIsConvertOpen(false);
      fetchData();
      navigate('/purchase-orders');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to convert PR to PO');
    }
  };

  const filtered = prs.filter((pr) => (statusFilter ? pr.status === statusFilter : true));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requisitions (PR)"
        subtitle="Internal department purchase requests, approval control, and automated conversion to PO (SAP MM)"
        sapModuleTag="SAP MM Procurement Flow"
        actions={
          canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Requisition
            </button>
          )
        }
      />

      {/* Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="">All Requisition Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Converted to PO">Converted to PO</option>
          </select>
        </div>
        <span className="text-xs text-slate-500 font-medium">{filtered.length} requisitions total</span>
      </div>

      {/* Requisitions Table */}
      {loading ? (
        <LoadingSpinner message="Loading Purchase Requisitions..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No purchase requisitions found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">PR Number</th>
                  <th className="py-3 px-4">Department & Requester</th>
                  <th className="py-3 px-4">Items Requested</th>
                  <th className="py-3 px-4">Required By</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{pr.pr_number}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{pr.department}</span>
                      <span className="text-[10px] text-slate-500 block">By: {pr.requested_by_name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {pr.items.map((it) => `${it.quantity}x ${it.material_name}`).join(', ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{pr.required_date}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          pr.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : pr.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pr.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={pr.status} size="sm" />
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {pr.status === 'Draft' && (
                            <>
                              <button
                                onClick={() => handleApprove(pr.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(pr.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}

                          {pr.status === 'Approved' && (
                            <button
                              onClick={() => {
                                setSelectedPrToConvert(pr);
                                setIsConvertOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Convert to PO
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New PR Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Purchase Requisition (SAP MM)"
        subtitle="Initiate formal material replenishment request before raising a vendor Purchase Order"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePR} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Delivery Date</label>
              <input
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Replenishment for assembly production line"
            />
          </div>

          {/* Line Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                Requisition Material Items
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer"
              >
                + Add Item Line
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="col-span-6">
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

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Est. Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={it.estimated_unit_price}
                      onChange={(e) => handleItemChange(idx, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert PR to PO Modal */}
      {selectedPrToConvert && (
        <Modal
          isOpen={isConvertOpen}
          onClose={() => setIsConvertOpen(false)}
          title={`Convert PR: ${selectedPrToConvert.pr_number} to Purchase Order`}
          subtitle="Generate binding vendor Purchase Order directly from approved purchase requisition lines"
        >
          <form onSubmit={handleConvert} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Supplier / Vendor *</label>
              <select
                required
                value={convertVendorId}
                onChange={(e) => setConvertVendorId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.company_name} ({v.payment_terms})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={convertExpectedDate}
                onChange={(e) => setConvertExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receiving Warehouse / Shipping Address *</label>
              <textarea
                rows={2}
                required
                value={convertAddress}
                onChange={(e) => setConvertAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-900 block mb-1">Items to Convert:</span>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                {selectedPrToConvert.items.map((it, i) => (
                  <li key={i}>
                    {it.quantity} {it.uom} of {it.material_name} (${it.estimated_unit_price}/unit)
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConvertOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirm & Create PO
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
