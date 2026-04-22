'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Upload, Edit3, MapPin, Calendar, Package } from 'lucide-react';
import { projectsApi, unitsApi } from '@/lib/developerApi';
import type { DevProject, DevUnit } from '@/types/developer';
import styles from '../../developer.module.css';

const STATUS_BADGE_MAP: Record<string, string> = {
  AVAILABLE: styles.badgeAvailable,
  NEGOTIATION: styles.badgeNegotiation,
  RESERVED: styles.badgeReserved,
  BOOKED: styles.badgeBooked,
  SOLD: styles.badgeSold,
  BLOCKED: styles.badgeBlocked,
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<DevProject | null>(null);
  const [units, setUnits] = useState<DevUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ unit_number: '', unit_type: 'Apartment', area_sqft: '', price: '', facing: '', floor: '', bedrooms: '', bathrooms: '', parking: '0' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [p, u] = await Promise.all([
        projectsApi.get(id),
        unitsApi.list({ project_id: id, per_page: 100 }),
      ]);
      if (p.success) setProject(p.data);
      if (u.success) setUnits(u.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function addUnit() {
    if (!unitForm.unit_number || !unitForm.price) return;
    setSaving(true);
    try {
      await unitsApi.create({
        project_id: id,
        unit_number: unitForm.unit_number,
        unit_type: unitForm.unit_type,
        area_sqft: unitForm.area_sqft ? parseFloat(unitForm.area_sqft) : undefined,
        price: parseFloat(unitForm.price),
        facing: unitForm.facing || undefined,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        bedrooms: unitForm.bedrooms ? parseInt(unitForm.bedrooms) : undefined,
        bathrooms: unitForm.bathrooms ? parseInt(unitForm.bathrooms) : undefined,
        parking: parseInt(unitForm.parking || '0'),
      } as any);
      setShowAddUnit(false);
      setUnitForm({ unit_number: '', unit_type: 'Apartment', area_sqft: '', price: '', facing: '', floor: '', bedrooms: '', bathrooms: '', parking: '0' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>;
  if (!project) return <div className={styles.emptyState}>Project not found</div>;

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => router.back()}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className={styles.pageTitle}>{project.project_name}</h1>
            <p className={styles.pageSubtitle}>{project.project_type.replace('_', ' ')} · {project.city || project.location}</p>
          </div>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAddUnit(true)}>
          <Plus size={14} /> Add Unit
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total', value: project.total_units, color: '#818cf8' },
          { label: 'Available', value: project.available_units || 0, color: '#10b981' },
          { label: 'Negotiation', value: (project as any).negotiation_units || 0, color: '#f59e0b' },
          { label: 'Reserved', value: (project as any).reserved_units || 0, color: '#818cf8' },
          { label: 'Booked', value: project.booked_units || 0, color: '#60a5fa' },
          { label: 'Sold', value: project.sold_units || 0, color: '#34d399' },
        ].map(s => (
          <div key={s.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{s.label}</div>
            <div className={styles.kpiValue} style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div className={styles.grid2}>
          <div>
            {project.description && <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>{project.description}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.rera_number && <InfoRow icon={<Package size={14} />} label="RERA" value={project.rera_number} />}
              {project.location && <InfoRow icon={<MapPin size={14} />} label="Location" value={`${project.location}${project.city ? `, ${project.city}` : ''}`} />}
              {project.launch_date && <InfoRow icon={<Calendar size={14} />} label="Launch" value={project.launch_date} />}
              {project.possession_date && <InfoRow icon={<Calendar size={14} />} label="Possession" value={project.possession_date} />}
            </div>
          </div>
          <div>
            {Array.isArray(project.amenities) && project.amenities.length > 0 && (
              <div>
                <div className={styles.formLabel} style={{ marginBottom: 10 }}>Amenities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {project.amenities.map(a => (
                    <span key={a} className={`${styles.badge} ${styles.badgeUpcoming}`} style={{ fontSize: 11 }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Units table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Units ({units.length})</span>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            onClick={() => router.push(`/developer/inventory?project_id=${id}`)}>
            View in Inventory
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Unit</th><th>Type</th><th>Area</th><th>Price</th><th>Floor</th><th>BHK</th><th>Facing</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No units added yet</td></tr>
            ) : units.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700, color: '#e2e8f0' }}>{u.unit_number}</td>
                <td>{u.unit_type}</td>
                <td>{u.area_sqft ? `${u.area_sqft.toLocaleString()} sqft` : '—'}</td>
                <td style={{ color: '#818cf8', fontWeight: 600 }}>₹{u.price.toLocaleString()}</td>
                <td>{u.floor ?? '—'}</td>
                <td>{u.bedrooms ? `${u.bedrooms}BHK` : '—'}</td>
                <td>{u.facing || '—'}</td>
                <td><span className={`${styles.badge} ${STATUS_BADGE_MAP[u.status] || ''}`}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add unit modal */}
      {showAddUnit && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowAddUnit(false)}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Add New Unit</h2>
            <div className={styles.grid2}>
              {[
                { key: 'unit_number', label: 'Unit Number *', type: 'text', placeholder: 'A-101' },
                { key: 'price', label: 'Price (₹) *', type: 'number', placeholder: '5500000' },
                { key: 'area_sqft', label: 'Area (sqft)', type: 'number', placeholder: '1200' },
                { key: 'floor', label: 'Floor', type: 'number', placeholder: '1' },
                { key: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '2' },
                { key: 'bathrooms', label: 'Bathrooms', type: 'number', placeholder: '2' },
                { key: 'facing', label: 'Facing', type: 'text', placeholder: 'East' },
                { key: 'parking', label: 'Parking', type: 'number', placeholder: '1' },
              ].map(f => (
                <div key={f.key} className={styles.formGroup}>
                  <label className={styles.formLabel}>{f.label}</label>
                  <input type={f.type} className={styles.formInput} placeholder={f.placeholder}
                    value={(unitForm as any)[f.key]}
                    onChange={e => setUnitForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Unit Type</label>
                <select className={`${styles.formInput} ${styles.select}`}
                  value={unitForm.unit_type}
                  onChange={e => setUnitForm(p => ({ ...p, unit_type: e.target.value }))}>
                  {['Apartment', 'Villa', 'Plot', 'Shop', 'Office', 'Penthouse'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowAddUnit(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={addUnit} disabled={saving}>
                {saving ? 'Adding…' : 'Add Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{icon}</span>
      <span style={{ color: '#64748b', minWidth: 80 }}>{label}:</span>
      <span style={{ color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}
