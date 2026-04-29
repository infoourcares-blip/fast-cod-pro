import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { getFunnelProfile } from "../lib/funnel.server";
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
  session: { shop: string; scope?: string | null; isOnline?: boolean | null };
  admin: AdminClient;
};

const SUBMIT_BUILD_ID = "cod-submit-2026-04-29-1";

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

function normalizeShopDomain(value: FormDataEntryValue | string | null) {
  const shop = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
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

function isTrustedStorefrontRequest(request: Request, shop: string) {
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  const forwardedHost = request.headers.get("x-forwarded-host") || "";
  const host = request.headers.get("host") || "";
  const trustedHosts = [origin, referer, forwardedHost, host]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return trustedHosts.some((value) => value.includes(shop));
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

function numericVariantId(value: string) {
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

function buildShopifyCheckoutUrl({
  shop,
  rawVariantId,
  quantity,
  customerName,
  phone,
  email,
  address1,
  city,
  pincode,
  notes
}: {
  shop: string;
  rawVariantId: string;
  quantity: number;
  customerName: string;
  phone: string;
  email: string;
  address1: string;
  city: string;
  pincode: string;
  notes: string;
}) {
  const variantNumericId = numericVariantId(rawVariantId);
  if (!variantNumericId) return null;

  const { firstName, lastName } = splitCustomerName(customerName);
  const postalCode = inferPostalCode(pincode, address1);
  const contact = email || phone;
  const params = new URLSearchParams();
  if (email) params.set("checkout[email]", email);
  params.set("checkout[phone]", phone);
  params.set("checkout[contact]", contact);
  params.set("checkout[shipping_address][first_name]", firstName);
  params.set("checkout[shipping_address][last_name]", lastName);
  params.set("checkout[shipping_address][phone]", phone);
  params.set("checkout[shipping_address][address1]", address1);
  params.set("checkout[shipping_address][city]", city);
  params.set("checkout[shipping_address][zip]", postalCode);
  params.set("checkout[shipping_address][country]", "India");
  params.set("checkout[shipping_address][country_code]", "IN");
  params.set("attributes[Fast COD Pro]", "true");
  params.set("attributes[Customer phone]", phone);
  if (postalCode) params.set("attributes[Pincode]", postalCode);
  if (notes) params.set("attributes[Order notes]", notes);

  return `https://${shop}/cart/${variantNumericId}:${Math.max(1, quantity)}?${params.toString()}`;
}

async function getStoredAdminContext(shop?: string): Promise<SubmissionContext | null> {
  const sessions = await prisma.session.findMany({
    where: shop ? { shop } : {},
    orderBy: [{ isOnline: "asc" }, { expires: "desc" }],
    take: 20
  });

  const session =
    sessions.find((item) => !item.isOnline && hasDraftOrderScopes(item.scope)) ||
    sessions.find((item) => hasDraftOrderScopes(item.scope)) ||
    sessions.find((item) => !item.isOnline) ||
    sessions[0];

  if (!session?.accessToken || !session.shop) return null;

  return {
    session: { shop: session.shop, scope: session.scope, isOnline: session.isOnline },
    admin: createAdminClientFromToken(session.shop, session.accessToken)
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
      if (hasDraftOrderScopes(storedContext?.session.scope)) {
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
  if (hasDraftOrderScopes(storedContext?.session.scope)) {
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
    const profile = await getFunnelProfile(session.shop);

    const customerName = String(getValue("customerName") || "").trim();
    const phone = String(getValue("phone") || "").trim();
    const email = String(getValue("email") || "").trim();
    const address1 = String(getValue("address1") || "").trim();
    const pincode = String(getValue("pincode") || "").trim();
    const city = String(getValue("city") || "").trim();
    const notes = String(getValue("notes") || "").trim();
    const productTitle = String(getValue("productTitle") || "").trim();
    const rawVariantId = String(getValue("variantId") || "").trim();
    const price = Number(getValue("price") || 0);
    const quantity = Number(getValue("quantity") || 1);
    const variantId = rawVariantId.startsWith("gid://shopify/ProductVariant/")
      ? rawVariantId
      : rawVariantId
        ? `gid://shopify/ProductVariant/${rawVariantId}`
        : "";
    const checkoutUrl = buildShopifyCheckoutUrl({
      shop: session.shop,
      rawVariantId,
      quantity,
      customerName,
      phone,
      email,
      address1,
      city,
      pincode,
      notes
    });

    if (!customerName || !phone || !variantId || !productTitle) {
      return storefrontResponse(request, { error: "Missing required COD form values." }, 400);
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
        }
      | null
      | undefined;
    let draftError: string | null = null;

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
              email: email || undefined,
              note: notes || undefined,
              shippingAddress: profile.collectAddress
                ? {
                    address1: address1 || undefined,
                    city: city || undefined,
                    phone: phone || undefined,
                    zip: pincode || undefined
                  }
                : undefined,
              lineItems: [
                {
                  variantId,
                  quantity
                }
              ],
              customAttributes: [
                { key: "customer_name", value: customerName },
                { key: "phone", value: phone },
                { key: "payment_method", value: "Cash on Delivery" },
                { key: "source", value: "fast_cod_pro_theme_form" }
              ]
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
          order: completePayload.data?.draftOrderComplete?.draftOrder?.order,
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

    await prisma.codSubmission.create({
      data: {
        funnelProfileId: profile.id,
        shop: session.shop,
        status: completedOrder?.id ? "confirmed" : draftOrder?.id ? "received" : "pending_manual_review",
        customerName,
        phone,
        email: email || null,
        address1: address1 || null,
        city: city || null,
        notes: [notes, pincode ? `Pincode: ${pincode}` : ""].filter(Boolean).join("\n") || null,
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
          draftError
        })
      }
    });

    if (!completedOrder?.id) {
      return storefrontResponse(
        request,
        {
          error: draftError || "Shopify order could not be created.",
          message: draftOrder?.id
            ? "Draft order was created, but Shopify did not convert it to an order."
            : checkoutUrl
              ? "Opening secure Shopify checkout to complete this COD order."
              : "COD request could not create a Shopify order.",
          draftOrderCreated: Boolean(draftOrder?.id),
          orderCreated: false,
          checkoutUrl,
          fallbackReason: draftError
        },
        checkoutUrl ? 200 : 422
      );
    }

    return storefrontResponse(request, {
      ok: true,
      message: `${profile.successMessage} Shopify order ${completedOrder.name || ""} has been created.`.trim(),
      invoiceUrl: draftOrder?.invoiceUrl || null,
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
