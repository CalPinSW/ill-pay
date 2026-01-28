import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAuthedSupabaseClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("apikey");
  
  if (!authHeader && !apiKey) {
    return null;
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader || `Bearer ${apiKey}` },
    },
  });

  return supabase;
}

async function getAuthedUserId(req: Request): Promise<string | null> {
  const supabase = await getAuthedSupabaseClient(req);
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

async function enforceRateLimit(req: Request, userId: string) {
  const supabase = await getAuthedSupabaseClient(req);
  if (!supabase) {
    return {
      allowed: false,
      count: 0,
      limit: 0,
      error: "Unauthorized",
    };
  }

  const day = new Date().toISOString().slice(0, 10);
  const limit = 2;

  const { data, error } = await supabase.rpc("check_and_increment_parse_receipt_usage", {
    p_user_id: userId,
    p_day: day,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return data as { allowed: boolean; count: number; limit: number };
}

interface ParsedReceipt {
  restaurant_name?: string;
  date?: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

const RECEIPT_PARSING_PROMPT = `You are a receipt parsing assistant. Analyze the provided receipt image and extract the following information in JSON format:

{
  "restaurant_name": "Name of the restaurant/store (string or null)",
  "date": "Date of the receipt in YYYY-MM-DD format (string or null)",
  "items": [
    {
      "name": "Item name (string)",
      "quantity": "Number of items (integer, default 1)",
      "unit_price": "Price per unit (number)",
      "total_price": "Total price for this item (number)"
    }
  ],
  "subtotal": "Subtotal before tax and tip (number or null)",
  "tax": "Tax amount (number or null)",
  "tip": "Tip amount if shown (number or null)",
  "total": "Total amount (number or null)"
}

Important rules:
1. All prices should be numbers (not strings), without currency symbols
2. If quantity is not specified, assume 1
3. total_price should equal quantity * unit_price
4. Extract ALL line items from the receipt
5. If you cannot determine a value, use null
6. Return ONLY valid JSON, no additional text or explanation
7. Be precise with decimal places for prices`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const usage = await enforceRateLimit(req, userId);
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily receipt parsing limit reached",
          code: "RATE_LIMIT_EXCEEDED",
          limit: usage.limit,
          count: usage.count,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { image_base64, image_url } = await req.json();

    if (!image_base64 && !image_url) {
      throw new Error("Either image_base64 or image_url is required");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let imagePart;
    
    if (image_base64) {
      imagePart = {
        inlineData: {
          data: image_base64,
          mimeType: "image/jpeg",
        },
      };
    } else if (image_url) {
      const imageResponse = await fetch(image_url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      
      imagePart = {
        inlineData: {
          data: base64,
          mimeType: "image/jpeg",
        },
      };
    }

    const result = await model.generateContent([
      RECEIPT_PARSING_PROMPT,
      imagePart!,
    ]);

    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }

    const parsedReceipt: ParsedReceipt = JSON.parse(jsonMatch[0]);

    if (!parsedReceipt.items || !Array.isArray(parsedReceipt.items)) {
      parsedReceipt.items = [];
    }

    parsedReceipt.items = parsedReceipt.items.map((item) => ({
      name: item.name || "Unknown Item",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || Number(item.unit_price) || 0,
    }));

    return new Response(JSON.stringify(parsedReceipt), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error parsing receipt:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse receipt",
        items: [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
