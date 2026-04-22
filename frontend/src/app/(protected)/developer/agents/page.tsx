'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Plus, Phone, Mail, Percent, Edit3, Trash2 } from 'lucide-react';
import { agentsApi } from '@/lib/developerApi';
import type { DevAgent } from '@/types/developer';
import styles from '../developer.module.css';

function AgentCard({ agent, onEdit, onRemove }: { agent: DevAgent; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
            {agent.name[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{agent.name}</div>
            {agent.is_external && <span className={`${styles.badge} ${styles.badgeNegotiation}`} style={{ fontSize: 10 }}>External</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={onEdit}><Edit3 size={12} /></button>
          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={onRemove}><Trash2 size={12} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {agent.phone && <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#94a3b8' }}><Phone size={12} />{agent.phone}</div>}
        {agent.email && <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#94a3b8' }}><Mail size={12} />{agent.email}</div>}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Commission</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8' }}>{agent.commission_percentage}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Deals Closed</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{agent.deals_closed || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Commission Earned</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
            ₹{(agent.total_commission_earned || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<DevAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAgent, setEditAgent] = useState<DevAgent | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', commission_percentage: '2', is_external: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await agentsApi.list();
      if (r.success) setAgents(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditAgent(null); setForm({ name: '', phone: '', email: '', commission_percentage: '2', is_external: false }); setShowModal(true); }
  function openEdit(a: DevAgent) { setEditAgent(a); setForm({ name: a.name, phone: a.phone || '', email: a.email || '', commission_percentage: String(a.commission_percentage), is_external: a.is_external }); setShowModal(true); }

  async function save() {
    if (!form.name) { alert('Name required'); return; }
    setSaving(true);
    try {
      if (editAgent) {
        await agentsApi.update(editAgent.id, { name: form.name, phone: form.phone, email: form.email, commission_percentage: parseFloat(form.commission_percentage) });
      } else {
        await agentsApi.create({ name: form.name, phone: form.phone, email: form.email, commission_percentage: parseFloat(form.commission_percentage), is_external: form.is_external });
      }
      setShowModal(false);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Remove this agent?')) return;
    await agentsApi.remove(id);
    load();
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Agents</h1>
          <p className={styles.pageSubtitle}>{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}><Plus size={14} /> Add Agent</button>
      </div>

      {loading ? (
        <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
      ) : agents.length === 0 ? (
        <div className={styles.emptyState}>
          <UserCheck size={48} />
          <span className={styles.emptyStateTitle}>No agents assigned</span>
          <span className={styles.emptyStateText}>Add agents to help sell your units and track commissions</span>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}><Plus size={14} /> Add Agent</button>
        </div>
      ) : (
        <div className={styles.grid3}>
          {agents.map(a => (
            <AgentCard key={a.id} agent={a} onEdit={() => openEdit(a)} onRemove={() => remove(a.id)} />
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 420 }}>
            <h2 className={styles.modalTitle}>{editAgent ? 'Edit Agent' : 'Add Agent'}</h2>
            {[
              { key: 'name', label: 'Name *', type: 'text', placeholder: 'Agent name' },
              { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9XXXXXXXXX' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'agent@example.com' },
              { key: 'commission_percentage', label: 'Commission %', type: 'number', placeholder: '2.0' },
            ].map(f => (
              <div key={f.key} className={styles.formGroup}>
                <label className={styles.formLabel}>{f.label}</label>
                <input type={f.type} className={styles.formInput} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            {!editAgent && (
              <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ext" checked={form.is_external}
                  onChange={e => setForm(p => ({ ...p, is_external: e.target.checked }))} />
                <label htmlFor="ext" style={{ fontSize: 13, color: '#94a3b8' }}>External agent (not a NestFind user)</label>
              </div>
            )}
            <div className={styles.formActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editAgent ? 'Save Changes' : 'Add Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
