import { AIChatBot } from '../UI/AIChatBot';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Globe,
  Sparkles,
  CheckCircle2,
  Loader2,
  Search,
  ExternalLink,
  Calendar,
  Mail,
  Send,
  Facebook,
  Instagram,
  Linkedin,
  Menu,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatMoney } from '../../config/regional';
import { Map3DTour } from '../UI/Map3DTour';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgInfo {
  id: string;
  name: string;
  website_slug: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  about_text?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  calendly_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
}

interface PublicPropertyAmenity {
  group_name: string;
  sub_group_name: string;
}

interface PublicProperty {
  id: string;
  title: string;
  address: string;
  location?: string;
  city?: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  sqft_formatted?: string;
  status: string;
  type?: string;
  image_url?: string;
  images?: string[];
  broker_name?: string;
  description?: string;
  features?: string[];
  amenities?: PublicPropertyAmenity[];
  latitude?: number | null;
  longitude?: number | null;
  model_3d_url?: string | null;
}

// ─── Read-Only Public Property Detail Modal ────────────────────────────────────

interface PublicPropertyModalProps {
  property: PublicProperty | null;
  org: OrgInfo | null;
  onClose: () => void;
}

const PublicPropertyModal: React.FC<PublicPropertyModalProps> = ({
  property,
  org,
  onClose,
}) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [show3DTour, setShow3DTour] = useState(false);

  useEffect(() => {
    setActiveImgIndex(0);
    setShow3DTour(false);
  }, [property?.id]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!property) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (show3DTour) {
          setShow3DTour(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, show3DTour, property]);

  if (!property) return null;

  const images: string[] = Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter(Boolean)
    : property.image_url
    ? [property.image_url]
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80'];

  const currentImg = images[activeImgIndex] || images[0];

  const has3DTour = Boolean(
    property.model_3d_url ||
    (typeof property.latitude === 'number' && typeof property.longitude === 'number')
  );

  const modalMessage = `Hello ${org?.name || 'Team'}! I am inquiring about "${property.title}" (${property.address || property.location || 'Listing'}). Asking price: ${formatMoney(property.price, { compact: false })}. Please share more details.`;
  const cleanedModalNumber = org?.whatsapp_number ? org.whatsapp_number.replace(/\D/g, '') : '';
  const whatsappHref = cleanedModalNumber
    ? `https://wa.me/${cleanedModalNumber}?text=${encodeURIComponent(modalMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(modalMessage)}`;

  // Group amenities by group_name
  const groupedAmenities = (property.amenities || []).reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.group_name]) {
      acc[item.group_name] = [];
    }
    acc[item.group_name].push(item.sub_group_name);
    return acc;
  }, {});

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative bg-[#FAFAFA] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-[#EAEAEA] animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA] bg-white/90 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30">
                {property.type || 'Exclusive Property'}
              </span>
              <span className="text-xs text-[#4A4A4A] font-medium">
                {org?.name ? `Presented by ${org.name}` : 'Luxury Portfolio'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Image Gallery / 3D Tour Embed */}
            <div className="relative aspect-16/9 bg-stone-900 overflow-hidden select-none">
              {show3DTour && has3DTour ? (
                <div className="w-full h-full relative">
                  <Map3DTour
                    latitude={property.latitude}
                    longitude={property.longitude}
                    modelUrl={property.model_3d_url}
                    onClose={() => setShow3DTour(false)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow3DTour(false)}
                    className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Exit 3D Tour</span>
                  </button>
                </div>
              ) : (
                <>
                  <img
                    src={currentImg}
                    alt={property.title}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />

                  {/* 3D Tour Button Badge */}
                  {has3DTour && (
                    <button
                      type="button"
                      onClick={() => setShow3DTour(true)}
                      className="absolute top-4 left-4 z-10 px-3.5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>Launch 3D Virtual Tour</span>
                    </button>
                  )}

                  {/* Prev / Next controls */}
                  {images.length > 1 && (
                    <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                        }}
                        className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                        }}
                        className="pointer-events-auto p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Thumbnail Bar */}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 px-4 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImgIndex(idx)}
                          className={`w-12 h-8 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                            activeImgIndex === idx
                              ? 'border-[#C5A059] scale-105 shadow-md'
                              : 'border-white/50 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Content Details */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Title, Address, Price */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#1A1A1A] leading-tight">
                    {property.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-[#4A4A4A] text-sm mt-1.5">
                    <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <span>
                      {property.address}
                      {property.city ? `, ${property.city}` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                    Acquisition Price
                  </span>
                  <span className="font-serif font-bold text-2xl sm:text-3xl text-[#C5A059]">
                    {formatMoney(property.price, { compact: false })}
                  </span>
                </div>
              </div>

              {/* Specs Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-[#EAEAEA] rounded-2xl p-3.5 text-center shadow-2xs">
                  <div className="flex items-center justify-center text-[#C5A059] mb-1">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-sm text-[#1A1A1A] block">{property.beds}</span>
                  <span className="text-[11px] text-[#4A4A4A]">Bedrooms</span>
                </div>

                <div className="bg-white border border-[#EAEAEA] rounded-2xl p-3.5 text-center shadow-2xs">
                  <div className="flex items-center justify-center text-[#C5A059] mb-1">
                    <Bath className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-sm text-[#1A1A1A] block">{property.baths}</span>
                  <span className="text-[11px] text-[#4A4A4A]">Bathrooms</span>
                </div>

                <div className="bg-white border border-[#EAEAEA] rounded-2xl p-3.5 text-center shadow-2xs">
                  <div className="flex items-center justify-center text-[#C5A059] mb-1">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-sm text-[#1A1A1A] block">
                    {property.sqft_formatted || property.sqft?.toLocaleString() || '—'}
                  </span>
                  <span className="text-[11px] text-[#4A4A4A]">Total Area</span>
                </div>

                <div className="bg-white border border-[#EAEAEA] rounded-2xl p-3.5 text-center shadow-2xs col-span-3 sm:col-span-1">
                  <div className="flex items-center justify-center text-[#C5A059] mb-1">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-sm text-[#1A1A1A] block">
                    {property.type || 'Residence'}
                  </span>
                  <span className="text-[11px] text-[#4A4A4A]">Category</span>
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div className="space-y-2">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-[#C5A059]">
                    Estate Overview
                  </h3>
                  <p className="text-[#4A4A4A] text-sm leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Highlights & Features */}
              {Array.isArray(property.features) && property.features.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-[#C5A059]">
                    Signature Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#EAEAEA] text-[#1A1A1A] text-xs font-medium shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>{feat}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorized Amenities */}
              {Object.keys(groupedAmenities).length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#EAEAEA]">
                  <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-[#C5A059]">
                    Curated Amenities
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(groupedAmenities).map(([group, items]) => (
                      <div key={group} className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs">
                        <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#1A1A1A] mb-2">
                          {group}
                        </h4>
                        <ul className="space-y-1">
                          {items.map((it, i) => (
                            <li key={i} className="text-xs text-[#4A4A4A] flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inquire on WhatsApp Card */}
              <div className="bg-[#141414] border border-stone-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h4 className="font-serif font-bold text-white text-base">
                    Inquire on This Exclusive Listing
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 max-w-md">
                    Connect directly with the brokerage advisory desk via WhatsApp for verified deeds, price negotiation, and private viewings.
                  </p>
                </div>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-xs font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Advisor</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-[#EAEAEA] bg-white flex items-center justify-between">
            <span className="text-xs text-[#4A4A4A]">
              {property.broker_name ? `Advisory Broker: ${property.broker_name}` : org?.name || 'Exclusive Brokerage'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Public Property Card ─────────────────────────────────────────────────────

interface PublicPropertyCardProps {
  property: PublicProperty;
  onSelect: (p: PublicProperty) => void;
  whatsappHref: string;
}

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({
  property,
  onSelect,
  whatsappHref,
}) => {
  const images = Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter(Boolean)
    : property.image_url
    ? [property.image_url]
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'];

  const coverImg = images[0];

  const has3DTour = Boolean(
    property.model_3d_url ||
    (typeof property.latitude === 'number' && typeof property.longitude === 'number')
  );

  return (
    <motion.article
      onClick={() => onSelect(property)}
      whileHover={{ 
        y: -10, 
        scale: 1.02, 
        boxShadow: "0px 25px 30px -10px rgba(0, 0, 0, 0.15)",
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col group cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
        <img
          src={coverImg}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase bg-[#141414]/85 text-white backdrop-blur-md">
            {property.type || 'Exclusive'}
          </span>

          {has3DTour && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-[#C5A059] text-white backdrop-blur-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-100" />
              <span>3D Virtual Tour</span>
            </span>
          )}
        </div>

        {/* Asking Price Tag */}
        <div className="absolute bottom-3 left-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#141414]/90 backdrop-blur-md shadow-md border border-white/10">
            <span className="font-serif font-bold text-sm text-[#C5A059]">
              {formatMoney(property.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Property Info Content */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-base text-[#1A1A1A] line-clamp-1 group-hover:text-[#C5A059] transition-colors">
            {property.title}
          </h3>
          <p className="text-[#4A4A4A] text-xs mt-1 flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
            <span>
              {property.address || property.location}
              {property.city ? `, ${property.city}` : ''}
            </span>
          </p>
        </div>

        {/* Specs Row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EAEAEA] text-[#4A4A4A] text-xs">
          <div className="flex items-center gap-1.5" title="Bedrooms">
            <BedDouble className="w-4 h-4 text-stone-400" />
            <span className="font-semibold text-[#1A1A1A]">{property.beds}</span>
            <span className="text-stone-400">Beds</span>
          </div>

          <div className="flex items-center gap-1.5" title="Bathrooms">
            <Bath className="w-4 h-4 text-stone-400" />
            <span className="font-semibold text-[#1A1A1A]">{property.baths}</span>
            <span className="text-stone-400">Baths</span>
          </div>

          <div className="flex items-center gap-1.5" title="Area">
            <Maximize2 className="w-4 h-4 text-stone-400" />
            <span className="font-semibold text-[#1A1A1A]">
              {property.sqft_formatted || property.sqft?.toLocaleString() || '—'}
            </span>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="pt-2 flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(property);
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#FAFAFA] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold border border-[#EAEAEA] text-center transition-colors cursor-pointer"
          >
            View Residence
          </motion.button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white transition-all shadow-xs flex items-center justify-center cursor-pointer hover:scale-105"
            title="Inquire via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.article>
  );
};

// ─── Main Public Website Component ────────────────────────────────────────────

export const PublicWebsitePage: React.FC<{ slug?: string }> = ({ slug: propSlug }) => {
  // Extract slug from window.location.pathname.split('/')[2] or prop
  const resolvedSlug = useMemo(() => {
    if (propSlug) return propSlug;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      return parts[2] || parts[1] || '';
    }
    return '';
  }, [propSlug]);

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'not_found' | 'error' | 'done'>('loading');
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<PublicProperty | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Dynamic Title & Gold Favicon for Public Website
  useEffect(() => {
    if (!org?.name) return;
    document.title = `${org.name} | Private Property Portal`;
    
    // Base64 encoded Gold Hexagon
    const goldFavicon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzVBMDU5IiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik0yMiA0TDQgMTR2MjBsMTggMTAgMTgtMTBWMTRMMjIgNHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNDNUEwNTkiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTIyIDEwTDEwIDE3djEybDEyIDcgMTItN1YxN0wyMiAxMHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNDNUEwNTkiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTIyIDE4djhNMTggMjJoOCIvPjwvc3ZnPg==';
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon'; link.href = goldFavicon; document.head.appendChild(link);
  }, [org]);

  const fetchData = useCallback(async () => {
    if (!resolvedSlug) {
      setLoadState('not_found');
      return;
    }

    setLoadState('loading');
    try {
      // 1. Fetch organization with all portal fields
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, website_slug, whatsapp_number, email, about_text, facebook_url, instagram_url, linkedin_url, calendly_url, contact_email, contact_phone, address')
        .eq('website_slug', resolvedSlug)
        .maybeSingle();

      if (orgErr) throw orgErr;
      if (!orgData) {
        setLoadState('not_found');
        return;
      }

      console.log('Fetched Org WhatsApp:', orgData?.whatsapp_number);

      setOrg(orgData as OrgInfo);

      // 2. Fetch properties where is_public === true AND status === 'Active Listing'
      const { data: propData, error: propErr } = await supabase
        .from('properties')
        .select(
          'id, title, address, location, city, price, beds, baths, sqft, sqft_formatted, status, type, image_url, images, broker_name, description, features, latitude, longitude, model_3d_url'
        )
        .eq('org_id', orgData.id)
        .eq('is_public', true)
        .eq('status', 'Active Listing')
        .order('created_at', { ascending: false });

      if (propErr) throw propErr;

      // 3. Fetch amenities for all returned properties
      const propertyIds = (propData || []).map((p: any) => p.id);
      let amenitiesByProperty: Record<string, PublicPropertyAmenity[]> = {};

      if (propertyIds.length > 0) {
        try {
          const { data: amenityData } = await supabase
            .from('property_amenities')
            .select('property_id, group_name, sub_group_name')
            .in('property_id', propertyIds);

          if (amenityData) {
            amenityData.forEach((item: any) => {
              if (!amenitiesByProperty[item.property_id]) {
                amenitiesByProperty[item.property_id] = [];
              }
              amenitiesByProperty[item.property_id].push({
                group_name: item.group_name,
                sub_group_name: item.sub_group_name,
              });
            });
          }
        } catch {
          // ignore if table is empty or optional
        }
      }

      const mergedProperties: PublicProperty[] = (propData || []).map((p: any) => ({
        ...p,
        amenities: amenitiesByProperty[p.id] || [],
      }));

      setProperties(mergedProperties);

      // 4. Fetch agents (users)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, role, avatar_url, phone, experience_years, bio')
        .eq('org_id', orgData.id);
      if (usersData) setAgents(usersData);

      setLoadState('done');
    } catch (err) {
      console.error('[PublicWebsitePage] Fetch error:', err);
      setLoadState('error');
    }
  }, [resolvedSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter properties by search term
  const filteredProps = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase().trim();
    return properties.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.type || '').toLowerCase().includes(q)
      );
    });
  }, [properties, search]);

  const cleanedOrgNumber = org?.whatsapp_number ? org.whatsapp_number.replace(/\D/g, '') : '';
  const orgMessage = `Hello ${org?.name || 'Brokerage'}! I am browsing your luxury property portfolio and would like to contact your team.`;
  const orgWhatsappHref = cleanedOrgNumber
    ? `https://wa.me/${cleanedOrgNumber}?text=${encodeURIComponent(orgMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(orgMessage)}`;

  // Handle Contact Form Lead Submission - Task 2: save in website_message column
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id) return;
    if (!contactForm.name.trim()) {
      setLeadError('Please enter your full name.');
      return;
    }
    if (!contactForm.phone.trim() && !contactForm.email.trim()) {
      setLeadError('Please provide either a phone number or email so our brokers can reach you.');
      return;
    }

    setSubmittingLead(true);
    setLeadError(null);

    try {
      const { error: insertErr } = await supabase.from('leads').insert({
        org_id: org.id,
        name: contactForm.name.trim(),
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        source: 'Website Inquiry',
        stage: 'assigned',
        website_message: contactForm.message.trim() || null,
        target_property: contactForm.message.trim() ? `Website Message: ${contactForm.message.trim()}` : null,
      });

      if (insertErr) throw insertErr;

      setLeadSubmitted(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      console.error('Lead submission failed:', err);
      setLeadError(err.message || 'Unable to submit your inquiry. Please connect with us directly via WhatsApp.');
    } finally {
      setSubmittingLead(false);
    }
  };

  // ── 404 Not Found Page ────────────────────────────────────────────────────────
  if (loadState === 'not_found') {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6 text-white font-sans">
        <div className="text-center max-w-md bg-stone-900/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-stone-800 shadow-2xl">
          <div className="w-16 h-16 bg-[#C5A059]/15 text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#C5A059]/30">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
            Brokerage Not Found
          </h1>
          <p className="text-stone-400 text-sm mb-6 leading-relaxed">
            We couldn't locate an active agency website for{' '}
            <code className="text-[#C5A059] font-mono bg-stone-800 px-2 py-0.5 rounded-md">
              /{resolvedSlug}
            </code>
            . Please verify the URL or explore our premier brokerage catalog.
          </p>
          <a
            href="/"
            className="w-full py-3 px-5 bg-[#C5A059] hover:bg-[#b08b46] text-white rounded-xl font-medium tracking-wide text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to EstatePulse</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#C5A059]/15 flex items-center justify-center border border-[#C5A059]/30">
            <Loader2 className="w-7 h-7 text-[#C5A059] animate-spin" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-white">Loading Luxury Portfolio</h3>
            <p className="text-stone-400 text-xs mt-1">Connecting to live private brokerage listings…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6 text-white font-sans">
        <div className="text-center max-w-md bg-stone-900/90 backdrop-blur-md p-8 rounded-3xl border border-stone-800 shadow-xl">
          <h1 className="text-2xl font-serif font-bold text-rose-400 mb-2">Connection Error</h1>
          <p className="text-stone-300 text-sm mb-6">
            Unable to fetch property listings at this moment. Please verify your connection.
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="w-full py-3 bg-[#C5A059] hover:bg-[#b08b46] text-white rounded-xl font-medium tracking-wide text-sm transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ── Main Public Website Page ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#4A4A4A] font-sans flex flex-col selection:bg-[#C5A059]/20 selection:text-[#1A1A1A] scroll-smooth">
      {/* ── Top Navigation Bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAEAEA] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brokerage Brand Name */}
          <a href="#home" className="flex items-center gap-3 group cursor-pointer">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 transition-transform duration-500 group-hover:rotate-6">
              <path d="M24 4L4 14V34L24 44L44 34V14L24 4Z" stroke="url(#gold-gradient)" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M24 12L12 18V30L24 36L36 30V18L24 12Z" stroke="url(#gold-gradient)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M24 20V28" stroke="url(#gold-gradient)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 24H28" stroke="url(#gold-gradient)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="gold-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#C5A059"/>
                  <stop offset="1" stopColor="#F3E5AB"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <span className="font-serif font-bold text-2xl text-[#1A1A1A] leading-none block tracking-wide">
                {org?.name || 'Brokerage'}
              </span>
              <span className="text-[9px] font-sans tracking-[0.3em] text-[#C5A059] uppercase font-bold block mt-1">
                Private Advisory
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A4A4A]">
            <a href="#home" className="hover:text-[#1A1A1A] transition-colors">
              Home
            </a>
            <a href="#properties" className="hover:text-[#1A1A1A] transition-colors">
              Properties
            </a>
            <a href="#about" className="hover:text-[#1A1A1A] transition-colors">
              About Us
            </a>
            <a href="#booking" className="hover:text-[#1A1A1A] transition-colors">
              Book a Meeting
            </a>
            <a href="#contact" className="hover:text-[#1A1A1A] transition-colors">
              Contact Us
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {org?.calendly_url && (
              <a
                href={org.calendly_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white border border-[#EAEAEA] hover:border-[#C5A059] text-[#1A1A1A] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Book Meeting</span>
              </a>
            )}

            <a
              href={orgWhatsappHref}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Concierge</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href={orgWhatsappHref}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-[#C5A059] text-white"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EAEAEA] bg-white px-4 pt-3 pb-5 flex flex-col gap-3 shadow-xl animate-in slide-in-from-top-2">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C5A059]"
            >
              Home
            </a>
            <a
              href="#properties"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C5A059]"
            >
              Properties
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C5A059]"
            >
              About Us
            </a>
            <a
              href="#booking"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C5A059]"
            >
              Book a Meeting
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C5A059]"
            >
              Contact Us
            </a>

            {org?.calendly_url && (
              <a
                href={org.calendly_url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#C5A059] text-white text-xs font-semibold text-center flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Consultation via Calendly</span>
              </a>
            )}
          </div>
        )}
      </header>

      {/* ── Hero Section with Luxury Video Background ──────────────────────── */}
      <section id="home" className="relative overflow-hidden min-h-[80vh] flex items-center justify-center bg-[#141414] text-white py-20 sm:py-28">
        {/* Full-bleed background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
        >
          <source src="https://gsyhniaoesaskmestrqt.supabase.co/storage/v1/object/public/website-assets/17167760_1440_2560_30fps.mp4" type="video/mp4" />
        </video>

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1c30]/80 via-[#0b1c30]/40 to-[#0b1c30]/90 z-10 pointer-events-none" />

        {/* Luxury Gold & Obsidian Ambient Glows */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.2, 0.4, 0.2],
            x: [0, 40, 0],
            y: [0, -40, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#C5A059]/20 via-[#C5A059]/5 to-transparent rounded-full blur-3xl pointer-events-none z-10"
        />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none z-10" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, staggerChildren: 0.2 }}
          className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-20 w-full"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-xs font-semibold mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="tracking-wide">Exclusive Portfolio by {org?.name || 'Licensed Brokerage'}</span>
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight mb-4"
          >
            Explore Handcrafted Real Estate Listings
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="text-stone-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-9 leading-relaxed font-sans"
          >
            Discover verified premier residences, waterfront estates, and commercial holdings. Schedule a private consultation or request confidential portfolio details.
          </motion.p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location, city, or property type…"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-[#C5A059] text-white placeholder:text-stone-400 text-sm backdrop-blur-md outline-none transition-all shadow-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Jump Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-300">
            <motion.a
              href="#properties"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <span>View Residences ({properties.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </motion.a>
            <motion.a
              href="#booking"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Book Consultation</span>
            </motion.a>
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Send Private Message</span>
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* ── Active Listings Grid ────────────────────────────────────────────── */}
      <motion.section
        id="properties"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
        className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#1A1A1A]">
              Featured Residences
            </h2>
            <p className="text-sm text-[#4A4A4A] mt-1">
              Displaying {filteredProps.length}{' '}
              {filteredProps.length === 1 ? 'verified estate' : 'verified estates'}
              {search && ` matching "${search}"`}
            </p>
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs font-semibold text-[#C5A059] hover:underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>

        {filteredProps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-[#EAEAEA] p-8 shadow-xs">
            <div className="w-16 h-16 bg-[#FAFAFA] rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-400 border border-[#EAEAEA]">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#1A1A1A] mb-1">
              {search ? 'No matching estates' : 'No active listings published'}
            </h3>
            <p className="text-[#4A4A4A] text-xs sm:text-sm max-w-md">
              {search
                ? 'Try searching with a different keyword or location.'
                : 'This agency has not published any public listings at this moment. Please check back shortly.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
            {filteredProps.map((prop) => {
              const itemMessage = `Hello! I am inquiring about "${prop.title}" (${formatMoney(prop.price)}).`;
              const cleanedItemNumber = org?.whatsapp_number ? org.whatsapp_number.replace(/\D/g, '') : '';
              const itemWhatsappHref = cleanedItemNumber
                ? `https://wa.me/${cleanedItemNumber}?text=${encodeURIComponent(itemMessage)}`
                : orgWhatsappHref;

              return (
                <PublicPropertyCard
                  key={prop.id}
                  property={prop}
                  onSelect={(p) => setSelectedProperty(p)}
                  whatsappHref={itemWhatsappHref}
                />
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── About Us Section ────────────────────────────────────────────────── */}
      <section id="about" className="bg-white border-y border-[#EAEAEA] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Story & Agency Overview */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/15 text-[#C5A059] text-xs font-semibold tracking-wider uppercase border border-[#C5A059]/30">
                <ShieldCheck className="w-4 h-4" />
                <span>Our Heritage & Advisory</span>
              </div>

              <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#1A1A1A] leading-tight">
                {org?.name ? `Welcome to ${org.name}` : 'A Premier Real Estate Advisory'}
              </h2>

              <div className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed space-y-4">
                {org?.about_text ? (
                  <p className="whitespace-pre-line">{org.about_text}</p>
                ) : (
                  <>
                    <p>
                      We are a premier real estate brokerage dedicated to connecting discerning buyers, investors, and homeowners with high-value properties and verified title listings.
                    </p>
                    <p>
                      Our team combines local market mastery, state-of-the-art virtual 3D tours, and individualized client advisory to make every transaction transparent, rewarding, and seamless.
                    </p>
                  </>
                )}
              </div>

              {/* Pillars / Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#EAEAEA]">
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA]">
                  <span className="font-serif font-bold text-lg text-[#C5A059] block">100%</span>
                  <span className="text-xs text-[#4A4A4A] font-medium">Verified Title Deeds</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA]">
                  <span className="font-serif font-bold text-lg text-[#C5A059] block">Confidential</span>
                  <span className="text-xs text-[#4A4A4A] font-medium">Advisory Support</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] col-span-2 sm:col-span-1">
                  <span className="font-serif font-bold text-lg text-[#C5A059] block">Immersive 3D</span>
                  <span className="text-xs text-[#4A4A4A] font-medium">Remote Walkthroughs</span>
                </div>
              </div>
            </div>

            {/* Headquarters Card */}
            <div className="lg:col-span-5 bg-[#141414] rounded-3xl p-7 sm:p-8 text-white shadow-xl relative overflow-hidden border border-stone-800">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/15 rounded-full blur-2xl pointer-events-none" />

              <h3 className="font-serif font-bold text-xl text-white mb-2">
                Agency Headquarters
              </h3>
              <p className="text-xs text-stone-300 mb-6">
                Direct channels for client inquiries, private viewings, and property acquisitions.
              </p>

              <div className="space-y-4">
                {(org?.address || 'New York, NY') && (
                  <div className="flex items-start gap-3 text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#C5A059]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                        Office Location
                      </span>
                      <span className="text-stone-200">
                        {org?.address || 'Headquarters address available upon consultation.'}
                      </span>
                    </div>
                  </div>
                )}

                {(org?.contact_email || org?.email) && (
                  <div className="flex items-start gap-3 text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#C5A059]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                        Advisory Email
                      </span>
                      <a
                        href={`mailto:${org.contact_email || org.email}`}
                        className="text-stone-200 hover:text-white underline underline-offset-2"
                      >
                        {org.contact_email || org.email}
                      </a>
                    </div>
                  </div>
                )}

                {(org?.contact_phone || org?.whatsapp_number) && (
                  <div className="flex items-start gap-3 text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[#C5A059]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                        Direct Phone / WhatsApp
                      </span>
                      <a
                        href={`tel:${org.contact_phone || org.whatsapp_number}`}
                        className="text-stone-200 hover:text-white"
                      >
                        {org.contact_phone || org.whatsapp_number}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick WhatsApp Action */}
              <div className="mt-8 pt-6 border-t border-stone-800">
                <a
                  href={orgWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-xs font-semibold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Start WhatsApp Chat</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Meet Our Senior Advisors Section ─────────────────────────────────── */}
      <motion.section
        id="advisors"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
        className="py-16 sm:py-24 bg-[#FAFAFA] border-b border-[#EAEAEA]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] text-xs font-semibold tracking-wider uppercase mb-3 border border-[#C5A059]/30">
              <ShieldCheck className="w-4 h-4" />
              <span>Dedicated Representation</span>
            </div>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#1A1A1A]">
              Meet Our Senior Advisors
            </h2>
            <p className="text-sm text-[#4A4A4A] mt-2">
              Seasoned advisors offering confidential portfolio management, off-market deal sourcing, and private transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-[#FAFAFA] rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#C5A059] text-white flex items-center justify-center text-2xl font-bold mb-4 overflow-hidden">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.full_name} className="w-full h-full object-cover" />
                  ) : (
                    agent.full_name?.charAt(0).toUpperCase() || 'A'
                  )}
                </div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">{agent.full_name || 'Advisor'}</h3>
                <p className="text-sm text-[#C5A059] font-semibold mb-1 capitalize">{agent.role || 'Agent'}</p>
                <p className="text-xs text-slate-500 mb-4">{agent.experience_years || '5+ Years'}</p>
                <p className="text-xs text-slate-600 line-clamp-3 mb-4">{agent.bio || 'Dedicated real estate professional.'}</p>
                <a href={`https://wa.me/${agent.phone?.replace(/\D/g, '')}`} target="_blank" className="block w-full py-2 bg-[#1A1A1A] text-white rounded-xl text-sm hover:bg-[#C5A059] transition-colors">
                  Contact Advisor
                </a>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Book a Meeting Section ──────────────────────────────────────────── */}
      <section id="booking" className="py-16 sm:py-24 bg-[#FAFAFA] border-b border-[#EAEAEA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] text-xs font-semibold tracking-wider uppercase mb-4 border border-[#C5A059]/30">
            <Calendar className="w-4 h-4" />
            <span>Private Showing & Consultation</span>
          </div>

          <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#1A1A1A] mb-3">
            Schedule a Private Broker Consultation
          </h2>

          <p className="text-[#4A4A4A] text-sm sm:text-base max-w-xl mx-auto mb-9 leading-relaxed">
            Reserve an appointment slot that suits your schedule. Our senior real estate advisors will walk you through property portfolios, financing structures, or in-person viewings.
          </p>

          {org?.calendly_url ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#EAEAEA] shadow-xl max-w-2xl mx-auto flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">Automated Calendar Scheduling Ready</h3>
                <p className="text-xs text-[#4A4A4A] mt-1 max-w-md">
                  Book a direct 30-minute introductory meeting or property inspection through our scheduling portal.
                </p>
              </div>
              <a
                href={org.calendly_url}
                target="_blank"
                rel="noreferrer"
                className="py-3.5 px-8 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
              >
                <span>Open Booking Calendar</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#EAEAEA] shadow-xl max-w-2xl mx-auto flex flex-col items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A]">Flexible Appointments on Demand</h3>
                <p className="text-xs text-[#4A4A4A] mt-1 max-w-md">
                  We accommodate virtual video consultations and on-site visits 7 days a week. Connect via WhatsApp or send us an inquiry below to reserve your private slot.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={orgWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-6 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reserve via WhatsApp</span>
                </a>
                <a
                  href="#contact"
                  className="py-3 px-6 rounded-xl bg-[#FAFAFA] hover:bg-stone-100 border border-[#EAEAEA] text-[#1A1A1A] text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <span>Submit Inquiry Below</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact Us Form Section ─────────────────────────────────────────── */}
      <motion.section
        id="contact"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
        className="py-16 sm:py-24 bg-white"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] text-xs font-semibold tracking-wider uppercase mb-3 border border-[#C5A059]/30">
              <Mail className="w-4 h-4" />
              <span>Direct Communication</span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#1A1A1A]">
              Connect with Our Advisory Team
            </h2>
            <p className="text-[#4A4A4A] text-sm mt-2 max-w-lg mx-auto">
              Looking for a custom property match or have questions about a residence? Leave your message and our brokers will respond promptly.
            </p>
          </div>

          <div className="bg-[#FAFAFA] rounded-3xl border border-[#EAEAEA] shadow-xl p-6 sm:p-10">
            {leadSubmitted ? (
              <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-[#C5A059]/15 text-[#C5A059] rounded-full flex items-center justify-center mx-auto border border-[#C5A059]/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">
                  Thank You. Your Inquiry Has Been Transmitted.
                </h3>
                <p className="text-sm text-[#4A4A4A] max-w-md mx-auto leading-relaxed">
                  Your message has been safely logged with our brokerage team. A licensed representative will contact you via your preferred channel.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadSubmitted(false)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-white border border-[#EAEAEA] hover:bg-stone-50 text-[#1A1A1A] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {leadError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{leadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#1A1A1A]">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] text-sm outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all bg-white text-[#1A1A1A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#1A1A1A]">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="e.g. +1 555 123 4567"
                      className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] text-sm outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all bg-white text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="e.g. eleanor@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] text-sm outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all bg-white text-[#1A1A1A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1A1A1A]">Your Message or Inquired Property</label>
                  <textarea
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Share details regarding your preferred locations, budget, or specific listings..."
                    className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] text-sm outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all bg-white text-[#1A1A1A]"
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={submittingLead}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#C5A059] hover:bg-[#b08b46] text-white font-semibold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submittingLead ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Message…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Read-Only Property Detail Modal with 3D Tour ──────────────────────── */}
      <PublicPropertyModal
        property={selectedProperty}
        org={org}
        onClose={() => setSelectedProperty(null)}
      />

      {/* ── Customer Reviews Section ────────────────────────────────────────── */}
      <motion.section
        id="reviews"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
        className="py-20 sm:py-28 bg-[#141414] text-white border-t border-stone-800 relative overflow-hidden"
      >
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/15 text-[#C5A059] text-xs font-semibold tracking-wider uppercase mb-3 border border-[#C5A059]/30">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>Client Testimonials</span>
            </div>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">
              What Our Clients Say
            </h2>
            <p className="text-sm text-stone-400 mt-2 font-sans">
              Trusted by esteemed private buyers, institutional investors, and premier homeowners worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                text: "Hammad helped us find our dream home in DHA within 2 weeks. Highly recommended!",
                name: "Ali Raza",
                location: "DHA Resident & Investor",
              },
              {
                text: "The private advisory team was exceptional. Transparent title verification, instant 3D tours, and seamless transaction process from start to finish.",
                name: "Sarah Jenkins",
                location: "International Buyer",
              },
              {
                text: "Unmatched professionalism and access to off-market luxury estates. Their personalized attention gave us complete confidence throughout.",
                name: "Tariq Mansoor",
                location: "Commercial Developer",
              },
            ].map((review, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-7 sm:p-8 flex flex-col justify-between shadow-xl hover:border-[#C5A059]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-[#C5A059] fill-[#C5A059]" />
                    ))}
                  </div>
                  <p className="text-stone-300 text-sm sm:text-base leading-relaxed italic font-serif">
                    "{review.text}"
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#C5A059] to-[#E6C87A] flex items-center justify-center text-white font-serif font-bold text-sm shrink-0">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-white">{review.name}</h4>
                    <p className="text-[11px] text-stone-400">{review.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Luxury Footer ───────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-[#141414] text-stone-300 py-16 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-stone-800">
            {/* Brand column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-serif font-bold text-base text-white">{org?.name}</p>
                  <p className="text-xs text-stone-400">Exclusive Real Estate Portfolio</p>
                </div>
              </div>

              <p className="text-xs text-stone-400 max-w-sm leading-relaxed font-sans">
                {org?.about_text
                  ? org.about_text.slice(0, 160) + (org.about_text.length > 160 ? '…' : '')
                  : 'Premier real estate brokerage connecting clients with verified residential and commercial opportunities.'}
              </p>

              {/* Social Media Links */}
              <div className="flex items-center gap-3 pt-2">
                {org?.facebook_url && (
                  <a
                    href={org.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C5A059] text-stone-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Follow on Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}

                {org?.instagram_url && (
                  <a
                    href={org.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C5A059] text-stone-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Follow on Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}

                {org?.linkedin_url && (
                  <a
                    href={org.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#C5A059] text-stone-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}

                {cleanedOrgNumber && (
                  <a
                    href={orgWhatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-[#C5A059]/20 hover:bg-[#C5A059] text-[#C5A059] hover:text-white flex items-center justify-center transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#C5A059]">
                Portfolio Navigation
              </h4>
              <ul className="space-y-2 text-xs text-stone-300">
                <li>
                  <a href="#home" className="hover:text-white transition-colors">
                    Home Portal
                  </a>
                </li>
                <li>
                  <a href="#properties" className="hover:text-white transition-colors">
                    Curated Residences
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    About Our Agency
                  </a>
                </li>
                <li>
                  <a href="#booking" className="hover:text-white transition-colors">
                    Private Consultation
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact Us Form
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Summary */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#C5A059]">
                Direct Inquiries
              </h4>
              <div className="space-y-2 text-xs text-stone-300">
                {(org?.address) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span>{org.address}</span>
                  </p>
                )}
                {(org?.contact_email || org?.email) && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <a
                      href={`mailto:${org.contact_email || org.email}`}
                      className="hover:text-white underline underline-offset-2"
                    >
                      {org.contact_email || org.email}
                    </a>
                  </p>
                )}
                {(org?.contact_phone || org?.whatsapp_number) && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <a
                      href={`tel:${org.contact_phone || org.whatsapp_number}`}
                      className="hover:text-white"
                    >
                      {org.contact_phone || org.whatsapp_number}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
            <p>© {new Date().getFullYear()} {org?.name || 'Exclusive Agency'}. All rights reserved.</p>

            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold text-[#C5A059] tracking-wide">
                EstatePulse Pro
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot Component */}
      <AIChatBot properties={properties} orgName={org?.name} orgId={org?.id} />

    </div>
  );
};

export default PublicWebsitePage;

