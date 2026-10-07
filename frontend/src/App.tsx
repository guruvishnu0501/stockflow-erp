import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MaterialList } from './pages/Materials/MaterialList';
import { VendorList } from './pages/Vendors/VendorList';
import { CustomerList } from './pages/Customers/CustomerList';
import { PRList } from './pages/PurchaseRequisitions/PRList';
import { POList } from './pages/PurchaseOrders/POList';
import { GRList } from './pages/GoodsReceipts/GRList';
import { SOList } from './pages/SalesOrders/SOList';
import { DeliveryList } from './pages/Deliveries/DeliveryList';
import { InventoryOverview } from './pages/Inventory/InventoryOverview';
import { StockMovements } from './pages/Inventory/StockMovements';
import { WarehouseList } from './pages/Warehouses/WarehouseList';
import { InvoiceList } from './pages/Invoices/InvoiceList';
import { ReportsHub } from './pages/Reports/ReportsHub';
import { AuditLogList } from './pages/AuditLogs/AuditLogList';
import { UserList } from './pages/Users/UserList';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, token, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner size="lg" message="Authenticating StockFlow session..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles as any)) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 max-w-lg mx-auto mt-20 shadow-xs">
        <h2 className="text-xl font-bold text-rose-600 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your current security role (<strong>{user.role}</strong>) does not have authorization to view this module.
        </p>
        <a
          href="/dashboard"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

// 404 Component
const NotFound: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="text-7xl font-black text-slate-200">404</div>
      <h1 className="text-2xl font-bold text-slate-800 mt-2">Document or View Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mt-2">
        The requested URL does not match any registered StockFlow ERP module or transaction code.
      </p>
      <a
        href="/dashboard"
        className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
      >
        Back to Dashboard
      </a>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected ERP Application routes within Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* SAP MM – Materials & Procurement */}
              <Route path="materials" element={<MaterialList />} />
              <Route path="vendors" element={<VendorList />} />
              <Route path="purchase-requisitions" element={<PRList />} />
              <Route path="purchase-orders" element={<POList />} />
              <Route path="goods-receipts" element={<GRList />} />

              {/* SAP SD – Customers & Sales */}
              <Route path="customers" element={<CustomerList />} />
              <Route path="sales-orders" element={<SOList />} />
              <Route path="deliveries" element={<DeliveryList />} />

              {/* Inventory Management */}
              <Route path="inventory" element={<InventoryOverview />} />
              <Route path="stock-movements" element={<StockMovements />} />
              <Route path="warehouses" element={<WarehouseList />} />

              {/* Finance & Reporting */}
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="reports" element={<ReportsHub />} />
              <Route path="audit-logs" element={<AuditLogList />} />

              {/* Admin Only */}
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UserList />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
