/**
 * PropertyFormModal.tsx – Comprehensive Add & Edit Property Listing Modal.
 * Includes dynamic Amenities group/sub-group builder and Supabase Storage image uploader.
 * 
 * FIX:
 *   - Uses `location` and `address` fields interchangeably.
 *   - Placeholders, currency and area units come from src/config/regional.ts.
 *   - Supports beds, baths, sqft, price, status, type, description, images.
 *   - Resets state cleanly when modal opens for a new property.
 */
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { Property, PropertyStatus, PropertyType, PropertyAmenity } from '../../types/crm';
import { PropertyImageUpload } from '../Upload/PropertyImageUpload';
import { REGION, AreaUnit, areaUnitLabel, convertArea, fromSqft, toSqft } from '../../config/regional';

interface PropertyFormModalProps {
  isOpen: boolean;
  property?: Property | null; // if provided, editing mode
  orgId?: string | null;
  onClose: () => void;
  onSubmit: (propData: Partial<Property>) => Promise<void>;
}

const PROPERTY_TYPES: PropertyType[] = [
  'Residential',
  'Commercial',
  'Plot',
  'Shop',
  'Building',
  'Penthouse',
  'Villa / Craftsman',
];

const PROPERTY_STATUSES: PropertyStatus[] = [
  'Active Listing',
  'Pending Escrow',
  'Price Improvement',
  'Under Offer',
  'Coming Soon',
];

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  property,
  orgId,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('Active Listing');
  const [type, setType] = useState<PropertyType | ''>('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [sqft, setSqft] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(REGION.areaUnit);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<PropertyAmenity[]>([]);

  // Amenity input fields
  const [newGroup, setNewGroup] = useState('');
  const [newSubGroup, setNewSubGroup] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (property) {
        setTitle(property.title || '');
        setLocation(property.location || property.address || '');
        setPrice(property.price ? String(property.price) : '');
        setStatus(property.status || 'Active Listing');
        setType(property.type || '');
        setBeds(property.beds ? String(property.beds) : '');
        setBaths(property.baths ? String(property.baths) : '');
        setSqft(property.sqft ? String(fromSqft(property.sqft, REGION.areaUnit)) : '');
        setAreaUnit(REGION.areaUnit);
        setDescription(property.description || '');
        setImages(property.images || (property.imageUrl ? [property.imageUrl] : []));
        setAmenities(property.amenities || []);
      } else {
        // Clean, empty state — no pre-filled fake data
        setTitle('');
        setLocation('');
        setPrice('');
        setStatus('Active Listing');
        setType('');
        setBeds('');
        setBaths('');
        setSqft('');
        setAreaUnit(REGION.areaUnit);
        setDescription('');
        setImages([]);
        setAmenities([]);
        setNewGroup('');
        setNewSubGroup('');
      }
    }
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleAreaUnitChange = (next: AreaUnit) => {
    const typed = Number(sqft);
    if (typed > 0) setSqft(String(convertArea(typed, areaUnit, next)));
    setAreaUnit(next);
  };

  const handleAddAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim() || !newSubGroup.trim()) return;

    setAmenities((prev) => [
      ...prev,
      { group_name: newGroup.trim(), sub_group_name: newSubGroup.trim() },
    ]);
    setNewSubGroup('');
  };

  const handleRemoveAmenity = (idx: number) => {
    setAmenities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const numPrice = Number(price) || 0;
    const numSqft = toSqft(Number(sqft) || 0, areaUnit); // database always stores square feet

    const payload: Partial<Property> = {
      title: title.trim(),
      description: description.trim(),
      price: numPrice,
      location: location.trim(),
      address: location.trim(),
      type: (type || 'Residential') as PropertyType,
      beds: Number(beds) || 0,
      baths: Number(baths) || 0,
      sqft: numSqft,
      status,
      images,
      amenities,
    };

    await onSubmit(payload);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0b1c30] to-[#122b48] px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">
              {property ? 'Edit Property Listing' : 'Add New Property Listing'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Sync with MLS Inventory, configure visual assets, and define custom amenities.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Photos Upload */}
          <div>
            <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-2">
              Property Gallery &amp; Imagery (Supabase Storage)
            </label>
            <PropertyImageUpload images={images} onChange={setImages} orgId={orgId} />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Property Title *
              </label>
              <input
                type="text"
                required
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${REGION.examples.title}`}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Property Location / Address *
              </label>
              <input
                type="text"
                required
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={`e.g. ${REGION.examples.address}`}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Listing Price ({REGION.currency}) *
              </label>
              <input
                type="number"
                required
                name="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={`e.g. ${REGION.examples.price}`}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Property Type
              </label>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 cursor-pointer"
              >
                <option value="">Select Property Type…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Listing Status
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 cursor-pointer font-semibold"
              >
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Area ({areaUnitLabel(areaUnit)})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="sqft"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder={`e.g. ${REGION.examples.area}`}
                  className="w-full min-w-0 bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 font-mono"
                />
                <select
                  aria-label="Area unit"
                  value={areaUnit}
                  onChange={(e) => handleAreaUnitChange(e.target.value as AreaUnit)}
                  className="bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-2.5 text-sm text-[#0b1c30] cursor-pointer"
                >
                  {REGION.areaUnits.map((u) => (
                    <option key={u} value={u}>
                      {areaUnitLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                name="beds"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="e.g. 4"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Bathrooms
              </label>
              <input
                type="text"
                name="baths"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#6e7a73] uppercase tracking-wider mb-1">
                Public MLS Description
              </label>
              <textarea
                rows={3}
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of architectural finishes, panoramic views, and private security features..."
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Dynamic Amenities System */}
          <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#005d42] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Property Amenities System
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Group features dynamically (e.g., Living Area → Lawn View).
                </p>
              </div>
            </div>

            {/* Existing Amenities List */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {amenities.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No amenities added yet.</span>
              ) : (
                amenities.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#005d42] bg-[#99efe5]/40 px-2 py-0.5 rounded">
                        {a.group_name}
                      </span>
                      <span className="text-slate-600 font-medium">{a.sub_group_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Amenity Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Group (e.g. Bedroom)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={newSubGroup}
                  onChange={(e) => setNewSubGroup(e.target.value)}
                  placeholder="Sub-group (e.g. Walk-in Closet)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="w-full bg-[#005d42] hover:bg-[#004d37] text-white rounded-lg py-1.5 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#005d42] hover:bg-[#004d37] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving listing…' : property ? 'Update Property' : 'Publish to MLS Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
