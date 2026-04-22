'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building2, MapPin, ListChecks, Image as ImageIcon, 
  FileText, Layout, CreditCard, CheckCircle2, ChevronRight, 
  ChevronLeft, Save, Loader2, Plus, Info
} from 'lucide-react';
import { projectsApi } from '@/lib/developerApi';
import type { DevProject } from '@/types/developer';
import LayoutEditor from '@/components/developer/LayoutEditor';
import UnitTableEditor from '@/components/developer/UnitTableEditor';
import styles from './wizard.module.css';

const STEPS = [
  { id: 1, title: 'Basics', icon: Building2, description: 'Project name & type' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Address & coordinates' },
  { id: 3, title: 'Details', icon: Info, description: 'Phases & RERA info' },
  { id: 4, title: 'Amenities', icon: ListChecks, description: 'Facilities provided' },
  { id: 5, title: 'Media', icon: ImageIcon, description: 'Images & Brochure' },
  { id: 6, title: 'Inventory', icon: Layout, description: 'Units & Bulk upload' },
  { id: 7, title: 'Pricing', icon: CreditCard, description: 'Dynamic pricing rules' },
  { id: 8, title: 'Layout Map', icon: MapPin, description: 'Interactive mapping' },
  { id: 9, title: 'Publish', icon: CheckCircle2, description: 'Review & Go Live' },
];

export default function ProjectWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState<Partial<DevProject>>({
    project_name: '',
    project_type: 'APARTMENT',
    status: 'UPCOMING',
    location: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
    amenities: [],
    pricing_rules: {
      base_price: 0,
      floor_rise: 0,
      corner_plot_premium: 0,
      east_facing_premium: 0,
      west_facing_premium: 0,
      north_facing_premium: 0,
      south_facing_premium: 0,
      parking_charges: 0,
      amenity_charges: 0
    },
    current_step: 1
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing project if editing
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  async function loadProject(id: string) {
    setLoading(true);
    try {
      const res = await projectsApi.get(id);
      if (res.success) {
        setProject(res.data);
        setCurrentStep(res.data.current_step || 1);
      }
    } catch (e: any) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(nextStep?: number) {
    setSaving(true);
    setError(null);
    try {
      const stepToSave = nextStep || currentStep;
      
      // Clean up data: convert empty strings to null for optional fields
      const dataToSave: any = { ...project, current_step: stepToSave };
      const dateFields = ['launch_date', 'possession_date', 'rera_number', 'city', 'state', 'pincode', 'description'];
      dateFields.forEach(f => {
        if (dataToSave[f] === '') dataToSave[f] = null;
      });

      // Ensure numeric fields are not NaN
      if (isNaN(dataToSave.total_units)) dataToSave.total_units = 0;
      if (isNaN(dataToSave.total_land_area)) dataToSave.total_land_area = null;

      let res;
      if (project.id) {
        res = await projectsApi.update(project.id, dataToSave);
      } else {
        res = await projectsApi.create(dataToSave);
        if (res.success && res.data.id) {
          router.replace(`/developer/projects/new?id=${res.data.id}`);
        }
      }

      if (res?.success) {
        setProject(res.data);
        if (nextStep) {
          if (nextStep > 9) {
            router.push('/developer/dashboard');
            return;
          }
          setCurrentStep(nextStep);
        }
      }
    } catch (e: any) {
      if (e.status === 422 && e.data?.detail) {
        const details = e.data.detail.map((err: any) => {
          const field = err.loc[err.loc.length - 1];
          return `${field}: ${err.msg}`;
        }).join(', ');
        setError(`Validation Error: ${details}`);
      } else {
        setError(e.message || 'Failed to save progress');
      }
    } finally {
      setSaving(false);
    }
  }

  const progress = (currentStep / STEPS.length) * 100;

  if (loading) return <div className={styles.wizardLoading}><Loader2 className={styles.spin} /> Loading Wizard...</div>;

  return (
    <div className={styles.wizardContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.wizardSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Create Project</h2>
          <p>Complete all 9 steps to publish</p>
        </div>
        
        <nav className={styles.stepList}>
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            
            return (
              <button 
                key={step.id} 
                className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isCompleted ? styles.stepCompleted : ''}`}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep && !project.id}
              >
                <div className={styles.stepIconContainer}>
                  {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </div>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>Step {step.id}: {step.title}</span>
                  <span className={styles.stepDesc}>{step.description}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span>{Math.round(progress)}% Completed</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.wizardMain}>
        <div className={styles.wizardHeader}>
          <h1>{STEPS[currentStep - 1].title}</h1>
          <p>{STEPS[currentStep - 1].description}</p>
        </div>

        <div className={styles.wizardBody}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {currentStep === 1 && <Step1Basics project={project} setProject={setProject} />}
          {currentStep === 2 && <Step2Location project={project} setProject={setProject} />}
          {currentStep === 3 && <Step3Details project={project} setProject={setProject} />}
          {currentStep === 4 && <Step4Amenities project={project} setProject={setProject} />}
          {currentStep === 5 && <Step5Media project={project} setProject={setProject} />}
          {currentStep === 6 && <Step6Inventory project={project} setProject={setProject} />}
          {currentStep === 7 && <Step7Pricing project={project} setProject={setProject} />}
          {currentStep === 8 && <Step8LayoutMap project={project} setProject={setProject} />}
          {currentStep === 9 && <Step9Publish project={project} setProject={setProject} />}
        </div>

        <div className={styles.wizardFooter}>
          <button 
            className={styles.btnSecondary} 
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1 || saving}
          >
            <ChevronLeft size={18} /> Back
          </button>
          
          <div className={styles.footerActions}>
            <button className={styles.btnGhost} onClick={() => handleSave()} disabled={saving || !project.id}>
              {saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />} Save Draft
            </button>
            
            <button 
              className={styles.btnPrimary} 
              onClick={() => handleSave(currentStep + 1)}
              disabled={saving}
            >
              {currentStep === 9 ? 'Finish & Publish' : 'Continue'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS FOR STEPS ---

function Step1Basics({ project, setProject }: any) {
  return (
    <div className={styles.formGrid}>
      <div className={styles.formGroup}>
        <label>Project Name <span className={styles.required}>*</span></label>
        <input 
          type="text" 
          placeholder="e.g. Prestige High Fields" 
          value={project.project_name}
          onChange={(e) => setProject({ ...project, project_name: e.target.value })}
        />
        <small>Use a professional name that attracts buyers.</small>
      </div>

      <div className={styles.formGroup}>
        <label>Project Type <span className={styles.required}>*</span></label>
        <select 
          value={project.project_type}
          onChange={(e) => setProject({ ...project, project_type: e.target.value })}
        >
          <option value="APARTMENT">Apartment Project</option>
          <option value="PLOT_VENTURE">Plotting / Layout Venture</option>
          <option value="VILLA_PROJECT">Luxury Villas</option>
          <option value="GATED_COMMUNITY">Gated Community (Mixed)</option>
          <option value="COMMERCIAL">Commercial Complex</option>
        </select>
      </div>

      <div className={styles.formGroupFull}>
        <label>Project Description</label>
        <textarea 
          rows={5} 
          placeholder="Describe your project, highlight key features, and explain why buyers should choose you..."
          value={project.description}
          onChange={(e) => setProject({ ...project, description: e.target.value })}
        />
      </div>
    </div>
  );
}

function Step2Location({ project, setProject }: any) {
  return (
    <div className={styles.formGrid}>
      <div className={styles.formGroupFull}>
        <label>Full Site Address <span className={styles.required}>*</span></label>
        <input 
          type="text" 
          placeholder="Plot No, Street, Landmark..." 
          value={project.location}
          onChange={(e) => setProject({ ...project, location: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>City</label>
        <input 
          type="text" 
          placeholder="e.g. Hyderabad" 
          value={project.city}
          onChange={(e) => setProject({ ...project, city: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>State</label>
        <input 
          type="text" 
          placeholder="e.g. Telangana" 
          value={project.state}
          onChange={(e) => setProject({ ...project, state: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Pincode</label>
        <input 
          type="text" 
          placeholder="6-digit code" 
          value={project.pincode}
          onChange={(e) => setProject({ ...project, pincode: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Total Land Area (Acres)</label>
        <input 
          type="number" 
          placeholder="e.g. 12.5" 
          value={project.total_land_area || ''}
          onChange={(e) => setProject({ ...project, total_land_area: e.target.value === '' ? null : parseFloat(e.target.value) })}
        />
      </div>
    </div>
  );
}

function Step3Details({ project, setProject }: any) {
  return (
    <div className={styles.formGrid}>
      <div className={styles.formGroup}>
        <label>RERA Registration Number</label>
        <input 
          type="text" 
          placeholder="e.g. RERA/TS/HYD/..." 
          value={project.rera_number || ''}
          onChange={(e) => setProject({ ...project, rera_number: e.target.value })}
        />
        <small>Provide valid RERA for buyer trust.</small>
      </div>

      <div className={styles.formGroup}>
        <label>Total Units</label>
        <input 
          type="number" 
          placeholder="Total units in project" 
          value={project.total_units || ''}
          onChange={(e) => setProject({ ...project, total_units: e.target.value === '' ? 0 : parseInt(e.target.value) })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Launch Date</label>
        <input 
          type="date" 
          value={project.launch_date || ''}
          onChange={(e) => setProject({ ...project, launch_date: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Possession Date</label>
        <input 
          type="date" 
          value={project.possession_date || ''}
          onChange={(e) => setProject({ ...project, possession_date: e.target.value })}
        />
      </div>
    </div>
  );
}

const AMENITY_OPTIONS = [
  'Clubhouse', 'Swimming Pool', 'Gymnasium', 'Landscaped Garden',
  'Children Play Area', 'Jogging Track', '24/7 Security', 'CCTV',
  'Solar Lighting', 'Rainwater Harvesting', 'Underground Drainage',
  'Gated Community', 'Entrance Arch', 'Internal BT Roads'
];

function Step4Amenities({ project, setProject }: any) {
  const current = project.amenities || [];

  const toggle = (amenity: string) => {
    if (current.includes(amenity)) {
      setProject({ ...project, amenities: current.filter((a: string) => a !== amenity) });
    } else {
      setProject({ ...project, amenities: [...current, amenity] });
    }
  };

  return (
    <div className={styles.amenityGrid}>
      {AMENITY_OPTIONS.map(opt => (
        <button 
          key={opt}
          className={`${styles.amenityChip} ${current.includes(opt) ? styles.amenityChipActive : ''}`}
          onClick={() => toggle(opt)}
        >
          {current.includes(opt) ? <CheckCircle2 size={14} /> : <Plus size={14} />}
          {opt}
        </button>
      ))}
    </div>
  );
}

function Step5Media({ project, setProject }: any) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !project.id) return;

    setUploading(true);
    try {
      const res = await projectsApi.uploadImage(project.id, file);
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, project_images: [...(project.project_images || []), data.image_url] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.mediaContainer}>
      <div className={styles.imageGrid}>
        {(project.project_images || []).map((url: string, i: number) => (
          <div key={i} className={styles.imageCard}>
            <img src={url} alt="Project" />
          </div>
        ))}
        <label className={styles.uploadCard}>
          {uploading ? <Loader2 className={styles.spin} /> : <Plus size={32} />}
          <span>Upload Image</span>
          <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className={styles.docUpload} style={{ marginTop: 32 }}>
        <label>Master Layout Image / Brochure PDF</label>
        <div className={styles.formGroup} style={{ marginTop: 12 }}>
          <input type="file" />
          <small>Upload master layout image for interactive mapping in Step 8.</small>
        </div>
      </div>
    </div>
  );
}

function Step6Inventory({ project, setProject }: any) {
  return (
    <UnitTableEditor 
      projectId={project.id} 
      onComplete={() => {
        // Refresh project if needed or just advance
        const next = Math.min(9, 6 + 1);
        // We'll let the user click "Next" manually to verify
      }} 
    />
  );
}

function Step7Pricing({ project, setProject }: any) {
  const rules = project.pricing_rules || {};

  const updateRule = (key: string, val: number) => {
    setProject({
      ...project,
      pricing_rules: { ...rules, [key]: val }
    });
  };

  return (
    <div className={styles.formGrid}>
      <div className={styles.formGroupFull}>
        <div className={styles.alertInfo}>
          <Info size={16} />
          <span>These rules will automatically calculate the final price for units based on their attributes.</span>
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label>Base Price (per sqft/sqyd)</label>
        <input 
          type="number" 
          value={rules.base_price || 0}
          onChange={(e) => updateRule('base_price', parseFloat(e.target.value))}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Corner Plot Premium (Fixed)</label>
        <input 
          type="number" 
          value={rules.corner_plot_premium || 0}
          onChange={(e) => updateRule('corner_plot_premium', parseFloat(e.target.value))}
        />
      </div>

      <div className={styles.formGroup}>
        <label>East Facing Premium (%)</label>
        <input 
          type="number" 
          value={rules.east_facing_premium || 0}
          onChange={(e) => updateRule('east_facing_premium', parseFloat(e.target.value))}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Amenities Charges (Fixed)</label>
        <input 
          type="number" 
          value={rules.amenity_charges || 0}
          onChange={(e) => updateRule('amenity_charges', parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

function Step8LayoutMap({ project, setProject }: any) {
  return (
    <div className={styles.layoutStepContainer}>
      <div className={styles.alertInfo} style={{ marginBottom: 24 }}>
        <Info size={16} />
        <span>Use the editor below to map your units. Click and drag the mouse on the image to create a square, then assign a unit number to it.</span>
      </div>
      <LayoutEditor 
        projectId={project.id} 
        masterImageUrl={project.project_images?.[0]} 
      />
    </div>
  );
}

function Step9Publish({ project, setProject }: any) {
  return (
    <div className={styles.publishContainer}>
      <div className={styles.reviewCard}>
        <CheckCircle2 size={48} color="#10b981" />
        <h2>Ready to Go Live?</h2>
        <p>Your project "{project.project_name}" is complete. Review all details one last time.</p>
        
        <div className={styles.summaryList}>
          <div className={styles.summaryItem}><span>Type:</span> <strong>{project.project_type}</strong></div>
          <div className={styles.summaryItem}><span>Location:</span> <strong>{project.city}, {project.state}</strong></div>
          <div className={styles.summaryItem}><span>Units:</span> <strong>{project.total_units} total</strong></div>
        </div>
      </div>

      <div className={styles.auctionBox}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" /> 
          <div>
            <strong>Enable Auction / Flash Sale Mode</strong>
            <span>Buyers can bid higher prices. Best for high-demand launches.</span>
          </div>
        </label>
      </div>
    </div>
  );
}
