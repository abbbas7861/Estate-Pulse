import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  Eye,
  FileEdit,
  Heart,
  MapPin,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { Property } from '../../types/crm';
import { formatMoney } from '../../config/regional';

interface PropertyListingCardProps {
  property: Property;
  viewMode: 'grid' | 'list';
  onToggleFavorite: (id: string) => void;
  onManageListing: (property: Property) => void;
  onShareListing: (property: Property) => void;
  onEditListing: (property: Property) => void;
}

export const PropertyListingCard: React.FC<PropertyListingCardProps> = ({
  property,
  viewMode,
  onToggleFavorite,
  onManageListing,
  onShareListing,
  onEditListing,
}) => {
  const [imgError, setImgError] = useState(false);

  const getStatusTextColor = (status: Property['status']) => {
    switch (status) {
      case 'Active Listing':
        return 'text-[#005d42]';
      case 'Pending Escrow':
        return 'text-amber-700';
      case 'Price Improvement':
        return 'text-blue-700';
      case 'Under Offer':
        return 'text-purple-700';
      case 'Coming Soon':
        return 'text-indigo-700';
      default:
        return 'text-[#005d42]';
    }
  };

  if (viewMode === 'list') {
    return (
      <article className="group bg-white rounded-xl border border-slate-200/80 hover:border-[#047857]/40 transition-all duration-200 flex flex-col md:flex-row overflow-hidden">
        {/* Left Image Slot */}
        <div className="relative w-full md:w-72 h-52 md:h-auto shrink-0 overflow-hidden bg-[#0b1c30]">
          {!imgError ? (
            <img
              src={property.imageUrl}
              alt={`${property.title} — ${property.address}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#0b1c30] to-[#005d42] text-white">
              <Building2 className="w-8 h-8 text-[#97f5cc] mb-2" />
              <span className="text-xs font-semibold">{property.title}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className={`px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-[11px] font-semibold shadow-xs ${getStatusTextColor(
                property.status
              )}`}
            >
              {property.status}
            </span>
            <button
              type="button"
              onClick={() => onToggleFavorite(property.id)}
              aria-label="Favorite property"
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#6e7a73] hover:text-[#ba1a1a] transition-colors cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  property.isFavorite ? 'fill-[#ba1a1a] text-[#ba1a1a]' : ''
                }`}
              />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-2xl text-white tabular-nums drop-shadow-xs">
                {property.priceFormatted}
              </span>
              {property.previousPriceFormatted && (
                <span className="text-xs text-slate-300 line-through tabular-nums">
                  {property.previousPriceFormatted}
                </span>
              )}
            </div>
            {property.images && property.images.length > 1 && (
              <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                <Camera className="w-3 h-3 text-[#97f5cc]" />
                {property.images.length}
              </span>
            )}
          </div>
        </div>

        {/* Right Details */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-[#6e7a73]">
                <span className="font-mono font-medium text-[#0b1c30]">{property.mlsId}</span>
                <span aria-hidden="true">·</span>
                <span>{property.type}</span>
              </div>
              <h2 className="font-display font-semibold text-lg text-[#0b1c30] group-hover:text-[#005d42] transition-colors mt-0.5">
                {property.title}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="flex items-center gap-1 text-[13px] text-[#3e4943]">
                  <MapPin className="w-3.5 h-3.5 text-[#6e7a73] shrink-0" />
                  <span>{property.address}</span>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    property.address || property.location || ''
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View on Google Maps"
                  aria-label="View on Google Maps"
                  className="p-1 rounded-md text-[#005d42] hover:text-white hover:bg-[#005d42] transition-colors cursor-pointer shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#eff4ff] rounded-lg px-4 py-2 text-center shrink-0">
              <div>
                <span className="block text-[10px] text-[#6e7a73]">Beds</span>
                <span className="font-display font-semibold text-[14px] text-[#0b1c30] tabular-nums">
                  {property.beds}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="block text-[10px] text-[#6e7a73]">Baths</span>
                <span className="font-display font-semibold text-[14px] text-[#0b1c30] tabular-nums">
                  {property.baths}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="block text-[10px] text-[#6e7a73]">Area</span>
                <span className="font-display font-semibold text-[14px] text-[#0b1c30] tabular-nums">
                  {property.sqftFormatted} <span className="text-[11px] font-normal">sqft</span>
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="block text-[10px] text-[#6e7a73]">{property.highlightLabel}</span>
                <span className="font-display font-semibold text-[14px] text-[#0b1c30]">
                  {property.highlightValue}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {property.brokerAvatarUrl ? (
                  <img
                    src={property.brokerAvatarUrl}
                    alt={property.brokerName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#99efe5] text-[#006f67] text-xs font-bold flex items-center justify-center">
                    {property.brokerInitials}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#6e7a73]">Listing Broker</span>
                  <span className="text-[12px] font-medium text-[#0b1c30] leading-tight">
                    {property.brokerName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px] text-[#3e4943] tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#6e7a73]" />
                  {property.views} views
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-[#005d42]" />
                  {property.inquiries} inquiries
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onManageListing(property)}
                className="px-4 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#047857] hover:text-white text-[#0b1c30] text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Manage Listing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  property.address || property.location || ''
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="View on Google Maps"
                title="View on Google Maps"
                className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] hover:text-[#005d42] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => onShareListing(property)}
                aria-label="Share listing"
                className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onEditListing(property)}
                aria-label="Edit record"
                className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer"
              >
                <FileEdit className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white rounded-xl border border-slate-200/80 hover:border-[#047857]/40 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Media Container (600x400 aspect ratio) */}
      <div className="relative w-full h-60 overflow-hidden bg-[#0b1c30]">
        {!imgError ? (
          <img
            src={property.imageUrl}
            alt={`${property.title} — ${property.address}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0b1c30] to-[#005d42] text-white">
            <Building2 className="w-10 h-10 text-[#97f5cc] mb-2" />
            <span className="text-sm font-semibold">{property.title}</span>
          </div>
        )}

        {/* Measured contrast scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/80 via-[#0b1c30]/20 to-black/25 pointer-events-none" />

        {/* Top Overlay: Status & MLS ID + Favorite */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
          <span
            className={`px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-[11px] font-semibold shadow-xs ${getStatusTextColor(
              property.status
            )}`}
          >
            {property.status}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-1 rounded-md bg-[#0b1c30]/75 backdrop-blur-md text-white font-mono text-[11px] tabular-nums">
              {property.mlsId}
            </span>
            <button
              type="button"
              onClick={() => onToggleFavorite(property.id)}
              aria-label="Favorite property"
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#6e7a73] hover:text-[#ba1a1a] transition-colors shadow-xs cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  property.isFavorite ? 'fill-[#ba1a1a] text-[#ba1a1a]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Price Overlay */}
        <div className="absolute bottom-3.5 left-4 right-4 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[28px] text-white leading-tight drop-shadow-xs tabular-nums">
              {property.price ? formatMoney(property.price, { compact: true }) : property.priceFormatted}
            </span>
            {property.previousPriceFormatted && (
              <span className="text-[12px] text-[#dce9ff] line-through tabular-nums">
                {property.previousPriceFormatted}
              </span>
            )}
          </div>
          {property.images && property.images.length > 1 && (
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs">
              <Camera className="w-3.5 h-3.5 text-[#97f5cc]" />
              {property.images.length} Photos
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] group-hover:text-[#005d42] transition-colors leading-snug">
            {property.title}
          </h2>
          <div className="flex items-center justify-between gap-1 text-[13px] text-[#3e4943] mt-1">
            <p className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#6e7a73] shrink-0" />
              <span className="truncate">{property.address}</span>
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                property.address || property.location || ''
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="View on Google Maps"
              aria-label="View on Google Maps"
              className="p-1 rounded-md text-[#005d42] hover:text-white hover:bg-[#005d42] transition-colors cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 4-Column Architectural Specs Strip */}
          <div className="grid grid-cols-4 gap-1 bg-[#eff4ff] rounded-lg p-2.5 mt-4 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6e7a73] font-medium">Beds</span>
              <span className="font-display font-semibold text-[15px] text-[#0b1c30] mt-0.5 tabular-nums">
                {property.beds}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6e7a73] font-medium">Baths</span>
              <span className="font-display font-semibold text-[15px] text-[#0b1c30] mt-0.5 tabular-nums">
                {property.baths}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6e7a73] font-medium">Area</span>
              <span className="font-display font-semibold text-[15px] text-[#0b1c30] mt-0.5 tabular-nums">
                {property.sqftFormatted}
              </span>
              <span className="text-[10px] text-[#6e7a73] leading-none">sqft</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#6e7a73] font-medium">
                {property.highlightLabel}
              </span>
              <span className="font-display font-semibold text-[14px] text-[#0b1c30] mt-0.5 truncate max-w-full">
                {property.highlightValue}
              </span>
            </div>
          </div>
        </div>

        {/* Listing Broker Attribution & Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {property.brokerAvatarUrl ? (
                <img
                  src={property.brokerAvatarUrl}
                  alt={property.brokerName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#99efe5] text-[#006f67] font-display text-[11px] font-bold flex items-center justify-center">
                  {property.brokerInitials}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6e7a73]">Listing Broker</span>
                <span className="text-[12px] font-medium text-[#0b1c30] leading-tight">
                  {property.brokerName}
                </span>
              </div>
            </div>

            {/* Clean unboxed engagement metadata */}
            <div className="flex items-center gap-2 text-[12px] text-[#3e4943] tabular-nums">
              <span
                className="inline-flex items-center gap-1"
                title={`${property.views} Total Listing Views`}
              >
                <Eye className="w-3.5 h-3.5 text-[#6e7a73]" />
                {property.views}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={`${property.inquiries} Active Inquiries`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#005d42]" />
                {property.inquiries}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onManageListing(property)}
              className="flex-1 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#047857] hover:text-white text-[#0b1c30] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Manage Listing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                property.address || property.location || ''
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="View on Google Maps"
              title="View on Google Maps"
              className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] hover:text-[#005d42] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <MapPin className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => onShareListing(property)}
              aria-label="Share listing"
              className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onEditListing(property)}
              aria-label="Edit record"
              className="w-9 h-9 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer"
            >
              <FileEdit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
