'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Plus } from 'lucide-react';
import { documentsApi, projectsApi } from '@/lib/developerApi';
import type { DevDocument, DevProject } from '@/types/developer';
import styles from '../developer.module.css';

const DOC_TYPES = ['RERA_CERTIFICATE', 'DTCP_APPROVAL', 'BUILDING_PLAN', 'LEGAL_DOCUMENT', 'BROCHURE', 'OTHER'];
const DOC_TYPE_LABELS: Record<string, string> = {
  RERA_CERTIFICATE: 'RERA Certificate',
  DTCP_APPROVAL: 'DTCP Approval',
  BUILDING_PLAN: 'Building Plan',
  LEGAL_DOCUMENT: 'Legal Document',
  BROCHURE: 'Brochure',
  OTHER: 'Other',
};

function formatFileSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function DocIcon({ mime }: { mime?: string }) {
  const color = mime?.includes('pdf') ? '#ef4444' : mime?.includes('image') ? '#3b82f6' : '#6366f1';
  return <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <FileText size={18} style={{ color }} />
  </div>;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DevDocument[]>([]);
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [docType, setDocType] = useState('RERA_CERTIFICATE');
  const [docName, setDocName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await documentsApi.list({ doc_type: typeFilter || undefined });
      if (r.success) setDocs(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    projectsApi.list({ per_page: 100 }).then(r => { if (r.success) setProjects(r.data); });
  }, []);

  useEffect(() => { load(); }, [typeFilter]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docName) { alert('Fill document name first'); return; }
    setUploading(true);
    try {
      await documentsApi.upload(file, docType, docName, projectId || undefined);
      setShowModal(false);
      setDocName('');
      load();
    } catch (e: any) { alert(e.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function deleteDoc(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await documentsApi.delete(id);
    load();
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Documents</h1>
          <p className={styles.pageSubtitle}>{docs.length} documents</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Upload size={14} /> Upload Document
        </button>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: 16 }}>
        <button className={`${styles.btn} ${!typeFilter ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`} onClick={() => setTypeFilter('')}>All</button>
        {DOC_TYPES.map(t => (
          <button key={t} className={`${styles.btn} ${typeFilter === t ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`} onClick={() => setTypeFilter(t)}>
            {DOC_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
      ) : docs.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <span className={styles.emptyStateTitle}>No documents</span>
          <span className={styles.emptyStateText}>Upload RERA certificates, building plans, brochures, and other project documents</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}><Upload size={14} /> Upload</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => (
            <div key={doc.id} className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <DocIcon mime={doc.mime_type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.doc_name}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                  <span className={`${styles.badge} ${styles.badgeUpcoming}`} style={{ fontSize: 10 }}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span>
                  {doc.project_name && <span style={{ fontSize: 12, color: '#64748b' }}>{doc.project_name}</span>}
                  <span style={{ fontSize: 12, color: '#475569' }}>{formatFileSize(doc.file_size_bytes)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a href={doc.file_url} target="_blank" rel="noopener" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                  <Download size={12} /> View
                </a>
                <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => deleteDoc(doc.id, doc.doc_name)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 440 }}>
            <h2 className={styles.modalTitle}>Upload Document</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Document Name *</label>
              <input type="text" className={styles.formInput} placeholder="e.g. RERA Certificate 2024"
                value={docName} onChange={e => setDocName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Document Type</label>
              <select className={`${styles.formInput} ${styles.select}`} value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Project (optional)</label>
              <select className={`${styles.formInput} ${styles.select}`} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Company-wide document</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: 'none' }} onChange={handleUpload} />
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', justifyContent: 'center' }}
                disabled={!docName || uploading}
                onClick={() => fileRef.current?.click()}>
                {uploading ? 'Uploading…' : <><Upload size={14} /> Choose & Upload File</>}
              </button>
              <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                Supported: PDF, JPEG, PNG, WEBP, DOC, DOCX · Max 20MB
              </p>
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
