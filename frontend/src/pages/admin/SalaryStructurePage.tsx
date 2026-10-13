import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Spinner } from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  BadgePercent,
  Plus,
  Layers,
  Users,
  CheckCircle,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Search,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { SalaryTemplate, SalaryComponent, Employee } from '../../types';

const formatCurrency = (val: number | string) =>
  '₹' + Number(val || 0).toLocaleString('en-IN');

export const SalaryStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'components' | 'assign'>('templates');
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Component Create/Edit Modal
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compSaving, setCompSaving] = useState(false);
  const [compForm, setCompForm] = useState({
    name: '',
    code: '',
    type: 'EARNING' as 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION',
    calculationType: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE' | 'FORMULA',
    value: 0,
    description: '',
    isActive: true,
  });

  // Template Create/Edit Modal
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [tempSaving, setTempSaving] = useState(false);
  const [tempForm, setTempForm] = useState({
    name: '',
    description: '',
    isActive: true,
    recalculateAssigned: true,
    selectedComponents: [] as Array<{
      componentId: string;
      calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
      value: number;
      formula?: string;
    }>,
  });

  // View Template Modal
  const [viewingTemplate, setViewingTemplate] = useState<SalaryTemplate | null>(null);

  // Bulk Salary Assignment State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [assignStatusFilter, setAssignStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm, setAssignForm] = useState({
    templateId: '',
    monthlyGross: '50000',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [previewComponents, setPreviewComponents] = useState<any[]>([]);
  const [lastBulkResult, setLastBulkResult] = useState<any | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const gross = Number(assignForm.monthlyGross);
    if (gross > 0) {
      api
        .get('/salary/preview-breakdown', {
          params: {
            monthlyGross: gross,
            templateId: assignForm.templateId || undefined,
          },
        })
        .then((res) => {
          if (res.data.success) {
            setPreviewComponents(res.data.data?.components || []);
          }
        })
        .catch(() => {});
    } else {
      setPreviewComponents([]);
    }
  }, [assignForm.monthlyGross, assignForm.templateId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tempRes, compRes, empRes] = await Promise.all([
        api.get('/salary/templates?all=true'),
        api.get('/salary-components?all=true'),
        api.get('/employees?limit=200'),
      ]);
      setTemplates(tempRes.data.data || []);
      setComponents(compRes.data.data || []);
      setEmployees(empRes.data.data?.items || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load salary structure details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Component Handlers ---
  const openCreateComponent = () => {
    setEditingCompId(null);
    setCompForm({
      name: '',
      code: '',
      type: 'EARNING',
      calculationType: 'PERCENTAGE',
      value: 0,
      description: '',
      isActive: true,
    });
    setIsCompModalOpen(true);
  };

  const openEditComponent = (comp: SalaryComponent) => {
    setEditingCompId(comp.id);
    setCompForm({
      name: comp.name,
      code: comp.code,
      type: comp.type,
      calculationType: comp.calculationType,
      value: comp.value,
      description: comp.description || '',
      isActive: comp.isActive,
    });
    setIsCompModalOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCompSaving(true);
      if (editingCompId) {
        const res = await api.put(`/salary-components/${editingCompId}`, {
          ...compForm,
          value: Number(compForm.value),
        });
        if (res.data.success) {
          showToast('Salary component updated successfully', 'success');
          setIsCompModalOpen(false);
          fetchData();
        }
      } else {
        const res = await api.post('/salary-components', {
          ...compForm,
          value: Number(compForm.value),
        });
        if (res.data.success) {
          showToast('Salary component created successfully', 'success');
          setIsCompModalOpen(false);
          fetchData();
        }
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to save component', 'error');
    } finally {
      setCompSaving(false);
    }
  };

  const handleDeleteComponent = async (comp: SalaryComponent) => {
    if (!window.confirm(`Are you sure you want to delete/deactivate component "${comp.name}"?`)) return;
    try {
      const res = await api.delete(`/salary-components/${comp.id}`);
      if (res.data.success) {
        showToast(res.data.message || 'Component removed', 'success');
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to delete component', 'error');
    }
  };

  // --- Template Handlers ---
  const openCreateTemplate = () => {
    setEditingTempId(null);
    setTempForm({
      name: '',
      description: '',
      isActive: true,
      recalculateAssigned: true,
      selectedComponents: [],
    });
    setIsTempModalOpen(true);
  };

  const openEditTemplate = (tpl: SalaryTemplate) => {
    setEditingTempId(tpl.id);
    setTempForm({
      name: tpl.name,
      description: tpl.description || '',
      isActive: tpl.isActive,
      recalculateAssigned: true,
      selectedComponents: (tpl.components || []).map((tc) => ({
        componentId: tc.componentId,
        calculationType: tc.calculationType,
        value: tc.value,
        formula: tc.formula,
      })),
    });
    setIsTempModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempForm.selectedComponents.length === 0) {
      showToast('Please select at least one component for the template', 'error');
      return;
    }
    try {
      setTempSaving(true);
      const payload = {
        name: tempForm.name,
        description: tempForm.description,
        isActive: tempForm.isActive,
        recalculateAssigned: tempForm.recalculateAssigned,
        components: tempForm.selectedComponents,
      };
      const res = editingTempId
        ? await api.put(`/salary/templates/${editingTempId}`, payload)
        : await api.post('/salary/templates', payload);

      if (res.data.success) {
        showToast(
          editingTempId ? 'Salary template updated successfully' : 'Salary template created successfully',
          'success'
        );
        setIsTempModalOpen(false);
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setTempSaving(false);
    }
  };

  const handleDuplicateTemplate = async (tpl: SalaryTemplate) => {
    try {
      const res = await api.post(`/salary/templates/${tpl.id}/duplicate`);
      if (res.data.success) {
        showToast(`Duplicated "${tpl.name}" successfully`, 'success');
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to duplicate template', 'error');
    }
  };

  const handleDeleteTemplate = async (tpl: SalaryTemplate) => {
    const count = tpl._count?.employeeSalaries || 0;
    const msg =
      count > 0
        ? `Template "${tpl.name}" is currently assigned to ${count} employee(s). It will be safely deactivated without altering locked payrolls. Proceed?`
        : `Are you sure you want to permanently delete template "${tpl.name}"?`;
    if (!window.confirm(msg)) return;

    try {
      const res = await api.delete(`/salary/templates/${tpl.id}`);
      if (res.data.success) {
        showToast(res.data.message || 'Template deleted/deactivated', 'success');
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to delete template', 'error');
    }
  };

  const toggleComponentInTemplate = (componentId: string) => {
    const comp = components.find((c) => c.id === componentId);
    if (!comp) return;

    const exists = tempForm.selectedComponents.find((c) => c.componentId === componentId);
    if (exists) {
      setTempForm({
        ...tempForm,
        selectedComponents: tempForm.selectedComponents.filter((c) => c.componentId !== componentId),
      });
    } else {
      setTempForm({
        ...tempForm,
        selectedComponents: [
          ...tempForm.selectedComponents,
          {
            componentId,
            calculationType: comp.calculationType,
            value: comp.value,
          },
        ],
      });
    }
  };

  const updateTemplateComponentRule = (
    componentId: string,
    field: 'calculationType' | 'value',
    val: any
  ) => {
    setTempForm({
      ...tempForm,
      selectedComponents: tempForm.selectedComponents.map((sc) =>
        sc.componentId === componentId
          ? { ...sc, [field]: field === 'value' ? Number(val) : val }
          : sc
      ),
    });
  };

  // --- Bulk Salary Assignment Filtering & Handlers ---
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department?.name) set.add(e.department.name);
    });
    return Array.from(set);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (emp.status === 'EXITED') return false;
      const q = empSearch.trim().toLowerCase();
      if (
        q &&
        !`${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) &&
        !emp.employeeId.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (deptFilter && emp.department?.name !== deptFilter) return false;
      if (assignStatusFilter === 'ASSIGNED' && !emp.salary) return false;
      if (assignStatusFilter === 'UNASSIGNED' && emp.salary) return false;
      return true;
    });
  }, [employees, empSearch, deptFilter, assignStatusFilter]);

  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
  };

  const selectUnassignedOnly = () => {
    setSelectedEmployeeIds(filteredEmployees.filter((e) => !e.salary).map((e) => e.id));
  };

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployeeIds.length === 0) {
      showToast('Please select at least one employee from the roster', 'error');
      return;
    }
    const gross = Number(assignForm.monthlyGross);
    if (!gross || gross <= 0) {
      showToast('Please enter a valid Monthly Gross Salary (> 0)', 'error');
      return;
    }

    try {
      setAssignSaving(true);
      setLastBulkResult(null);
      const res = await api.post('/salary/bulk-assign', {
        employeeIds: selectedEmployeeIds,
        templateId: assignForm.templateId || undefined,
        monthlyGross: gross,
        annualCtc: gross * 12,
        effectiveFrom: assignForm.effectiveFrom,
      });

      if (res.data.success) {
        showToast(res.data.message || 'Bulk salary assignment completed', 'success');
        setLastBulkResult(res.data.data);
        setSelectedEmployeeIds([]);
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to assign salary structure', 'error');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleRemoveEmployeeSalary = async (emp: Employee) => {
    if (
      !window.confirm(
        `Remove current salary assignment for ${emp.firstName} ${emp.lastName} (${emp.employeeId})?`
      )
    ) {
      return;
    }
    try {
      const res = await api.delete(`/salary/employee/${emp.id}`);
      if (res.data.success) {
        showToast('Salary assignment removed', 'success');
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to remove salary assignment', 'error');
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
        title="Salary Structure & Templates"
        description="Configure compensation templates, statutory salary rules, and assign pay structures to single or multiple employees."
        action={
          <div className="flex items-center gap-3">
            {activeTab === 'templates' && (
              <Button variant="primary" onClick={openCreateTemplate}>
                <Plus className="w-4 h-4 mr-1.5" /> Create Template
              </Button>
            )}
            {activeTab === 'components' && (
              <Button variant="primary" onClick={openCreateComponent}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Component
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'templates', label: `Salary Templates (${templates.length})` },
          { id: 'components', label: `Component Catalog (${components.length})` },
          { id: 'assign', label: 'Bulk Salary Assignment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {templates.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                title="No Salary Templates Configured"
                description="Create your first compensation template to standardize earnings and statutory deductions."
                action={
                  <Button variant="primary" onClick={openCreateTemplate}>
                    <Plus className="w-4 h-4 mr-1.5" /> Create First Template
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="p-6 flex flex-col justify-between hover:border-blue-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Layers className="w-5 h-5" />
                      </span>
                      <Badge variant={tpl.isActive ? 'success' : 'neutral'}>
                        {tpl.isActive ? 'Active Template' : 'Inactive'}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">{tpl.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {tpl.description || 'Standard Indian statutory salary template.'}
                    </p>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <div className="text-xs font-semibold uppercase text-slate-400">
                        Configured Components ({tpl.components?.length || 0}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tpl.components?.map((c) => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium"
                          >
                            {c.component.name} (
                            {c.value === 0 && c.component.code === 'SPL_ALLOW'
                              ? 'Balancing'
                              : `${c.value}${c.calculationType === 'PERCENTAGE' ? '%' : '₹'}`}
                            )
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {tpl._count?.employeeSalaries || 0} Employees Assigned
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignForm((prev) => ({ ...prev, templateId: tpl.id }));
                          setActiveTab('assign');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Assign to Employees →
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingTemplate(tpl)}
                        title="View Template"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTemplate(tpl)}
                        title="Edit Template"
                      >
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(tpl)}
                        title="Duplicate Template"
                      >
                        <Copy className="w-4 h-4 mr-1" /> Clone
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(tpl)}
                        className="text-rose-600 hover:bg-rose-50"
                        title="Delete or Deactivate Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Components Catalog */}
      {activeTab === 'components' && (
        <Card orientation="vertical" title="Statutory & Custom Salary Components">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Component Name</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Calculation Mode</th>
                  <th className="px-6 py-3">Default Value</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{c.code}</td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant={
                          c.type === 'EARNING'
                            ? 'success'
                            : c.type === 'DEDUCTION'
                            ? 'warning'
                            : 'cyan'
                        }
                      >
                        {c.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{c.calculationType}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {c.value} {c.calculationType === 'PERCENTAGE' ? '%' : '₹'}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={c.isActive ? 'success' : 'neutral'}>
                        {c.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditComponent(c)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                        title="Edit Component"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(c)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Delete / Deactivate Component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Multi-Employee Bulk Salary Assignment */}
      {activeTab === 'assign' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Multi-Employee Selection Table */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    1. Select Employees ({selectedEmployeeIds.length} Selected)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Filter by department or assignment status and select one or multiple employees.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    Select Filtered ({filteredEmployees.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectUnassignedOnly}>
                    Select Unassigned
                  </Button>
                  {selectedEmployeeIds.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmployeeIds([])}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Search name or EMP ID..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />
                <Select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...departments.map((d) => ({ value: d, label: d })),
                  ]}
                />
                <Select
                  value={assignStatusFilter}
                  onChange={(e) => setAssignStatusFilter(e.target.value as any)}
                  options={[
                    { value: 'ALL', label: 'All Assignment Status' },
                    { value: 'ASSIGNED', label: 'Salary Assigned' },
                    { value: 'UNASSIGNED', label: 'Unassigned Only' },
                  ]}
                />
              </div>

              {/* Employee Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            filteredEmployees.length > 0 &&
                            filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id))
                          }
                          onChange={(e) =>
                            e.target.checked ? selectAllFiltered() : setSelectedEmployeeIds([])
                          }
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Current Gross / CTC</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No employees match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const checked = selectedEmployeeIds.includes(emp.id);
                        return (
                          <tr
                            key={emp.id}
                            onClick={() => toggleSelectEmployee(emp.id)}
                            className={`cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectEmployee(emp.id)}
                                className="rounded border-slate-300 text-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">{emp.employeeId}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {emp.department?.name || 'General'}
                            </td>
                            <td className="px-4 py-3">
                              {emp.salary ? (
                                <div>
                                  <span className="font-bold text-slate-900">
                                    {formatCurrency(emp.salary.monthlyGross)}/mo
                                  </span>
                                  <span className="block text-[11px] text-slate-500">
                                    CTC: {formatCurrency(emp.salary.ctcAnnual)}/yr
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="warning">Unassigned</Badge>
                              )}
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {emp.salary && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEmployeeSalary(emp)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="Remove Salary Assignment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right 5 cols: Configuration & Live Preview */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    2. Configure & Preview Compensation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assigns structure to {selectedEmployeeIds.length || 0} selected employee(s).
                  </p>
                </div>
              </div>

              <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
                <Select
                  label="Salary Template"
                  value={assignForm.templateId}
                  onChange={(e) => setAssignForm({ ...assignForm, templateId: e.target.value })}
                  options={[
                    {
                      value: '',
                      label: 'Standard Corporate Breakdown (50% Basic, 40% HRA, Special)',
                    },
                    ...templates
                      .filter((t) => t.isActive)
                      .map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Monthly Gross (₹)"
                    type="number"
                    placeholder="e.g. 50000"
                    value={assignForm.monthlyGross}
                    onChange={(e) => setAssignForm({ ...assignForm, monthlyGross: e.target.value })}
                    required
                  />
                  <Input
                    label="Annual CTC (₹)"
                    type="text"
                    value={formatCurrency((Number(assignForm.monthlyGross) || 0) * 12)}
                    disabled
                  />
                </div>

                <Input
                  label="Effective From Date"
                  type="date"
                  value={assignForm.effectiveFrom}
                  onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                  required
                />

                {/* Live Calculated Breakdown Preview */}
                {previewComponents.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Monthly Breakdown Preview
                    </div>
                    <div className="divide-y divide-slate-200/70 text-xs">
                      {previewComponents.map((comp, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between">
                          <span className="text-slate-700 font-medium">
                            {comp.name}{' '}
                            <span className="text-[10px] text-slate-400">({comp.type})</span>
                          </span>
                          <span
                            className={`font-semibold ${
                              comp.type === 'DEDUCTION' ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {comp.type === 'DEDUCTION' ? '-' : '+'}
                            {formatCurrency(comp.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  type="submit"
                  className="w-full justify-center"
                  loading={assignSaving}
                  disabled={selectedEmployeeIds.length === 0}
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  Assign Structure to {selectedEmployeeIds.length} Employee(s)
                </Button>
              </form>

              {lastBulkResult && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold">Bulk Assignment Summary:</div>
                  <div>
                    • Newly Assigned: <strong>{lastBulkResult.assignedCount}</strong> | Updated (Reassigned):{' '}
                    <strong>{lastBulkResult.updatedCount}</strong> | Failed:{' '}
                    <strong>{lastBulkResult.failedCount}</strong>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal: View Template Details */}
      <Modal
        isOpen={Boolean(viewingTemplate)}
        onClose={() => setViewingTemplate(null)}
        title={viewingTemplate?.name || 'Template Details'}
      >
        {viewingTemplate && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {viewingTemplate.description || 'Standard statutory salary structure template.'}
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Component</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingTemplate.components?.map((tc) => (
                    <tr key={tc.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {tc.component.name} ({tc.component.code})
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={tc.component.type === 'EARNING' ? 'success' : 'warning'}
                        >
                          {tc.component.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {tc.value === 0 && tc.component.code === 'SPL_ALLOW'
                          ? 'Balancing Allowance'
                          : `${tc.value} ${tc.calculationType === 'PERCENTAGE' ? '%' : '₹'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setViewingTemplate(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const tpl = viewingTemplate;
                  setViewingTemplate(null);
                  openEditTemplate(tpl);
                }}
              >
                Edit Template
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create / Edit Component */}
      <Modal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        title={editingCompId ? 'Edit Salary Component' : 'Add Salary Component'}
      >
        <form onSubmit={handleSaveComponent} className="space-y-4">
          <Input
            label="Component Name"
            placeholder="e.g. Conveyance Allowance"
            value={compForm.name}
            onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
            required
          />
          <Input
            label="Component Code"
            placeholder="e.g. CONVEYANCE"
            value={compForm.code}
            onChange={(e) => setCompForm({ ...compForm, code: e.target.value.toUpperCase() })}
            required
          />
          <Select
            label="Classification"
            value={compForm.type}
            onChange={(e) => setCompForm({ ...compForm, type: e.target.value as any })}
            options={[
              { value: 'EARNING', label: 'Earning (Added to Gross)' },
              { value: 'DEDUCTION', label: 'Deduction (Subtracted from Net)' },
              { value: 'EMPLOYER_CONTRIBUTION', label: 'Employer Contribution (Added to CTC)' },
            ]}
          />
          <Select
            label="Calculation Method"
            value={compForm.calculationType}
            onChange={(e) => setCompForm({ ...compForm, calculationType: e.target.value as any })}
            options={[
              { value: 'PERCENTAGE', label: 'Percentage (%)' },
              { value: 'FIXED', label: 'Fixed Amount (₹)' },
              { value: 'FORMULA', label: 'Formula / Computed' },
            ]}
          />
          <Input
            label="Default Value"
            type="number"
            placeholder="e.g. 10"
            value={compForm.value}
            onChange={(e) => setCompForm({ ...compForm, value: Number(e.target.value) })}
            required
          />
          <Input
            label="Description"
            placeholder="Optional notes or taxation rules"
            value={compForm.description}
            onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsCompModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={compSaving}>
              {editingCompId ? 'Update Component' : 'Save Component'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create / Edit Template */}
      <Modal
        isOpen={isTempModalOpen}
        onClose={() => setIsTempModalOpen(false)}
        title={editingTempId ? 'Update Salary Template' : 'Create Salary Template'}
        size="lg"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Software Engineer Grade A"
            value={tempForm.name}
            onChange={(e) => setTempForm({ ...tempForm, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="e.g. Standard structure for engineering staff"
            value={tempForm.description}
            onChange={(e) => setTempForm({ ...tempForm, description: e.target.value })}
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select & Configure Components in Template:
            </label>
            <div className="space-y-2 max-h-72 overflow-y-auto p-3 border border-slate-200 rounded-xl">
              {components.map((c) => {
                const selectedRule = tempForm.selectedComponents.find(
                  (sc) => sc.componentId === c.id
                );
                const selected = Boolean(selectedRule);
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border text-sm transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50/60 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleComponentInTemplate(c.id)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>
                          {c.name} <span className="font-mono text-xs text-slate-500">({c.code})</span>
                        </span>
                        <Badge variant={c.type === 'EARNING' ? 'success' : 'warning'}>
                          {c.type}
                        </Badge>
                      </label>
                    </div>

                    {selectedRule && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
                        <Select
                          label="Calculation Mode"
                          value={selectedRule.calculationType}
                          onChange={(e) =>
                            updateTemplateComponentRule(c.id, 'calculationType', e.target.value)
                          }
                          options={[
                            { value: 'PERCENTAGE', label: 'Percentage (%)' },
                            { value: 'FIXED', label: 'Fixed Amount (₹)' },
                          ]}
                        />
                        <Input
                          label={
                            selectedRule.calculationType === 'PERCENTAGE'
                              ? 'Percentage (%)'
                              : 'Fixed Monthly Amount (₹)'
                          }
                          type="number"
                          value={selectedRule.value}
                          onChange={(e) =>
                            updateTemplateComponentRule(c.id, 'value', e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {editingTempId && (
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={tempForm.recalculateAssigned}
                onChange={(e) =>
                  setTempForm({ ...tempForm, recalculateAssigned: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600"
              />
              <span>
                Update future salary breakdown for employees currently assigned to this template (historical locked payrolls remain unchanged)
              </span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsTempModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={tempSaving}>
              {editingTempId ? 'Save Template Changes' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
