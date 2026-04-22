'use client';

import { useState, useEffect } from 'react';
import { Users2, Phone, Mail, Calendar, Edit3 } from 'lucide-react';
import { leadsApi, projectsApi } from '@/lib/developerApi';
import type { DevLead, DevProject } from '@/types/developer';
import styles from '../developer.module.css';

const STATUS_BADGE: Record<string, string> = {
  NEW: styles.badgePending,
  CONTACTED: styles.badgeUpcoming,
  VISIT_SCHEDULED: styles.badgeNegotiation,
  NEGOTIATION: styles.badgeCountered,
  CLOSED: styles.badgeAccepted,
};

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'NEGOTIATION', 'CLOSED'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<DevLead[]>([]);
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [editingLead, setEditingLead] = useState<DevLead | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editVisit, setEditVisit] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await leadsApi.list({ status: statusFilter || undefined, project_id: projectFilter || undefined });
      if (r.success) { setLeads(r.data); setTotal(r.total); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    projectsApi.list().then(r => { if (r.success) setProjects(r.data); });
  }, []);

  useEffect(() => { load(); }, [statusFilter, projectFilter]);

  async function saveEdit() {
    if (!editingLead) return;
    setSaving(true);
    try {
      await leadsApi.update(editingLead.id, {
        lead_status: editStatus || undefined,
        visit_date: editVisit || undefined,
      });
      setEditingLead(null);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Leads</h1>
          <p className={styles.pageSubtitle}>{total} leads total</p>
        </div>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: 16 }}>
        {['', ...STATUS_OPTIONS].map(s => (
          <button key={s} className={`${styles.btn} ${statusFilter === s ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
        <select className={styles.select} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
        ) : leads.length === 0 ? (
          <div className={styles.emptyState}>
            <Users2 size={48} />
            <span className={styles.emptyStateTitle}>No leads yet</span>
            <span className={styles.emptyStateText}>Leads are captured when buyers show interest</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Name/Buyer</th><th>Contact</th><th>Project</th><th>Unit</th><th>Source</th><th>Visit</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{l.name || 'Anonymous Buyer'}</td>
                  <td>
                    {l.phone && <div style={{ fontSize: 12 }}><Phone size={10} style={{ display: 'inline', marginRight: 3 }} />{l.phone}</div>}
                    {l.email && <div style={{ fontSize: 12, color: '#64748b' }}><Mail size={10} style={{ display: 'inline', marginRight: 3 }} />{l.email}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{l.project_name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.unit_number || '—'}</td>
                  <td><span className={`${styles.badge} ${styles.badgeUpcoming}`} style={{ fontSize: 10 }}>{l.source}</span></td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>
                    {l.visit_date ? <div><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />{new Date(l.visit_date).toLocaleDateString()}</div> : '—'}
                  </td>
                  <td><span className={`${styles.badge} ${STATUS_BADGE[l.lead_status] || ''}`}>{l.lead_status}</span></td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                      onClick={() => { setEditingLead(l); setEditStatus(l.lead_status); setEditVisit(l.visit_date || ''); }}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingLead && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setEditingLead(null)}>
          <div className={styles.modal} style={{ maxWidth: 400 }}>
            <h2 className={styles.modalTitle}>Update Lead</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select className={`${styles.formInput} ${styles.select}`} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Visit Date</label>
              <input type="datetime-local" className={styles.formInput}
                value={editVisit} onChange={e => setEditVisit(e.target.value)} />
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setEditingLead(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
