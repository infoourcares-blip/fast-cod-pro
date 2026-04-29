import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { EMPIRE_PLAN, LAUNCH_PLAN, SCALE_PLAN } from "./lib/billing-plans";

const REQUIRED_SCOPES = [
  "read_products",
  "write_app_proxy",
  "read_draft_orders",
  "write_draft_orders"
];

const configuredScopes = (process.env.SCOPES || "")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

const scopes = Array.from(new Set([...configuredScopes, ...REQUIRED_SCOPES]));

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April26,
  scopes,
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [LAUNCH_PLAN]: {
      lineItems: [
        {
          amount: 7.99,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    },
    [SCALE_PLAN]: {
      lineItems: [
        {
          amount: 23.99,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    },
    [EMPIRE_PLAN]: {
      lineItems: [
        {
          amount: 55.99,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days
        }
      ]
    }
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
