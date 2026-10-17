/**
 * PropertyListingPage.tsx – Step 4 MLS Property Inventory & Directory.
 * Features Grid & List views, dynamic Type/Price/Location filters, loading skeletons,
 * CSV export, and integrated PropertyDetailModal, PropertyFormModal, and LeadPickerModal.
 */
import React, { useState } from 'react';
import {
  ArrowDown,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Gauge,
  LayoutGrid,
  List,
  Plus,
  Search,
  TrendingUp,
  X,
  Sparkles,
} from 'lucide-react';
import { Property, PropertyStatus, PropertyType, Lead } from '../../types/crm';
import { PropertyListingCard } from '../Cards/PropertyListingCard';
import { PropertyDetailModal } from '../Modals/PropertyDetailModal';
import { PropertyFormModal } from '../Modals/PropertyFormModal';
import { LeadPickerModal } from '../Modals/LeadPickerModal';
import { supabase } from '../../lib/supabaseClient';
import { formatMoney, useCurrency } from '../../config/regional';

interface PropertyListingPageProps {
  properties: Property[];
  loading?: boolean;
  globalSearch?: string;
  leads?: Lead[];
  orgId?: string | null;
  onToggleFavorite: (id: string) => void;
  onOpenAddProperty?: () => void;
  onCreateProperty?: (data: Partial<Property>) => Promise<{ data: Property | null; error: Error | null }>;
  onUpdateProperty?: (id: string, data: Partial<Property>) => Promise<{ error: Error | null }>;
  onDeleteProperty?: (id: string) => Promise<{ error: Error | null }>;
  onManageListing?: (property: Property) => void;
  onShareListing: (property: Property) => void;
  onEditListing?: (property: Property) => void;
  onExportInventory: () => void;
  onNotify: (msg: string) => void;
  onRefreshLeads?: () => void | Promise<void>;
}

export const PropertyListingPage: React.FC<PropertyListingPageProps> = ({
  properties,
  loading = false,
  globalSearch = '',
  leads = [],
  orgId,
  onToggleFavorite,
  onOpenAddProperty,
  onCreateProperty,
  onUpdateProperty,
  onShareListing,
  onExportInventory,
  onNotify,
  onRefreshLeads,
}) => {
  const [currency] = useCurrency();
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('any');
  const [bedsFilter, setBedsFilter] = useState('any');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [detailModalProperty, setDetailModalProperty] = useState<Property | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [leadPickerProperty, setLeadPickerProperty] = useState<Property | null>(null);
  const [assigningLeadLoading, setAssigningLeadLoading] = useState(false);

  const combinedSearch = (localSearch || globalSearch).trim().toLowerCase();

  // Filter listings
  const filteredProperties = properties.filter((prop) => {
    const loc = prop.location || prop.address || '';
    const matchesQuery =
      !combinedSearch ||
      prop.title.toLowerCase().includes(combinedSearch) ||
      loc.toLowerCase().includes(combinedSearch) ||
      (prop.city && prop.city.toLowerCase().includes(combinedSearch)) ||
      prop.mlsId.toLowerCase().includes(combinedSearch) ||
      (prop.type && prop.type.toLowerCase().includes(combinedSearch)) ||
      prop.brokerName.toLowerCase().includes(combinedSearch);

    if (!matchesQuery) return false;

    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && prop.status !== 'Active Listing') return false;
      if (statusFilter === 'pending' && prop.status !== 'Pending Escrow') return false;
      if (statusFilter === 'offer' && prop.status !== 'Under Offer') return false;
      if (statusFilter === 'price' && prop.status !== 'Price Improvement') return false;
      if (statusFilter === 'soon' && prop.status !== 'Coming Soon') return false;
    }

    if (typeFilter !== 'all' && prop.type.toLowerCase() !== typeFilter.toLowerCase()) return false;

    if (priceFilter !== 'any') {
      if (priceFilter === 'under2m' && prop.price >= 2000000) return false;
      if (priceFilter === '2to4m' && (prop.price < 2000000 || prop.price > 4000000))
        return false;
      if (priceFilter === 'over4m' && prop.price <= 4000000) return false;
    }

    if (bedsFilter !== 'any') {
      const minBeds = parseInt(bedsFilter, 10);
      if ((prop.beds || 0) < minBeds) return false;
    }

    return true;
  });

  const resetAllFilters = () => {
    setLocalSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriceFilter('any');
    setBedsFilter('any');
    setCurrentPage(1);
  };

  // Direct CSV Export utility
  const handleExportCsv = () => {
    const headers = ['MLS ID', 'Title', 'Location', 'City', 'Price', 'Status', 'Type', 'Beds', 'Baths', 'Sqft'];
    const rows = filteredProperties.map((p) => [
      p.mlsId,
      p.title,
      p.location || p.address || '',
      p.city || 'Beverly Hills',
      p.priceFormatted,
      p.status,
      p.type,
      String(p.beds || '—'),
      String(p.baths || '—'),
      p.sqftFormatted || '—',
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'estatepulse-mls-inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onNotify('Exported MLS Inventory CSV (estatepulse-mls-inventory.csv).');
  };

  // Handle open modals
  const handleCardClick = (property: Property) => {
    setDetailModalProperty(property);
  };

  const handleEditClick = (property: Property) => {
    setEditingProperty(property);
    setFormModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingProperty(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<Property>) => {
    if (editingProperty) {
      if (onUpdateProperty) {
        const { error } = await onUpdateProperty(editingProperty.id, data);
        if (error) {
          onNotify(`Failed to update listing: ${error.message}`);
        } else {
          onNotify(`Updated listing "${data.title || editingProperty.title}".`);
        }
      }
    } else {
      if (onCreateProperty) {
        const { data: created, error } = await onCreateProperty(data);
        if (error) {
          onNotify(`Failed to add listing: ${error.message}`);
        } else {
          onNotify(`Property added: "${created?.title || data.title}"`);
        }
      }
    }
  };

  // Wire Dead Actions – Assign Listing to Lead workflow with Supabase mutation
  const executeAssignLead = async (prop: Property, selectedLeadId: string) => {
    setAssigningLeadLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          target_property: prop.title,
          target_property_id: prop.id,
        })
        .eq('id', selectedLeadId);

      if (error) {
        onNotify(`Failed to assign property: ${error.message}`);
      } else {
        const targetLead = leads.find((l) => l.id === selectedLeadId);
        onNotify(`Assigned "${prop.title}" to ${targetLead?.name || 'lead'}`);
        setLeadPickerProperty(null);
        if (onRefreshLeads) {
          await onRefreshLeads();
        }
      }
    } catch (err: any) {
      onNotify(`Failed to assign property: ${err.message || 'Unknown error'}`);
    } finally {
      setAssigningLeadLoading(false);
    }
  };

  const handleAssignToLead = async (prop: Property, leadId?: string) => {
    if (leadId) {
      await executeAssignLead(prop, leadId);
    } else {
      setDetailModalProperty(null);
      setLeadPickerProperty(prop);
    }
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Top 4 KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Active Portfolio</span>
            <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
              <span className="font-display font-bold text-[28px] text-[#0b1c30] leading-tight">
                {properties.length}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Live
              </span>
            </div>
            <span className="text-[11px] text-[#6e7a73] mt-1 tabular-nums">
              {formatMoney(properties.reduce((s, p) => s + (p.price || 0), 0), { compact: true })} aggregate volume
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Pending Escrow</span>
            <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
              <span className="font-display font-bold text-[28px] text-[#0b1c30] leading-tight">
                {properties.filter((p) => p.status === 'Pending Escrow').length}
              </span>
              <span className="text-[11px] font-semibold text-[#006a63] flex items-center gap-0.5">
                <Clock className="w-3.5 h-3.5" />
                In Closing
              </span>
            </div>
            <span className="text-[11px] text-[#6e7a73] mt-1 tabular-nums">
              {formatMoney(properties.filter((p) => p.status === 'Pending Escrow').reduce((s, p) => s + p.price, 0), { compact: true })} under contract
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#99efe5]/50 flex items-center justify-center text-[#006a63]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">High-Tier Villas</span>
            <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
              <span className="font-display font-bold text-[28px] text-[#0b1c30] leading-tight">
                {properties.filter((p) => p.price >= 3000000).length}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                &gt;$3M
              </span>
            </div>
            <span className="text-[11px] text-[#6e7a73] mt-1">Luxury tier assets</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">MLS Gateway</span>
            <div className="flex items-baseline gap-1.5 mt-0.5 tabular-nums">
              <span className="font-display font-bold text-[28px] text-[#005d42] leading-tight">
                100%
              </span>
            </div>
            <span className="text-[11px] text-[#6e7a73] mt-1">Supabase Storage Sync</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#047857]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Page Header & Actions */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] mb-1">
            <span className="font-semibold text-[#005d42] tracking-wide">ASSET DIRECTORY</span>
            <span className="text-[#bdc9c1]" aria-hidden="true">
              ·
            </span>
            <span className="text-[#3e4943]">Beverly Hills &amp; Greater LA</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#0b1c30] tracking-tight leading-tight">
            Property Inventory &amp; Listings
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Manage active, pending, and sold real estate inventory with Supabase Storage and Auto-Mapper.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-10 px-4 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 flex items-center gap-2 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Download className="w-4 h-4 text-[#6e7a73]" />
            <span>Export MLS Inventory</span>
          </button>

          <button
            type="button"
            onClick={handleAddClick}
            className="h-10 px-4 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-1.5 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Property</span>
          </button>
        </div>
      </section>

      {/* Filter Control Bar */}
      <section className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-xs">
        {/* Search Input */}
        <div className="flex-1 min-w-[240px] flex items-center gap-2.5 bg-[#eff4ff] px-3.5 py-2 rounded-lg">
          <Search className="w-4 h-4 text-[#6e7a73] shrink-0" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by address, location, MLS ID, or property title..."
            className="w-full bg-transparent border-0 outline-none text-[#0b1c30] placeholder:text-[#6e7a73] text-[13px]"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="text-[#6e7a73] hover:text-[#0b1c30]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Select Filters & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] pl-3.5 pr-8 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Active Listing</option>
              <option value="pending">Pending Escrow</option>
              <option value="price">Price Improvement</option>
              <option value="offer">Under Offer</option>
              <option value="soon">Coming Soon</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6e7a73] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Property Type Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] pl-3.5 pr-8 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="all">Type: All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Plot">Plot</option>
              <option value="Shop">Shop</option>
              <option value="Building">Building</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Villa / Craftsman">Villa / Craftsman</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6e7a73] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Price Range Dropdown */}
          <div className="relative">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="appearance-none bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] pl-3.5 pr-8 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="any">Price Range: Any</option>
              <option value="under2m">&lt; {formatMoney(2000000, { compact: true })}</option>
              <option value="2to4m">{formatMoney(2000000, { compact: true })} - {formatMoney(4000000, { compact: true })}</option>
              <option value="over4m">&gt; {formatMoney(4000000, { compact: true })}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6e7a73] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Bedrooms Dropdown */}
          <div className="relative">
            <select
              value={bedsFilter}
              onChange={(e) => setBedsFilter(e.target.value)}
              className="appearance-none bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] pl-3.5 pr-8 py-2 rounded-lg text-[12px] font-medium outline-none cursor-pointer"
            >
              <option value="any">Bedrooms: Any</option>
              <option value="2">2+ Beds</option>
              <option value="3">3+ Beds</option>
              <option value="4">4+ Beds</option>
              <option value="5">5+ Beds</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#6e7a73] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid / List View Switcher */}
          <div className="bg-[#eff4ff] p-1 rounded-lg flex items-center ml-auto xl:ml-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Card / Grid View"
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#005d42] shadow-xs'
                  : 'text-[#6e7a73] hover:text-[#0b1c30]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#005d42] shadow-xs'
                  : 'text-[#6e7a73] hover:text-[#0b1c30]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Loading Skeletons */}
      {loading ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 animate-pulse">
              <div className="w-full h-48 bg-slate-200 rounded-xl" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-6 bg-slate-200 rounded w-1/3 mt-2" />
            </div>
          ))}
        </section>
      ) : filteredProperties.length > 0 ? (
        /* Property Cards Grid / List */
        <section
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {filteredProperties.map((property) => (
            <PropertyListingCard
              key={property.id}
              property={property}
              viewMode={viewMode}
              onToggleFavorite={onToggleFavorite}
              onManageListing={handleCardClick}
              onShareListing={onShareListing}
              onEditListing={handleEditClick}
            />
          ))}
        </section>
      ) : (
        /* Empty State */
        <section className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-xl text-[#0b1c30]">
            No properties yet. Add your first listing.
          </h2>
          <p className="text-[13px] text-[#3e4943] mt-1 max-w-md">
            Publish listings to your brokerage database to activate MLS search, gallery presentations,
            and lead auto-matching.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[#3e4943] text-[13px] font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={handleAddClick}
              className="px-5 py-2 rounded-xl bg-[#005d42] text-white text-[13px] font-semibold hover:bg-[#004d37] transition-colors cursor-pointer shadow-xs"
            >
              + Add First Listing
            </button>
          </div>
        </section>
      )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={detailModalProperty}
        isOpen={!!detailModalProperty}
        leads={leads}
        onClose={() => setDetailModalProperty(null)}
        onEdit={(prop) => {
          setDetailModalProperty(null);
          handleEditClick(prop);
        }}
        onAssignToLead={handleAssignToLead}
        onNotify={onNotify}
      />

      {/* Property Add / Edit Form Modal */}
      <PropertyFormModal
        isOpen={formModalOpen}
        property={editingProperty}
        orgId={orgId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProperty(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Lead Picker Modal (Direct Assign listing to an unassigned Lead) */}
      <LeadPickerModal
        isOpen={!!leadPickerProperty}
        property={leadPickerProperty}
        leads={leads}
        loading={assigningLeadLoading}
        onClose={() => setLeadPickerProperty(null)}
        onSelectLead={async (selectedLeadId) => {
          if (leadPickerProperty) {
            await executeAssignLead(leadPickerProperty, selectedLeadId);
          }
        }}
      />
    </div>
  );
};
