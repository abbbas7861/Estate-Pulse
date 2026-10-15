export type PageView =
  | 'dashboard'
  | 'leads'
  | 'properties'
  | 'team'
  | 'analytics'
  | 'billing'
  | 'landing'
  | 'terms'
  | 'privacy';

export type LeadStage = 'assigned' | 'awareness' | 'contacted' | 'touring' | 'negotiation' | string;

export interface LeadStageItem {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  color?: string;
  org_id?: string | null;
}

export interface Broker {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string;
  email: string;
  phone: string;
  dealsClosed: number;
  volumeClosed: string;
  targetPct: number;
  activeListings: number;
  responseTime: string;
}

export interface Lead {
  id: string;
  orgId?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  timeAgo: string;
  stage: LeadStage;
  stageId?: string;
  targetProperty: string;
  targetPropertyId?: string;
  budgetLabel: string;
  budgetAmount: number;
  budgetFormatted: string;
  brokerId: string | null;
  brokerName: string;
  brokerInitials: string;
  brokerAvatarUrl?: string;
  note?: string;
  noteType?: 'info' | 'tour' | 'offer';
  isHighValue: boolean;
  isDirectInbound: boolean;
  tags?: string[];
  assignedTo?: string | null;
  lastActivityAt?: string;
  daysSinceLastActivity?: number;
  isDuplicate?: boolean;
}

export interface Activity {
  id: string;
  org_id: string;
  lead_id: string;
  user_id?: string | null;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change';
  title: string;
  description?: string;
  created_at: string;
  user_name?: string;
}

export interface TaskMeeting {
  id: string;
  org_id: string;
  lead_id?: string | null;
  assigned_to?: string | null;
  title: string;
  due_date: string;
  status: 'pending' | 'completed';
  type?: 'call' | 'meeting' | 'follow_up';
  created_at?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
}

export type PropertyStatus =
  | 'Active Listing'
  | 'Pending Escrow'
  | 'Price Improvement'
  | 'Under Offer'
  | 'Coming Soon';

export type PropertyType =
  | 'Residential'
  | 'Commercial'
  | 'Plot'
  | 'Shop'
  | 'Building'
  | 'Penthouse'
  | 'Villa / Craftsman'
  | string;

export interface PropertyAmenity {
  id?: string;
  property_id?: string;
  group_name: string;
  sub_group_name: string;
}

export interface Property {
  id: string;
  orgId?: string;
  mlsId: string;
  title: string;
  location?: string;
  address: string;
  city: string;
  price: number;
  priceFormatted: string;
  previousPriceFormatted?: string;
  status: PropertyStatus;
  type: PropertyType;
  beds: number;
  baths: number;
  sqft: number;
  sqftFormatted: string;
  highlightLabel: string;
  highlightValue: string;
  imageUrl: string;
  images?: string[];
  amenities?: PropertyAmenity[];
  brokerName: string;
  brokerInitials: string;
  brokerAvatarUrl?: string;
  views: number;
  inquiries: number;
  showingsCount?: number;
  isFavorite?: boolean;
  description?: string;
}

export interface PropertyMatch {
  property_id: string;
  score: number;
  match_reasons: string[];
  title: string;
  mls_id: string;
  price: number;
  price_formatted: string;
  address: string;
  type: string;
  beds: number;
  baths: number;
  sqft: number;
  image_url: string;
}

export interface FeedActivity {
  id: string;
  type: 'escrow' | 'counter' | 'showing' | 'new_lead';
  title: string;
  propertyTitle: string;
  amountFormatted: string;
  timestamp: string;
  brokerName: string;
}

// ─── Step 5 Analytics & Team Performance Types ─────────────────────────────

export type AnalyticsDateRange = '30d' | 'qtd' | 'ytd';

export interface LeadFunnelStage {
  stage: string;
  order: number;
  count: number;
  conversionPct: number; // percentage from previous stage or total
  pipelineValue: number;
  pipelineValueFormatted: string;
}

export interface EmployeeSummaryItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
  initials: string;
  totalLeads: number;
  assigned: number;
  won: number;
  lost: number;
  conversionPct: number;
  avgResponseTime: string;
  pipelineValue: number;
  pipelineValueFormatted: string;
  dealsClosed: number;
  monthlyTargetPct: number;
  quotaTarget: number;
}

export interface StageWiseDistribution {
  agentName: string;
  agentId: string;
  stages: Record<string, number>;
  total: number;
}

export interface DealSizeSummaryItem {
  bucket: string;
  order: number;
  count: number;
  percentage: number;
  totalValue: number;
  totalValueFormatted: string;
}

export interface ProductSummaryItem {
  type: string;
  count: number;
  percentage: number;
  totalValue: number;
  totalValueFormatted: string;
  color: string;
}

export interface MonthlyTrendItem {
  month: string; // e.g. "Nov 2025" or "Nov"
  monthShort: string;
  leadsCreated: number;
  closedWon: number;
  closedLost: number;
  wonVolume: number;
  wonVolumeFormatted: string;
}

