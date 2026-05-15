import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { Session as StoredShopifySession } from "@prisma/client";
import prisma from "../db.server";
import { getFunnelProfile, getMonthlySubmissionCount } from "../lib/funnel.server";
import { UNLIMITED_ANNUAL_PLAN, UNLIMITED_MONTHLY_PLAN } from "../lib/billing-plans";
import { authenticate, unauthenticated } from "../shopify.server";

type GraphqlUserError = {
  field?: string[] | string | null;
  message?: string | null;
};

type GraphqlTopLevelError = {
  message?: string | null;
};

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
};

type SubmissionContext = {
  session: {
    shop: string;
    scope?: string | null;
    isOnline?: boolean | null;
    accessToken?: string | null;
  };
  admin: AdminClient;
  tokenIssue?: string;
};

type OrderTrackingDetails = {
  fullUrl?: string;
  shopifyCartToken?: string;
  country?: string;
  timestamp?: string;
  ipAddress?: string;
};

const SUBMIT_BUILD_ID = "cod-submit-2026-05-13-fast-submit-1";
const FREE_ORDER_LIMIT = 100;
const OFFLINE_TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const TOKEN_EXCHANGE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const OFFLINE_TOKEN_TYPE = "urn:shopify:params:oauth:token-type:offline-access-token";

type OfflineTokenResponse = {
  access_token?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

type CurrentAppInstallationPayload = {
  data?: {
    currentAppInstallation?: {
      activeSubscriptions?: Array<{
        name?: string | null;
        status?: string | null;
      }> | null;
    } | null;
  };
};

function formatGraphqlErrors(
  userErrors: GraphqlUserError[] = [],
  topLevelErrors: GraphqlTopLevelError[] | GraphqlTopLevelError | null = []
) {
  const safeUserErrors = Array.isArray(userErrors) ? userErrors : [];
  const safeTopLevelErrors = Array.isArray(topLevelErrors)
    ? topLevelErrors
    : topLevelErrors
      ? [topLevelErrors]
      : [];

  const formattedUserErrors = safeUserErrors
    .map((error) => {
      const field = Array.isArray(error.field)
        ? error.field.join(".")
        : error.field;
      return [field, error.message].filter(Boolean).join(": ");
    })
    .filter(Boolean);

  const formattedTopLevelErrors = safeTopLevelErrors
    .map((error) => error.message)
    .filter(Boolean);

  return [...formattedUserErrors, ...formattedTopLevelErrors].join(" | ");
}

async function hasActiveUnlimitedPlan(admin: AdminClient) {
  try {
    const response = await admin.graphql(
      `#graphql
        query FastCodProCurrentBillingPlan {
          currentAppInstallation {
            activeSubscriptions {
              name
              status
            }
          }
        }`
    );
    const payload = (await response.json()) as CurrentAppInstallationPayload;
    const activeSubscriptions =
      payload.data?.currentAppInstallation?.activeSubscriptions ?? [];

    return activeSubscriptions.some((subscription) => {
      const isUnlimited =
        subscription.name === UNLIMITED_MONTHLY_PLAN ||
        subscription.name === UNLIMITED_ANNUAL_PLAN;
      return isUnlimited && subscription.status === "ACTIVE";
    });
  } catch (error) {
    console.error("Fast COD Pro billing status check failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

function normalizeShopDomain(value: FormDataEntryValue | string | null) {
  const shop = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

function firstHeaderValue(value: string | null) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getRequestIpAddress(request: Request) {
  return (
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ||
    firstHeaderValue(request.headers.get("x-real-ip")) ||
    firstHeaderValue(request.headers.get("x-forwarded-for")) ||
    firstHeaderValue(request.headers.get("fly-client-ip")) ||
    ""
  );
}

function buildAdditionalDetails({
  customerName,
  phone,
  addressText,
  cleanCity,
  postalCode,
  quantity,
  tracking
}: {
  customerName: string;
  phone: string;
  addressText: string;
  cleanCity: string;
  postalCode: string;
  quantity: number;
  tracking?: OrderTrackingDetails;
}) {
  return [
    { key: "Quantity", value: String(Math.max(1, quantity || 1)) },
    { key: "Full Name", value: customerName },
    { key: "Mobile Number", value: phone },
    { key: "Complete Full Address", value: addressText },
    { key: "Pincode", value: postalCode },
    { key: "State", value: inferIndianProvince(postalCode, cleanCity).name || "" },
    { key: "City", value: cleanCity },
    { key: "country", value: tracking?.country || "IN" },
    { key: "shopify-cart-token", value: tracking?.shopifyCartToken || "" },
    { key: "full_url", value: tracking?.fullUrl || "" },
    { key: "_", value: tracking?.timestamp || "" },
    { key: "IP Address", value: tracking?.ipAddress || "" },
    { key: "payment_method", value: "Cash on Delivery" },
    { key: "source", value: "fast_cod_pro_theme_form" },
    { key: "customer_name", value: customerName },
    { key: "customer_phone", value: phone },
    { key: "delivery_address", value: addressText },
    { key: "city", value: cleanCity },
    { key: "pincode", value: postalCode }
  ]
    .map((item) => ({ key: item.key, value: String(item.value || "").trim() }))
    .filter((item) => item.value);
}

function asRestNoteAttributes(attributes: Array<{ key: string; value: string }>) {
  return attributes.map((item) => ({ name: item.key, value: item.value }));
}

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") || request.headers.get("x-requested-with") === "XMLHttpRequest";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function storefrontResponse(request: Request, payload: Record<string, unknown>, status = 200) {
  if (wantsJson(request)) {
    return Response.json(payload, { status });
  }

  const ok = status >= 200 && status < 300 && payload.orderCreated !== false;
  const title = ok ? "Thank you!" : "Order not submitted";
  const message = escapeHtml(String(payload.message || payload.error || "Your COD order request has been received."));
  const orderName = payload.orderName ? `<p class="order">Order ${escapeHtml(String(payload.orderName))}</p>` : "";

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
      .card{width:min(92vw,520px);background:#fff;border:1px solid #dbe4ef;border-radius:24px;padding:32px;box-shadow:0 24px 70px rgba(15,23,42,.12);text-align:center}
      .icon{width:64px;height:64px;border-radius:999px;margin:0 auto 18px;display:grid;place-items:center;background:${ok ? "#dcfce7" : "#fee2e2"};color:${ok ? "#047857" : "#b91c1c"};font-size:34px;font-weight:900}
      h1{margin:0 0 10px;font-size:34px;line-height:1.08}
      p{margin:0;color:#475569;font-size:17px;line-height:1.55}
      .order{margin-top:16px;color:#0f172a;font-weight:800}
      a{display:inline-flex;margin-top:24px;padding:14px 18px;border-radius:14px;background:#111827;color:#fff;text-decoration:none;font-weight:800}
    </style>
  </head>
  <body>
    <main class="card">
      <div class="icon">${ok ? "✓" : "!"}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      ${orderName}
      <a href="javascript:history.back()">Back to store</a>
    </main>
  </body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

function getFallbackShop(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
) {
  const url = new URL(request.url);
  const candidates = [
    getValue("shop"),
    url.searchParams.get("shop"),
    request.headers.get("x-shopify-shop-domain"),
    request.headers.get("x-forwarded-host"),
    request.headers.get("origin")?.replace(/^https?:\/\//, ""),
    request.headers.get("referer")?.match(/https?:\/\/([^/?#]+)/)?.[1] || ""
  ];

  for (const candidate of candidates) {
    const normalized = normalizeShopDomain(candidate || "");
    if (normalized) return normalized;
  }

  return "";
}

function createAdminClientFromToken(shop: string, accessToken: string): AdminClient {
  return {
    graphql: async (query, options) =>
      fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken
        },
        body: JSON.stringify({
          query,
          variables: options?.variables || {}
        })
      })
  };
}

function secondsFromNow(seconds?: number | null) {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(Date.now() + seconds * 1000)
    : null;
}

async function requestOfflineToken(shop: string, body: Record<string, string>, label: string) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Shopify API key/secret missing on the server.");
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      ...body
    })
  });
  const text = await response.text();
  let payload: OfflineTokenResponse = {};

  try {
    payload = JSON.parse(text) as OfflineTokenResponse;
  } catch (_error) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(`${label} failed. HTTP ${response.status}. ${text.slice(0, 500)}`);
  }

  if (!payload.access_token) {
    throw new Error(`${label} failed. Shopify did not return an access token.`);
  }

  return payload;
}

async function updateStoredOfflineToken(
  session: StoredShopifySession,
  payload: OfflineTokenResponse
) {
  const tokenUpdate = {
    accessToken: payload.access_token || session.accessToken,
    scope: payload.scope || session.scope,
    expires: secondsFromNow(payload.expires_in) || session.expires,
    refreshToken: payload.refresh_token || session.refreshToken,
    refreshTokenExpires:
      secondsFromNow(payload.refresh_token_expires_in) || session.refreshTokenExpires
  };

  await prisma.session.update({
    where: { id: session.id },
    data: tokenUpdate
  });

  return {
    ...session,
    ...tokenUpdate
  };
}

async function migrateStoredOfflineToken(session: StoredShopifySession) {
  const payload = await requestOfflineToken(
    session.shop,
    {
      grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
      subject_token: session.accessToken,
      subject_token_type: OFFLINE_TOKEN_TYPE,
      requested_token_type: OFFLINE_TOKEN_TYPE,
      expiring: "1"
    },
    "Shopify offline token migration"
  );

  return updateStoredOfflineToken(session, payload);
}

async function refreshStoredOfflineToken(session: StoredShopifySession) {
  if (!session.refreshToken) {
    return migrateStoredOfflineToken(session);
  }

  const payload = await requestOfflineToken(
    session.shop,
    {
      grant_type: "refresh_token",
      refresh_token: session.refreshToken
    },
    "Shopify offline token refresh"
  );

  return updateStoredOfflineToken(session, payload);
}

async function ensureStoredSessionHasFreshToken(session: StoredShopifySession) {
  if (session.isOnline) return session;

  const tokenExpiresSoon =
    session.expires &&
    session.expires.getTime() - OFFLINE_TOKEN_REFRESH_WINDOW_MS <= Date.now();
  const hasLegacyNonExpiringToken = !session.expires || !session.refreshToken;

  if (hasLegacyNonExpiringToken) {
    return migrateStoredOfflineToken(session);
  }

  if (tokenExpiresSoon) {
    return refreshStoredOfflineToken(session);
  }

  return session;
}

function scopeList(scope?: string | null) {
  return (scope || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasDraftOrderScopes(scope?: string | null) {
  const scopes = scopeList(scope);
  return scopes.includes("write_draft_orders");
}

function hasOrderCreateScopes(scope?: string | null) {
  const scopes = scopeList(scope);
  return scopes.includes("write_orders");
}

function numericVariantId(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : "";
}

function numericOrderId(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : "";
}

function splitCustomerName(customerName: string) {
  const parts = customerName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || customerName.trim(), lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

function inferPostalCode(pincode: string, address1: string) {
  const direct = String(pincode || "").trim();
  if (direct) return direct;

  return String(address1 || "").match(/\b\d{6}\b/)?.[0] || "";
}

function normalizeSpaces(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function moneyAmount(value: number) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "0.00";
}

function cleanAddressLine(address1: string, postalCode: string, city: string) {
  let cleaned = normalizeSpaces(address1);
  const postal = normalizeSpaces(postalCode);
  const cityName = normalizeSpaces(city);

  if (postal) {
    cleaned = cleaned.replace(new RegExp(`\\b${postal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), "");
  }

  if (cityName) {
    cleaned = cleaned.replace(new RegExp(`\\b${cityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  }

  return cleaned.replace(/\s*,\s*/g, ", ").replace(/^[,\s-]+|[,\s-]+$/g, "").replace(/\s+/g, " ").trim();
}

function cleanCityName(city: string, postalCode: string) {
  const postal = normalizeSpaces(postalCode);
  let cleaned = normalizeSpaces(city);

  if (postal) {
    cleaned = cleaned.replace(new RegExp(`\\b${postal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), "");
  }

  return titleCaseAddressPart(cleaned.replace(/^[,\s-]+|[,\s-]+$/g, "").replace(/\s+/g, " ").trim());
}

function titleCaseAddressPart(value: string) {
  return normalizeSpaces(value).replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function inferIndianProvince(postalCode: string, city: string) {
  const postalPrefix = Number(String(postalCode || "").trim().slice(0, 2));
  const cityKey = normalizeSpaces(city).toLowerCase();

  if (cityKey.includes("delhi") || postalPrefix === 11) {
    return { name: "Delhi", code: "DL" };
  }

  if (postalPrefix >= 12 && postalPrefix <= 13) return { name: "Haryana", code: "HR" };
  if (postalPrefix >= 14 && postalPrefix <= 16) return { name: "Punjab", code: "PB" };
  if (postalPrefix === 17) return { name: "Himachal Pradesh", code: "HP" };
  if (postalPrefix >= 18 && postalPrefix <= 19) return { name: "Jammu and Kashmir", code: "JK" };
  if (postalPrefix >= 20 && postalPrefix <= 28) return { name: "Uttar Pradesh", code: "UP" };
  if (postalPrefix >= 30 && postalPrefix <= 34) return { name: "Rajasthan", code: "RJ" };
  if (postalPrefix >= 36 && postalPrefix <= 39) return { name: "Gujarat", code: "GJ" };
  if (postalPrefix >= 40 && postalPrefix <= 44) return { name: "Maharashtra", code: "MH" };
  if (postalPrefix >= 45 && postalPrefix <= 48) return { name: "Madhya Pradesh", code: "MP" };
  if (postalPrefix === 49) return { name: "Chhattisgarh", code: "CG" };
  if (postalPrefix === 50) return { name: "Telangana", code: "TS" };
  if (postalPrefix >= 51 && postalPrefix <= 53) return { name: "Andhra Pradesh", code: "AP" };
  if (postalPrefix >= 56 && postalPrefix <= 59) return { name: "Karnataka", code: "KA" };
  if (postalPrefix >= 60 && postalPrefix <= 64) return { name: "Tamil Nadu", code: "TN" };
  if (postalPrefix >= 67 && postalPrefix <= 69) return { name: "Kerala", code: "KL" };
  if (postalPrefix >= 70 && postalPrefix <= 74) return { name: "West Bengal", code: "WB" };
  if (postalPrefix >= 75 && postalPrefix <= 77) return { name: "Odisha", code: "OD" };
  if (postalPrefix === 78) return { name: "Assam", code: "AS" };
  if (postalPrefix >= 80 && postalPrefix <= 85) return { name: "Bihar", code: "BR" };

  return { name: "", code: "" };
}

function firstSubmittedValue(
  getValue: (key: string) => FormDataEntryValue | string | null,
  keys: string[]
) {
  for (const key of keys) {
    const value = String(getValue(key) || "").trim();
    if (value) return value;
  }

  return "";
}

function visibleAddress(address1: string, city: string, pincode: string) {
  return [address1, city, pincode].filter(Boolean).join(", ");
}

function normalizeCustomerPhone(value: string) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("00") && digits.length > 10) {
    return `+${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length > 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return raw;
}

function isValidShopifyPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

async function getRestOrderStatusUrl(shop: string, accessToken: string, orderId: string) {
  const orderNumericId = numericOrderId(orderId);
  if (!orderNumericId) return "";

  try {
    const response = await fetch(`https://${shop}/admin/api/2026-04/orders/${orderNumericId}.json`, {
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": accessToken
      }
    });
    const payload = (await response.json()) as {
      order?: {
        order_status_url?: string | null;
        status_url?: string | null;
      };
    };

    return payload.order?.order_status_url || payload.order?.status_url || "";
  } catch (error) {
    console.error("Fast COD Pro order status URL lookup failed", {
      shop,
      orderId,
      error: error instanceof Error ? error.message : String(error)
    });
    return "";
  }
}

async function updateOrderContactPhone(admin: AdminClient, orderId: string, phone: string) {
  try {
    const response = await admin.graphql(
      `#graphql
        mutation FastCodProUpdateOrderPhone($input: OrderInput!) {
          orderUpdate(input: $input) {
            order {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: orderId,
            phone
          }
        }
      }
    );
    const payload = (await response.json()) as {
      errors?: GraphqlTopLevelError[] | GraphqlTopLevelError | null;
      data?: {
        orderUpdate?: {
          userErrors?: GraphqlUserError[];
        } | null;
      };
    };

    return formatGraphqlErrors(payload.data?.orderUpdate?.userErrors ?? [], payload.errors);
  } catch (error) {
    return error instanceof Error ? error.message : "Order phone update failed.";
  }
}

async function findRestCustomerByPhone({
  shop,
  accessToken,
  phone
}: {
  shop: string;
  accessToken: string;
  phone: string;
}) {
  const digits = phone.replace(/\D/g, "");
  const localDigits = digits.slice(-10);
  const queries = [`phone:${phone}`, phone, localDigits].filter(Boolean);

  for (const query of queries) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/2026-04/customers/search.json?query=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            Accept: "application/json",
            "X-Shopify-Access-Token": accessToken
          }
        }
      );
      const payload = (await response.json()) as {
        customers?: Array<{ id?: number | string | null; email?: string | null; phone?: string | null }>;
      };
      const customer = payload.customers?.[0];

      if (response.ok && customer?.id) {
        return {
          id: Number(customer.id),
          email: customer.email || "",
          phone: customer.phone || ""
        };
      }
    } catch (error) {
      console.error("Fast COD Pro customer phone lookup failed", {
        shop,
        query,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return null;
}

async function createRestPhoneCustomer({
  shop,
  accessToken,
  customerName,
  phone,
  address
}: {
  shop: string;
  accessToken: string;
  customerName: string;
  phone: string;
  address: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    zip: string;
    phone: string;
    country: string;
    country_code: string;
    province?: string;
    province_code?: string;
  };
}) {
  const { firstName, lastName } = splitCustomerName(customerName);
  const response = await fetch(`https://${shop}/admin/api/2026-04/customers.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    body: JSON.stringify({
      customer: {
        first_name: firstName,
        last_name: lastName || "-",
        phone,
        verified_phone: true,
        addresses: [address],
        default_address: address,
        tags: "Fast COD Pro"
      }
    })
  });
  const responseText = await response.text();
  let payload: { customer?: { id?: number | string | null }; errors?: unknown } = {};

  try {
    payload = JSON.parse(responseText);
  } catch (_error) {
    payload = {};
  }

  if (response.ok && payload.customer?.id) {
    return { id: Number(payload.customer.id), error: "" };
  }

  console.error("Fast COD Pro phone customer create failed", {
    shop,
    responseStatus: response.status,
    responseText: responseText.slice(0, 700)
  });

  return { id: null, error: responseText };
}

async function createOrderDirectly({
  admin,
  shop,
  accessToken,
  customerName,
  phone,
  address1,
  city,
  pincode,
  notes,
  rawVariantId,
  variantId,
  quantity,
  price,
  currencyCode,
  tracking
}: {
  admin: AdminClient;
  shop: string;
  accessToken?: string | null;
  customerName: string;
  phone: string;
  address1: string;
  city: string;
  pincode: string;
  notes: string;
  rawVariantId: string;
  variantId: string;
  quantity: number;
  price: number;
  currencyCode: string;
  tracking?: OrderTrackingDetails;
}) {
  const { firstName, lastName } = splitCustomerName(customerName);
  const postalCode = inferPostalCode(pincode, address1);
  const cleanAddress1 = cleanAddressLine(address1, postalCode, city);
  const cleanCity = cleanCityName(city, postalCode);
  const province = inferIndianProvince(postalCode, cleanCity);
  const addressText = visibleAddress(cleanAddress1, cleanCity, postalCode);
  const totalAmount = moneyAmount(price * Math.max(1, quantity));

  if (accessToken) {
    const restOrderResult = await createRestOrderDirectly({
      shop,
      accessToken,
      customerName,
      phone,
      address1,
      city,
      pincode,
      notes,
      rawVariantId,
      quantity,
      price,
      tracking
    });

    if (restOrderResult.order?.id) {
      return restOrderResult;
    }
  }

  const additionalDetails = buildAdditionalDetails({
    customerName,
    phone,
    addressText,
    cleanCity,
    postalCode,
    quantity,
    tracking
  });

  const response = await admin.graphql(
    `#graphql
      mutation FastCodProCreateOrder($order: OrderCreateOrderInput!) {
        orderCreate(order: $order) {
          order {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        order: {
          phone,
          note: [
            notes,
            `Customer name: ${customerName}`,
            addressText ? `Delivery address: ${addressText}` : "",
            "Payment method: Cash on Delivery",
            "Source: Fast COD Pro"
          ]
            .filter(Boolean)
            .join("\n"),
          tags: ["Fast COD Pro", "Cash on Delivery"],
          financialStatus: "PENDING",
          transactions: [
            {
              kind: "SALE",
              status: "PENDING",
              gateway: "Cash on Delivery (COD)",
              amountSet: {
                shopMoney: {
                  amount: totalAmount,
                  currencyCode
                },
                presentmentMoney: {
                  amount: totalAmount,
                  currencyCode
                }
              }
            }
          ],
          lineItems: [
            {
              variantId,
              quantity: Math.max(1, quantity)
            }
          ],
          shippingAddress: {
            firstName,
            lastName,
            address1: cleanAddress1,
            city: cleanCity,
            phone,
            zip: postalCode,
            provinceCode: province.code || undefined,
            countryCode: "IN"
          },
          billingAddress: {
            firstName,
            lastName,
            address1: cleanAddress1,
            city: cleanCity,
            phone,
            zip: postalCode,
            provinceCode: province.code || undefined,
            countryCode: "IN"
          },
          customAttributes: additionalDetails
        }
      }
    }
  );

  const payload = (await response.json()) as {
    errors?: GraphqlTopLevelError[] | GraphqlTopLevelError | null;
    data?: {
      orderCreate?: {
        order?: {
          id?: string;
          name?: string | null;
        } | null;
        userErrors?: GraphqlUserError[];
      } | null;
    };
  };

  const graphqlOrder = payload.data?.orderCreate?.order;
  if (graphqlOrder?.id) {
    const phoneUpdateError = await updateOrderContactPhone(admin, graphqlOrder.id, phone);
    if (phoneUpdateError) {
      console.error("Fast COD Pro order phone update failed", {
        orderId: graphqlOrder.id,
        phoneUpdateError
      });
    }

    return {
      order: {
        ...graphqlOrder,
        orderStatusUrl: accessToken
          ? await getRestOrderStatusUrl(shop, accessToken, graphqlOrder.id)
          : null
      },
      error: ""
    };
  }

  const graphqlError = formatGraphqlErrors(
    payload.data?.orderCreate?.userErrors ?? [],
    payload.errors
  );

  return {
    order: null,
    error:
      graphqlError ||
      `GraphQL orderCreate returned no order. HTTP ${response.status}. Payload: ${JSON.stringify(payload).slice(0, 500)}`
  };
}

async function createRestOrderDirectly({
  shop,
  accessToken,
  customerName,
  phone,
  address1,
  city,
  pincode,
  notes,
  rawVariantId,
  quantity,
  price,
  tracking
}: {
  shop: string;
  accessToken: string;
  customerName: string;
  phone: string;
  address1: string;
  city: string;
  pincode: string;
  notes: string;
  rawVariantId: string;
  quantity: number;
  price: number;
  tracking?: OrderTrackingDetails;
}) {
  const variantNumericId = numericVariantId(rawVariantId);
  if (!variantNumericId) {
    return { order: null, error: "Missing numeric product variant ID for REST order create." };
  }

  const { firstName, lastName } = splitCustomerName(customerName);
  const postalCode = inferPostalCode(pincode, address1);
  const cleanAddress1 = cleanAddressLine(address1, postalCode, city);
  const cleanCity = cleanCityName(city, postalCode);
  const province = inferIndianProvince(postalCode, cleanCity);
  const addressText = visibleAddress(cleanAddress1, cleanCity, postalCode);
  const totalAmount = moneyAmount(price * Math.max(1, quantity));
  const additionalDetails = buildAdditionalDetails({
    customerName,
    phone,
    addressText,
    cleanCity,
    postalCode,
    quantity,
    tracking
  });
  const address = {
    first_name: firstName,
    last_name: lastName || "-",
    address1: cleanAddress1,
    city: cleanCity,
    zip: postalCode,
    phone,
    country: "India",
    country_code: "IN",
    province: province.name || undefined,
    province_code: province.code || undefined
  };
  const createdPhoneCustomer = await createRestPhoneCustomer({
    shop,
    accessToken,
    customerName,
    phone,
    address
  });
  let phoneCustomerId = createdPhoneCustomer.id;

  if (!phoneCustomerId && /already been taken|phone/i.test(createdPhoneCustomer.error)) {
    const foundPhoneCustomer = await findRestCustomerByPhone({ shop, accessToken, phone });
    phoneCustomerId = foundPhoneCustomer && !foundPhoneCustomer.email ? foundPhoneCustomer.id : null;
  }
  const buildOrderBody = (useCustomerId: boolean) => ({
      order: {
        phone,
        customer: useCustomerId && phoneCustomerId ? { id: phoneCustomerId } : undefined,
        contact_email: undefined,
        financial_status: "pending",
        gateway: "Cash on Delivery (COD)",
        payment_gateway_names: ["Cash on Delivery (COD)"],
        fulfillment_status: null,
        inventory_behaviour: "decrement_ignoring_policy",
        send_receipt: false,
        send_fulfillment_receipt: false,
        tags: "Fast COD Pro, Cash on Delivery",
        note: [
          notes,
          `Customer name: ${customerName}`,
          addressText ? `Delivery address: ${addressText}` : "",
          "Payment method: Cash on Delivery",
          "Source: Fast COD Pro"
        ]
          .filter(Boolean)
          .join("\n"),
        line_items: [
          {
            variant_id: Number(variantNumericId),
            quantity: Math.max(1, quantity)
          }
        ],
        shipping_lines: [
          {
            title: "Free shipping",
            price: "0.00",
            code: "FREE"
          }
        ],
        transactions: [
          {
            kind: "sale",
            status: "pending",
            amount: totalAmount,
            gateway: "Cash on Delivery (COD)",
            currency: "INR"
          }
        ],
        shipping_address: address,
        billing_address: address,
        note_attributes: asRestNoteAttributes(additionalDetails)
      }
    });

  const postOrder = (useCustomerId: boolean) =>
    fetch(`https://${shop}/admin/api/2026-04/orders.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify(buildOrderBody(useCustomerId))
    });

  let response = await postOrder(Boolean(phoneCustomerId));
  const responseText = await response.text();
  let payload: {
    order?: {
      id?: number;
      name?: string | null;
      order_status_url?: string | null;
      status_url?: string | null;
    };
    errors?: unknown;
  } = {};

  try {
    payload = JSON.parse(responseText);
  } catch (_error) {
    payload = {};
  }

  if (!response.ok) {
    response = await postOrder(false);
    const retryResponseText = await response.text();

    try {
      payload = JSON.parse(retryResponseText);
    } catch (_error) {
      payload = {};
    }

    if (!response.ok) {
      return {
        order: null,
        error: `REST order create failed. HTTP ${response.status}. ${retryResponseText.slice(0, 700)}`
      };
    }
  }

  if (response.ok && payload.order?.id) {
    return {
      order: {
        id: `gid://shopify/Order/${payload.order.id}`,
        name: payload.order.name || null,
        orderStatusUrl: payload.order.order_status_url || payload.order.status_url || null
      },
      error: ""
    };
  }

  return {
    order: null,
    error: `REST order create failed. HTTP ${response.status}. ${responseText.slice(0, 700)}`
  };
}

async function getStoredAdminContext(shop?: string): Promise<SubmissionContext | null> {
  const sessions = await prisma.session.findMany({
    where: shop ? { shop } : {},
    orderBy: [{ isOnline: "asc" }, { expires: "desc" }],
    take: 20
  });

  const session =
    sessions.find((item) => !item.isOnline && hasOrderCreateScopes(item.scope)) ||
    sessions.find((item) => !item.isOnline && hasDraftOrderScopes(item.scope)) ||
    sessions.find((item) => hasOrderCreateScopes(item.scope)) ||
    sessions.find((item) => hasDraftOrderScopes(item.scope)) ||
    sessions.find((item) => !item.isOnline) ||
    sessions[0];

  if (!session?.accessToken || !session.shop) return null;

  let usableSession = session;
  let tokenIssue = "";

  try {
    usableSession = await ensureStoredSessionHasFreshToken(session);
  } catch (error) {
    tokenIssue = error instanceof Error ? error.message : "Shopify token refresh failed.";
    console.error("Fast COD Pro could not refresh Shopify offline token", {
      shop: session.shop,
      tokenIssue
    });
  }

  return {
    session: {
      shop: usableSession.shop,
      scope: usableSession.scope,
      isOnline: usableSession.isOnline,
      accessToken: usableSession.accessToken
    },
    admin: createAdminClientFromToken(usableSession.shop, usableSession.accessToken),
    tokenIssue
  };
}

async function getSubmissionContext(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
): Promise<{ context: SubmissionContext | null; reason?: string }> {
  try {
    const context = await authenticate.public.appProxy(request);
    if (context.session?.shop && context.admin) {
      const storedContext = await getStoredAdminContext(context.session.shop);
      if (
        hasOrderCreateScopes(storedContext?.session.scope) ||
        hasDraftOrderScopes(storedContext?.session.scope)
      ) {
        return {
          context: storedContext,
          reason: "used_scoped_stored_session_after_app_proxy_auth"
        };
      }

      return {
        context: {
          session: { shop: context.session.shop },
          admin: context.admin
        }
      };
    }
  } catch (_error) {
    // Native storefront form submits may arrive without app proxy signature.
  }

  const fallbackShop = getFallbackShop(request, getValue);
  if (!fallbackShop) {
    const storedContext = await getStoredAdminContext();
    return {
      context: storedContext,
      reason: storedContext ? "used_first_stored_session" : "no_shop_param_no_stored_session"
    };
  }

  const storedContext = await getStoredAdminContext(fallbackShop);
  if (
    hasOrderCreateScopes(storedContext?.session.scope) ||
    hasDraftOrderScopes(storedContext?.session.scope)
  ) {
    return {
      context: storedContext,
      reason: "used_scoped_stored_session"
    };
  }

  try {
    const context = await unauthenticated.admin(fallbackShop);
    if (!context.admin) {
      return {
        context: storedContext,
        reason: storedContext ? "used_stored_session_after_empty_admin" : `no_admin_for_${fallbackShop}`
      };
    }
    return {
      context: {
        session: { shop: context.session?.shop || fallbackShop },
        admin: context.admin
      }
    };
  } catch (error) {
    return {
      context: storedContext,
      reason: storedContext
        ? "used_stored_session_after_unauthenticated_error"
        : `no_stored_session_for_${fallbackShop}:${error instanceof Error ? error.message : "unknown"}`
    };
  }
}

async function handleSubmission(
  request: Request,
  getValue: (key: string) => FormDataEntryValue | string | null
) {
  try {
    const { context, reason } = await getSubmissionContext(request, getValue);

    if (!context?.session?.shop || !context.admin) {
      return storefrontResponse(
        request,
        {
          error: `Unauthorized proxy request. ${SUBMIT_BUILD_ID}. ${reason || "no_context"}`,
          build: SUBMIT_BUILD_ID,
          reason: reason || "no_context"
        },
        401
      );
    }

    const { session, admin } = context;
    if (context.tokenIssue) {
      return storefrontResponse(
        request,
        {
          error: `Shopify token refresh failed: ${context.tokenIssue}. Open the Fast COD Pro app once inside Shopify admin, approve the new permissions, then submit again.`,
          orderCreated: false
        },
        422
      );
    }

    const profile = await getFunnelProfile(session.shop);

    const firstNameValue = firstSubmittedValue(getValue, ["firstName", "first_name"]);
    const lastNameValue = firstSubmittedValue(getValue, ["lastName", "last_name"]);
    const customerName =
      firstSubmittedValue(getValue, [
        "customerName",
        "customer_name",
        "fullName",
        "full_name",
        "name"
      ]) || [firstNameValue, lastNameValue].filter(Boolean).join(" ");
    const rawPhone = String(getValue("phone") || "").trim();
    const phone = normalizeCustomerPhone(rawPhone);
    const email = String(getValue("email") || "").trim();
    const address1 = firstSubmittedValue(getValue, [
      "address1",
      "address",
      "deliveryAddress",
      "delivery_address",
      "shippingAddress",
      "shipping_address"
    ]);
    const pincode = firstSubmittedValue(getValue, [
      "pincode",
      "pin",
      "zip",
      "zipcode",
      "postalCode",
      "postal_code"
    ]);
    const city = firstSubmittedValue(getValue, ["city", "town"]);
    const notes = firstSubmittedValue(getValue, ["notes", "note", "orderNotes", "order_notes"]);
    const productTitle = String(getValue("productTitle") || "").trim();
    const rawVariantId = String(getValue("variantId") || "").trim();
    const price = Number(getValue("price") || 0);
    const quantity = Number(getValue("quantity") || 1);
    const tracking: OrderTrackingDetails = {
      fullUrl: String(getValue("fullUrl") || getValue("full_url") || "").trim(),
      shopifyCartToken: String(
        getValue("shopifyCartToken") || getValue("shopify-cart-token") || ""
      ).trim(),
      country: String(getValue("country") || "IN").trim() || "IN",
      timestamp: String(getValue("_") || "").trim(),
      ipAddress: getRequestIpAddress(request)
    };
    const postalCode = inferPostalCode(pincode, address1);
    const cleanAddress1 = cleanAddressLine(address1, postalCode, city);
    const cleanCity = cleanCityName(city, postalCode);
    const province = inferIndianProvince(postalCode, cleanCity);
    const cleanAddressText = visibleAddress(cleanAddress1, cleanCity, postalCode);
    const variantId = rawVariantId.startsWith("gid://shopify/ProductVariant/")
      ? rawVariantId
      : rawVariantId
        ? `gid://shopify/ProductVariant/${rawVariantId}`
        : "";
    if (!customerName || !phone || !variantId || !productTitle) {
      return storefrontResponse(request, { error: "Missing required COD form values." }, 400);
    }

    if (!isValidShopifyPhone(phone)) {
      return storefrontResponse(
        request,
        {
          error: "Phone number is invalid. Enter a valid 10-digit mobile number, for example 9718127346.",
          orderCreated: false
        },
        422
      );
    }

    const monthlySubmissionCount = await getMonthlySubmissionCount(session.shop);
    const hasUnlimitedPlan =
      monthlySubmissionCount >= FREE_ORDER_LIMIT ? await hasActiveUnlimitedPlan(admin) : false;

    if (!hasUnlimitedPlan && monthlySubmissionCount >= FREE_ORDER_LIMIT) {
      return storefrontResponse(
        request,
        {
          error: `Free plan limit reached. Free includes ${FREE_ORDER_LIMIT} COD orders per month. Upgrade to Unlimited to keep receiving COD orders.`,
          orderCreated: false,
          limitReached: true
        },
        402
      );
    }

    let draftOrder:
      | {
          id?: string;
          invoiceUrl?: string | null;
          order?: {
            id?: string;
            name?: string | null;
          } | null;
          totalPriceSet?: {
            presentmentMoney?: {
              amount?: string;
              currencyCode?: string;
            } | null;
          } | null;
        }
      | null
      | undefined;
    let completedOrder:
      | {
          id?: string;
          name?: string | null;
          orderStatusUrl?: string | null;
        }
      | null
      | undefined;
    let draftError: string | null = null;

    if (hasOrderCreateScopes(session.scope)) {
      try {
        const directOrderResult = await createOrderDirectly({
          admin,
          shop: session.shop,
          accessToken: session.accessToken,
          customerName,
          phone,
          address1,
          city,
          pincode,
          notes: [notes, rawPhone && rawPhone !== phone ? `Original phone: ${rawPhone}` : ""]
            .filter(Boolean)
            .join("\n"),
          rawVariantId,
          variantId,
          quantity,
          price,
          currencyCode: profile.defaultCurrency,
          tracking
        });

        if (directOrderResult.order?.id) {
          completedOrder = directOrderResult.order;
        } else if (directOrderResult.error) {
          draftError = `Direct Shopify order creation failed: ${directOrderResult.error}`;
        } else {
          draftError = "Direct Shopify order creation failed without an error message.";
        }
      } catch (error) {
        draftError = `Direct Shopify order creation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    if (!completedOrder?.id && hasDraftOrderScopes(session.scope)) {
      try {
      const draftOrderResponse = await admin.graphql(
        `#graphql
          mutation FastCodProCreateDraftOrder($input: DraftOrderInput!) {
            draftOrderCreate(input: $input) {
              draftOrder {
                id
                invoiceUrl
                totalPriceSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            input: {
              note: [
                notes,
                rawPhone && rawPhone !== phone ? `Original phone: ${rawPhone}` : ""
              ]
                .filter(Boolean)
                .join("\n") || undefined,
              shippingAddress: {
                firstName: splitCustomerName(customerName).firstName || undefined,
                lastName: splitCustomerName(customerName).lastName || "-",
                address1: cleanAddress1 || address1 || undefined,
                city: cleanCity || city || undefined,
                phone: phone || undefined,
                zip: postalCode || undefined,
                provinceCode: province.code || undefined,
                countryCode: "IN"
              },
              billingAddress: {
                firstName: splitCustomerName(customerName).firstName || undefined,
                lastName: splitCustomerName(customerName).lastName || "-",
                address1: cleanAddress1 || address1 || undefined,
                city: cleanCity || city || undefined,
                phone: phone || undefined,
                zip: postalCode || undefined,
                provinceCode: province.code || undefined,
                countryCode: "IN"
              },
              lineItems: [
                {
                  variantId,
                  quantity
                }
              ],
              shippingLine: {
                title: "Free shipping",
                price: "0.00"
              },
              customAttributes: [
                ...buildAdditionalDetails({
                  customerName,
                  phone,
                  addressText: cleanAddressText,
                  cleanCity,
                  postalCode,
                  quantity,
                  tracking
                }),
                { key: "original_phone", value: rawPhone }
              ].filter((item) => item.value)
            }
          }
        }
      );

      const draftPayload = (await draftOrderResponse.json()) as {
        errors?: Array<{ message?: string }>;
        data?: {
          draftOrderCreate?: {
            draftOrder?: {
              id?: string;
              invoiceUrl?: string | null;
              totalPriceSet?: {
                presentmentMoney?: {
                  amount?: string;
                  currencyCode?: string;
                } | null;
              } | null;
            } | null;
            userErrors?: GraphqlUserError[];
          } | null;
        };
      };

      if (draftOrderResponse.status === 403) {
        draftError =
          `Shopify permission denied for draft orders. Reinstall/update the app and approve draft order permissions. Current stored scopes: ${scopeList(session.scope).join(",") || "none"}. Token type: ${session.isOnline ? "online" : "offline"}.`;
      }

      const userErrors = draftPayload.data?.draftOrderCreate?.userErrors ?? [];
      const graphqlError = formatGraphqlErrors(userErrors, draftPayload.errors);
      if (graphqlError || draftError) {
        draftError = graphqlError || draftError || "Draft order creation failed.";
        console.error("Fast COD Pro draft order create failed", {
          shop: session.shop,
          draftError,
          productTitle,
          variantId
        });
      } else {
        draftOrder = draftPayload.data?.draftOrderCreate?.draftOrder;
      }
    } catch (error) {
      draftError = error instanceof Error ? error.message : "Draft order creation failed.";
    }
    }

    if (draftOrder?.id) {
      const completeDraftOrder = async (paymentPending: boolean) => {
        const completeResponse = await admin.graphql(
          `#graphql
            mutation FastCodProCompleteDraftOrder($id: ID!, $paymentPending: Boolean!) {
              draftOrderComplete(id: $id, paymentPending: $paymentPending, sourceName: "fast_cod_pro") {
                draftOrder {
                  id
                  order {
                    id
                    name
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              id: draftOrder.id,
              paymentPending
            }
          }
        );

        const completePayload = (await completeResponse.json()) as {
          errors?: Array<{ message?: string }>;
          data?: {
            draftOrderComplete?: {
              draftOrder?: {
                id?: string;
                order?: {
                  id?: string;
                  name?: string | null;
                } | null;
              } | null;
              userErrors?: GraphqlUserError[];
            } | null;
          };
        };

        const completeErrors =
          completePayload.data?.draftOrderComplete?.userErrors ?? [];
        const graphqlError = formatGraphqlErrors(
          completeErrors,
          completePayload.errors
        );

        return {
          order: {
            ...completePayload.data?.draftOrderComplete?.draftOrder?.order,
            orderStatusUrl:
              session.accessToken && completePayload.data?.draftOrderComplete?.draftOrder?.order?.id
                ? await getRestOrderStatusUrl(
                    session.shop,
                    session.accessToken,
                    completePayload.data.draftOrderComplete.draftOrder.order.id
                  )
                : null
          },
          error: graphqlError
        };
      };

      try {
        const pendingResult = await completeDraftOrder(true);
        if (pendingResult.error) {
          console.error("Fast COD Pro payment-pending draft complete failed", {
            shop: session.shop,
            draftOrderId: draftOrder.id,
            draftError: pendingResult.error
          });
          const paidFallbackResult = await completeDraftOrder(false);
          if (paidFallbackResult.error) {
            draftError = paidFallbackResult.error || pendingResult.error;
            console.error("Fast COD Pro paid fallback draft complete failed", {
              shop: session.shop,
              draftOrderId: draftOrder.id,
              draftError
            });
            if (hasOrderCreateScopes(session.scope)) {
              const directFallbackResult = await createOrderDirectly({
                admin,
                shop: session.shop,
                accessToken: session.accessToken,
                customerName,
                phone,
                address1,
                city,
                pincode,
                notes: [
                  notes,
                  "Draft order completion fallback used.",
                  rawPhone && rawPhone !== phone ? `Original phone: ${rawPhone}` : ""
                ]
                  .filter(Boolean)
                  .join("\n"),
                rawVariantId,
                variantId,
                quantity,
                price,
                currencyCode: profile.defaultCurrency,
                tracking
              });

              if (directFallbackResult.order?.id) {
                completedOrder = directFallbackResult.order;
                draftError = null;
              } else if (directFallbackResult.error) {
                draftError = `${draftError} | Direct fallback failed: ${directFallbackResult.error}`;
              }
            }
          } else {
            completedOrder = paidFallbackResult.order;
            draftError = null;
          }
        } else {
          completedOrder = pendingResult.order;
        }
      } catch (error) {
        draftError = error instanceof Error ? error.message : "Order creation from draft failed.";
      }
    }

    if (completedOrder?.id && !completedOrder.orderStatusUrl && session.accessToken) {
      completedOrder.orderStatusUrl = await getRestOrderStatusUrl(
        session.shop,
        session.accessToken,
        completedOrder.id
      );
    }

    const submissionLog = prisma.codSubmission.create({
      data: {
        funnelProfileId: profile.id,
        shop: session.shop,
        status: completedOrder?.id ? "confirmed" : draftOrder?.id ? "received" : "pending_manual_review",
        customerName,
        phone,
        email: email || null,
        address1: cleanAddress1 || null,
        city: cleanCity || null,
        notes: [notes, postalCode ? `Pincode: ${postalCode}` : ""].filter(Boolean).join("\n") || null,
        productTitle,
        variantId,
        quantity,
        draftOrderId: draftOrder?.id || null,
        totalAmount: Number(draftOrder?.totalPriceSet?.presentmentMoney?.amount || price || 0),
        currency: draftOrder?.totalPriceSet?.presentmentMoney?.currencyCode || profile.defaultCurrency,
        payloadJson: JSON.stringify({
          invoiceUrl: draftOrder?.invoiceUrl || null,
          orderId: completedOrder?.id || null,
          orderName: completedOrder?.name || null,
          orderStatusUrl: completedOrder?.orderStatusUrl || null,
          draftError
        })
      }
    });
    void submissionLog.catch((error) => {
      console.error("Fast COD Pro submission log failed", {
        shop: session.shop,
        error: error instanceof Error ? error.message : String(error)
      });
    });

    if (!completedOrder?.id) {
      return storefrontResponse(
        request,
        {
          error: draftError || "Shopify order could not be created.",
          message: draftOrder?.id
            ? "Draft order was created, but Shopify did not convert it to an order."
            : hasOrderCreateScopes(session.scope)
              ? "COD request could not create a Shopify order."
              : "Shopify Orders permission is missing. Reinstall/update the app and approve write_orders.",
          draftOrderCreated: Boolean(draftOrder?.id),
          orderCreated: false,
          fallbackReason: draftError
        },
        422
      );
    }

    return storefrontResponse(request, {
      ok: true,
      message: `${profile.successMessage} Shopify order ${completedOrder.name || ""} has been created.`.trim(),
      invoiceUrl: draftOrder?.invoiceUrl || null,
      orderStatusUrl: completedOrder.orderStatusUrl || null,
      confirmationUrl: `/apps/fast-cod-pro/thank-you?order=${encodeURIComponent(completedOrder.name || "")}&shop=${encodeURIComponent(session.shop)}`,
      draftOrderCreated: true,
      orderCreated: true,
      orderId: completedOrder.id,
      orderName: completedOrder.name || null
    });
  } catch (error) {
    return storefrontResponse(
      request,
      {
        error: error instanceof Error ? error.message : "COD submission failed."
      },
      500
    );
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (!url.searchParams.get("customerName")) {
    const { session } = await authenticate.public.appProxy(request);

    if (!session?.shop) {
      return storefrontResponse(request, { error: "Unauthorized proxy request." }, 401);
    }

    return storefrontResponse(
      request,
      { error: "Provide order details to submit a COD order." },
      400
    );
  }

  return handleSubmission(request, (key) => url.searchParams.get(key));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  return handleSubmission(request, (key) => formData.get(key));
};
