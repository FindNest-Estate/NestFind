// Developer Portal TypeScript Types

export type ProjectType = 'APARTMENT' | 'PLOT_VENTURE' | 'VILLA_PROJECT' | 'GATED_COMMUNITY' | 'COMMERCIAL';
export type ProjectStatus = 'UPCOMING' | 'UNDER_CONSTRUCTION' | 'READY_TO_MOVE' | 'SOLD_OUT';
export type UnitStatus = 'AVAILABLE' | 'NEGOTIATION' | 'RESERVED' | 'BOOKED' | 'SOLD' | 'BLOCKED';
export type OfferStatus = 'PENDING' | 'UNDER_REVIEW' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'NEGOTIATION' | 'CLOSED';
export type DocumentType = 'RERA_CERTIFICATE' | 'DTCP_APPROVAL' | 'BUILDING_PLAN' | 'LEGAL_DOCUMENT' | 'BROCHURE' | 'OTHER';

export type DealStage =
  | 'DEAL_STARTED'
  | 'VISIT_SCHEDULED'
  | 'OFFER_SUBMITTED'
  | 'IN_NEGOTIATION'
  | 'PRICE_AGREED'
  | 'AWAITING_TOKEN'
  | 'TOKEN_PAID'
  | 'AGREEMENT_SIGNED'
  | 'AT_REGISTRATION'
  | 'COMPLETED'
  | 'COMMISSION_RELEASED'
  | 'CANCELLED';

export const DEAL_STAGES: DealStage[] = [
  'DEAL_STARTED',
  'VISIT_SCHEDULED',
  'OFFER_SUBMITTED',
  'IN_NEGOTIATION',
  'PRICE_AGREED',
  'AWAITING_TOKEN',
  'TOKEN_PAID',
  'AGREEMENT_SIGNED',
  'AT_REGISTRATION',
  'COMPLETED',
  'COMMISSION_RELEASED',
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  DEAL_STARTED: 'Deal Started',
  VISIT_SCHEDULED: 'Visit Scheduled',
  OFFER_SUBMITTED: 'Offer Submitted',
  IN_NEGOTIATION: 'In Negotiation',
  PRICE_AGREED: 'Price Agreed',
  AWAITING_TOKEN: 'Awaiting Token',
  TOKEN_PAID: 'Token Paid',
  AGREEMENT_SIGNED: 'Agreement Signed',
  AT_REGISTRATION: 'At Registration',
  COMPLETED: 'Completed',
  COMMISSION_RELEASED: 'Commission Released',
  CANCELLED: 'Cancelled',
};

export interface DevProject {
  id: string;
  developer_id: string;
  project_name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  location: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  total_land_area?: number;
  total_units: number;
  launch_date?: string;
  possession_date?: string;
  rera_number?: string;
  description?: string;
  amenities: string[];
  project_images: string[];
  brochure_pdf?: string;
  master_layout?: string;
  pricing_rules?: {
    base_price: number;
    floor_rise?: number;
    corner_plot_premium?: number;
    east_facing_premium?: number;
    west_facing_premium?: number;
    north_facing_premium?: number;
    south_facing_premium?: number;
    parking_charges?: number;
    amenity_charges?: number;
  };
  auction_settings?: {
    is_auction_mode: boolean;
    deadline_hours: number;
    min_bid_increment: number;
  };
  current_step?: number;
  created_at: string;
  updated_at: string;
  // Computed
  available_units?: number;
  sold_units?: number;
  booked_units?: number;
  negotiation_units?: number;
}

export interface DevUnit {
  id: string;
  project_id: string;
  project_name?: string;
  unit_number: string;
  unit_type: string;
  area_sqft?: number;
  price: number;
  facing?: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking: number;
  status: UnitStatus;
  // New spec fields
  corner_plot?: boolean;
  land_area?: number;
  built_up_area?: number;
  garden_area?: number;
  created_at: string;
  updated_at: string;
  active_offer_count?: number;
}

export interface OfferHistoryItem {
  id: string;
  action: string;
  actor_role: string;
  amount?: number;
  message?: string;
  created_at: string;
}

export interface DevOffer {
  id: string;
  unit_id: string;
  unit_number?: string;
  project_name?: string;
  buyer_id: string;
  buyer_name?: string;
  offer_price: number;
  counter_price?: number;
  status: OfferStatus;
  rejection_reason?: string;
  buyer_message?: string;
  seller_message?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  history?: OfferHistoryItem[];
}

export interface DealHistoryItem {
  id: string;
  from_stage?: DealStage;
  to_stage: DealStage;
  actor_id?: string;
  actor_role?: string;
  notes?: string;
  created_at: string;
}

export interface DevDeal {
  id: string;
  offer_id: string;
  unit_id: string;
  unit_number?: string;
  project_name?: string;
  buyer_id: string;
  buyer_name?: string;
  developer_id: string;
  agent_id?: string;
  agent_name?: string;
  final_price: number;
  token_amount?: number;
  commission_amount?: number;
  commission_released: boolean;
  deal_stage: DealStage;
  agreement_date?: string;
  registration_date?: string;
  token_deadline?: string;
  notes?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  history?: DealHistoryItem[];
}

export interface DevLead {
  id: string;
  developer_id: string;
  buyer_id?: string;
  project_id?: string;
  project_name?: string;
  unit_id?: string;
  unit_number?: string;
  name?: string;
  phone?: string;
  email?: string;
  source: string;
  lead_status: LeadStatus;
  visit_date?: string;
  visit_notes?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DevAgent {
  id: string;
  developer_id: string;
  agent_user_id?: string;
  name: string;
  phone?: string;
  email?: string;
  commission_percentage: number;
  is_active: boolean;
  is_external: boolean;
  created_at: string;
  deals_closed?: number;
  total_commission_earned?: number;
}

export interface DevDocument {
  id: string;
  developer_id: string;
  project_id?: string;
  project_name?: string;
  doc_type: DocumentType;
  doc_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface AnalyticsSummary {
  total_projects: number;
  total_units: number;
  available_units: number;
  negotiation_units: number;
  reserved_units: number;
  booked_units: number;
  sold_units: number;
  blocked_units: number;
  active_negotiations: number;
  total_leads: number;
  new_leads: number;
  total_deals: number;
  active_deals: number;
  completed_deals: number;
  revenue_generated: number;
  total_commission_paid: number;
}

export interface DeveloperProfile {
  id: string;
  user_id: string;
  company_name: string;
  developer_name: string;
  phone: string;
  office_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  rera_registration_number?: string;
  company_registration_number?: string;
  gst_number?: string;
  projects_handled_before?: number;
  years_of_experience?: number;
  about_company?: string;
  website?: string;
  support_phone?: string;
  support_email?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejection_reason?: string;
  logo_url?: string;
  settings?: DeveloperSettings;
  created_at: string;
}

export interface DeveloperSettings {
  token_deadline_hours: number;
  min_offer_percentage: number;
  auto_reject_low_offers: boolean;
  allow_multiple_negotiations: boolean;
  default_agent_commission_pct: number;
  allow_external_agents: boolean;
  notify_new_lead: boolean;
  notify_new_offer: boolean;
  notify_offer_accepted: boolean;
  notify_token_deadline: boolean;
  notify_deal_stage_change: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}


// ---------------------------------------------------------------------------
// VISUALIZATION ENGINE TYPES
// ---------------------------------------------------------------------------

export interface DevBuilding {
  id: string;
  project_id: string;
  building_name: string;
  building_code?: string;
  position_x: number;
  position_y: number;
  total_floors: number;
  units_per_floor: number;
  ground_floor_label?: string;
  facing?: string;
  model_url?: string;
  facade_image?: string;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Computed
  available_units?: number;
  sold_units?: number;
  total_units?: number;
  // Nested
  floors?: DevFloor[];
}

export interface DevFloor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_label?: string;
  layout_image?: string;
  total_units: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  units?: DevUnit[];
}

export interface LayoutPolygon {
  id: string;
  project_id: string;
  polygon_type: 'PLOT' | 'ROAD' | 'PARK' | 'AMENITY' | 'BOUNDARY' | 'BUILDING_FOOTPRINT' | 'CLUBHOUSE' | 'PARKING' | 'WATER_BODY' | 'OTHER';
  label?: string;
  layer_name?: string;
  coordinates: number[][];
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
  area_sqft?: number;
  area_label?: string;
  linked_unit_id?: string;
  linked_building_id?: string;
  z_order: number;
  metadata?: Record<string, any>;
  // Joined data
  unit_status?: UnitStatus;
  unit_number?: string;
  unit_price?: number;
  building_name?: string;
  created_at: string;
}

export interface DevAmenity {
  id: string;
  project_id: string;
  amenity_type: string;
  name: string;
  description?: string;
  position_x?: number;
  position_y?: number;
  polygon_id?: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface DevRoad {
  id: string;
  project_id: string;
  road_name?: string;
  road_type: string;
  path_points: number[][];
  width: number;
  polygon_id?: string;
  style?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface MasterPlanData {
  project: {
    id: string;
    name: string;
    type: string;
    status: string;
    location: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    total_units: number;
    description?: string;
    rera_number?: string;
  };
  viewport: {
    width: number;
    height: number;
    background_color?: string;
  };
  polygons: LayoutPolygon[];
  buildings: DevBuilding[];
  amenities: DevAmenity[];
  roads: DevRoad[];
  units_summary: {
    available: number;
    reserved: number;
    sold: number;
    negotiation?: number;
    total: number;
  };
  master_plan_image?: string;
  master_plan_svg?: string;
}

export interface PublicProject {
  id: string;
  project_name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  location: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  total_land_area?: number;
  total_units: number;
  description?: string;
  project_images?: string[];
  master_layout?: string;
  visualization_enabled: boolean;
  launch_date?: string;
  possession_date?: string;
  rera_number?: string;
  developer_name?: string;
  developer_logo?: string;
  available_units?: number;
  building_count?: number;
}

// Status colors for the visualization
export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  AVAILABLE: '#22c55e',
  NEGOTIATION: '#f59e0b',
  RESERVED: '#eab308',
  BOOKED: '#ef4444',
  SOLD: '#dc2626',
  BLOCKED: '#6b7280',
};

export const POLYGON_TYPE_COLORS: Record<string, string> = {
  PLOT: '#e2e8f0',
  ROAD: '#94a3b8',
  PARK: '#a7f3d0',
  AMENITY: '#bfdbfe',
  BOUNDARY: '#d1d5db',
  BUILDING_FOOTPRINT: '#c7d2fe',
  CLUBHOUSE: '#ddd6fe',
  PARKING: '#e2e8f0',
  WATER_BODY: '#bae6fd',
  OTHER: '#f1f5f9',
};

