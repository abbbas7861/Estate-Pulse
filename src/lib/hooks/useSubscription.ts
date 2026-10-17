/**
 * useSubscription.ts – Subscription Tier, 14-Day Free Trial & Lemon Squeezy Hook for EstatePulse.
 * Manages 14-Day Pro Free Trial, Pro ($49/mo), and Enterprise ($199/mo) quotas and Lemon Squeezy checkout.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

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
  free: {
    maxUsers: 1,
    maxLeads: 50,
    maxProperties: 10,
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
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [lemonSqueezyCustomerId, setLemonSqueezyCustomerId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_tier, lemonsqueezy_customer_id, stripe_customer_id, subscription_status, trial_ends_at')
        .eq('id', orgId)
        .single();

      if (!error && data) {
        const rawTier = (data.subscription_tier || 'free').toLowerCase() as SubscriptionTier;
        if (['free', 'pro', 'enterprise'].includes(rawTier)) {
          setTier(rawTier);
        } else {
          setTier('free');
        }
        setLemonSqueezyCustomerId(data.lemonsqueezy_customer_id || data.stripe_customer_id || null);
        setSubscriptionStatus(data.subscription_status || 'active');
        setTrialEndsAt(data.trial_ends_at || null);
      }
    } catch (err) {
      console.warn('[useSubscription] Error fetching org subscription, defaulting to free:', err);
      setTier('free');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ── 14-Day Free Trial Calculation ──────────────────────────────────────────
  const trialEndDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const isTrialActive =
    tier === 'free' &&
    trialEndDate !== null &&
    trialEndDate.getTime() > Date.now();

  const isTrialExpired =
    tier === 'free' &&
    (!trialEndDate || trialEndDate.getTime() <= Date.now());

  const trialDaysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // If trial is active, grant full Pro limits; if trial expired on free tier, lock premium features.
  const isLocked = isTrialExpired && tier === 'free';
  const effectiveTier: SubscriptionTier = isTrialActive ? 'pro' : tier;
  const limits = isLocked
    ? {
        maxUsers: 0,
        maxLeads: 0,
        maxProperties: 0,
        hasAiInsights: false,
        hasPrioritySupport: false,
        hasCustomBranding: false,
        hasBulkExport: false,
      }
    : TIER_LIMITS[effectiveTier] || TIER_LIMITS.free;

  const canCreateLead = (currentCount: number): boolean => {
    if (isLocked) return false;
    return currentCount < limits.maxLeads;
  };

  const canCreateProperty = (currentCount: number): boolean => {
    if (isLocked) return false;
    return currentCount < limits.maxProperties;
  };

  /**
   * Triggers checkout session via Supabase Edge Function to Lemon Squeezy
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
        // Dev fallback simulation
        setTier(targetTier);
        return data;
      }

      throw new Error(error?.message || 'Billing is not set up yet. Please contact support to upgrade.');
    } catch (err: any) {
      console.error('[startCheckout] Error:', err);
      throw err;
    }
  };

  /**
   * Opens the Lemon Squeezy Customer Portal
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

      // Default Lemon Squeezy buyer portal
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
    trialEndsAt,
    isTrialActive,
    isTrialExpired,
    trialDaysRemaining,
    isLocked,
    isFree: tier === 'free',
    isPro: effectiveTier === 'pro',
    isEnterprise: tier === 'enterprise',
    canCreateLead,
    canCreateProperty,
    canUseAiInsights: limits.hasAiInsights,
    refetch: fetchSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
