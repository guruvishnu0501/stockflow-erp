import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Package,
  TrendingUp,
  DollarSign,
  Building,
  RefreshCw,
  Search,
  PieChart as PieIcon,
  ArrowUpRight,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import api from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

type ReportTab = 'inventory' | 'sales' | 'products' | 'purchases';

export const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  // Tab 1: Inventory Valuation
  const [inventoryReport, setInventoryReport] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [invSearch, setInvSearch] = useState<string>('');

  // Tab 2: Sales Report
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [periodType, setPeriodType] = useState<string>('monthly');

  // Tab 3: Products Report
  const [productReport, setProductReport] = useState<any[]>([]);
  const [prodSearch, setProdSearch] = useState<string>('');

  // Tab 4: Vendor Purchases Report
  const [purchaseReport, setPurchaseReport] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState<string>('');

  // Warehouse list for filtering
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const [invRes, whRes] = await Promise.all([
          api.get('/reports/inventory', {
            params: { warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined },
          }),
          warehouses.length === 0 ? api.get('/warehouses') : Promise.resolve({ data: warehouses }),
        ]);
        setInventoryReport(invRes.data);
        if (warehouses.length === 0) setWarehouses(whRes.data);
      } else if (activeTab === 'sales') {
        const res = await api.get('/reports/sales', { params: { period_type: periodType } });
        setSalesReport(res.data);
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/products');
        setProductReport(res.data);
      } else if (activeTab === 'purchases') {
        const res = await api.get('/reports/purchases');
        setPurchaseReport(res.data);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedWarehouse, periodType]);

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/reports/inventory/export/csv', {
        params: { warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_valuation_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('success', 'Inventory CSV export downloaded successfully');
    } catch (err: any) {
      showToast('error', 'Failed to export CSV report');
    }
  };

  // Computations for Inventory Valuation
  const totalCostValuation = inventoryReport.reduce((acc, r) => acc + (r.total_cost_value || 0), 0);
  const totalSalesValuation = inventoryReport.reduce((acc, r) => acc + (r.potential_sales_value || 0), 0);
  const totalUnitsOnHand = inventoryReport.reduce((acc, r) => acc + (r.quantity_on_hand || 0), 0);
  const unrealizedMargin = totalSalesValuation - totalCostValuation;

  const filteredInventory = inventoryReport.filter((r) => {
    const term = invSearch.toLowerCase();
    return (
      r.material_code.toLowerCase().includes(term) ||
      r.material_name.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term) ||
      r.warehouse.toLowerCase().includes(term)
    );
  });

  const filteredProducts = productReport.filter((r) => {
    const term = prodSearch.toLowerCase();
    return (
      r.material_code.toLowerCase().includes(term) ||
      r.material_name.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term)
    );
  });

  const filteredVendors = purchaseReport.filter((r) => {
    const term = vendorSearch.toLowerCase();
    return r.vendor_name.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Reporting & Business Intelligence"
        subtitle="Multi-dimensional analytics for SAP MM inventory valuation, vendor procurement spend, and SAP SD sales performance."
        breadcrumbs={[
          { label: 'Intelligence', href: '/reports' },
          { label: 'Reports Hub' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'inventory' && (
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-xs"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Report Module Navigation Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Valuation Matrix
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Sales Revenue Dynamics
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'products'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Velocity & Margin
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'purchases'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Vendor Spend & Fulfillment
        </button>
      </div>

      {/* TAB 1: INVENTORY VALUATION MATRIX */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Units On Hand
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {totalUnitsOnHand.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">Across all warehouses</span>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Inventory Cost (Asset)
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                ${totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-blue-700 font-medium mt-1 block">
                Based on purchase price
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Potential Sales Realization
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                ${totalSalesValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-emerald-700 font-medium mt-1 block">
                Based on retail catalog price
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Unrealized Gross Margin
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                ${unrealizedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-indigo-700 font-medium mt-1 block">
                {totalCostValuation > 0
                  ? `+${((unrealizedMargin / totalCostValuation) * 100).toFixed(1)}% Projected Markup`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search material code, name, warehouse..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500">Warehouse:</span>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Valuation Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="lg" message="Calculating inventory asset valuation..." />
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-medium text-slate-700">No inventory records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Material Code</th>
                      <th className="py-3.5 px-4">Material Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Warehouse</th>
                      <th className="py-3.5 px-4 text-right">On Hand Qty</th>
                      <th className="py-3.5 px-4 text-right">Cost Price</th>
                      <th className="py-3.5 px-4 text-right">Sell Price</th>
                      <th className="py-3.5 px-4 text-right">Total Asset Cost</th>
                      <th className="py-3.5 px-4 text-right">Potential Sales Val</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                          {row.material_code}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {row.material_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{row.warehouse}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {row.quantity_on_hand} <span className="text-xs text-slate-500 font-normal">{row.uom}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ${row.purchase_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ${row.selling_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                          ${row.total_cost_value.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          ${row.potential_sales_value.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              row.stock_status === 'In Stock'
                                ? 'success'
                                : row.stock_status === 'Low Stock'
                                ? 'warning'
                                : row.stock_status === 'Out of Stock'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {row.stock_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SALES REVENUE DYNAMICS */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Sales Revenue Trend</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Period Interval:</span>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly Aggregate</option>
                <option value="weekly">Weekly Aggregate</option>
                <option value="daily">Daily Aggregate</option>
                <option value="yearly">Yearly Aggregate</option>
              </select>
            </div>
          </div>

          {/* Area Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            {salesReport.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesReport} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Total Revenue']}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_sales"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500">No historical sales data for this range</div>
            )}
          </div>

          {/* Table Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-center">Orders Count</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Average Order Value</th>
                  <th className="py-3 px-4 text-right">Total Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReport.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.period}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{item.order_count}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{item.items_sold}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      ${item.average_order_value.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      ${item.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT VELOCITY & MARGIN */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search material code, name, category..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Ranked by Total Revenue Generated</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Material Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Units Sold</th>
                  <th className="py-3 px-4 text-right">Stock Level</th>
                  <th className="py-3 px-4 text-right">Total Realized Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => (
                  <tr key={p.material_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                      {p.material_code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.material_name}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.units_sold} {p.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {p.current_stock}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                      ${p.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VENDOR PROCUREMENT SPEND */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor supplier name..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Procurement Spend by Supplier</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4 text-center">Total Purchase Orders</th>
                  <th className="py-3 px-4 text-center">Completed (MIGO)</th>
                  <th className="py-3 px-4 text-center">Pending / In-Transit</th>
                  <th className="py-3 px-4 text-right">Total Procurement Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{v.vendor_name}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium">{v.po_count}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                        {v.completed_pos}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                        {v.pending_pos}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      ${v.total_purchased.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportsHub;
