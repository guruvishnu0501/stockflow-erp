import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  Eye,
  CreditCard,
  Printer,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  User,
} from 'lucide-react';
import api from '../../api/client';
import { Invoice, InvoiceType, PaymentStatus, Payment } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // 'ALL' | 'Sales' | 'Purchase'
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  const { showToast } = useToast();
  const { hasRole } = useAuth();
  const canRecordPayment = hasRole(['Admin', 'Sales Manager', 'Procurement Manager']);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get<Invoice[]>('/invoices', {
        params: {
          limit: 100,
          invoice_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          payment_status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      setInvoices(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [typeFilter, statusFilter]);

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balance_due);
    setReferenceNumber(`PAY-${Date.now().toString().slice(-6)}`);
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      showToast('warning', 'Payment amount must be greater than zero');
      return;
    }
    if (paymentAmount > selectedInvoice.balance_due + 0.01) {
      showToast('warning', `Payment amount cannot exceed balance due ($${selectedInvoice.balance_due.toLocaleString()})`);
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.post('/invoices/payments', {
        invoice_id: selectedInvoice.id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: paymentNotes,
        payment_date: paymentDate,
      });

      showToast('success', `Payment of $${Number(paymentAmount).toLocaleString()} recorded successfully!`);
      setIsPaymentModalOpen(false);
      setIsDetailModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const partyName = (inv.customer_name || inv.vendor_name || '').toLowerCase();
    const ref = (inv.reference_id || '').toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(term) ||
      partyName.includes(term) ||
      ref.includes(term)
    );
  });

  // Calculate Metrics
  const totalBilledSales = invoices
    .filter((i) => i.invoice_type === 'Sales')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const totalCollected = invoices
    .filter((i) => i.invoice_type === 'Sales')
    .reduce((sum, i) => sum + i.paid_amount, 0);

  const pendingReceivables = invoices
    .filter((i) => i.invoice_type === 'Sales')
    .reduce((sum, i) => sum + i.balance_due, 0);

  const pendingPayables = invoices
    .filter((i) => i.invoice_type === 'Purchase')
    .reduce((sum, i) => sum + i.balance_due, 0);

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success">Paid in Full</Badge>;
      case 'Partially Paid':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'Overdue':
        return <Badge variant="danger">Overdue</Badge>;
      case 'Pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Documents & Invoices"
        subtitle="Manage customer sales billing (SAP SD VF01) and vendor invoice verification (SAP MM MIRO) with real-time settlement."
        breadcrumbs={[
          { label: 'Finance & Billing', href: '/invoices' },
          { label: 'Invoices' },
        ]}
        actions={
          <button
            onClick={fetchInvoices}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Sales Invoiced
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ${totalBilledSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-blue-600 font-medium mt-1 block">
              SAP SD VF01 Invoices
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Payments Collected
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-700 font-medium mt-1 block">
              Cash Realization
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Open Receivables (AR)
            </span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              ${pendingReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-amber-700 font-medium mt-1 block">
              Pending from Customers
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Open Payables (AP)
            </span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">
              ${pendingPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-rose-700 font-medium mt-1 block">
              SAP MM MIRO Due to Vendors
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tab pills */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              typeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Billing Docs
          </button>
          <button
            onClick={() => setTypeFilter('Sales')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              typeFilter === 'Sales'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Invoices (VF01)
          </button>
          <button
            onClick={() => setTypeFilter('Purchase')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              typeFilter === 'Purchase'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Purchase Invoices (MIRO)
          </button>
        </div>

        {/* Search & Status filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, party, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid in Full</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Loading billing documents..." />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No invoices found</p>
            <p className="text-sm mt-1">
              Sales invoices are auto-generated upon Post Goods Issue (PGI); Purchase invoices are generated upon PO receipt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Doc Type</th>
                  <th className="py-3.5 px-4">Party (Customer / Vendor)</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          inv.invoice_type === 'Sales'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {inv.invoice_type === 'Sales' ? 'SD Sales' : 'MM Vendor'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {inv.customer_name || inv.vendor_name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {inv.reference_id || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {inv.invoice_date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {inv.due_date}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      ${inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      {inv.balance_due > 0 ? (
                        <span className="text-amber-600">
                          ${inv.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-600">$0.00</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.payment_status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                          title="Print Document"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {inv.balance_due > 0 && canRecordPayment && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
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
        isOpen={isDetailModalOpen && !!selectedInvoice}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Invoice Details – ${selectedInvoice?.invoice_number}`}
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Doc Type</span>
                <span className="font-semibold text-slate-900">
                  {selectedInvoice.invoice_type === 'Sales' ? 'Sales Billing Document (VF01)' : 'Vendor Invoice (MIRO)'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Party Name</span>
                <span className="font-semibold text-slate-900">
                  {selectedInvoice.customer_name || selectedInvoice.vendor_name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Reference Doc</span>
                <span className="font-mono text-slate-800">{selectedInvoice.reference_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Payment Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedInvoice.payment_status)}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Invoice Date</span>
                <span className="text-slate-800">{selectedInvoice.invoice_date}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Due Date</span>
                <span className="text-slate-800">{selectedInvoice.due_date}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Paid Amount</span>
                <span className="text-emerald-600 font-semibold">
                  ${selectedInvoice.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Balance Due</span>
                <span className="text-amber-600 font-bold">
                  ${selectedInvoice.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Itemized Charges</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Tax Rate</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{it.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ${it.unit_price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{it.tax_rate}%</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          ${it.line_total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History */}
            {selectedInvoice.payments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Payment Remittance History</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Payment #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-600">{p.payment_number}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.payment_date}</td>
                          <td className="py-2.5 px-3 text-slate-800">{p.payment_method}</td>
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{p.reference_number || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            ${p.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Print Invoice
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Close
                </button>
                {selectedInvoice.balance_due > 0 && canRecordPayment && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenPayment(selectedInvoice);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    Record Settlement
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen && !!selectedInvoice}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoice_number}`}
        size="md"
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Party:</span>
                <span className="font-semibold text-slate-900">{selectedInvoice.customer_name || selectedInvoice.vendor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice Amount:</span>
                <span className="font-semibold text-slate-900">${selectedInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Settled:</span>
                <span className="font-semibold text-emerald-600">${selectedInvoice.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                <span className="text-amber-800">Remaining Balance:</span>
                <span className="text-amber-700">${selectedInvoice.balance_due.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settlement Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInvoice.balance_due}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Corporate Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction / Cheque Reference #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR-982348234 or CHQ-00129"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remittance Notes
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional settlement notes..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={submittingPayment}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
              >
                {submittingPayment ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* PRINTABLE INVOICE MODAL */}
      <Modal
        isOpen={isPrintModalOpen && !!selectedInvoice}
        onClose={() => setIsPrintModalOpen(false)}
        title="Print Commercial Invoice Document"
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div
              id="printable-invoice-slip"
              className="p-8 bg-white border border-slate-300 rounded-xl space-y-6 text-slate-800 font-sans shadow-xs"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {selectedInvoice.invoice_type === 'Sales' ? 'TAX INVOICE' : 'PURCHASE VENDOR BILL'}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedInvoice.invoice_type === 'Sales' ? 'SAP SD Sales Billing (VF01)' : 'SAP MM Logistics Invoice (MIRO)'}
                  </p>
                  <div className="text-xs text-slate-600 mt-3 leading-relaxed">
                    <strong>StockFlow Enterprise ERP</strong><br />
                    100 Innovation Park Blvd, Suite 400<br />
                    GSTIN: 29AAACS1429B1Z0 | PAN: AAACS1429B
                  </div>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div className="text-lg font-mono font-bold text-blue-700">
                    {selectedInvoice.invoice_number}
                  </div>
                  <div>Invoice Date: <strong>{selectedInvoice.invoice_date}</strong></div>
                  <div>Due Date: <strong>{selectedInvoice.due_date}</strong></div>
                  <div>Reference Doc: <strong>{selectedInvoice.reference_id || 'Direct'}</strong></div>
                </div>
              </div>

              {/* Billed To / From */}
              <div className="grid grid-cols-2 gap-8 text-xs border-b border-slate-200 pb-5">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {selectedInvoice.invoice_type === 'Sales' ? 'BILLED TO (CUSTOMER)' : 'SUPPLIER (VENDOR)'}
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedInvoice.customer_name || selectedInvoice.vendor_name}
                  </div>
                  <div className="text-slate-600 mt-1">Payment Status: <strong>{selectedInvoice.payment_status}</strong></div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    SETTLEMENT STATUS
                  </span>
                  <div>Total Invoiced: <strong className="text-slate-900">${selectedInvoice.total_amount.toFixed(2)}</strong></div>
                  <div>Amount Paid: <strong className="text-emerald-600">${selectedInvoice.paid_amount.toFixed(2)}</strong></div>
                  <div className="text-sm font-bold text-amber-700 mt-1">
                    Balance Due: ${selectedInvoice.balance_due.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-slate-900 font-semibold uppercase">
                    <th className="py-2.5">#</th>
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5 text-right">Quantity</th>
                    <th className="py-2.5 text-right">Unit Price</th>
                    <th className="py-2.5 text-right">Tax</th>
                    <th className="py-2.5 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-slate-900">{it.description}</td>
                      <td className="py-2.5 text-right font-mono">{it.quantity}</td>
                      <td className="py-2.5 text-right font-mono">${it.unit_price.toFixed(2)}</td>
                      <td className="py-2.5 text-right text-slate-500">{it.tax_rate}%</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">${it.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end pt-3">
                <div className="w-64 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Amount (GST 18%):</span>
                    <span className="font-semibold">${selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-${selectedInvoice.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-sm font-black text-slate-950">
                    <span>Invoice Total:</span>
                    <span>${selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="pt-8 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <p><strong>Terms & Conditions:</strong> Payment is due according to the agreed terms. Remittance instructions: StockFlow Federal Bank, A/C: 1009823482, IFSC: STCK000100.</p>
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
export default InvoiceList;
