'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Grid3X3, TrendingUp, Users2, HandshakeIcon,
  GitBranch, DollarSign, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, FunnelChart
} from 'recharts';
import { analyticsApi } from '@/lib/developerApi';
import type { AnalyticsSummary } from '@/types/developer';
import styles from './developer.module.css';

const KPI_COLOR_CONFIGS = [
  { key: 'total_projects', label: 'Total Projects', icon: Building2, color: '#6366f1' },
  { key: 'total_units', label: 'Total Units', icon: Grid3X3, color: '#8b5cf6' },
  { key: 'available_units', label: 'Available', icon: Grid3X3, color: '#10b981' },
  { key: 'sold_units', label: 'Sold Units', icon: TrendingUp, color: '#f59e0b' },
  { key: 'active_negotiations', label: 'Active Offers', icon: HandshakeIcon, color: '#3b82f6' },
  { key: 'active_deals', label: 'Active Deals', icon: GitBranch, color: '#a855f7' },
  { key: 'total_leads', label: 'Total Leads', icon: Users2, color: '#14b8a6' },
  { key: 'revenue_generated', label: 'Revenue', icon: DollarSign, color: '#f97316', isCurrency: true },
];

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function formatCurrency(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(1)}Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)}L`;
  return `₹${val.toLocaleString()}`;
}

export default function DeveloperDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, l, c, r] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getLeadsPerProject(),
          analyticsApi.getConversionRate(),
          analyticsApi.getRevenueTimeline(6),
        ]);
        if (s.success) setSummary(s.data);
        if (l.success) setLeadsData(l.data);
        if (c.success) setConversionData(c.data);
        if (r.success) setRevenueData(r.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const unitPieData = summary ? [
    { name: 'Available', value: summary.available_units },
    { name: 'Negotiation', value: summary.negotiation_units },
    { name: 'Reserved', value: summary.reserved_units },
    { name: 'Booked', value: summary.booked_units },
    { name: 'Sold', value: summary.sold_units },
    { name: 'Blocked', value: summary.blocked_units },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.loadingSpinner} />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Developer Dashboard</h1>
          <p className={styles.pageSubtitle}>Overview of your projects, units, and deals</p>
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {KPI_COLOR_CONFIGS.map(({ key, label, icon: Icon, color, isCurrency }) => {
          const val = summary ? (summary as any)[key] ?? 0 : 0;
          return (
            <div key={key} className={styles.kpiCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className={styles.kpiLabel}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div className={styles.kpiValue} style={{ color, fontSize: isCurrency ? 20 : 28 }}>
                {isCurrency ? formatCurrency(val) : val.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className={styles.grid2} style={{ marginBottom: 20 }}>
        {/* Leads per project */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Leads per Project</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadsData.slice(0, 8)}>
              <XAxis dataKey="project_name" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0' }} />
              <Bar dataKey="lead_count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Unit status pie */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Unit Status Distribution</div>
          {unitPieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <PieChart width={150} height={150}>
                <Pie data={unitPieData} cx={70} cy={70} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {unitPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }} />
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unitPieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span style={{ color: '#94a3b8' }}>{d.name}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, marginLeft: 'auto' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState} style={{ padding: 30 }}>No unit data yet</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className={styles.grid2} style={{ marginBottom: 20 }}>
        {/* Revenue timeline */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Revenue (Last 6 Months)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={revenueData}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v: any) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion funnel */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Lead → Deal Conversion Funnel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {conversionData.map((d, i) => (
              <div key={d.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{d.stage}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{d.count} ({d.percentage}%)</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${d.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
