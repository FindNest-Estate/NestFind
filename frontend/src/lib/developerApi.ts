/**
 * Developer Portal API Client
 * Wraps all /developer/* endpoints using the existing apiClient.
 */

import { apiClient, get, post, put, del } from '@/lib/api';
import type {
  DevProject, DevUnit, DevOffer, DevDeal, DevLead, DevAgent,
  DevDocument, AnalyticsSummary, DeveloperProfile, DeveloperSettings,
  PaginatedResponse,
} from '@/types/developer';

const BASE = '/developer';

// ---------------------------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------------------------

export const projectsApi = {
  list: (params?: { status?: string; project_type?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevProject>>(`${BASE}/projects?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  get: (id: string) => get<{ success: boolean; data: DevProject }>(`${BASE}/projects/${id}`),

  create: (data: Partial<DevProject>) =>
    post<{ success: boolean; data: DevProject }>(`${BASE}/projects`, data),

  update: (id: string, data: Partial<DevProject>) =>
    put<{ success: boolean; data: DevProject }>(`${BASE}/projects/${id}`, data),

  delete: (id: string) => del(`${BASE}/projects/${id}`),

  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient(`${BASE}/projects/${id}/images`, {
      method: 'POST',
      body: form,
      headers: {}, // Let browser set Content-Type with boundary
    });
  },
};

// ---------------------------------------------------------------------------
// UNITS
// ---------------------------------------------------------------------------

export const unitsApi = {
  list: (params?: { project_id?: string; status?: string; unit_type?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevUnit>>(`${BASE}/units?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  get: (id: string) => get<{ success: boolean; data: DevUnit }>(`${BASE}/units/${id}`),

  create: (data: Partial<DevUnit>) =>
    post<{ success: boolean; data: DevUnit }>(`${BASE}/units`, data),

  update: (id: string, data: Partial<DevUnit>) =>
    put<{ success: boolean; data: DevUnit }>(`${BASE}/units/${id}`, data),

  delete: (id: string) => del(`${BASE}/units/${id}`),

  bulkUpload: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient(`${BASE}/units/bulk-upload?project_id=${projectId}`, {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  getSampleCsv: () =>
    apiClient(`${BASE}/units/bulk-upload/sample`, { method: 'GET' }),

  submitOffer: (unitId: string, data: { offer_price: number; buyer_message?: string; expiry_hours?: number }) =>
    post(`${BASE}/units/${unitId}/offers`, data),
};

// ---------------------------------------------------------------------------
// OFFERS
// ---------------------------------------------------------------------------

export const offersApi = {
  list: (params?: { unit_id?: string; status?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevOffer>>(`${BASE}/offers?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  get: (id: string) => get<{ success: boolean; data: DevOffer }>(`${BASE}/offers/${id}`),

  accept: (id: string) => post(`${BASE}/offers/${id}/accept`),
  reject: (id: string, rejection_reason?: string) => post(`${BASE}/offers/${id}/reject`, { rejection_reason }),
  counter: (id: string, data: { counter_price: number; seller_message?: string; expiry_hours?: number }) =>
    post(`${BASE}/offers/${id}/counter`, data),
  acceptCounter: (id: string) => post(`${BASE}/offers/${id}/accept-counter`),
  rejectCounter: (id: string, rejection_reason?: string) => post(`${BASE}/offers/${id}/reject-counter`, { rejection_reason }),
};

// ---------------------------------------------------------------------------
// DEALS
// ---------------------------------------------------------------------------

export const dealsApi = {
  list: (params?: { stage?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevDeal>>(`${BASE}/deals?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  getPipelineCounts: () => get<{ success: boolean; data: Record<string, number> }>(`${BASE}/deals/pipeline`),

  get: (id: string) => get<{ success: boolean; data: DevDeal }>(`${BASE}/deals/${id}`),

  updateStage: (
    id: string,
    data: { deal_stage: string; notes?: string; token_amount?: number; agreement_date?: string; registration_date?: string }
  ) => put(`${BASE}/deals/${id}/stage`, data),

  assignAgent: (id: string, agent_id: string, commission_amount?: number) =>
    post(`${BASE}/deals/${id}/assign-agent`, { agent_id, commission_amount }),
};

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

export const leadsApi = {
  list: (params?: { project_id?: string; status?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevLead>>(`${BASE}/leads?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  create: (data: { project_id?: string; unit_id?: string; name?: string; phone?: string; email?: string; source?: string }) =>
    post(`${BASE}/leads`, data),

  update: (id: string, data: { lead_status?: string; visit_date?: string; visit_notes?: string; assigned_agent_id?: string }) =>
    put(`${BASE}/leads/${id}`, data),
};

// ---------------------------------------------------------------------------
// AGENTS
// ---------------------------------------------------------------------------

export const agentsApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevAgent>>(`${BASE}/agents?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  create: (data: { name: string; phone?: string; email?: string; commission_percentage?: number; is_external?: boolean }) =>
    post(`${BASE}/agents`, data),

  update: (id: string, data: Partial<DevAgent>) => put(`${BASE}/agents/${id}`, data),

  remove: (id: string) => del(`${BASE}/agents/${id}`),
};

// ---------------------------------------------------------------------------
// DOCUMENTS
// ---------------------------------------------------------------------------

export const documentsApi = {
  list: (params?: { project_id?: string; doc_type?: string; page?: number; per_page?: number }) =>
    get<PaginatedResponse<DevDocument>>(`${BASE}/documents?${new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )}`),

  upload: (file: File, doc_type: string, doc_name: string, project_id?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', doc_type);
    form.append('doc_name', doc_name);
    if (project_id) form.append('project_id', project_id);
    return apiClient(`${BASE}/documents`, { method: 'POST', body: form, headers: {} });
  },

  delete: (id: string) => del(`${BASE}/documents/${id}`),
};

// ---------------------------------------------------------------------------
// ANALYTICS
// ---------------------------------------------------------------------------

export const analyticsApi = {
  getSummary: () => get<{ success: boolean; data: AnalyticsSummary }>(`${BASE}/analytics/summary`),
  getLeadsPerProject: () => get<{ success: boolean; data: any[] }>(`${BASE}/analytics/leads-per-project`),
  getOffersPerUnit: () => get<{ success: boolean; data: any[] }>(`${BASE}/analytics/offers-per-unit`),
  getConversionRate: () => get<{ success: boolean; data: any[] }>(`${BASE}/analytics/conversion-rate`),
  getRevenueTimeline: (months?: number) =>
    get<{ success: boolean; data: any[] }>(`${BASE}/analytics/revenue-timeline${months ? `?months=${months}` : ''}`),
};

// ---------------------------------------------------------------------------
// LAYOUT MAPPING
// ---------------------------------------------------------------------------

export const layoutApi = {
  saveMappings: (projectId: string, mappings: any[]) =>
    post<{ success: boolean; data: any }>(`${BASE}/layout/${projectId}/mappings`, mappings),

  getInventory: (projectId: string) =>
    get<{ success: boolean; data: any[] }>(`${BASE}/layout/${projectId}/inventory`),

  deleteMapping: (mappingId: string) =>
    del(`${BASE}/layout/mappings/${mappingId}`),
};

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------

export const settingsApi = {
  get: () => get<{ success: boolean; data: DeveloperProfile }>(`${BASE}/settings`),
  updateDeal: (data: Partial<DeveloperSettings>) => put(`${BASE}/settings/deal`, data),
  updateCompany: (data: Partial<DeveloperProfile>) =>
    put(`${BASE}/settings/company`, data),
};

// ---------------------------------------------------------------------------
// REGISTRATION
// ---------------------------------------------------------------------------

export const devRegistrationApi = {
  register: (data: {
    company_name: string; developer_name: string; phone: string; email: string; password: string;
    office_address?: string; city?: string; state?: string; pincode?: string;
    rera_registration_number?: string; company_registration_number?: string; gst_number?: string;
    projects_handled_before?: number; years_of_experience?: number; about_company?: string;
  }) => post('/developer/register', data),

  getStatus: () => get('/developer/register/status'),
};

export const developerApi = {
  get: (path: string) => fetchWithAuth(path, { method: 'GET' }),
  post: (path: string, body: any) => fetchWithAuth(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => fetchWithAuth(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => fetchWithAuth(path, { method: 'DELETE' })
};
