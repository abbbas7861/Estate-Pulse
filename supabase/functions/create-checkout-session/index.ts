/**
 * create-checkout-session — EstatePulse Lemon Squeezy Edge Function
 *
 * Accepts:
 *   { tier, orgId, returnUrl, userEmail?, planVariantId? }
 *
 * planVariantId: if provided by caller, used directly (overrides env-based variant lookup).
 * userEmail:     pre-fills buyer email on the Lemon Squeezy checkout page.
 *
 * Required env vars for live mode:
 *   LEMONSQUEEZY_API_KEY
 *   LEMONSQUEEZY_STORE_ID
 *   LEMONSQUEEZY_PRO_VARIANT_ID
 *   LEMONSQUEEZY_ENTERPRISE_VARIANT_ID
 *   APP_URL  (optional fallback for redirect)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Destructure all supported fields from request body
    const { tier, orgId, returnUrl, userEmail, planVariantId } = await req.json();

    // ── Validate required fields ──────────────────────────────────────────────
    if (!tier || !orgId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tier, orgId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetTier = String(tier).toLowerCase();
    if (!['pro', 'enterprise'].includes(targetTier)) {
      return new Response(
        JSON.stringify({ error: `Invalid tier "${targetTier}". Must be "pro" or "enterprise".` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch organization ────────────────────────────────────────────────────
    const { data: org, error: orgErr } = await supabaseClient
      .from('organizations')
      .select('id, name, lemonsqueezy_customer_id, subscription_tier')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appReturnUrl = returnUrl || Deno.env.get('APP_URL') || 'http://localhost:5173';

    // ── Lemon Squeezy credentials ─────────────────────────────────────────────
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');
    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID');
    const proVariantId = Deno.env.get('LEMONSQUEEZY_PRO_VARIANT_ID');
    const enterpriseVariantId = Deno.env.get('LEMONSQUEEZY_ENTERPRISE_VARIANT_ID');

    // Caller can pass planVariantId directly; otherwise resolve from env
    const resolvedVariantId: string | undefined =
      planVariantId ||
      (targetTier === 'enterprise' ? enterpriseVariantId : proVariantId);

    // ── Live checkout ─────────────────────────────────────────────────────────
    if (apiKey && storeId && resolvedVariantId) {
      // Build checkout_data — pre-fill email when provided
      const checkoutData: Record<string, unknown> = {
        name: org.name,
        custom: { org_id: org.id, tier: targetTier },
      };
      if (userEmail) {
        checkoutData.email = userEmail;
      }

      const checkoutPayload = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: checkoutData,
            product_options: {
              redirect_url: `${appReturnUrl}/?billing_status=success`,
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: String(storeId) },
            },
            variant: {
              data: { type: 'variants', id: String(resolvedVariantId) },
            },
          },
        },
      };

      const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const lsData = await lsRes.json();

      if (!lsRes.ok) {
        console.error('[LemonSqueezy Checkout Error]:', JSON.stringify(lsData));
        const detail = lsData?.errors?.[0]?.detail || 'Failed to initialize Lemon Squeezy checkout';
        throw new Error(detail);
      }

      const checkoutUrl = lsData?.data?.attributes?.url;
      if (!checkoutUrl) {
        throw new Error('Lemon Squeezy did not return a checkout URL.');
      }

      return new Response(
        JSON.stringify({ url: checkoutUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Development simulation (no API keys deployed yet) ─────────────────────
    console.warn(
      '[LemonSqueezy] API keys not found in Edge Function environment — simulating upgrade for development.'
    );

    await supabaseClient
      .from('organizations')
      .update({
        subscription_tier: targetTier,
        subscription_status: 'active',
      })
      .eq('id', org.id);

    return new Response(
      JSON.stringify({
        simulated: true,
        message: `Simulated Lemon Squeezy upgrade to ${targetTier.toUpperCase()} completed.`,
        url: `${appReturnUrl}/?billing_status=success`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-checkout-session error]:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
