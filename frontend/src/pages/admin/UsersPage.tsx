import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  KeyRound,
  Trash2,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Building,
} from 'lucide-react';

interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    status: string;
    department?: { name: string };
    designation?: { name: string };
  } | null;
}

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'HR' as 'HR' | 'ADMIN',
    isActive: true,
  });

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'HR' as 'HR' | 'ADMIN' | 'EMPLOYEE',
    isActive: true,
  });

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/users', { params });
      if (res.data.success && res.data.data) {
        setUsers(res.data.data.items);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load staff users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      showToast('Please fill all required fields.', 'warning');
      return;
    }
    if (createForm.password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    setCreateSaving(true);
    try {
      const res = await api.post('/users', createForm);
      if (res.data.success) {
        showToast(res.data.message || 'Staff account created successfully!', 'success');
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'HR',
          isActive: true,
        });
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create staff account', 'error');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditModal = (user: SystemUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setEditSaving(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}`, editForm);
      if (res.data.success) {
        showToast('User account updated successfully', 'success');
        setIsEditModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const openResetModal = (user: SystemUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'warning');
      return;
    }

    setResetSaving(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, { password: newPassword });
      if (res.data.success) {
        showToast(res.data.message || 'Password reset successfully', 'success');
        setIsResetModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setResetSaving(false);
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own account.', 'warning');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove or deactivate user "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/users/${user.id}`);
      if (res.data.success) {
        showToast(res.data.message || 'User account removed/deactivated', 'success');
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  // Metric counts
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const hrCount = users.filter((u) => u.role === 'HR').length;
  const empCount = users.filter((u) => u.role === 'EMPLOYEE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Staff Access"
        description="Provision and manage Administrator and HR staff accounts with role-based access control."
        action={
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Create Staff / HR Account
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total System Users</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Administrators</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{adminCount}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">HR Managers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{hrCount}</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employees (Portal)</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{empCount}</h3>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="w-full"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'ADMIN', label: 'Administrators' },
                { value: 'HR', label: 'HR Managers' },
                { value: 'EMPLOYEE', label: 'Employees' },
              ]}
              className="w-40"
            />

            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
              className="w-36"
            />
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new HR/Admin account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">User / Account</th>
                  <th className="py-3.5 px-6">System Role</th>
                  <th className="py-3.5 px-6">Linked Profile</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-cyan-400 font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {u.role === 'ADMIN' ? (
                          <Badge variant="purple" className="font-semibold">
                            Administrator
                          </Badge>
                        ) : u.role === 'HR' ? (
                          <Badge variant="blue" className="font-semibold">
                            HR Manager
                          </Badge>
                        ) : (
                          <Badge variant="green" className="font-semibold">
                            Employee
                          </Badge>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-600">
                        {u.employee ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {u.employee.employeeId}
                            </span>
                            {u.employee.designation && (
                              <span className="text-slate-400 block text-[11px]">
                                {u.employee.designation.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Staff Direct Login</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {u.isActive ? (
                          <Badge variant="green" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="gray" dot>
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit User"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Reset Password"
                            onClick={() => openResetModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              title="Delete / Deactivate"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Staff / HR Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <p className="text-xs text-slate-500 mb-2">
            Create an Administrator or HR Manager account. HR accounts can manage employees, leave requests, attendance, and prepare payroll.
          </p>

          <Input
            label="Full Name"
            placeholder="e.g. Priya Sharma"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />

          <Input
            label="Work Email Address"
            type="email"
            placeholder="e.g. priya.hr@yourcompany.com"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            required
          />

          <Select
            label="System Role & Permissions"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
            options={[
              { value: 'HR', label: 'HR Manager (Employee Lifecycle, Attendance, Leaves & Payroll Prep)' },
              { value: 'ADMIN', label: 'Administrator (Full System Authority, Approvals, & Financial Locking)' },
            ]}
          />

          <div className="relative">
            <Input
              label="Temporary / Initial Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              icon={<Lock className="w-4 h-4 text-slate-400" />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveStaff"
              checked={createForm.isActive}
              onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="isActiveStaff" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active Account (User can sign in immediately)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={createSaving}>
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <Select
            label="System Role"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
            options={[
              { value: 'ADMIN', label: 'Administrator' },
              { value: 'HR', label: 'HR Manager' },
              { value: 'EMPLOYEE', label: 'Employee' },
            ]}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="editIsActive" className="text-sm font-medium text-slate-700 cursor-pointer">
              Account Active (Uncheck to suspend login)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={editSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password for ${selectedUser?.name}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-slate-500">
            Directly set a new password for <strong>{selectedUser?.email}</strong>.
          </p>

          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={resetSaving}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
