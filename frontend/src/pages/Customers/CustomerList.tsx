import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Phone, Mail, MapPin, Eye, Edit2, AlertCircle, CreditCard } from 'lucide-react';
import api from '../../api/client';
import { Customer } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const CustomerList: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canEdit = hasRole(['Admin', 'Sales Manager']);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<any | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    customer_name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    tax_id: '',
    credit_limit: 100000,
    payment_terms: 'Net 30',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = (c?: Customer) => {
    if (c) {
      setEditingCustomer(c);
      setFormData({
        code: c.code,
        customer_name: c.customer_name,
        company_name: c.company_name || c.customer_name,
        contact_person: c.contact_person || '',
        email: c.email,
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        country: c.country,
        tax_id: c.tax_id || '',
        credit_limit: c.credit_limit,
        payment_terms: c.payment_terms,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        code: `CUST-${Math.floor(2000 + Math.random() * 8000)}`,
        customer_name: '',
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'USA',
        tax_id: `TAX-${Math.floor(1000 + Math.random() * 9000)}`,
        credit_limit: 150000,
        payment_terms: 'Net 30',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        credit_limit: Number(formData.credit_limit),
      };

      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        success('Customer details updated');
      } else {
        await api.post('/customers', payload);
        success('New customer created');
      }
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to save customer');
    }
  };

  const viewCustomerSummary = async (id: number) => {
    try {
      const res = await api.get(`/customers/${id}/summary`);
      setSelectedCustomerSummary(res.data);
      setIsSummaryOpen(true);
    } catch (err) {
      error('Could not fetch customer history');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Master (SD)"
        subtitle="Customer accounts, credit limits, sales volume, and outstanding invoice balances"
        sapModuleTag="SAP SD Master Data"
        actions={
          canEdit && (
            <button
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )
        }
      />

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, code, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">{filtered.length} customers registered</span>
      </div>

      {/* Grid of Customers */}
      {loading ? (
        <LoadingSpinner message="Loading Customer Master data..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No customers found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{c.customer_name}</h3>
                  </div>
                  <Badge status={c.status} size="sm" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {c.contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Contact:</span>
                      <span>{c.contact_person}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {c.city}, {c.state || c.country}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Credit Limit:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(c.credit_limit)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {c.payment_terms}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => viewCustomerSummary(c.id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="View Account Profile"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">Ledger</span>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => openAddModal(c)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.code}` : 'Create Customer Master'}
        subtitle="Record customer legal entity, credit terms, and billing address"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Code *</label>
              <input
                type="text"
                required
                disabled={!!editingCustomer}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer / Company Name *</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
                placeholder="e.g. OmniTech Robotics"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax ID / GST</label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing & Shipping Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg border-slate-300"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Credit Limit ($)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Immediate">Immediate / Advance</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Summary & Statement Modal */}
      {selectedCustomerSummary && (
        <Modal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          title={`Customer Account: ${selectedCustomerSummary.customer.customer_name}`}
          subtitle={`Account Code: ${selectedCustomerSummary.customer.code} • Payment Terms: ${selectedCustomerSummary.customer.payment_terms}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Total Sales Volume</span>
                <span className="text-lg font-bold text-slate-900 block mt-1">
                  ${selectedCustomerSummary.total_sales_value.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">{selectedCustomerSummary.total_orders_count} Orders Processed</span>
              </div>

              <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-200">
                <span className="text-rose-800 font-semibold block uppercase text-[10px]">Outstanding Balance</span>
                <span className="text-lg font-bold text-rose-700 block mt-1">
                  ${selectedCustomerSummary.outstanding_balance.toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-600">Pending Receivables</span>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 font-semibold block uppercase text-[10px]">Available Credit</span>
                <span className="text-lg font-bold text-emerald-700 block mt-1">
                  ${selectedCustomerSummary.available_credit.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600">Limit: ${selectedCustomerSummary.credit_limit.toLocaleString()}</span>
              </div>
            </div>

            {/* Invoices List */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                Billing Invoices (SAP SD Billing)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCustomerSummary.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No invoices generated yet
                        </td>
                      </tr>
                    ) : (
                      selectedCustomerSummary.invoices.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                          <td className="py-2 px-3 text-slate-600">{inv.due_date}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">${inv.total_amount}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">${inv.balance_due}</td>
                          <td className="py-2 px-3 text-right">
                            <Badge status={inv.payment_status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Orders */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                Recent Sales Orders (SAP SD)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Order Number</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCustomerSummary.recent_sales_orders.map((so: any) => (
                      <tr key={so.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{so.so_number}</td>
                        <td className="py-2 px-3 text-slate-600">{so.order_date}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">${so.total_amount}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge status={so.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
