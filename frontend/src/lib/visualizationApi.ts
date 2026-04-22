/**
 * Public Visualization API Client
 * Wraps all /explore/* endpoints for the project viewer.
 * These are unauthenticated, public endpoints.
 */

import type {
  MasterPlanData, PublicProject, DevBuilding, DevUnit, PaginatedResponse
} from '@/types/developer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// PUBLIC PROJECT EXPLORER
// ---------------------------------------------------------------------------

export const exploreApi = {
  /** List projects with visualization enabled */
  listProjects: (params?: { city?: string; project_type?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    );
    return fetchPublic<PaginatedResponse<PublicProject>>(`/explore/projects?${qs}`);
  },

  /** Get complete master plan data for a project */
  getMasterPlan: (projectId: string) =>
    fetchPublic<{ success: boolean; data: MasterPlanData }>(`/explore/projects/${projectId}/master-plan`),

  /** Get building detail with floors and units */
  getBuildingDetail: (projectId: string, buildingId: string) =>
    fetchPublic<{ success: boolean; data: DevBuilding }>(`/explore/projects/${projectId}/building/${buildingId}`),

  /** Get unit detail */
  getUnitDetail: (projectId: string, unitId: string) =>
    fetchPublic<{ success: boolean; data: DevUnit }>(`/explore/projects/${projectId}/unit/${unitId}`),
};
