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

    const { tier, orgId, returnUrl } = await req.json();

    if (!tier || !orgId) {
      return new Response(JSON.stringify({ error: 'Missing tier or orgId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch organization details
    const { data: org, error: orgErr } = await supabaseClient
      .from('organizations')
      .select('id, name, lemonsqueezy_customer_id, subscription_tier')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appReturnUrl = returnUrl || Deno.env.get('APP_URL') || 'http://localhost:5173';
    const targetTier = String(tier).toLowerCase();

    // 2. Lemon Squeezy Credentials
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');
    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID');
    const proVariantId = Deno.env.get('LEMONSQUEEZY_PRO_VARIANT_ID');
    const enterpriseVariantId = Deno.env.get('LEMONSQUEEZY_ENTERPRISE_VARIANT_ID');

    const variantId = targetTier === 'enterprise' ? enterpriseVariantId : proVariantId;

    // 3. If Lemon Squeezy API is configured, create live checkout
    if (apiKey && storeId && variantId) {
      const checkoutPayload = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              name: org.name,
              custom: {
                org_id: org.id,
                tier: targetTier,
              },
            },
            product_options: {
              redirect_url: `${appReturnUrl}/?billing_status=success`,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: String(storeId),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: String(variantId),
              },
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
        console.error('[LemonSqueezy Checkout Error]:', lsData);
        throw new Error(lsData?.errors?.[0]?.detail || 'Failed to initialize Lemon Squeezy checkout');
      }

      const checkoutUrl = lsData?.data?.attributes?.url;
      return new Response(JSON.stringify({ url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Development simulation mode if Lemon Squeezy keys are not yet deployed
    console.warn('[LemonSqueezy] API keys not found in Edge Function environment. Simulating upgrade for development.');
    
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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[create-checkout-session error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
