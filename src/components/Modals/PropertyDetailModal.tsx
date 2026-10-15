/**
 * PropertyDetailModal.tsx – Full Property Details Modal.
 * Features image gallery preview, grouped amenities, and "Assign to Lead" direct workflow.
 */
import React, { useState } from 'react';
import {
  X,
  MapPin,
  DollarSign,
  Maximize2,
  Bed,
  Bath,
  Share2,
  Edit3,
  Calendar,
  Sparkles,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Building,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import { Property, PropertyStatus, Lead } from '../../types/crm';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  leads?: Lead[];
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onUpdateStatus?: (propertyId: string, newStatus: PropertyStatus) => void;
  onAssignToLead?: (property: Property, leadId: string) => void;
  onNotify: (msg: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  leads = [],
  onClose,
  onEdit,
  onUpdateStatus,
  onAssignToLead,
  onNotify,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [assigningLead, setAssigningLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  if (!isOpen || !property) return null;

  const images = property.images && property.images.length > 0
    ? property.images
    : [property.imageUrl];

  const currentImage = images[activeImageIdx] || property.imageUrl;

  // Group amenities by group_name
  const groupedAmenities = (property.amenities || []).reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.group_name]) {
      acc[item.group_name] = [];
    }
    acc[item.group_name].push(item.sub_group_name);
    return acc;
  }, {});

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    const targetLead = leads.find((l) => l.id === selectedLeadId);
    if (onAssignToLead) {
      onAssignToLead(property, selectedLeadId);
    }
    onNotify(`Assigned "${property.title}" to ${targetLead?.name || 'Lead'}.`);
    setAssigningLead(false);
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-[#006f67] bg-[#99efe5]/60 px-2.5 py-1 rounded-md">
              {property.mlsId}
            </span>
            <span className="text-xs font-semibold text-slate-500">•</span>
            <span className="text-xs font-semibold text-slate-700 truncate">{property.type}</span>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(property);
                }}
                className="p-2 rounded-xl text-slate-600 hover:bg-[#eff4ff] hover:text-[#005d42] transition-colors"
                title="Edit listing details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="max-h-[80vh] overflow-y-auto p-6 flex flex-col gap-6">
          {/* Main Photo Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden aspect-16/9 bg-slate-900 group shadow-md">
              <img
                src={currentImage}
                alt={property.title}
                className="w-full h-full object-cover"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1 rounded-full font-medium">
                {activeImageIdx + 1} / {images.length}
              </div>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(property);
                  }}
                  className="absolute bottom-3 right-3 bg-black/65 hover:bg-[#005d42] backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#97f5cc]" />
                  <span>Upload / Manage Photos</span>
                </button>
              )}
            </div>

            {/* Gallery Thumbnails Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIdx === idx ? 'border-[#005d42] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Pricing Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h1 className="font-display font-bold text-2xl text-[#0b1c30]">
                {property.title}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-[#005d42]" />
                {property.address}, {property.city}
              </p>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="font-mono font-bold text-3xl text-[#005d42] tabular-nums">
                {property.priceFormatted}
              </span>
              <span className="text-xs font-semibold text-slate-400 mt-0.5">
                Escrow valuation: ${(property.price / (property.sqft || 1)).toFixed(0)}/sqft
              </span>
            </div>
          </div>

          {/* Key Specs Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e5eeff] text-[#005d42] flex items-center justify-center shrink-0">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Bedrooms</span>
                <span className="text-sm font-bold text-[#0b1c30]">{property.beds} Beds</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#99efe5]/50 text-[#006f67] flex items-center justify-center shrink-0">
                <Bath className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Bathrooms</span>
                <span className="text-sm font-bold text-[#0b1c30]">{property.baths} Baths</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center shrink-0">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Living Area</span>
                <span className="text-sm font-bold text-[#0b1c30]">{property.sqftFormatted} sqft</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Status</span>
                <span className="text-xs font-bold text-[#005d42]">{property.status}</span>
              </div>
            </div>
          </div>

          {/* Public Description */}
          {property.description && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider">
                MLS Overview &amp; Remarks
              </h3>
              <p className="text-sm text-[#3e4943] leading-relaxed bg-[#f8fafc] p-4 rounded-2xl border border-slate-200/70">
                {property.description}
              </p>
            </div>
          )}

          {/* Grouped Amenities Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#005d42]" />
              Property Amenities &amp; Architectural Features
            </h3>

            {Object.keys(groupedAmenities).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No amenities specified for this listing.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(groupedAmenities).map(([group, subs]) => (
                  <div key={group} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <span className="font-display font-bold text-xs text-[#005d42] uppercase tracking-wide block mb-2">
                      {group}
                    </span>
                    <ul className="space-y-1.5">
                      {subs.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#006f67] shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "Assign to Lead" Section */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-5 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-sm text-[#005d42] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Assign Listing to Qualified Lead
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Route this property directly to a buyer's target property field in the Kanban pipeline.
                </p>
              </div>

              {!assigningLead && (
                <button
                  type="button"
                  onClick={() => setAssigningLead(true)}
                  className="bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Assign to Lead
                </button>
              )}
            </div>

            {assigningLead && (
              <form onSubmit={handleAssignSubmit} className="flex items-center gap-2 mt-2">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0b1c30] focus:outline-none"
                >
                  <option value="">Select a buyer lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — Budget: {l.budgetFormatted} ({l.stage.toUpperCase()})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!selectedLeadId}
                  className="bg-[#005d42] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningLead(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
