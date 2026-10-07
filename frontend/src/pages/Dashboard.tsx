import React, { useState, useEffect } from 'react';
import {
  Package,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Building2,
  Users,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import api from '../api/client';
import { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return <LoadingSpinner message="Calculating real-time ERP metrics & valuation..." />;
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive ERP Dashboard</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-blue-100 text-blue-800">
              SAP MM & SD Core
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time material flows, procurement schedules, outbound sales, and live stock ledger.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* Top Primary KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inventory Value"
          value={formatCurrency(data.total_inventory_value)}
          subtitle={`${data.total_stock_quantity.toLocaleString()} units in warehouses`}
          icon={Boxes}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Monthly Sales Volume"
          value={formatCurrency(data.monthly_sales)}
          subtitle={`Today: ${formatCurrency(data.today_sales)}`}
          change="+14.2%"
          changeType="positive"
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Monthly Purchases (PO)"
          value={formatCurrency(data.monthly_purchases)}
          subtitle={`${data.pending_po_count} purchase orders active`}
          icon={ShoppingCart}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Gross Realized Revenue"
          value={formatCurrency(data.gross_revenue)}
          subtitle="Settled customer invoices"
          change="+8.6%"
          changeType="positive"
          icon={DollarSign}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Secondary Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Materials</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.total_products}</p>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Active SKUs</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Low Stock Alerts</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{data.low_stock_items_count}</p>
          <Link to="/materials" className="text-[11px] text-rose-600 hover:underline font-medium mt-0.5 block">
            Inspect items →
          </Link>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending POs</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.pending_po_count}</p>
          <Link to="/purchase-orders" className="text-[11px] text-blue-600 hover:underline font-medium mt-0.5 block">
            MM workflow →
          </Link>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending SOs</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.pending_so_count}</p>
          <Link to="/sales-orders" className="text-[11px] text-blue-600 hover:underline font-medium mt-0.5 block">
            SD workflow →
          </Link>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Vendors Master</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.total_vendors}</p>
          <Link to="/vendors" className="text-[11px] text-slate-500 hover:underline font-medium mt-0.5 block">
            Suppliers →
          </Link>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Customers Master</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.total_customers}</p>
          <Link to="/customers" className="text-[11px] text-slate-500 hover:underline font-medium mt-0.5 block">
            Accounts →
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases 6-Month Comparison */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Procurement vs Sales Trends</h3>
              <p className="text-xs text-slate-500">6-Month historical comparison (SAP MM PO vs SAP SD SO)</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Monthly ($)</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales_vs_purchases_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="sales" name="Sales Revenue ($)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases Spend ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Valuation by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Inventory Valuation by Category</h3>
            <p className="text-xs text-slate-500">Capital distribution across material groups</p>
          </div>
          <div className="h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.inventory_by_category_chart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.inventory_by_category_chart.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Valuation']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {data.inventory_by_category_chart.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 truncate max-w-[130px]">{cat.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Moving Materials (Sales SD)</h3>
              <p className="text-xs text-slate-500">Highest revenue generating product lines</p>
            </div>
            <Link to="/reports" className="text-xs text-blue-600 hover:underline font-semibold">
              Full Report →
            </Link>
          </div>
          <div className="space-y-3">
            {data.top_selling_products.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales orders posted yet.</p>
            ) : (
              data.top_selling_products.map((p, idx) => (
                <div key={p.material_id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.material_name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{p.material_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">{formatCurrency(p.revenue)}</span>
                    <span className="text-[10px] text-slate-500 block">{p.quantity_sold} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Low Stock & Reorder Trigger List</h3>
                <p className="text-xs text-slate-500">Stock below safety minimum thresholds</p>
              </div>
            </div>
            <Link to="/purchase-requisitions" className="text-xs text-blue-600 hover:underline font-semibold">
              Create Requisition →
            </Link>
          </div>
          <div className="space-y-3">
            {data.low_stock_products.length === 0 ? (
              <div className="text-center py-6">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  ✓ All stock levels optimal
                </span>
              </div>
            ) : (
              data.low_stock_products.map((p) => (
                <div key={p.material_id} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{p.material_name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{p.material_code}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-xs font-bold text-rose-700 block">
                        {p.current_stock} {p.uom}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Reorder at {p.reorder_level}
                      </span>
                    </div>
                    <Badge status={p.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Purchase Orders (SAP MM)
            </h3>
            <Link to="/purchase-orders" className="text-xs text-blue-600 hover:underline font-semibold">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_purchase_orders.map((po) => (
              <div key={po.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">{po.po_number}</span>
                    <Badge status={po.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{po.vendor_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">{formatCurrency(po.total_amount)}</span>
                  <span className="text-[10px] text-slate-400 block">{po.po_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Sales Orders (SAP SD)
            </h3>
            <Link to="/sales-orders" className="text-xs text-blue-600 hover:underline font-semibold">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_sales_orders.map((so) => (
              <div key={so.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">{so.so_number}</span>
                    <Badge status={so.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{so.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">{formatCurrency(so.total_amount)}</span>
                  <span className="text-[10px] text-slate-400 block">{so.order_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
