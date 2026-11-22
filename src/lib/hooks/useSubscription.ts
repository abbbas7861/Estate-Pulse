/**
 * useSubscription.ts – Sales-Led Subscription & Gating Hook for EstatePulse.
 * Under the Sales-Led model, organizations are 'locked' by default.
 * Access is granted when subscription_tier is 'pro' or 'enterprise'.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type SubscriptionTier = 'locked' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxUsers: number;
  maxLeads: number;
  maxProperties: number;
  hasAiInsights: boolean;
  hasPrioritySupport: boolean;
  hasCustomBranding: boolean;
  hasBulkExport: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  locked: {
    maxUsers: 0,
    maxLeads: 0,
    maxProperties: 0,
    hasAiInsights: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
    hasBulkExport: false,
  },
  pro: {
    maxUsers: 5,
    maxLeads: 1000,
    maxProperties: 999999, // Unlimited
    hasAiInsights: true,
    hasPrioritySupport: false,
    hasCustomBranding: false,
    hasBulkExport: true,
  },
  enterprise: {
    maxUsers: 999999, // Unlimited
    maxLeads: 999999, // Unlimited
    maxProperties: 999999, // Unlimited
    hasAiInsights: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
    hasBulkExport: true,
  },
};

export function useSubscription(orgId: string | null) {
  const [tier, setTier] = useState<SubscriptionTier>('locked');
  const [loading, setLoading] = useState(true);
  const [lemonSqueezyCustomerId, setLemonSqueezyCustomerId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('locked');

  const fetchSubscription = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_tier, lemonsqueezy_customer_id, stripe_customer_id, subscription_status')
        .eq('id', orgId)
        .single();

      if (!error && data) {
        const rawTier = (data.subscription_tier || 'locked').toLowerCase();
        if (rawTier === 'pro' || rawTier === 'enterprise') {
          setTier(rawTier as SubscriptionTier);
        } else {
          setTier('locked');
        }
        setLemonSqueezyCustomerId(data.lemonsqueezy_customer_id || data.stripe_customer_id || null);
        setSubscriptionStatus(data.subscription_status || (rawTier === 'pro' || rawTier === 'enterprise' ? 'active' : 'locked'));
      } else {
        setTier('locked');
      }
    } catch (err) {
      console.warn('[useSubscription] Error fetching org subscription, defaulting to locked:', err);
      setTier('locked');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Sales-Led: isLocked is simply subscription_tier === 'locked'
  const isLocked = tier === 'locked';
  const effectiveTier: SubscriptionTier = tier;
  const limits = isLocked ? TIER_LIMITS.locked : TIER_LIMITS[effectiveTier] || TIER_LIMITS.locked;

  const canCreateLead = (currentCount: number): boolean => {
    if (isLocked) return false;
    return currentCount < limits.maxLeads;
  };

  const canCreateProperty = (currentCount: number): boolean => {
    if (isLocked) return false;
    return currentCount < limits.maxProperties;
  };

  /**
   * Triggers checkout session or contact action
   */
  const startCheckout = async (targetTier: 'pro' | 'enterprise') => {
    if (!orgId) throw new Error('Organization not found.');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier: targetTier,
          orgId,
          returnUrl: window.location.origin,
        },
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return data;
      }

      if (data?.simulated) {
        setTier(targetTier);
        return data;
      }

      throw new Error(error?.message || 'Please contact support@propertycrm.net to complete your purchase.');
    } catch (err: any) {
      console.error('[startCheckout] Error:', err);
      throw err;
    }
  };

  /**
   * Opens the Customer Portal if customer ID exists
   */
  const openCustomerPortal = async () => {
    if (!orgId) throw new Error('Organization not found.');

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          orgId,
          returnUrl: window.location.origin,
        },
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return;
      }

      window.open('https://app.lemonsqueezy.com/my-orders', '_blank');
    } catch (err: any) {
      console.error('[openCustomerPortal] Error:', err);
      window.open('https://app.lemonsqueezy.com/my-orders', '_blank');
    }
  };

  return {
    tier,
    effectiveTier,
    loading,
    limits,
    lemonSqueezyCustomerId,
    subscriptionStatus,
    isLocked,
    isFree: tier === 'locked',
    isPro: tier === 'pro',
    isEnterprise: tier === 'enterprise',
    // Stubs for backward compatibility
    trialEndsAt: null,
    isTrialActive: false,
    isTrialExpired: false,
    trialDaysRemaining: 0,
    canCreateLead,
    canCreateProperty,
    canUseAiInsights: limits.hasAiInsights,
    refetch: fetchSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
