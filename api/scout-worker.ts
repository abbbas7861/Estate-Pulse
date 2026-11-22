import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

interface VercelLikeRequest {
  query?: Record<string, string | string[]>;
  body?: any;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
  status: (statusCode: number) => VercelLikeResponse;
  json: (jsonBody: any) => VercelLikeResponse;
  send: (body: any) => VercelLikeResponse;
  setHeader: (name: string, value: string | string[]) => VercelLikeResponse;
  end: () => void;
}

const SELLER_NAMES = [
  'Ali Raza',
  'Chaudhry Tariq',
  'Kamran Akmal',
  'Usman Malik',
  'Zainab Bibi',
  'Hassan Farooq',
  'Nadeem Sheikh',
  'Mian Shahbaz',
  'Bilal Ahmed',
  'Fariha Siddiqui',
];

const BUYER_NAMES = [
  'Sarah Khan',
  'Hamza Tariq',
  'Ayesha Noor',
  'Dr. Farhan Qureshi',
  'Omer Siddique',
  'Fatima Zahra',
  'Saad Munir',
  'Mahnoor Baloch',
  'Waqas Rasheed',
  'Hina Altaf',
];

const PROPERTY_SIZES = ['5 Marla', '10 Marla', '1 Kanal', '2 Kanal', '3-Bed', '4-Bed'];
const SELLER_PRICES = [18000000, 25000000, 38000000, 45000000, 65000000, 95000000, 120000000];
const BUYER_BUDGETS = [15000000, 22000000, 32000000, 48000000, 70000000, 110000000];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Initialize Gemini client if API key is configured
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.warn('[scout-worker] Failed to initialize GoogleGenAI client:', err);
  }
}

/**
 * Generates personalized pitch note using dynamic tags or Gemini AI
 */
async function generatePitchNote(
  type: 'seller' | 'buyer',
  targetName: string,
  propertyDesc: string,
  city: string,
  commissionRate: string | number,
  baseTemplate?: string
): Promise<string> {
  let rendered =
    baseTemplate ||
    (type === 'seller'
      ? 'Hi {owner_name}, I noticed your property at {property_address}. We have verified buyers looking in {city}. Our brokerage charges {commission_rate}% commission. Open to a quick call?'
      : 'Hi {buyer_name}, I saw your post looking for a {property_type} in {city}. We have off-market listings matching your criteria. Would you like to see them?');

  rendered = rendered
    .replace(/\{owner_name\}/gi, targetName)
    .replace(/\{buyer_name\}/gi, targetName)
    .replace(/\{property_address\}/gi, propertyDesc)
    .replace(/\{property_type\}/gi, propertyDesc)
    .replace(/\{city\}/gi, city)
    .replace(/\{commission_rate\}/gi, String(commissionRate || '2.0'));

  if (aiClient) {
    try {
      const prompt = `You are an elite real estate acquisition scout for a luxury brokerage.
Refine and personalize this outbound outreach pitch into a high-converting, professional, 2-to-3 sentence message:

Type: ${type === 'seller' ? 'Property Seller / Homeowner Outreach' : 'Active Buyer Inquiry Outreach'}
Name: ${targetName}
Property / Requirement: ${propertyDesc}
City: ${city}
Commission: ${commissionRate}%
Draft: "${rendered}"

Return ONLY the refined pitch text with no extra quotes, no greetings header, and no markdown formatting.`;

      const res = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const polished = res.text?.trim();
      if (polished) return polished;
    } catch (aiErr) {
      console.warn('[scout-worker] Gemini generation fallback to template replacement:', aiErr);
    }
  }

  return rendered;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  // 1. CORS headers
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
    );
  }

  if (req?.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.status(200);
      res.end();
      return;
    }
    return new Response(null, { status: 200 });
  }

  // 2. Initialize Supabase Admin Client
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const errorMsg = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.';
    console.error('[scout-worker]', errorMsg);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ success: false, error: errorMsg });
    }
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 3. Fetch all active AI agents
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .or('is_active.eq.true,is_active.is.null');

    if (agentsError) {
      console.error('[scout-worker] Database error fetching agents:', agentsError);
      if (res && typeof res.status === 'function') {
        return res.status(500).json({ success: false, error: agentsError.message });
      }
      return new Response(JSON.stringify({ success: false, error: agentsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!agents || agents.length === 0) {
      const msg = 'No active AI agents found in database.';
      if (res && typeof res.status === 'function') {
        return res.status(200).json({ success: true, message: msg, scouted: 0 });
      }
      return new Response(JSON.stringify({ success: true, message: msg, scouted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prospectsToInsert: any[] = [];

    // 4. Loop through agents and simulate scraping
    for (const agent of agents) {
      const shouldScoutSellers = agent.scout_sellers !== false;
      const shouldScoutBuyers = agent.scout_buyers !== false;

      // Normalize target cities
      const rawCities = agent.target_cities;
      const targetCities: string[] =
        Array.isArray(rawCities) && rawCities.length > 0
          ? rawCities
          : typeof rawCities === 'string' && rawCities.trim()
          ? rawCities.split(',').map((c: string) => c.trim()).filter(Boolean)
          : ['Lahore', 'Islamabad', 'Karachi'];

      // Normalize target property types
      const rawTypes = agent.target_property_types;
      const targetPropertyTypes: string[] =
        Array.isArray(rawTypes) && rawTypes.length > 0
          ? rawTypes
          : typeof rawTypes === 'string' && rawTypes.trim()
          ? rawTypes.split(',').map((t: string) => t.trim()).filter(Boolean)
          : ['House', 'Villa', 'Apartment', 'Commercial Plot'];

      const commissionRate = agent.commission_rate || 2.0;

      // 4a. Mock Seller Prospect
      if (shouldScoutSellers) {
        const targetCity = pickRandom(targetCities);
        const targetType = pickRandom(targetPropertyTypes);
        const targetSize = pickRandom(PROPERTY_SIZES);
        const ownerName = pickRandom(SELLER_NAMES);
        const propertyPrice = pickRandom(SELLER_PRICES);
        const propertyTitle = `${targetSize} ${targetType} in ${targetCity}`;

        const sellerPitch = await generatePitchNote(
          'seller',
          ownerName,
          propertyTitle,
          targetCity,
          commissionRate,
          agent.pitch_message
        );

        prospectsToInsert.push({
          org_id: agent.org_id,
          owner_name: ownerName,
          property: propertyTitle,
          property_price: propertyPrice,
          price: propertyPrice,
          source_url: `https://zameen.com/property-${Math.floor(Math.random() * 899999 + 100000)}.html`,
          prospect_type: 'seller',
          status: 'pending',
          notes: sellerPitch,
          created_at: new Date().toISOString(),
        });
      }

      // 4b. Mock Buyer Prospect
      if (shouldScoutBuyers) {
        const targetCity = pickRandom(targetCities);
        const targetType = pickRandom(targetPropertyTypes);
        const targetSize = pickRandom(PROPERTY_SIZES);
        const buyerName = pickRandom(BUYER_NAMES);
        const buyerBudget = pickRandom(BUYER_BUDGETS);
        const requirementTitle = `Looking for ${targetSize} ${targetType} in ${targetCity}`;

        const buyerPitch = await generatePitchNote(
          'buyer',
          buyerName,
          `${targetSize} ${targetType}`,
          targetCity,
          commissionRate,
          agent.buyer_pitch_message
        );

        prospectsToInsert.push({
          org_id: agent.org_id,
          owner_name: buyerName,
          property: requirementTitle,
          buyer_budget: buyerBudget,
          price: buyerBudget,
          source_url: `https://facebook.com/groups/realestate/posts/${Math.floor(Math.random() * 899999 + 100000)}`,
          prospect_type: 'buyer',
          status: 'pending',
          notes: buyerPitch,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 5. Insert mock prospects into ai_prospects table
    if (prospectsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_prospects')
        .insert(prospectsToInsert);

      if (insertError) {
        console.error('[scout-worker] Database error inserting prospects:', insertError);
        if (res && typeof res.status === 'function') {
          return res.status(500).json({ success: false, error: insertError.message });
        }
        return new Response(JSON.stringify({ success: false, error: insertError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 6. Return success response
    const successMessage = `Scouted ${prospectsToInsert.length} prospects`;
    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        success: true,
        message: successMessage,
        scoutedCount: prospectsToInsert.length,
        agentsCount: agents.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        scoutedCount: prospectsToInsert.length,
        agentsCount: agents.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[scout-worker] Unexpected error in worker:', err);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ success: false, error: err.message || 'Internal error' });
    }
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
