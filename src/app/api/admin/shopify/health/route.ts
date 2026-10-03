import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shopifyAdminGraphql } from "@/lib/shopify/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.status !== "active" ||
    !["owner", "main_admin"].includes(profile.role)
  ) {
    return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }

  try {
    const data = await shopifyAdminGraphql<{
      shop: { name: string; primaryDomain: { host: string } | null };
      products: { nodes: Array<{ id: string }> };
    }>(`query ShopifyHealthCheck {
      shop {
        name
        primaryDomain {
          host
        }
      }
      products(first: 1) {
        nodes {
          id
        }
      }
    }`);

    return NextResponse.json({
      ok: true,
      shop: {
        name: data.shop.name,
        domain: data.shop.primaryDomain?.host ?? null,
      },
      apiVersion: process.env.SHOPIFY_API_VERSION || "2026-07",
      productsReadable: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Shopify.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 502 },
    );
  }
}
