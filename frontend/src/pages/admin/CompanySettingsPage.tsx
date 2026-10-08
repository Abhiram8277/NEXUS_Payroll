import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import { Building, ShieldCheck, Save, Landmark } from 'lucide-react';
import { Company } from '../../types';

export const CompanySettingsPage: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    tagline: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    email: '',
    phone: '',
    pan: '',
    tan: '',
    financialYear: '2026-2027',
    payrollFrequency: 'MONTHLY',
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await api.get('/company');
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        setFormData({
          name: res.data.data.name || '',
          tagline: res.data.data.tagline || '',
          address: res.data.data.address || '',
          city: res.data.data.city || '',
          state: res.data.data.state || '',
          country: res.data.data.country || 'India',
          pinCode: res.data.data.pinCode || '',
          email: res.data.data.email || '',
          phone: res.data.data.phone || '',
          pan: res.data.data.pan || '',
          tan: res.data.data.tan || '',
          financialYear: res.data.data.financialYear || '2026-2027',
          payrollFrequency: res.data.data.payrollFrequency || 'MONTHLY',
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load company profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/company', formData);
      if (res.data.success) {
        showToast('Company profile updated successfully', 'success');
        setCompany(res.data.data);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update company profile', 'error');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Company Profile & Settings"
        description="Configure your enterprise profile, statutory tax identifiers, and payroll cycle frequency."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Identity */}
        <Card orientation="vertical" title="Organization Identity">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Legal Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Brand Tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
              <Input
                label="Official Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Registered Address */}
        <Card orientation="vertical" title="Registered Office Address">
          <div className="p-6 space-y-4">
            <Input
              label="Street Address / Suite"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                label="PIN Code"
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Statutory Identifiers */}
        <Card orientation="vertical" title="Government Statutory Registrations">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company PAN Number"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="e.g. AAACN1234F"
              />
              <Input
                label="Company TAN Number"
                value={formData.tan}
                onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                placeholder="e.g. HYDN12345A"
              />
              <Input
                label="Current Financial Year"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
              />
              <Select
                label="Payroll Cycle Frequency"
                value={formData.payrollFrequency}
                onChange={(e) => setFormData({ ...formData, payrollFrequency: e.target.value })}
                options={[
                  { value: 'MONTHLY', label: 'Monthly (Calendar Month)' },
                  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
                ]}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="primary" type="submit" loading={saving} size="lg">
            <Save className="w-5 h-5 mr-2" /> Save Company Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
