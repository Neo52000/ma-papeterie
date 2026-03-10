import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("social_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settings: data }), {
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const updates = await req.json();

      // Get existing settings row id
      const { data: existing } = await supabase
        .from("social_settings")
        .select("id")
        .limit(1)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Settings not found" }), {
          status: 404,
          headers: { ...cors, "content-type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("social_settings")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settings: data }), {
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (error) {
    console.error("social-settings error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } }
    );
  }
});
