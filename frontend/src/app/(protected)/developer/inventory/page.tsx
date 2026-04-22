'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Grid3X3, Plus, Download } from 'lucide-react';
import { unitsApi, projectsApi } from '@/lib/developerApi';
import type { DevUnit, DevProject } from '@/types/developer';
import styles from '../developer.module.css';

const STATUS_BADGE_MAP: Record<string, string> = {
  AVAILABLE: styles.badgeAvailable,
  NEGOTIATION: styles.badgeNegotiation,
  RESERVED: styles.badgeReserved,
  BOOKED: styles.badgeBooked,
  SOLD: styles.badgeSold,
  BLOCKED: styles.badgeBlocked,
};

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const initProject = searchParams.get('project_id') || '';

  const [units, setUnits] = useState<DevUnit[]>([]);
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState(initProject);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await unitsApi.list({
        project_id: projectFilter || undefined,
        status: statusFilter || undefined,
        unit_type: typeFilter || undefined,
        page,
        per_page: 50,
      });
      if (res.success) {
        setUnits(res.data);
        setTotal(res.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    projectsApi.list({ per_page: 100 }).then(r => { if (r.success) setProjects(r.data); });
  }, []);

  useEffect(() => { load(); }, [projectFilter, statusFilter, typeFilter, page]);

  const filtered = search ? units.filter(u =>
    u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
    u.unit_type.toLowerCase().includes(search.toLowerCase())
  ) : units;

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadProjectId) { alert('Select a project first'); return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await unitsApi.bulkUpload(uploadProjectId, file);
      setUploadResult(result);
      load();
    } catch (e: any) { setUploadResult({ success: false, error: e.message }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inventory</h1>
          <p className={styles.pageSubtitle}>{total} units total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowUpload(!showUpload)}>
            <Upload size={14} /> Bulk Upload CSV
          </button>
        </div>
      </div>

      {/* Bulk upload panel */}
      {showUpload && (
        <div className={styles.card} style={{ marginBottom: 20, borderColor: 'rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Bulk Upload Units (CSV)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className={styles.select} value={uploadProjectId} onChange={e => setUploadProjectId(e.target.value)}>
              <option value="">Select Project *</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkUpload} />
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={uploading || !uploadProjectId}
              onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading…' : <><Upload size={13} /> Choose CSV</>}
            </button>
            <a href="/developer/units/bulk-upload/sample" className={`${styles.btn} ${styles.btnSecondary}`} style={{ textDecoration: 'none' }}>
              <Download size={13} /> Sample CSV
            </a>
          </div>
          {uploadResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: uploadResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${uploadResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: uploadResult.success ? '#10b981' : '#f87171' }}>
              {uploadResult.success
                ? `✓ Uploaded ${uploadResult.inserted} units (${uploadResult.skipped} skipped as duplicates)`
                : `Error: ${uploadResult.error}`}
            </div>
          )}
          <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 8 }}>
            Required columns: unit_number, unit_type, price. Optional: area_sqft, facing, floor, bedrooms, bathrooms, parking
          </p>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterBar} style={{ marginBottom: 16 }}>
        <input className={styles.searchInput} placeholder="Search units…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.select} value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1); }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
        <select className={styles.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['AVAILABLE','NEGOTIATION','RESERVED','BOOKED','SOLD','BLOCKED'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Grid3X3 size={48} />
            <span className={styles.emptyStateTitle}>No units found</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Unit #</th><th>Project</th><th>Type</th><th>Area (sqft)</th>
                <th>Price</th><th>Floor</th><th>BHK</th><th>Facing</th>
                <th>Parking</th><th>Offers</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: '#f1f5f9' }}>{u.unit_number}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{u.project_name || '—'}</td>
                  <td>{u.unit_type}</td>
                  <td>{u.area_sqft?.toLocaleString() || '—'}</td>
                  <td style={{ color: '#818cf8', fontWeight: 600 }}>₹{u.price.toLocaleString()}</td>
                  <td>{u.floor ?? '—'}</td>
                  <td>{u.bedrooms ? `${u.bedrooms}BHK` : '—'}</td>
                  <td>{u.facing || '—'}</td>
                  <td>{u.parking}</td>
                  <td>
                    {(u.active_offer_count || 0) > 0
                      ? <span className={`${styles.badge} ${styles.badgePending}`}>{u.active_offer_count}</span>
                      : <span style={{ color: '#475569' }}>0</span>}
                  </td>
                  <td><span className={`${styles.badge} ${STATUS_BADGE_MAP[u.status] || ''}`}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>Page {page} · {total} units</span>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} disabled={units.length < 50} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
