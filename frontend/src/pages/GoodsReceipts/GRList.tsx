import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownToLine, CheckCircle2, Warehouse as WarehouseIcon, FileText, AlertCircle, Eye } from 'lucide-react';
import api from '../../api/client';
import { GoodsReceipt, PurchaseOrder, Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const GRList: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canReceive = hasRole(['Admin', 'Procurement Manager', 'Inventory Manager']);

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [openPOs, setOpenPOs] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGR, setSelectedGR] = useState<GoodsReceipt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New GR Form State
  const [selectedPOId, setSelectedPOId] = useState<number | ''>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
  const [grNotes, setGrNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<
    Array<{
      po_item_id: number;
      material_id: number;
      material_name: string;
      ordered_qty: number;
      already_received: number;
      received_quantity: number;
      rejected_quantity: number;
      batch_number: string;
      notes: string;
    }>
  >([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grRes, poRes, whRes] = await Promise.all([
        api.get('/goods-receipts'),
        api.get('/purchase-orders'),
        api.get('/warehouses'),
      ]);
      setReceipts(grRes.data);
      // Filter POs eligible for receipt: Approved, Sent to Vendor, Partially Received
      const receivable = poRes.data.filter((p: PurchaseOrder) =>
        ['Approved', 'Sent to Vendor', 'Partially Received'].includes(p.status)
      );
      setOpenPOs(receivable);
      setWarehouses(whRes.data);
      if (whRes.data.length > 0) setSelectedWarehouseId(whRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When user selects a PO to receive, populate its pending line items
  const handleSelectPO = (poId: number) => {
    setSelectedPOId(poId);
    const po = openPOs.find((p) => p.id === poId);
    if (po) {
      const lineRows = po.items.map((it) => {
        const remaining = Math.max(0, it.quantity - it.received_quantity);
        return {
          po_item_id: it.id,
          material_id: it.material_id,
          material_name: it.material_name,
          ordered_qty: it.quantity,
          already_received: it.received_quantity,
          received_quantity: remaining,
          rejected_quantity: 0,
          batch_number: `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          notes: '',
        };
      });
      setReceiptItems(lineRows);
    }
  };

  const handleLineQtyChange = (idx: number, field: string, val: any) => {
    const copy = [...receiptItems];
    copy[idx] = { ...copy[idx], [field]: val };
    setReceiptItems(copy);
  };

  const handleSubmitGR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOId || !selectedWarehouseId) {
      error('Please select both Purchase Order and Receiving Warehouse');
      return;
    }

    const validLines = receiptItems.filter((it) => it.received_quantity > 0);
    if (validLines.length === 0) {
      error('Enter at least one received quantity greater than 0');
      return;
    }

    try {
      await api.post('/goods-receipts', {
        po_id: Number(selectedPOId),
        warehouse_id: Number(selectedWarehouseId),
        notes: grNotes,
        items: validLines.map((it) => ({
          po_item_id: it.po_item_id,
          material_id: it.material_id,
          received_quantity: Number(it.received_quantity),
          rejected_quantity: Number(it.rejected_quantity),
          batch_number: it.batch_number,
          notes: it.notes,
        })),
      });

      success('Goods receipt posted! Inventory increased & Stock Movement recorded.', 'SAP MM MIGO Complete');
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to post Goods Receipt');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt (MIGO)"
        subtitle="SAP MM Goods Receipt workflow: Physical inbound intake, warehouse inventory increment, and batch assignment"
        sapModuleTag="SAP MM Inventory Intake"
        actions={
          canReceive && (
            <button
              onClick={() => {
                if (openPOs.length > 0) handleSelectPO(openPOs[0].id);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Post Goods Receipt (MIGO)
            </button>
          )
        }
      />

      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
            SAP MM Integration Rule
          </span>
          <h3 className="text-base font-bold mt-0.5">PO → Goods Receipt (MIGO) → Immediate Stock Increment</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Receiving items against an authorized PO automatically updates warehouse physical stock,
            creates an immutable audit trail entry in the Stock Movements ledger, and updates PO line fulfillment status.
          </p>
        </div>
        <div className="px-4 py-2 bg-blue-800/60 border border-blue-700 rounded-lg text-right shrink-0">
          <span className="text-xs text-blue-200 block">Open POs to Receive</span>
          <span className="text-xl font-black text-white block">{openPOs.length}</span>
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <LoadingSpinner message="Loading Goods Receipts ledger..." />
      ) : receipts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <ArrowDownToLine className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No goods receipts recorded yet</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">GR Document #</th>
                  <th className="py-3 px-4">Ref PO Number</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Receiving Warehouse</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Received By</th>
                  <th className="py-3 px-4 text-center">Lines Received</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {receipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{gr.gr_number}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{gr.po_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{gr.vendor_name}</td>
                    <td className="py-3.5 px-4 text-slate-700">{gr.warehouse_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{gr.receipt_date}</td>
                    <td className="py-3.5 px-4 text-slate-600">{gr.received_by_name}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {gr.items.reduce((acc, it) => acc + it.received_quantity, 0)} units
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedGR(gr);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View GR Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Goods Receipt Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post Goods Receipt (SAP MM MIGO)"
        subtitle="Verify delivered quantity against Purchase Order line items and update warehouse stock"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmitGR} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Purchase Order *</label>
              <select
                required
                value={selectedPOId}
                onChange={(e) => handleSelectPO(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                <option value="">Select PO</option>
                {openPOs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_number} - {p.vendor_name} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Warehouse *</label>
              <select
                required
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Receipt Inspection Notes</label>
            <input
              type="text"
              value={grNotes}
              onChange={(e) => setGrNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
              placeholder="e.g. Packing intact, quality verification passed"
            />
          </div>

          {/* Line Item Intake Table */}
          {receiptItems.length > 0 && (
            <div className="pt-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                Materials to Receive & Batch Tracking
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">Prev Received</th>
                      <th className="py-2.5 px-3 text-center w-28">Received Qty</th>
                      <th className="py-2.5 px-3 text-center w-24">Rejected Qty</th>
                      <th className="py-2.5 px-3">Batch Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptItems.map((it, idx) => (
                      <tr key={it.po_item_id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{it.material_name}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.ordered_qty}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{it.already_received}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={it.ordered_qty - it.already_received}
                            value={it.received_quantity}
                            onChange={(e) =>
                              handleLineQtyChange(idx, 'received_quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border rounded border-blue-400 font-bold text-center text-blue-700 bg-blue-50/30"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={it.rejected_quantity}
                            onChange={(e) =>
                              handleLineQtyChange(idx, 'rejected_quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 border rounded border-slate-300 text-center text-rose-600"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={it.batch_number}
                            onChange={(e) => handleLineQtyChange(idx, 'batch_number', e.target.value)}
                            className="w-full px-2 py-1 border rounded border-slate-300 font-mono text-[11px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer shadow-sm"
            >
              Confirm Goods Receipt (Post MIGO)
            </button>
          </div>
        </form>
      </Modal>

      {/* Goods Receipt Detail Modal */}
      {selectedGR && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Goods Receipt: ${selectedGR.gr_number}`}
          subtitle={`PO Reference: ${selectedGR.po_number} • Warehouse: ${selectedGR.warehouse_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vendor:</span>
                <p className="font-bold text-slate-900">{selectedGR.vendor_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Receipt Date:</span>
                <p className="font-semibold text-slate-800">{selectedGR.receipt_date}</p>
                <p className="text-[10px] text-slate-400">By: {selectedGR.received_by_name}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
                Materials Checked In
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Received Qty</th>
                      <th className="py-2 px-3 text-center">Rejected Qty</th>
                      <th className="py-2 px-3 font-mono">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGR.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{it.material_name}</span>
                          <span className="font-mono text-[10px] text-slate-400 block">{it.material_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          +{it.received_quantity} {it.uom}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-500">
                          {it.rejected_quantity} {it.uom}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{it.batch_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
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
