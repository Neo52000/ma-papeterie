import { createHandler } from "../_shared/handler.ts";
import { checkBodySize } from "../_shared/body-limit.ts";

Deno.serve(createHandler({
  name: "import-schools-csv",
  auth: "admin",
  rateLimit: { prefix: "import-schools", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, req, corsHeaders }) => {
  const sizeError = checkBodySize(req, corsHeaders);
  if (sizeError) return sizeError;

  const { csvData } = body as any;

  const rows = csvData.trim().split('\n').slice(1);
  const results = { success: [] as any[], errors: [] as any[] };

  for (const row of rows) {
    try {
      const [name, address, postalCode, city, schoolType, officialCode] = row.split(',').map((v: string) => v.trim());

      const { data: school, error } = await supabaseAdmin
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
    } catch (err: any) {
      results.errors.push({ row, error: err.message });
    }
  }

  return results;
}));
