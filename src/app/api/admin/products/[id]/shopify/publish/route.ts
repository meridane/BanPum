import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shopifyAdminGraphql } from "@/lib/shopify/admin";

type ProductRow = {
  id: string; internal_ref: string; name: string | null; brand: string | null; model: string | null;
  category: string | null; description: string | null; condition_notes: string | null;
  official_price: number | null; price_status: string; status: string;
  publication_approved_at: string | null;
};

function htmlDescription(p: ProductRow) {
  const esc = (s: string) => s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  return `<p>${esc(p.description || "")}</p>${p.condition_notes ? `<p><strong>État / anomalies :</strong> ${esc(p.condition_notes)}</p>` : ""}`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", auth.user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !["owner","main_admin"].includes(profile.role))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  const { data: product, error: pe } = await supabase.from("physical_products")
    .select("id,internal_ref,name,brand,model,category,description,condition_notes,official_price,price_status,status,publication_approved_at")
    .eq("id", id).single();
  if (pe || !product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });

  if (product.status !== "ready_for_publication" || !product.publication_approved_at ||
      product.price_status !== "confirmed" || product.official_price == null ||
      !product.name || !product.category || !product.description) {
    return NextResponse.json({ error: "Le produit n'est pas éligible à la publication Shopify." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("shopify_mappings")
    .select("id,shopify_product_id,shopify_variant_id,sync_status").eq("product_id", id).maybeSingle();
  if (existing?.shopify_product_id && existing.sync_status === "synced") {
    return NextResponse.json({ ok: true, alreadySynced: true, shopifyProductId: existing.shopify_product_id });
  }

  const idempotencyKey = `product_publish:${id}`;
  const { data: prior } = await supabase.from("sync_events").select("id,status").eq("provider","shopify").eq("idempotency_key",idempotencyKey).maybeSingle();
  if (prior?.status === "processing") return NextResponse.json({ error: "Une synchronisation est déjà en cours." }, { status: 409 });

  await supabase.from("sync_events").upsert({
    provider:"shopify", event_type:"product_publish", idempotency_key:idempotencyKey,
    payload:{ product_id:id, internal_ref:product.internal_ref }, status:"processing", attempts:(prior ? 1 : 0)+1
  }, { onConflict:"provider,idempotency_key" });

  try {
    const productCreate = await shopifyAdminGraphql<{
      productCreate:{ product:{id:string,variants:{nodes:Array<{id:string}>}}, userErrors:Array<{field:string[],message:string}> }
    }>(`mutation CreateBanPumProduct($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product { id variants(first: 1) { nodes { id } } }
        userErrors { field message }
      }
    }`, {
      product: {
        title: product.name,
        descriptionHtml: htmlDescription(product),
        productType: product.category,
        vendor: product.brand || "BanPum",
        status: "ACTIVE",
        handle: `banpum-${product.internal_ref.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`,
        tags: ["banpum", product.internal_ref],
      }
    });

    if (productCreate.productCreate.userErrors.length) throw new Error(productCreate.productCreate.userErrors.map(x=>x.message).join("; "));
    const shopifyProductId = productCreate.productCreate.product.id;
    const shopifyVariantId = productCreate.productCreate.product.variants.nodes[0]?.id || null;

    const pubs = await shopifyAdminGraphql<{ publications:{nodes:Array<{id:string,name:string}>} }>(`query OnlineStorePublication {
      publications(first: 20) { nodes { id name } }
    }`);
    const onlineStore = pubs.publications.nodes.find(p => p.name.toLowerCase() === "online store");
    if (!onlineStore) throw new Error("Publication Shopify « Online Store » introuvable.");

    const published = await shopifyAdminGraphql<{
      publishablePublish:{userErrors:Array<{field:string[],message:string}>}
    }>(`mutation PublishBanPumProduct($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }`, { id: shopifyProductId, input: [{ publicationId: onlineStore.id }] });

    if (published.publishablePublish.userErrors.length)
      throw new Error(published.publishablePublish.userErrors.map(x=>x.message).join("; "));

    await supabase.from("shopify_mappings").upsert({
      product_id:id, shopify_product_id:shopifyProductId, shopify_variant_id:shopifyVariantId,
      shop_domain:process.env.SHOPIFY_STORE_DOMAIN, sync_status:"synced", last_synced_at:new Date().toISOString(), last_error:null
    }, { onConflict:"product_id" });

    await supabase.from("physical_products").update({ status:"published" }).eq("id",id);
    await supabase.from("sync_events").update({ status:"completed", processed_at:new Date().toISOString(), payload:{product_id:id,shopify_product_id:shopifyProductId} }).eq("provider","shopify").eq("idempotency_key",idempotencyKey);
    await supabase.from("audit_logs").insert({
      actor_user_id:auth.user.id, action:"shopify_product_published", object_type:"physical_product", object_id:id,
      old_data:{status:product.status}, new_data:{status:"published",shopify_product_id:shopifyProductId},
      result:"success", context:{provider:"shopify"}
    });

    return NextResponse.json({ ok:true, shopifyProductId, shopifyVariantId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur Shopify.";
    await supabase.from("shopify_mappings").upsert({
      product_id:id, shopify_product_id:existing?.shopify_product_id || null,
      shopify_variant_id:existing?.shopify_variant_id || null, shop_domain:process.env.SHOPIFY_STORE_DOMAIN,
      sync_status:"error", last_error:message
    }, { onConflict:"product_id" });
    await supabase.from("sync_events").update({ status:"failed", last_error:message }).eq("provider","shopify").eq("idempotency_key",idempotencyKey);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
