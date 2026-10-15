/**
 * useSubscription.ts – Subscription Tier & Feature Gating Hook for EstatePulse.
 * Manages Free, Pro ($49/mo), and Enterprise ($199/mo) quotas and Stripe checkout.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { loadStripe } from '@stripe/stripe-js';

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
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('active');

  const fetchSubscription = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_tier, stripe_customer_id, subscription_status')
        .eq('id', orgId)
        .single();

      if (!error && data) {
        const rawTier = (data.subscription_tier || 'free').toLowerCase() as SubscriptionTier;
        if (['free', 'pro', 'enterprise'].includes(rawTier)) {
          setTier(rawTier);
        } else {
          setTier('free');
        }
        setStripeCustomerId(data.stripe_customer_id || null);
        setSubscriptionStatus(data.subscription_status || 'active');
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

  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const canCreateLead = (currentCount: number): boolean => {
    return currentCount < limits.maxLeads;
  };

  const canCreateProperty = (currentCount: number): boolean => {
    return currentCount < limits.maxProperties;
  };

  /**
   * Triggers checkout session via Supabase Edge Function or direct Stripe session
   */
  const startCheckout = async (targetTier: 'pro' | 'enterprise') => {
    if (!orgId) throw new Error('Organization not found.');

    try {
      // 1. Try Supabase Edge Function create-checkout-session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier: targetTier,
          orgId,
          returnUrl: window.location.origin,
        },
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return;
      }

      // 2. Direct Stripe Checkout fallback if edge function is deploying
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (publishableKey && data?.sessionId) {
        const stripe = await loadStripe(publishableKey);
        await (stripe as any)?.redirectToCheckout({ sessionId: data.sessionId });
        return;
      }

      // 3. Fallback: simulate immediate upgrade for development/testing if no live Stripe key configured
      if (!publishableKey && (!data || error)) {
        await supabase
          .from('organizations')
          .update({ subscription_tier: targetTier, subscription_status: 'active' })
          .eq('id', orgId);
        setTier(targetTier);
        return { simulated: true };
      }

      throw new Error(error?.message || 'Failed to initialize checkout session.');
    } catch (err: any) {
      console.error('[startCheckout] Error:', err);
      throw err;
    }
  };

  /**
   * Opens the Stripe Customer Portal
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

      throw new Error(error?.message || 'Unable to open Stripe Customer Portal.');
    } catch (err: any) {
      console.error('[openCustomerPortal] Error:', err);
      throw err;
    }
  };

  return {
    tier,
    loading,
    limits,
    stripeCustomerId,
    subscriptionStatus,
    isFree: tier === 'free',
    isPro: tier === 'pro',
    isEnterprise: tier === 'enterprise',
    canCreateLead,
    canCreateProperty,
    canUseAiInsights: limits.hasAiInsights,
    refetch: fetchSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
