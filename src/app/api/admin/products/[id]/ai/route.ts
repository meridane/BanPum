import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active" || !["main_admin","owner","employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 503 });
  }

  const { id } = await params;
  const { data: product, error: productError } = await supabase
    .from("physical_products")
    .select("id,internal_ref,name,brand,model,category,condition_notes,official_price")
    .eq("id", id)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { data: photos } = await supabase
    .from("product_photos")
    .select("storage_path,photo_type,is_main")
    .eq("product_id", id)
    .in("photo_type", ["label","internal"])
    .order("is_main", { ascending: false })
    .limit(4);

  const imageUrls: string[] = [];
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("banpum-products")
      .createSignedUrl(photo.storage_path, 300);
    if (data?.signedUrl) imageUrls.push(data.signedUrl);
  }

  if (imageUrls.length === 0) {
    return NextResponse.json({ error: "Ajoute au moins une photo de l'étiquette ou du produit avant l'analyse IA." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const instruction = `Tu es l'assistant catalogue de BanPum, une boutique coréenne de produits neufs issus de retours.
Analyse les photos et les informations disponibles. Identifie le produit sans inventer.
Cherche sur le web les informations techniques et les prix pertinents en Corée du Sud.
Priorité aux sources fabricant puis aux vendeurs coréens connus. Pour chaque source, donne nom, URL et prix si disponible.
S'il existe plusieurs modèles possibles, retourne plusieurs candidats et explique brièvement la différence.
Ne considère jamais une proposition comme certaine si la photo ne permet pas de confirmer.

Réponds UNIQUEMENT avec un JSON valide ayant cette structure:
{
 "confidence": 0,
 "brand": "",
 "model": "",
 "reference": "",
 "category": "",
 "title_ko": "",
 "description_ko": "",
 "description_fr": "",
 "characteristics": [{"label":"","value":""}],
 "candidates": [{"brand":"","model":"","reference":"","reason":"","confidence":0}],
 "price_research": [{"source_name":"","url":"","price_krw":null,"date_note":""}],
 "price_suggestions": {"low_krw":null,"medium_krw":null,"high_krw":null},
 "warnings": []
}
Ne donne pas de prix si tu ne peux pas vérifier la source. Les suggestions de prix sont indicatives et doivent être validées par un humain.`;

  const inputContent: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: instruction + "\nDonnées existantes: " + JSON.stringify(product),
    },
    ...imageUrls.map((url) => ({ type: "input_image", image_url: url })),
  ];

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_PRODUCT_MODEL || "gpt-6-luna",
      tools: [{ type: "web_search" }],
      input: [{ role: "user", content: inputContent as never }],
    });

    const raw = response.output_text?.trim() ?? "";
    const cleaned = raw.trim().replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
    let aiData: unknown;
    try {
      aiData = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          aiData = JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          return NextResponse.json({ error: "AI JSON invalide.", raw: cleaned.slice(0, 4000) }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: "AI result exploitable manquant.", raw: cleaned.slice(0, 4000) }, { status: 502 });
      }
    }

    await supabase
      .from("physical_products")
      .update({ ai_data: aiData })
      .eq("id", id);

    return NextResponse.json({ aiData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
