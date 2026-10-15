/**
 * useLeadPropertyMatches.ts – Auto-Mapper Hook scoring properties against lead criteria.
 * Tries the Supabase match_leads_to_properties RPC with client-side fallback.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lead, Property, PropertyMatch } from '../../types/crm';

export function calculatePropertyMatchScore(lead: Lead, prop: Property): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Budget Score (+40 points)
  if (lead.budgetAmount > 0 && prop.price > 0) {
    const diffRatio = Math.abs(prop.price - lead.budgetAmount) / lead.budgetAmount;
    if (diffRatio <= 0.10) {
      score += 40;
      reasons.push('Price within 10% of budget (+40 pts)');
    } else if (diffRatio <= 0.25) {
      score += 25;
      reasons.push('Price within 25% of budget (+25 pts)');
    } else if (diffRatio <= 0.50) {
      score += 10;
      reasons.push('Price within 50% of budget (+10 pts)');
    } else {
      score += 5;
    }
  } else {
    score += 20;
    reasons.push('Baseline budget compatibility (+20 pts)');
  }

  // 2. Location / Target Property Score (+30 points)
  const targetLower = (lead.targetProperty || '').toLowerCase();
  const locationLower = (prop.location || prop.address || '').toLowerCase();
  const titleLower = (prop.title || '').toLowerCase();
  const cityLower = (prop.city || '').toLowerCase();

  if (targetLower && (titleLower.includes(targetLower) || locationLower.includes(targetLower))) {
    score += 30;
    reasons.push('Direct location match (+30 pts)');
  } else if (targetLower && (cityLower.includes(targetLower.split(' ')[0]) || locationLower.includes('beverly hills') || locationLower.includes('los angeles'))) {
    score += 20;
    reasons.push('Regional location fit (+20 pts)');
  } else {
    score += 15;
    reasons.push('Broad market relevance (+15 pts)');
  }

  // 3. Size / Luxury Fit (+30 points)
  if (prop.sqft >= 3500 || prop.beds >= 4) {
    score += 30;
    reasons.push('High square footage (>3,500 sqft) (+30 pts)');
  } else if (prop.sqft >= 2000 || prop.beds >= 3) {
    score += 20;
    reasons.push('Spacious floorplan (+20 pts)');
  } else {
    score += 15;
    reasons.push('Standard floorplan (+15 pts)');
  }

  return { score: Math.min(100, score), reasons };
}

export function useLeadPropertyMatches(orgId: string | null, lead: Lead | null, availableProperties: Property[] = []) {
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!orgId || !lead) {
      setMatches([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function computeMatches() {
      try {
        // 1. Try Supabase RPC
        const { data, error } = await supabase.rpc('match_leads_to_properties', {
          p_org_id: orgId,
          p_lead_id: lead?.id,
        });

        if (!error && data && data.length > 0 && isMounted) {
          setMatches(data as PropertyMatch[]);
          setLoading(false);
          return;
        }
      } catch {
        // Fall back to client calculation
      }

      // 2. Client-side scoring fallback using available properties
      if (isMounted && lead) {
        const scored: PropertyMatch[] = availableProperties.map((prop) => {
          const { score, reasons } = calculatePropertyMatchScore(lead, prop);
          return {
            property_id: prop.id,
            score,
            match_reasons: reasons,
            title: prop.title,
            mls_id: prop.mlsId,
            price: prop.price,
            price_formatted: prop.priceFormatted,
            address: prop.location || prop.address || '',
            type: prop.type,
            beds: prop.beds,
            baths: prop.baths,
            sqft: prop.sqft,
            image_url: prop.imageUrl,
          };
        });

        scored.sort((a, b) => b.score - a.score);
        setMatches(scored.slice(0, 3));
        setLoading(false);
      }
    }

    computeMatches();

    return () => {
      isMounted = false;
    };
  }, [orgId, lead, availableProperties]);

  return { matches, loading };
}
