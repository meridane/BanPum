const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

export function shopifyConfig() {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shop || !token) throw new Error("Shopify integration is not configured.");
  return { shop: shop.replace(/^https?:\\/\\//, "").replace(/\\/$/, ""), token };
}

export async function shopifyAdminGraphql<T>(query: string, variables?: Record<string, unknown>) {
  const { shop, token } = shopifyConfig();
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message || `Shopify HTTP ${res.status}`);
  if (json.errors?.length) throw new Error(json.errors.map((e: {message:string}) => e.message).join("; "));
  return json.data as T;
}
