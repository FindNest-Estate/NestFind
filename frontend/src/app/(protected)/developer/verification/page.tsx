'use client';

/**
 * Developer Verification Page
 *
 * Shown inside the portal when a developer is PENDING_VERIFICATION or
 * has not yet submitted their KYC documents.
 *
 * Allows them to:
 *  - Fill in legal details (RERA, CIN, GST, experience)
 *  - Add company profile (about, website, logo)
 *  - Set office address
 *  - Upload verification documents (RERA cert, CIN cert, GST cert, PAN)
 *
 * After submission → status stays PENDING until Admin approves.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck, Upload, X, CheckCircle, Clock,
  AlertTriangle, Building2, FileText, MapPin, Briefcase
} from 'lucide-react';
import { settingsApi, documentsApi } from '@/lib/developerApi';
import type { DeveloperProfile } from '@/types/developer';
import styles from '../developer.module.css';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

const SECTIONS = [
  { id: 'legal', label: 'Legal Information', icon: Briefcase },
  { id: 'profile', label: 'Company Profile', icon: Building2 },
  { id: 'address', label: 'Office Address', icon: MapPin },
  { id: 'documents', label: 'Documents Upload', icon: FileText },
];

const REQUIRED_DOCS = [
  { key: 'rera_certificate', label: 'RERA Certificate', hint: 'RERA project/developer registration certificate', type: 'RERA_CERTIFICATE' },
  { key: 'cin_certificate', label: 'Company Registration (CIN)', hint: 'Certificate of Incorporation from MCA', type: 'LEGAL_DOCUMENT' },
  { key: 'gst_certificate', label: 'GST Certificate', hint: 'GST registration certificate', type: 'LEGAL_DOCUMENT' },
  { key: 'pan_card', label: 'PAN Card', hint: 'Company or Director PAN card', type: 'LEGAL_DOCUMENT' },
  { key: 'address_proof', label: 'Office Address Proof', hint: 'Electricity bill, rent agreement, or khata', type: 'LEGAL_DOCUMENT' },
];

function DocUploadCard({ label, hint, file, onChange, uploaded }: {
  label: string; hint: string;
  file: File | null; onChange: (f: File | null) => void;
  uploaded?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
        {uploaded && !file && (
          <span style={{ fontSize: 10.5, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
            <CheckCircle size={10} /> Uploaded
          </span>
        )}
      </div>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: file ? '1.5px solid rgba(99,102,241,0.4)' : '1.5px dashed rgba(99,102,241,0.2)',
          borderRadius: 10, padding: '12px 14px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          background: file ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.02)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = file ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'; }}
      >
        {file ? (
          <>
            <FileText size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{(file.size / 1024).toFixed(0)} KB · Ready to upload</div>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ''; }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Upload size={15} style={{ color: uploaded ? '#10b981' : '#6366f1', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: uploaded ? '#64748b' : '#94a3b8' }}>
                {uploaded ? 'Replace document' : 'Click to upload'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>{hint}</div>
            </div>
          </>
        )}
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
          onChange={e => onChange(e.target.files?.[0] || null)} />
      </div>
      <p style={{ fontSize: 10.5, color: '#334155', marginTop: 3 }}>PDF, JPG or PNG · Max 5MB</p>
    </div>
  );
}

export default function VerificationPage() {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('legal');

  const [form, setForm] = useState({
    rera_registration_number: '',
    company_registration_number: '',
    gst_number: '',
    years_of_experience: '',
    projects_handled_before: '',
    about_company: '',
    website: '',
    office_address: '',
    city: '',
    state: '',
    pincode: '',
    support_phone: '',
    support_email: '',
  });

  const [docs, setDocs] = useState<Record<string, File | null>>({
    rera_certificate: null,
    cin_certificate: null,
    gst_certificate: null,
    pan_card: null,
    address_proof: null,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    settingsApi.get().then(r => {
      if (r.success) {
        const p = r.data;
        setProfile(p);
        setForm(prev => ({
          ...prev,
          rera_registration_number: p.rera_registration_number || '',
          company_registration_number: p.company_registration_number || '',
          gst_number: p.gst_number || '',
          years_of_experience: p.years_of_experience ? String(p.years_of_experience) : '',
          projects_handled_before: p.projects_handled_before ? String(p.projects_handled_before) : '',
          about_company: p.about_company || '',
          website: p.website || '',
          support_email: p.support_email || '',
          support_phone: p.support_phone || p.phone || '',
          office_address: p.office_address || '',
          city: p.city || '',
          state: p.state || '',
          pincode: p.pincode || '',
        }));
      }
    }).finally(() => setLoading(false));
  }, []);

  async function saveSection(section: string) {
    setSaving(true);
    setError('');
    try {
      let payload: Partial<DeveloperProfile> = {};

      if (section === 'legal') {
        payload = {
          rera_registration_number: form.rera_registration_number,
          company_registration_number: form.company_registration_number,
          gst_number: form.gst_number,
          years_of_experience: parseInt(form.years_of_experience || '0'),
          projects_handled_before: parseInt(form.projects_handled_before || '0'),
        };
      } else if (section === 'profile') {
        payload = {
          about_company: form.about_company,
          website: form.website,
          support_email: form.support_email,
          support_phone: form.support_phone,
        };
      } else if (section === 'address') {
        payload = {
          office_address: form.office_address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        };
      }

      const r = await settingsApi.updateCompany(payload);
      if (r.success) {
        setSavedSections(prev => new Set([...prev, section]));
        // If profile was rejected, it moves to pending on update
        if (profile?.status === 'REJECTED') {
          setProfile(p => p ? { ...p, status: 'PENDING' } : null);
        }
      } else {
        setError((r as any).message || 'Failed to save section');
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocuments() {
    const hasFiles = Object.values(docs).some(f => f !== null);
    if (!hasFiles) return;

    setUploading(true);
    setError('');
    try {
      const uploadMap = REQUIRED_DOCS.filter(d => docs[d.key]);
      await Promise.all(uploadMap.map(d =>
        documentsApi.upload(docs[d.key]!, d.type, d.label)
      ));
      const uploaded = new Set([...uploadedDocs]);
      uploadMap.forEach(d => uploaded.add(d.key));
      setUploadedDocs(uploaded);
      setDocs(prev => {
        const next = { ...prev };
        uploadMap.forEach(d => { next[d.key] = null; });
        return next;
      });
      setSavedSections(prev => new Set([...prev, 'documents']));
    } catch (e: any) {
      setError(e.message || 'Document upload failed');
    } finally {
      setUploading(false);
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (v: string) => setForm(p => ({ ...p, [key]: v })),
  });

  const StatusBanner = () => {
    if (!profile) return null;
    const s = profile.status;
    if (s === 'APPROVED') return (
      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
        <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 2 }}>Account Verified ✓</div>
          <div style={{ fontSize: 13, color: '#6ee7b7' }}>Your account is fully verified. You can create projects and manage listings.</div>
        </div>
      </div>
    );
    if (s === 'REJECTED') return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
        <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>Verification Rejected</div>
          <div style={{ fontSize: 13, color: '#fca5a5' }}>{profile.rejection_reason || 'Your verification was rejected. Please update your documents and resubmit.'}</div>
        </div>
      </div>
    );
    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
        <Clock size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>Pending Verification</div>
          <div style={{ fontSize: 13, color: '#fcd34d' }}>
            Complete the sections below and upload your documents to speed up verification.
            You <strong>cannot create projects</strong> until your account is approved by Admin.
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <ShieldCheck size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle', color: '#6366f1' }} />
            Verification & KYC
          </h1>
          <p className={styles.pageSubtitle}>Complete your business profile to get verified and start listing projects</p>
        </div>
        {profile && (
          <span className={`${styles.badge} ${
            profile.status === 'APPROVED' ? styles.badgeAccepted :
            profile.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending
          }`} style={{ fontSize: 12, padding: '5px 14px' }}>
            {profile.status === 'APPROVED' ? '✓ Verified' :
             profile.status === 'REJECTED' ? '✗ Rejected' : '⏳ Pending Review'}
          </span>
        )}
      </div>

      <StatusBanner />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div className={styles.card} style={{ padding: 8, position: 'sticky', top: 80 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`${styles.navItem} ${activeSection === s.id ? styles.navItemActive : ''}`}
              style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'none', justifyContent: 'flex-start' }}>
              <s.icon size={15} />
              <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
              {savedSections.has(s.id) && <CheckCircle size={12} style={{ color: '#10b981', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>

          {/* ── Legal Information ── */}
          {activeSection === 'legal' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 4 }}>Legal Information</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                These details verify you are a legitimate real estate developer. RERA number is mandatory to list projects.
              </p>
              <div className={styles.grid2}>
                <FormField label="RERA Registration Number" placeholder="RERA/TG/PROJ/2024/..." hint="Proves legal authority to sell real estate" {...f('rera_registration_number')} />
                <FormField label="CIN Number" placeholder="U45400TG2015PTC..." hint="Company registration at MCA21" {...f('company_registration_number')} />
                <FormField label="GST Number" placeholder="36AAAAA0000A1Z5" hint="Tax identification number" {...f('gst_number')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FormField label="Years of Experience" type="number" placeholder="10" {...f('years_of_experience')} />
                  <FormField label="Projects Completed" type="number" placeholder="5" {...f('projects_handled_before')} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveSection('legal')} disabled={saving}>
                  <CheckCircle size={14} /> {saving ? 'Saving…' : 'Save Legal Info'}
                </button>
              </div>
            </div>
          )}

          {/* ── Company Profile ── */}
          {activeSection === 'profile' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 4 }}>Company Profile</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                A strong profile builds buyer trust — show your experience, projects, and credibility.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>About Company</label>
                  <textarea className={styles.formInput} rows={4}
                    placeholder="ABC Builders has developed residential and commercial projects across Hyderabad for 10+ years, delivering quality homes to 500+ families."
                    value={form.about_company} onChange={e => setForm(p => ({ ...p, about_company: e.target.value }))} />
                </div>
                <FormField label="Company Website" type="url" placeholder="https://abcbuilders.com" {...f('website')} />
                <FormField label="Support Email" type="email" placeholder="support@abcbuilders.com" {...f('support_email')} />
                <FormField label="Support Phone" type="tel" placeholder="+91 9876543210" {...f('support_phone')} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveSection('profile')} disabled={saving}>
                  <CheckCircle size={14} /> {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* ── Office Address ── */}
          {activeSection === 'address' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 4 }}>Office Address</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Your registered office address is shown to buyers and used for legal verification.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Street Address</label>
                  <textarea className={styles.formInput} rows={2}
                    placeholder="Plot 12, Road No.5, Jubilee Hills"
                    value={form.office_address} onChange={e => setForm(p => ({ ...p, office_address: e.target.value }))} />
                </div>
                <div className={styles.grid2}>
                  <FormField label="City" placeholder="Hyderabad" {...f('city')} />
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>State</label>
                    <select className={`${styles.formInput} ${styles.select}`}
                      value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                      <option value="">Select state</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <FormField label="Pincode" placeholder="500033" {...f('pincode')} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveSection('address')} disabled={saving}>
                  <CheckCircle size={14} /> {saving ? 'Saving…' : 'Save Address'}
                </button>
              </div>
            </div>
          )}

          {/* ── Documents Upload ── */}
          {activeSection === 'documents' && (
            <div className={styles.card}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16, marginBottom: 4 }}>Upload Documents</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                Upload your legal documents to get verified faster. All documents are reviewed by our admin team.
              </p>
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
                <strong style={{ color: '#a5b4fc' }}>Accepted formats:</strong> PDF, JPG, PNG · Max 5MB per file.<br />
                Documents are securely stored and only visible to the NestFind admin team.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {REQUIRED_DOCS.map(d => (
                  <DocUploadCard
                    key={d.key}
                    label={d.label}
                    hint={d.hint}
                    file={docs[d.key]}
                    onChange={f => setDocs(p => ({ ...p, [d.key]: f }))}
                    uploaded={uploadedDocs.has(d.key)}
                  />
                ))}
              </div>
              {uploadedDocs.size > 0 && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 13, color: '#6ee7b7', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <CheckCircle size={14} />
                  {uploadedDocs.size} document{uploadedDocs.size > 1 ? 's' : ''} uploaded successfully and sent for review.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={uploadDocuments} disabled={uploading || !Object.values(docs).some(Boolean)}>
                  <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Documents'}
                </button>
              </div>
            </div>
          )}

          {/* Completion summary */}
          {savedSections.size > 0 && (
            <div className={styles.card} style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', padding: '14px 20px' }}>
              <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>
                  {savedSections.size} of {SECTIONS.length} sections completed
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {savedSections.size === SECTIONS.length
                    ? 'All sections complete — admin will review and approve soon'
                    : `Complete remaining sections: ${SECTIONS.filter(s => !savedSections.has(s.id)).map(s => s.label.split(' ')[0]).join(', ')}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, type = 'text', placeholder, hint, value, onChange }: {
  label: string; type?: string; placeholder: string; hint?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}</label>
      <input type={type} className={styles.formInput} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} />
      {hint && <p style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{hint}</p>}
    </div>
  );
}
