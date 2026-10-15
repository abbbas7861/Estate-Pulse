/**
 * useProperties.ts – Realtime Property CRUD Hook for EstatePulse.
 * Handles listings and database sync matching the schema with Option A columns:
 * id, org_id, title, description, price, location, address, type, images, status, beds, baths, sqft, broker_name, created_at.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Property, PropertyStatus, PropertyAmenity, PropertyType } from '../../types/crm';
import { useAuth } from '../useAuth';

function mapRowToProperty(
  row: any,
  amenities: PropertyAmenity[] = [],
  fallbackBrokerName: string = 'Unassigned',
  fallbackBrokerInitials: string = 'UA'
): Property {
  const price = Number(row.price) || 0;
  const sqft = Number(row.sqft) || 0;
  const beds = Number(row.beds) || 0;
  const baths = Number(row.baths) || 0;

  const images = Array.isArray(row.images) && row.images.length > 0
    ? row.images
    : (row.image_url ? [row.image_url] : []);

  const primaryImage = images[0] || row.image_url || '';
  const brokerName = row.broker_name || fallbackBrokerName;
  const brokerInitials = row.broker_initials || fallbackBrokerInitials;
  const location = row.location || row.address || '';

  return {
    id: row.id,
    orgId: row.org_id,
    mlsId: row.mls_number || row.mls_id || `MLS #BH-${String(row.id || '').slice(0, 4)}-24`,
    title: row.title || 'Untitled Property',
    location,
    address: location,
    city: row.city || (location.includes(',') ? location.split(',').slice(-2, -1)[0]?.trim() : 'Beverly Hills'),
    price,
    priceFormatted: row.price_formatted || (price > 0 ? `$${price.toLocaleString('en-US')}` : '$0'),
    previousPriceFormatted: row.previous_price_formatted,
    status: (row.status as PropertyStatus) || 'Active Listing',
    type: (row.type as PropertyType) || 'Residential',
    beds,
    baths,
    sqft,
    sqftFormatted: row.sqft_formatted || (sqft > 0 ? sqft.toLocaleString('en-US') : '0'),
    highlightLabel: row.highlight_label || (beds > 0 ? `${beds} Beds` : 'Feature'),
    highlightValue: row.highlight_value || (sqft > 0 ? `${sqft.toLocaleString()} sqft` : 'Luxury'),
    imageUrl: primaryImage,
    images,
    amenities,
    brokerName,
    brokerInitials,
    brokerAvatarUrl: row.broker_avatar_url,
    views: Number(row.views) || 0,
    inquiries: Number(row.inquiries) || 0,
    isFavorite: !!row.is_favorite,
    description: row.description || '',
  };
}

export function useProperties(orgId: string | null) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const authBrokerName = user?.user_metadata?.full_name || 'Unassigned';
  const authBrokerInitials = authBrokerName !== 'Unassigned'
    ? authBrokerName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'UA';

  const propertiesRef = useRef<Property[]>(properties);
  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  // ── Fetch Properties ─────────────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    if (!orgId) {
      setProperties([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch properties matching org_id
      const { data: propData, error: propErr } = await supabase
        .from('properties')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (propErr) throw propErr;

      // 2. Fetch amenities if table exists (graceful fallback)
      const propertyIds = (propData || []).map((p) => p.id);
      let amenitiesByPropId: Record<string, PropertyAmenity[]> = {};

      if (propertyIds.length > 0) {
        try {
          const { data: amenData } = await supabase
            .from('property_amenities')
            .select('*')
            .in('property_id', propertyIds);

          if (amenData) {
            amenData.forEach((a: any) => {
              if (!amenitiesByPropId[a.property_id]) {
                amenitiesByPropId[a.property_id] = [];
              }
              amenitiesByPropId[a.property_id].push({
                id: a.id,
                property_id: a.property_id,
                group_name: a.group_name,
                sub_group_name: a.sub_group_name,
              });
            });
          }
        } catch {
          // If property_amenities not present, proceed cleanly
        }
      }

      const mapped = (propData || []).map((p) =>
        mapRowToProperty(p, amenitiesByPropId[p.id] || [], authBrokerName, authBrokerInitials)
      );

      setProperties(mapped);
    } catch (err: any) {
      console.error('[useProperties] fetch error:', err);
      setError(err?.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, [orgId, authBrokerName, authBrokerInitials]);

  // ── Realtime Subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) {
      setProperties([]);
      setLoading(false);
      setError(null);
      return;
    }

    fetchProperties();

    const channel = supabase
      .channel(`properties-realtime-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties', filter: `org_id=eq.${orgId}` },
        () => {
          fetchProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchProperties]);

  // ── Create Property ──────────────────────────────────────────────────────────
  const createProperty = async (
    data: Partial<Property>
  ): Promise<{ data: Property | null; error: Error | null }> => {
    if (!orgId) {
      return { data: null, error: new Error('No active organization. Please sign in again.') };
    }

    try {
      const price = Number(data.price) || 0;
      const sqft = Number(data.sqft) || 0;
      const beds = Number(data.beds) || 0;
      const baths = Number(data.baths) || 0;
      const images = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : (data.imageUrl ? [data.imageUrl] : []);

      const brokerName = data.brokerName || authBrokerName;
      const locationVal = (data.location || data.address || '').trim();

      // Payload contains only valid schema columns
      const payload: Record<string, any> = {
        org_id: orgId,
        title: data.title?.trim() || 'New Luxury Listing',
        description: data.description || '',
        price,
        location: locationVal,
        address: locationVal,
        type: data.type || 'Residential',
        images,
        status: data.status || 'Active Listing',
        beds,
        baths,
        sqft,
        broker_name: brokerName,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('properties')
        .insert(payload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Insert amenities if provided and table exists
      let savedAmenities: PropertyAmenity[] = [];
      if (data.amenities && data.amenities.length > 0) {
        try {
          const amenityRows = data.amenities.map((a) => ({
            org_id: orgId,
            property_id: inserted.id,
            group_name: a.group_name.trim(),
            sub_group_name: a.sub_group_name.trim(),
          }));

          const { data: amenData } = await supabase
            .from('property_amenities')
            .insert(amenityRows)
            .select();

          if (amenData) {
            savedAmenities = amenData.map((a: any) => ({
              id: a.id,
              property_id: a.property_id,
              group_name: a.group_name,
              sub_group_name: a.sub_group_name,
            }));
          }
        } catch (amenErr) {
          console.warn('Amenities insert warning:', amenErr);
        }
      }

      const newProperty = mapRowToProperty(inserted, savedAmenities, authBrokerName, authBrokerInitials);
      setProperties((prev) => [newProperty, ...prev]);

      return { data: newProperty, error: null };
    } catch (err: any) {
      console.error('[useProperties] createProperty error:', err);
      return { data: null, error: err };
    }
  };

  // ── Update Property ──────────────────────────────────────────────────────────
  const updateProperty = async (
    id: string,
    updates: Partial<Property>
  ): Promise<{ error: Error | null }> => {
    if (!orgId) {
      return { error: new Error('No active organization. Please sign in again.') };
    }

    // Optimistic local update
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    const previous = [...propertiesRef.current];

    try {
      const dbPayload: any = {};
      if (updates.title !== undefined) dbPayload.title = updates.title;
      if (updates.description !== undefined) dbPayload.description = updates.description;
      if (updates.price !== undefined) dbPayload.price = Number(updates.price) || 0;
      if (updates.location !== undefined) {
        dbPayload.location = updates.location;
        dbPayload.address = updates.location;
      } else if (updates.address !== undefined) {
        dbPayload.address = updates.address;
        dbPayload.location = updates.address;
      }
      if (updates.type !== undefined) dbPayload.type = updates.type;
      if (updates.images !== undefined) dbPayload.images = updates.images;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.beds !== undefined) dbPayload.beds = Number(updates.beds) || 0;
      if (updates.baths !== undefined) dbPayload.baths = Number(updates.baths) || 0;
      if (updates.sqft !== undefined) dbPayload.sqft = Number(updates.sqft) || 0;
      if (updates.brokerName !== undefined) dbPayload.broker_name = updates.brokerName;

      const { error: updateErr } = await supabase
        .from('properties')
        .update(dbPayload)
        .eq('id', id)
        .eq('org_id', orgId);

      if (updateErr) throw updateErr;

      // Update amenities if provided
      if (updates.amenities !== undefined) {
        try {
          await supabase.from('property_amenities').delete().eq('property_id', id);

          if (updates.amenities.length > 0) {
            const rows = updates.amenities.map((a) => ({
              org_id: orgId,
              property_id: id,
              group_name: a.group_name.trim(),
              sub_group_name: a.sub_group_name.trim(),
            }));
            await supabase.from('property_amenities').insert(rows);
          }
        } catch (amenErr) {
          console.warn('Amenities update warning:', amenErr);
        }
      }

      return { error: null };
    } catch (err: any) {
      console.error('[useProperties] updateProperty error, rolling back:', err);
      setProperties(previous);
      return { error: err };
    }
  };

  // ── Delete Property ──────────────────────────────────────────────────────────
  const deleteProperty = async (id: string): Promise<{ error: Error | null }> => {
    if (!orgId) {
      return { error: new Error('No active organization. Please sign in again.') };
    }

    const previous = [...propertiesRef.current];
    setProperties((prev) => prev.filter((p) => p.id !== id));

    try {
      const { error: delErr } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (delErr) throw delErr;
      return { error: null };
    } catch (err: any) {
      console.error('[useProperties] deleteProperty error, rolling back:', err);
      setProperties(previous);
      return { error: err };
    }
  };

  return {
    properties,
    setProperties,
    loading,
    error,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}
