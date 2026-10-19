import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Spinner } from '../../components/common/Spinner';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import {
  Building,
  ShieldCheck,
  Save,
  Landmark,
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Company } from '../../types';

interface EmailStatus {
  configured: boolean;
  valid: boolean;
  host?: string;
  user?: string;
  message: string;
  details?: string;
}

interface EmailLogItem {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  error?: string | null;
  sentAt: string;
}

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

  // Email & SMTP diagnostics state
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchCompany();
    fetchEmailStatus();
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
        if (res.data.data.email && !testRecipient) {
          setTestRecipient(res.data.data.email);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load company profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailStatus = async () => {
    try {
      setCheckingEmail(true);
      const res = await api.get('/auth/email-status');
      if (res.data.data) {
        setEmailStatus(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to check email status', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/auth/email-logs');
      if (res.data.data) {
        setEmailLogs(res.data.data);
      }
    } catch (err: any) {
      showToast('Failed to load email delivery logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim() || !testRecipient.includes('@')) {
      showToast('Please provide a valid recipient email address', 'error');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.post('/auth/test-email', { email: testRecipient.trim() });
      setTestResult({
        success: true,
        message: res.data?.message || `Test email dispatched to ${testRecipient}.`,
      });
      showToast('Test email sent successfully!', 'success');
      // Refresh status and logs
      fetchEmailStatus();
      if (showLogs) fetchEmailLogs();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to dispatch test email.';
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast(errMsg, 'error');
    } finally {
      setSendingTest(false);
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
        description="Configure your enterprise profile, statutory tax identifiers, email delivery engine, and payroll cycle frequency."
      />

      {/* Email & Notification Delivery Engine Card */}
      <Card orientation="vertical" title="Email & Notification Delivery Engine">
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">SMTP Transactional Email Service</h4>
                {emailStatus?.configured && emailStatus?.valid ? (
                  <Badge variant="green" dot>
                    SMTP Connected
                  </Badge>
                ) : emailStatus?.configured && !emailStatus?.valid ? (
                  <Badge variant="red" dot>
                    SMTP Auth Error
                  </Badge>
                ) : (
                  <Badge variant="amber" dot>
                    Simulated Outbox Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Used for account activation invites, password resets, monthly payslip distributions, and leave notifications.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEmailStatus()}
              loading={checkingEmail}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${checkingEmail ? 'animate-spin' : ''}`} />}
            >
              Verify Connection
            </Button>
          </div>

          {/* Current Status Box */}
          <div
            className={`p-4 rounded-xl border text-sm ${
              emailStatus?.configured && emailStatus?.valid
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : emailStatus?.configured && !emailStatus?.valid
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {emailStatus?.configured && emailStatus?.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : emailStatus?.configured && !emailStatus?.valid ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{emailStatus?.message || 'Checking SMTP configuration...'}</p>
                {emailStatus?.details && <p className="text-xs opacity-90">{emailStatus.details}</p>}
                {emailStatus?.configured && (
                  <p className="text-xs opacity-80 mt-1 font-mono">
                    Host: {emailStatus.host} | User: {emailStatus.user}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Live Test Email Sender */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-600" /> Test Live Email Dispatch
            </h5>
            <p className="text-xs text-slate-500 mb-3">
              Send a real test email to verify that your email provider delivers messages directly to your inbox.
            </p>
            <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter recipient email (e.g. name@gmail.com)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                required
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              />
              <Button variant="primary" type="submit" loading={sendingTest} icon={<Send className="w-3.5 h-3.5" />}>
                Send Test Email
              </Button>
            </form>

            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <strong>{testResult.success ? 'Success:' : 'Notice:'}</strong> {testResult.message}
              </div>
            )}
          </div>

          {/* Setup Instructions Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-600" />
                How to configure Gmail or custom SMTP in .env (1-minute guide)
              </span>
              {showGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showGuide && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-3 border-t border-slate-200">
                <div>
                  <h6 className="font-bold text-slate-800 mb-1">Configuring with Gmail (Recommended for testing):</h6>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>
                      Ensure <strong>2-Step Verification</strong> is enabled on your Google Account:
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 ml-1 inline-flex items-center gap-0.5 hover:underline"
                      >
                        myaccount.google.com/security <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Create a 16-character <strong>App Password</strong> at:
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 ml-1 inline-flex items-center gap-0.5 hover:underline"
                      >
                        myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Open your root <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env</code> file and configure:
                      <pre className="mt-1 p-2 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM="NEXUS Payroll <your-email@gmail.com>"`}
                      </pre>
                    </li>
                    <li>Click <strong>Verify Connection</strong> above to test!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Email Logs Preview */}
          <div>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Transactional Emails</h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLogs(!showLogs);
                  if (!showLogs) fetchEmailLogs();
                }}
              >
                {showLogs ? 'Hide Logs' : 'View Delivery Logs'}
              </Button>
            </div>

            {showLogs && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                {loadingLogs ? (
                  <div className="p-6 text-center">
                    <Spinner size="sm" />
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No email logs found.</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 font-semibold text-slate-600">To</th>
                          <th className="py-2 px-3 font-semibold text-slate-600">Subject</th>
                          <th className="py-2 px-3 font-semibold text-slate-600">Status</th>
                          <th className="py-2 px-3 font-semibold text-slate-600">Date/Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {emailLogs.slice(0, 15).map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-800">{l.to}</td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]" title={l.subject}>
                              {l.subject}
                            </td>
                            <td className="py-2 px-3">
                              {l.status === 'SENT' ? (
                                <Badge variant="green" size="sm">
                                  SENT
                                </Badge>
                              ) : (
                                <Badge variant="red" size="sm" title={l.error || 'Failed'}>
                                  FAILED
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              {new Date(l.sentAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

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

      {/* Production Clean Reset */}
      <Card orientation="vertical" title="System Maintenance & Production Reset">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-rose-700">Wipe All Data & Start Fresh (Factory Reset)</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Permanently wipes all historical demo data, employees, attendances, payroll runs, and users.
                After reset, you can create your organization and primary administrator account from scratch.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 shrink-0"
              onClick={async () => {
                const conf = window.prompt(
                  'DANGER: This will permanently delete ALL data. To confirm, type: WIPE_ALL_DATA_START_FRESH'
                );
                if (conf === 'WIPE_ALL_DATA_START_FRESH') {
                  try {
                    await api.post('/auth/reset-database', { confirmation: conf });
                    alert('System reset successfully. Redirecting to Initial Setup...');
                    localStorage.clear();
                    window.location.href = '/login?mode=setup';
                  } catch (e: any) {
                    alert(e.response?.data?.message || 'Failed to reset system.');
                  }
                }
              }}
            >
              Reset System for Production
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
