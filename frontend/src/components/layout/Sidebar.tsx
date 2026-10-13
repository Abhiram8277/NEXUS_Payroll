import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BadgePercent,
  CalendarCheck2,
  CalendarRange,
  Receipt,
  Database,
  BarChart3,
  Settings,
  UserCircle,
  FolderLock,
  Wallet,
  X,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Salary Structures', path: '/admin/salary', icon: BadgePercent },
    { name: 'Attendance', path: '/admin/attendance', icon: CalendarCheck2 },
    { name: 'Leaves', path: '/admin/leaves', icon: CalendarRange },
    { name: 'Payroll Studio', path: '/admin/payroll', icon: Receipt },
    { name: 'Masters Data', path: '/admin/masters', icon: Database },
    { name: 'Reports & Exports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Company Settings', path: '/admin/settings', icon: Settings },
  ];

  const hrNav = [
    { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/hr/employees', icon: Users },
    { name: 'Salary Structures', path: '/hr/salary', icon: BadgePercent },
    { name: 'Attendance', path: '/hr/attendance', icon: CalendarCheck2 },
    { name: 'Leaves', path: '/hr/leaves', icon: CalendarRange },
    { name: 'Payroll Preparation', path: '/hr/payroll', icon: Receipt },
    { name: 'Reports & Exports', path: '/hr/reports', icon: BarChart3 },
  ];

  const employeeNav = [
    { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/employee/profile', icon: UserCircle },
    { name: 'My Salary', path: '/employee/salary', icon: Wallet },
    { name: 'My Payslips', path: '/employee/payslips', icon: CreditCard },
    { name: 'My Attendance', path: '/employee/attendance', icon: CalendarCheck2 },
    { name: 'My Leaves', path: '/employee/leaves', icon: CalendarRange },
    { name: 'My Documents', path: '/employee/documents', icon: FolderLock },
  ];

  const currentNav =
    user?.role === 'ADMIN' ? adminNav : user?.role === 'HR' ? hrNav : employeeNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-950 text-slate-300 transition-transform duration-300 ease-in-out border-r border-navy-800/80 shadow-2xl lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-navy-800/80 bg-navy-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-cyan-500/25">
              N
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">NEXUS</span>
              <span className="text-[10px] text-cyan-400 font-medium tracking-wide block">
                Payroll, without the paperwork.
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-navy-900 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {user?.role === 'ADMIN' ? 'Enterprise Administration' : user?.role === 'HR' ? 'HR Management' : 'Employee Self-Service'}
          </div>

          {currentNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-navy-900/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-navy-900/90 bg-navy-950/80">
          <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-800/60 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Platform</span>
              <span className="text-cyan-400 font-semibold">v1.0.0 MVP</span>
            </div>
            <p className="text-[11px] text-slate-500">Statutory Indian Payroll SaaS</p>
          </div>
        </div>
      </aside>
    </>
  );
};
