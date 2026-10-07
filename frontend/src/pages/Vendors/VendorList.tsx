import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, Phone, Mail, MapPin, Eye, Edit2, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { Vendor } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const VendorList: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canEdit = hasRole(['Admin', 'Procurement Manager']);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendorSummary, setSelectedVendorSummary] = useState<any | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    tax_id: '',
    payment_terms: 'Net 30',
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const openAddModal = (v?: Vendor) => {
    if (v) {
      setEditingVendor(v);
      setFormData({
        code: v.code,
        company_name: v.company_name,
        contact_person: v.contact_person || '',
        email: v.email,
        phone: v.phone || '',
        address: v.address || '',
        city: v.city || '',
        state: v.state || '',
        country: v.country,
        tax_id: v.tax_id || '',
        payment_terms: v.payment_terms,
      });
    } else {
      setEditingVendor(null);
      setFormData({
        code: `VEN-${Math.floor(1000 + Math.random() * 9000)}`,
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'USA',
        tax_id: `TAX-${Math.floor(1000 + Math.random() * 9000)}`,
        payment_terms: 'Net 30',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, formData);
        success('Vendor details updated');
      } else {
        await api.post('/vendors', formData);
        success('New vendor created');
      }
      setIsAddModalOpen(false);
      fetchVendors();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to save vendor');
    }
  };

  const viewVendorSummary = async (id: number) => {
    try {
      const res = await api.get(`/vendors/${id}/summary`);
      setSelectedVendorSummary(res.data);
      setIsSummaryOpen(true);
    } catch (err: any) {
      error('Could not fetch vendor performance summary');
    }
  };

  const filtered = vendors.filter(
    (v) =>
      v.company_name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_person && v.contact_person.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Master (MM)"
        subtitle="Supplier registry, payment terms, purchasing history, and vendor performance"
        sapModuleTag="SAP MM Master Data"
        actions={
          canEdit && (
            <button
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
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
            placeholder="Search vendor company, code, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">{filtered.length} suppliers active</span>
      </div>

      {/* Grid of Vendors */}
      {loading ? (
        <LoadingSpinner message="Loading Vendor Master data..." />
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No vendors found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {v.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">{v.company_name}</h3>
                  </div>
                  <Badge status={v.status} size="sm" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {v.contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Contact:</span>
                      <span>{v.contact_person}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{v.email}</span>
                  </div>
                  {v.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{v.phone}</span>
                    </div>
                  )}
                  {v.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {v.city}, {v.state || v.country}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {v.payment_terms}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => viewVendorSummary(v.id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="View Analytics"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">Stats</span>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => openAddModal(v)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Vendor"
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
        title={editingVendor ? `Edit Vendor: ${editingVendor.code}` : 'Create Vendor Master'}
        subtitle="Record supplier legal identity, contact credentials, and trading terms"
      >
        <form onSubmit={handleSaveVendor} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor Code *</label>
              <input
                type="text"
                required
                disabled={!!editingVendor}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300"
                placeholder="e.g. Apex Silicon Ltd"
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
            <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
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
              <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* Vendor Performance Summary Modal */}
      {selectedVendorSummary && (
        <Modal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          title={`Vendor Profile: ${selectedVendorSummary.vendor.company_name}`}
          subtitle={`Supplier code: ${selectedVendorSummary.vendor.code} • Payment Terms: ${selectedVendorSummary.vendor.payment_terms}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Total Purchases</span>
                <span className="text-lg font-bold text-slate-900 block mt-1">
                  ${selectedVendorSummary.total_purchase_value.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">{selectedVendorSummary.total_orders_count} Purchase Orders</span>
              </div>

              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                <span className="text-amber-800 font-semibold block uppercase text-[10px]">Pending Orders</span>
                <span className="text-lg font-bold text-amber-700 block mt-1">
                  {selectedVendorSummary.pending_orders_count}
                </span>
                <span className="text-[10px] text-amber-600">Awaiting Delivery</span>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 font-semibold block uppercase text-[10px]">Completed Orders</span>
                <span className="text-lg font-bold text-emerald-700 block mt-1">
                  {selectedVendorSummary.completed_orders_count}
                </span>
                <span className="text-[10px] text-emerald-600">Fully Received</span>
              </div>
            </div>

            {/* Supplied Materials */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                Materials Sourced from Vendor ({selectedVendorSummary.materials_supplied.length})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3 text-right">Negotiated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVendorSummary.materials_supplied.map((m: any) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{m.material_code}</td>
                        <td className="py-2 px-3 text-slate-700">{m.name}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">${m.purchase_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Orders */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                Recent Purchase Orders
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">PO Number</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVendorSummary.recent_purchase_orders.map((po: any) => (
                      <tr key={po.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{po.po_number}</td>
                        <td className="py-2 px-3 text-slate-600">{po.po_date}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">${po.total_amount}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge status={po.status} size="sm" />
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
