import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface GenerateCalendarRequest {
  month: string; // "YYYY-MM"
  context?: string;
}

interface CalendarIdea {
  suggested_date: string;
  theme: string;
  platforms: string[];
  tone: string;
  description: string;
  content_type: string;
}

// ── Config ──────────────────────────────────────────────────────────────────

const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

// ── Prompt IA ───────────────────────────────────────────────────────────────

const EDITORIAL_CALENDAR_PROMPT = `Tu es un expert en stratégie social media pour Ma Papeterie, une papeterie physique et en ligne à Sainte-Maxime (France).

Tu dois générer un planning éditorial mensuel pour les réseaux sociaux.

## Contexte métier
- Papeterie : fournitures scolaires, de bureau, loisirs créatifs, impression, tampons, photos d'identité
- Clientèle : particuliers (parents, étudiants), professionnels (entreprises, collectivités, associations)
- Localisation : Sainte-Maxime, Var (83)

## Calendrier commercial français à considérer
- Janvier : Soldes, Bonne année, Galette des rois
- Février : Saint-Valentin, Chandeleur, Vacances hiver
- Mars : Journée de la femme, Printemps, Carnaval
- Avril : Pâques, Poisson d'avril, Vacances printemps
- Mai : Fête des mères, Fête du travail, Ascension
- Juin : Fête des pères, Fête de la musique, Fin d'année scolaire
- Juillet-Août : Été, Tourisme, Listes de fournitures scolaires, Rentrée
- Septembre : Rentrée scolaire, Rentrée pro
- Octobre : Halloween, Vacances Toussaint
- Novembre : Black Friday, Beaujolais nouveau
- Décembre : Noël, Calendriers de l'Avent, Cadeaux, Réveillon

## Règles
- Génère 12 à 20 idées de posts répartis sur le mois
- Varie les types de contenu : produit, conseil, promotion, inspiration, coulisses, quiz, sondage
- Alterne les tons : informatif, fun, promotionnel, inspirant
- Chaque idée doit préciser les plateformes les plus pertinentes
- Tiens compte du contexte supplémentaire fourni par l'administrateur

## Format de réponse JSON strict
\`\`\`json
{
  "ideas": [
    {
      "suggested_date": "2026-03-05",
      "theme": "Thème du post",
      "platforms": ["facebook", "instagram"],
      "tone": "fun",
      "description": "Description détaillée de l'idée de contenu...",
      "content_type": "produit"
    }
  ]
}
\`\`\`

Les content_type possibles : produit, conseil, promotion, inspiration, coulisses, quiz, sondage, événement, témoignage, astuce.
Les tons possibles : informatif, fun, promotionnel, inspirant, professionnel.

Réponds UNIQUEMENT avec le JSON, pas de texte avant/après.`;

// ── Fallback ────────────────────────────────────────────────────────────────

function generateFallbackIdeas(month: string): CalendarIdea[] {
  const [year, m] = month.split("-");
  const daysInMonth = new Date(Number(year), Number(m), 0).getDate();
  const ideas: CalendarIdea[] = [];

  // Generate 4 basic ideas spread across the month
  const days = [3, 10, 17, 24].filter((d) => d <= daysInMonth);
  const themes = [
    "Produit de la semaine",
    "Conseil papeterie",
    "Coulisses du magasin",
    "Sélection thématique",
  ];

  days.forEach((day, i) => {
    ideas.push({
      suggested_date: `${year}-${m}-${String(day).padStart(2, "0")}`,
      theme: themes[i] || "Publication",
      platforms: ["facebook", "instagram"],
      tone: i % 2 === 0 ? "informatif" : "fun",
      description: `Idée de post pour le ${day}/${m} — ${themes[i]}`,
      content_type: i % 2 === 0 ? "produit" : "conseil",
    });
  });

  return ideas;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "generate-editorial-calendar",
  auth: "admin",
  rateLimit: { prefix: "generate-editorial-calendar", max: 3, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { month, context } = body as GenerateCalendarRequest;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return jsonResponse(
      { error: "Format du mois invalide. Utilisez YYYY-MM." },
      400,
      corsHeaders,
    );
  }

  // 1. Load settings
  const { data: settings } = await supabaseAdmin
    .from("social_settings")
    .select("*")
    .limit(1)
    .single();

  const aiModel = settings?.ai_model || "claude-sonnet-4-20250514";
  const activePlatforms: string[] = settings?.active_platforms || ["facebook", "instagram", "x", "linkedin"];

  // 2. Check existing posts for the month
  const monthStart = `${month}-01`;
  const [year, m] = month.split("-");
  const nextMonth = Number(m) === 12
    ? `${Number(year) + 1}-01-01`
    : `${year}-${String(Number(m) + 1).padStart(2, "0")}-01`;

  const { data: existingPosts } = await supabaseAdmin
    .from("social_posts")
    .select("platform, scheduled_for, published_at, status")
    .or(
      `and(scheduled_for.gte.${monthStart},scheduled_for.lt.${nextMonth}),` +
      `and(published_at.gte.${monthStart},published_at.lt.${nextMonth})`
    );

  const existingCount = existingPosts?.length || 0;

  // 3. Generate with AI
  let ideas: CalendarIdea[];
  let usedFallback = false;

  try {
    const userPrompt = `Génère le planning éditorial pour le mois de ${month}.

**Plateformes actives :** ${activePlatforms.join(", ")}
**Posts déjà planifiés ce mois :** ${existingCount}
${context ? `**Contexte supplémentaire de l'administrateur :** ${context}` : ""}

Génère le planning JSON.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 4000,
        messages: [
          { role: "user", content: EDITORIAL_CALENDAR_PROMPT + "\n\n" + userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    ideas = parsed.ideas;
  } catch (err) {
    console.error("AI calendar generation failed, using fallback:", err);
    ideas = generateFallbackIdeas(month);
    usedFallback = true;
  }

  // 4. Upsert into social_editorial_calendar
  const { data: calendar, error: calError } = await supabaseAdmin
    .from("social_editorial_calendar")
    .upsert(
      {
        month: monthStart,
        ideas,
        generated_by: usedFallback ? "fallback" : "ai",
        ai_model: usedFallback ? null : aiModel,
      },
      { onConflict: "month" },
    )
    .select()
    .single();

  if (calError) throw new Error(`Failed to save calendar: ${calError.message}`);

  return {
    success: true,
    calendar_id: calendar.id,
    month: monthStart,
    ideas_count: ideas.length,
    ideas,
    fallback: usedFallback,
  };
}));
