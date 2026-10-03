const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;
let tokenRequest: Promise<string> | null = null;

export function shopifyConfig() {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shop || !clientId || !clientSecret) {
    throw new Error("Shopify integration is not configured.");
  }

  return {
    shop: shop.replace(/^https?:\\/\\//, "").replace(/\\/$/, ""),
    clientId,
    clientSecret,
  };
}

async function getShopifyAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const { shop, clientId, clientSecret } = shopifyConfig();

    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.access_token) {
      throw new Error(
        json?.error_description ||
          json?.error ||
          `Shopify token request failed: HTTP ${res.status}`,
      );
    }

    cachedAccessToken = json.access_token;
    cachedTokenExpiresAt =
      Date.now() + Number(json.expires_in || 86399) * 1000;

    return cachedAccessToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

export async function shopifyAdminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
) {
  const { shop } = shopifyConfig();
  const token = await getShopifyAccessToken();

  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.message || `Shopify HTTP ${res.status}`,
    );
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e: { message: string }) => e.message).join("; "),
    );
  }

  return json.data as T;
}
