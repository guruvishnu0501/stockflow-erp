import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      success('Logged in successfully', 'Welcome back');
      navigate('/dashboard');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Invalid username or password', 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl shadow-xl shadow-blue-500/30 mb-4 ring-4 ring-blue-500/20">
          SF
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">StockFlow ERP</h2>
        <p className="mt-1 text-sm text-slate-300">
          Integrated Inventory & Sales Management <span className="text-blue-400 font-semibold">(SAP MM / SD)</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
              One-Click Demo Roles
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoUser('admin', 'admin123')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-900 block leading-tight">Admin</span>
                <span className="text-[11px] text-slate-500 block">Full system access</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('procure_mgr', 'procure123')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-900 block leading-tight">Procurement Mgr</span>
                <span className="text-[11px] text-slate-500 block">PR, PO & Goods Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('sales_mgr', 'sales123')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-900 block leading-tight">Sales Mgr</span>
                <span className="text-[11px] text-slate-500 block">SO, ATP & Deliveries</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('inv_mgr', 'inv123')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <span className="font-bold text-slate-900 block leading-tight">Inventory Mgr</span>
                <span className="text-[11px] text-slate-500 block">Stock, Transfers & Audit</span>
              </button>
            </div>
          </div>
        </div>

        {/* SAP Architecture Note */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Enterprise Role-Based Access Control • JWT Bearer Authentication</p>
        </div>
      </div>
    </div>
  );
};
