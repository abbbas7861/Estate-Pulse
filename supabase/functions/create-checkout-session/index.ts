import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

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

    // Fetch organization
    const { data: org, error: orgErr } = await supabaseClient
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve or create Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          org_id: org.id,
        },
      });
      customerId = customer.id;

      // Update org with customer ID
      await supabaseClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    // Price definitions (cents)
    const tierConfig: Record<string, { name: string; amount: number }> = {
      pro: {
        name: 'EstatePulse Pro — 5 Users & 1,000 Leads',
        amount: 4900, // $49.00 / mo
      },
      enterprise: {
        name: 'EstatePulse Enterprise — Unlimited Scale & Priority Telemetry',
        amount: 19900, // $199.00 / mo
      },
    };

    const selectedConfig = tierConfig[tier.toLowerCase()];
    if (!selectedConfig) {
      return new Response(JSON.stringify({ error: 'Invalid subscription tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appReturnUrl = returnUrl || Deno.env.get('APP_URL') || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedConfig.name,
              description:
                tier.toLowerCase() === 'pro'
                  ? 'Includes up to 5 agents, 1,000 leads, MLS storage, and Gemini AI insights.'
                  : 'Includes unlimited agents, unlimited leads, custom branding, and 24/7 DRE support.',
            },
            unit_amount: selectedConfig.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        org_id: org.id,
        tier: tier.toLowerCase(),
      },
      subscription_data: {
        metadata: {
          org_id: org.id,
          tier: tier.toLowerCase(),
        },
      },
      success_url: `${appReturnUrl}/?billing_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appReturnUrl}/?billing_status=canceled`,
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
