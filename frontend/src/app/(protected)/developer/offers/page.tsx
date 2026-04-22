'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronRight, MessageSquare, Check, X, 
  RefreshCw, Filter, Projector, User, IndianRupee,
  Calendar, Clock, AlertCircle, Building2
} from 'lucide-react';
import { offersApi, projectsApi } from '@/lib/developerApi';
import type { DevOffer, DevProject } from '@/types/developer';
import styles from '../developer.module.css';

const STATUS_BADGE: Record<string, string> = {
  PENDING: styles.badgePending,
  UNDER_REVIEW: styles.badgeNegotiation,
  COUNTERED: styles.badgeCountered,
  ACCEPTED: styles.badgeAccepted,
  REJECTED: styles.badgeRejected,
  EXPIRED: styles.badgeBlocked,
};

function NegotiationTimeline({ history }: { history: DevOffer['history'] }) {
  if (!history?.length) return null;
  return (
    <div className={styles.timeline} style={{ marginTop: 20 }}>
      {history.map((h, i) => (
        <div key={h.id} className={styles.timelineItem}>
          <div className={styles.timelineLine} style={{ display: i === history.length - 1 ? 'none' : 'block' }} />
          <div className={styles.timelineDot} style={{
            background: h.action === 'ACCEPTED' ? '#10b981' : h.action === 'REJECTED' ? '#ef4444' : '#6366f1',
          }} />
          <div className={styles.timelineContent}>
            <div className={styles.timelineHeader}>
              <span className={styles.timelineAction}>{h.action}</span>
              <span className={styles.timelineTime}>{new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className={styles.timelineActor}>
              <User size={12} /> {h.actor_role}
            </div>
            {h.amount && <div className={styles.timelineAmount}>₹{h.amount.toLocaleString()}</div>}
            {h.message && <div className={styles.timelineMessage}>"{h.message}"</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OfferRow({ offer, onAction }: { offer: DevOffer; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fullOffer, setFullOffer] = useState<DevOffer | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState('');

  async function loadFull() {
    if (!expanded && !fullOffer) {
      try {
        const r = await offersApi.get(offer.id);
        if (r.success) setFullOffer(r.data);
      } catch(e) {}
    }
    setExpanded(!expanded);
  }

  async function doAction(action: 'accept'|'reject'|'counter') {
    setActing(action);
    try {
      if (action === 'accept') await offersApi.accept(offer.id);
      else if (action === 'reject') await offersApi.reject(offer.id, rejectReason || undefined);
      else if (action === 'counter') {
        if (!counterPrice) { alert('Enter counter price'); return; }
        await offersApi.counter(offer.id, { counter_price: parseFloat(counterPrice) });
      }
      onAction();
    } catch (e: any) { alert(e.message); }
    finally { setActing(''); }
  }

  const canAct = ['PENDING', 'UNDER_REVIEW', 'COUNTERED'].includes(offer.status);

  return (
    <div className={styles.offerCard} style={{ 
      background: 'rgba(15,23,42,0.4)', 
      border: expanded ? '2.5px solid #6366f1' : '1px solid rgba(99,102,241,0.12)',
      transform: expanded ? 'scale(1.01)' : 'scale(1)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      margin: expanded ? '16px 0' : '0 0 12px 0',
      boxShadow: expanded ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : 'none'
    }}>
      <div className={styles.offerRowHeader} onClick={loadFull}>
        <div className={styles.chevronWrap}>
           {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
        
        <div className={styles.offerUnitInfo}>
          <div className={styles.unitMain}>
            <span className={styles.unitNum}>{offer.unit_number}</span>
            <span className={styles.projectTag}>{offer.project_name}</span>
          </div>
          <div className={styles.buyerName}><User size={12} /> {offer.buyer_name}</div>
        </div>

        <div className={styles.offerPricing}>
          <div className={styles.mainPrice}>₹{offer.offer_price.toLocaleString()}</div>
          {offer.counter_price && <div className={styles.counterHint}>Sellers Counter: ₹{offer.counter_price.toLocaleString()}</div>}
        </div>

        <div className={styles.offerStatusBox}>
           <span className={`${styles.badge} ${STATUS_BADGE[offer.status]}`}>{offer.status.replace('_', ' ')}</span>
           <div className={styles.dateHint}><Calendar size={11} /> {new Date(offer.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {expanded && (
        <div className={styles.offerDetailBody}>
          <div className={styles.detailGrid}>
            <div className={styles.detailLeft}>
               {offer.buyer_message && (
                <div className={styles.messageBubble}>
                  <MessageSquare size={14} />
                  <span>{offer.buyer_message}</span>
                </div>
              )}
              
              <div className={styles.expiryBox}>
                <Clock size={14} />
                <span>Expires: {offer.expires_at ? new Date(offer.expires_at).toLocaleString() : 'N/A'}</span>
              </div>

              <NegotiationTimeline history={fullOffer?.history} />
            </div>

            {canAct && (
              <div className={styles.actionPanel}>
                <div className={styles.actionSection}>
                  <h4>Accept Offer</h4>
                  <p>Accepting this offer will reserve the unit for this buyer and reject all other pending offers.</p>
                  <button className={`${styles.btn} ${styles.btnSuccess}`}
                    onClick={() => doAction('accept')} disabled={!!acting}>
                    {acting === 'accept' ? 'Accepting…' : 'Accept & Reserve Unit'}
                  </button>
                </div>

                <div className={styles.actionSection}>
                  <h4>Counter Offer</h4>
                  <div className={styles.inputGroup}>
                    <IndianRupee size={14} className={styles.inputIcon} />
                    <input placeholder="Counter price" type="number"
                      value={counterPrice} onChange={e => setCounterPrice(e.target.value)} />
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                      onClick={() => doAction('counter')} disabled={!!acting}>
                      {acting === 'counter' ? 'Sending…' : 'Counter'}
                    </button>
                  </div>
                </div>

                <div className={styles.actionSection}>
                  <h4>Reject Offer</h4>
                  <div className={styles.inputGroup}>
                    <input placeholder="Optional reason..."
                      value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                      onClick={() => doAction('reject')} disabled={!!acting}>
                      {acting === 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OffersPage() {
  const [offers, setOffers] = useState<DevOffer[]>([]);
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [projectFilter, setProjectFilter] = useState('');
  const [page, setPage] = useState(1);

  async function loadData() {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([
        offersApi.list({ 
          status: statusFilter || undefined, 
          page, 
          per_page: 30 
        }),
        projectsApi.list({ per_page: 100 })
      ]);
      
      if (oRes.success) { 
        setOffers(oRes.data); 
        setTotal(oRes.total); 
      }
      if (pRes.success) {
        setProjects(pRes.data);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [statusFilter, page]);

  const filtered = projectFilter 
    ? offers.filter(o => o.project_name === projects.find(p => p.id === projectFilter)?.project_name)
    : offers;

  const awaitingAction = total; // Since default filter is PENDING

  return (
    <div className={styles.portalContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Negotiation Board</h1>
          <p className={styles.pageSubtitle}>Manage incoming offers and secure deals</p>
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadData}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className={styles.summaryStrip}>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue}>{awaitingAction}</div>
            <div className={styles.summaryLabel}>Awaiting Action</div>
         </div>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue}>₹{(offers[0]?.offer_price || 0).toLocaleString()}</div>
            <div className={styles.summaryLabel}>Highest Recent Offer</div>
         </div>
         <div className={styles.summaryBox}>
            <div className={styles.summaryValue}>{offers.length}</div>
            <div className={styles.summaryLabel}>Active Threads</div>
         </div>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['','PENDING','UNDER_REVIEW','COUNTERED','ACCEPTED','REJECTED'].map(s => (
            <button key={s} className={`${styles.btn} ${statusFilter === s ? styles.btnPrimary : styles.btnSecondary} ${styles.btnSm}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}>
              {(s || 'All').replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Filter size={16} color="#64748b" />
          <select className={styles.select} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
             <option value="">All Projects</option>
             {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={48} color="#94a3b8" />
          <span className={styles.emptyStateTitle}>No offers found</span>
          <span className={styles.emptyStateText}>Try adjusting your filters or status selection.</span>
        </div>
      ) : (
        <div className={styles.offerList}>
          {filtered.map(o => <OfferRow key={o.id} offer={o} onAction={loadData} />)}
        </div>
      )}

      {total > 30 && (
        <div className={styles.pagination}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} disabled={page === 1} onClick={() => setPage(p => p-1)}>Previous</button>
          <span className={styles.pageHint}>Page {page} of {Math.ceil(total / 30)}</span>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} disabled={offers.length < 30} onClick={() => setPage(p => p+1)}>Next</button>
        </div>
      )}
    </div>
  );
}
