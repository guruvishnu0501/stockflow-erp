import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ArrowRightLeft, ArrowDownToLine, ArrowUpRight, SlidersHorizontal, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { StockMovement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const StockMovements: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/movements?limit=200');
      setMovements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'Goods Receipt':
      case 'Purchase':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Goods Issue':
      case 'Sales':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Adjustment':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Transfer':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filtered = movements.filter((sm) => {
    const matchesType = movementTypeFilter ? sm.movement_type === movementTypeFilter : true;
    const matchesSearch =
      sm.material_name.toLowerCase().includes(search.toLowerCase()) ||
      sm.material_code.toLowerCase().includes(search.toLowerCase()) ||
      (sm.reference_id && sm.reference_id.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements Ledger"
        subtitle="Immutable transaction audit log of all physical inventory debits, credits, transfers, and adjustments"
        sapModuleTag="SAP MM Stock Ledger"
        actions={
          <button
            onClick={fetchMovements}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Ledger
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search material or reference (PO, SO, GR)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Movement Type:</span>
          <select
            value={movementTypeFilter}
            onChange={(e) => {
              setMovementTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium"
          >
            <option value="">All Movement Types</option>
            <option value="Goods Receipt">Goods Receipt (GR)</option>
            <option value="Goods Issue">Goods Issue (GI / PGI)</option>
            <option value="Adjustment">Adjustment</option>
            <option value="Transfer">Inter-Warehouse Transfer</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <LoadingSpinner message="Querying immutable stock movements ledger..." />
      ) : paginated.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No stock movements found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Material Master</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4 text-center">Quantity Delta</th>
                  <th className="py-3 px-4 text-center">Balance After</th>
                  <th className="py-3 px-4">Ref Document</th>
                  <th className="py-3 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginated.map((sm) => {
                  const isPositive = ['Goods Receipt', 'Purchase'].includes(sm.movement_type);
                  return (
                    <tr key={sm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(sm.created_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getMovementBadge(
                            sm.movement_type
                          )}`}
                        >
                          {sm.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{sm.material_name}</span>
                        <span className="font-mono text-[10px] text-blue-600 block">{sm.material_code}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sm.dest_warehouse_name ? (
                          <span>
                            {sm.warehouse_name} → {sm.dest_warehouse_name}
                          </span>
                        ) : (
                          sm.warehouse_name
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-slate-800'}>
                          {isPositive ? `+${sm.quantity}` : `-${sm.quantity}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{sm.balance_after}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 block">
                          {sm.reference_id || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{sm.reference_type}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{sm.username || 'SYSTEM'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of{' '}
              {filtered.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
