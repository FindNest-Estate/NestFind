'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Building2, Search, Filter } from 'lucide-react';
import { projectsApi } from '@/lib/developerApi';
import type { DevProject } from '@/types/developer';
import styles from '../developer.module.css';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  PLOT_VENTURE: 'Plot Venture',
  VILLA_PROJECT: 'Villa Project',
  GATED_COMMUNITY: 'Gated Community',
  COMMERCIAL: 'Commercial',
};

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: styles.badgeUpcoming,
  UNDER_CONSTRUCTION: styles.badgeConstruction,
  READY_TO_MOVE: styles.badgeReady,
  SOLD_OUT: styles.badgeSoldOut,
};

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Upcoming',
  UNDER_CONSTRUCTION: 'Under Construction',
  READY_TO_MOVE: 'Ready to Move',
  SOLD_OUT: 'Sold Out',
};

function ProjectFormModal({ onClose, onSaved, project }: { onClose: () => void; onSaved: () => void; project?: DevProject }) {
  const [form, setForm] = useState({
    project_name: project?.project_name || '',
    project_type: project?.project_type || 'APARTMENT',
    status: project?.status || 'UPCOMING',
    location: project?.location || '',
    city: project?.city || '',
    state: project?.state || '',
    pincode: project?.pincode || '',
    total_units: project?.total_units || 0,
    rera_number: project?.rera_number || '',
    description: project?.description || '',
    possession_date: project?.possession_date || '',
    launch_date: project?.launch_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.project_name || !form.location) {
      setError('Project name and location are required');
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await projectsApi.update(project.id, form);
      } else {
        await projectsApi.create(form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'project_name', label: 'Project Name *', type: 'text', placeholder: 'e.g. Green Valley Gated Community' },
    { key: 'location', label: 'Location *', type: 'text', placeholder: 'Full address' },
    { key: 'city', label: 'City', type: 'text', placeholder: 'Hyderabad' },
    { key: 'state', label: 'State', type: 'text', placeholder: 'Telangana' },
    { key: 'pincode', label: 'Pincode', type: 'text', placeholder: '500001' },
    { key: 'total_units', label: 'Total Units', type: 'number', placeholder: '200' },
    { key: 'rera_number', label: 'RERA Number', type: 'text', placeholder: 'RERA/TS/...' },
    { key: 'launch_date', label: 'Launch Date', type: 'date', placeholder: '' },
    { key: 'possession_date', label: 'Possession Date', type: 'date', placeholder: '' },
  ];

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>{project ? 'Edit Project' : 'Create New Project'}</h2>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f87171', fontSize: 13 }}>{error}</div>}

        <div className={styles.grid2}>
          {fields.map(f => (
            <div key={f.key} className={styles.formGroup}>
              <label className={styles.formLabel}>{f.label}</label>
              <input
                type={f.type}
                className={styles.formInput}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Project Type</label>
            <select className={`${styles.formInput} ${styles.select}`}
              value={form.project_type}
              onChange={e => setForm(prev => ({ ...prev, project_type: e.target.value as any }))}>
              {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Status</label>
            <select className={`${styles.formInput} ${styles.select}`}
              value={form.status}
              onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea className={styles.formInput} rows={3} placeholder="Project description..."
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </div>

        <div className={styles.formActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await projectsApi.list({
        project_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.success) {
        setProjects(res.data.filter(p => !search || p.project_name.toLowerCase().includes(search.toLowerCase())));
        setTotal(res.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const filtered = search ? projects.filter(p => p.project_name.toLowerCase().includes(search.toLowerCase())) : projects;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Projects</h1>
          <p className={styles.pageSubtitle}>{total} project{total !== 1 ? 's' : ''}</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar} style={{ marginBottom: 20 }}>
        <input className={styles.searchInput}
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)} />
        <select className={styles.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <span className={styles.emptyStateTitle}>No projects yet</span>
          <span className={styles.emptyStateText}>Create your first project to get started</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}><Plus size={14} /> Create Project</button>
        </div>
      ) : (
        <div className={styles.grid3}>
          {filtered.map(project => (
            <Link key={project.id} href={`/developer/projects/${project.id}`} className={styles.projectCard}>
              <div className={styles.projectCardImage}>
                {project.project_images?.[0] ? (
                  <img src={project.project_images[0]} alt={project.project_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building2 size={48} />
                )}
              </div>
              <div className={styles.projectCardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span className={styles.projectCardName}>{project.project_name}</span>
                  <span className={`${styles.badge} ${STATUS_BADGE[project.status] || ''}`}>{STATUS_LABELS[project.status] || project.status}</span>
                </div>
                <div className={styles.projectCardLocation}><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{project.city || project.location}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className={`${styles.badge} ${styles.badgeUpcoming}`} style={{ fontSize: 10 }}>{PROJECT_TYPE_LABELS[project.project_type]}</span>
                  {project.rera_number && <span style={{ fontSize: 10, color: '#64748b' }}>RERA: {project.rera_number}</span>}
                </div>
                <div className={styles.projectCardStats}>
                  <div className={styles.projectCardStat}>
                    <div className={styles.projectCardStatValue}>{project.total_units}</div>
                    <div className={styles.projectCardStatLabel}>Total</div>
                  </div>
                  <div className={styles.projectCardStat}>
                    <div className={styles.projectCardStatValue} style={{ color: '#10b981' }}>{project.available_units || 0}</div>
                    <div className={styles.projectCardStatLabel}>Available</div>
                  </div>
                  <div className={styles.projectCardStat}>
                    <div className={styles.projectCardStatValue} style={{ color: '#f59e0b' }}>{project.sold_units || 0}</div>
                    <div className={styles.projectCardStatLabel}>Sold</div>
                  </div>
                </div>
                {project.total_units > 0 && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${((project.sold_units || 0) / project.total_units) * 100}%` }} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && <ProjectFormModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
