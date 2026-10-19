import React, { useState, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyName, setCompanyName] = useState('NEXUS');
  const [financialYear, setFinancialYear] = useState('FY 2026-27');

  useEffect(() => {
    api
      .get('/company')
      .then((res) => {
        if (res.data.success && res.data.data?.name) {
          setCompanyName(res.data.data.name);
          if (res.data.data.financialYear) {
            setFinancialYear(`FY ${res.data.data.financialYear}`);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Small screen brand indicator */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy-950 flex items-center justify-center font-bold text-cyan-400 text-sm">
            N
          </div>
          <span className="font-bold text-slate-900 tracking-tight">NEXUS</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/60">
          <Building2 className="w-3.5 h-3.5 text-cyan-600" />
          <span>{companyName}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-semibold">{financialYear}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Role Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
          <span>{user?.role}</span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-900 to-navy-800 text-cyan-400 font-bold flex items-center justify-center text-sm shadow-sm border border-navy-700">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-400 mt-1 leading-none">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-elevated border border-slate-100 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Signed in as</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
