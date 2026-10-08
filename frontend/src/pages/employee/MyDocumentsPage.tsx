import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../context/ToastContext';
import {
  FolderLock,
  Download,
  FileText,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Employee } from '../../types';

export const MyDocumentsPage: React.FC = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/me');
      if (res.data.success) {
        setEmployee(res.data.data);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Failed to load employee documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDoc = async (docId: string, fileName: string) => {
    try {
      const res = await api.get(`/employees/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showToast('Document downloaded successfully', 'success');
    } catch (e: any) {
      showToast('Failed to download document', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const documents = employee?.documents || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="My Employee Documents & KYC"
        description="Official onboarding, identity verification, and employment contracts stored securely in NEXUS."
      />

      <Card
        orientation="vertical"
        title={`Uploaded Documents (${documents.length})`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Document Type</th>
                <th className="px-6 py-3">File Name</th>
                <th className="px-6 py-3">File Size</th>
                <th className="px-6 py-3">Upload Date</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {doc.documentType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                      {doc.fileName}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
                      {new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadDoc(doc.id, doc.fileName)}
                      >
                        <Download className="w-4 h-4 text-blue-600 mr-1" /> Download
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FolderLock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No documents on file.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Documents uploaded during your onboarding or submitted to HR will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
