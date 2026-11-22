/**
 * PropertyDetailModal.tsx – Full Property Details Modal.
 * Features a premium swipeable image gallery preview, lightbox overlay,
 * grouped amenities, and "Assign to Lead" direct workflow.
 */
import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Phone,
  User,
  Video,
} from 'lucide-react';
import { Property, PropertyStatus, Lead } from '../../types/crm';
import { formatMoney } from '../../config/regional';

declare module '../../types/crm' {
  interface Property {
    virtualTourUrl?: string | null;
    virtual_tour_url?: string | null;
    tour_status?: 'processing' | 'ready' | string | null;
    latitude?: number | null;
    longitude?: number | null;
    model_3d_url?: string | null;
  }
}

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Touch gesture state for swipeable gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Fallback placeholder image if no images exist
  const fallbackPlaceholder =
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

  // Extract valid images array with fallbacks
  const images = useMemo(() => {
    if (!property) return [fallbackPlaceholder];
    const list =
      property.images && property.images.length > 0
        ? property.images.filter(Boolean)
        : property.imageUrl
        ? [property.imageUrl]
        : [];
    return list.length > 0 ? list : [fallbackPlaceholder];
  }, [property]);

  // Reset indices whenever the displayed property changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsLightboxOpen(false);
    setAssigningLead(false);
  }, [property?.id]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  if (!isOpen || !property) return null;

  const safeIndex = currentImageIndex >= images.length ? 0 : currentImageIndex;
  const currentImage = images[safeIndex] || fallbackPlaceholder;

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && images.length > 1) {
      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
    if (isRightSwipe && images.length > 1) {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }
  };

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
    <>
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
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="max-h-[80vh] overflow-y-auto p-6 flex flex-col gap-6">
            {/* Main Photo Gallery & Carousel */}
            <div className="flex flex-col gap-3">
              <div
                className="relative rounded-2xl overflow-hidden aspect-16/9 bg-slate-900 group shadow-md cursor-pointer select-none"
                onClick={() => setIsLightboxOpen(true)}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <img
                  src={currentImage}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />

                {/* Counter Badge in top right corner */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium shadow-xs pointer-events-none">
                  {safeIndex + 1} / {images.length}
                </div>

                {/* Left and Right navigation arrows (overlaid, loop back) */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous image"
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-xs hover:scale-105"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next image"
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-xs hover:scale-105"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Click to expand badge on bottom left */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Click to expand</span>
                </div>

                {/* Upload / Manage Photos button */}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
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

              {/* Thumbnail Strip below the main image */}
              {images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        safeIndex === idx
                          ? 'border-[#005d42] ring-2 ring-[#005d42]/30 scale-[1.02] shadow-xs'
                          : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${property.title} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Pricing Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display font-bold text-2xl text-[#0b1c30]">
                    {property.title}
                  </h1>
                  {property.virtualTourUrl && (
                    <a
                      href={property.virtualTourUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 bg-[#005d42] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#004d37] transition-all cursor-pointer"
                    >
                      <Video className="w-4 h-4" /> Watch Virtual Tour on YouTube
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span>
                      {property.address || property.location}
                      {property.city ? `, ${property.city}` : ''}
                    </span>
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      property.address || property.location || ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#005d42]/30 bg-[#eff4ff]/60 hover:bg-[#eff4ff] text-[#005d42] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#005d42]" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-[#005d42]/70" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="font-mono font-bold text-3xl text-[#005d42] tabular-nums">
                  {property.price ? formatMoney(property.price) : property.priceFormatted}
                </span>
                <span className="text-xs font-semibold text-slate-400 mt-0.5">
                  Escrow valuation: {formatMoney(property.price / (property.sqft || 1))}/sqft
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

            {/* Property Owner / Source Card */}
            <div className="bg-[#f8fafc] border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Property Owner / Source
              </h4>

              {!property.ownerName && !property.ownerPhone && !property.ownerCnic ? (
                <p className="text-xs text-slate-500 italic">
                  Direct Brokerage Listing — owner details not recorded.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {property.ownerName && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#e5eeff] text-[#005d42] flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Owner Name</span>
                        <span className="text-sm font-semibold text-[#0b1c30]">{property.ownerName}</span>
                      </div>
                    </div>
                  )}

                  {property.ownerPhone && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#99efe5]/50 text-[#006f67] flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Phone</span>
                          <span className="text-sm font-medium text-[#0b1c30] tabular-nums">{property.ownerPhone}</span>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/${property.ownerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                      >
                        <Phone className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </div>
                  )}

                  {property.ownerCnic && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">CNIC (Verification)</span>
                        <span className="text-sm font-mono text-[#0b1c30] tabular-nums">{property.ownerCnic}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Feature (z-index 100 with dark bg-black/90) */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 select-none"
          onClick={() => setIsLightboxOpen(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Top Bar: Counter & Close Button */}
          <div className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between text-white z-10 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide">
              {safeIndex + 1} / {images.length}
            </div>

            <button
              type="button"
              aria-label="Close Lightbox"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(false);
              }}
              className="pointer-events-auto p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Centered Large Image with Navigation Arrows */}
          <div
            className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={`${property.title} - Fullscreen view`}
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-all"
            />

            {/* Left and Right arrows inside lightbox */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md hover:scale-110 shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={handleNextImage}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md hover:scale-110 shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Strip */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 max-w-xl w-full flex justify-center gap-2 overflow-x-auto py-2 px-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    safeIndex === idx
                      ? 'border-white scale-110 opacity-100 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Fullscreen thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </>
  );
};
