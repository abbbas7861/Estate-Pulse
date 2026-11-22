import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { property_id, media_urls } = await req.json()
    console.log("Received request for property:", property_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const WORLD_LABS_API_KEY = Deno.env.get('WORLD_LABS_API_KEY');
    if (!WORLD_LABS_API_KEY) throw new Error("World Labs API Key is missing.");

    await supabaseClient.from('properties').update({ tour_status: 'processing' }).eq('id', property_id)

    // Sahi payload format banayein
    const multiImagePrompt = media_urls.map((url, index) => ({
      azimuth: (index * 90) % 360,
      content: {
        source: "uri",
        uri: url
      }
    }));

    const worldLabsResponse = await fetch('https://api.worldlabs.ai/marble/v1/worlds:generate', {
      method: 'POST',
      headers: {
        'WLT-Api-Key': WORLD_LABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: `Property Tour ${property_id}`,
        model: "marble-1.1",
        world_prompt: {
          type: "multi-image",
          multi_image_prompt: multiImagePrompt,
          text_prompt: "A realistic, high-quality real estate interior" // Yeh zaroori hai
        }
      })
    })

    const worldLabsData = await worldLabsResponse.json()
    console.log("World Labs Response:", worldLabsData);

    if (!worldLabsResponse.ok) {
      await supabaseClient.from('properties').update({ tour_status: 'failed' }).eq('id', property_id)
      // Asal error message log karein
      throw new Error(`World Labs Error: ${worldLabsData.message || JSON.stringify(worldLabsData)}`)
    }

    // Kaamyabi! Ab humein operation_id mila hai. Isay poll karna hoga.
    // Filhal hum isay return kar rahe hain.
    return new Response(JSON.stringify({ success: true, operation_id: worldLabsData.operation_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})