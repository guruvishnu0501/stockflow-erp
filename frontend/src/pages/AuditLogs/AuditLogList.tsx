import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Filter,
  User,
  Clock,
  Layers,
  FileCode,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import api from '../../api/client';
import { AuditLog } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<AuditLog[]>('/audit-logs', {
        params: {
          limit: 150,
          module: selectedModule !== 'ALL' ? selectedModule : undefined,
        },
      });
      setLogs(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.username.toLowerCase().includes(term) ||
      l.module.toLowerCase().includes(term) ||
      (l.record_id && l.record_id.toLowerCase().includes(term)) ||
      l.description.toLowerCase().includes(term)
    );
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('RECEIPT') || action.includes('ISSUE') || action.includes('PAYMENT')) {
      return 'success';
    }
    if (action.includes('ADJUST') || action.includes('TRANSFER')) {
      return 'warning';
    }
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('REJECT')) {
      return 'danger';
    }
    if (action.includes('CREATE') || action.includes('CONFIRM')) {
      return 'info';
    }
    return 'default';
  };

  const formatJson = (val?: string) => {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Compliance & Audit Trail"
        subtitle="Immutable transaction logging recording every business mutation, material movement, price adjustment, and security event."
        breadcrumbs={[
          { label: 'Governance', href: '/audit-logs' },
          { label: 'Audit Trail' },
        ]}
        actions={
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Compliance Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4.5 shadow-md flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="text-xs text-indigo-100/90 leading-relaxed">
          <span className="font-bold text-white text-sm block mb-1">
            Tamper-Resistant Regulatory Audit Ledger
          </span>
          StockFlow ERP maintains strict compliance with financial audit guidelines. All operations spanning Material Master creation, Purchase Order approvals, Goods Receipts, Post Goods Issue stock decrements, and Invoice collections generate unalterable records timestamped with user credentials and IP provenance.
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, record ID, memo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Module:</span>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Functional Modules</option>
            <option value="Inventory">Inventory Management</option>
            <option value="Procurement">Procurement (MM)</option>
            <option value="Goods Receipt">Goods Receipt (MIGO)</option>
            <option value="Sales">Sales & Distribution (SD)</option>
            <option value="Billing">Billing & Invoices</option>
            <option value="Material Master">Material Master</option>
            <option value="User Management">User Management</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" message="Loading immutable audit logs..." />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Record Identifier</th>
                  <th className="py-3.5 px-4">Event Description</th>
                  <th className="py-3.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.username}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-xs text-blue-600">
                      {log.record_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(log.old_values || log.new_values) ? (
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect Diff
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No delta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYLOAD INSPECTOR MODAL */}
      <Modal
        isOpen={isDetailModalOpen && !!selectedLog}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Audit Event Inspection – ${selectedLog?.action}`}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block">Operator Username:</span>
                <span className="font-semibold text-slate-900">{selectedLog.username}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Functional Domain:</span>
                <span className="font-semibold text-slate-900">{selectedLog.module}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Record Reference:</span>
                <span className="font-mono font-bold text-blue-600">{selectedLog.record_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-mono text-slate-700">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Audit Summary:</span>
                <span className="text-slate-800 font-medium">{selectedLog.description}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prior State */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Prior State (Before Mutation)
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                  <pre>{formatJson(selectedLog.old_values) || '/* No prior state recorded */'}</pre>
                </div>
              </div>

              {/* Mutated State */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  New State (Committed)
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                  <pre>{formatJson(selectedLog.new_values) || '/* No delta payload recorded */'}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default AuditLogList;
