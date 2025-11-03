import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvData } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rows = csvData.trim().split('\n').slice(1);
    const results = { success: [], errors: [] };

    for (const row of rows) {
      try {
        const [name, address, postalCode, city, schoolType, officialCode] = row.split(',').map(v => v.trim());

        const { data: school, error } = await supabase
          .from('schools')
          .upsert({
            name,
            address,
            postal_code: postalCode,
            city,
            school_type: schoolType,
            official_code: officialCode,
          }, { onConflict: 'official_code' })
          .select()
          .single();

        if (error) throw error;
        results.success.push({ school: name });
      } catch (err) {
        results.errors.push({ row, error: err.message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
