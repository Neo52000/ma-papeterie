import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface QuoteItem {
  ref: string;
  label: string;
  qty: number;
  unit_price_ht: number;
  tva_rate: number;
  total_ht?: number;
}

interface QuoteInput {
  profile_id?: string;
  pipeline_id?: string;
  contact_name: string;
  contact_email: string;
  company_name?: string;
  items: QuoteItem[];
  payment_terms?: string;
  notes?: string;
  valid_days?: number;
  send_email?: boolean;
}

Deno.serve(createHandler({
  name: "crm-quote-generator",
  auth: "admin",
  rateLimit: { prefix: "crm-quote", max: 20, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const input = body as QuoteInput;

  if (!input.contact_name || !input.contact_email || !input.items?.length) {
    return jsonResponse(
      { error: "contact_name, contact_email et items sont requis" },
      400,
      corsHeaders,
    );
  }

  // Generate quote number
  const { data: quoteNumData, error: numError } = await supabaseAdmin
    .rpc("generate_quote_number");
  if (numError) throw numError;
  const quoteNumber = quoteNumData as string;

  // Calculate totals
  const itemsWithTotals = input.items.map((item) => ({
    ...item,
    total_ht: Math.round(item.qty * item.unit_price_ht * 100) / 100,
  }));

  const subtotalHt = itemsWithTotals.reduce((sum, i) => sum + i.total_ht, 0);

  // Group TVA by rate for accurate calculation
  const tvaByRate: Record<number, number> = {};
  for (const item of itemsWithTotals) {
    const rate = item.tva_rate ?? 20;
    tvaByRate[rate] = (tvaByRate[rate] ?? 0) + item.total_ht;
  }
  const tvaAmount = Object.entries(tvaByRate).reduce(
    (sum, [rate, base]) => sum + Math.round(base * (Number(rate) / 100) * 100) / 100,
    0,
  );
  const totalTtc = Math.round((subtotalHt + tvaAmount) * 100) / 100;

  const validDays = input.valid_days ?? 30;
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  // Insert quote
  const { data: quote, error: insertError } = await supabaseAdmin
    .from("quotes")
    .insert({
      quote_number: quoteNumber,
      profile_id: input.profile_id ?? null,
      pipeline_id: input.pipeline_id ?? null,
      company_name: input.company_name ?? null,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      items: itemsWithTotals,
      subtotal_ht: subtotalHt,
      tva_amount: tvaAmount,
      total_ttc: totalTtc,
      status: "draft",
      valid_until: validUntil,
      payment_terms: input.payment_terms ?? "30 jours fin de mois",
      notes: input.notes ?? null,
    })
    .select("id, quote_number")
    .single();

  if (insertError) throw insertError;

  // Generate PDF using jsPDF
  const { default: jsPDF } = await import("https://esm.sh/jspdf@2");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Header — company info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ma Papeterie", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Papeterie Reine & Fils", margin, y);
  y += 4;
  doc.text("10 rue Toupot de Beveaux, 52000 Chaumont", margin, y);
  y += 4;
  doc.text("Tel: 03 10 96 02 24 — contact@ma-papeterie.fr", margin, y);
  y += 10;

  // Quote title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`DEVIS ${quoteNumber}`, margin, y);
  y += 8;

  // Date and validity
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString("fr-FR");
  doc.text(`Date : ${dateStr}`, margin, y);
  doc.text(`Valable jusqu'au : ${new Date(validUntil).toLocaleDateString("fr-FR")}`, pageWidth / 2, y);
  y += 8;

  // Client info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Client :", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  if (input.company_name) {
    doc.text(input.company_name, margin, y);
    y += 5;
  }
  doc.text(input.contact_name, margin, y);
  y += 5;
  doc.text(input.contact_email, margin, y);
  y += 10;

  // Items table header
  const colX = {
    ref: margin,
    label: margin + 25,
    qty: margin + contentWidth - 65,
    unitHt: margin + contentWidth - 48,
    tva: margin + contentWidth - 25,
    totalHt: margin + contentWidth - 5,
  };

  doc.setFillColor(44, 62, 80);
  doc.rect(margin, y - 4, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Ref.", colX.ref + 2, y);
  doc.text("Designation", colX.label, y);
  doc.text("Qte", colX.qty, y, { align: "right" });
  doc.text("P.U. HT", colX.unitHt, y, { align: "right" });
  doc.text("TVA %", colX.tva, y, { align: "right" });
  doc.text("Total HT", colX.totalHt, y, { align: "right" });
  y += 6;

  // Items rows
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  const fmtNum = (n: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  for (const item of itemsWithTotals) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.text(item.ref ?? "", colX.ref + 2, y);
    // Truncate label if too long
    const maxLabelWidth = colX.qty - colX.label - 15;
    const label = doc.splitTextToSize(item.label ?? "", maxLabelWidth)[0] ?? "";
    doc.text(label, colX.label, y);
    doc.text(String(item.qty), colX.qty, y, { align: "right" });
    doc.text(fmtNum(item.unit_price_ht), colX.unitHt, y, { align: "right" });
    doc.text(`${item.tva_rate}%`, colX.tva, y, { align: "right" });
    doc.text(fmtNum(item.total_ht), colX.totalHt, y, { align: "right" });
    y += 6;
  }

  // Separator
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Totals
  doc.setFontSize(10);
  const totalsX = margin + contentWidth - 5;
  const labelsX = margin + contentWidth - 50;

  doc.setFont("helvetica", "normal");
  doc.text("Sous-total HT :", labelsX, y, { align: "right" });
  doc.text(`${fmtNum(subtotalHt)} EUR`, totalsX, y, { align: "right" });
  y += 6;

  for (const [rate, base] of Object.entries(tvaByRate)) {
    const tva = Math.round(base * (Number(rate) / 100) * 100) / 100;
    doc.text(`TVA ${rate}% :`, labelsX, y, { align: "right" });
    doc.text(`${fmtNum(tva)} EUR`, totalsX, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total TTC :", labelsX, y, { align: "right" });
  doc.text(`${fmtNum(totalTtc)} EUR`, totalsX, y, { align: "right" });
  y += 10;

  // Payment terms
  if (input.payment_terms || input.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (input.payment_terms) {
      doc.text(`Conditions de paiement : ${input.payment_terms}`, margin, y);
      y += 5;
    }
    if (input.notes) {
      doc.text(`Notes : ${input.notes}`, margin, y);
      y += 5;
    }
  }

  // Footer — legal mentions
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  const footerY = 280;
  doc.text(
    "Ma Papeterie — Reine & Fils, 10 rue Toupot de Beveaux, 52000 Chaumont. SIRET : en cours. TVA intracommunautaire : en cours.",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  // Upload PDF to Supabase Storage
  const pdfBuffer = doc.output("arraybuffer");
  const pdfPath = `quotes/${quoteNumber}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("quotes")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  let pdfUrl: string | null = null;
  if (!uploadError) {
    const { data: urlData } = supabaseAdmin.storage
      .from("quotes")
      .getPublicUrl(pdfPath);
    pdfUrl = urlData?.publicUrl ?? null;
  }

  // Update quote with PDF URL
  if (pdfUrl) {
    await supabaseAdmin
      .from("quotes")
      .update({ pdf_url: pdfUrl })
      .eq("id", quote.id);
  }

  // Send email via Brevo if requested
  if (input.send_email) {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const templateId = parseInt(Deno.env.get("BREVO_TEMPLATE_DEVIS_B2B") ?? "0");

    if (brevoApiKey && templateId) {
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId,
            to: [{ email: input.contact_email, name: input.contact_name }],
            params: {
              PRENOM: input.contact_name.split(" ")[0],
              QUOTE_NUMBER: quoteNumber,
              TOTAL_TTC: fmtNum(totalTtc),
              VALID_UNTIL: new Date(validUntil).toLocaleDateString("fr-FR"),
              PDF_URL: pdfUrl ?? "",
            },
            sender: { name: "Ma Papeterie", email: "contact@ma-papeterie.fr" },
            replyTo: { name: "Elie — Ma Papeterie", email: "contact@ma-papeterie.fr" },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        // Update quote status to sent
        await supabaseAdmin
          .from("quotes")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", quote.id);
      } catch (err) {
        console.error("[crm-quote-generator] Brevo send error:", err);
      }
    }
  }

  // Log interaction
  if (input.profile_id) {
    await supabaseAdmin.from("customer_interactions").insert({
      user_id: input.profile_id,
      profile_id: input.profile_id,
      interaction_type: "quote",
      channel: "email",
      subject: `Devis ${quoteNumber} - ${fmtNum(totalTtc)} EUR TTC`,
      metadata: { quote_id: quote.id, quote_number: quoteNumber, total_ttc: totalTtc },
      created_by: "00000000-0000-0000-0000-000000000000",
    });
  }

  return {
    success: true,
    quote_id: quote.id,
    quote_number: quoteNumber,
    pdf_url: pdfUrl,
    total_ttc: totalTtc,
  };
}));
