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
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  IndianRupee,
  Building,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Employee, Department, Designation, Location } from '../../types';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New Employee Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    departmentId: '',
    designationId: '',
    locationId: '',
    pan: '',
    aadhaar: '',
    uan: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    status: 'ACTIVE',
    taxRegime: 'NEW',
    monthlyGross: '50000',
  });

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, deptFilter, statusFilter]);

  const fetchMasters = async () => {
    try {
      const [deptRes, desigRes, locRes] = await Promise.all([
        api.get('/departments'),
        api.get('/designations'),
        api.get('/locations'),
      ]);
      setDepartments(deptRes.data.data || []);
      setDesignations(desigRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (deptFilter) params.departmentId = deptFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/employees', { params });
      if (res.data.success) {
        setEmployees(res.data.data.items);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err: any) {
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        monthlyGross: parseFloat(formData.monthlyGross) || 0,
      };

      const res = await api.post('/employees', payload);
      if (res.data.success) {
        const createdEmp = res.data.data;
        // Assign salary
        if (formData.monthlyGross) {
          await api.post('/salary/assign', {
            employeeId: createdEmp.id,
            monthlyGross: parseFloat(formData.monthlyGross),
          });
        }

        showToast('Employee created and onboarded successfully!', 'success');
        setIsModalOpen(false);
        setFormData({
          employeeId: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          gender: 'Male',
          departmentId: '',
          designationId: '',
          locationId: '',
          pan: '',
          aadhaar: '',
          uan: '',
          accountNumber: '',
          ifsc: '',
          bankName: '',
          status: 'ACTIVE',
          taxRegime: 'NEW',
          monthlyGross: '50000',
        });
        fetchEmployees();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error creating employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle={`Manage staff records, statutory profiles, and employment lifecycles (${totalCount} total)`}
        action={
          <Button
            variant="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add New Employee
          </Button>
        }
      />

      {/* Filters Bar */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by ID, name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div>
            <Select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'All Departments', value: '' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ]}
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Onboarding', value: 'ONBOARDING' },
                { label: 'Exited', value: 'EXITED' },
              ]}
            />
          </div>
        </form>
      </Card>

      {/* Employees Table */}
      <Card>
        {loading ? (
          <Spinner size="md" label="Loading workforce..." />
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No employees match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Employee ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Monthly Gross</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-cyan-700">
                      {emp.employeeId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.department?.name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.designation?.name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {emp.salary
                        ? `₹${Number(emp.salary.monthlyGross).toLocaleString('en-IN')}`
                        : 'Not assigned'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          emp.status === 'ACTIVE'
                            ? 'success'
                            : emp.status === 'ONBOARDING'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/admin/employees/${emp.id}`)}
                      >
                        Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-4">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Onboard New Employee"
        subtitle="Fill in employment, statutory identity, and salary details"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Employee ID *"
              placeholder="e.g. EMP-104"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              required
            />
            <Input
              label="First Name *"
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name *"
              placeholder="Last name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Corporate Email *"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Department"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={[
                { label: 'Select Department', value: '' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ]}
            />
            <Select
              label="Designation"
              value={formData.designationId}
              onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
              options={[
                { label: 'Select Designation', value: '' },
                ...designations.map((d) => ({ label: d.name, value: d.id })),
              ]}
            />
            <Select
              label="Location"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              options={[
                { label: 'Select Location', value: '' },
                ...locations.map((l) => ({ label: l.name, value: l.id })),
              ]}
            />
          </div>

          {/* Statutory and Banking */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Statutory Identity & Bank Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="PAN Card"
                placeholder="ABCDE1234F"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              />
              <Input
                label="Aadhaar Number"
                placeholder="12-digit number"
                value={formData.aadhaar}
                onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
              />
              <Input
                label="UAN (PF Number)"
                placeholder="UAN number"
                value={formData.uan}
                onChange={(e) => setFormData({ ...formData, uan: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Bank Account No."
                placeholder="Account number"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
              <Input
                label="IFSC Code"
                placeholder="e.g. HDFC0001234"
                value={formData.ifsc}
                onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
              />
              <Input
                label="Bank Name"
                placeholder="e.g. HDFC Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>
          </div>

          {/* Salary Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Monthly Gross Salary (₹) *"
              type="number"
              placeholder="50000"
              value={formData.monthlyGross}
              onChange={(e) => setFormData({ ...formData, monthlyGross: e.target.value })}
              required
            />
            <Select
              label="Income Tax Regime"
              value={formData.taxRegime}
              onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
              options={[
                { label: 'New Tax Regime (Standard)', value: 'NEW' },
                { label: 'Old Tax Regime', value: 'OLD' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              Create Employee Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
