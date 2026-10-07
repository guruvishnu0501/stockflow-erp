import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  Warehouse,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  ArrowDownToLine,
  ArrowRightLeft,
  Receipt,
  BarChart3,
  ShieldAlert,
  UserCog,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  sapTag?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, hasRole, isAdmin } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'SAP MM – PROCUREMENT',
      sapTag: 'MM',
      items: [
        { name: 'Material Master', path: '/materials', icon: Package },
        { name: 'Vendor Master', path: '/vendors', icon: Building2 },
        { name: 'Purchase Requisitions', path: '/purchase-requisitions', icon: FileSpreadsheet },
        { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart },
        { name: 'Goods Receipts (MIGO)', path: '/goods-receipts', icon: ArrowDownToLine },
      ],
    },
    {
      title: 'SAP SD – SALES & LOGISTICS',
      sapTag: 'SD',
      items: [
        { name: 'Customer Master', path: '/customers', icon: Users },
        { name: 'Sales Orders', path: '/sales-orders', icon: ShoppingCart },
        { name: 'Deliveries & Goods Issue', path: '/deliveries', icon: Truck },
      ],
    },
    {
      title: 'INVENTORY MANAGEMENT',
      items: [
        { name: 'Stock Balances', path: '/inventory', icon: Package },
        { name: 'Stock Movements Ledger', path: '/stock-movements', icon: ArrowRightLeft },
        { name: 'Warehouses', path: '/warehouses', icon: Warehouse },
      ],
    },
    {
      title: 'FINANCE & GOVERNANCE',
      items: [
        { name: 'Invoices & Billing', path: '/invoices', icon: Receipt },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
        { name: 'Audit Trail', path: '/audit-logs', icon: ShieldAlert },
        ...(isAdmin
          ? [{ name: 'User Management', path: '/users', icon: UserCog }]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            SF
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
              StockFlow <span className="text-blue-400 font-medium">ERP</span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase block">
              SAP MM & SD Workflow
            </span>
          </div>
        </div>

        {/* Navigation Section List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </span>
                {section.sapTag && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-blue-400 border border-slate-700">
                    {section.sapTag}
                  </span>
                )}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-blue-400 truncate mt-0.5">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
