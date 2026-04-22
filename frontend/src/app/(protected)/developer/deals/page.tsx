'use client';

/**
 * Deal Pipeline Kanban Board
 *
 * Drag-and-drop columns for each deal stage.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Clock, DollarSign, User, Filter, 
  MapPin, CheckCircle2, AlertCircle, Building2,
  TrendingUp, BarChart3, X
} from 'lucide-react';
import { dealsApi, projectsApi } from '@/lib/developerApi';
import type { DevDeal, DealStage, DevProject } from '@/types/developer';
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '@/types/developer';
import styles from '../developer.module.css';

const KANBAN_STAGES: DealStage[] = [
  'DEAL_STARTED', 'VISIT_SCHEDULED', 'OFFER_SUBMITTED', 'IN_NEGOTIATION',
  'PRICE_AGREED', 'AWAITING_TOKEN', 'TOKEN_PAID', 'AGREEMENT_SIGNED',
  'AT_REGISTRATION', 'COMPLETED',
];

const STAGE_COLORS: Record<DealStage, string> = {
  DEAL_STARTED: '#6366f1',
  VISIT_SCHEDULED: '#8b5cf6',
  OFFER_SUBMITTED: '#3b82f6',
  IN_NEGOTIATION: '#f59e0b',
  PRICE_AGREED: '#10b981',
  AWAITING_TOKEN: '#ef4444',
  TOKEN_PAID: '#14b8a6',
  AGREEMENT_SIGNED: '#06b6d4',
  AT_REGISTRATION: '#84cc16',
  COMPLETED: '#22c55e',
  COMMISSION_RELEASED: '#a3e635',
  CANCELLED: '#6b7280',
};

function formatCurrency(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString()}`;
}

function TokenDeadline({ deadline }: { deadline?: string }) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const hours = Math.floor(diff / 3600000);
  if (hours < 0) return <span className={styles.kanbanCardDeadline}>⚠ Deadline Passed</span>;
  return <span className={styles.kanbanCardDeadline}><Clock size={10} /> {hours}h left</span>;
}

function DealCard({ deal, onDragStart, onClick }: { deal: DevDeal; onDragStart: (e: React.DragEvent, deal: DevDeal) => void; onClick: (deal: DevDeal) => void; }) {
  return (
    <div className={styles.kanbanCard} draggable onDragStart={e => onDragStart(e, deal)} onClick={() => onClick(deal)}>
      <div className={styles.kanbanCardUnit}>{deal.unit_number}</div>
      <div className={styles.kanbanCardProject}>{deal.project_name}</div>
      <div className={styles.kanbanCardBuyer}><User size={10} /> {deal.buyer_name}</div>
      <div className={styles.kanbanCardPrice}>{formatCurrency(deal.final_price)}</div>
      {deal.deal_stage === 'AWAITING_TOKEN' && <TokenDeadline deadline={deal.token_deadline} />}
    </div>
  );
}

function DealDetailModal({ deal, onClose, onStageUpdate }: { deal: DevDeal; onClose: () => void; onStageUpdate: (dealId: string, stage: DealStage) => Promise<void>; }) {
  const [selectedStage, setSelectedStage] = useState(deal.deal_stage);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  async function update() {
    if (selectedStage === deal.deal_stage) { onClose(); return; }
    setUpdating(true);
    try {
      await onStageUpdate(deal.id, selectedStage);
      onClose();
    } catch (e: any) { alert(e.message); }
    finally { setUpdating(false); }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className={styles.modalTitle}>Deal Management</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.grid2} style={{ marginBottom: 24 }}>
           <InfoItem label="Unit" value={deal.unit_number || '—'} />
           <InfoItem label="Project" value={deal.project_name || '—'} />
           <InfoItem label="Buyer" value={deal.buyer_name || '—'} />
           <InfoItem label="Deal Value" value={formatCurrency(deal.final_price)} highlight />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Update Pipeline Stage</label>
          <select className={styles.select} style={{ width: '100%' }} value={selectedStage} onChange={e => setSelectedStage(e.target.value as DealStage)}>
             {KANBAN_STAGES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>)}
             <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Internal Notes</label>
          <textarea className={styles.formInput} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add progress notes..." />
        </div>

        <div className={styles.formActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={update} disabled={updating}>
            {updating ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: highlight ? 800 : 600, color: highlight ? '#818cf8' : '#f1f5f9' }}>{value}</div>
    </div>
  );
}

export default function DealsPage() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, DevDeal[]>>({});
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<DevDeal | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const dragDeal = useRef<DevDeal | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [dealsRes, pRes] = await Promise.all([
        dealsApi.list({ per_page: 200 }),
        projectsApi.list()
      ]);
      if (dealsRes.success) {
        const byStage: Record<string, DevDeal[]> = {};
        KANBAN_STAGES.forEach(s => { byStage[s] = []; });
        dealsRes.data.forEach(d => {
          if (byStage[d.deal_stage]) byStage[d.deal_stage].push(d);
        });
        setDealsByStage(byStage);
      }
      if (pRes.success) setProjects(pRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function handleDragStart(e: React.DragEvent, deal: DevDeal) {
    dragDeal.current = deal;
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e: React.DragEvent, targetStage: DealStage) {
    e.preventDefault();
    const deal = dragDeal.current;
    if (!deal || deal.deal_stage === targetStage) return;
    try {
      await dealsApi.updateStage(deal.id, { deal_stage: targetStage });
      loadData();
    } catch (err: any) {
      alert(`Move error: ${err.message}`);
    }
  }

  const totalValue = Object.values(dealsByStage).flat()
    .filter(d => !projectFilter || d.project_name === projects.find(p => p.id === projectFilter)?.project_name)
    .reduce((sum, d) => sum + d.final_price, 0);

  return (
    <div className={styles.portalContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sales Pipeline</h1>
          <p className={styles.pageSubtitle}>Track and manage your project deals through closure</p>
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadData}><RefreshCw size={14} /> Sync</button>
      </div>

      <div className={styles.summaryStrip}>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue}>{formatCurrency(totalValue)}</div>
            <div className={styles.summaryLabel}>Pipeline Value</div>
         </div>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue} style={{ color: '#10b981' }}>
               {Object.values(dealsByStage).flat().filter(d => d.deal_stage === 'COMPLETED').length}
            </div>
            <div className={styles.summaryLabel}>Closed Deals</div>
         </div>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue} style={{ color: '#f59e0b' }}>
               {Object.values(dealsByStage).flat().filter(d => d.deal_stage === 'AWAITING_TOKEN').length}
            </div>
            <div className={styles.summaryLabel}>Token Pending</div>
         </div>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: 24 }}>
         <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Filter size={16} color="#64748b" />
            <select className={styles.select} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
               <option value="">All Projects</option>
               {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
         </div>
         <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span className={styles.badge} style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
               <TrendingUp size={12} /> Live Tracking
            </span>
         </div>
      </div>

      {loading ? (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className={styles.loadingSpinner} />
        </div>
      ) : (
        <div className={styles.kanbanBoard}>
          {KANBAN_STAGES.map(stage => {
            const stageDeals = (dealsByStage[stage] || []).filter(d => 
              !projectFilter || d.project_name === projects.find(p => p.id === projectFilter)?.project_name
            );
            const stageValue = stageDeals.reduce((s, d) => s + d.final_price, 0);

            return (
              <div key={stage} className={styles.kanbanColumn} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage)}>
                <div className={styles.kanbanColumnHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.kanbanColumnTitle}>{DEAL_STAGE_LABELS[stage]}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                  </div>
                  <div className={styles.kanbanColumnCount}>{stageDeals.length}</div>
                  <div className={styles.kanbanColumnValue}>{formatCurrency(stageValue)}</div>
                </div>
                <div className={styles.kanbanCards}>
                  {stageDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} onDragStart={handleDragStart} onClick={setSelectedDeal} />
                  ))}
                  {stageDeals.length === 0 && (
                    <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: '32px 0', border: '1px dashed rgba(99,102,241,0.1)', borderRadius: 12 }}>
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} onStageUpdate={async (id, s) => { await dealsApi.updateStage(id, { deal_stage: s }); loadData(); }} />
      )}
    </div>
  );
}
