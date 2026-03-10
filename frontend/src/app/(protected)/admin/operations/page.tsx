'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity, Loader2, RefreshCw, TrendingUp, AlertTriangle, TrendingDown,
    DollarSign, Users, Clock, Download, BarChart3, Shield, FileText,
    ChevronRight, Ban, ArrowUpRight
} from 'lucide-react';
import {
    getDealPipeline, getStuckDeals, getFinancialSummary, getAgentMetrics,
    getDisputeAging, getCancellationReport, getAdminActionLog,
    getAgreementCompliance, getDisputedDeals, exportReport,
    DealPipelineItem, StuckDeal, FinancialSummary, AgentMetric,
    DisputeAgingBucket, CancellationItem, AdminActionItem, DisputedDeal
} from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString('en-IN')}`;
};

export default function AdminOperationsPage() {
    const [loading, setLoading] = useState(true);
    const [pipeline, setPipeline] = useState<DealPipelineItem[]>([]);
    const [stuckDeals, setStuckDeals] = useState<StuckDeal[]>([]);
    const [stuckThreshold, setStuckThreshold] = useState(7);
    const [financial, setFinancial] = useState<FinancialSummary | null>(null);
    const [agents, setAgents] = useState<AgentMetric[]>([]);
    const [disputeAging, setDisputeAging] = useState<DisputeAgingBucket[]>([]);
    const [cancellations, setCancellations] = useState<CancellationItem[]>([]);
    const [actionLog, setActionLog] = useState<AdminActionItem[]>([]);
    const [compliance, setCompliance] = useState<any[]>([]);
    const [disputedDeals, setDisputedDeals] = useState<DisputedDeal[]>([]);
    const [exporting, setExporting] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                getDealPipeline(),
                getStuckDeals(stuckThreshold),
                getFinancialSummary(),
                getAgentMetrics(),
                getDisputeAging(),
                getCancellationReport(),
                getAdminActionLog(20),
                getAgreementCompliance(),
                getDisputedDeals(),
            ]);
            const extract = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data : null;
            setPipeline(extract(results[0]) || []);
            setStuckDeals(extract(results[1]) || []);
            setFinancial(extract(results[2]) || null);
            setAgents(extract(results[3]) || []);
            setDisputeAging(extract(results[4]) || []);
            setCancellations(extract(results[5]) || []);
            setActionLog(extract(results[6]) || []);
            setCompliance(extract(results[7]) || []);
            setDisputedDeals(extract(results[8]) || []);
        } catch { /* handled */ } finally { setLoading(false); }
    }, [stuckThreshold]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const refreshStuck = async (days: number) => {
        setStuckThreshold(days);
        try {
            const res = await getStuckDeals(days);
            if (res.success) setStuckDeals(res.data || []);
        } catch { /* handled */ }
    };

    const handleExport = async (type: string, format: 'csv' | 'json' = 'csv') => {
        setExporting(type);
        try {
            const blob = await exportReport(type, format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { /* handled */ } finally { setExporting(null); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent" />
                <p className="text-sm text-[var(--gray-400)] mt-3">Loading operations data...</p>
            </div>
        );
    }

    const totalDeals = (pipeline || []).reduce((s, p) => s + p.count, 0);
    const pipelineColors = ['#FF385C', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)]">Operations Command Center</h1>
                    <p className="text-sm text-[var(--gray-500)] mt-0.5">Deal pipeline, financial health, agent performance, and compliance</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleExport('full-report', 'csv')} disabled={!!exporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] transition-colors">
                        {exporting === 'full-report' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Export All
                    </button>
                    <button onClick={fetchAll}
                        className="p-2 text-[var(--gray-500)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] transition-colors border border-[var(--gray-200)]">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                1. FINANCIAL SUMMARY
            ═══════════════════════════════════════════════════════════════════ */}
            {financial && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Total GMV', value: fmtShort(financial.total_gmv), icon: DollarSign, color: 'var(--color-brand)' },
                        { label: 'Platform Fees', value: fmtShort(financial.platform_fees), icon: TrendingUp, color: '#6366f1' },
                        { label: 'Commission Released', value: fmtShort(financial.commission_released), icon: ArrowUpRight, color: 'var(--color-success)' },
                        { label: 'Commission Pending', value: fmtShort(financial.commission_pending), icon: Clock, color: 'var(--color-warning)' },
                        { label: 'Token Frozen', value: fmtShort(financial.token_money_frozen), icon: Ban, color: 'var(--color-error)' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 hover:shadow-[var(--shadow-sm)] transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${kpi.color} 10%, white)` }}>
                                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-[var(--gray-500)]">{kpi.label}</p>
                            <p className="text-xl font-bold text-[var(--gray-900)] mt-0.5">{kpi.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                2. DEAL PIPELINE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[var(--color-brand)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Deal Pipeline</h2>
                        <span className="text-xs text-[var(--gray-400)]">({totalDeals} total deals)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleExport('deals', 'csv')} disabled={exporting === 'deals'}
                            className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1">
                            {exporting === 'deals' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            CSV
                        </button>
                        <button onClick={() => handleExport('deals', 'json')} disabled={exporting === 'deals-json'}
                            className="text-xs text-[var(--gray-500)] hover:text-[var(--gray-700)]">JSON</button>
                    </div>
                </div>
                {pipeline.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--gray-400)]">No pipeline data</div>
                ) : (
                    <>
                        {/* Visual bar */}
                        <div className="px-5 pt-4 pb-2">
                            <div className="flex h-3 rounded-full overflow-hidden bg-[var(--gray-100)]">
                                {pipeline.map((item, i) => (
                                    <div key={item.status} className="transition-all"
                                        style={{ width: `${totalDeals > 0 ? (item.count / totalDeals * 100) : 0}%`, backgroundColor: pipelineColors[i % pipelineColors.length] }}
                                        title={`${item.status}: ${item.count}`} />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2">
                                {pipeline.map((item, i) => (
                                    <div key={item.status} className="flex items-center gap-1.5 text-[11px] text-[var(--gray-600)]">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pipelineColors[i % pipelineColors.length] }} />
                                        {item.status.replace(/_/g, ' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--gray-50)] border-y border-[var(--gray-100)]">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Count</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Avg Age</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--gray-100)]">
                                    {pipeline.map((item, i) => (
                                        <tr key={item.status} className="hover:bg-[var(--gray-50)] transition-colors">
                                            <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                                            <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--gray-900)]">{item.count}</td>
                                            <td className="px-5 py-3 text-right text-sm text-[var(--gray-600)]">{item.avg_age_days.toFixed(1)}d</td>
                                            <td className="px-5 py-3 w-40">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-[var(--gray-100)] rounded-full h-1.5">
                                                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${totalDeals > 0 ? (item.count / totalDeals * 100) : 0}%`, backgroundColor: pipelineColors[i % pipelineColors.length] }} />
                                                    </div>
                                                    <span className="text-[11px] text-[var(--gray-500)] w-8 text-right">{totalDeals > 0 ? Math.round(item.count / totalDeals * 100) : 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                3. STUCK DEALS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Stuck Deals</h2>
                        {stuckDeals.length > 0 && (
                            <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{stuckDeals.length}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {[7, 14, 30].map((d) => (
                            <button key={d} onClick={() => refreshStuck(d)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors ${stuckThreshold === d
                                    ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                                    : 'text-[var(--gray-500)] hover:bg-[var(--gray-50)]'}`}>
                                ≥{d}d
                            </button>
                        ))}
                    </div>
                </div>
                {stuckDeals.length === 0 ? (
                    <div className="py-12 text-center">
                        <AlertTriangle className="w-8 h-8 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm text-[var(--gray-400)]">No deals stuck beyond {stuckThreshold} days</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Property</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Days Stuck</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Buyer</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Seller</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {stuckDeals.map((deal) => (
                                    <tr key={deal.deal_id} className="hover:bg-[var(--gray-50)] transition-colors">
                                        <td className="px-5 py-3 text-sm font-medium text-[var(--gray-900)] max-w-[200px] truncate">{deal.property_title}</td>
                                        <td className="px-5 py-3"><StatusBadge status={deal.status} /></td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`text-sm font-bold ${deal.days_stuck > 14 ? 'text-[var(--color-error)]' : deal.days_stuck > 7 ? 'text-[var(--color-warning)]' : 'text-[var(--gray-700)]'}`}>
                                                {deal.days_stuck}d
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{deal.buyer_name}</td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{deal.seller_name}</td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{deal.agent_name || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Two-Column Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* ═══════════════════════════════════════════════════════════════
                    4. AGENT METRICS LEADERBOARD
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[var(--color-brand)]" />
                            <h2 className="text-sm font-bold text-[var(--gray-900)]">Agent Leaderboard</h2>
                        </div>
                        <button onClick={() => handleExport('agents')} disabled={exporting === 'agents'}
                            className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1">
                            {exporting === 'agents' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        </button>
                    </div>
                    {agents.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[var(--gray-400)]">No agent data</div>
                    ) : (
                        <div className="divide-y divide-[var(--gray-100)]">
                            {agents.slice(0, 10).map((agent, idx) => {
                                const completionRate = agent.deals_assigned > 0 ? Math.round(agent.deals_completed / agent.deals_assigned * 100) : 0;
                                return (
                                    <div key={agent.agent_id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--gray-50)] transition-colors">
                                        <span className="text-[11px] font-bold text-[var(--gray-400)] w-5 text-right">#{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--gray-900)] truncate">{agent.agent_name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[11px] text-[var(--gray-500)]">{agent.deals_completed}/{agent.deals_assigned} deals</span>
                                                <span className="text-[11px] text-[var(--gray-500)]">{completionRate}% completion</span>
                                                <span className={`text-[11px] font-medium ${agent.dispute_rate > 0.15 ? 'text-[var(--color-error)]' : 'text-[var(--gray-500)]'}`}>
                                                    {(agent.dispute_rate * 100).toFixed(1)}% disputes
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-[var(--color-brand)]">{fmtShort(agent.commission_earned)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    5. DISPUTE AGING BUCKETS
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--color-warning)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Dispute Aging</h2>
                    </div>
                    {disputeAging.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[var(--gray-400)]">No dispute aging data</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)]">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] text-center">&lt;7d</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] text-center">7-14d</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] text-center">14-30d</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] text-center">&gt;30d</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--gray-100)]">
                                    {disputeAging.map((bucket) => (
                                        <tr key={bucket.status} className="hover:bg-[var(--gray-50)]">
                                            <td className="px-5 py-2.5"><StatusBadge status={bucket.status} /></td>
                                            <td className="px-5 py-2.5 text-center text-sm text-[var(--gray-700)]">{bucket.under_7_days}</td>
                                            <td className="px-5 py-2.5 text-center text-sm text-[var(--gray-700)]">{bucket.days_7_14}</td>
                                            <td className="px-5 py-2.5 text-center text-sm font-medium text-[var(--color-warning)]">{bucket.days_14_30}</td>
                                            <td className="px-5 py-2.5 text-center text-sm font-bold text-[var(--color-error)]">{bucket.over_30_days}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                6. COMPLIANCE — Agreement Signing Delays + Disputed Deals
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Agreement Compliance */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--color-info)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Agreement Compliance</h2>
                    </div>
                    {compliance.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[var(--gray-400)]">All agreements on track</div>
                    ) : (
                        <div className="divide-y divide-[var(--gray-100)]">
                            {compliance.slice(0, 8).map((item: any, i: number) => (
                                <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--gray-50)] transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--gray-900)] truncate">{item.deal_id?.slice(0, 12) || `Deal #${i + 1}`}</p>
                                        <p className="text-[11px] text-[var(--gray-500)]">{item.pending_party || 'Awaiting signature'} • {item.days_waiting || 0}d waiting</p>
                                    </div>
                                    <span className={`text-xs font-semibold ${(item.days_waiting || 0) > 7 ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'}`}>
                                        {item.days_waiting || 0}d
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Disputed Deals */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Disputed Deals</h2>
                        {disputedDeals.length > 0 && (
                            <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full">{disputedDeals.length}</span>
                        )}
                    </div>
                    {disputedDeals.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[var(--gray-400)]">No active disputed deals</div>
                    ) : (
                        <div className="divide-y divide-[var(--gray-100)]">
                            {disputedDeals.slice(0, 8).map((deal) => (
                                <div key={deal.deal_id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--gray-50)] transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--gray-900)] truncate">{deal.property_title}</p>
                                        <p className="text-[11px] text-[var(--gray-500)]">
                                            {deal.dispute_category} • {deal.buyer_name} vs {deal.seller_name}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        {deal.dispute_amount > 0 && <p className="text-xs font-bold text-[var(--color-error)]">{fmtShort(deal.dispute_amount)}</p>}
                                        <p className="text-[11px] text-[var(--gray-400)]">{deal.age_days}d</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                7. CANCELLATION REPORT
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Cancellation Report</h2>
                    </div>
                    <button onClick={() => handleExport('cancellations')} disabled={exporting === 'cancellations'}
                        className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1">
                        {exporting === 'cancellations' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Export
                    </button>
                </div>
                {cancellations.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--gray-400)]">No cancellation data</div>
                ) : (
                    <div className="divide-y divide-[var(--gray-100)]">
                        {cancellations.map((item, i) => (
                            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--gray-50)] transition-colors">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--gray-900)]">{item.state.replace(/_/g, ' ')}</p>
                                    {item.reasons.length > 0 && (
                                        <p className="text-[11px] text-[var(--gray-500)] line-clamp-1 mt-0.5">{item.reasons.join(' • ')}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    <div className="w-16 bg-[var(--gray-100)] rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-[var(--color-error)]" style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-[var(--color-error)] w-6 text-right">{item.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                8. ADMIN ACTION LOG
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--gray-500)]" />
                    <h2 className="text-sm font-bold text-[var(--gray-900)]">Admin Action Log</h2>
                    <span className="text-xs text-[var(--gray-400)]">(last 20)</span>
                </div>
                {actionLog.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--gray-400)]">No recent admin actions</div>
                ) : (
                    <div className="p-5">
                        <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--gray-100)]">
                            {actionLog.map((item) => (
                                <div key={item.id} className="flex gap-3 relative">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 bg-white border border-[var(--gray-200)]">
                                        <Shield className="w-3.5 h-3.5 text-[var(--gray-500)]" />
                                    </div>
                                    <div className="pt-1 min-w-0">
                                        <p className="text-xs text-[var(--gray-900)]">
                                            <span className="font-semibold">{item.admin_name}</span>{' '}
                                            <span className="text-[var(--gray-600)]">{item.action.toLowerCase().replace(/_/g, ' ')}</span>
                                            {item.entity_type && <span className="text-[var(--gray-500)]"> on {item.entity_type}</span>}
                                        </p>
                                        {item.details && <p className="text-[11px] text-[var(--gray-400)] mt-0.5 line-clamp-1">{item.details}</p>}
                                        <p className="text-[11px] text-[var(--gray-400)] mt-0.5">
                                            {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
