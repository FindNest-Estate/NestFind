'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle, ArrowRight, ArrowLeft, Upload, X, Eye, EyeOff } from 'lucide-react';
import { devRegistrationApi } from '@/lib/developerApi';

// ─── Design tokens ───────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 10, color: '#111827', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

const STEPS = [
  { n: 1, label: 'Create Account' },
  { n: 2, label: 'Verification' },
];

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({
  label, name, type = 'text', placeholder = '', required = false,
  value, onChange, children,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; value: string; onChange: (v: string) => void;
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#4b5563', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children ? children : (
        <div style={{ position: 'relative' }}>
          <input
            type={isPassword && show ? 'text' : type}
            placeholder={placeholder}
            required={required}
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ ...inp, paddingRight: isPassword ? 42 : 14 }}
            onFocus={e => {
              e.target.style.borderColor = '#FF385C';
              e.target.style.boxShadow = '0 0 0 1px #FF385C';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
          {isPassword && (
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, display: 'flex' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {STEPS.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: current >= s.n ? '#FF385C' : '#ffffff',
              border: current >= s.n ? 'none' : '2px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: current >= s.n ? 'white' : '#9ca3af',
              fontWeight: 700, fontSize: 13,
              boxShadow: current >= s.n ? '0 4px 12px rgba(255,56,92,0.25)' : 'none',
              transition: 'all 0.3s',
            }}>
              {current > s.n ? <CheckCircle size={16} /> : s.n}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: current >= s.n ? '#FF385C' : '#9ca3af', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 80, height: 2, background: current > s.n ? '#FF385C' : '#e5e7eb', margin: '0 8px', marginBottom: 18, transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── File upload field ────────────────────────────────────────────────────────
function DocUpload({ label, hint, file, onChange }: { label: string; hint: string; file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#4b5563', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div
        onClick={() => ref.current?.click()}
        style={{ border: '1.5px dashed #FF385C', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: '#fff1f2', transition: 'all 0.2s' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = '#E61E4D';
          (e.currentTarget as HTMLElement).style.background = '#ffe4e6';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = '#FF385C';
          (e.currentTarget as HTMLElement).style.background = '#fff1f2';
        }}
      >
        <Upload size={16} style={{ color: '#FF385C', flexShrink: 0 }} />
        {file ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{(file.size / 1024).toFixed(0)} KB</div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}>Click to upload <span style={{ color: '#FF385C' }}>{label.split(' ')[0]}</span></div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{hint}</div>
          </div>
        )}
        {file && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ''; }}
            style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '50%', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        )}
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
          onChange={e => onChange(e.target.files?.[0] || null)} />
      </div>
      <p style={{ fontSize: 10.5, color: '#6b7280', marginTop: 4 }}>PDF, JPG or PNG · Max 5MB</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DeveloperRegisterPage() {
  const [step, setStep] = useState(1);  // 1 = basic, 2 = verification, 3 = success

  // Step 1 – Basic account
  const [basic, setBasic] = useState({
    company_name: '', developer_name: '',
    email: '', phone: '',
    password: '', confirm_password: '',
    city: '', state: '',
  });

  // Step 2 – Business / KYC
  const [biz, setBiz] = useState({
    rera_registration_number: '',
    company_registration_number: '',
    gst_number: '',
    years_of_experience: '',
    projects_handled_before: '',
    about_company: '',
    website: '',
    office_address: '',
    pincode: '',
  });

  // Document files
  const [docs, setDocs] = useState<Record<string, File | null>>({
    rera_certificate: null,
    cin_certificate: null,
    gst_certificate: null,
    pan_card: null,
  });

  const [step1Errors, setStep1Errors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1 validation
  function validateStep1() {
    const errs: string[] = [];
    if (!basic.company_name.trim()) errs.push('Company name is required');
    if (!basic.developer_name.trim()) errs.push('Contact person name is required');
    if (!basic.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(basic.email)) errs.push('Valid email is required');
    if (!basic.phone.trim() || basic.phone.replace(/\D/g, '').length < 10) errs.push('Valid 10-digit phone number is required');
    if (!basic.password || basic.password.length < 8) errs.push('Password must be at least 8 characters');
    if (basic.password !== basic.confirm_password) errs.push('Passwords do not match');
    if (!basic.city.trim()) errs.push('City is required');
    if (!basic.state) errs.push('State is required');
    return errs;
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep1();
    if (errs.length > 0) { setStep1Errors(errs); return; }
    setStep1Errors([]);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Final submit
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload: any = {
        company_name: basic.company_name,
        developer_name: basic.developer_name,
        email: basic.email,
        phone: basic.phone,
        password: basic.password,
        city: basic.city,
        state: basic.state,
        rera_registration_number: biz.rera_registration_number || undefined,
        company_registration_number: biz.company_registration_number || undefined,
        gst_number: biz.gst_number || undefined,
        years_of_experience: biz.years_of_experience ? parseInt(biz.years_of_experience) : undefined,
        projects_handled_before: biz.projects_handled_before ? parseInt(biz.projects_handled_before) : undefined,
        about_company: biz.about_company || undefined,
        office_address: biz.office_address || undefined,
        pincode: biz.pincode || undefined,
      };

      await devRegistrationApi.register(payload);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const b = (key: keyof typeof basic) => ({
    value: basic[key],
    onChange: (v: string) => setBasic(p => ({ ...p, [key]: v })),
  });
  const bv = (key: keyof typeof biz) => ({
    value: biz[key],
    onChange: (v: string) => setBiz(p => ({ ...p, [key]: v })),
  });

  return (
    <div className="relative min-h-screen font-sans flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-x-hidden pt-28 sm:pt-12">
      
      {/* Full Background Image */}
      <div className="fixed inset-0 z-0 bg-gray-950">
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          alt="Professional Architecture" 
          className="w-full h-full object-cover opacity-[0.85]"
        />
        {/* Professional Dark Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px]" />
      </div>

      {/* Corporate Logo (Outside Card) */}
      <div className="absolute top-8 left-8 sm:top-12 sm:left-12 z-20">
        <Link href="/" className="inline-block transition-opacity hover:opacity-80 text-decoration-none">
           <span className="text-4xl font-extrabold text-[#FF385C] tracking-tight drop-shadow-md">NestFind</span>
        </Link>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[680px] bg-white shadow-2xl shadow-black/50 rounded-[1.5rem] overflow-hidden flex flex-col my-4 sm:my-8 border border-white/20">

        {/* Scrollable Form Content Inside Card */}
        <div className="p-4 sm:p-6 md:p-8">
          
          {/* Title */}
          <div className="mb-6 mt-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">Developer Portal</h1>
            <p className="text-slate-500 text-base">Register your company to manage projects, inventory, and leads.</p>
          </div>

        {/* ── SUCCESS ── */}
        {step === 3 ? (
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 24, padding: '48px 40px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={36} style={{ color: '#059669' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Registration Submitted!</h2>
            <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              Your developer account has been created.<br />
              Our admin team will review your details and get in touch within <strong style={{ color: '#111827' }}>1–2 business days</strong>.
            </p>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px', marginBottom: 32, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>What Happens Next</div>
              {[
                { n: 1, text: 'Admin reviews your company details and documents' },
                { n: 2, text: 'You receive an email once your account is approved' },
                { n: 3, text: 'Login and complete your verification profile' },
                { n: 4, text: 'Start creating projects and listing units' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 14, color: '#4b5563', alignItems: 'flex-start' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#fce7f3', color: '#FF385C', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.n}</span>
                  <span style={{ paddingTop: 2 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FF385C', color: 'white', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', transition: 'background-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E61E4D')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF385C')}>
              Go to Login <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <div style={{ background: 'transparent', borderRadius: 16 }}>
              {/* ── STEP 1 — Basic Account ───────────────────────────────── */}
              {step === 1 && (
                <form onSubmit={goToStep2}>
                  <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Create Your Account</h2>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Basic contact details. Takes less than 2 minutes.</p>
                  </div>

                  <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {step1Errors.length > 0 && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px' }}>
                        {step1Errors.map(e => (
                          <div key={e} style={{ display: 'flex', gap: 8, fontSize: 14, color: '#b91c1c', marginBottom: 6 }}>
                            <span style={{ marginTop: 1 }}>•</span>{e}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Company Name" name="company_name" placeholder="ABC Builders Pvt Ltd" required {...b('company_name')} />
                      <Field label="Contact Person Name" name="developer_name" placeholder="Your full name" required {...b('developer_name')} />
                      <Field label="Email Address" name="email" type="email" placeholder="developer@company.com" required {...b('email')} />
                      <Field label="Phone Number" name="phone" type="tel" placeholder="+91 9876543210" required {...b('phone')} />
                      <Field label="Password" name="password" type="password" placeholder="Min 8 characters" required {...b('password')} />
                      <Field label="Confirm Password" name="confirm_password" type="password" placeholder="Repeat password" required {...b('confirm_password')} />
                      <Field label="City" name="city" placeholder="Hyderabad" required {...b('city')} />
                      <Field label="State" name="state" required value={basic.state} onChange={v => setBasic(p => ({ ...p, state: v }))}>
                        <select
                          required
                          value={basic.state}
                          onChange={e => setBasic(p => ({ ...p, state: e.target.value }))}
                          style={{ ...inp, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px top 50%', backgroundSize: '10px auto' }}
                          onFocus={e => {
                            e.target.style.borderColor = '#FF385C';
                            e.target.style.boxShadow = '0 0 0 1px #FF385C';
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <option value="" disabled>Select state</option>
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>

                    <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 8 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: 13, color: '#4b5563', margin: 0, lineHeight: 1.6 }}>
                        RERA number, legal documents, and company profile can be submitted in the next step — or after login from your Verification page.
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '24px 40px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <Link href="/register" style={{ fontSize: 14, color: '#4b5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, transition: 'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}>
                      <ArrowLeft size={16} /> Back
                    </Link>
                    <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF385C', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E61E4D')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF385C')}>
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>

                  <div style={{ padding: '0 40px 24px', textAlign: 'center', background: '#f9fafb' }}>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      Already have an account?{' '}
                      <Link href="/login" style={{ color: '#FF385C', fontWeight: 600, textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>Sign in</Link>
                    </p>
                  </div>
                </form>
              )}

              {/* ── STEP 2 — Business Verification ──────────────────────── */}
              {step === 2 && (
                <form onSubmit={submit}>
                  <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Business Details</h2>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>All fields below are optional but speed up approval.</p>
                  </div>

                  <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

                    {submitError && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px', fontSize: 14, color: '#b91c1c' }}>
                        {submitError}
                      </div>
                    )}

                    {/* Legal Details */}
                    <div>
                      <SectionLabel>Legal Information</SectionLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="RERA Registration Number" name="rera" placeholder="RERA/TG/PROJ/2024/..." {...bv('rera_registration_number')} />
                        <Field label="CIN Number" name="cin" placeholder="U45400TG2015PTC..." {...bv('company_registration_number')} />
                        <Field label="GST Number" name="gst" placeholder="36AAAAA0000A1Z5" {...bv('gst_number')} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Field label="Years of Experience" name="exp" type="number" placeholder="10" {...bv('years_of_experience')} />
                          <Field label="Projects Completed" name="proj" type="number" placeholder="5" {...bv('projects_handled_before')} />
                        </div>
                      </div>
                    </div>

                    {/* Company Profile */}
                    <div>
                      <SectionLabel>Company Profile</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Field label="About Company" name="about" value={biz.about_company} onChange={v => setBiz(p => ({ ...p, about_company: v }))}>
                          <textarea
                            rows={4}
                            placeholder="ABC Builders has developed residential and commercial projects across Hyderabad for 10+ years..."
                            value={biz.about_company}
                            onChange={e => setBiz(p => ({ ...p, about_company: e.target.value }))}
                            style={{ ...inp, resize: 'vertical' }}
                            onFocus={e => {
                              e.target.style.borderColor = '#FF385C';
                              e.target.style.boxShadow = '0 0 0 1px #FF385C';
                            }}
                            onBlur={e => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </Field>
                        <Field label="Company Website" name="website" type="url" placeholder="https://abcbuilders.com" {...bv('website')} />
                      </div>
                    </div>

                    {/* Office Address */}
                    <div>
                      <SectionLabel>Office Address</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Field label="Street Address" name="addr" placeholder="Plot 12, Road No.5, Jubilee Hills" {...bv('office_address')} />
                        <Field label="Pincode" name="pin" placeholder="500033" {...bv('pincode')} />
                      </div>
                    </div>

                    {/* Document Upload */}
                    <div>
                      <SectionLabel>Upload Documents <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(speeds up verification)</span></SectionLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <DocUpload label="RERA Certificate" hint="RERA registration certificate" file={docs.rera_certificate} onChange={f => setDocs(p => ({ ...p, rera_certificate: f }))} />
                        <DocUpload label="CIN Certificate" hint="Company registration certificate" file={docs.cin_certificate} onChange={f => setDocs(p => ({ ...p, cin_certificate: f }))} />
                        <DocUpload label="GST Certificate" hint="GST registration document" file={docs.gst_certificate} onChange={f => setDocs(p => ({ ...p, gst_certificate: f }))} />
                        <DocUpload label="PAN Card" hint="Company or individual PAN card" file={docs.pan_card} onChange={f => setDocs(p => ({ ...p, pan_card: f }))} />
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12 }}>
                        📌 Documents can also be uploaded later from your <strong style={{ color: '#111827' }}>Verification</strong> page inside the portal.
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '24px 40px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <button type="button" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = '#d1d5db'; }}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="button" onClick={submit as any}
                        disabled={submitting}
                        style={{ background: 'transparent', color: '#6b7280', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={e => { if(!submitting) e.currentTarget.style.color = '#111827'; }}
                        onMouseLeave={e => { if(!submitting) e.currentTarget.style.color = '#6b7280'; }}>
                        Skip for now
                      </button>
                      <button type="submit" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 8, background: submitting ? '#9ca3af' : '#FF385C', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}
                              onMouseEnter={e => { if(!submitting) e.currentTarget.style.backgroundColor = '#E61E4D'; }}
                              onMouseLeave={e => { if(!submitting) e.currentTarget.style.backgroundColor = '#FF385C'; }}>
                        {submitting ? 'Submitting…' : <><CheckCircle size={18} /> Submit Registration</>}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
      {children}
    </div>
  );
}
