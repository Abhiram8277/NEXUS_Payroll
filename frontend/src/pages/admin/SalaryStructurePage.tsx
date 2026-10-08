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
  BadgePercent,
  Plus,
  Layers,
  Sparkles,
  Users,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { SalaryTemplate, SalaryComponent, Employee } from '../../types';

export const SalaryStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'components' | 'assign'>('templates');
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Component Modal
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [compSaving, setCompSaving] = useState(false);
  const [compForm, setCompForm] = useState({
    name: '',
    code: '',
    type: 'EARNING' as 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION',
    calculationType: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE' | 'FORMULA',
    value: 0,
    description: '',
  });

  // Create Template Modal
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [tempSaving, setTempSaving] = useState(false);
  const [tempForm, setTempForm] = useState({
    name: '',
    description: '',
    selectedComponents: [] as Array<{
      componentId: string;
      calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
      value: number;
      formula?: string;
    }>,
  });

  // Assign Salary
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    templateId: '',
    monthlyGross: '',
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tempRes, compRes, empRes] = await Promise.all([
        api.get('/salary/templates'),
        api.get('/salary-components'),
        api.get('/employees?limit=100'),
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

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCompSaving(true);
      const res = await api.post('/salary-components', {
        ...compForm,
        value: Number(compForm.value),
      });
      if (res.data.success) {
        showToast('Salary component created successfully', 'success');
        setIsCompModalOpen(false);
        setCompForm({
          name: '',
          code: '',
          type: 'EARNING',
          calculationType: 'PERCENTAGE',
          value: 0,
          description: '',
        });
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to create component', 'error');
    } finally {
      setCompSaving(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempForm.selectedComponents.length === 0) {
      showToast('Please add at least one component to the template', 'error');
      return;
    }
    try {
      setTempSaving(true);
      const res = await api.post('/salary/templates', {
        name: tempForm.name,
        description: tempForm.description,
        components: tempForm.selectedComponents,
      });
      if (res.data.success) {
        showToast('Salary template created successfully', 'success');
        setIsTempModalOpen(false);
        setTempForm({ name: '', description: '', selectedComponents: [] });
        fetchData();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to create template', 'error');
    } finally {
      setTempSaving(false);
    }
  };

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.monthlyGross) {
      showToast('Please select an employee and enter monthly gross', 'error');
      return;
    }
    try {
      setAssignSaving(true);
      const res = await api.post('/salary/assign', {
        employeeId: assignForm.employeeId,
        monthlyGross: Number(assignForm.monthlyGross),
        templateId: assignForm.templateId || undefined,
      });
      if (res.data.success) {
        showToast('Salary structure assigned to employee successfully', 'success');
        setAssignForm({ employeeId: '', templateId: '', monthlyGross: '' });
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to assign salary', 'error');
    } finally {
      setAssignSaving(false);
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
        description="Configure compensation templates, statutory salary rules, and assign pay structures to employees."
        action={
          <div className="flex items-center gap-3">
            {activeTab === 'templates' && (
              <Button variant="primary" onClick={() => setIsTempModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Create Template
              </Button>
            )}
            {activeTab === 'components' && (
              <Button variant="primary" onClick={() => setIsCompModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Component
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'templates', label: 'Salary Templates' },
          { id: 'components', label: 'Component Catalog' },
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-6 flex flex-col justify-between hover:border-blue-300 transition-all">
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
                    <div className="text-xs font-semibold uppercase text-slate-400">Configured Components:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.components?.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium"
                        >
                          {c.component.name} ({c.value}
                          {c.calculationType === 'PERCENTAGE' ? '%' : '₹'})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {tpl._count?.employeeSalaries || 0} Employees Assigned
                  </span>
                </div>
              </Card>
            ))}
          </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Assign Salary */}
      {activeTab === 'assign' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <BadgePercent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assign Salary to Employee</h3>
                <p className="text-sm text-slate-500">
                  Computes Gross earnings, EPF, ESI, Professional Tax, and net salary.
                </p>
              </div>
            </div>

            <form onSubmit={handleAssignSalary} className="space-y-5">
              <Select
                label="Select Employee"
                value={assignForm.employeeId}
                onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                options={[
                  { value: '', label: '-- Choose Employee --' },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.employeeId} - ${emp.firstName} ${emp.lastName} (${emp.department?.name || 'General'})`,
                  })),
                ]}
                required
              />

              <Input
                label="Monthly Gross Salary (₹)"
                type="number"
                placeholder="e.g. 50000"
                value={assignForm.monthlyGross}
                onChange={(e) => setAssignForm({ ...assignForm, monthlyGross: e.target.value })}
                required
              />

              <Select
                label="Salary Template (Optional)"
                value={assignForm.templateId}
                onChange={(e) => setAssignForm({ ...assignForm, templateId: e.target.value })}
                options={[
                  { value: '', label: 'Default Standard Structure (50% Basic, 20% HRA, 30% Special Allowance)' },
                  ...templates.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Statutory Compliance Auto-Applied:</div>
                <p>• Employee EPF (12% of Basic, capped at ₹1,800/mo if above statutory limit)</p>
                <p>• Employee ESI (0.75% of Gross if gross ≤ ₹21,000/mo)</p>
                <p>• Professional Tax (Slab based according to state schedule)</p>
                <p>• Employer contributions (12% EPF + 3.25% ESI) included in CTC</p>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full justify-center"
                loading={assignSaving}
              >
                Compute & Assign Salary Structure
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Create Component */}
      <Modal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        title="Add Salary Component"
      >
        <form onSubmit={handleCreateComponent} className="space-y-4">
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
              { value: 'PERCENTAGE', label: 'Percentage (%) of Monthly Gross' },
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
              Save Component
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Template */}
      <Modal
        isOpen={isTempModalOpen}
        onClose={() => setIsTempModalOpen(false)}
        title="Create Salary Template"
        size="lg"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
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
              Select Components to Include:
            </label>
            <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-xl">
              {components.map((c) => {
                const selected = tempForm.selectedComponents.some((sc) => sc.componentId === c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleComponentInTemplate(c.id)}
                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors flex items-center justify-between ${
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>
                      {c.name} ({c.code})
                    </span>
                    {selected && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsTempModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={tempSaving}>
              Create Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
