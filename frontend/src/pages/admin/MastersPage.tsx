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
import {
  Database,
  Building,
  Briefcase,
  MapPin,
  CalendarDays,
  CalendarRange,
  Scale,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import {
  Department,
  Designation,
  Location,
  LeaveType,
  Holiday,
  StatutoryConfig,
} from '../../types';

export const MastersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'departments' | 'designations' | 'locations' | 'leavetypes' | 'holidays' | 'statutory'
  >('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [statutoryConfigs, setStatutoryConfigs] = useState<StatutoryConfig[]>([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});

  const { showToast } = useToast();

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const [deptRes, desigRes, locRes, leaveRes, holRes, statRes] = await Promise.all([
        api.get('/departments'),
        api.get('/designations'),
        api.get('/locations'),
        api.get('/leave-types'),
        api.get('/holidays'),
        api.get('/statutory'),
      ]);
      setDepartments(deptRes.data.data || []);
      setDesignations(desigRes.data.data || []);
      setLocations(locRes.data.data || []);
      setLeaveTypes(leaveRes.data.data || []);
      setHolidays(holRes.data.data || []);
      setStatutoryConfigs(statRes.data.data || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load master configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    if (activeTab === 'departments') {
      setFormData({ name: '', code: '', description: '', isActive: true });
    } else if (activeTab === 'designations') {
      setFormData({ name: '', code: '', description: '', isActive: true });
    } else if (activeTab === 'locations') {
      setFormData({ name: '', city: '', state: '', country: 'India', pinCode: '', isActive: true });
    } else if (activeTab === 'leavetypes') {
      setFormData({
        name: '',
        code: '',
        annualAllocation: 12,
        carryForwardAllowed: true,
        maxCarryForward: 15,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
      });
    } else if (activeTab === 'holidays') {
      setFormData({ name: '', date: '', description: '' });
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setModalSaving(true);
      let endpoint = '';
      if (activeTab === 'departments') endpoint = '/departments';
      else if (activeTab === 'designations') endpoint = '/designations';
      else if (activeTab === 'locations') endpoint = '/locations';
      else if (activeTab === 'leavetypes') endpoint = '/leave-types';
      else if (activeTab === 'holidays') endpoint = '/holidays';

      if (editingItem) {
        await api.put(`${endpoint}/${editingItem.id}`, formData);
        showToast('Updated successfully', 'success');
      } else {
        await api.post(endpoint, formData);
        showToast('Created successfully', 'success');
      }

      setModalOpen(false);
      fetchMasters();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${name}"?`)) return;
    try {
      let endpoint = '';
      if (activeTab === 'departments') endpoint = '/departments';
      else if (activeTab === 'designations') endpoint = '/designations';
      else if (activeTab === 'locations') endpoint = '/locations';
      else if (activeTab === 'leavetypes') endpoint = '/leave-types';
      else if (activeTab === 'holidays') endpoint = '/holidays';

      const res = await api.delete(`${endpoint}/${id}`);
      showToast(res.data?.message || 'Deleted successfully', 'success');
      fetchMasters();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Delete operation failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Masters & Statutory Compliance"
        description="Centralized master configurations for organizational structure, locations, calendars, and government statutory tax schedules."
        action={
          activeTab !== 'statutory' ? (
            <Button variant="primary" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1.5" /> Add {activeTab.slice(0, -1)}
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'departments', label: 'Departments', icon: Building },
          { id: 'designations', label: 'Designations', icon: Briefcase },
          { id: 'locations', label: 'Locations', icon: MapPin },
          { id: 'leavetypes', label: 'Leave Types', icon: CalendarRange },
          { id: 'holidays', label: 'Holidays', icon: CalendarDays },
          { id: 'statutory', label: 'Statutory Slabs', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Departments */}
      {activeTab === 'departments' && (
        <Card orientation="vertical" title={`Departments (${departments.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Department Name</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{dept.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{dept.code}</td>
                    <td className="px-6 py-3.5 text-slate-500">{dept.description || '—'}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={dept.isActive ? 'success' : 'neutral'}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(dept)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(dept.id, dept.name)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Designations */}
      {activeTab === 'designations' && (
        <Card orientation="vertical" title={`Designations (${designations.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Designation Title</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {designations.map((desig) => (
                  <tr key={desig.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{desig.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{desig.code}</td>
                    <td className="px-6 py-3.5 text-slate-500">{desig.description || '—'}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={desig.isActive ? 'success' : 'neutral'}>
                        {desig.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(desig)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(desig.id, desig.name)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Locations */}
      {activeTab === 'locations' && (
        <Card orientation="vertical" title={`Operating Locations (${locations.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Branch Location</th>
                  <th className="px-6 py-3">City / State</th>
                  <th className="px-6 py-3">PIN Code</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{loc.name}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {loc.city}, {loc.state}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {loc.pinCode || '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={loc.isActive ? 'success' : 'neutral'}>
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(loc)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(loc.id, loc.name)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Leave Types */}
      {activeTab === 'leavetypes' && (
        <Card orientation="vertical" title={`Configured Leave Policies (${leaveTypes.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Leave Name</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3 text-center">Annual Allocation</th>
                  <th className="px-6 py-3 text-center">Carry Forward</th>
                  <th className="px-6 py-3 text-center">Paid Leave</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{lt.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{lt.code}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-900">
                      {lt.annualAllocation} days
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge variant={lt.carryForwardAllowed ? 'success' : 'neutral'}>
                        {lt.carryForwardAllowed ? `Yes (max ${lt.maxCarryForward})` : 'No'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge variant={lt.isPaid ? 'cyan' : 'warning'}>
                        {lt.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(lt)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(lt.id, lt.name)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: Holidays */}
      {activeTab === 'holidays' && (
        <Card orientation="vertical" title={`Official Holiday Calendar (${holidays.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Holiday</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{h.name}</td>
                    <td className="px-6 py-3.5 font-semibold text-blue-600">
                      {new Date(h.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{h.description || 'Public holiday'}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(h)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(h.id, h.name)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 6: Statutory Slabs */}
      {activeTab === 'statutory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statutoryConfigs.map((cfg) => (
              <Card key={cfg.id} className="p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">{cfg.configType} Rules</h3>
                  </div>
                  <Badge variant="cyan">Indian Statutory Act</Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="text-slate-400 font-semibold uppercase">Rule Parameters:</div>
                  <pre className="p-3 bg-slate-900 text-cyan-300 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(cfg.rulesJson, null, 2)}
                  </pre>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Effective From: {new Date(cfg.effectiveFrom).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingItem ? 'Edit' : 'Add'} ${activeTab.slice(0, -1)}`}
      >
        <form onSubmit={handleSubmitModal} className="space-y-4">
          {activeTab === 'departments' && (
            <>
              <Input
                label="Department Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </>
          )}

          {activeTab === 'designations' && (
            <>
              <Input
                label="Designation Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </>
          )}

          {activeTab === 'locations' && (
            <>
              <Input
                label="Location Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="City"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <Input
                label="State"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
              <Input
                label="PIN Code"
                value={formData.pinCode || ''}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
              />
            </>
          )}

          {activeTab === 'leavetypes' && (
            <>
              <Input
                label="Leave Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="Annual Allocation (Days)"
                type="number"
                value={formData.annualAllocation || 0}
                onChange={(e) =>
                  setFormData({ ...formData, annualAllocation: Number(e.target.value) })
                }
                required
              />
            </>
          )}

          {activeTab === 'holidays' && (
            <>
              <Input
                label="Holiday Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Date"
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={modalSaving}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
