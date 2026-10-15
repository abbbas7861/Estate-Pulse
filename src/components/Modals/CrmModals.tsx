import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useOrgUsers } from '../../lib/hooks/useOrgUsers';
import { Lead, LeadStage, Property, PropertyStatus, PropertyType } from '../../types/crm';

interface AddLeadModalProps {
  isOpen: boolean;
  defaultStage: LeadStage;
  orgId?: string | null;
  onClose: () => void;
  onAddLead: (newLead: Lead) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  defaultStage,
  orgId,
  onClose,
  onAddLead,
}) => {
  const { users: orgUsers } = useOrgUsers(orgId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Website Direct Form');
  const [targetProperty, setTargetProperty] = useState('');
  const [budget, setBudget] = useState('');
  const [stage, setStage] = useState<LeadStage>(defaultStage);
  const [brokerId, setBrokerId] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numericBudget = budget.trim() ? Number(budget.replace(/[^0-9]/g, '')) || 0 : 0;
    const selectedBroker = orgUsers.find((b) => b.id === brokerId);

    // FIX #25: Require real email/phone or set empty string. Never synthesize fake contact details.
    const cleanEmail = email.trim() || '';
    const cleanPhone = phone.trim() || '';

    const created: Lead = {
      id: `lead-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      source,
      timeAgo: 'Just now',
      stage,
      targetProperty: targetProperty.trim() || 'General Portfolio',
      budgetLabel: 'Budget',
      budgetAmount: numericBudget,
      budgetFormatted: numericBudget > 0 ? `$${numericBudget.toLocaleString('en-US')}` : '$0',
      assignedTo: selectedBroker ? selectedBroker.id : null,
      brokerId: selectedBroker ? selectedBroker.id : null,
      brokerName: selectedBroker ? selectedBroker.full_name : '',
      brokerInitials: selectedBroker ? selectedBroker.initials : '',
      brokerAvatarUrl: selectedBroker?.avatar_url,
      note: note.trim() || undefined,
      noteType: note.trim() ? 'info' : undefined,
      isHighValue: numericBudget >= 1000000,
      isDirectInbound: source === 'Website Direct Form' || source === 'Direct Inbound',
    };

    onAddLead(created);
    setName('');
    setEmail('');
    setPhone('');
    setTargetProperty('');
    setBudget('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-[#0b1c30]">
              Add New Client Lead
            </h2>
            <p className="text-[12px] text-[#3e4943]">
              Enter buyer qualification details to sync with the active acquisition funnel
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Client Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jonathan & Maya Sterling"
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[13px] text-[#0b1c30] outline-none"
              >
                <option value="Website Direct Form">Website Direct Form</option>
                <option value="Zillow Premier">Zillow Premier</option>
                <option value="Referral - Broker">Referral - Broker</option>
                <option value="Open House QR">Open House QR</option>
                <option value="Realtor.com">Realtor.com</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (310) 555-0194"
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Target Property / Interest
              </label>
              <input
                type="text"
                value={targetProperty}
                onChange={(e) => setTargetProperty(e.target.value)}
                placeholder="e.g. Beverly Hills Modern Villa"
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Pre-Approved Budget (USD)
              </label>
              <input
                type="number"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 2500000"
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30] font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Funnel Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[13px] text-[#0b1c30] outline-none"
              >
                <option value="assigned">Assigned</option>
                <option value="awareness">Awareness</option>
                <option value="contacted">Contacted</option>
                <option value="touring">Private Touring</option>
                <option value="negotiation">Offer &amp; Escrow</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Assign Broker
              </label>
              <select
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[13px] text-[#0b1c30] outline-none"
              >
                <option value="">Auto-Assign via Round-Robin</option>
                {orgUsers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name} ({b.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
              Consultation / Showing Notes (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Requested floorplans & private twilight tour"
              className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] border border-transparent focus:border-[#047857] outline-none text-[13px] text-[#0b1c30]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Save Lead to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ManagePropertyModalProps {
  property: Property | null;
  onClose: () => void;
  onUpdateStatus: (propertyId: string, newStatus: PropertyStatus, newPrice?: number) => void;
}

export const ManagePropertyModal: React.FC<ManagePropertyModalProps> = ({
  property,
  onClose,
  onUpdateStatus,
}) => {
  const [status, setStatus] = useState<PropertyStatus>(
    property?.status || 'Active Listing'
  );
  const [price, setPrice] = useState<string>(property ? String(property.price) : '');

  React.useEffect(() => {
    if (property) {
      setStatus(property.status);
      setPrice(String(property.price));
    }
  }, [property]);

  if (!property) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(price) || property.price;
    onUpdateStatus(property.id, status, numericPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="relative h-48 bg-[#0b1c30]">
          {property.imageUrl ? (
            <img
              src={property.imageUrl}
              alt={property.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-900">
              No Preview Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-5 right-5 text-white">
            <span className="font-mono text-[11px] text-[#97f5cc]">{property.mlsId}</span>
            <h2 className="font-display font-bold text-xl">{property.title}</h2>
            <p className="text-[12px] text-slate-200">{property.address}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          {property.description && (
            <p className="text-[13px] text-[#3e4943] leading-relaxed bg-[#eff4ff] p-3.5 rounded-xl">
              {property.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                MLS Listing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[13px] text-[#0b1c30] outline-none"
              >
                <option value="Active Listing">Active Listing</option>
                <option value="Pending Escrow">Pending Escrow</option>
                <option value="Price Improvement">Price Improvement</option>
                <option value="Under Offer">Under Offer</option>
                <option value="Coming Soon">Coming Soon</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#0b1c30] mb-1">
                Listed Price (USD)
              </label>
              <input
                type="number"
                step="25000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#eff4ff] text-[13px] text-[#0b1c30] font-mono tabular-nums outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] text-[13px] font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold cursor-pointer"
            >
              Update Listing Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
