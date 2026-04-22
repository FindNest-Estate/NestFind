'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Shield, Bell, Building2, Sliders } from 'lucide-react';
import { settingsApi } from '@/lib/developerApi';
import type { DeveloperProfile, DeveloperSettings } from '@/types/developer';
import styles from '../developer.module.css';

const TABS = [
  { id: 'company', label: 'Company Info', icon: Building2 },
  { id: 'deal', label: 'Deal Settings', icon: Sliders },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [companyForm, setCompanyForm] = useState({ company_name: '', office_address: '', city: '', state: '', support_phone: '' });
  const [dealForm, setDealForm] = useState<Partial<DeveloperSettings>>({
    token_deadline_hours: 48,
    min_offer_percentage: 90,
    auto_reject_low_offers: false,
    allow_multiple_negotiations: true,
    default_agent_commission_pct: 2,
    allow_external_agents: true,
  });
  const [notifForm, setNotifForm] = useState<Partial<DeveloperSettings>>({
    notify_new_lead: true,
    notify_new_offer: true,
    notify_offer_accepted: true,
    notify_token_deadline: true,
    notify_deal_stage_change: true,
    email_notifications: true,
    sms_notifications: false,
  });

  useEffect(() => {
    settingsApi.get().then(r => {
      if (r.success) {
        setProfile(r.data);
        setCompanyForm({
          company_name: r.data.company_name || '',
          office_address: r.data.office_address || '',
          city: r.data.city || '',
          state: r.data.state || '',
          support_phone: r.data.phone || '',
        });
        if (r.data.settings) {
          const s = r.data.settings;
          setDealForm({
            token_deadline_hours: s.token_deadline_hours ?? 48,
            min_offer_percentage: s.min_offer_percentage ?? 90,
            auto_reject_low_offers: s.auto_reject_low_offers ?? false,
            allow_multiple_negotiations: s.allow_multiple_negotiations ?? true,
            default_agent_commission_pct: s.default_agent_commission_pct ?? 2,
            allow_external_agents: s.allow_external_agents ?? true,
          });
          setNotifForm({
            notify_new_lead: s.notify_new_lead ?? true,
            notify_new_offer: s.notify_new_offer ?? true,
            notify_offer_accepted: s.notify_offer_accepted ?? true,
            notify_token_deadline: s.notify_token_deadline ?? true,
            notify_deal_stage_change: s.notify_deal_stage_change ?? true,
            email_notifications: s.email_notifications ?? true,
            sms_notifications: s.sms_notifications ?? false,
          });
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (activeTab === 'company') await settingsApi.updateCompany(companyForm);
      else if (activeTab === 'deal' || activeTab === 'notifications') {
        await settingsApi.updateDeal({ ...dealForm, ...notifForm } as DeveloperSettings);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>Configure your developer portal preferences</p>
        </div>
        {profile && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`${styles.badge} ${profile.status === 'APPROVED' ? styles.badgeAccepted : styles.badgePending}`}>
              Account: {profile.status}
            </span>
          </div>
        )}
      </div>

      <div className={styles.grid2} style={{ alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ gridColumn: '1/2' }}>
          <div className={styles.card} style={{ padding: 8 }}>
            {TABS.map(tab => (
              <button key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', cursor: 'pointer', border: 'none', background: 'none' }}
                onClick={() => setActiveTab(tab.id)}>
                <tab.icon size={16} className={styles.navIcon} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ gridColumn: '1 / -1' }}>
          {activeTab === 'company' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>Company Information</div>
              <div className={styles.grid2}>
                {[
                  { key: 'company_name', label: 'Company Name', placeholder: 'ABC Builders Pvt Ltd' },
                  { key: 'support_phone', label: 'Contact Phone', placeholder: '+91 9XXXXXXXXX' },
                  { key: 'city', label: 'City', placeholder: 'Hyderabad' },
                  { key: 'state', label: 'State', placeholder: 'Telangana' },
                ].map(f => (
                  <div key={f.key} className={styles.formGroup}>
                    <label className={styles.formLabel}>{f.label}</label>
                    <input type="text" className={styles.formInput} placeholder={f.placeholder}
                      value={(companyForm as any)[f.key]}
                      onChange={e => setCompanyForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Office Address</label>
                <textarea className={styles.formInput} rows={3} placeholder="Full office address…"
                  value={companyForm.office_address}
                  onChange={e => setCompanyForm(p => ({ ...p, office_address: e.target.value }))} />
              </div>
            </div>
          )}

          {activeTab === 'deal' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>Deal Configuration</div>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Token Deadline (hours)</label>
                  <input type="number" className={styles.formInput} min={1} max={168}
                    value={dealForm.token_deadline_hours}
                    onChange={e => setDealForm(p => ({ ...p, token_deadline_hours: parseInt(e.target.value) }))} />
                  <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>How long buyers have to pay token after offer accepted (default: 48 hours)</p>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Minimum Offer % of Asking Price</label>
                  <input type="number" className={styles.formInput} min={50} max={100} step={0.5}
                    value={dealForm.min_offer_percentage}
                    onChange={e => setDealForm(p => ({ ...p, min_offer_percentage: parseFloat(e.target.value) }))} />
                  <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>Offers below this % will be flagged</p>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Default Agent Commission %</label>
                  <input type="number" className={styles.formInput} min={0} max={20} step={0.1}
                    value={dealForm.default_agent_commission_pct}
                    onChange={e => setDealForm(p => ({ ...p, default_agent_commission_pct: parseFloat(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {[
                  { key: 'auto_reject_low_offers', label: 'Auto-reject offers below minimum %' },
                  { key: 'allow_multiple_negotiations', label: 'Allow multiple buyers to negotiate simultaneously' },
                  { key: 'allow_external_agents', label: 'Allow external (non-NestFind) agents' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={(dealForm as any)[opt.key]}
                      onChange={e => setDealForm(p => ({ ...p, [opt.key]: e.target.checked }))} />
                    <span style={{ fontSize: 13.5, color: '#94a3b8' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>Notification Preferences</div>
              <div style={{ marginBottom: 20 }}>
                <div className={styles.formLabel} style={{ marginBottom: 10 }}>Notification Events</div>
                {[
                  { key: 'notify_new_lead', label: 'New lead captured' },
                  { key: 'notify_new_offer', label: 'New offer submitted by buyer' },
                  { key: 'notify_offer_accepted', label: 'Offer accepted / deal started' },
                  { key: 'notify_token_deadline', label: 'Token payment deadline reminder (24h, 6h)' },
                  { key: 'notify_deal_stage_change', label: 'Deal stage updated' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                    <input type="checkbox" checked={(notifForm as any)[opt.key]}
                      onChange={e => setNotifForm(p => ({ ...p, [opt.key]: e.target.checked }))} />
                    <span style={{ fontSize: 13.5, color: '#94a3b8' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className={styles.formLabel} style={{ marginBottom: 10 }}>Notification Channels</div>
              {[
                { key: 'email_notifications', label: 'Email notifications' },
                { key: 'sms_notifications', label: 'SMS notifications' },
              ].map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                  <input type="checkbox" checked={(notifForm as any)[opt.key]}
                    onChange={e => setNotifForm(p => ({ ...p, [opt.key]: e.target.checked }))} />
                  <span style={{ fontSize: 13.5, color: '#94a3b8' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 20, fontSize: 16 }}>Security</div>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '16px 18px', fontSize: 13, color: '#94a3b8' }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Password Management</div>
                <p>To change your password, use the main account settings at <strong style={{ color: '#818cf8' }}>/settings/security</strong></p>
                <p style={{ marginTop: 8 }}>Two-factor authentication (2FA) is managed from your account profile.</p>
              </div>
            </div>
          )}

          {activeTab !== 'security' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
