import type { Session as StoredShopifySession } from "@prisma/client";
import prisma from "../db.server";

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

function secondsFromNow(seconds?: number | null) {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(Date.now() + seconds * 1000)
    : null;
}

async function requestOfflineToken(
  shop: string,
  body: Record<string, string>,
  label: string
) {
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

export async function ensureExpiringOfflineTokenForShop(shop: string) {
  const session = await prisma.session.findFirst({
    where: {
      shop,
      isOnline: false
    },
    orderBy: [{ expires: "desc" }, { id: "asc" }]
  });

  if (!session?.accessToken) {
    return { status: "missing" as const };
  }

  const tokenExpiresSoon =
    session.expires &&
    session.expires.getTime() - OFFLINE_TOKEN_REFRESH_WINDOW_MS <= Date.now();
  const hasLegacyNonExpiringToken = !session.expires || !session.refreshToken;

  if (hasLegacyNonExpiringToken) {
    await migrateStoredOfflineToken(session);
    return { status: "migrated" as const };
  }

  if (tokenExpiresSoon) {
    await refreshStoredOfflineToken(session);
    return { status: "refreshed" as const };
  }

  return { status: "current" as const };
}
