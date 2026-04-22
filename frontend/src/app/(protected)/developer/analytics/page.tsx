'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { analyticsApi } from '@/lib/developerApi';
import type { AnalyticsSummary } from '@/types/developer';
import styles from '../developer.module.css';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function formatCurrency(v: number) {
  if (v >= 1e7) return `₹${(v/1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v/1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString()}`;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [offersData, setOffersData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, l, o, f, r] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getLeadsPerProject(),
        analyticsApi.getOffersPerUnit(),
        analyticsApi.getConversionRate(),
        analyticsApi.getRevenueTimeline(months),
      ]);
      if (s.success) setSummary(s.data);
      if (l.success) setLeadsData(l.data);
      if (o.success) setOffersData(o.data);
      if (f.success) setFunnelData(f.data);
      if (r.success) setRevenueData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [months]);

  const unitPieData = summary ? [
    { name: 'Available', value: summary.available_units },
    { name: 'Negotiation', value: summary.negotiation_units },
    { name: 'Reserved', value: summary.reserved_units },
    { name: 'Booked', value: summary.booked_units },
    { name: 'Sold', value: summary.sold_units },
  ].filter(d => d.value > 0) : [];

  const tooltipStyle = { background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 };

  if (loading) return <div className={styles.emptyState}><div className={styles.loadingSpinner} /></div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSubtitle}>Business intelligence for your portfolio</p>
        </div>
        <select className={styles.select} value={months} onChange={e => setMonths(parseInt(e.target.value))}>
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </select>
      </div>

      {/* Key metrics */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Projects', value: summary.total_projects, color: '#6366f1' },
            { label: 'Total Units', value: summary.total_units, color: '#8b5cf6' },
            { label: 'Sold', value: summary.sold_units, color: '#10b981' },
            { label: 'Active Deals', value: summary.active_deals, color: '#3b82f6' },
            { label: 'Revenue', value: formatCurrency(summary.revenue_generated), color: '#f59e0b', raw: true },
            { label: 'Commission', value: formatCurrency(summary.total_commission_paid), color: '#f97316', raw: true },
          ].map(m => (
            <div key={m.label} className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{m.label}</div>
              <div className={styles.kpiValue} style={{ color: m.color, fontSize: m.raw ? 18 : 28 }}>
                {m.raw ? m.value : (m.value as number).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Leads + Offers */}
      <div className={styles.grid2} style={{ marginBottom: 20 }}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Leads per Project (Top 8)</div>
          {leadsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsData.slice(0, 8)} margin={{ bottom: 30 }}>
                <XAxis dataKey="project_name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="lead_count" fill="#6366f1" radius={[4,4,0,0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.emptyState} style={{ padding: 40 }}>No lead data</div>}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Top Units by Offer Count</div>
          {offersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={offersData.slice(0, 8)} margin={{ bottom: 30 }}>
                <XAxis dataKey="unit_number" tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `Unit: ${v}`}
                  formatter={(val: any, name: string) => [val, name === 'offer_count' ? 'Offers' : 'Highest Offer']} />
                <Bar dataKey="offer_count" fill="#8b5cf6" radius={[4,4,0,0]} name="Offers" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={styles.emptyState} style={{ padding: 40 }}>No offer data</div>}
        </div>
      </div>

      {/* Row 2: Revenue + Funnel + Pie */}
      <div className={styles.grid2} style={{ marginBottom: 20 }}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Revenue Timeline</div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className={styles.emptyState} style={{ padding: 40 }}>No revenue data</div>}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Unit Status Breakdown</div>
          {unitPieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 220 }}>
              <PieChart width={180} height={200}>
                <Pie data={unitPieData} cx={85} cy={100} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {unitPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {unitPieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#94a3b8', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className={styles.emptyState} style={{ padding: 40 }}>No data</div>}
        </div>
      </div>

      {/* Conversion Funnel */}
      {funnelData.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Lead → Deal Conversion Funnel</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 8 }}>
            {funnelData.map((d, i) => (
              <div key={d.stage} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length] }}>{d.count}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{d.stage}</div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${d.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{d.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
