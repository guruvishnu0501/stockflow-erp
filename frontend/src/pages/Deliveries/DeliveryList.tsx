import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Printer,
  PackageCheck,
  AlertTriangle,
  Building,
  Calendar,
  FileText,
  Clock,
} from 'lucide-react';
import api from '../../api/client';
import { Delivery, DeliveryStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const DeliveryList: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isPgiModalOpen, setIsPgiModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [pgiSubmitting, setPgiSubmitting] = useState<boolean>(false);

  const { showToast } = useToast();
  const { hasRole } = useAuth();
  const canPerformPgi = hasRole(['Admin', 'Sales Manager', 'Inventory Manager']);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get<Delivery[]>('/deliveries');
      setDeliveries(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handlePostGoodsIssue = async () => {
    if (!selectedDelivery) return;
    setPgiSubmitting(true);
    try {
      const res = await api.post<Delivery>(`/deliveries/${selectedDelivery.id}/post-goods-issue`);
      showToast('success', `Post Goods Issue (PGI) completed for ${res.data.delivery_number}! Inventory decremented and invoice generated.`);
      setIsPgiModalOpen(false);
      setIsDetailModalOpen(false);
      fetchDeliveries();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'PGI execution failed');
    } finally {
      setPgiSubmitting(false);
    }
  };

  const filteredDeliveries = deliveries.filter((del) => {
    const matchesSearch =
      del.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.so_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || del.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: DeliveryStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'Shipped':
      case 'Packed':
        return 'info';
      case 'Picking':
        return 'warning';
      case 'Pending':
        return 'secondary';
      case 'Cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbound Deliveries & Goods Issue"
        subtitle="Manage logistics dispatch, warehouse pick & pack, and Post Goods Issue (PGI) per SAP SD VL01N/VL02N workflows."
        breadcrumbs={[
          { label: 'Sales & Logistics', href: '/sales-orders' },
          { label: 'Deliveries' },
        ]}
        actions={
          <button
            onClick={fetchDeliveries}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* SAP SD Process Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4.5 text-xs text-blue-900 shadow-xs flex items-start gap-3">
        <PackageCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-950 block text-sm mb-0.5">
            SAP SD Logistical Fulfillment Cycle
          </span>
          Sales Order (VA01) &rarr; Outbound Delivery Document (VL01N) &rarr; Warehouse Picking & Packaging &rarr;{' '}
          <strong className="text-blue-800">Post Goods Issue (PGI)</strong>.
          Executing PGI reduces stock from the designated warehouse, writes an immutable movement ledger entry, and triggers billing document creation.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search delivery #, SO #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Picking">Picking</option>
            <option value="Packed">Packed</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered (PGI Completed)</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Loading delivery documents..." />
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No deliveries found</p>
            <p className="text-sm mt-1">
              Outbound deliveries are generated directly from Confirmed Sales Orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Delivery Doc #</th>
                  <th className="py-3.5 px-4">Sales Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Warehouse</th>
                  <th className="py-3.5 px-4">Delivery Date</th>
                  <th className="py-3.5 px-4 text-center">Lines</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                      {delivery.delivery_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      {delivery.so_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {delivery.customer_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {delivery.warehouse_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {delivery.delivery_date}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                        {delivery.items.length} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="View Delivery Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                          title="Print Delivery Challan"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {delivery.status !== 'Delivered' && delivery.status !== 'Cancelled' && canPerformPgi && (
                          <button
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setIsPgiModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                            title="Post Goods Issue"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Post Goods Issue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen && !!selectedDelivery}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Outbound Delivery Details – ${selectedDelivery?.delivery_number}`}
        size="xl"
      >
        {selectedDelivery && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Sales Order</span>
                <span className="font-mono font-medium text-slate-800">{selectedDelivery.so_number}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Customer</span>
                <span className="font-medium text-slate-900">{selectedDelivery.customer_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Dispatch Warehouse</span>
                <span className="font-medium text-slate-800">{selectedDelivery.warehouse_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Fulfillment Status</span>
                <div className="mt-0.5">
                  <Badge variant={getStatusBadgeVariant(selectedDelivery.status)}>
                    {selectedDelivery.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Delivery Date</span>
                <span className="text-slate-800">{selectedDelivery.delivery_date}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Prepared By</span>
                <span className="text-slate-800">{selectedDelivery.created_by_name}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Shipping / Dispatch Notes</span>
                <span className="text-slate-800 italic">
                  {selectedDelivery.shipping_notes || 'Standard ground shipping'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Dispatched Material Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Material Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Dispatch Qty</th>
                      <th className="py-2.5 px-3">UoM</th>
                      <th className="py-2.5 px-3">Batch Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDelivery.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                          {it.material_code}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900">{it.material_name}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{it.uom}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                          {it.batch_number || 'AUTO-BATCH'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Print Delivery Slip
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Close
                </button>
                {selectedDelivery.status !== 'Delivered' &&
                  selectedDelivery.status !== 'Cancelled' &&
                  canPerformPgi && (
                    <button
                      onClick={() => {
                        setIsPgiModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-xs"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Post Goods Issue (PGI)
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM POST GOODS ISSUE (PGI) MODAL */}
      <Modal
        isOpen={isPgiModalOpen && !!selectedDelivery}
        onClose={() => setIsPgiModalOpen(false)}
        title="Execute Post Goods Issue (PGI)"
        size="md"
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 font-semibold mb-1">
                  Immutable Physical Inventory Deduction
                </strong>
                Executing Post Goods Issue will immediately:
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs text-amber-800">
                  <li>Deduct quantities from <strong>{selectedDelivery.warehouse_name}</strong> inventory.</li>
                  <li>Log an immutable <strong>Goods Issue</strong> record in the stock movement ledger.</li>
                  <li>Advance delivery status to <strong>Delivered</strong>.</li>
                  <li>Automatically generate customer <strong>Sales Billing Document (Invoice)</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Document:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{selectedDelivery.delivery_number}</span>
              </div>
              <div>
                <span className="text-slate-500">Recipient:</span>{' '}
                <span className="font-semibold text-slate-800">{selectedDelivery.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Items to Deduct:</span>{' '}
                <span className="font-bold text-blue-600">{selectedDelivery.items.reduce((acc, i) => acc + i.quantity, 0)} units</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPgiModalOpen(false)}
                disabled={pgiSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePostGoodsIssue}
                disabled={pgiSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
              >
                {pgiSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Posting Goods Issue...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Post Goods Issue
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* PRINT DELIVERY NOTE / CHALLAN MODAL */}
      <Modal
        isOpen={isPrintModalOpen && !!selectedDelivery}
        onClose={() => setIsPrintModalOpen(false)}
        title="Print Delivery Challan / Shipping Note"
        size="lg"
      >
        {selectedDelivery && (
          <div className="space-y-6">
            <div
              id="printable-delivery-note"
              className="p-6 bg-white border border-slate-300 rounded-xl space-y-6 text-slate-800 font-sans shadow-xs"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950">DELIVERY CHALLAN</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">SAP SD Outbound Dispatch Note</p>
                  <p className="text-xs text-slate-600 mt-2">
                    <strong>StockFlow ERP System</strong><br />
                    Central Industrial Logistics Division
                  </p>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="text-base font-mono font-bold text-blue-700">
                    {selectedDelivery.delivery_number}
                  </div>
                  <div>Date: <strong>{selectedDelivery.delivery_date}</strong></div>
                  <div>Sales Order: <strong>{selectedDelivery.so_number}</strong></div>
                  <div>Warehouse: <strong>{selectedDelivery.warehouse_name}</strong></div>
                </div>
              </div>

              {/* Recipient & Logistics Info */}
              <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-4">
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Consignee (Customer)</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedDelivery.customer_name}</div>
                  <div className="text-slate-600 mt-1">Status: {selectedDelivery.status}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Dispatch Details</span>
                  <div>Prepared By: {selectedDelivery.created_by_name}</div>
                  <div>Notes: {selectedDelivery.shipping_notes || 'Standard Delivery'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-900 font-semibold uppercase">
                    <th className="py-2">Item</th>
                    <th className="py-2">Material Code</th>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Quantity</th>
                    <th className="py-2">UoM</th>
                    <th className="py-2">Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedDelivery.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-slate-500">{index + 1}</td>
                      <td className="py-2.5 font-mono font-semibold">{item.material_code}</td>
                      <td className="py-2.5">{item.material_name}</td>
                      <td className="py-2.5 text-right font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-slate-600">{item.uom}</td>
                      <td className="py-2.5 font-mono text-slate-600">{item.batch_number || 'AUTO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-300 text-center text-xs text-slate-600">
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    Store Officer Signature
                  </div>
                </div>
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    Carrier / Logistics Agent
                  </div>
                </div>
                <div>
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    Customer Acceptance
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default DeliveryList;
